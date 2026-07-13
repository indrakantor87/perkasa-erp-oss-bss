import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type TroubleTicketSlaRow = {
  troubleType: string
}

function normalizeRequiredText(value: unknown) {
  return String(value ?? '').trim()
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'support', 'approve')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Pengaturan SLA support hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const payload = (await request.json()) as {
      troubleType?: unknown
      durationDays?: unknown
    }

    const troubleType = normalizeRequiredText(payload.troubleType).toUpperCase()
    const durationDays = Number(payload.durationDays)

    if (!troubleType) {
      return Response.json({ message: 'Tipe trouble ticket wajib diisi.' }, { status: 400 })
    }
    if (!Number.isInteger(durationDays) || durationDays <= 0 || durationDays > 365) {
      return Response.json({ message: 'Durasi SLA harus berupa angka 1 sampai 365 hari.' }, { status: 400 })
    }

    const [hasTroubleType, hasDurationDays, hasUpdatedAt] = await Promise.all([
      hasReviewDbColumn('support_trouble_ticket_sla', 'trouble_type'),
      hasReviewDbColumn('support_trouble_ticket_sla', 'duration_days'),
      hasReviewDbColumn('support_trouble_ticket_sla', 'updated_at'),
    ])

    if (!hasTroubleType || !hasDurationDays) {
      return Response.json(
        { message: 'Master SLA trouble ticket belum siap pada review DB aktif. Lengkapi schema inti terlebih dahulu.' },
        { status: 503 },
      )
    }

    const [existingSla] = await runReviewDbQuery<TroubleTicketSlaRow>(
      `
        SELECT trouble_type AS troubleType
        FROM support_trouble_ticket_sla
        WHERE UPPER(TRIM(trouble_type)) = UPPER(TRIM(?))
        LIMIT 1
      `,
      [troubleType]
    )

    if (existingSla) {
      const updateAssignments = ['duration_days = ?']
      const updateValues: unknown[] = [durationDays]

      if (hasUpdatedAt) {
        updateAssignments.push('updated_at = CURRENT_TIMESTAMP')
      }

      updateValues.push(troubleType)

      await runReviewDbExecute(
        `
          UPDATE support_trouble_ticket_sla
          SET ${updateAssignments.join(',\n              ')}
          WHERE UPPER(TRIM(trouble_type)) = UPPER(TRIM(?))
        `,
        updateValues
      )

      return Response.json({
        message: `SLA ${troubleType} berhasil diperbarui menjadi ${durationDays} hari.`,
      })
    }

    await runReviewDbExecute(
      `
        INSERT INTO support_trouble_ticket_sla (
          trouble_type,
          duration_days
        )
        VALUES (?, ?)
      `,
      [troubleType, durationDays]
    )

    return Response.json({
      message: `SLA ${troubleType} berhasil dibuat dengan durasi ${durationDays} hari.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
