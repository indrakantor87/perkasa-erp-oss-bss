import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type OdpRow = {
  id: number
  code: string
}

type PortRow = {
  id: number
  portStatus: string
}

type SubscriptionRow = {
  id: number
  serviceNo: string
}

type CustomerRow = {
  id: number
  customerCode: string
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function normalizePortStatus(value: string) {
  return String(value ?? '').trim().toUpperCase()
}

async function getOdpPortQueryParts() {
  const [hasPortStatus] = await Promise.all([hasReviewDbColumn('network_odp_ports', 'port_status')])

  return {
    portStatusExpression: hasPortStatus ? 'port_status' : "'AVAILABLE'",
  }
}

async function buildOdpPortUpdatePayload(params: {
  subscriptionId: number | null
  customerId: number | null
  noteText: string
}) {
  const [hasPortStatus, hasSubscriptionId, hasCustomerId, hasInstalledAt, hasNotes, hasUpdatedAt] = await Promise.all([
    hasReviewDbColumn('network_odp_ports', 'port_status'),
    hasReviewDbColumn('network_odp_ports', 'subscription_id'),
    hasReviewDbColumn('network_odp_ports', 'customer_id'),
    hasReviewDbColumn('network_odp_ports', 'installed_at'),
    hasReviewDbColumn('network_odp_ports', 'notes'),
    hasReviewDbColumn('network_odp_ports', 'updated_at'),
  ])

  const assignments: string[] = []
  const values: unknown[] = []

  if (hasPortStatus) {
    assignments.push(`port_status = 'USED'`)
  }
  if (hasSubscriptionId) {
    assignments.push('subscription_id = ?')
    values.push(params.subscriptionId)
  }
  if (hasCustomerId) {
    assignments.push('customer_id = ?')
    values.push(params.customerId)
  }
  if (hasInstalledAt) {
    assignments.push('installed_at = CURRENT_TIMESTAMP')
  }
  if (hasNotes) {
    assignments.push(`notes = CASE
            WHEN notes IS NULL OR TRIM(notes) = '' THEN ?
            ELSE CONCAT(notes, '\n', ?)
          END`)
    values.push(params.noteText, params.noteText)
  }
  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  if (!assignments.length) {
    throw new Error('Schema network_odp_ports belum siap untuk assignment port.')
  }

  return {
    assignments,
    values,
  }
}

async function buildOdpActivePortUpdatePayload(odpId: number) {
  const [hasActivePorts, hasUpdatedAt, hasPortStatus] = await Promise.all([
    hasReviewDbColumn('network_odp', 'active_ports'),
    hasReviewDbColumn('network_odp', 'updated_at'),
    hasReviewDbColumn('network_odp_ports', 'port_status'),
  ])

  if (!hasActivePorts && !hasUpdatedAt) {
    return null
  }

  const assignments: string[] = []
  const values: unknown[] = []

  if (hasActivePorts) {
    assignments.push(`active_ports = (
            SELECT COUNT(*)
            FROM network_odp_ports
            WHERE odp_id = ?
              ${hasPortStatus ? "AND port_status = 'USED'" : ''}
          )`)
    values.push(odpId)
  }
  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  return {
    assignments,
    values,
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action assign port hanya aktif saat review DB benar-benar tersedia.' }, { status: 503 })
  }

  try {
    const payload = (await request.json()) as {
      odpCode?: unknown
      portNo?: unknown
      serviceNo?: unknown
      customerCode?: unknown
      notes?: unknown
    }

    const odpCode = String(payload.odpCode ?? '').trim()
    const portNo = Number.parseInt(String(payload.portNo ?? '').trim() || '0', 10)
    const serviceNo = String(payload.serviceNo ?? '').trim()
    const customerCode = String(payload.customerCode ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()

    if (!odpCode) {
      return Response.json({ message: 'ODP wajib dipilih.' }, { status: 400 })
    }
    if (!Number.isInteger(portNo) || portNo <= 0) {
      return Response.json({ message: 'Port no tidak valid.' }, { status: 400 })
    }

    const [odp] = await runReviewDbQuery<OdpRow>(
      `
        SELECT id, code
        FROM network_odp
        WHERE UPPER(code) = UPPER(?)
        LIMIT 1
      `,
      [odpCode],
    )
    if (!odp) {
      return Response.json({ message: 'ODP tidak ditemukan di review DB.' }, { status: 404 })
    }

    const odpPortQueryParts = await getOdpPortQueryParts()
    const [port] = await runReviewDbQuery<PortRow>(
      `
        SELECT id, ${odpPortQueryParts.portStatusExpression} AS portStatus
        FROM network_odp_ports
        WHERE odp_id = ?
          AND port_no = ?
        LIMIT 1
      `,
      [odp.id, portNo],
    )
    if (!port) {
      return Response.json({ message: 'Port ODP tidak ditemukan. Pastikan port sudah digenerate.' }, { status: 404 })
    }

    const currentStatus = normalizePortStatus(port.portStatus)
    if (!['AVAILABLE', 'RESERVED'].includes(currentStatus)) {
      return Response.json({ message: `Port ODP tidak bisa dipakai karena status ${currentStatus}.` }, { status: 409 })
    }

    let subscriptionId: number | null = null
    if (serviceNo) {
      const [subscription] = await runReviewDbQuery<SubscriptionRow>(
        `
          SELECT id, service_no AS serviceNo
          FROM service_subscriptions
          WHERE UPPER(service_no) = UPPER(?)
          LIMIT 1
        `,
        [serviceNo],
      )
      if (!subscription) {
        return Response.json({ message: 'Service no tidak ditemukan di review DB.' }, { status: 404 })
      }
      subscriptionId = subscription.id
    }

    let customerId: number | null = null
    if (customerCode) {
      const [customer] = await runReviewDbQuery<CustomerRow>(
        `
          SELECT id, customer_code AS customerCode
          FROM crm_customers
          WHERE UPPER(customer_code) = UPPER(?)
          LIMIT 1
        `,
        [customerCode],
      )
      if (!customer) {
        return Response.json({ message: 'Customer code tidak ditemukan di review DB.' }, { status: 404 })
      }
      customerId = customer.id
    }

    const noteText = `[Assign ODP] ${session.displayName} (${session.username})${notesRaw ? ` - ${notesRaw}` : ''}`
    const odpPortUpdatePayload = await buildOdpPortUpdatePayload({
      subscriptionId,
      customerId,
      noteText,
    })

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE network_odp_ports
        SET
          ${odpPortUpdatePayload.assignments.join(',\n          ')}
        WHERE id = ?
      `,
      [...odpPortUpdatePayload.values, port.id],
    )

    const odpActivePortUpdatePayload = await buildOdpActivePortUpdatePayload(odp.id)

    if (odpActivePortUpdatePayload) {
      await runReviewDbExecute<InsertResult>(
        `
          UPDATE network_odp
          SET
            ${odpActivePortUpdatePayload.assignments.join(',\n            ')}
          WHERE id = ?
        `,
        [...odpActivePortUpdatePayload.values, odp.id],
      )
    }

    return Response.json({
      message: `Port ${odp.code} #${portNo} berhasil di-assign.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
