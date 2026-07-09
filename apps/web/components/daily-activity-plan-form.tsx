'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type DailyActivityOption = {
  value: string
  label: string
}

type DailyActivityPlanFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  defaultActivityDate: string
  defaultPlanningLevel: string
  lockOrgFields: boolean
  planningLevelOptions: DailyActivityOption[]
  divisionOptions: string[]
  subdivisionMap: Record<string, string[]>
  defaultDivision: string
  defaultSubdivision: string
}

const priorityOptions = [
  { value: 'HIGH', label: 'Tinggi' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'LOW', label: 'Rendah' },
] as const

export function DailyActivityPlanForm({
  canCreate,
  reviewDbReady,
  defaultActivityDate,
  defaultPlanningLevel,
  lockOrgFields,
  planningLevelOptions,
  divisionOptions,
  subdivisionMap,
  defaultDivision,
  defaultSubdivision,
}: DailyActivityPlanFormProps) {
  const router = useRouter()
  const [activityDate, setActivityDate] = useState(defaultActivityDate)
  const [planningLevel, setPlanningLevel] = useState(defaultPlanningLevel || planningLevelOptions[0]?.value || 'LEADER')
  const [divisionName, setDivisionName] = useState(defaultDivision)
  const [subdivisionName, setSubdivisionName] = useState(defaultSubdivision)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDetail, setTaskDetail] = useState('')
  const [successMetric, setSuccessMetric] = useState('')
  const [priorityLevel, setPriorityLevel] = useState<(typeof priorityOptions)[number]['value']>('HIGH')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const isOrgDisabled = isDisabled || lockOrgFields
  const subdivisionOptions = useMemo(() => subdivisionMap[divisionName] ?? [], [divisionName, subdivisionMap])

  useEffect(() => {
    if (subdivisionOptions.length === 0) {
      setSubdivisionName('')
      return
    }

    if (!subdivisionOptions.includes(subdivisionName)) {
      setSubdivisionName(subdivisionOptions[0] ?? '')
    }
  }, [subdivisionName, subdivisionOptions])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/daily-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityDate,
          planningLevel,
          divisionName,
          subdivisionName,
          taskTitle,
          taskDetail,
          successMetric,
          priorityLevel,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Plan daily activity gagal disimpan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Plan daily activity berhasil disimpan.',
      })
      setTaskTitle('')
      setTaskDetail('')
      setSuccessMetric('')
      setPriorityLevel('HIGH')
      setPlanningLevel(defaultPlanningLevel || planningLevelOptions[0]?.value || 'LEADER')
      setDivisionName(defaultDivision)
      setSubdivisionName(defaultSubdivision)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Plan Pagi</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Catat rencana aktivitas harian sejak pagi
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum diizinkan mengisi daily activity.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi pencatatan daily activity dinonaktifkan agar tidak menulis ke mock.'
            : 'Isi target kerja per aktivitas sejak pagi agar progres sore hari bisa ditutup dengan status yang jelas, terukur, dan transparan.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tanggal aktivitas</span>
          <input
            type="date"
            value={activityDate}
            onChange={(event) => setActivityDate(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Level plan</span>
          <select
            value={planningLevel}
            onChange={(event) => setPlanningLevel(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isOrgDisabled}
          >
            {planningLevelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Divisi</span>
          <select
            value={divisionName}
            onChange={(event) => setDivisionName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isOrgDisabled}
          >
            {divisionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Sub-divisi</span>
          <select
            value={subdivisionName}
            onChange={(event) => setSubdivisionName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isOrgDisabled}
          >
            {subdivisionOptions.length ? (
              subdivisionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))
            ) : (
              <option value="">Tanpa sub-divisi khusus</option>
            )}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Prioritas</span>
          <select
            value={priorityLevel}
            onChange={(event) =>
              setPriorityLevel(event.target.value as (typeof priorityOptions)[number]['value'])
            }
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {priorityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Judul aktivitas</span>
          <input
            value={taskTitle}
            onChange={(event) => setTaskTitle(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: Follow up ticket prioritas tinggi area Pati kota"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Detail plan aktivitas</span>
          <textarea
            value={taskDetail}
            onChange={(event) => setTaskDetail(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Jelaskan fokus kerja, area, customer, atau tiket yang akan dikerjakan hari ini."
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Target / indikator hasil</span>
          <textarea
            value={successMetric}
            onChange={(event) => setSuccessMetric(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: Ticket sudah ter-update, pelanggan mendapat follow up, atau pekerjaan lapangan selesai sesuai rencana."
            required
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Satu aktivitas dicatat sebagai satu plan per divisi, sub-divisi, dan level agar performa harian sampai bulanan bisa dihitung otomatis.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Plan...' : 'Simpan Plan Pagi'}
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
