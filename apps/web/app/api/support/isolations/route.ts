import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type LinkedSubscriptionRow = {
  subscriptionId: number
  customerId: number
  orderId: number | null
  serviceNo: string | null
  customerCode: string | null
  customerName: string
  customerPhone: string | null
  customerAddress: string | null
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

async function resolveLinkedSubscription(serviceReference: string) {
  const [hasAddressCustomerId, hasAddressAddress, hasAddressIsPrimary] = await Promise.all([
    hasReviewDbColumn('crm_customer_addresses', 'customer_id'),
    hasReviewDbColumn('crm_customer_addresses', 'address'),
    hasReviewDbColumn('crm_customer_addresses', 'is_primary'),
  ])

  const addressJoinClause =
    hasAddressCustomerId && hasAddressAddress && hasAddressIsPrimary
      ? `LEFT JOIN crm_customer_addresses a
        ON a.customer_id = c.id
        AND a.is_primary = 1`
      : `LEFT JOIN (
        SELECT
          NULL AS customer_id,
          NULL AS address
      ) a
        ON 1 = 0`

  const [linkedSubscription] = await runReviewDbQuery<LinkedSubscriptionRow>(
    `
      SELECT
        ss.id AS subscriptionId,
        ss.customer_id AS customerId,
        ss.order_id AS orderId,
        ss.service_no AS serviceNo,
        c.customer_code AS customerCode,
        c.full_name AS customerName,
        c.phone AS customerPhone,
        a.address AS customerAddress
      FROM service_subscriptions ss
      INNER JOIN crm_customers c
        ON c.id = ss.customer_id
      ${addressJoinClause}
      WHERE ss.status IN ('ACTIVE', 'PENDING')
        AND (
          UPPER(ss.service_no) = UPPER(?)
          OR UPPER(c.customer_code) = UPPER(?)
        )
      ORDER BY
        CASE
          WHEN UPPER(ss.service_no) = UPPER(?) THEN 0
          ELSE 1
        END ASC,
        ss.id DESC
      LIMIT 1
    `,
    [serviceReference, serviceReference, serviceReference],
  )

  return linkedSubscription ?? null
}

async function resolveMarketingNameFromSalesContext(orderId: number | null) {
  if (!orderId) {
    return null
  }

  try {
    const [
      hasSalesOrderId,
      hasSalesOrderMarketingName,
      hasSalesOrderLeadId,
      hasSalesLeadId,
      hasSalesLeadMarketingName,
    ] = await Promise.all([
      hasReviewDbColumn('sales_orders', 'id'),
      hasReviewDbColumn('sales_orders', 'marketing_name'),
      hasReviewDbColumn('sales_orders', 'lead_id'),
      hasReviewDbColumn('sales_leads', 'id'),
      hasReviewDbColumn('sales_leads', 'marketing_name'),
    ])

    if (!hasSalesOrderId || (!hasSalesOrderMarketingName && !(hasSalesOrderLeadId && hasSalesLeadId && hasSalesLeadMarketingName))) {
      return null
    }

    const marketingExpression =
      hasSalesOrderMarketingName && hasSalesOrderLeadId && hasSalesLeadId && hasSalesLeadMarketingName
        ? 'COALESCE(so.marketing_name, sl.marketing_name)'
        : hasSalesOrderMarketingName
          ? 'so.marketing_name'
          : 'sl.marketing_name'

    const leadJoinClause =
      hasSalesOrderLeadId && hasSalesLeadId && hasSalesLeadMarketingName
        ? `LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id`
        : `LEFT JOIN (
          SELECT
            NULL AS id,
            NULL AS marketing_name
        ) sl
          ON 1 = 0`

    const [row] = await runReviewDbQuery<{ marketingName: string | null }>(
      `
        SELECT ${marketingExpression} AS marketingName
        FROM sales_orders so
        ${leadJoinClause}
        WHERE so.id = ?
        LIMIT 1
      `,
      [orderId],
    )

    return normalizeOptionalText(row?.marketingName)
  } catch {
    // Sales context is optional for support write flow; ignore drift here.
    return null
  }
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
      serviceReference?: unknown
      customerName?: unknown
      customerPhone?: unknown
      customerAddress?: unknown
      marketingName?: unknown
      radboxName?: unknown
      packagePrice?: unknown
      reason?: unknown
    }

    const serviceReference = String(payload.serviceReference ?? '').trim()
    const customerName = String(payload.customerName ?? '').trim()
    const customerPhone = normalizeOptionalText(payload.customerPhone)
    const customerAddress = normalizeOptionalText(payload.customerAddress)
    const marketingName = normalizeOptionalText(payload.marketingName)
    const radboxName = normalizeOptionalText(payload.radboxName)
    const packagePrice = normalizePrice(payload.packagePrice)
    const reasonRaw = String(payload.reason ?? '').trim()

    if (!serviceReference) {
      return Response.json({ message: 'Service No atau Customer Code wajib diisi.' }, { status: 400 })
    }
    if (!reasonRaw) {
      return Response.json({ message: 'Alasan isolir wajib diisi.' }, { status: 400 })
    }
    if (payload.packagePrice != null && String(payload.packagePrice).trim() && packagePrice == null) {
      return Response.json({ message: 'Format harga paket tidak valid.' }, { status: 400 })
    }

    const linkedSubscription = await resolveLinkedSubscription(serviceReference)
    if (!linkedSubscription) {
      return Response.json(
        { message: 'Service No atau Customer Code tidak ditemukan pada subscription aktif review DB.' },
        { status: 404 },
      )
    }

    const reason = `[Review Isolir] ${session.displayName} (${session.username}) - ${reasonRaw}`
    const resolvedCustomerName = customerName || linkedSubscription.customerName
    const resolvedCustomerPhone = customerPhone || linkedSubscription.customerPhone
    const resolvedCustomerAddress = customerAddress || linkedSubscription.customerAddress
    const salesMarketingName = await resolveMarketingNameFromSalesContext(linkedSubscription.orderId)
    const resolvedMarketingName = marketingName || salesMarketingName

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
      [
        linkedSubscription.subscriptionId,
        resolvedCustomerName,
        resolvedCustomerAddress,
        resolvedCustomerPhone,
        resolvedMarketingName,
        radboxName,
        packagePrice,
        reason,
      ]
    )

    return Response.json({
      message: `Data isolir aktif untuk ${resolvedCustomerName} berhasil disimpan dan terhubung ke ${linkedSubscription.serviceNo || linkedSubscription.customerCode || serviceReference}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
