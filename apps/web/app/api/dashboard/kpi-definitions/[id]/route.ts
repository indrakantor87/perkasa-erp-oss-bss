import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  deleteDashboardKpiDefinition,
  getDashboardKpiErrorDetail,
  resolveDashboardKpiManagerScope,
  upsertDashboardKpiOverrideFromDefault,
  updateDashboardKpiDefinition,
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
  if (message.includes('tidak ditemukan')) {
    return 404
  }
  return 400
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ message: 'ID definisi KPI tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      divisionName?: unknown
      subdivisionName?: unknown
      metricLabel?: unknown
      displayOrder?: unknown
      isActive?: unknown
      drilldownHref?: unknown
    }

    try {
      const definition = await updateDashboardKpiDefinition({
        session,
        id,
        metricLabel: String(payload.metricLabel ?? ''),
        displayOrder: Number(payload.displayOrder ?? 0),
        isActive: Boolean(payload.isActive),
        drilldownHref: String(payload.drilldownHref ?? ''),
      })

      return Response.json({ message: 'Definisi KPI dashboard berhasil diperbarui.', definition })
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : ''
      if (rawMessage.includes('default sistem')) {
        const managerScope = await resolveDashboardKpiManagerScope(session)
        const divisionName = String(payload.divisionName ?? '').trim() || managerScope.divisionName || 'Pemasaran dan Pelayanan'
        const subdivisionName = String(payload.subdivisionName ?? '').trim() || managerScope.subdivisionName || 'Penjualan'

        const definition = await upsertDashboardKpiOverrideFromDefault({
          session,
          defaultId: id,
          divisionName,
          subdivisionName,
          metricLabel: String(payload.metricLabel ?? ''),
          displayOrder: Number(payload.displayOrder ?? 0),
          isActive: Boolean(payload.isActive),
          drilldownHref: String(payload.drilldownHref ?? ''),
        })

        return Response.json({ message: 'Override KPI default berhasil disimpan.', definition })
      }

      throw error
    }
  } catch (error) {
    const message = getDashboardKpiErrorDetail(error)
    return Response.json({ message }, { status: getErrorStatus(error) })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    if (!Number.isInteger(id) || id <= 0) {
      return Response.json({ message: 'ID definisi KPI tidak valid.' }, { status: 400 })
    }

    await deleteDashboardKpiDefinition({ session, id })
    return Response.json({ message: 'Definisi KPI dashboard berhasil dihapus.' })
  } catch (error) {
    const message = getDashboardKpiErrorDetail(error)
    return Response.json({ message }, { status: getErrorStatus(error) })
  }
}
