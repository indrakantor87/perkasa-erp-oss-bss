import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ReviewSalesOrderRow = {
  id: number
  orderNo: string
  orderStatus: string
  customerId: number | null
  packageId: number | null
  customerName: string
  leadType: string | null
  phone: string | null
  address: string | null
}

type ReviewCorporateAcceptanceRow = {
  id: number
  acceptanceNo: string
  status: string
}

type ReviewPackageRow = {
  id: number
  code: string
  name: string
  serviceType: string
  speedLabel: string | null
  price: number
}

type ReviewSubscriptionRow = {
  id: number
  serviceNo: string
}

type ReviewWorkOrderRow = {
  id: number
  workOrderNo: string
  status: string
}

type ServiceNoRow = {
  serviceNo: string | null
}

type CustomerCodeRow = {
  customerCode: string
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function padSequence(value: number, length: number) {
  return String(value).padStart(length, '0')
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function mapLeadTypeToCustomerType(leadType: string | null | undefined) {
  const normalized = String(leadType ?? '').trim().toUpperCase()
  if (normalized === 'CORPORATE') return 'CORPORATE'
  if (normalized === 'RESELLER') return 'RESELLER'
  return 'HOME'
}

async function generateServiceNo() {
  const rows = await runReviewDbQuery<ServiceNoRow>(
    `
      SELECT service_no AS serviceNo
      FROM service_subscriptions
      WHERE service_no LIKE 'SVC-%'
      ORDER BY id DESC
      LIMIT 1
    `,
  )

  const currentCode = rows[0]?.serviceNo ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `SVC-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1, 6)}`
}

async function generateCustomerCode(customerType: string) {
  const prefix = customerType === 'CORPORATE' ? 'CORP' : customerType === 'RESELLER' ? 'RSL' : 'CUST'
  const rows = await runReviewDbQuery<CustomerCodeRow>(
    `
      SELECT customer_code AS customerCode
      FROM crm_customers
      WHERE customer_code LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [`${prefix}-%`],
  )
  const currentCode = rows[0]?.customerCode ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `${prefix}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1, 5)}`
}

async function getSalesOrderQueryParts() {
  const [
    hasSalesOrderId,
    hasSalesOrderOrderNo,
    hasSalesOrderStatus,
    hasSalesOrderCustomerId,
    hasSalesOrderPackageId,
    hasSalesOrderLeadId,
    hasSalesLeadId,
    hasSalesLeadCustomerName,
    hasSalesLeadLeadType,
    hasSalesLeadPhone,
    hasSalesLeadAddress,
    hasCustomerId,
    hasCustomerFullName,
  ] = await Promise.all([
    hasReviewDbColumn('sales_orders', 'id'),
    hasReviewDbColumn('sales_orders', 'order_no'),
    hasReviewDbColumn('sales_orders', 'status'),
    hasReviewDbColumn('sales_orders', 'customer_id'),
    hasReviewDbColumn('sales_orders', 'package_id'),
    hasReviewDbColumn('sales_orders', 'lead_id'),
    hasReviewDbColumn('sales_leads', 'id'),
    hasReviewDbColumn('sales_leads', 'customer_name'),
    hasReviewDbColumn('sales_leads', 'lead_type'),
    hasReviewDbColumn('sales_leads', 'phone'),
    hasReviewDbColumn('sales_leads', 'address'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'full_name'),
  ])

  if (!hasSalesOrderId || !hasSalesOrderOrderNo || !hasSalesOrderStatus) {
    throw new Error('Schema inti sales_orders belum siap. Kolom id, order_no, dan status wajib tersedia.')
  }

  const canJoinSalesLead = hasSalesOrderLeadId && hasSalesLeadId
  const canJoinCustomer = hasSalesOrderCustomerId && hasCustomerId

  return {
    customerIdExpression: hasSalesOrderCustomerId ? 'so.customer_id' : 'NULL',
    packageIdExpression: hasSalesOrderPackageId ? 'so.package_id' : 'NULL',
    salesLeadJoin: canJoinSalesLead
      ? `
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id`
      : '',
    customerJoin: canJoinCustomer
      ? `
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id`
      : '',
    customerNameExpression: canJoinSalesLead && hasSalesLeadCustomerName
      ? `COALESCE(sl.customer_name, ${canJoinCustomer && hasCustomerFullName ? 'c.full_name' : "'Customer belum terpetakan'"})`
      : canJoinCustomer && hasCustomerFullName
        ? `COALESCE(c.full_name, 'Customer belum terpetakan')`
        : `'Customer belum terpetakan'`,
    leadTypeExpression: canJoinSalesLead && hasSalesLeadLeadType ? 'sl.lead_type' : 'NULL',
    phoneExpression: canJoinSalesLead && hasSalesLeadPhone ? 'sl.phone' : 'NULL',
    addressExpression: canJoinSalesLead && hasSalesLeadAddress ? 'sl.address' : 'NULL',
  }
}

async function getSalesPackageQueryParts() {
  const [hasStatus, hasServiceType, hasSpeedLabel, hasPrice] = await Promise.all([
    hasReviewDbColumn('sales_packages', 'status'),
    hasReviewDbColumn('sales_packages', 'service_type'),
    hasReviewDbColumn('sales_packages', 'speed_label'),
    hasReviewDbColumn('sales_packages', 'price'),
  ])

  return {
    statusFilter: hasStatus ? "status = 'ACTIVE'" : '',
    serviceTypeExpression: hasServiceType ? 'service_type' : 'NULL',
    speedLabelExpression: hasSpeedLabel ? 'speed_label' : 'NULL',
    priceExpression: hasPrice ? 'price' : '0',
  }
}

async function buildCustomerInsertPayload(params: {
  customerCode: string
  customerType: string
  customerName: string
  phone: string | null
}) {
  const [hasCustomerCode, hasCustomerType, hasFullName, hasIdentityNo, hasPhone, hasEmail, hasBranchId] =
    await Promise.all([
      hasReviewDbColumn('crm_customers', 'customer_code'),
      hasReviewDbColumn('crm_customers', 'customer_type'),
      hasReviewDbColumn('crm_customers', 'full_name'),
      hasReviewDbColumn('crm_customers', 'identity_no'),
      hasReviewDbColumn('crm_customers', 'phone'),
      hasReviewDbColumn('crm_customers', 'email'),
      hasReviewDbColumn('crm_customers', 'branch_id'),
    ])

  if (!hasCustomerCode || !hasCustomerType || !hasFullName) {
    throw new Error('Schema inti crm_customers belum siap. Kolom customer_code, customer_type, dan full_name wajib tersedia.')
  }

  const columns = ['customer_code', 'customer_type', 'full_name']
  const values: unknown[] = [params.customerCode, params.customerType, params.customerName]

  if (hasIdentityNo) {
    columns.push('identity_no')
    values.push(null)
  }
  if (hasPhone) {
    columns.push('phone')
    values.push(params.phone)
  }
  if (hasEmail) {
    columns.push('email')
    values.push(null)
  }
  if (hasBranchId) {
    columns.push('branch_id')
    values.push(null)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
}

async function buildCustomerAddressInsertPayload(params: {
  customerId: number
  label: string
  address: string
  mapsUrl: string | null
}) {
  const [hasCustomerId, hasLabel, hasAddress, hasMapsUrl, hasIsPrimary] = await Promise.all([
    hasReviewDbColumn('crm_customer_addresses', 'customer_id'),
    hasReviewDbColumn('crm_customer_addresses', 'label'),
    hasReviewDbColumn('crm_customer_addresses', 'address'),
    hasReviewDbColumn('crm_customer_addresses', 'maps_url'),
    hasReviewDbColumn('crm_customer_addresses', 'is_primary'),
  ])

  if (!hasCustomerId || !hasAddress) {
    return null
  }

  const columns = ['customer_id', 'address']
  const values: unknown[] = [params.customerId, params.address]

  if (hasLabel) {
    columns.push('label')
    values.push(params.label)
  }
  if (hasMapsUrl) {
    columns.push('maps_url')
    values.push(params.mapsUrl)
  }
  if (hasIsPrimary) {
    columns.push('is_primary')
    values.push(1)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
}

async function buildSubscriptionInsertPayload(params: {
  customerId: number
  orderId: number
  packageId: number
  serviceNo: string
  activatedAt: Date
  monthlyPrice: number
}) {
  const [hasCustomerId, hasOrderId, hasPackageId, hasServiceNo, hasStatus, hasActivatedAt, hasTerminatedAt, hasMonthlyPrice] =
    await Promise.all([
      hasReviewDbColumn('service_subscriptions', 'customer_id'),
      hasReviewDbColumn('service_subscriptions', 'order_id'),
      hasReviewDbColumn('service_subscriptions', 'package_id'),
      hasReviewDbColumn('service_subscriptions', 'service_no'),
      hasReviewDbColumn('service_subscriptions', 'status'),
      hasReviewDbColumn('service_subscriptions', 'activated_at'),
      hasReviewDbColumn('service_subscriptions', 'terminated_at'),
      hasReviewDbColumn('service_subscriptions', 'monthly_price'),
    ])

  if (!hasCustomerId || !hasOrderId || !hasServiceNo || !hasStatus) {
    throw new Error('Schema inti service_subscriptions belum siap. Kolom customer_id, order_id, service_no, dan status wajib tersedia.')
  }

  const columns = ['customer_id', 'order_id', 'service_no', 'status']
  const values: unknown[] = [params.customerId, params.orderId, params.serviceNo, 'ACTIVE']

  if (hasPackageId) {
    columns.push('package_id')
    values.push(params.packageId)
  }
  if (hasActivatedAt) {
    columns.push('activated_at')
    values.push(params.activatedAt)
  }
  if (hasTerminatedAt) {
    columns.push('terminated_at')
    values.push(null)
  }
  if (hasMonthlyPrice) {
    columns.push('monthly_price')
    values.push(params.monthlyPrice)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
}

async function buildSalesOrderUpdatePayload(params: {
  customerId: number
  packageId: number
}) {
  const [hasCustomerId, hasPackageId, hasStatus, hasUpdatedAt] = await Promise.all([
    hasReviewDbColumn('sales_orders', 'customer_id'),
    hasReviewDbColumn('sales_orders', 'package_id'),
    hasReviewDbColumn('sales_orders', 'status'),
    hasReviewDbColumn('sales_orders', 'updated_at'),
  ])

  if (!hasStatus) {
    throw new Error('Schema inti sales_orders belum siap. Kolom status wajib tersedia.')
  }

  const assignments = [`status = 'COMPLETED'`]
  const values: unknown[] = []

  if (hasCustomerId) {
    assignments.push('customer_id = ?')
    values.push(params.customerId)
  }
  if (hasPackageId) {
    assignments.push('package_id = ?')
    values.push(params.packageId)
  }
  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  return {
    assignments,
    values,
  }
}

async function getWorkOrderQueryParts() {
  const [
    hasSalesOrderId,
    hasWorkType,
    hasWorkOrderNo,
    hasStatus,
    hasScheduledAt,
    hasCreatedAt,
  ] = await Promise.all([
    hasReviewDbColumn('service_work_orders', 'sales_order_id'),
    hasReviewDbColumn('service_work_orders', 'work_type'),
    hasReviewDbColumn('service_work_orders', 'work_order_no'),
    hasReviewDbColumn('service_work_orders', 'status'),
    hasReviewDbColumn('service_work_orders', 'scheduled_at'),
    hasReviewDbColumn('service_work_orders', 'created_at'),
  ])

  if (!hasSalesOrderId) {
    return null
  }

  return {
    workTypeFilter: hasWorkType ? `AND work_type = 'INSTALLATION'` : '',
    workOrderNoExpression: hasWorkOrderNo ? 'work_order_no' : `CONCAT('WO-', id)`,
    statusExpression: hasStatus ? 'status' : `'OPEN'`,
    orderByExpression: hasScheduledAt && hasCreatedAt ? 'COALESCE(scheduled_at, created_at) DESC, id DESC' : 'id DESC',
  }
}

async function buildWorkOrderUpdatePayload(params: {
  subscriptionId: number
  completedAt: Date
  note: string
}) {
  const [hasSubscriptionId, hasStatus, hasCompletedAt, hasNotes, hasUpdatedAt] = await Promise.all([
    hasReviewDbColumn('service_work_orders', 'subscription_id'),
    hasReviewDbColumn('service_work_orders', 'status'),
    hasReviewDbColumn('service_work_orders', 'completed_at'),
    hasReviewDbColumn('service_work_orders', 'notes'),
    hasReviewDbColumn('service_work_orders', 'updated_at'),
  ])

  const assignments: string[] = []
  const values: unknown[] = []

  if (hasSubscriptionId) {
    assignments.push('subscription_id = ?')
    values.push(params.subscriptionId)
  }
  if (hasStatus) {
    assignments.push(`status = 'COMPLETED'`)
  }
  if (hasCompletedAt) {
    assignments.push('completed_at = ?')
    values.push(params.completedAt)
  }
  if (hasNotes) {
    assignments.push(`notes = CASE
              WHEN notes IS NULL OR TRIM(notes) = '' THEN ?
              ELSE CONCAT(notes, '\n', ?)
            END`)
    values.push(params.note, params.note)
  }
  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  return assignments.length
    ? {
        assignments,
        values,
      }
    : null
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'sales', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ suggestions: [] as string[] })
  }

  try {
    const packages = await runReviewDbQuery<ReviewPackageRow>(
      `
        SELECT
          id,
          code,
          name,
          service_type AS serviceType,
          speed_label AS speedLabel,
          price
        FROM sales_packages
        WHERE status = 'ACTIVE'
        ORDER BY service_type ASC, price ASC, id DESC
      `,
    )

    return Response.json({
      suggestions: packages.map((item) =>
        `${item.code} | ${item.name}${item.speedLabel ? ` | ${item.speedLabel}` : ''}`,
      ),
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'sales', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action aktivasi subscription hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      salesOrderId?: unknown
      packageReference?: unknown
      activatedAt?: unknown
      monthlyPrice?: unknown
      addressLabel?: unknown
      address?: unknown
      mapsUrl?: unknown
      notes?: unknown
    }

    const salesOrderId = Number(payload.salesOrderId)
    const packageReference = String(payload.packageReference ?? '').trim()
    const activatedAtRaw = String(payload.activatedAt ?? '').trim()
    const monthlyPriceValue = normalizePrice(payload.monthlyPrice)
    const addressLabel = String(payload.addressLabel ?? '').trim()
    const address = String(payload.address ?? '').trim()
    const mapsUrl = String(payload.mapsUrl ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()

    if (!Number.isInteger(salesOrderId) || salesOrderId <= 0) {
      return Response.json({ message: 'Sales order sumber tidak valid.' }, { status: 400 })
    }
    if (!packageReference) {
      return Response.json({ message: 'Kode atau nama paket wajib diisi.' }, { status: 400 })
    }

    const salesOrderQueryParts = await getSalesOrderQueryParts()
    const [salesOrder] = await runReviewDbQuery<ReviewSalesOrderRow>(
      `
        SELECT
          so.id,
          so.order_no AS orderNo,
          so.status AS orderStatus,
          ${salesOrderQueryParts.customerIdExpression} AS customerId,
          ${salesOrderQueryParts.packageIdExpression} AS packageId,
          ${salesOrderQueryParts.customerNameExpression} AS customerName,
          ${salesOrderQueryParts.leadTypeExpression} AS leadType,
          ${salesOrderQueryParts.phoneExpression} AS phone,
          ${salesOrderQueryParts.addressExpression} AS address
        FROM sales_orders so
        ${salesOrderQueryParts.salesLeadJoin}
        ${salesOrderQueryParts.customerJoin}
        WHERE so.id = ?
        LIMIT 1
      `,
      [salesOrderId],
    )
    if (!salesOrder) {
      return Response.json({ message: 'Sales order sumber tidak ditemukan di review DB.' }, { status: 404 })
    }

    if (String(salesOrder.leadType ?? '').trim().toUpperCase() === 'CORPORATE') {
      const acceptanceSchemaReady = await Promise.all([
        hasReviewDbColumn('sales_corporate_acceptances', 'id'),
        hasReviewDbColumn('sales_corporate_acceptances', 'sales_order_id'),
        hasReviewDbColumn('sales_corporate_acceptances', 'acceptance_no'),
        hasReviewDbColumn('sales_corporate_acceptances', 'status'),
      ]).then((items) => items.every(Boolean))

      if (!acceptanceSchemaReady) {
        return Response.json(
          {
            message:
              'Guardrail corporate aktif: schema acceptance/UAT belum siap. Jalankan schema SQL terbaru sebelum aktivasi corporate.',
          },
          { status: 503 },
        )
      }

      const [acceptance] = await runReviewDbQuery<ReviewCorporateAcceptanceRow>(
        `
          SELECT
            id,
            acceptance_no AS acceptanceNo,
            status
          FROM sales_corporate_acceptances
          WHERE sales_order_id = ?
          ORDER BY id DESC
          LIMIT 1
        `,
        [salesOrder.id],
      )

      if (!acceptance || String(acceptance.status ?? '').trim().toUpperCase() !== 'ACCEPTED') {
        return Response.json(
          {
            message:
              'Guardrail CORPORATE: aktivasi hanya boleh dilakukan setelah testing/UAT acceptance berstatus ACCEPTED.',
          },
          { status: 400 },
        )
      }
    }

    const hasSubscriptionOrderId = await hasReviewDbColumn('service_subscriptions', 'order_id')
    const existingSubscriptions = hasSubscriptionOrderId
      ? await runReviewDbQuery<ReviewSubscriptionRow>(
          `
            SELECT
              id,
              service_no AS serviceNo
            FROM service_subscriptions
            WHERE order_id = ?
            LIMIT 1
          `,
          [salesOrder.id],
        )
      : []
    if (existingSubscriptions.length > 0) {
      return Response.json(
        { message: `Sales order ini sudah memiliki subscription ${existingSubscriptions[0]?.serviceNo}.` },
        { status: 409 },
      )
    }

    const salesPackageQueryParts = await getSalesPackageQueryParts()
    const packages = await runReviewDbQuery<ReviewPackageRow>(
      `
        SELECT
          id,
          code,
          name,
          ${salesPackageQueryParts.serviceTypeExpression} AS serviceType,
          ${salesPackageQueryParts.speedLabelExpression} AS speedLabel,
          ${salesPackageQueryParts.priceExpression} AS price
        FROM sales_packages
        WHERE ${salesPackageQueryParts.statusFilter ? `${salesPackageQueryParts.statusFilter}\n          AND ` : ''}(
            UPPER(code) = UPPER(?)
            OR UPPER(name) = UPPER(?)
          )
        ORDER BY id DESC
        LIMIT 1
      `,
      [packageReference, packageReference],
    )
    const selectedPackage = packages[0]
    if (!selectedPackage) {
      return Response.json({ message: 'Paket layanan tidak ditemukan di review DB.' }, { status: 404 })
    }

    const activatedAt = activatedAtRaw ? new Date(activatedAtRaw) : new Date()
    if (!Number.isFinite(activatedAt.getTime())) {
      return Response.json({ message: 'Format waktu aktivasi tidak valid.' }, { status: 400 })
    }

    let customerId = salesOrder.customerId
    if (!customerId) {
      const customerType = mapLeadTypeToCustomerType(salesOrder.leadType)
      const customerAddress = address || salesOrder.address || ''
      if (!customerAddress) {
        return Response.json(
          { message: 'Alamat aktivasi wajib diisi ketika customer master belum terbentuk.' },
          { status: 400 },
        )
      }

      const customerCode = await generateCustomerCode(customerType)
      const customerInsertPayload = await buildCustomerInsertPayload({
        customerCode,
        customerType,
        customerName: salesOrder.customerName,
        phone: salesOrder.phone || null,
      })
      const customerInsert = await runReviewDbExecute<InsertResult>(
        `
          INSERT INTO crm_customers (
            ${customerInsertPayload.columns.join(',\n            ')}
          )
          VALUES (${customerInsertPayload.placeholders.join(', ')})
        `,
        customerInsertPayload.values,
      )

      customerId = Number(customerInsert.insertId ?? 0)
      if (!customerId) {
        return Response.json({ message: 'Customer master gagal dibuat saat aktivasi subscription.' }, { status: 500 })
      }

      const customerAddressInsertPayload = await buildCustomerAddressInsertPayload({
        customerId,
        label: addressLabel || 'Alamat Instalasi',
        address: customerAddress,
        mapsUrl: mapsUrl || null,
      })

      if (customerAddressInsertPayload) {
        await runReviewDbExecute<InsertResult>(
          `
            INSERT INTO crm_customer_addresses (
              ${customerAddressInsertPayload.columns.join(',\n              ')}
            )
            VALUES (${customerAddressInsertPayload.placeholders.join(', ')})
          `,
          customerAddressInsertPayload.values,
        )
      }
    }

    const serviceNo = await generateServiceNo()
    const subscriptionMonthlyPrice =
      monthlyPriceValue !== null ? monthlyPriceValue : Number(selectedPackage.price ?? 0)

    const subscriptionInsertPayload = await buildSubscriptionInsertPayload({
      customerId,
      orderId: salesOrder.id,
      packageId: selectedPackage.id,
      serviceNo,
      activatedAt,
      monthlyPrice: subscriptionMonthlyPrice,
    })
    const subscriptionInsert = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO service_subscriptions (
          ${subscriptionInsertPayload.columns.join(',\n          ')}
        )
        VALUES (${subscriptionInsertPayload.placeholders.join(', ')})
      `,
      subscriptionInsertPayload.values,
    )

    const subscriptionId = Number(subscriptionInsert.insertId ?? 0)
    if (!subscriptionId) {
      return Response.json({ message: 'Subscription gagal dibuat di review DB.' }, { status: 500 })
    }

    const salesOrderUpdatePayload = await buildSalesOrderUpdatePayload({
      customerId,
      packageId: selectedPackage.id,
    })
    await runReviewDbExecute<InsertResult>(
      `
        UPDATE sales_orders
        SET
          ${salesOrderUpdatePayload.assignments.join(',\n          ')}
        WHERE id = ?
      `,
      [...salesOrderUpdatePayload.values, salesOrder.id],
    )

    const workOrderQueryParts = await getWorkOrderQueryParts()
    const [workOrder] = workOrderQueryParts
      ? await runReviewDbQuery<ReviewWorkOrderRow>(
          `
            SELECT
              id,
              ${workOrderQueryParts.workOrderNoExpression} AS workOrderNo,
              ${workOrderQueryParts.statusExpression} AS status
            FROM service_work_orders
            WHERE sales_order_id = ?
              ${workOrderQueryParts.workTypeFilter}
            ORDER BY ${workOrderQueryParts.orderByExpression}
            LIMIT 1
          `,
          [salesOrder.id],
        )
      : [null]

    if (workOrder) {
      const appendedNote = `[Activation] ${session.displayName} (${session.username})${
        notesRaw ? ` - ${notesRaw}` : ''
      }`
      const workOrderUpdatePayload = await buildWorkOrderUpdatePayload({
        subscriptionId,
        completedAt: activatedAt,
        note: appendedNote,
      })

      if (workOrderUpdatePayload) {
        await runReviewDbExecute<InsertResult>(
          `
            UPDATE service_work_orders
            SET
              ${workOrderUpdatePayload.assignments.join(',\n              ')}
            WHERE id = ?
          `,
          [...workOrderUpdatePayload.values, workOrder.id],
        )
      }
    }

    return Response.json({
      message: `Subscription ${serviceNo} untuk order ${salesOrder.orderNo} berhasil diaktifkan dengan paket ${selectedPackage.name}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
