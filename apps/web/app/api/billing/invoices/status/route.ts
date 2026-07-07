import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedStatuses = new Set(['CANCELLED'])

type BillingInvoiceRow = {
  id: number
  invoiceNo: string
  customerName: string
  invoiceStatus: string
  paidAmount: number
  totalAmount: number
  notes: string | null
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'billing', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Update status invoice hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      invoiceNo?: unknown
      nextStatus?: unknown
      notes?: unknown
    }

    const invoiceNo = normalizeText(payload.invoiceNo).toUpperCase()
    const nextStatus = normalizeText(payload.nextStatus).toUpperCase()
    const notes = normalizeText(payload.notes)

    if (!invoiceNo) {
      return Response.json({ message: 'Nomor invoice wajib diisi.' }, { status: 400 })
    }
    if (!allowedStatuses.has(nextStatus)) {
      return Response.json({ message: 'Status invoice yang diminta tidak valid.' }, { status: 400 })
    }
    if (!notes) {
      return Response.json({ message: 'Catatan perubahan status wajib diisi.' }, { status: 400 })
    }

    const [invoice] = await runReviewDbQuery<BillingInvoiceRow>(
      `
        SELECT
          bi.id,
          bi.invoice_no AS invoiceNo,
          c.full_name AS customerName,
          bi.invoice_status AS invoiceStatus,
          bi.paid_amount AS paidAmount,
          bi.total_amount AS totalAmount,
          bi.notes
        FROM billing_invoices bi
        JOIN service_subscriptions ss
          ON ss.id = bi.subscription_id
        JOIN crm_customers c
          ON c.id = ss.customer_id
        WHERE bi.invoice_no = ?
        LIMIT 1
      `,
      [invoiceNo],
    )

    if (!invoice) {
      return Response.json({ message: 'Invoice tidak ditemukan di review DB.' }, { status: 404 })
    }
    if (invoice.invoiceStatus === 'CANCELLED') {
      return Response.json({ message: `Invoice ${invoice.invoiceNo} sudah berstatus CANCELLED.` }, { status: 409 })
    }
    if (Number(invoice.paidAmount) > 0) {
      return Response.json(
        {
          message: `Invoice ${invoice.invoiceNo} sudah memiliki pembayaran ${Number(invoice.paidAmount)} sehingga tidak boleh dibatalkan.`,
        },
        { status: 409 },
      )
    }

    const mergedNotes = [
      invoice.notes?.trim(),
      `[Status Update] ${session.displayName} (${session.username}) -> ${nextStatus} - ${notes}`,
    ]
      .filter(Boolean)
      .join('\n')

    await runReviewDbExecute(
      `
        UPDATE billing_invoices
        SET
          invoice_status = ?,
          collection_status = 'CLOSED',
          suspend_candidate = 0,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nextStatus, mergedNotes, invoice.id],
    )

    return Response.json({
      message: `Invoice ${invoice.invoiceNo} untuk ${invoice.customerName} berhasil diubah ke ${nextStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

