import { runReviewDbQuery, runReviewDbExecute, runReviewDbTransaction } from '@/lib/review-db'
import { ensureHrBatch01Schema } from '@/lib/services/hr-batch01-schema-ensure'

type RawEventRow = {
  id: number
  sync_run_id: number | null
  machine_id: number
  machine_user_id: string
  employee_id: number
  event_timestamp_original: string
  event_timestamp_normalized: string
  event_type_raw: string | null
  event_mode: 'IN' | 'OUT' | 'UNDEFINED'
  verify_score: number | null
  raw_payload_json: string | null
  received_at: string
  deduplication_hash: string
  is_processed: number
  is_unmapped: number
  processing_notes: string | null
}

type ExistingAttendanceRow = {
  id: number
  employee_id: number
  attendance_date: string
  check_in: string | null
  check_out: string | null
  status: string | null
  overtime_hours: number | null
  locked_by_admin: number
  source_type: string | null
  fingerprint_device_id: number | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
  changedRows?: number
}

export type ProcessRawEventsOptions = {
  startDate?: Date
  endDate?: Date
  employeeId?: number
}

export type ProcessRawEventsResult = {
  totalProcessed: number
  totalInserted: number
  totalUpdated: number
  totalSkippedLocked: number
}

function toISODateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function extractDatePart(datetimeStr: string): string {
  return datetimeStr.split('T')[0].split(' ')[0]
}

function extractTimePart(datetimeStr: string): string {
  const t = datetimeStr.split('T')
  const time = t.length > 1 ? t[1] : datetimeStr.split(' ')[1]
  return (time || '00:00:00').split('.')[0]
}

function timeCompare(timeStr: string, compare: string): number {
  const [h1, m1, s1] = timeStr.split(':').map((n) => Number(n))
  const [h2, m2, s2] = compare.split(':').map((n) => Number(n))
  if (h1 !== h2) return h1 - h2
  if (m1 !== m2) return m1 - m2
  return s1 - s2
}

export async function processRawEventsToDailyAttendance(
  options: ProcessRawEventsOptions = {}
): Promise<ProcessRawEventsResult> {
  await ensureHrBatch01Schema()

  const result: ProcessRawEventsResult = {
    totalProcessed: 0,
    totalInserted: 0,
    totalUpdated: 0,
    totalSkippedLocked: 0,
  }

  const whereClauses: string[] = [
    'r.is_processed = 0',
    'r.employee_id IS NOT NULL',
    'r.is_unmapped = 0',
  ]
  const whereValues: unknown[] = []

  if (options.startDate) {
    whereClauses.push('DATE(r.event_timestamp_normalized) >= ?')
    whereValues.push(toISODateString(options.startDate))
  }
  if (options.endDate) {
    whereClauses.push('DATE(r.event_timestamp_normalized) <= ?')
    whereValues.push(toISODateString(options.endDate))
  }
  if (options.employeeId) {
    whereClauses.push('r.employee_id = ?')
    whereValues.push(options.employeeId)
  }

  const whereClause = whereClauses.join(' AND ')

  const rawEvents = await runReviewDbQuery<RawEventRow>(
    `
      SELECT
        r.id,
        r.sync_run_id,
        r.machine_id,
        r.machine_user_id,
        r.employee_id,
        CAST(r.event_timestamp_original AS CHAR) AS event_timestamp_original,
        CAST(r.event_timestamp_normalized AS CHAR) AS event_timestamp_normalized,
        r.event_type_raw,
        r.event_mode,
        r.verify_score,
        r.raw_payload_json,
        CAST(r.received_at AS CHAR) AS received_at,
        r.deduplication_hash,
        r.is_processed,
        r.is_unmapped,
        r.processing_notes
      FROM hr_fp_raw_events r
      WHERE ${whereClause}
      ORDER BY r.event_timestamp_normalized ASC, r.id ASC
    `,
    whereValues
  )

  if (rawEvents.length === 0) {
    return result
  }

  type GroupKey = string
  const groups = new Map<GroupKey, RawEventRow[]>()

  for (const event of rawEvents) {
    const datePart = extractDatePart(event.event_timestamp_normalized)
    const key = `${event.employee_id}__${datePart}`
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(event)
  }

  await runReviewDbTransaction(async (conn) => {
    for (const [groupKey, events] of groups) {
      const [employeeIdStr, attendanceDate] = groupKey.split('__')
      const employeeId = Number(employeeIdStr)

      let clockIn: string | null = null
      let clockOut: string | null = null

      const validInEvents = events.filter((e) => {
        const time = extractTimePart(e.event_timestamp_normalized)
        return timeCompare(time, '12:00:00') <= 0 || e.event_mode === 'IN' || e.event_mode === 'UNDEFINED'
      })

      if (validInEvents.length > 0) {
        clockIn = validInEvents.reduce((min, e) =>
          e.event_timestamp_normalized < min.event_timestamp_normalized ? e : min
        ).event_timestamp_normalized
      }

      const validOutEvents = events.filter((e) => {
        const time = extractTimePart(e.event_timestamp_normalized)
        return timeCompare(time, '11:00:00') >= 0 || e.event_mode === 'OUT' || e.event_mode === 'UNDEFINED'
      })

      if (validOutEvents.length > 0) {
        clockOut = validOutEvents.reduce((max, e) =>
          e.event_timestamp_normalized > max.event_timestamp_normalized ? e : max
        ).event_timestamp_normalized
      }

      const hasValidInEvent = validInEvents.length > 0
      const status = hasValidInEvent ? 'PRESENT' : 'PRESENT'

      const minMachineId = events.reduce((min, e) => Math.min(min, e.machine_id), events[0].machine_id)

      const [existingRows] = await conn.query(
        `
          SELECT
            a.id,
            a.employee_id,
            CAST(a.attendance_date AS CHAR) AS attendance_date,
            CAST(a.check_in AS CHAR) AS check_in,
            CAST(a.check_out AS CHAR) AS check_out,
            a.status,
            a.overtime_hours,
            a.locked_by_admin,
            a.source_type,
            a.fingerprint_device_id
          FROM hr_attendance a
          WHERE a.employee_id = ? AND a.attendance_date = ?
          LIMIT 1
        `,
        [employeeId, attendanceDate]
      ) as unknown as [ExistingAttendanceRow[], unknown]

      const existing = existingRows[0]

      if (!existing) {
        await conn.query(
          `
            INSERT INTO hr_attendance (
              employee_id,
              attendance_date,
              check_in,
              check_out,
              status,
              source_type,
              fingerprint_device_id,
              locked_by_admin
            ) VALUES (?, ?, ?, ?, ?, 'SOURCE_FINGERPRINT_MACHINE', ?, 0)
          `,
          [
            employeeId,
            attendanceDate,
            clockIn,
            clockOut,
            status,
            minMachineId,
          ]
        )
        result.totalInserted++
      } else if (existing.locked_by_admin === 1) {
        result.totalSkippedLocked++
      } else {
        const currentSource = existing.source_type

        // ================================================================
        // ATTENDANCE SOURCE PROVENANCE RULE (Historical Integrity Guard)
        // ----------------------------------------------------------------
        // Source type adalah HISTORICAL PROVENANCE, bukan status normalisasi.
        // Jangan pernah rewrite source type hanya karena record di-reprocess.
        //
        // A. NEW records (insert branch di atas): SELALU source_type =
        //    SOURCE_FINGERPRINT_MACHINE (provenance: raw event mesin FP).
        //
        // B. Existing records saat UPDATE:
        //    - Jika existing sudah memiliki source_type HISTORIS non-FP
        //      (SOURCE_BROWSER / SOURCE_MANUAL / SOURCE_FACE / SOURCE_GPS /
        //       SOURCE_OTHER dst):
        //         => source_type ASLI DIPERTAHANKAN APA ADANYA. JANGAN rewrite.
        //         => HANYA update ci/co/status/fingerprint_device_id/locked=0.
        //    - Jika existing SOURCE_FINGERPRINT_MACHINE:
        //         => Pertahankan source_type = SOURCE_FINGERPRINT_MACHINE.
        //    - Jika existing SOURCE_MANUAL_CORRECTION:
        //         => Pertahankan correction marker audit. Never overwrite.
        // ================================================================
        //
        // newSourceType default = pertahankan current source existing ASLI.
        // HANYA replace SOURCE_FINGERPRINT_MACHINE canonical IF existing
        // source is NULL/undefined (artinya lawas belum pernah assign)
        // dan record ini datang dari engine via raw event FP saat ini.
        // Jadi SOURCE_FINGERPRINT_MACHINE hanya diberikan apabila source
        // tidak ada histori (null).
        // ----------------------------------------------------------------

        let newSourceType = currentSource
        if (currentSource == null) {
          // Source NULL = lawas record tanpa provenance, DAN sekarang
          // sedang di-update dari raw event FP engine. Assign canonical FP.
          newSourceType = 'SOURCE_FINGERPRINT_MACHINE'
        }

        const newFingerprintDeviceId = existing.fingerprint_device_id ?? minMachineId

        // ================================================================
        // Kondisi UPDATE: JALANKAN UPDATE SELALU kecuali locked.
        // (Kita selalu update ci/co/status/fp_device_id sesuai raw events.)
        // Tetapi: source_type diatas sesuai provenance rule.
        // RULE: HINDARI relabel generic non-correction => FP!
        // ================================================================
        await conn.query(
          `
            UPDATE hr_attendance
            SET check_in = ?,
                check_out = ?,
                status = ?,
                source_type = ?,
                fingerprint_device_id = ?
            WHERE id = ?
          `,
          [
            clockIn,
            clockOut,
            status,
            newSourceType,
            newFingerprintDeviceId,
            existing.id,
          ]
        )
        result.totalUpdated++
      }

      const eventIds = events.map((e) => e.id)
      const placeholders = eventIds.map(() => '?').join(', ')
      await conn.query(
        `UPDATE hr_fp_raw_events SET is_processed = 1 WHERE id IN (${placeholders})`,
        eventIds
      )
      result.totalProcessed += events.length
    }
  })

  return result
}
