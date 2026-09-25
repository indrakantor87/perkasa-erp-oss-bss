import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import {
  runReviewDbExecute,
  runReviewDbQuery,
  runReviewDbTransaction,
} from '@/lib/review-db'
import { recordHrAudit } from '@/lib/services/hr-audit-service'
import { ensureHrBatch02b } from '@/lib/services/hr-batch02b-schema-ensure'
import { applyApprovedLeaveToAttendance } from '@/lib/services/attendance-workforce-apply.service'
import type { LeaveRequestStatus } from '@/lib/types'
import type { ReviewDbConnection } from '@/lib/review-db'

type LeaveRequestRow = {
  id: number
  employee_id: number
  leave_type_id: number
  status: LeaveRequestStatus
  start_date: string
  end_date: string
  total_days: number
  balance_applied: number
}

type LeaveTypeRow = {
  id: number
  deduct_balance: number
  code: string
  name: string
}

type LeaveBalanceRow = {
  id: number
  balance_initial: number
  balance_used: number
  balance_remaining: number
}

function parsePositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number.parseInt(String(value).trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  const hasHrApproval =
    canPerformAction(session.role, 'hr', 'approve') ||
    canPerformAction(session.role, 'leave_requests', 'approve') ||
    session.role === 'SUPER_ADMIN' ||
    session.role === 'OWNER' ||
    canPerformAction(session.role, 'hr', 'update')

  if (!hasHrApproval) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Write action HR hanya aktif saat review DB tersedia.' }, { status: 503 })
  }

  await ensureHrBatch02b()

  const leaveId = parsePositiveInt(params.id)
  if (!leaveId) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })

  try {
    const payload = (await request.json()) as {
      decision?: unknown
      reason?: unknown
    }

    const decisionRaw = String(payload.decision ?? '').trim().toUpperCase()
    const reason = payload.reason === undefined || payload.reason === null ? null : String(payload.reason).trim()

    if (!['APPROVE', 'REJECT'].includes(decisionRaw)) {
      return Response.json({ message: 'decision wajib APPROVE atau REJECT.' }, { status: 400 })
    }

    const isApprove = decisionRaw === 'APPROVE'
    const actorName = `${session.role}:${session.displayName}`

    const [leaveReq] = await runReviewDbQuery<LeaveRequestRow>(
      `
        SELECT
          id,
          employee_id,
          leave_type_id,
          status,
          CAST(start_date AS CHAR) AS start_date,
          CAST(end_date AS CHAR) AS end_date,
          total_days,
          balance_applied
        FROM hr_leave_requests
        WHERE id = ?
        LIMIT 1
      `,
      [leaveId],
    )
    if (!leaveReq) return Response.json({ message: 'Request tidak ditemukan' }, { status: 404 })

    const allowedStatusesForHrFinal: LeaveRequestStatus[] = ['APPROVED_SUPERVISOR', 'PENDING_SUPERVISOR']
    if (!allowedStatusesForHrFinal.includes(leaveReq.status)) {
      return Response.json(
        { message: `Status leave request saat ini ${leaveReq.status}. HR final hanya dapat memproses status APPROVED_SUPERVISOR atau PENDING_SUPERVISOR.` },
        { status: 400 },
      )
    }

    const [leaveType] = await runReviewDbQuery<LeaveTypeRow>(
      `SELECT id, deduct_balance, code, name FROM hr_leave_types WHERE id = ? LIMIT 1`,
      [leaveReq.leave_type_id],
    )
    if (!leaveType) return Response.json({ message: 'Leave type tidak ditemukan.' }, { status: 404 })

    if (!isApprove) {
      const updateRes = await runReviewDbExecute(
        `
          UPDATE hr_leave_requests
          SET status = 'REJECTED_HR',
              hr_reason = ?,
              updated_at = NOW()
          WHERE id = ?
          LIMIT 1
        `,
        [reason, leaveId],
      )
      if (Number((updateRes as { affectedRows?: number }).affectedRows ?? 0) === 0) {
        return Response.json({ message: 'Gagal reject HR. Status mungkin sudah berubah.' }, { status: 409 })
      }

      await recordHrAudit({
        actionType: 'LEAVE_REQUEST_HR_REJECT',
        actor: actorName,
        targetRef: `LEAVE_REQUEST-${leaveId}`,
        detail: `HR REJECT leave_request_id=${leaveId} emp_id=${leaveReq.employee_id} leave_type=${leaveType.code} (${leaveType.name}) hr_reason=${reason ?? 'NULL'}`,
      })

      return Response.json({
        id: leaveId,
        status: 'REJECTED_HR' as LeaveRequestStatus,
        decision: 'REJECT',
        hr_reason: reason,
      })
    }

    const totalDaysNum = Number(leaveReq.total_days ?? 0)
    const deductBalanceFlag = leaveType.deduct_balance === 1

    let applyResult: { appliedCount: number; skippedNoAttendanceRowCount: number; warnings: string[] } | null = null

    await runReviewDbTransaction(async (conn: ReviewDbConnection) => {
      if (deductBalanceFlag) {
        const startDateStr = String(leaveReq.start_date ?? '')
        const fiscalYearMatch = startDateStr.match(/^(\d{4})/)
        const fiscalYear = fiscalYearMatch ? Number(fiscalYearMatch[1]) : new Date().getFullYear()

        const [balanceBefore] = await conn.query(
          `
            SELECT id, balance_initial, balance_used, (balance_initial - balance_used) AS balance_remaining
            FROM hr_leave_balances
            WHERE employee_id = ?
              AND leave_type_id = ?
              AND fiscal_year = ?
            LIMIT 1
          `,
          [leaveReq.employee_id, leaveReq.leave_type_id, fiscalYear],
        ) as unknown as [LeaveBalanceRow[], unknown]

        const remainingBefore = Number((balanceBefore[0] as LeaveBalanceRow | undefined)?.balance_remaining ?? 0)

        const balanceUpdateResult = await conn.query(
          `
            UPDATE hr_leave_balances
            SET balance_used = balance_used + ?,
                updated_at = NOW()
            WHERE employee_id = ?
              AND leave_type_id = ?
              AND fiscal_year = ?
              AND (balance_initial - balance_used) >= ?
            LIMIT 1
          `,
          [totalDaysNum, leaveReq.employee_id, leaveReq.leave_type_id, fiscalYear, totalDaysNum],
        )

        const balanceRowsAffected = Number((balanceUpdateResult as unknown as { affectedRows?: number }[])[0]?.affectedRows ?? 0)
        if (balanceRowsAffected === 0) {
          throw new Error(
            `Sisa cuti tidak cukup. Tersisa = ${remainingBefore} hari dibutuhkan ${totalDaysNum} hari. Silakan adjust quota HR atau kurangi durasi cuti.`,
          )
        }

        const flagUpdateResult = await conn.query(
          `
            UPDATE hr_leave_requests
            SET balance_applied = 1,
                status = 'APPROVED_HR',
                hr_reason = ?,
                updated_at = NOW()
            WHERE id = ?
            LIMIT 1
          `,
          [reason, leaveId],
        )

        if (Number((flagUpdateResult as unknown as { affectedRows?: number }[])[0]?.affectedRows ?? 0) === 0) {
          throw new Error('Gagal update status leave request ke APPROVED_HR.')
        }
      } else {
        const statusOnlyResult = await conn.query(
          `
            UPDATE hr_leave_requests
            SET status = 'APPROVED_HR',
                hr_reason = ?,
                updated_at = NOW()
            WHERE id = ?
            LIMIT 1
          `,
          [reason, leaveId],
        )

        if (Number((statusOnlyResult as unknown as { affectedRows?: number }[])[0]?.affectedRows ?? 0) === 0) {
          throw new Error('Gagal update status leave request ke APPROVED_HR (no deduct).')
        }
      }
    })

    try {
      applyResult = await applyApprovedLeaveToAttendance(leaveId, actorName)
    } catch (applyErr) {
      const applyWarn = applyErr instanceof Error ? applyErr.message : String(applyErr)
      applyResult = { appliedCount: 0, skippedNoAttendanceRowCount: 0, warnings: [`ATTENDANCE_APPLY_WARNING: ${applyWarn}`] }
    }

    await recordHrAudit({
      actionType: 'LEAVE_REQUEST_HR_APPROVE',
      actor: actorName,
      targetRef: `LEAVE_REQUEST-${leaveId}`,
      detail: JSON.stringify({
        leave_request_id: leaveId,
        employee_id: leaveReq.employee_id,
        leave_type: { id: leaveType.id, code: leaveType.code, name: leaveType.name },
        deduct_balance: deductBalanceFlag,
        total_days: totalDaysNum,
        start_date: leaveReq.start_date,
        end_date: leaveReq.end_date,
        hr_reason: reason,
        attendance_apply: {
          appliedCount: applyResult?.appliedCount ?? 0,
          skippedNoAttendanceRowCount: applyResult?.skippedNoAttendanceRowCount ?? 0,
          warnings: applyResult?.warnings ?? [],
        },
      }),
    })

    return Response.json({
      id: leaveId,
      status: 'APPROVED_HR' as LeaveRequestStatus,
      decision: 'APPROVE',
      hr_reason: reason,
      balance: {
        deduct_applied: deductBalanceFlag,
        total_days_deducted: deductBalanceFlag ? totalDaysNum : 0,
      },
      attendance_apply: {
        applied_count: applyResult?.appliedCount ?? 0,
        skipped_no_attendance_row: applyResult?.skippedNoAttendanceRowCount ?? 0,
        warnings: applyResult?.warnings ?? [],
      },
    })
  } catch (error) {
    const isBalanceError =
      error instanceof Error &&
      error.message.includes('Sisa cuti tidak cukup')

    if (isBalanceError) {
      return Response.json(
        { message: error instanceof Error ? error.message : String(error) },
        { status: 400 },
      )
    }

    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ message: `Gagal HR final leave: ${detail}` }, { status: 500 })
  }
}
