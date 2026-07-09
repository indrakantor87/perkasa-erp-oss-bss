'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type HrAttendanceUpdateFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  attendanceSuggestions: string[]
}

const attendanceStatusOptions = ['PRESENT', 'SICK', 'PERMIT', 'ALPHA'] as const

function extractAttendanceId(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function parseAttendanceSuggestion(value: string) {
  const parts = value.split('|').map((item) => item.trim())
  return {
    status: parts[2] ?? '',
    checkIn: parts[4] && parts[4] !== '-' ? parts[4] : '',
    checkOut: parts[5] && parts[5] !== '-' ? parts[5] : '',
    overtimeHours: parts[6] && parts[6] !== '-' ? parts[6] : '0',
    lockByAdmin: parts[7] === '1',
  }
}

export function HrAttendanceUpdateForm({
  canUpdate,
  reviewDbReady,
  attendanceSuggestions,
}: HrAttendanceUpdateFormProps) {
  const router = useRouter()
  const [attendanceValue, setAttendanceValue] = useState(attendanceSuggestions[0] ?? '')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [status, setStatus] = useState<(typeof attendanceStatusOptions)[number]>('PRESENT')
  const [overtimeHours, setOvertimeHours] = useState('0')
  const [lockByAdmin, setLockByAdmin] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

  useEffect(() => {
    const parsed = parseAttendanceSuggestion(attendanceValue)
    if (attendanceStatusOptions.includes(parsed.status as (typeof attendanceStatusOptions)[number])) {
      setStatus(parsed.status as (typeof attendanceStatusOptions)[number])
    }
    setCheckIn(parsed.checkIn)
    setCheckOut(parsed.checkOut)
    setOvertimeHours(parsed.overtimeHours)
    setLockByAdmin(parsed.lockByAdmin)
  }, [attendanceValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const attendanceId = extractAttendanceId(attendanceValue)
    if (!attendanceId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih attendance yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/attendance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendanceId,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          status,
          overtimeHours,
          lockByAdmin,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Correction attendance HR gagal diproses.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Attendance HR berhasil diperbarui.',
      })
      setCheckIn('')
      setCheckOut('')
      setStatus('PRESENT')
      setOvertimeHours('0')
      setLockByAdmin(false)
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Correction Attendance</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Koreksi attendance harian
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi correction attendance dinonaktifkan agar tidak menulis ke mock.'
            : 'Gunakan form ini untuk koreksi attendance yang sudah tercatat, termasuk perubahan jam masuk/keluar, status, overtime, dan lock admin dengan jejak audit actor.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Attendance HR</span>
          <input
            list="hr-attendance-update-suggestions"
            value={attendanceValue}
            onChange={(event) => setAttendanceValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="15 | Nama Karyawan | PRESENT | 2026-07-09 | 2026-07-09T08:00 | - | 0.00 | 0"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-attendance-update-suggestions">
            {attendanceSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
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
          <span className="font-semibold text-slate-950">Overtime Hours</span>
          <input
            value={overtimeHours}
            onChange={(event) => setOvertimeHours(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="0 atau 1.5"
            disabled={isDisabled}
          />
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

        <label className="flex items-center gap-3 text-sm font-semibold text-slate-950 lg:col-span-2">
          <input
            type="checkbox"
            checked={lockByAdmin}
            onChange={(event) => setLockByAdmin(event.target.checked)}
            disabled={isDisabled}
          />
          Tandai lock by admin
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan koreksi</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: koreksi jam masuk, revisi status sakit, atau penyesuaian overtime."
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Saat attendance dipilih, status, jam, overtime, dan lock admin akan terprefill dari review HR agar koreksi lebih aman.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Koreksi...' : 'Simpan Koreksi Attendance'}
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
