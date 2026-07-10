import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  createDashboardKpiDefinition,
  getDashboardKpiErrorDetail,
  listMergedDashboardKpiDefinitions,
  resolveDashboardKpiManagerScope,
} from '@/lib/services/dashboard-kpi-service'

function getErrorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : ''
  if (
    message.includes('hak manager') ||
    message.includes('hanya boleh mengelola') ||
    message.includes('Unauthorized') ||
    message.includes('Forbidden')
  ) {
    return 403
  }
  return 400
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Mode review database belum aktif.' }, { status: 503 })
  }

  try {
    const url = new URL(request.url)
    const requestedDivisionName = String(url.searchParams.get('divisionName') ?? '').trim()
    const requestedSubdivisionName = String(url.searchParams.get('subdivisionName') ?? '').trim()
    const dashboardKey = String(url.searchParams.get('dashboardKey') ?? '').trim()
    const activeOnly = url.searchParams.get('activeOnly') === '1'
    const managerScope = await resolveDashboardKpiManagerScope(session)

    const divisionName =
      managerScope.planningLevel === 'SUPER_ADMIN'
        ? requestedDivisionName || managerScope.divisionName || 'Pemasaran dan Pelayanan'
        : managerScope.divisionName || 'Pemasaran dan Pelayanan'
    const subdivisionName =
      managerScope.planningLevel === 'SUPER_ADMIN'
        ? requestedSubdivisionName || managerScope.subdivisionName || 'Penjualan'
        : managerScope.subdivisionName || 'Penjualan'

    const definitions = await listMergedDashboardKpiDefinitions({
      divisionName,
      subdivisionName,
      dashboardKey: dashboardKey || undefined,
      activeOnly,
    })

    return Response.json({ definitions, managerScope })
  } catch (error) {
    return Response.json({ message: getDashboardKpiErrorDetail(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Kelola KPI dashboard hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      divisionName?: unknown
      subdivisionName?: unknown
      dashboardKey?: unknown
      metricKey?: unknown
      metricLabel?: unknown
      metricType?: unknown
      templateKey?: unknown
      displayOrder?: unknown
      drilldownHref?: unknown
    }

    const definition = await createDashboardKpiDefinition({
      session,
      divisionName: String(payload.divisionName ?? ''),
      subdivisionName: String(payload.subdivisionName ?? ''),
      dashboardKey: String(payload.dashboardKey ?? ''),
      metricKey: String(payload.metricKey ?? ''),
      metricLabel: String(payload.metricLabel ?? ''),
      metricType: String(payload.metricType ?? 'COUNT').trim().toUpperCase() as 'COUNT' | 'SUM' | 'PERCENTAGE',
      templateKey: String(payload.templateKey ?? ''),
      displayOrder: Number(payload.displayOrder ?? 0),
      drilldownHref: String(payload.drilldownHref ?? ''),
    })

    return Response.json({ message: 'Definisi KPI dashboard berhasil dibuat.', definition })
  } catch (error) {
    const message = getDashboardKpiErrorDetail(error)
    return Response.json({ message }, { status: getErrorStatus(error) })
  }
}
