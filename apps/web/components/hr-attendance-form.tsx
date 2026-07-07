'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type HrAttendanceFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  employeeSuggestions: string[]
}

const attendanceStatusOptions = ['PRESENT', 'SICK', 'PERMIT', 'ALPHA'] as const

function extractEmployeeCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function HrAttendanceForm({
  canCreate,
  reviewDbReady,
  employeeSuggestions,
}: HrAttendanceFormProps) {
  const router = useRouter()
  const [employeeValue, setEmployeeValue] = useState(employeeSuggestions[0] ?? '')
  const [attendanceDate, setAttendanceDate] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [status, setStatus] = useState<(typeof attendanceStatusOptions)[number]>('PRESENT')
  const [overtimeHours, setOvertimeHours] = useState('0')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

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
      const response = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeCode,
          attendanceDate: attendanceDate || null,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          status,
          overtimeHours,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Attendance HR gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Attendance HR berhasil disimpan.',
      })
      setAttendanceDate('')
      setCheckIn('')
      setCheckOut('')
      setStatus('PRESENT')
      setOvertimeHours('0')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action HR</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Catat attendance
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action attendance dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini mencatat attendance harian dari employee yang sudah ada agar kehadiran mulai langsung bisa direview di domain HR.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Employee</span>
          <input
            list="hr-attendance-employee-suggestions"
            value={employeeValue}
            onChange={(event) => setEmployeeValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="EMP-202607-0001 | Nama Karyawan"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-attendance-employee-suggestions">
            {employeeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tanggal Attendance</span>
          <input
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof attendanceStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {attendanceStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Check In</span>
          <input
            type="datetime-local"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Check Out</span>
          <input
            type="datetime-local"
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Overtime Hours</span>
          <input
            value={overtimeHours}
            onChange={(event) => setOvertimeHours(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="0 atau 1.5"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Attendance akan menolak duplikasi employee pada tanggal yang sama agar data harian tetap konsisten.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Attendance...' : 'Simpan Attendance'}
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
