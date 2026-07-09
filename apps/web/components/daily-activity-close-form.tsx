'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type DailyActivityCloseFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  activitySuggestions: string[]
}

const closeStatusOptions = [
  { value: 'DONE', label: 'Selesai' },
  { value: 'PENDING', label: 'Pending' },
] as const

function extractActivityId(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function DailyActivityCloseForm({
  canUpdate,
  reviewDbReady,
  activitySuggestions,
}: DailyActivityCloseFormProps) {
  const router = useRouter()
  const [activityValue, setActivityValue] = useState(activitySuggestions[0] ?? '')
  const [executionStatus, setExecutionStatus] = useState<(typeof closeStatusOptions)[number]['value']>('DONE')
  const [closeNotes, setCloseNotes] = useState('')
  const [pendingReason, setPendingReason] = useState('')
  const [followUpAction, setFollowUpAction] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const hasSuggestion = activitySuggestions.length > 0
  const isDisabled = !canUpdate || !reviewDbReady || !hasSuggestion || submitting
  const helperText = useMemo(() => {
    if (!canUpdate) {
      return 'Role aktif belum diizinkan melakukan closing daily activity.'
    }
    if (!reviewDbReady) {
      return 'Mode review database belum aktif, jadi closing daily activity dinonaktifkan.'
    }
    if (!hasSuggestion) {
      return 'Belum ada aktivitas milik Anda yang masih berstatus plan untuk di-close hari ini.'
    }
    return 'Pilih aktivitas yang masih open, lalu tutup sebagai selesai atau pending dengan alasan dan aksi lanjut yang jelas.'
  }, [canUpdate, hasSuggestion, reviewDbReady])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const activityId = extractActivityId(activityValue)
    if (!activityId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih aktivitas yang valid dari daftar plan hari ini.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/daily-activities/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityId,
          executionStatus,
          closeNotes,
          pendingReason,
          followUpAction,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Closing daily activity gagal disimpan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Closing daily activity berhasil disimpan.',
      })
      setActivityValue('')
      setExecutionStatus('DONE')
      setCloseNotes('')
      setPendingReason('')
      setFollowUpAction('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Closing Sore</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tutup aktivitas harian dengan status yang transparan
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">{helperText}</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Aktivitas yang akan di-close</span>
          <input
            list="daily-activity-close-suggestions"
            value={activityValue}
            onChange={(event) => setActivityValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="1 | DA-202607-0001 | Follow up ticket prioritas"
            required
            disabled={isDisabled}
          />
          <datalist id="daily-activity-close-suggestions">
            {activitySuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status closing</span>
          <select
            value={executionStatus}
            onChange={(event) =>
              setExecutionStatus(event.target.value as (typeof closeStatusOptions)[number]['value'])
            }
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {closeStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-dashed border-line bg-slate-50 px-4 py-3 text-sm leading-6 text-mute">
          Status `Selesai` dipakai jika plan benar-benar berjalan. Status `Pending` dipakai jika target belum tercapai dan harus disertai alasan serta langkah lanjut.
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Hasil realisasi / catatan closing</span>
          <textarea
            value={closeNotes}
            onChange={(event) => setCloseNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Jelaskan hasil aktual hari ini, misalnya ticket ter-update, kunjungan selesai, atau kendala yang ditemukan."
            disabled={isDisabled}
          />
        </label>

        {executionStatus === 'PENDING' ? (
          <>
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Alasan pending</span>
              <textarea
                value={pendingReason}
                onChange={(event) => setPendingReason(event.target.value)}
                className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="Contoh: customer tidak ada di lokasi, material belum siap, atau data belum lengkap."
                disabled={isDisabled}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Aksi lanjut supaya tercapai</span>
              <textarea
                value={followUpAction}
                onChange={(event) => setFollowUpAction(event.target.value)}
                className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="Contoh: jadwalkan ulang, follow up customer, siapkan material, atau koordinasi lintas tim."
                disabled={isDisabled}
              />
            </label>
          </>
        ) : null}

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Closing dilakukan per aktivitas agar histori harian tidak tercampur dan progres benar-benar bisa diukur.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Closing...' : 'Simpan Closing Sore'}
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
