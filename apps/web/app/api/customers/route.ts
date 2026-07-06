import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedCustomerTypes = new Set(['HOME', 'CORPORATE', 'RESELLER'])

type CustomerCodeRow = {
  customerCode: string
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function padSequence(value: number) {
  return String(value).padStart(5, '0')
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
  return `${prefix}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'customers', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action customers hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      fullName?: unknown
      customerType?: unknown
      identityNo?: unknown
      phone?: unknown
      email?: unknown
      addressLabel?: unknown
      address?: unknown
      mapsUrl?: unknown
    }

    const fullName = String(payload.fullName ?? '').trim()
    const customerType = String(payload.customerType ?? '').trim().toUpperCase()
    const identityNo = String(payload.identityNo ?? '').trim()
    const phone = String(payload.phone ?? '').trim()
    const email = String(payload.email ?? '').trim().toLowerCase()
    const addressLabel = String(payload.addressLabel ?? '').trim()
    const address = String(payload.address ?? '').trim()
    const mapsUrl = String(payload.mapsUrl ?? '').trim()

    if (!fullName) {
      return Response.json({ message: 'Nama customer wajib diisi.' }, { status: 400 })
    }
    if (!allowedCustomerTypes.has(customerType)) {
      return Response.json({ message: 'Customer type tidak valid.' }, { status: 400 })
    }
    if (!address) {
      return Response.json({ message: 'Alamat utama wajib diisi.' }, { status: 400 })
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
        VALUES (?, ?, ?, ?, ?, ?, NULL)
      `,
      [customerCode, customerType, fullName, identityNo || null, phone || null, email || null],
    )

    const customerId = Number(customerInsert.insertId ?? 0)
    if (!customerId) {
      return Response.json({ message: 'Customer gagal dibuat di review DB.' }, { status: 500 })
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
      [customerId, addressLabel || 'Alamat Utama', address, mapsUrl || null],
    )

    return Response.json({
      message: `Customer review ${customerCode} untuk ${fullName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
