import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedResolutionStatuses = new Set(['DONE', 'CANCELLED'])

type BillingInvoiceRow = {
  id: number
  invoiceNo: string
  invoiceStatus: string
  collectionStatus: string | null
  suspendCandidate: number | null
}

type BillingCollectionActionRow = {
  id: number
  actionType: string
  actionStatus: string
}

function resolveInvoiceCollectionState(params: {
  invoiceStatus: string
  currentCollectionStatus: string
  suspendCandidate: number
  actionType: string
  resolutionStatus: string
}) {
  if (params.invoiceStatus === 'PAID' || params.invoiceStatus === 'CANCELLED') {
    return {
      collectionStatus: 'CLOSED',
      suspendCandidate: 0,
    }
  }

  switch (params.actionType) {
    case 'PROMISE_TO_PAY':
      return {
        collectionStatus: 'REMINDER',
        suspendCandidate: 0,
      }
    case 'SUSPEND':
      return params.resolutionStatus === 'CANCELLED'
        ? {
            collectionStatus: 'REMINDER',
            suspendCandidate: 0,
          }
        : {
            collectionStatus: params.currentCollectionStatus === 'SUSPEND' ? 'SUSPEND' : 'REMINDER',
            suspendCandidate:
              params.currentCollectionStatus === 'SUSPEND' || params.suspendCandidate > 0 ? 1 : 0,
          }
    case 'RECONNECT':
      return params.invoiceStatus === 'SUSPENDED' || params.currentCollectionStatus === 'RECONNECT'
        ? {
            collectionStatus: 'RECONNECT',
            suspendCandidate: 0,
          }
        : {
            collectionStatus: 'REMINDER',
            suspendCandidate: 0,
          }
    case 'VISIT':
    case 'CALL':
    case 'REMINDER':
      return {
        collectionStatus: 'REMINDER',
        suspendCandidate: 0,
      }
    case 'WRITE_OFF':
      return params.resolutionStatus === 'DONE'
        ? {
            collectionStatus: 'CLOSED',
            suspendCandidate: 0,
          }
        : {
            collectionStatus: 'REMINDER',
            suspendCandidate: 0,
          }
    default:
      return {
        collectionStatus: 'REMINDER',
        suspendCandidate: 0,
      }
  }
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
        SELECT
          id,
          invoice_no AS invoiceNo,
          invoice_status AS invoiceStatus,
          collection_status AS collectionStatus,
          suspend_candidate AS suspendCandidate
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
    const invoiceStatus = String(invoice.invoiceStatus ?? '').trim().toUpperCase()
    const currentCollectionStatus = String(invoice.collectionStatus ?? '').trim().toUpperCase()
    const nextCollectionState = resolveInvoiceCollectionState({
      invoiceStatus,
      currentCollectionStatus,
      suspendCandidate: Number(invoice.suspendCandidate ?? 0),
      actionType: String(openAction.actionType ?? '').trim().toUpperCase(),
      resolutionStatus,
    })

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

    await runReviewDbExecute(
      `
        UPDATE billing_invoices
        SET
          collection_status = ?,
          suspend_candidate = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nextCollectionState.collectionStatus, nextCollectionState.suspendCandidate, invoice.id],
    )

    return Response.json({
      message: `Follow-up collection ${openAction.actionType} untuk invoice ${invoice.invoiceNo} berhasil diresolve sebagai ${resolutionStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
