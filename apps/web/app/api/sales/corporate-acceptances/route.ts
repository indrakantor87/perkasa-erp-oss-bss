import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type AcceptanceNoRow = {
  acceptanceNo: string | null
}

type ContractRow = {
  id: number
  contractNo: string
  status: string
}

type AcceptanceRow = {
  id: number
  contractId: number
  acceptanceNo: string
  status: string
  testedAt: string | null
  acceptedAt: string | null
  contractNo: string | null
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

async function generateAcceptanceNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `UAT-${year}${month}-%`
  const rows = await runReviewDbQuery<AcceptanceNoRow>(
    `
      SELECT acceptance_no AS acceptanceNo
      FROM sales_corporate_acceptances
      WHERE acceptance_no LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )
  const currentCode = rows[0]?.acceptanceNo ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `UAT-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

async function resolveSchemaReady() {
  const [hasId, hasContractId, hasAcceptanceNo, hasStatus] = await Promise.all([
    hasReviewDbColumn('sales_corporate_acceptances', 'id'),
    hasReviewDbColumn('sales_corporate_acceptances', 'contract_id'),
    hasReviewDbColumn('sales_corporate_acceptances', 'acceptance_no'),
    hasReviewDbColumn('sales_corporate_acceptances', 'status'),
  ])
  return hasId && hasContractId && hasAcceptanceNo && hasStatus
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ acceptances: [] })
  }

  const schemaReady = await resolveSchemaReady()
  if (!schemaReady) {
    return Response.json({ acceptances: [] })
  }

  const [hasTestedAt, hasAcceptedAt] = await Promise.all([
    hasReviewDbColumn('sales_corporate_acceptances', 'tested_at'),
    hasReviewDbColumn('sales_corporate_acceptances', 'accepted_at'),
  ])

  const acceptances = await runReviewDbQuery<AcceptanceRow>(`
    SELECT
      a.id,
      a.contract_id AS contractId,
      a.acceptance_no AS acceptanceNo,
      a.status,
      ${hasTestedAt ? 'a.tested_at' : 'NULL'} AS testedAt,
      ${hasAcceptedAt ? 'a.accepted_at' : 'NULL'} AS acceptedAt,
      c.contract_no AS contractNo
    FROM sales_corporate_acceptances a
    LEFT JOIN sales_contracts c ON c.id = a.contract_id
    ORDER BY a.id DESC
    LIMIT 15
  `)

  return Response.json({ acceptances })
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
      { message: 'Write action acceptance corporate hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const schemaReady = await resolveSchemaReady()
    if (!schemaReady) {
      return Response.json(
        { message: 'Schema sales_corporate_acceptances belum siap. Jalankan schema SQL terbaru terlebih dulu.' },
        { status: 503 },
      )
    }

    const payload = (await request.json()) as {
      contractId?: unknown
      salesOrderId?: unknown
      status?: unknown
      notes?: unknown
    }

    const contractId = Number(payload.contractId)
    const salesOrderId = Number(payload.salesOrderId ?? 0)
    const status = String(payload.status ?? 'TESTING').trim().toUpperCase()
    const notesRaw = String(payload.notes ?? '').trim()

    if (!Number.isInteger(contractId) || contractId <= 0) {
      return Response.json({ message: 'Kontrak sumber tidak valid.' }, { status: 400 })
    }
    if (!['TESTING', 'UAT', 'ACCEPTED', 'REJECTED'].includes(status)) {
      return Response.json({ message: 'Status acceptance tidak valid.' }, { status: 400 })
    }

    const [contract] = await runReviewDbQuery<ContractRow>(
      `
        SELECT
          id,
          contract_no AS contractNo,
          status
        FROM sales_contracts
        WHERE id = ?
        LIMIT 1
      `,
      [contractId],
    )
    if (!contract) {
      return Response.json({ message: 'Kontrak corporate tidak ditemukan.' }, { status: 404 })
    }

    const acceptanceNo = await generateAcceptanceNo()
    const testedAt = ['TESTING', 'UAT', 'ACCEPTED'].includes(status) ? new Date() : null
    const acceptedAt = status === 'ACCEPTED' ? new Date() : null

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO sales_corporate_acceptances (
          contract_id,
          sales_order_id,
          acceptance_no,
          status,
          tested_at,
          accepted_at,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        contract.id,
        Number.isInteger(salesOrderId) && salesOrderId > 0 ? salesOrderId : null,
        acceptanceNo,
        status,
        testedAt ? testedAt.toISOString().slice(0, 19).replace('T', ' ') : null,
        acceptedAt ? acceptedAt.toISOString().slice(0, 19).replace('T', ' ') : null,
        notesRaw || null,
      ],
    )

    if (status === 'ACCEPTED') {
      await runReviewDbExecute<ExecuteResult>(
        `
          UPDATE sales_contracts
          SET
            status = 'ACTIVE',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [contract.id],
      )
    }

    return Response.json({
      message:
        status === 'ACCEPTED'
          ? `Acceptance ${acceptanceNo} berhasil disimpan. Kontrak ${contract.contractNo} siap ke aktivasi.`
          : `Acceptance ${acceptanceNo} berhasil dicatat dengan status ${status}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

