'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type HrEmployeeArchiveFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  employeeSuggestions: string[]
  initialEmployeeValue?: string
}

function extractEmployeeId(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function HrEmployeeArchiveForm({
  canUpdate,
  reviewDbReady,
  employeeSuggestions,
  initialEmployeeValue,
}: HrEmployeeArchiveFormProps) {
  const router = useRouter()
  const [employeeValue, setEmployeeValue] = useState(initialEmployeeValue?.trim() || employeeSuggestions[0] || '')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

  useEffect(() => {
    if (initialEmployeeValue?.trim()) {
      setEmployeeValue(initialEmployeeValue.trim())
    }
  }, [initialEmployeeValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const employeeId = extractEmployeeId(employeeValue)
    if (!employeeId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih employee HR yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/employees/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId,
          reason,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Archive employee HR gagal diproses.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Employee HR berhasil diarsipkan.',
      })
      setReason('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Archive Employee</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Arsipkan employee non-destruktif
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi archive employee dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini mengarsipkan employee dengan mengubah status ke ARCHIVED tanpa menghapus histori attendance, loan, payroll, atau relasi lain yang sudah ada.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Employee HR</span>
          <input
            list="hr-employee-archive-suggestions"
            value={employeeValue}
            onChange={(event) => setEmployeeValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="21 | EMP-202607-0001 | Nama Karyawan | KARYAWAN"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-employee-archive-suggestions">
            {employeeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Alasan archive</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: resign, mutasi ke sistem lain, atau non-aktif permanen."
            required
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Employee yang diarsipkan akan tetap muncul di review HR dengan status `ARCHIVED`.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Memproses Archive...' : 'Arsipkan Employee'}
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
