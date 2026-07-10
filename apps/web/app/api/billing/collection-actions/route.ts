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
  invoiceNo: string
  invoiceStatus: string
  collectionStatus: string | null
  suspendCandidate: number | null
}

type AuthUserRow = {
  id: number
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type CreateCollectionActionParams = {
  invoiceNo: string
  actionType: string
  actionStatus: string
  dueFollowUpAt: Date | null
  notesRaw: string
  sessionUsername: string
  sessionDisplayName: string
}

const openOnlyActionTypes = new Set(['PROMISE_TO_PAY', 'SUSPEND', 'RECONNECT', 'WRITE_OFF'])

function mapCollectionStatus(actionType: string) {
  switch (actionType) {
    case 'PROMISE_TO_PAY':
      return 'PROMISE_TO_PAY'
    case 'SUSPEND':
      return 'SUSPEND'
    case 'RECONNECT':
      return 'RECONNECT'
    case 'VISIT':
      return 'FIELD_VISIT'
    case 'WRITE_OFF':
      return 'CLOSED'
    case 'REMINDER':
    case 'CALL':
    default:
      return 'REMINDER'
  }
}

async function createCollectionAction(params: CreateCollectionActionParams) {
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
    [params.invoiceNo],
  )
  if (!invoice) {
    throw new Error(`Invoice ${params.invoiceNo} tidak ditemukan di review DB.`)
  }

  const invoiceStatus = String(invoice.invoiceStatus ?? '').trim().toUpperCase()
  const currentCollectionStatus = String(invoice.collectionStatus ?? '').trim().toUpperCase()
  if (invoiceStatus === 'PAID' || invoiceStatus === 'CANCELLED') {
    throw new Error(`Invoice ${invoice.invoiceNo} sudah berstatus ${invoiceStatus}, jadi tidak layak menerima collection action baru.`)
  }
  if (openOnlyActionTypes.has(params.actionType) && params.actionStatus !== 'OPEN') {
    throw new Error(
      `Action ${params.actionType} hanya boleh dibuat sebagai OPEN. Gunakan route resolve/status invoice untuk menutup atau membatalkan jalur ini secara formal.`,
    )
  }
  if (
    params.actionType === 'RECONNECT' &&
    invoiceStatus !== 'SUSPENDED' &&
    currentCollectionStatus !== 'RECONNECT' &&
    currentCollectionStatus !== 'SUSPEND' &&
    Number(invoice.suspendCandidate ?? 0) <= 0
  ) {
    throw new Error(`Invoice ${invoice.invoiceNo} belum berada pada jalur suspend/reconnect, jadi action RECONNECT belum valid.`)
  }

  const [handledBy] = await runReviewDbQuery<AuthUserRow>(
    `
      SELECT id
      FROM auth_users
      WHERE username = ?
      LIMIT 1
    `,
    [params.sessionUsername],
  )

  const userNote = `[Review Action] ${params.sessionDisplayName} (${params.sessionUsername})${
    params.notesRaw ? ` - ${params.notesRaw}` : ''
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
    [invoice.id, params.actionType, params.actionStatus, params.dueFollowUpAt, handledBy?.id ?? null, userNote],
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
    [
      params.actionStatus === 'OPEN' ? mapCollectionStatus(params.actionType) : currentCollectionStatus || 'REMINDER',
      params.actionStatus === 'OPEN' ? params.actionType : '',
      params.actionStatus === 'OPEN' ? params.actionType : '',
      invoice.id,
    ],
  )
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
      invoiceNos?: unknown
      actionType?: unknown
      actionStatus?: unknown
      dueFollowUpAt?: unknown
      notes?: unknown
    }

    const invoiceNo = String(payload.invoiceNo ?? '').trim()
    const invoiceNos = Array.isArray(payload.invoiceNos)
      ? payload.invoiceNos.map((item) => String(item ?? '').trim()).filter(Boolean)
      : []
    const actionType = String(payload.actionType ?? '').trim().toUpperCase()
    const actionStatus = String(payload.actionStatus ?? '').trim().toUpperCase()
    const dueFollowUpAtRaw = String(payload.dueFollowUpAt ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()
    const isBatchMode = invoiceNos.length > 0

    if (!invoiceNo && !isBatchMode) {
      return Response.json({ message: 'Nomor invoice wajib diisi.' }, { status: 400 })
    }
    if (!allowedActionTypes.has(actionType)) {
      return Response.json({ message: 'Action type tidak valid.' }, { status: 400 })
    }
    if (!allowedActionStatuses.has(actionStatus)) {
      return Response.json({ message: 'Action status tidak valid.' }, { status: 400 })
    }

    const dueFollowUpAt = dueFollowUpAtRaw ? new Date(dueFollowUpAtRaw) : null
    if (dueFollowUpAt && !Number.isFinite(dueFollowUpAt.getTime())) {
      return Response.json({ message: 'Format follow up tidak valid.' }, { status: 400 })
    }

    if (isBatchMode) {
      const uniqueInvoiceNos = Array.from(new Set(invoiceNos))
      const successes: string[] = []
      const failures: Array<{ invoiceNo: string; message: string }> = []

      for (const currentInvoiceNo of uniqueInvoiceNos) {
        try {
          await createCollectionAction({
            invoiceNo: currentInvoiceNo,
            actionType,
            actionStatus,
            dueFollowUpAt,
            notesRaw,
            sessionUsername: session.username,
            sessionDisplayName: session.displayName,
          })
          successes.push(currentInvoiceNo)
        } catch (error) {
          failures.push({
            invoiceNo: currentInvoiceNo,
            message: error instanceof Error && error.message.trim() ? error.message.trim() : 'Collection action batch gagal.',
          })
        }
      }

      return Response.json({
        message: `Batch collection berhasil memproses ${successes.length} invoice.${failures.length ? ` ${failures.length} invoice dilewati.` : ''}`,
        createdCount: successes.length,
        failedCount: failures.length,
        successes,
        failures,
      })
    }

    await createCollectionAction({
      invoiceNo,
      actionType,
      actionStatus,
      dueFollowUpAt,
      notesRaw,
      sessionUsername: session.username,
      sessionDisplayName: session.displayName,
    })

    return Response.json({
      message: `Collection action untuk invoice ${invoiceNo} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
