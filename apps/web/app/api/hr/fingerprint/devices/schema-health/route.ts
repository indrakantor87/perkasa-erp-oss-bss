import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, hasReviewDbTable } from '@/lib/review-db'

const REQUIRED_RAW_EVENT_COLS = [
  'event_timestamp_original',
  'event_timestamp_normalized',
  'event_mode',
  'raw_payload_json',
  'received_at',
  'processing_notes',
] as const

const EXPECTED_TOTAL_COLS = 17

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  const source = getDataSourceSnapshot()
  if (source.isFallback) {
    return Response.json(
      { message: 'Schema health HR fingerprint hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }
  try {
    const url = new URL(request.url)
    const machineIdRaw = url.searchParams.get('machineId')
    const _machineId = machineIdRaw ? Number.parseInt(machineIdRaw, 10) || undefined : undefined
    const tableExists = await hasReviewDbTable('hr_fp_raw_events')
    const missingColumns: string[] = []
    const presentColumns: string[] = []
    if (tableExists) {
      for (const col of REQUIRED_RAW_EVENT_COLS) {
        if (await hasReviewDbColumn('hr_fp_raw_events', col)) presentColumns.push(col)
        else missingColumns.push(col)
      }
    }
    const actualCols = Number(url.searchParams.get('__totalColsHint')) || 0
    const schemaOk = Boolean(tableExists && missingColumns.length === 0)
    return Response.json({
      table: 'hr_fp_raw_events',
      tableExists,
      schemaOk,
      migrationRequired: !schemaOk,
      requiredColumns: [...REQUIRED_RAW_EVENT_COLS],
      requiredColumnCount: REQUIRED_RAW_EVENT_COLS.length,
      presentColumns,
      missingColumns,
      expectedTotalMinimumColumns: EXPECTED_TOTAL_COLS,
      actualTotalColumnsReported: actualCols || null,
      recommendedMigrationScript: 'scripts/migrate-add-fp-raw-events-6-required-columns.ts (mode=precheck|apply|postcheck)',
      nextAction: schemaOk
        ? 'Schema ready. Jalankan mapping fixture ENROLLED ≥5 rows kemudian manual sync authorized.'
        : `Jalankan migration additive 6 required columns: ${missingColumns.join(', ')} terlebih dahulu.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
