import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type LeadRow = {
  id: number
  leadType: string
  leadStatus: string
  customerName: string
}

type QuotationNoRow = {
  quotationNo: string | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type QuotationRow = {
  id: number
  quotationNo: string
  status: string
  monthlyPrice: number
  installationFee: number
  contractMonths: number
  customerName: string
  leadId: number
  leadStatus: string
  packageCode: string | null
  slaCode: string | null
  createdAt: string | null
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

async function generateQuotationNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `QTN-${year}${month}-%`
  const rows = await runReviewDbQuery<QuotationNoRow>(
    `
      SELECT quotation_no AS quotationNo
      FROM sales_quotations
      WHERE quotation_no LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )
  const currentCode = rows[0]?.quotationNo ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `QTN-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

async function resolveSchemaReady() {
  const [hasId, hasLeadId, hasQuotationNo, hasStatus] = await Promise.all([
    hasReviewDbColumn('sales_quotations', 'id'),
    hasReviewDbColumn('sales_quotations', 'lead_id'),
    hasReviewDbColumn('sales_quotations', 'quotation_no'),
    hasReviewDbColumn('sales_quotations', 'status'),
  ])
  return hasId && hasLeadId && hasQuotationNo && hasStatus
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ quotations: [] })
  }

  const schemaReady = await resolveSchemaReady()
  if (!schemaReady) {
    return Response.json({ quotations: [] })
  }

  const hasCreatedAt = await hasReviewDbColumn('sales_quotations', 'created_at')

  const quotations = await runReviewDbQuery<QuotationRow>(`
    SELECT
      q.id,
      q.quotation_no AS quotationNo,
      q.status,
      COALESCE(q.monthly_price, 0) AS monthlyPrice,
      COALESCE(q.installation_fee, 0) AS installationFee,
      COALESCE(q.contract_months, 0) AS contractMonths,
      sl.customer_name AS customerName,
      sl.id AS leadId,
      sl.status AS leadStatus,
      sp.code AS packageCode,
      sla.code AS slaCode,
      ${hasCreatedAt ? 'q.created_at' : 'NULL'} AS createdAt
    FROM sales_quotations q
    LEFT JOIN sales_leads sl ON sl.id = q.lead_id
    LEFT JOIN sales_packages sp ON sp.id = q.package_id
    LEFT JOIN sales_sla_profiles sla ON sla.id = q.sla_profile_id
    ORDER BY ${hasCreatedAt ? 'q.created_at DESC,' : ''} q.id DESC
    LIMIT 10
  `)

  return Response.json({ quotations })
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
      { message: 'Write action quotation hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const schemaReady = await resolveSchemaReady()
    if (!schemaReady) {
      return Response.json(
        { message: 'Schema sales_quotations belum siap. Jalankan schema SQL terbaru terlebih dulu.' },
        { status: 503 },
      )
    }

    const payload = (await request.json()) as {
      leadId?: unknown
      packageCode?: unknown
      slaCode?: unknown
      monthlyPrice?: unknown
      installationFee?: unknown
      contractMonths?: unknown
      notes?: unknown
    }

    const leadId = Number(payload.leadId)
    const packageCode = String(payload.packageCode ?? '').trim().toUpperCase()
    const slaCode = String(payload.slaCode ?? '').trim().toUpperCase()
    const monthlyPrice = Number(payload.monthlyPrice ?? 0)
    const installationFee = Number(payload.installationFee ?? 0)
    const contractMonths = Number(payload.contractMonths ?? 12)
    const notesRaw = String(payload.notes ?? '').trim()

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return Response.json({ message: 'Lead sumber tidak valid.' }, { status: 400 })
    }
    if (!Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
      return Response.json({ message: 'Harga bulanan tidak valid.' }, { status: 400 })
    }
    if (!Number.isFinite(installationFee) || installationFee < 0) {
      return Response.json({ message: 'Biaya instalasi tidak valid.' }, { status: 400 })
    }
    if (!Number.isFinite(contractMonths) || contractMonths <= 0) {
      return Response.json({ message: 'Durasi kontrak tidak valid.' }, { status: 400 })
    }

    const [lead] = await runReviewDbQuery<LeadRow>(
      `
        SELECT
          id,
          lead_type AS leadType,
          status AS leadStatus,
          customer_name AS customerName
        FROM sales_leads
        WHERE id = ?
        LIMIT 1
      `,
      [leadId],
    )
    if (!lead) {
      return Response.json({ message: 'Lead sumber tidak ditemukan.' }, { status: 404 })
    }
    if (String(lead.leadType ?? '').trim().toUpperCase() !== 'CORPORATE') {
      return Response.json({ message: 'Quotation hanya untuk lead type CORPORATE.' }, { status: 400 })
    }

    const packageId =
      packageCode && (await hasReviewDbColumn('sales_packages', 'id')) && (await hasReviewDbColumn('sales_packages', 'code'))
        ? await runReviewDbQuery<{ id: number }>(
            `
              SELECT id
              FROM sales_packages
              WHERE UPPER(TRIM(code)) = ?
              LIMIT 1
            `,
            [packageCode],
          ).then((rows) => rows[0]?.id ?? null)
        : null

    const slaProfileId =
      slaCode &&
      (await hasReviewDbColumn('sales_sla_profiles', 'id')) &&
      (await hasReviewDbColumn('sales_sla_profiles', 'code'))
        ? await runReviewDbQuery<{ id: number }>(
            `
              SELECT id
              FROM sales_sla_profiles
              WHERE UPPER(TRIM(code)) = ?
              LIMIT 1
            `,
            [slaCode],
          ).then((rows) => rows[0]?.id ?? null)
        : null

    const quotationNo = await generateQuotationNo()
    const notes = `[Review Quotation] ${session.displayName} (${session.username})${notesRaw ? ` - ${notesRaw}` : ''}`

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO sales_quotations (
          lead_id,
          customer_id,
          package_id,
          sla_profile_id,
          quotation_no,
          status,
          monthly_price,
          installation_fee,
          contract_months,
          notes
        )
        VALUES (?, NULL, ?, ?, ?, 'INTERNAL_APPROVAL', ?, ?, ?, ?)
      `,
      [
        lead.id,
        packageId,
        slaProfileId,
        quotationNo,
        monthlyPrice,
        installationFee,
        Math.max(1, Math.round(contractMonths)),
        notes,
      ],
    )

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE sales_leads
        SET
          status = 'INTERNAL_APPROVAL',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [lead.id],
    )

    return Response.json({
      message: `Quotation ${quotationNo} untuk ${lead.customerName} berhasil dibuat dan masuk antrian approval.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

