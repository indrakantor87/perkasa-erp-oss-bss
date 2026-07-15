import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedSurveyTypes = new Set(['HOME', 'DEDICATED', 'RESELLER'])
const allowedSurveyStatuses = new Set(['REQUESTED', 'SCHEDULED', 'ON_PROGRESS'])
const allowedFeasibilityStatuses = new Set(['PENDING', 'FEASIBLE', 'NOT_FEASIBLE', 'NEED_REVIEW'])

type ReviewLeadRow = {
  id: number
  customerName: string
  leadType: string
  address: string | null
  branchId: number | null
}

type SurveyNoRow = {
  surveyNo: string | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

function mapLeadTypeToSurveyType(leadType: string) {
  const normalized = leadType.trim().toUpperCase()
  if (normalized === 'CORPORATE') return 'DEDICATED'
  if (normalized === 'RESELLER') return 'RESELLER'
  return 'HOME'
}

async function generateSurveyNo() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `SVY-${year}${month}-%`
  const rows = await runReviewDbQuery<SurveyNoRow>(
    `
      SELECT survey_no AS surveyNo
      FROM sales_surveys
      WHERE survey_no LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )

  const currentCode = rows[0]?.surveyNo ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `SVY-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

async function getSalesLeadQueryParts() {
  const [hasCustomerName, hasLeadType, hasAddress, hasBranchId] = await Promise.all([
    hasReviewDbColumn('sales_leads', 'customer_name'),
    hasReviewDbColumn('sales_leads', 'lead_type'),
    hasReviewDbColumn('sales_leads', 'address'),
    hasReviewDbColumn('sales_leads', 'branch_id'),
  ])

  if (!hasCustomerName || !hasLeadType) {
    throw new Error('Schema inti sales_leads belum siap. Kolom customer_name dan lead_type wajib tersedia.')
  }

  return {
    addressExpression: hasAddress ? 'address' : 'NULL',
    branchIdExpression: hasBranchId ? 'branch_id' : 'NULL',
  }
}

async function buildSalesSurveyInsertPayload(params: {
  branchId: number | null
  leadId: number
  surveyNo: string
  surveyType: string
  surveyStatus: string
  feasibilityStatus: string
  scheduledAt: Date | null
  siteAddress: string | null
  technicalNotes: string
  customerRequestNotes: string | null
}) {
  const [
    hasBranchId,
    hasLeadId,
    hasCustomerId,
    hasCoveredAreaId,
    hasSurveyNo,
    hasSurveyType,
    hasSurveyStatus,
    hasFeasibilityStatus,
    hasRequestedByUserId,
    hasAssignedEmployeeId,
    hasScheduledAt,
    hasSurveyedAt,
    hasSiteAddress,
    hasTechnicalNotes,
    hasCustomerRequestNotes,
  ] = await Promise.all([
    hasReviewDbColumn('sales_surveys', 'branch_id'),
    hasReviewDbColumn('sales_surveys', 'lead_id'),
    hasReviewDbColumn('sales_surveys', 'customer_id'),
    hasReviewDbColumn('sales_surveys', 'covered_area_id'),
    hasReviewDbColumn('sales_surveys', 'survey_no'),
    hasReviewDbColumn('sales_surveys', 'survey_type'),
    hasReviewDbColumn('sales_surveys', 'survey_status'),
    hasReviewDbColumn('sales_surveys', 'feasibility_status'),
    hasReviewDbColumn('sales_surveys', 'requested_by_user_id'),
    hasReviewDbColumn('sales_surveys', 'assigned_employee_id'),
    hasReviewDbColumn('sales_surveys', 'scheduled_at'),
    hasReviewDbColumn('sales_surveys', 'surveyed_at'),
    hasReviewDbColumn('sales_surveys', 'site_address'),
    hasReviewDbColumn('sales_surveys', 'technical_notes'),
    hasReviewDbColumn('sales_surveys', 'customer_request_notes'),
  ])

  if (!hasLeadId || !hasSurveyNo || !hasSurveyStatus) {
    throw new Error('Schema inti sales_surveys belum siap. Kolom lead_id, survey_no, dan survey_status wajib tersedia.')
  }

  const columns = ['lead_id', 'survey_no', 'survey_status']
  const values: unknown[] = [params.leadId, params.surveyNo, params.surveyStatus]

  if (hasBranchId) {
    columns.unshift('branch_id')
    values.unshift(params.branchId)
  }
  if (hasCustomerId) {
    columns.push('customer_id')
    values.push(null)
  }
  if (hasCoveredAreaId) {
    columns.push('covered_area_id')
    values.push(null)
  }
  if (hasSurveyType) {
    columns.push('survey_type')
    values.push(params.surveyType)
  }
  if (hasFeasibilityStatus) {
    columns.push('feasibility_status')
    values.push(params.feasibilityStatus)
  }
  if (hasRequestedByUserId) {
    columns.push('requested_by_user_id')
    values.push(null)
  }
  if (hasAssignedEmployeeId) {
    columns.push('assigned_employee_id')
    values.push(null)
  }
  if (hasScheduledAt) {
    columns.push('scheduled_at')
    values.push(params.scheduledAt)
  }
  if (hasSurveyedAt) {
    columns.push('surveyed_at')
    values.push(null)
  }
  if (hasSiteAddress) {
    columns.push('site_address')
    values.push(params.siteAddress)
  }
  if (hasTechnicalNotes) {
    columns.push('technical_notes')
    values.push(params.technicalNotes)
  }
  if (hasCustomerRequestNotes) {
    columns.push('customer_request_notes')
    values.push(params.customerRequestNotes)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
}

async function buildSalesLeadUpdatePayload() {
  const [hasStatus, hasUpdatedAt] = await Promise.all([
    hasReviewDbColumn('sales_leads', 'status'),
    hasReviewDbColumn('sales_leads', 'updated_at'),
  ])

  if (!hasStatus) {
    throw new Error('Schema inti sales_leads belum siap. Kolom status wajib tersedia.')
  }

  const assignments = [`status = 'SURVEY_REQUEST'`]

  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  return {
    assignments,
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
      { message: 'Write action sales survey hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      leadId?: unknown
      surveyType?: unknown
      surveyStatus?: unknown
      feasibilityStatus?: unknown
      scheduledAt?: unknown
      siteAddress?: unknown
      technicalNotes?: unknown
      customerRequestNotes?: unknown
    }

    const leadId = Number(payload.leadId)
    const surveyTypeRaw = String(payload.surveyType ?? '').trim().toUpperCase()
    const surveyStatus = String(payload.surveyStatus ?? '').trim().toUpperCase()
    const feasibilityStatus = String(payload.feasibilityStatus ?? '').trim().toUpperCase()
    const scheduledAtRaw = String(payload.scheduledAt ?? '').trim()
    const siteAddressRaw = String(payload.siteAddress ?? '').trim()
    const technicalNotesRaw = String(payload.technicalNotes ?? '').trim()
    const customerRequestNotesRaw = String(payload.customerRequestNotes ?? '').trim()

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return Response.json({ message: 'Lead sumber tidak valid.' }, { status: 400 })
    }
    if (!allowedSurveyStatuses.has(surveyStatus)) {
      return Response.json({ message: 'Status survey tidak valid.' }, { status: 400 })
    }
    if (!allowedFeasibilityStatuses.has(feasibilityStatus)) {
      return Response.json({ message: 'Status feasibility tidak valid.' }, { status: 400 })
    }

    const salesLeadQueryParts = await getSalesLeadQueryParts()
    const [lead] = await runReviewDbQuery<ReviewLeadRow>(
      `
        SELECT
          id,
          customer_name AS customerName,
          lead_type AS leadType,
          ${salesLeadQueryParts.addressExpression} AS address,
          ${salesLeadQueryParts.branchIdExpression} AS branchId
        FROM sales_leads
        WHERE id = ?
        LIMIT 1
      `,
      [leadId],
    )
    if (!lead) {
      return Response.json({ message: 'Lead sumber tidak ditemukan di review DB.' }, { status: 404 })
    }
    const normalizedLeadBranchId = Number(lead.branchId)
    const leadBranchId =
      Number.isFinite(normalizedLeadBranchId) && normalizedLeadBranchId > 0 ? normalizedLeadBranchId : null
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'OWNER') {
      const allowedBranchIds =
        session.role === 'ADMIN'
          ? (session.branchIds ?? []).filter((value) => Number.isFinite(value) && value > 0)
          : session.branchId && Number.isFinite(session.branchId) && session.branchId > 0
            ? [session.branchId]
            : []
      if (!leadBranchId || !allowedBranchIds.includes(leadBranchId)) {
        return Response.json({ message: 'Lead sumber tidak berada dalam scope cabang user.' }, { status: 403 })
      }
    }

    const surveyType = surveyTypeRaw || mapLeadTypeToSurveyType(lead.leadType)
    if (!allowedSurveyTypes.has(surveyType)) {
      return Response.json({ message: 'Survey type tidak valid.' }, { status: 400 })
    }

    const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : null
    if (scheduledAt && !Number.isFinite(scheduledAt.getTime())) {
      return Response.json({ message: 'Format jadwal survey tidak valid.' }, { status: 400 })
    }

    const surveyNo = await generateSurveyNo()
    const technicalNotes = `[Review Survey] ${session.displayName} (${session.username})${
      technicalNotesRaw ? ` - ${technicalNotesRaw}` : ''
    }`
    const salesSurveyInsertPayload = await buildSalesSurveyInsertPayload({
      branchId: leadBranchId ?? session.branchId ?? null,
      leadId: lead.id,
      surveyNo,
      surveyType,
      surveyStatus,
      feasibilityStatus,
      scheduledAt,
      siteAddress: siteAddressRaw || lead.address || null,
      technicalNotes,
      customerRequestNotes: customerRequestNotesRaw || null,
    })

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO sales_surveys (
          ${salesSurveyInsertPayload.columns.join(',\n          ')}
        )
        VALUES (${salesSurveyInsertPayload.placeholders.join(', ')})
      `,
      salesSurveyInsertPayload.values,
    )

    const salesLeadUpdatePayload = await buildSalesLeadUpdatePayload()
    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE sales_leads
        SET
          ${salesLeadUpdatePayload.assignments.join(',\n          ')}
        WHERE id = ?
      `,
      [lead.id],
    )

    return Response.json({
      message: `Survey ${surveyNo} untuk ${lead.customerName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
