import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'

type OdpOverviewRow = {
  odpId: number
  odpCode: string
  odpName: string
  totalPorts: number
  activePorts: number
  locationText: string | null
  latitude: number | null
  longitude: number | null
}

export type OdpPortMapRow = {
  portId: number
  odpCode: string
  odpName: string
  portNo: number
  portStatus: string
  serviceNo: string | null
  customerCode: string | null
  customerName: string | null
  installedAt: string | Date | null
}

export type OdpPortMapResponse = {
  overview: OdpOverviewRow | null
  ports: OdpPortMapRow[]
  statusSummary: Record<string, number>
  ready: boolean
  truncated?: boolean
  reason?: string
}

function normalizePortNo(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const numeric = Number.parseInt(raw, 10)
  return Number.isInteger(numeric) && numeric > 0 ? numeric : -1
}

function summaryFromPorts(ports: OdpPortMapRow[]) {
  const result: Record<string, number> = {}
  for (const port of ports) {
    const key = String(port.portStatus ?? 'UNKNOWN').toUpperCase() || 'UNKNOWN'
    result[key] = (result[key] ?? 0) + 1
  }
  return result
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({
      overview: null,
      ports: [],
      statusSummary: {},
      ready: false,
      truncated: false,
      reason: 'Read action port map ODP hanya aktif saat review DB benar-benar tersedia.',
    } satisfies OdpPortMapResponse, { status: 503 })
  }

  try {
    const url = new URL(request.url)
    const odpCode = String(url.searchParams.get('odpCode') ?? '').trim()
    const odpIdRaw = Number.parseInt(String(url.searchParams.get('odpId') ?? '').trim() || '0', 10)
    const portNo = normalizePortNo(url.searchParams.get('portNo'))

    if (!odpCode && !Number.isInteger(odpIdRaw)) {
      return Response.json({ message: 'Parameter odpCode atau odpId wajib diisi.' }, { status: 400 })
    }

    const [
      hasOdpId,
      hasOdpCode,
      hasOdpName,
      hasOdpTotalPorts,
      hasOdpActivePorts,
      hasOdpLocationText,
      hasOdpLatitude,
      hasOdpLongitude,
      hasPortId,
      hasPortOdpId,
      hasPortNo,
      hasPortStatusCol,
      hasStatusCol,
      hasPortSubscriptionId,
      hasPortCustomerId,
      hasPortInstalledAt,
      hasPortCreatedAt,
      hasPortUpdatedAt,
      hasSubscriptionServiceNo,
      hasCustomerCode,
      hasCustomerFullName,
    ] = await Promise.all([
      hasReviewDbColumn('network_odp', 'id'),
      hasReviewDbColumn('network_odp', 'code'),
      hasReviewDbColumn('network_odp', 'name'),
      hasReviewDbColumn('network_odp', 'total_ports'),
      hasReviewDbColumn('network_odp', 'active_ports'),
      hasReviewDbColumn('network_odp', 'location_text'),
      hasReviewDbColumn('network_odp', 'latitude'),
      hasReviewDbColumn('network_odp', 'longitude'),
      hasReviewDbColumn('network_odp_ports', 'id'),
      hasReviewDbColumn('network_odp_ports', 'odp_id'),
      hasReviewDbColumn('network_odp_ports', 'port_no'),
      hasReviewDbColumn('network_odp_ports', 'port_status'),
      hasReviewDbColumn('network_odp_ports', 'status'),
      hasReviewDbColumn('network_odp_ports', 'subscription_id'),
      hasReviewDbColumn('network_odp_ports', 'customer_id'),
      hasReviewDbColumn('network_odp_ports', 'installed_at'),
      hasReviewDbColumn('network_odp_ports', 'created_at'),
      hasReviewDbColumn('network_odp_ports', 'updated_at'),
      hasReviewDbColumn('service_subscriptions', 'service_no'),
      hasReviewDbColumn('crm_customers', 'customer_code'),
      hasReviewDbColumn('crm_customers', 'full_name'),
    ])

    const canJoinPortSubscription = hasPortSubscriptionId && hasSubscriptionServiceNo
    const canJoinPortCustomer = hasPortCustomerId && hasCustomerCode && hasCustomerFullName
    const hasPortStatus = hasPortStatusCol || hasStatusCol
    const portStatusExpression = hasPortStatusCol
      ? hasStatusCol
        ? 'COALESCE(nop.port_status, nop.status)'
        : 'nop.port_status'
      : hasStatusCol
        ? 'nop.status'
        : "'UNKNOWN'"

    if (
      !hasOdpId ||
      !hasOdpCode ||
      !hasOdpName ||
      !hasPortId ||
      !hasPortOdpId ||
      !hasPortNo ||
      !hasPortStatus
    ) {
      return Response.json({
        overview: null,
        ports: [],
        statusSummary: {},
        ready: false,
        truncated: false,
        reason: 'Schema ODP / network_odp_ports minimal belum siap pada review DB aktif.',
      } satisfies OdpPortMapResponse)
    }

    const odpWhereExpression = odpCode ? 'UPPER(no.code) = UPPER(?)' : 'no.id = ?'
    const odpWhereParams: unknown[] = odpCode ? [odpCode] : [odpIdRaw]

    const odpOverviewSelect = `
      no.id AS odpId,
      no.code AS odpCode,
      no.name AS odpName,
      ${hasOdpTotalPorts ? 'no.total_ports' : '0'} AS totalPorts,
      ${hasOdpActivePorts ? 'no.active_ports' : '0'} AS activePorts,
      ${hasOdpLocationText ? 'no.location_text' : 'NULL'} AS locationText,
      ${hasOdpLatitude ? 'no.latitude' : 'NULL'} AS latitude,
      ${hasOdpLongitude ? 'no.longitude' : 'NULL'} AS longitude
    `
    const overviews = await runReviewDbQuery<OdpOverviewRow>(
      `
        SELECT
          ${odpOverviewSelect}
        FROM network_odp no
        WHERE ${odpWhereExpression}
        LIMIT 1
      `,
      odpWhereParams,
    )
    const overview = overviews[0] ?? null
    if (!overview) {
      return Response.json({
        overview: null,
        ports: [],
        statusSummary: {},
        ready: true,
        truncated: false,
        reason: 'ODP tidak ditemukan di review DB.',
      } satisfies OdpPortMapResponse, { status: 404 })
    }

    const portInstalledExpression = hasPortInstalledAt
      ? 'nop.installed_at'
      : hasPortCreatedAt
        ? 'nop.created_at'
        : 'NULL'
    const portOrderByExpression = hasPortInstalledAt && hasPortCreatedAt
      ? 'COALESCE(nop.installed_at, nop.created_at) ASC, nop.port_no ASC, nop.id ASC'
      : hasPortInstalledAt
        ? 'nop.installed_at ASC, nop.port_no ASC, nop.id ASC'
        : hasPortCreatedAt
          ? 'nop.created_at ASC, nop.port_no ASC, nop.id ASC'
          : hasPortUpdatedAt
            ? 'nop.port_no ASC, nop.id ASC'
            : 'nop.port_no ASC, nop.id ASC'

    const portWhereValues: unknown[] = [overview.odpId]
    const portWherePortNoClause = portNo === null ? '' : ` AND CAST(nop.port_no AS UNSIGNED) = ?`
    if (portNo !== null) {
      portWhereValues.push(portNo)
    }

    const ports = await runReviewDbQuery<OdpPortMapRow>(
      `
        SELECT
          nop.id AS portId,
          no.code AS odpCode,
          no.name AS odpName,
          CAST(nop.port_no AS UNSIGNED) AS portNo,
          ${portStatusExpression} AS portStatus,
          ${canJoinPortSubscription ? 'ss.service_no' : 'NULL'} AS serviceNo,
          ${canJoinPortCustomer ? 'c.customer_code' : 'NULL'} AS customerCode,
          ${canJoinPortCustomer ? 'c.full_name' : 'NULL'} AS customerName,
          ${portInstalledExpression} AS installedAt
        FROM network_odp_ports nop
        JOIN network_odp no
          ON no.id = nop.odp_id
        ${
          canJoinPortSubscription
            ? `
        LEFT JOIN service_subscriptions ss
          ON ss.id = nop.subscription_id`
            : ''
        }
        ${
          canJoinPortCustomer
            ? `
        LEFT JOIN crm_customers c
          ON c.id = nop.customer_id`
            : ''
        }
        WHERE nop.odp_id = ?${portWherePortNoClause}
        ORDER BY ${portOrderByExpression}
        LIMIT 1024
      `,
      portWhereValues,
    )

    return Response.json({
      overview,
      ports: ports.map((port) => ({
        ...port,
        portNo: Number.isInteger(port.portNo) ? port.portNo : Number.parseInt(String(port.portNo ?? '0'), 10) || 0,
        portStatus: String(port.portStatus ?? 'UNKNOWN').toUpperCase() || 'UNKNOWN',
      })),
      statusSummary: summaryFromPorts(ports),
      ready: true,
      truncated: ports.length === 1024,
    } satisfies OdpPortMapResponse)
  } catch (error) {
    return Response.json(
      {
        overview: null,
        ports: [],
        statusSummary: {},
        ready: false,
        truncated: false,
        reason: getReviewDbErrorDetail(error),
      } satisfies OdpPortMapResponse,
      { status: 500 },
    )
  }
}
