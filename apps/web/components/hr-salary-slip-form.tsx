'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type HrSalarySlipFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  employeeSuggestions: string[]
  initialEmployeeValue?: string
}

function extractEmployeeCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function HrSalarySlipForm({
  canCreate,
  reviewDbReady,
  employeeSuggestions,
  initialEmployeeValue,
}: HrSalarySlipFormProps) {
  const router = useRouter()
  const now = new Date()
  const [employeeValue, setEmployeeValue] = useState(initialEmployeeValue?.trim() || employeeSuggestions[0] || '')
  const [payrollMonth, setPayrollMonth] = useState(String(now.getMonth() + 1))
  const [payrollYear, setPayrollYear] = useState(String(now.getFullYear()))
  const [baseSalary, setBaseSalary] = useState('')
  const [attendanceAllowance, setAttendanceAllowance] = useState('')
  const [overtimeAmount, setOvertimeAmount] = useState('')
  const [performanceBonus, setPerformanceBonus] = useState('')
  const [positionAllowance, setPositionAllowance] = useState('')
  const [loanDeduction, setLoanDeduction] = useState('')
  const [releasedAt, setReleasedAt] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  useEffect(() => {
    if (initialEmployeeValue?.trim()) {
      setEmployeeValue(initialEmployeeValue.trim())
    }
  }, [initialEmployeeValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const employeeCode = extractEmployeeCode(employeeValue)
    if (!employeeCode) {
      setFeedback({
        tone: 'error',
        message: 'Pilih employee yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/salary-slips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeCode,
          payrollMonth,
          payrollYear,
          baseSalary,
          attendanceAllowance,
          overtimeAmount,
          performanceBonus,
          positionAllowance,
          loanDeduction,
          releasedAt: releasedAt || null,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Slip gaji gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Slip gaji berhasil disimpan.',
      })
      setBaseSalary('')
      setAttendanceAllowance('')
      setOvertimeAmount('')
      setPerformanceBonus('')
      setPositionAllowance('')
      setLoanDeduction('')
      setReleasedAt('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action HR</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Buat slip gaji
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action payroll dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini membuat slip gaji bulanan dari employee yang valid dengan komponen pemasukan dan potongan yang bisa Anda sesuaikan langsung dari web.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Employee</span>
          <input
            list="hr-payroll-employee-suggestions"
            value={employeeValue}
            onChange={(event) => setEmployeeValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="EMP-202607-0001 | Nama Karyawan"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-payroll-employee-suggestions">
            {employeeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Bulan Payroll</span>
          <input
            type="number"
            min="1"
            max="12"
            value={payrollMonth}
            onChange={(event) => setPayrollMonth(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tahun Payroll</span>
          <input
            type="number"
            min="2020"
            max="2100"
            value={payrollYear}
            onChange={(event) => setPayrollYear(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Gaji Pokok</span>
          <input
            value={baseSalary}
            onChange={(event) => setBaseSalary(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Kosongkan untuk pakai default employee"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tunjangan Kehadiran</span>
          <input
            value={attendanceAllowance}
            onChange={(event) => setAttendanceAllowance(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="0"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Uang Lembur</span>
          <input
            value={overtimeAmount}
            onChange={(event) => setOvertimeAmount(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="0"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Bonus Performa</span>
          <input
            value={performanceBonus}
            onChange={(event) => setPerformanceBonus(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="0"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tunjangan Jabatan</span>
          <input
            value={positionAllowance}
            onChange={(event) => setPositionAllowance(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="0"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Potongan Loan</span>
          <input
            value={loanDeduction}
            onChange={(event) => setLoanDeduction(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Kosongkan untuk auto dari loan aktif"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Released At</span>
          <input
            type="datetime-local"
            value={releasedAt}
            onChange={(event) => setReleasedAt(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Slip gaji akan menolak duplikasi employee pada periode bulan dan tahun yang sama.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Slip Gaji...' : 'Simpan Slip Gaji'}
          </button>
        </div>
      </form>

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </section>
  )
}
