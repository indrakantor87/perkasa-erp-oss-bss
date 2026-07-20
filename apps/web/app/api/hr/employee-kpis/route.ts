import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { ensureHrEmployeeKpiTable } from '@/lib/services/hr-employee-kpi-service'

type EmployeeRow = {
  id: number
  employeeCode: string
  fullName: string
}

type ExistingRow = {
  id: number
}

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
}

function normalizeScore(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed)) return 0
  return Math.max(0, Math.min(100, parsed))
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'HR KPI hanya aktif saat review DB tersedia.' }, { status: 503 })
  }

  try {
    await ensureHrEmployeeKpiTable()
    const url = new URL(request.url)
    const employeeCode = String(url.searchParams.get('employee') ?? '').trim()
    const month = Number.parseInt(String(url.searchParams.get('month') ?? '').trim() || '0', 10)
    const year = Number.parseInt(String(url.searchParams.get('year') ?? '').trim() || '0', 10)

    const whereClauses: string[] = []
    const values: unknown[] = []

    if (employeeCode) {
      whereClauses.push('UPPER(he.employee_code) = UPPER(?)')
      values.push(employeeCode)
    }

    if (Number.isInteger(month) && month >= 1 && month <= 12) {
      whereClauses.push('hek.kpi_month = ?')
      values.push(month)
    }

    if (Number.isInteger(year) && year >= 2020 && year <= 2100) {
      whereClauses.push('hek.kpi_year = ?')
      values.push(year)
    }

    const rows = await runReviewDbQuery(
      `
        SELECT
          hek.id AS kpiId,
          he.employee_code AS employeeCode,
          he.full_name AS employeeName,
          hek.kpi_month AS kpiMonth,
          hek.kpi_year AS kpiYear,
          hek.score,
          hek.performance_bonus AS performanceBonus,
          hek.notes,
          CAST(hek.updated_at AS CHAR) AS updatedAt
        FROM hr_employee_kpis hek
        JOIN hr_employees he
          ON he.id = hek.employee_id
        ${whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''}
        ORDER BY hek.kpi_year DESC, hek.kpi_month DESC, hek.id DESC
        LIMIT 50
      `,
      values,
    )

    return Response.json({ items: rows })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'hr', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action KPI HR hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    await ensureHrEmployeeKpiTable()
    const payload = (await request.json()) as {
      employeeCode?: unknown
      kpiMonth?: unknown
      kpiYear?: unknown
      score?: unknown
      performanceBonus?: unknown
      notes?: unknown
    }

    const employeeCode = String(payload.employeeCode ?? '').trim()
    const kpiMonth = Number.parseInt(String(payload.kpiMonth ?? '').trim() || '0', 10)
    const kpiYear = Number.parseInt(String(payload.kpiYear ?? '').trim() || '0', 10)
    const score = normalizeScore(payload.score)
    const performanceBonusParsed = normalizePrice(payload.performanceBonus)
    const performanceBonus = performanceBonusParsed === null ? 0 : performanceBonusParsed
    const notes = String(payload.notes ?? '').trim() || null

    if (!employeeCode) {
      return Response.json({ message: 'Employee HR wajib dipilih.' }, { status: 400 })
    }
    if (!Number.isInteger(kpiMonth) || kpiMonth < 1 || kpiMonth > 12) {
      return Response.json({ message: 'Bulan KPI tidak valid.' }, { status: 400 })
    }
    if (!Number.isInteger(kpiYear) || kpiYear < 2020 || kpiYear > 2100) {
      return Response.json({ message: 'Tahun KPI tidak valid.' }, { status: 400 })
    }
    if (!Number.isFinite(performanceBonus) || performanceBonus < 0) {
      return Response.json({ message: 'Bonus performa tidak valid.' }, { status: 400 })
    }

    const [employee] = await runReviewDbQuery<EmployeeRow>(
      `
        SELECT
          id,
          employee_code AS employeeCode,
          full_name AS fullName
        FROM hr_employees
        WHERE UPPER(employee_code) = UPPER(?)
        LIMIT 1
      `,
      [employeeCode],
    )
    if (!employee) {
      return Response.json({ message: 'Employee HR tidak ditemukan di review DB.' }, { status: 404 })
    }

    const existing = await runReviewDbQuery<ExistingRow>(
      `
        SELECT id
        FROM hr_employee_kpis
        WHERE employee_id = ?
          AND kpi_month = ?
          AND kpi_year = ?
        LIMIT 1
      `,
      [employee.id, kpiMonth, kpiYear],
    )

    if (existing.length > 0) {
      await runReviewDbExecute<ExecuteResult>(
        `
          UPDATE hr_employee_kpis
          SET score = ?,
              performance_bonus = ?,
              notes = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
          LIMIT 1
        `,
        [score, performanceBonus, notes, existing[0].id],
      )

      return Response.json({
        message: `KPI employee ${employee.employeeCode} - ${employee.fullName} periode ${kpiMonth}/${kpiYear} berhasil diperbarui.`,
      })
    }

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO hr_employee_kpis (
          employee_id,
          kpi_month,
          kpi_year,
          score,
          performance_bonus,
          notes
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [employee.id, kpiMonth, kpiYear, score, performanceBonus, notes],
    )

    return Response.json({
      message: `KPI employee ${employee.employeeCode} - ${employee.fullName} periode ${kpiMonth}/${kpiYear} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

