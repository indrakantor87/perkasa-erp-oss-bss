import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute } from '@/lib/review-db'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function normalizeOptionalText(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'support', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action isolir hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const payload = (await request.json()) as {
      customerName?: unknown
      customerPhone?: unknown
      customerAddress?: unknown
      marketingName?: unknown
      radboxName?: unknown
      packagePrice?: unknown
      reason?: unknown
    }

    const customerName = String(payload.customerName ?? '').trim()
    const customerPhone = normalizeOptionalText(payload.customerPhone)
    const customerAddress = normalizeOptionalText(payload.customerAddress)
    const marketingName = normalizeOptionalText(payload.marketingName)
    const radboxName = normalizeOptionalText(payload.radboxName)
    const packagePrice = normalizePrice(payload.packagePrice)
    const reasonRaw = String(payload.reason ?? '').trim()

    if (!customerName) {
      return Response.json({ message: 'Nama customer wajib diisi.' }, { status: 400 })
    }
    if (!reasonRaw) {
      return Response.json({ message: 'Alasan isolir wajib diisi.' }, { status: 400 })
    }
    if (payload.packagePrice != null && String(payload.packagePrice).trim() && packagePrice == null) {
      return Response.json({ message: 'Format harga paket tidak valid.' }, { status: 400 })
    }

    const reason = `[Review Isolir] ${session.displayName} (${session.username}) - ${reasonRaw}`

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO support_isolations (
          subscription_id,
          customer_name,
          customer_address,
          customer_phone,
          marketing_name,
          radbox_name,
          package_price,
          isolation_date,
          reason,
          status,
          is_archived
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'OPEN', 0)
      `,
      [null, customerName, customerAddress, customerPhone, marketingName, radboxName, packagePrice, reason]
    )

    return Response.json({
      message: `Data isolir aktif untuk ${customerName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
