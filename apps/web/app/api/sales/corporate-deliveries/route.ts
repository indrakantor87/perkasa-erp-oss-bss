import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type ContractRow = {
  id: number
  contractNo: string
  leadId: number
  status: string
}

type DeliveryRow = {
  id: number
  contractId: number
  milestoneCode: string
  milestoneName: string
  status: string
  ownerName: string | null
  plannedAt: string | null
  completedAt: string | null
  contractNo: string | null
}

async function resolveSchemaReady() {
  const [hasId, hasContractId, hasMilestoneCode, hasMilestoneName, hasStatus] = await Promise.all([
    hasReviewDbColumn('sales_corporate_deliveries', 'id'),
    hasReviewDbColumn('sales_corporate_deliveries', 'contract_id'),
    hasReviewDbColumn('sales_corporate_deliveries', 'milestone_code'),
    hasReviewDbColumn('sales_corporate_deliveries', 'milestone_name'),
    hasReviewDbColumn('sales_corporate_deliveries', 'status'),
  ])
  return hasId && hasContractId && hasMilestoneCode && hasMilestoneName && hasStatus
}

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ deliveries: [] })
  }

  const schemaReady = await resolveSchemaReady()
  if (!schemaReady) {
    return Response.json({ deliveries: [] })
  }

  const [hasOwnerName, hasPlannedAt, hasCompletedAt] = await Promise.all([
    hasReviewDbColumn('sales_corporate_deliveries', 'owner_name'),
    hasReviewDbColumn('sales_corporate_deliveries', 'planned_at'),
    hasReviewDbColumn('sales_corporate_deliveries', 'completed_at'),
  ])

  const deliveries = await runReviewDbQuery<DeliveryRow>(`
    SELECT
      d.id,
      d.contract_id AS contractId,
      d.milestone_code AS milestoneCode,
      d.milestone_name AS milestoneName,
      d.status,
      ${hasOwnerName ? 'd.owner_name' : 'NULL'} AS ownerName,
      ${hasPlannedAt ? 'd.planned_at' : 'NULL'} AS plannedAt,
      ${hasCompletedAt ? 'd.completed_at' : 'NULL'} AS completedAt,
      c.contract_no AS contractNo
    FROM sales_corporate_deliveries d
    LEFT JOIN sales_contracts c ON c.id = d.contract_id
    ORDER BY d.id DESC
    LIMIT 15
  `)

  return Response.json({ deliveries })
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
      { message: 'Write action delivery corporate hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const schemaReady = await resolveSchemaReady()
    if (!schemaReady) {
      return Response.json(
        { message: 'Schema sales_corporate_deliveries belum siap. Jalankan schema SQL terbaru terlebih dulu.' },
        { status: 503 },
      )
    }

    const payload = (await request.json()) as {
      contractId?: unknown
      salesOrderId?: unknown
      milestoneCode?: unknown
      milestoneName?: unknown
      status?: unknown
      ownerName?: unknown
      plannedAt?: unknown
      notes?: unknown
    }

    const contractId = Number(payload.contractId)
    const salesOrderId = Number(payload.salesOrderId ?? 0)
    const milestoneCode = String(payload.milestoneCode ?? '').trim().toUpperCase()
    const milestoneName = String(payload.milestoneName ?? '').trim()
    const status = String(payload.status ?? 'PLANNED').trim().toUpperCase()
    const ownerName = String(payload.ownerName ?? '').trim()
    const plannedAtRaw = String(payload.plannedAt ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()

    if (!Number.isInteger(contractId) || contractId <= 0) {
      return Response.json({ message: 'Kontrak sumber tidak valid.' }, { status: 400 })
    }
    if (!milestoneCode) {
      return Response.json({ message: 'Kode milestone wajib diisi.' }, { status: 400 })
    }
    if (!milestoneName) {
      return Response.json({ message: 'Nama milestone wajib diisi.' }, { status: 400 })
    }
    if (!['PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED'].includes(status)) {
      return Response.json({ message: 'Status milestone tidak valid.' }, { status: 400 })
    }

    const [contract] = await runReviewDbQuery<ContractRow>(
      `
        SELECT
          id,
          contract_no AS contractNo,
          lead_id AS leadId,
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
    if (!['SIGNED', 'ACTIVE'].includes(String(contract.status ?? '').trim().toUpperCase())) {
      return Response.json({ message: 'Delivery corporate hanya boleh dimulai setelah kontrak berstatus SIGNED/ACTIVE.' }, { status: 400 })
    }

    const plannedAt = plannedAtRaw ? new Date(plannedAtRaw) : null
    if (plannedAt && !Number.isFinite(plannedAt.getTime())) {
      return Response.json({ message: 'Format jadwal milestone tidak valid.' }, { status: 400 })
    }

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO sales_corporate_deliveries (
          contract_id,
          sales_order_id,
          milestone_code,
          milestone_name,
          status,
          owner_name,
          planned_at,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        contract.id,
        Number.isInteger(salesOrderId) && salesOrderId > 0 ? salesOrderId : null,
        milestoneCode,
        milestoneName,
        status,
        ownerName || null,
        plannedAt ? plannedAt.toISOString().slice(0, 19).replace('T', ' ') : null,
        notesRaw || null,
      ],
    )

    return Response.json({
      message: `Milestone ${milestoneCode} untuk kontrak ${contract.contractNo} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

