import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type BranchRow = {
  id: number
}

type DivisionRow = {
  id: number
}

type EmployeeCodeRow = {
  employeeCode: string | null
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

async function generateEmployeeCode() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `EMP-${year}${month}-%`
  const rows = await runReviewDbQuery<EmployeeCodeRow>(
    `
      SELECT employee_code AS employeeCode
      FROM hr_employees
      WHERE employee_code LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )

  const currentCode = rows[0]?.employeeCode ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `EMP-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      branchCode?: unknown
      divisionCode?: unknown
      fullName?: unknown
      positionName?: unknown
      employmentStatus?: unknown
      joinDate?: unknown
      baseSalary?: unknown
      phone?: unknown
      whatsapp?: unknown
    }

    const branchCode = String(payload.branchCode ?? '').trim()
    const divisionCode = String(payload.divisionCode ?? '').trim()
    const fullName = String(payload.fullName ?? '').trim()
    const positionName = String(payload.positionName ?? '').trim()
    const employmentStatus = String(payload.employmentStatus ?? '').trim() || 'KARYAWAN'
    const joinDateRaw = String(payload.joinDate ?? '').trim()
    const baseSalary = normalizePrice(payload.baseSalary)
    const phone = String(payload.phone ?? '').trim()
    const whatsapp = String(payload.whatsapp ?? '').trim()

    if (!fullName) {
      return Response.json({ message: 'Nama karyawan wajib diisi.' }, { status: 400 })
    }
    if (baseSalary === null || baseSalary < 0) {
      return Response.json({ message: 'Gaji pokok tidak valid.' }, { status: 400 })
    }

    const joinDate = joinDateRaw ? new Date(joinDateRaw) : null
    if (joinDate && !Number.isFinite(joinDate.getTime())) {
      return Response.json({ message: 'Tanggal join tidak valid.' }, { status: 400 })
    }

    let branchId: number | null = null
    if (branchCode) {
      const [branch] = await runReviewDbQuery<BranchRow>(
        `
          SELECT id
          FROM org_branches
          WHERE UPPER(code) = UPPER(?)
          LIMIT 1
        `,
        [branchCode],
      )
      if (!branch) {
        return Response.json({ message: 'Kode cabang tidak ditemukan di review DB.' }, { status: 404 })
      }
      branchId = branch.id
    }

    let divisionId: number | null = null
    if (divisionCode) {
      const [division] = await runReviewDbQuery<DivisionRow>(
        `
          SELECT id
          FROM org_divisions
          WHERE UPPER(code) = UPPER(?)
          LIMIT 1
        `,
        [divisionCode],
      )
      if (!division) {
        return Response.json({ message: 'Kode divisi tidak ditemukan di review DB.' }, { status: 404 })
      }
      divisionId = division.id
    }

    const employeeCode = await generateEmployeeCode()
    await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO hr_employees (
          branch_id,
          division_id,
          employee_code,
          full_name,
          position_name,
          employment_status,
          join_date,
          base_salary,
          phone,
          whatsapp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        branchId,
        divisionId,
        employeeCode,
        fullName,
        positionName || null,
        employmentStatus,
        joinDateRaw || null,
        baseSalary,
        phone || null,
        whatsapp || null,
      ],
    )

    return Response.json({
      message: `Employee ${employeeCode} untuk ${fullName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
