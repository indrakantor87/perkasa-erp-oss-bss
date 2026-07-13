import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedPaymentMethods = new Set(['CASH', 'TRANSFER', 'EWALLET', 'VA', 'OTHER'])

type BillingInvoiceRow = {
  id: number
  invoiceNo: string
  totalAmount: number
  paidAmount: number
  dueDate: string | Date
  invoiceStatus: string
  collectionStatus: string | null
  suspendCandidate: number | null
}

type AuthUserRow = {
  id: number
}

type PaymentNoRow = {
  paymentNo: string | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

async function generatePaymentNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `PAY-${year}${month}-%`
  const rows = await runReviewDbQuery<PaymentNoRow>(
    `
      SELECT payment_no AS paymentNo
      FROM billing_payments
      WHERE payment_no LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix]
  )

  const currentCode = rows[0]?.paymentNo ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `PAY-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

function resolveInvoiceStatus(totalAmount: number, paidAmount: number, dueDate: string | Date) {
  if (paidAmount >= totalAmount) {
    return 'PAID'
  }
  if (paidAmount > 0) {
    return 'PARTIAL'
  }

  const due = new Date(dueDate)
  if (Number.isFinite(due.getTime()) && due < new Date()) {
    return 'OVERDUE'
  }

  return 'ISSUED'
}

async function getBillingInvoiceQueryParts() {
  const [hasCollectionStatus, hasSuspendCandidate] = await Promise.all([
    hasReviewDbColumn('billing_invoices', 'collection_status'),
    hasReviewDbColumn('billing_invoices', 'suspend_candidate'),
  ])

  return {
    collectionStatusExpression: hasCollectionStatus ? 'collection_status' : 'NULL',
    suspendCandidateExpression: hasSuspendCandidate ? 'suspend_candidate' : 'NULL',
  }
}

async function buildBillingPaymentInsertPayload(params: {
  invoiceId: number
  paymentNo: string
  paymentDate: Date
  amount: number
  paymentMethod: string
  referenceNo: string | null
  receivedByUserId: number | null
  notes: string
}) {
  const [
    hasInvoiceId,
    hasPaymentNo,
    hasPaymentDate,
    hasAmount,
    hasPaymentMethod,
    hasReferenceNo,
    hasReceivedByUserId,
    hasNotes,
  ] = await Promise.all([
    hasReviewDbColumn('billing_payments', 'invoice_id'),
    hasReviewDbColumn('billing_payments', 'payment_no'),
    hasReviewDbColumn('billing_payments', 'payment_date'),
    hasReviewDbColumn('billing_payments', 'amount'),
    hasReviewDbColumn('billing_payments', 'payment_method'),
    hasReviewDbColumn('billing_payments', 'reference_no'),
    hasReviewDbColumn('billing_payments', 'received_by_user_id'),
    hasReviewDbColumn('billing_payments', 'notes'),
  ])

  if (!hasInvoiceId || !hasPaymentNo || !hasPaymentDate || !hasAmount) {
    throw new Error(
      'Schema inti billing_payments belum siap. Kolom invoice_id, payment_no, payment_date, dan amount wajib tersedia.',
    )
  }

  const columns = ['invoice_id', 'payment_no', 'payment_date', 'amount']
  const values: unknown[] = [params.invoiceId, params.paymentNo, params.paymentDate, params.amount]

  if (hasPaymentMethod) {
    columns.push('payment_method')
    values.push(params.paymentMethod)
  }
  if (hasReferenceNo) {
    columns.push('reference_no')
    values.push(params.referenceNo)
  }
  if (hasReceivedByUserId) {
    columns.push('received_by_user_id')
    values.push(params.receivedByUserId)
  }
  if (hasNotes) {
    columns.push('notes')
    values.push(params.notes)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
}

async function buildBillingInvoiceUpdatePayload(params: {
  paidAmount: number
  invoiceStatus: string
  collectionStatus: string
  suspendCandidate: number
}) {
  const [hasPaidAmount, hasInvoiceStatus, hasCollectionStatus, hasSuspendCandidate, hasUpdatedAt] = await Promise.all([
    hasReviewDbColumn('billing_invoices', 'paid_amount'),
    hasReviewDbColumn('billing_invoices', 'invoice_status'),
    hasReviewDbColumn('billing_invoices', 'collection_status'),
    hasReviewDbColumn('billing_invoices', 'suspend_candidate'),
    hasReviewDbColumn('billing_invoices', 'updated_at'),
  ])

  if (!hasPaidAmount || !hasInvoiceStatus) {
    throw new Error('Schema inti billing_invoices belum siap. Kolom paid_amount dan invoice_status wajib tersedia.')
  }

  const assignments = ['paid_amount = ?', 'invoice_status = ?']
  const values: unknown[] = [params.paidAmount, params.invoiceStatus]

  if (hasCollectionStatus) {
    assignments.push('collection_status = ?')
    values.push(params.collectionStatus)
  }
  if (hasSuspendCandidate) {
    assignments.push('suspend_candidate = ?')
    values.push(params.suspendCandidate)
  }
  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  return {
    assignments,
    values,
  }
}

async function buildCollectionActionResolvePayload(invoiceId: number, resolutionNote: string) {
  const [hasInvoiceId, hasActionStatus, hasDueFollowUpAt, hasNotes] = await Promise.all([
    hasReviewDbColumn('billing_collection_actions', 'invoice_id'),
    hasReviewDbColumn('billing_collection_actions', 'action_status'),
    hasReviewDbColumn('billing_collection_actions', 'due_follow_up_at'),
    hasReviewDbColumn('billing_collection_actions', 'notes'),
  ])

  if (!hasInvoiceId || !hasActionStatus) {
    return null
  }

  const assignments = [`action_status = 'DONE'`]
  const values: unknown[] = []

  if (hasDueFollowUpAt) {
    assignments.push('due_follow_up_at = NULL')
  }
  if (hasNotes) {
    assignments.push(`notes = CASE
            WHEN notes IS NULL OR notes = '' THEN ?
            ELSE CONCAT(notes, '\n', ?)
          END`)
    values.push(resolutionNote, resolutionNote)
  }

  values.push(invoiceId)

  return {
    assignments,
    values,
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
      { message: 'Payment entry billing hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const payload = (await request.json()) as {
      invoiceNo?: unknown
      amount?: unknown
      paymentMethod?: unknown
      paymentDate?: unknown
      referenceNo?: unknown
      notes?: unknown
    }

    const invoiceNo = String(payload.invoiceNo ?? '').trim()
    const amount = normalizePrice(payload.amount)
    const paymentMethod = String(payload.paymentMethod ?? '').trim().toUpperCase()
    const paymentDateRaw = String(payload.paymentDate ?? '').trim()
    const referenceNo = String(payload.referenceNo ?? '').trim() || null
    const notesRaw = String(payload.notes ?? '').trim()

    if (!invoiceNo) {
      return Response.json({ message: 'Nomor invoice wajib diisi.' }, { status: 400 })
    }
    if (amount == null || amount <= 0) {
      return Response.json({ message: 'Nominal pembayaran harus lebih dari 0.' }, { status: 400 })
    }
    if (!allowedPaymentMethods.has(paymentMethod)) {
      return Response.json({ message: 'Metode pembayaran tidak valid.' }, { status: 400 })
    }

    const invoiceQueryParts = await getBillingInvoiceQueryParts()
    const [invoice] = await runReviewDbQuery<BillingInvoiceRow>(
      `
        SELECT
          id,
          invoice_no AS invoiceNo,
          total_amount AS totalAmount,
          paid_amount AS paidAmount,
          due_date AS dueDate,
          invoice_status AS invoiceStatus,
          ${invoiceQueryParts.collectionStatusExpression} AS collectionStatus,
          ${invoiceQueryParts.suspendCandidateExpression} AS suspendCandidate
        FROM billing_invoices
        WHERE invoice_no = ?
        LIMIT 1
      `,
      [invoiceNo]
    )
    if (!invoice) {
      return Response.json({ message: 'Invoice tidak ditemukan di review DB.' }, { status: 404 })
    }
    if (invoice.invoiceStatus === 'PAID') {
      return Response.json({ message: `Invoice ${invoice.invoiceNo} sudah berstatus PAID.` }, { status: 409 })
    }

    const remaining = Number(invoice.totalAmount) - Number(invoice.paidAmount)
    if (amount > remaining) {
      return Response.json(
        { message: `Nominal pembayaran melebihi sisa tagihan invoice ${invoice.invoiceNo}.` },
        { status: 400 }
      )
    }

    const [receivedBy] = await runReviewDbQuery<AuthUserRow>(
      `
        SELECT id
        FROM auth_users
        WHERE username = ?
        LIMIT 1
      `,
      [session.username]
    )

    const paymentDate = paymentDateRaw ? new Date(paymentDateRaw) : null
    if (paymentDate && !Number.isFinite(paymentDate.getTime())) {
      return Response.json({ message: 'Format tanggal pembayaran tidak valid.' }, { status: 400 })
    }

    const paymentNo = await generatePaymentNo()
    const normalizedNotes = `[Review Payment] ${session.displayName} (${session.username})${
      notesRaw ? ` - ${notesRaw}` : ''
    }`
    const paymentInsertPayload = await buildBillingPaymentInsertPayload({
      invoiceId: invoice.id,
      paymentNo,
      paymentDate: paymentDate ?? new Date(),
      amount,
      paymentMethod,
      referenceNo,
      receivedByUserId: receivedBy?.id ?? null,
      notes: normalizedNotes,
    })

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO billing_payments (
          ${paymentInsertPayload.columns.join(',\n          ')}
        )
        VALUES (${paymentInsertPayload.placeholders.join(', ')})
      `,
      paymentInsertPayload.values
    )

    const updatedPaidAmount = Number(invoice.paidAmount) + amount
    const nextInvoiceStatus = resolveInvoiceStatus(Number(invoice.totalAmount), updatedPaidAmount, invoice.dueDate)
    const currentCollectionStatus = String(invoice.collectionStatus ?? '').trim().toUpperCase()
    const wasSuspendFlow =
      currentCollectionStatus === 'SUSPEND' ||
      String(invoice.invoiceStatus).trim().toUpperCase() === 'SUSPENDED' ||
      Number(invoice.suspendCandidate) > 0
    const nextCollectionStatus =
      nextInvoiceStatus === 'PAID' ? 'CLOSED' : wasSuspendFlow ? 'RECONNECT' : currentCollectionStatus || 'REMINDER'
    const nextSuspendCandidate = nextInvoiceStatus === 'PAID' || wasSuspendFlow ? 0 : Number(invoice.suspendCandidate ?? 0)
    const invoiceUpdatePayload = await buildBillingInvoiceUpdatePayload({
      paidAmount: updatedPaidAmount,
      invoiceStatus: nextInvoiceStatus,
      collectionStatus: nextCollectionStatus,
      suspendCandidate: nextSuspendCandidate,
    })

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE billing_invoices
        SET
          ${invoiceUpdatePayload.assignments.join(',\n          ')}
        WHERE id = ?
      `,
      [...invoiceUpdatePayload.values, invoice.id]
    )

    const collectionActionResolvePayload = await buildCollectionActionResolvePayload(
      invoice.id,
      `[Auto Resolved via Payment] ${session.displayName} (${session.username}) - pembayaran ${paymentNo} diterima.`,
    )

    if (collectionActionResolvePayload) {
      await runReviewDbExecute<ExecuteResult>(
        `
          UPDATE billing_collection_actions
          SET
            ${collectionActionResolvePayload.assignments.join(',\n            ')}
          WHERE invoice_id = ?
            AND COALESCE(UPPER(TRIM(action_status)), 'OPEN') = 'OPEN'
        `,
        collectionActionResolvePayload.values,
      )
    }

    return Response.json({
      message: `Pembayaran ${paymentNo} untuk invoice ${invoice.invoiceNo} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
