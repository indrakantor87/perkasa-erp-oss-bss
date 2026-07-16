import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

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

type CreateInvoiceParams = {
  serviceNo: string
  invoiceType: string
  billingMonth: number
  billingYear: number
  issueDate: Date
  dueDate: Date | null
  notesRaw: string
  actorLabel: string
  customAmount: number | null
  customDescription: string
}

type CreatedInvoiceSummary = {
  invoiceNo: string
  serviceNo: string
  customerName: string
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

async function getBillingSubscriptionQueryParts() {
  const [
    hasSubscriptionId,
    hasSubscriptionStatus,
    hasSubscriptionServiceNo,
    hasSubscriptionMonthlyPrice,
    hasSubscriptionCustomerId,
    hasSubscriptionPackageId,
    hasCustomerId,
    hasCustomerFullName,
    hasPackageId,
    hasPackageName,
    hasPackageSpeedLabel,
  ] = await Promise.all([
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'status'),
    hasReviewDbColumn('service_subscriptions', 'service_no'),
    hasReviewDbColumn('service_subscriptions', 'monthly_price'),
    hasReviewDbColumn('service_subscriptions', 'customer_id'),
    hasReviewDbColumn('service_subscriptions', 'package_id'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'full_name'),
    hasReviewDbColumn('sales_packages', 'id'),
    hasReviewDbColumn('sales_packages', 'name'),
    hasReviewDbColumn('sales_packages', 'speed_label'),
  ])

  if (!hasSubscriptionId || !hasSubscriptionStatus || !hasSubscriptionServiceNo) {
    throw new Error('Schema inti service_subscriptions belum siap. Kolom id, status, dan service_no wajib tersedia.')
  }

  return {
    monthlyPriceExpression: hasSubscriptionMonthlyPrice ? 'ss.monthly_price' : 'NULL',
    customerJoin:
      hasSubscriptionCustomerId && hasCustomerId
        ? `
      LEFT JOIN crm_customers c
        ON c.id = ss.customer_id`
        : '',
    packageJoin:
      hasSubscriptionPackageId && hasPackageId
        ? `
      LEFT JOIN sales_packages sp
        ON sp.id = ss.package_id`
        : '',
    customerNameExpression:
      hasSubscriptionCustomerId && hasCustomerId && hasCustomerFullName ? 'c.full_name' : "'Customer belum terpetakan'",
    packageNameExpression: hasSubscriptionPackageId && hasPackageId && hasPackageName ? 'sp.name' : 'NULL',
    speedLabelExpression: hasSubscriptionPackageId && hasPackageId && hasPackageSpeedLabel ? 'sp.speed_label' : 'NULL',
  }
}

async function canRunRecurringInvoiceDuplicateGuard() {
  const [hasSubscriptionId, hasInvoiceType, hasBillingYear, hasBillingMonth, hasInvoiceStatus] = await Promise.all([
    hasReviewDbColumn('billing_invoices', 'subscription_id'),
    hasReviewDbColumn('billing_invoices', 'invoice_type'),
    hasReviewDbColumn('billing_invoices', 'billing_year'),
    hasReviewDbColumn('billing_invoices', 'billing_month'),
    hasReviewDbColumn('billing_invoices', 'invoice_status'),
  ])

  return hasSubscriptionId && hasInvoiceType && hasBillingYear && hasBillingMonth && hasInvoiceStatus
}

async function buildBillingInvoiceInsertPayload(params: {
  subscriptionId: number
  invoiceNo: string
  invoiceType: string
  billingMonth: number
  billingYear: number
  periodStart: Date
  periodEnd: Date
  issueDate: Date
  dueDate: Date | null
  subtotal: number
  totalAmount: number
  notes: string
}) {
  const [
    hasSubscriptionId,
    hasInvoiceNo,
    hasInvoiceType,
    hasBillingMonth,
    hasBillingYear,
    hasPeriodStart,
    hasPeriodEnd,
    hasIssueDate,
    hasDueDate,
    hasSubtotal,
    hasPenaltyAmount,
    hasDiscountAmount,
    hasTotalAmount,
    hasPaidAmount,
    hasInvoiceStatus,
    hasCollectionStatus,
    hasSuspendCandidate,
    hasNotes,
  ] = await Promise.all([
    hasReviewDbColumn('billing_invoices', 'subscription_id'),
    hasReviewDbColumn('billing_invoices', 'invoice_no'),
    hasReviewDbColumn('billing_invoices', 'invoice_type'),
    hasReviewDbColumn('billing_invoices', 'billing_month'),
    hasReviewDbColumn('billing_invoices', 'billing_year'),
    hasReviewDbColumn('billing_invoices', 'period_start'),
    hasReviewDbColumn('billing_invoices', 'period_end'),
    hasReviewDbColumn('billing_invoices', 'issue_date'),
    hasReviewDbColumn('billing_invoices', 'due_date'),
    hasReviewDbColumn('billing_invoices', 'subtotal'),
    hasReviewDbColumn('billing_invoices', 'penalty_amount'),
    hasReviewDbColumn('billing_invoices', 'discount_amount'),
    hasReviewDbColumn('billing_invoices', 'total_amount'),
    hasReviewDbColumn('billing_invoices', 'paid_amount'),
    hasReviewDbColumn('billing_invoices', 'invoice_status'),
    hasReviewDbColumn('billing_invoices', 'collection_status'),
    hasReviewDbColumn('billing_invoices', 'suspend_candidate'),
    hasReviewDbColumn('billing_invoices', 'notes'),
  ])

  if (!hasSubscriptionId || !hasInvoiceNo || !hasTotalAmount || !hasPaidAmount) {
    throw new Error(
      'Schema inti billing_invoices belum siap. Kolom subscription_id, invoice_no, total_amount, dan paid_amount wajib tersedia.',
    )
  }

  const columns = ['subscription_id', 'invoice_no', 'total_amount', 'paid_amount']
  const values: unknown[] = [params.subscriptionId, params.invoiceNo, params.totalAmount, 0]

  if (hasSubtotal) {
    columns.push('subtotal')
    values.push(params.subtotal)
  }

  if (hasInvoiceType) {
    columns.push('invoice_type')
    values.push(params.invoiceType)
  }
  if (hasBillingMonth) {
    columns.push('billing_month')
    values.push(params.invoiceType === 'RECURRING' ? params.billingMonth : null)
  }
  if (hasBillingYear) {
    columns.push('billing_year')
    values.push(params.invoiceType === 'RECURRING' ? params.billingYear : null)
  }
  if (hasPeriodStart) {
    columns.push('period_start')
    values.push(params.invoiceType === 'RECURRING' ? params.periodStart : null)
  }
  if (hasPeriodEnd) {
    columns.push('period_end')
    values.push(params.invoiceType === 'RECURRING' ? params.periodEnd : null)
  }
  if (hasIssueDate) {
    columns.push('issue_date')
    values.push(params.issueDate)
  }
  if (hasDueDate) {
    columns.push('due_date')
    values.push(params.dueDate)
  }
  if (hasPenaltyAmount) {
    columns.push('penalty_amount')
    values.push(0)
  }
  if (hasDiscountAmount) {
    columns.push('discount_amount')
    values.push(0)
  }
  if (hasCollectionStatus) {
    columns.push('collection_status')
    values.push('NORMAL')
  }
  if (hasSuspendCandidate) {
    columns.push('suspend_candidate')
    values.push(0)
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

async function buildBillingInvoiceItemInsertPayload(params: {
  invoiceId: number
  itemType: string
  description: string
  subtotal: number
}) {
  const [hasInvoiceId, hasItemType, hasDescription, hasQty, hasUnitPrice, hasLineTotal] = await Promise.all([
    hasReviewDbColumn('billing_invoice_items', 'invoice_id'),
    hasReviewDbColumn('billing_invoice_items', 'item_type'),
    hasReviewDbColumn('billing_invoice_items', 'description'),
    hasReviewDbColumn('billing_invoice_items', 'qty'),
    hasReviewDbColumn('billing_invoice_items', 'unit_price'),
    hasReviewDbColumn('billing_invoice_items', 'line_total'),
  ])

  if (!hasInvoiceId || !hasDescription || !hasQty || !hasLineTotal) {
    return null
  }

  const columns = ['invoice_id', 'description', 'qty', 'line_total']
  const values: unknown[] = [params.invoiceId, params.description, 1, params.subtotal]

  if (hasItemType) {
    columns.push('item_type')
    values.push(params.itemType)
  }
  if (hasUnitPrice) {
    columns.push('unit_price')
    values.push(params.subtotal)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
}

async function createInvoiceForSubscription(params: CreateInvoiceParams): Promise<CreatedInvoiceSummary> {
  const subscriptionQueryParts = await getBillingSubscriptionQueryParts()
  const [subscription] = await runReviewDbQuery<SubscriptionRow>(
    `
      SELECT
        ss.id,
        ss.status,
        ss.service_no AS serviceNo,
        ${subscriptionQueryParts.monthlyPriceExpression} AS monthlyPrice,
        ${subscriptionQueryParts.customerNameExpression} AS customerName,
        ${subscriptionQueryParts.packageNameExpression} AS packageName,
        ${subscriptionQueryParts.speedLabelExpression} AS speedLabel
      FROM service_subscriptions ss
      ${subscriptionQueryParts.customerJoin}
      ${subscriptionQueryParts.packageJoin}
      WHERE ss.service_no = ?
      LIMIT 1
    `,
    [params.serviceNo],
  )

  if (!subscription) {
    throw new Error('Subscription tidak ditemukan di review DB.')
  }
  if (subscription.status !== 'ACTIVE') {
    throw new Error(`Subscription ${subscription.serviceNo} belum berstatus ACTIVE.`)
  }
  if (params.invoiceType === 'RECURRING' && Number(subscription.monthlyPrice) <= 0) {
    throw new Error(`Harga bulanan subscription ${subscription.serviceNo} belum diisi (0).`)
  }

  if (params.invoiceType === 'RECURRING' && (await canRunRecurringInvoiceDuplicateGuard())) {
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
      [subscription.id, params.billingYear, params.billingMonth],
    )

    if (existing.length > 0) {
      throw new Error(
        `Invoice recurring periode ${params.billingMonth}/${params.billingYear} sudah ada (${existing[0].invoiceNo}).`,
      )
    }
  }

  const { start: periodStart, end: periodEnd } = resolvePeriodStartEnd(params.billingYear, params.billingMonth)
  const finalDueDate = params.dueDate
    ? new Date(params.dueDate)
    : (() => {
        const derivedDueDate = new Date(params.issueDate)
        derivedDueDate.setDate(derivedDueDate.getDate() + 7)
        return derivedDueDate
      })()

  const invoiceNo = await generateInvoiceNo()
  const userNote = `[Review Invoice] ${params.actorLabel}${params.notesRaw ? ` - ${params.notesRaw}` : ''}`
  const subtotal =
    params.invoiceType === 'RECURRING'
      ? Number(subscription.monthlyPrice)
      : Number(params.customAmount ?? 0)
  const totalAmount = subtotal
  const invoiceInsertPayload = await buildBillingInvoiceInsertPayload({
    subscriptionId: subscription.id,
    invoiceNo,
    invoiceType: params.invoiceType,
    billingMonth: params.billingMonth,
    billingYear: params.billingYear,
    periodStart,
    periodEnd,
    issueDate: params.issueDate,
    dueDate: finalDueDate,
    subtotal,
    totalAmount,
    notes: userNote,
  })

  const invoiceResult = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO billing_invoices (
        ${invoiceInsertPayload.columns.join(',\n        ')}
      )
      VALUES (${invoiceInsertPayload.placeholders.join(', ')})
    `,
    invoiceInsertPayload.values,
  )

  const invoiceId = Number(invoiceResult.insertId)
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new Error('Gagal membuat invoice di review DB.')
  }

  const packageLabel = subscription.packageName
    ? `${subscription.packageName}${subscription.speedLabel ? ` • ${subscription.speedLabel}` : ''}`
    : 'Paket belum terpetakan'
  const periodLabel =
    params.invoiceType === 'RECURRING'
      ? `periode ${String(params.billingMonth).padStart(2, '0')}/${params.billingYear}`
      : 'one-time charge'
  const itemType = params.invoiceType === 'RECURRING' ? 'SUBSCRIPTION' : params.invoiceType
  const itemDescription =
    params.invoiceType === 'RECURRING'
      ? `Subscription ${subscription.serviceNo} • ${packageLabel} • ${periodLabel}`
      : `${params.customDescription} • ${subscription.serviceNo} • ${subscription.customerName}`
  const invoiceItemInsertPayload = await buildBillingInvoiceItemInsertPayload({
    invoiceId,
    itemType,
    description: itemDescription,
    subtotal,
  })

  if (invoiceItemInsertPayload) {
    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO billing_invoice_items (
          ${invoiceItemInsertPayload.columns.join(',\n          ')}
        )
        VALUES (${invoiceItemInsertPayload.placeholders.join(', ')})
      `,
      invoiceItemInsertPayload.values,
    )
  }

  return {
    invoiceNo,
    serviceNo: subscription.serviceNo,
    customerName: subscription.customerName,
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
      { message: 'Generate invoice hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      serviceNo?: unknown
      serviceNumbers?: unknown
      invoiceType?: unknown
      billingMonth?: unknown
      billingYear?: unknown
      issueDate?: unknown
      dueDate?: unknown
      notes?: unknown
      customAmount?: unknown
      customDescription?: unknown
    }

    const serviceNo = String(payload.serviceNo ?? '').trim()
    const serviceNumbers = Array.isArray(payload.serviceNumbers)
      ? payload.serviceNumbers.map((item) => String(item ?? '').trim()).filter(Boolean)
      : []
    const invoiceType = String(payload.invoiceType ?? 'RECURRING')
      .trim()
      .toUpperCase()
    const billingMonth = Number(payload.billingMonth ?? NaN)
    const billingYear = Number(payload.billingYear ?? NaN)
    const issueDateRaw = String(payload.issueDate ?? '').trim()
    const dueDateRaw = String(payload.dueDate ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()
    const customAmountRaw = payload.customAmount
    const customDescription = String(payload.customDescription ?? '').trim()
    const actorLabel = `${session.displayName} (${session.username})`
    const isBatchMode = serviceNumbers.length > 0

    if (!serviceNo && !isBatchMode) {
      return Response.json({ message: 'Service number wajib diisi.' }, { status: 400 })
    }
    if (!allowedInvoiceTypes.has(invoiceType)) {
      return Response.json({ message: 'Tipe invoice tidak valid.' }, { status: 400 })
    }
    if (isBatchMode && invoiceType !== 'RECURRING') {
      return Response.json(
        { message: 'Batch generate saat ini hanya mendukung invoice type RECURRING.' },
        { status: 400 },
      )
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
    } else {
      const customAmount = Number(customAmountRaw ?? NaN)
      if (!Number.isFinite(customAmount) || customAmount <= 0) {
        return Response.json({ message: 'Nominal invoice one-time wajib diisi dan harus lebih dari 0.' }, { status: 400 })
      }
      if (!customDescription) {
        return Response.json({ message: 'Deskripsi invoice one-time wajib diisi.' }, { status: 400 })
      }
    }

    const issueDate = issueDateRaw ? new Date(issueDateRaw) : new Date()
    if (!Number.isFinite(issueDate.getTime())) {
      return Response.json({ message: 'Format issue date tidak valid.' }, { status: 400 })
    }

    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null
    if (dueDate && !Number.isFinite(dueDate.getTime())) {
      return Response.json({ message: 'Format due date tidak valid.' }, { status: 400 })
    }

    if (isBatchMode) {
      const uniqueServiceNumbers = Array.from(new Set(serviceNumbers))
      if (uniqueServiceNumbers.length === 0) {
        return Response.json({ message: 'Daftar service number batch kosong.' }, { status: 400 })
      }

      const successes: CreatedInvoiceSummary[] = []
      const failures: Array<{ serviceNo: string; message: string }> = []

      for (const currentServiceNo of uniqueServiceNumbers) {
        try {
          const result = await createInvoiceForSubscription({
            serviceNo: currentServiceNo,
            invoiceType,
            billingMonth: targetMonth,
            billingYear: targetYear,
            issueDate,
            dueDate,
            notesRaw,
            actorLabel,
            customAmount: null,
            customDescription: '',
          })
          successes.push(result)
        } catch (error) {
          failures.push({
            serviceNo: currentServiceNo,
            message: error instanceof Error && error.message.trim() ? error.message.trim() : 'Generate invoice batch gagal.',
          })
        }
      }

      if (successes.length === 0) {
        return Response.json(
          {
            message: `Batch recurring gagal diproses. ${failures[0]?.message || 'Semua service number ditolak oleh guard existing.'}`,
            failures,
          },
          { status: 409 },
        )
      }

      return Response.json({
        message: `Batch recurring berhasil membuat ${successes.length} invoice untuk periode ${String(targetMonth).padStart(2, '0')}/${targetYear}.${failures.length > 0 ? ` ${failures.length} service dilewati karena guard existing.` : ''}`,
        invoiceNo: successes[0]?.invoiceNo ?? '-',
        createdCount: successes.length,
        failedCount: failures.length,
        successes,
        failures,
      })
    }

    const result = await createInvoiceForSubscription({
      serviceNo,
      invoiceType,
      billingMonth: targetMonth,
      billingYear: targetYear,
      issueDate,
      dueDate,
      notesRaw,
      actorLabel,
      customAmount: invoiceType === 'RECURRING' ? null : Number(customAmountRaw ?? 0),
      customDescription,
    })

    return Response.json({
      message: `Invoice ${result.invoiceNo} berhasil dibuat untuk ${result.customerName} (${result.serviceNo}).`,
      invoiceNo: result.invoiceNo,
    })
  } catch (error) {
    if (error instanceof Error && error.message.trim()) {
      return Response.json({ message: error.message.trim() }, { status: 409 })
    }
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
