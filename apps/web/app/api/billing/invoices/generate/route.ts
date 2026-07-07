import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedInvoiceTypes = new Set(['INSTALLATION', 'RECURRING', 'ADJUSTMENT', 'TERMINATION'])

type SubscriptionRow = {
  id: number
  status: string
  serviceNo: string
  monthlyPrice: number
  customerName: string
  packageName: string | null
  speedLabel: string | null
}

type ExistingInvoiceRow = {
  id: number
  invoiceNo: string
}

type InvoiceNoRow = {
  invoiceNo: string | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

async function generateInvoiceNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `INV-${year}${month}-%`
  const rows = await runReviewDbQuery<InvoiceNoRow>(
    `
      SELECT invoice_no AS invoiceNo
      FROM billing_invoices
      WHERE invoice_no LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )

  const currentCode = rows[0]?.invoiceNo ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `INV-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

function resolvePeriodStartEnd(billingYear: number, billingMonth: number) {
  const start = new Date(billingYear, billingMonth - 1, 1)
  const end = new Date(billingYear, billingMonth, 0)
  return { start, end }
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
      { message: 'Generate invoice hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      serviceNo?: unknown
      invoiceType?: unknown
      billingMonth?: unknown
      billingYear?: unknown
      issueDate?: unknown
      dueDate?: unknown
      notes?: unknown
    }

    const serviceNo = String(payload.serviceNo ?? '').trim()
    const invoiceType = String(payload.invoiceType ?? 'RECURRING')
      .trim()
      .toUpperCase()
    const billingMonth = Number(payload.billingMonth ?? NaN)
    const billingYear = Number(payload.billingYear ?? NaN)
    const issueDateRaw = String(payload.issueDate ?? '').trim()
    const dueDateRaw = String(payload.dueDate ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()

    if (!serviceNo) {
      return Response.json({ message: 'Service number wajib diisi.' }, { status: 400 })
    }
    if (!allowedInvoiceTypes.has(invoiceType)) {
      return Response.json({ message: 'Tipe invoice tidak valid.' }, { status: 400 })
    }

    const targetMonth = Number.isFinite(billingMonth) ? billingMonth : new Date().getMonth() + 1
    const targetYear = Number.isFinite(billingYear) ? billingYear : new Date().getFullYear()

    if (invoiceType === 'RECURRING') {
      if (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12) {
        return Response.json({ message: 'Billing month harus 1 sampai 12.' }, { status: 400 })
      }
      if (!Number.isInteger(targetYear) || targetYear < 2020 || targetYear > 2100) {
        return Response.json({ message: 'Billing year tidak valid.' }, { status: 400 })
      }
    }

    const [subscription] = await runReviewDbQuery<SubscriptionRow>(
      `
        SELECT
          ss.id,
          ss.status,
          ss.service_no AS serviceNo,
          ss.monthly_price AS monthlyPrice,
          c.full_name AS customerName,
          sp.name AS packageName,
          sp.speed_label AS speedLabel
        FROM service_subscriptions ss
        JOIN crm_customers c
          ON c.id = ss.customer_id
        LEFT JOIN sales_packages sp
          ON sp.id = ss.package_id
        WHERE ss.service_no = ?
        LIMIT 1
      `,
      [serviceNo],
    )

    if (!subscription) {
      return Response.json({ message: 'Subscription tidak ditemukan di review DB.' }, { status: 404 })
    }
    if (subscription.status !== 'ACTIVE') {
      return Response.json(
        { message: `Subscription ${subscription.serviceNo} belum berstatus ACTIVE.` },
        { status: 409 },
      )
    }
    if (Number(subscription.monthlyPrice) <= 0) {
      return Response.json(
        { message: `Harga bulanan subscription ${subscription.serviceNo} belum diisi (0).` },
        { status: 409 },
      )
    }

    if (invoiceType === 'RECURRING') {
      const existing = await runReviewDbQuery<ExistingInvoiceRow>(
        `
          SELECT id, invoice_no AS invoiceNo
          FROM billing_invoices
          WHERE subscription_id = ?
            AND invoice_type = 'RECURRING'
            AND billing_year = ?
            AND billing_month = ?
            AND invoice_status NOT IN ('CANCELLED')
          LIMIT 1
        `,
        [subscription.id, targetYear, targetMonth],
      )

      if (existing.length > 0) {
        return Response.json(
          { message: `Invoice recurring periode ${targetMonth}/${targetYear} sudah ada (${existing[0].invoiceNo}).` },
          { status: 409 },
        )
      }
    }

    const issueDate = issueDateRaw ? new Date(issueDateRaw) : new Date()
    if (!Number.isFinite(issueDate.getTime())) {
      return Response.json({ message: 'Format issue date tidak valid.' }, { status: 400 })
    }

    let dueDate = dueDateRaw ? new Date(dueDateRaw) : null
    if (dueDate && !Number.isFinite(dueDate.getTime())) {
      return Response.json({ message: 'Format due date tidak valid.' }, { status: 400 })
    }

    const { start: periodStart, end: periodEnd } = resolvePeriodStartEnd(targetYear, targetMonth)
    if (!dueDate) {
      dueDate = new Date(issueDate)
      dueDate.setDate(dueDate.getDate() + 7)
    }

    const invoiceNo = await generateInvoiceNo()
    const userNote = `[Review Invoice] ${session.displayName} (${session.username})${notesRaw ? ` - ${notesRaw}` : ''}`

    const subtotal = Number(subscription.monthlyPrice)
    const totalAmount = subtotal

    const invoiceResult = await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO billing_invoices (
          subscription_id,
          invoice_no,
          invoice_type,
          billing_month,
          billing_year,
          period_start,
          period_end,
          issue_date,
          due_date,
          subtotal,
          penalty_amount,
          discount_amount,
          total_amount,
          paid_amount,
          invoice_status,
          collection_status,
          suspend_candidate,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0, 'ISSUED', 'NORMAL', 0, ?)
      `,
      [
        subscription.id,
        invoiceNo,
        invoiceType,
        invoiceType === 'RECURRING' ? targetMonth : null,
        invoiceType === 'RECURRING' ? targetYear : null,
        invoiceType === 'RECURRING' ? periodStart : null,
        invoiceType === 'RECURRING' ? periodEnd : null,
        issueDate,
        dueDate,
        subtotal,
        totalAmount,
        userNote,
      ],
    )

    const invoiceId = Number(invoiceResult.insertId)
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      return Response.json({ message: 'Gagal membuat invoice di review DB.' }, { status: 500 })
    }

    const packageLabel = subscription.packageName
      ? `${subscription.packageName}${subscription.speedLabel ? ` • ${subscription.speedLabel}` : ''}`
      : 'Paket belum terpetakan'
    const periodLabel = invoiceType === 'RECURRING' ? `periode ${String(targetMonth).padStart(2, '0')}/${targetYear}` : 'periode custom'
    const itemDescription = `Subscription ${subscription.serviceNo} • ${packageLabel} • ${periodLabel}`

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO billing_invoice_items (
          invoice_id,
          item_type,
          description,
          qty,
          unit_price,
          line_total
        )
        VALUES (?, 'SUBSCRIPTION', ?, 1, ?, ?)
      `,
      [invoiceId, itemDescription, subtotal, subtotal],
    )

    return Response.json({
      message: `Invoice ${invoiceNo} berhasil dibuat untuk ${subscription.customerName} (${subscription.serviceNo}).`,
      invoiceNo,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

