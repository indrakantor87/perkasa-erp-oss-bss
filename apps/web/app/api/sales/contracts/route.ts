import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ContractNoRow = {
  contractNo: string | null
}

type QuotationRow = {
  id: number
  quotationNo: string
  leadId: number
  monthlyPrice: number
  contractMonths: number
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type ContractRow = {
  id: number
  contractNo: string
  status: string
  signedAt: string | null
  quotationNo: string
  customerName: string
  leadId: number
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

async function generateContractNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `CTR-${year}${month}-%`
  const rows = await runReviewDbQuery<ContractNoRow>(
    `
      SELECT contract_no AS contractNo
      FROM sales_contracts
      WHERE contract_no LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )
  const currentCode = rows[0]?.contractNo ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `CTR-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

async function resolveSchemaReady() {
  const [hasId, hasQuotationId, hasLeadId, hasContractNo, hasStatus] = await Promise.all([
    hasReviewDbColumn('sales_contracts', 'id'),
    hasReviewDbColumn('sales_contracts', 'quotation_id'),
    hasReviewDbColumn('sales_contracts', 'lead_id'),
    hasReviewDbColumn('sales_contracts', 'contract_no'),
    hasReviewDbColumn('sales_contracts', 'status'),
  ])
  return hasId && hasQuotationId && hasLeadId && hasContractNo && hasStatus
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ contracts: [] })
  }

  const schemaReady = await resolveSchemaReady()
  if (!schemaReady) {
    return Response.json({ contracts: [] })
  }

  const hasSignedAt = await hasReviewDbColumn('sales_contracts', 'signed_at')

  const contracts = await runReviewDbQuery<ContractRow>(`
    SELECT
      c.id,
      c.contract_no AS contractNo,
      c.status,
      ${hasSignedAt ? 'c.signed_at' : 'NULL'} AS signedAt,
      q.quotation_no AS quotationNo,
      sl.customer_name AS customerName,
      c.lead_id AS leadId
    FROM sales_contracts c
    LEFT JOIN sales_quotations q ON q.id = c.quotation_id
    LEFT JOIN sales_leads sl ON sl.id = c.lead_id
    ORDER BY ${hasSignedAt ? 'c.signed_at DESC,' : ''} c.id DESC
    LIMIT 10
  `)

  return Response.json({ contracts })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'sales', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action kontrak hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const schemaReady = await resolveSchemaReady()
    if (!schemaReady) {
      return Response.json(
        { message: 'Schema sales_contracts belum siap. Jalankan schema SQL terbaru terlebih dulu.' },
        { status: 503 },
      )
    }
    const quotationSchemaReady = await Promise.all([
      hasReviewDbColumn('sales_quotations', 'id'),
      hasReviewDbColumn('sales_quotations', 'quotation_no'),
      hasReviewDbColumn('sales_quotations', 'lead_id'),
      hasReviewDbColumn('sales_quotations', 'status'),
    ]).then((items) => items.every(Boolean))
    if (!quotationSchemaReady) {
      return Response.json(
        { message: 'Schema sales_quotations belum siap. Jalankan schema SQL terbaru terlebih dulu.' },
        { status: 503 },
      )
    }

    const payload = (await request.json()) as {
      quotationId?: unknown
      notes?: unknown
    }

    const quotationId = Number(payload.quotationId)
    const notesRaw = String(payload.notes ?? '').trim()

    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      return Response.json({ message: 'Quotation sumber tidak valid.' }, { status: 400 })
    }

    const [quotation] = await runReviewDbQuery<QuotationRow>(
      `
        SELECT
          id,
          quotation_no AS quotationNo,
          lead_id AS leadId,
          COALESCE(monthly_price, 0) AS monthlyPrice,
          COALESCE(contract_months, 12) AS contractMonths
        FROM sales_quotations
        WHERE id = ?
        LIMIT 1
      `,
      [quotationId],
    )
    if (!quotation) {
      return Response.json({ message: 'Quotation sumber tidak ditemukan.' }, { status: 404 })
    }

    const contractNo = await generateContractNo()
    const notes = `[Review Contract Signed] ${session.displayName} (${session.username})${
      notesRaw ? ` - ${notesRaw}` : ''
    }`

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO sales_contracts (
          quotation_id,
          lead_id,
          customer_id,
          subscription_id,
          contract_no,
          status,
          signed_at,
          start_date,
          end_date,
          notes
        )
        VALUES (?, ?, NULL, NULL, ?, 'SIGNED', CURRENT_TIMESTAMP, NULL, NULL, ?)
      `,
      [quotation.id, quotation.leadId, contractNo, notes],
    )

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE sales_leads
        SET
          status = 'CONTRACT_SIGNED',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [quotation.leadId],
    )

    return Response.json({
      message: `Kontrak ${contractNo} berhasil dicatat. Lead corporate siap masuk delivery.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

