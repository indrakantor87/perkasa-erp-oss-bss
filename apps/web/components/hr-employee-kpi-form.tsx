'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type HrEmployeeKpiFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  employeeSuggestions: string[]
  initialEmployeeValue?: string
}

function extractEmployeeCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function HrEmployeeKpiForm({
  canUpdate,
  reviewDbReady,
  employeeSuggestions,
  initialEmployeeValue,
}: HrEmployeeKpiFormProps) {
  const router = useRouter()
  const now = new Date()
  const [employeeValue, setEmployeeValue] = useState(initialEmployeeValue?.trim() || employeeSuggestions[0] || '')
  const [kpiMonth, setKpiMonth] = useState(String(now.getMonth() + 1))
  const [kpiYear, setKpiYear] = useState(String(now.getFullYear()))
  const [score, setScore] = useState('')
  const [performanceBonus, setPerformanceBonus] = useState('')
  const [notes, setNotes] = useState('')
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

    const employeeCode = extractEmployeeCode(employeeValue)
    if (!employeeCode) {
      setFeedback({ tone: 'error', message: 'Pilih employee yang valid dari daftar saran.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/employee-kpis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeCode,
          kpiMonth,
          kpiYear,
          score,
          performanceBonus,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'KPI employee gagal disimpan ke review DB.' })
        return
      }

      setFeedback({ tone: 'success', message: payload?.message || 'KPI employee berhasil disimpan.' })
      setScore('')
      setPerformanceBonus('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action HR</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Input KPI manual
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi input KPI dinonaktifkan agar tidak menulis ke mock.'
            : 'Masukkan skor KPI dan bonus performa per employee untuk periode bulanan. Nilai bonus performa akan dipakai sebagai default saat membuat slip gaji bila kolom bonus dibiarkan kosong.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Employee</span>
          <input
            list="hr-kpi-employee-suggestions"
            value={employeeValue}
            onChange={(event) => setEmployeeValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="EMP-202607-0001 | Nama Karyawan"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-kpi-employee-suggestions">
            {employeeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Bulan KPI</span>
          <input
            type="number"
            min="1"
            max="12"
            value={kpiMonth}
            onChange={(event) => setKpiMonth(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tahun KPI</span>
          <input
            type="number"
            min="2020"
            max="2100"
            value={kpiYear}
            onChange={(event) => setKpiYear(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Skor KPI (0 - 100)</span>
          <input
            value={score}
            onChange={(event) => setScore(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="0"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Bonus Performa (Rp)</span>
          <input
            value={performanceBonus}
            onChange={(event) => setPerformanceBonus(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="0"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-[96px] rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="KPI manual, catatan performa, atau kesepakatan bonus."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">KPI disimpan per employee dan per periode (bulan/tahun).</div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan KPI...' : 'Simpan KPI'}
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

