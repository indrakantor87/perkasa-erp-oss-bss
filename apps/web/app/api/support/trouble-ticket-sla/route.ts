import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type TroubleTicketSlaRow = {
  id: number
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

    const [existingSla] = await runReviewDbQuery<TroubleTicketSlaRow>(
      `
        SELECT id
        FROM support_trouble_ticket_sla
        WHERE UPPER(trouble_type) = ?
        LIMIT 1
      `,
      [troubleType]
    )

    if (existingSla) {
      await runReviewDbExecute(
        `
          UPDATE support_trouble_ticket_sla
          SET duration_days = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [durationDays, existingSla.id]
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
