import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'

type LeaveBalanceRow = {
  id: number
  employee_id: number
  leave_type_id: number
  fiscal_year: number
  balance_initial: number
  balance_used: number
  balance_remaining: number
}

type InsertResult = { insertId?: number; affectedRows?: number; changedRows?: number }

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parsePositiveDecimal(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseFloat(String(value).trim())
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (!canPerformAction(session.role, 'hr', 'update') && !canPerformAction(session.role, 'leave_requests', 'approve')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }
  await ensureHrBatch02b()
  try {
    const payload = (await request.json()) as {
      employee_id?: unknown
      leave_type_id?: unknown
      fiscal_year?: unknown
      balance_initial_new?: unknown
      amount_delta_add?: unknown
      amount_delta_subtract?: unknown
    }

    const employeeId = parsePositiveInt(payload.employee_id)
    const leaveTypeId = parsePositiveInt(payload.leave_type_id)
    const fiscalYearRaw = parsePositiveInt(payload.fiscal_year)
    const fiscalYear = fiscalYearRaw ?? new Date().getFullYear()

    const balanceInitialNew = parsePositiveDecimal(payload.balance_initial_new)
    const amountDeltaAdd = parsePositiveDecimal(payload.amount_delta_add)
    const amountDeltaSubtract = parsePositiveDecimal(payload.amount_delta_subtract)

    if (!employeeId) return Response.json({ message: 'employee_id wajib diisi dan valid.' }, { status: 400 })
    if (!leaveTypeId) return Response.json({ message: 'leave_type_id wajib diisi dan valid.' }, { status: 400 })

    const hasInitialNew = balanceInitialNew !== null
    const hasDeltaAdd = amountDeltaAdd !== null
    const hasDeltaSubtract = amountDeltaSubtract !== null

    const methodCount = [hasInitialNew, hasDeltaAdd, hasDeltaSubtract].filter(Boolean).length
    if (methodCount === 0) {
      return Response.json(
        { message: 'Pilih salah satu: balance_initial_new OR amount_delta_add OR amount_delta_subtract.' },
        { status: 400 },
      )
    }
    if (methodCount > 1) {
      return Response.json(
        { message: 'Hanya boleh satu method: balance_initial_new OR amount_delta_add OR amount_delta_subtract. Jangan campur.' },
        { status: 400 },
      )
    }

    const [empExist] = await runReviewDbQuery<{ id: number }>(
      `SELECT id FROM hr_employees WHERE id = ? AND is_active = 1 LIMIT 1`,
      [employeeId],
    )
    if (!empExist) return Response.json({ message: 'Employee tidak ditemukan atau tidak aktif.' }, { status: 404 })

    const [ltExist] = await runReviewDbQuery<{ id: number; deduct_balance: number }>(
      `SELECT id, deduct_balance FROM hr_leave_types WHERE id = ? LIMIT 1`,
      [leaveTypeId],
    )
    if (!ltExist) return Response.json({ message: 'Leave type tidak ditemukan.' }, { status: 404 })

    let nextBalanceInitial: number

    const [existing] = await runReviewDbQuery<LeaveBalanceRow>(
      `
        SELECT id, employee_id, leave_type_id, fiscal_year, balance_initial, balance_used, balance_remaining
        FROM hr_leave_balances
        WHERE employee_id = ? AND leave_type_id = ? AND fiscal_year = ?
        LIMIT 1
      `,
      [employeeId, leaveTypeId, fiscalYear],
    )

    if (hasInitialNew) {
      nextBalanceInitial = balanceInitialNew!
    } else if (hasDeltaAdd) {
      const current = existing?.balance_initial ?? 0
      nextBalanceInitial = current + amountDeltaAdd!
    } else {
      const current = existing?.balance_initial ?? 0
      nextBalanceInitial = Math.max(0, current - amountDeltaSubtract!)
    }

    let balanceId: number
    let affectedRows: number

    if (existing) {
      const res = await runReviewDbExecute<InsertResult>(
        `UPDATE hr_leave_balances SET balance_initial = ?, updated_at = NOW() WHERE id = ? LIMIT 1`,
        [nextBalanceInitial, existing.id],
      )
      balanceId = existing.id
      affectedRows = Number(res.affectedRows ?? 0)
    } else {
      const res = await runReviewDbExecute<InsertResult>(
        `INSERT INTO hr_leave_balances (employee_id, leave_type_id, fiscal_year, balance_initial, balance_used) VALUES (?, ?, ?, ?, 0)`,
        [employeeId, leaveTypeId, fiscalYear, nextBalanceInitial],
      )
      balanceId = Number(res.insertId ?? 0)
      affectedRows = balanceId > 0 ? 1 : 0
    }

    if (affectedRows === 0) {
      return Response.json({ message: 'Gagal adjust balance, tidak ada baris terpengaruh.' }, { status: 500 })
    }

    const methodLabel = hasInitialNew
      ? `SET_INITIAL=${balanceInitialNew}`
      : hasDeltaAdd
        ? `DELTA_ADD=+${amountDeltaAdd}`
        : `DELTA_SUBTRACT=-${amountDeltaSubtract}`

    await recordHrAudit({
      actionType: 'LEAVE_BALANCE_ADJUST',
      actor: `${session.role}:${session.displayName}`,
      targetRef: `LEAVE_BALANCE-${balanceId}`,
      detail: `Adjust balance employee_id=${employeeId} leave_type_id=${leaveTypeId} fiscal_year=${fiscalYear} ${methodLabel} old_initial=${existing?.balance_initial ?? 0} new_initial=${nextBalanceInitial}`,
    })

    return Response.json({
      id: balanceId,
      employee_id: employeeId,
      leave_type_id: leaveTypeId,
      fiscal_year: fiscalYear,
      balance_initial_new: nextBalanceInitial,
      method: hasInitialNew ? 'set_initial' : hasDeltaAdd ? 'delta_add' : 'delta_subtract',
      delta_value: hasInitialNew ? null : hasDeltaAdd ? amountDeltaAdd : amountDeltaSubtract,
    })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal adjust leave balance: ${detail}` }, { status: 500 })
  }
}
