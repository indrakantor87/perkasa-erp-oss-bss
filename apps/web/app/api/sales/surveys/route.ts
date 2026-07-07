import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedSurveyTypes = new Set(['HOME', 'DEDICATED', 'RESELLER'])
const allowedSurveyStatuses = new Set(['REQUESTED', 'SCHEDULED', 'ON_PROGRESS'])
const allowedFeasibilityStatuses = new Set(['PENDING', 'FEASIBLE', 'NOT_FEASIBLE', 'NEED_REVIEW'])

type ReviewLeadRow = {
  id: number
  customerName: string
  leadType: string
  address: string | null
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

    const [lead] = await runReviewDbQuery<ReviewLeadRow>(
      `
        SELECT
          id,
          customer_name AS customerName,
          lead_type AS leadType,
          address
        FROM sales_leads
        WHERE id = ?
        LIMIT 1
      `,
      [leadId],
    )
    if (!lead) {
      return Response.json({ message: 'Lead sumber tidak ditemukan di review DB.' }, { status: 404 })
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

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO sales_surveys (
          lead_id,
          customer_id,
          covered_area_id,
          survey_no,
          survey_type,
          survey_status,
          feasibility_status,
          requested_by_user_id,
          assigned_employee_id,
          scheduled_at,
          surveyed_at,
          site_address,
          technical_notes,
          customer_request_notes
        )
        VALUES (?, NULL, NULL, ?, ?, ?, ?, NULL, NULL, ?, NULL, ?, ?, ?)
      `,
      [
        lead.id,
        surveyNo,
        surveyType,
        surveyStatus,
        feasibilityStatus,
        scheduledAt,
        siteAddressRaw || lead.address || null,
        technicalNotes,
        customerRequestNotesRaw || null,
      ],
    )

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE sales_leads
        SET
          status = 'SURVEY_REQUEST',
          updated_at = CURRENT_TIMESTAMP
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
