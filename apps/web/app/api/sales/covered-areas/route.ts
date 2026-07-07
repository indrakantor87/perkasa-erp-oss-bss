import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedCoverageStatuses = new Set(['PLANNED', 'AVAILABLE', 'LIMITED', 'UNAVAILABLE'])

type ReviewLeadRow = {
  id: number
  customerName: string
}

type CoverageCodeRow = {
  areaCode: string | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

function resolveLeadStatus(coverageStatus: string) {
  return coverageStatus === 'AVAILABLE' || coverageStatus === 'LIMITED' ? 'QUALIFIED' : 'COVERAGE_CHECK'
}

async function generateCoverageCode() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `COV-${year}${month}-%`
  const rows = await runReviewDbQuery<CoverageCodeRow>(
    `
      SELECT area_code AS areaCode
      FROM sales_covered_areas
      WHERE area_code LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )

  const currentCode = rows[0]?.areaCode ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `COV-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
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
      { message: 'Write action sales coverage hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      leadId?: unknown
      areaName?: unknown
      village?: unknown
      district?: unknown
      city?: unknown
      province?: unknown
      coverageStatus?: unknown
      notes?: unknown
    }

    const leadId = Number(payload.leadId)
    const areaName = String(payload.areaName ?? '').trim()
    const village = String(payload.village ?? '').trim()
    const district = String(payload.district ?? '').trim()
    const city = String(payload.city ?? '').trim()
    const province = String(payload.province ?? '').trim()
    const coverageStatus = String(payload.coverageStatus ?? '').trim().toUpperCase()
    const notesRaw = String(payload.notes ?? '').trim()

    if (!Number.isInteger(leadId) || leadId <= 0) {
      return Response.json({ message: 'Lead sumber tidak valid.' }, { status: 400 })
    }
    if (!areaName) {
      return Response.json({ message: 'Nama area wajib diisi.' }, { status: 400 })
    }
    if (!allowedCoverageStatuses.has(coverageStatus)) {
      return Response.json({ message: 'Status coverage tidak valid.' }, { status: 400 })
    }

    const [lead] = await runReviewDbQuery<ReviewLeadRow>(
      `
        SELECT
          id,
          customer_name AS customerName
        FROM sales_leads
        WHERE id = ?
        LIMIT 1
      `,
      [leadId],
    )
    if (!lead) {
      return Response.json({ message: 'Lead sumber tidak ditemukan di review DB.' }, { status: 404 })
    }

    const areaCode = await generateCoverageCode()
    const notes = `[Review Coverage] ${session.displayName} (${session.username})${
      notesRaw ? ` - ${notesRaw}` : ''
    }`

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO sales_covered_areas (
          branch_id,
          area_code,
          area_name,
          village,
          district,
          city,
          province,
          latitude,
          longitude,
          coverage_status,
          notes
        )
        VALUES (NULL, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
      `,
      [
        areaCode,
        areaName,
        village || null,
        district || null,
        city || null,
        province || null,
        coverageStatus,
        notes,
      ],
    )

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE sales_leads
        SET
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [resolveLeadStatus(coverageStatus), lead.id],
    )

    return Response.json({
      message: `Coverage ${areaCode} untuk lead ${lead.customerName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
