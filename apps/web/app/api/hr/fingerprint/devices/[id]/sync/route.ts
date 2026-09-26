import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import {
  ensureFingerprintTables,
  syncNow,
} from '@/lib/services/fingerprint/device-registry-service'
import type { SyncMode } from '@/lib/services/fingerprint/types'

function parseIdParam(idSegment: string | undefined) {
  const raw = String(idSegment ?? '').trim()
  const parsed = Number.parseInt(raw, 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: idLocal } = await params
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Sync attendance fingerprint HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const id = parseIdParam(idLocal)
    if (!id) {
      return Response.json({ message: 'ID device fingerprint tidak valid.' }, { status: 400 })
    }

    let syncMode: SyncMode = 'MANUAL'
    try {
      const payload = (await request.json()) as { syncMode?: unknown }
      const modeRaw = String(payload.syncMode ?? '').trim().toUpperCase()
      if (modeRaw === 'SCHEDULED' || modeRaw === 'RETRY') {
        syncMode = modeRaw
      }
    } catch {
      syncMode = 'MANUAL'
    }

    await ensureFingerprintTables()
    const result = await syncNow(id, session.userId ?? null, syncMode)

    const summary = `${result.totalRecordsFetched} fetched, ${result.totalNewValid} baru, ${result.totalDuplicatesSkipped} duplikat, ${result.totalUnmapped} unmapped, ${result.totalFailedParse} gagal parse. Cursor: ${result.cursorAdvanced ? 'MAJU' : 'TIDAK MAJU'}`

    if (result.finalStatus === 'SUCCESS') {
      await recordHrAudit({
        actionType: 'ATTENDANCE_SYNC_SUCCESS',
        actor: `${session.displayName} (${session.username})`,
        targetRef: `FP-RUN-${result.id}`,
        detail: `Sync attendance SUCCESS device ${id} mode ${syncMode}. ${summary}.`,
      })
    } else if (result.finalStatus === 'PARTIAL') {
      await recordHrAudit({
        actionType: 'ATTENDANCE_SYNC_PARTIAL',
        actor: `${session.displayName} (${session.username})`,
        targetRef: `FP-RUN-${result.id}`,
        detail: `Sync attendance PARTIAL device ${id} mode ${syncMode}. ${summary}.`,
      })
    } else {
      await recordHrAudit({
        actionType: 'ATTENDANCE_SYNC_FAILED',
        actor: `${session.displayName} (${session.username})`,
        targetRef: `FP-RUN-${result.id}`,
        detail: `Sync attendance FAILED device ${id} mode ${syncMode}. ${summary}. Error: ${result.errorSummary ?? 'TIDAK ADA DETAIL'}`,
      })
    }

    return Response.json({
      run: result,
    })
  } catch (error) {
    const msg = error instanceof Error && error.message === 'MACHINE_NOT_FOUND'
      ? 'Device fingerprint tidak ditemukan.'
      : getReviewDbErrorDetail(error)
    return Response.json({ message: msg }, { status: 500 })
  }
}
