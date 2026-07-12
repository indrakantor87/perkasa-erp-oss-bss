import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

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

    const [salesOrder] = await runReviewDbQuery<ReviewSalesOrderRow>(
      `
        SELECT
          so.id,
          so.order_no AS orderNo,
          so.status AS orderStatus,
          so.customer_id AS customerId,
          so.package_id AS packageId,
          COALESCE(sl.customer_name, c.full_name, 'Customer belum terpetakan') AS customerName,
          sl.lead_type AS leadType,
          sl.phone,
          sl.address
        FROM sales_orders so
        LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id
        LEFT JOIN crm_customers c
          ON c.id = so.customer_id
        WHERE so.id = ?
        LIMIT 1
      `,
      [salesOrderId],
    )
    if (!salesOrder) {
      return Response.json({ message: 'Sales order sumber tidak ditemukan di review DB.' }, { status: 404 })
    }

    const existingSubscriptions = await runReviewDbQuery<ReviewSubscriptionRow>(
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
    if (existingSubscriptions.length > 0) {
      return Response.json(
        { message: `Sales order ini sudah memiliki subscription ${existingSubscriptions[0]?.serviceNo}.` },
        { status: 409 },
      )
    }

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
          AND (
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
      const customerInsert = await runReviewDbExecute<InsertResult>(
        `
          INSERT INTO crm_customers (
            customer_code,
            customer_type,
            full_name,
            identity_no,
            phone,
            email,
            branch_id
          )
          VALUES (?, ?, ?, NULL, ?, NULL, NULL)
        `,
        [customerCode, customerType, salesOrder.customerName, salesOrder.phone || null],
      )

      customerId = Number(customerInsert.insertId ?? 0)
      if (!customerId) {
        return Response.json({ message: 'Customer master gagal dibuat saat aktivasi subscription.' }, { status: 500 })
      }

      await runReviewDbExecute<InsertResult>(
        `
          INSERT INTO crm_customer_addresses (
            customer_id,
            label,
            address,
            maps_url,
            is_primary
          )
          VALUES (?, ?, ?, ?, 1)
        `,
        [customerId, addressLabel || 'Alamat Instalasi', customerAddress, mapsUrl || null],
      )
    }

    const serviceNo = await generateServiceNo()
    const subscriptionMonthlyPrice =
      monthlyPriceValue !== null ? monthlyPriceValue : Number(selectedPackage.price ?? 0)

    const subscriptionInsert = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO service_subscriptions (
          customer_id,
          order_id,
          package_id,
          service_no,
          status,
          activated_at,
          terminated_at,
          monthly_price
        )
        VALUES (?, ?, ?, ?, 'ACTIVE', ?, NULL, ?)
      `,
      [customerId, salesOrder.id, selectedPackage.id, serviceNo, activatedAt, subscriptionMonthlyPrice],
    )

    const subscriptionId = Number(subscriptionInsert.insertId ?? 0)
    if (!subscriptionId) {
      return Response.json({ message: 'Subscription gagal dibuat di review DB.' }, { status: 500 })
    }

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE sales_orders
        SET
          customer_id = ?,
          package_id = ?,
          status = 'COMPLETED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [customerId, selectedPackage.id, salesOrder.id],
    )

    const [workOrder] = await runReviewDbQuery<ReviewWorkOrderRow>(
      `
        SELECT
          id,
          work_order_no AS workOrderNo,
          status
        FROM service_work_orders
        WHERE sales_order_id = ?
          AND work_type = 'INSTALLATION'
        ORDER BY COALESCE(scheduled_at, created_at) DESC, id DESC
        LIMIT 1
      `,
      [salesOrder.id],
    )

    if (workOrder) {
      const appendedNote = `[Activation] ${session.displayName} (${session.username})${
        notesRaw ? ` - ${notesRaw}` : ''
      }`
      await runReviewDbExecute<InsertResult>(
        `
          UPDATE service_work_orders
          SET
            subscription_id = ?,
            status = 'COMPLETED',
            completed_at = ?,
            notes = CASE
              WHEN notes IS NULL OR TRIM(notes) = '' THEN ?
              ELSE CONCAT(notes, '\n', ?)
            END,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [subscriptionId, activatedAt, appendedNote, appendedNote, workOrder.id],
      )
    }

    return Response.json({
      message: `Subscription ${serviceNo} untuk order ${salesOrder.orderNo} berhasil diaktifkan dengan paket ${selectedPackage.name}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
