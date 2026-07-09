import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedResolutionStatuses = new Set(['DONE', 'CANCELLED'])

type BillingInvoiceRow = {
  id: number
  invoiceNo: string
}

type BillingCollectionActionRow = {
  id: number
  actionType: string
  actionStatus: string
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
      { message: 'Resolve collection billing hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      invoiceNo?: unknown
      resolutionStatus?: unknown
      resolutionNotes?: unknown
    }

    const invoiceNo = String(payload.invoiceNo ?? '').trim()
    const resolutionStatus = String(payload.resolutionStatus ?? '').trim().toUpperCase()
    const resolutionNotes = String(payload.resolutionNotes ?? '').trim()

    if (!invoiceNo) {
      return Response.json({ message: 'Nomor invoice wajib diisi.' }, { status: 400 })
    }
    if (!allowedResolutionStatuses.has(resolutionStatus)) {
      return Response.json({ message: 'Status resolve collection tidak valid.' }, { status: 400 })
    }
    if (!resolutionNotes) {
      return Response.json({ message: 'Catatan resolve wajib diisi.' }, { status: 400 })
    }

    const [invoice] = await runReviewDbQuery<BillingInvoiceRow>(
      `
        SELECT id, invoice_no AS invoiceNo
        FROM billing_invoices
        WHERE invoice_no = ?
        LIMIT 1
      `,
      [invoiceNo],
    )
    if (!invoice) {
      return Response.json({ message: 'Invoice tidak ditemukan di review DB.' }, { status: 404 })
    }

    const [openAction] = await runReviewDbQuery<BillingCollectionActionRow>(
      `
        SELECT
          id,
          action_type AS actionType,
          action_status AS actionStatus
        FROM billing_collection_actions
        WHERE invoice_id = ?
          AND COALESCE(UPPER(TRIM(action_status)), 'OPEN') = 'OPEN'
        ORDER BY id DESC
        LIMIT 1
      `,
      [invoice.id],
    )
    if (!openAction) {
      return Response.json({ message: `Invoice ${invoice.invoiceNo} tidak punya follow-up collection OPEN.` }, { status: 409 })
    }

    const noteText = `[Resolved via web] ${session.displayName} (${session.username}) - ${resolutionNotes}`

    await runReviewDbExecute(
      `
        UPDATE billing_collection_actions
        SET
          action_status = ?,
          due_follow_up_at = NULL,
          notes = CASE
            WHEN notes IS NULL OR notes = '' THEN ?
            ELSE CONCAT(notes, '\n', ?)
          END
        WHERE id = ?
      `,
      [resolutionStatus, noteText, noteText, openAction.id],
    )

    return Response.json({
      message: `Follow-up collection ${openAction.actionType} untuk invoice ${invoice.invoiceNo} berhasil diresolve sebagai ${resolutionStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
