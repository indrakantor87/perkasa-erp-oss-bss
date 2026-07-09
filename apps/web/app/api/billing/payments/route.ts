import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedPaymentMethods = new Set(['CASH', 'TRANSFER', 'EWALLET', 'VA', 'OTHER'])

type BillingInvoiceRow = {
  id: number
  invoiceNo: string
  totalAmount: number
  paidAmount: number
  dueDate: string | Date
  invoiceStatus: string
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

    const [invoice] = await runReviewDbQuery<BillingInvoiceRow>(
      `
        SELECT
          id,
          invoice_no AS invoiceNo,
          total_amount AS totalAmount,
          paid_amount AS paidAmount,
          due_date AS dueDate,
          invoice_status AS invoiceStatus
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

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO billing_payments (
          invoice_id,
          payment_no,
          payment_date,
          amount,
          payment_method,
          reference_no,
          received_by_user_id,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        invoice.id,
        paymentNo,
        paymentDate ?? new Date(),
        amount,
        paymentMethod,
        referenceNo,
        receivedBy?.id ?? null,
        normalizedNotes,
      ]
    )

    const updatedPaidAmount = Number(invoice.paidAmount) + amount
    const nextInvoiceStatus = resolveInvoiceStatus(Number(invoice.totalAmount), updatedPaidAmount, invoice.dueDate)

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE billing_invoices
        SET
          paid_amount = ?,
          invoice_status = ?,
          collection_status = CASE
            WHEN ? = 'PAID' THEN 'CLOSED'
            ELSE collection_status
          END,
          suspend_candidate = CASE
            WHEN ? = 'PAID' THEN 0
            ELSE suspend_candidate
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [updatedPaidAmount, nextInvoiceStatus, nextInvoiceStatus, nextInvoiceStatus, invoice.id]
    )

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE billing_collection_actions
        SET
          action_status = 'DONE',
          due_follow_up_at = NULL,
          notes = CASE
            WHEN notes IS NULL OR notes = '' THEN ?
            ELSE CONCAT(notes, '\n', ?)
          END
        WHERE invoice_id = ?
          AND COALESCE(UPPER(TRIM(action_status)), 'OPEN') = 'OPEN'
      `,
      [
        `[Auto Resolved via Payment] ${session.displayName} (${session.username}) - pembayaran ${paymentNo} diterima.`,
        `[Auto Resolved via Payment] ${session.displayName} (${session.username}) - pembayaran ${paymentNo} diterima.`,
        invoice.id,
      ],
    )

    return Response.json({
      message: `Pembayaran ${paymentNo} untuk invoice ${invoice.invoiceNo} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
