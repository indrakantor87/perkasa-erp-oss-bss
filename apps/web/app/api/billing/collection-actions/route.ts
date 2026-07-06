import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedActionTypes = new Set([
  'REMINDER',
  'CALL',
  'VISIT',
  'PROMISE_TO_PAY',
  'SUSPEND',
  'RECONNECT',
  'WRITE_OFF',
])

const allowedActionStatuses = new Set(['OPEN', 'DONE', 'CANCELLED'])

type BillingInvoiceRow = {
  id: number
}

type AuthUserRow = {
  id: number
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function mapCollectionStatus(actionType: string) {
  switch (actionType) {
    case 'PROMISE_TO_PAY':
      return 'PROMISE_TO_PAY'
    case 'SUSPEND':
      return 'SUSPEND'
    case 'VISIT':
      return 'FIELD_VISIT'
    case 'RECONNECT':
    case 'WRITE_OFF':
      return 'CLOSED'
    case 'REMINDER':
    case 'CALL':
    default:
      return 'REMINDER'
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'billing', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action billing hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      invoiceNo?: unknown
      actionType?: unknown
      actionStatus?: unknown
      dueFollowUpAt?: unknown
      notes?: unknown
    }

    const invoiceNo = String(payload.invoiceNo ?? '').trim()
    const actionType = String(payload.actionType ?? '').trim().toUpperCase()
    const actionStatus = String(payload.actionStatus ?? '').trim().toUpperCase()
    const dueFollowUpAtRaw = String(payload.dueFollowUpAt ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()

    if (!invoiceNo) {
      return Response.json({ message: 'Nomor invoice wajib diisi.' }, { status: 400 })
    }
    if (!allowedActionTypes.has(actionType)) {
      return Response.json({ message: 'Action type tidak valid.' }, { status: 400 })
    }
    if (!allowedActionStatuses.has(actionStatus)) {
      return Response.json({ message: 'Action status tidak valid.' }, { status: 400 })
    }

    const [invoice] = await runReviewDbQuery<BillingInvoiceRow>(
      `
        SELECT id
        FROM billing_invoices
        WHERE invoice_no = ?
        LIMIT 1
      `,
      [invoiceNo],
    )
    if (!invoice) {
      return Response.json({ message: 'Invoice tidak ditemukan di review DB.' }, { status: 404 })
    }

    const [handledBy] = await runReviewDbQuery<AuthUserRow>(
      `
        SELECT id
        FROM auth_users
        WHERE username = ?
        LIMIT 1
      `,
      [session.username],
    )

    const dueFollowUpAt = dueFollowUpAtRaw ? new Date(dueFollowUpAtRaw) : null
    if (dueFollowUpAt && !Number.isFinite(dueFollowUpAt.getTime())) {
      return Response.json({ message: 'Format follow up tidak valid.' }, { status: 400 })
    }

    const userNote = `[Review Action] ${session.displayName} (${session.username})${
      notesRaw ? ` - ${notesRaw}` : ''
    }`

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO billing_collection_actions (
          invoice_id,
          action_type,
          action_status,
          action_at,
          due_follow_up_at,
          handled_by_user_id,
          notes
        )
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
      `,
      [invoice.id, actionType, actionStatus, dueFollowUpAt ? dueFollowUpAt : null, handledBy?.id ?? null, userNote],
    )

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE billing_invoices
        SET collection_status = ?,
            suspend_candidate = CASE
              WHEN ? = 'SUSPEND' THEN 1
              WHEN ? = 'RECONNECT' THEN 0
              ELSE suspend_candidate
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [mapCollectionStatus(actionType), actionType, actionType, invoice.id],
    )

    return Response.json({
      message: `Collection action untuk invoice ${invoiceNo} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
