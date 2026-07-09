'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type SupportSlaFormProps = {
  canApprove: boolean
  reviewDbReady: boolean
  typeSuggestions: string[]
  initialTroubleType?: string
}

export function SupportSlaForm({
  canApprove,
  reviewDbReady,
  typeSuggestions,
  initialTroubleType,
}: SupportSlaFormProps) {
  const router = useRouter()
  const [troubleType, setTroubleType] = useState(
    initialTroubleType?.trim() || typeSuggestions[0] || 'KONEKSI',
  )
  const [durationDays, setDurationDays] = useState('1')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canApprove || !reviewDbReady || submitting

  useEffect(() => {
    if (initialTroubleType?.trim()) {
      setTroubleType(initialTroubleType.trim())
    }
  }, [initialTroubleType])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/support/trouble-ticket-sla', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          troubleType,
          durationDays,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'SLA support gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'SLA support berhasil disimpan.',
      })
      setDurationDays('1')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">SLA Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Kelola SLA trouble ticket
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canApprove
          ? 'Role aktif belum memiliki izin approve pada domain Support, sehingga pengaturan SLA dikunci.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi pengaturan SLA dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini membuat atau memperbarui SLA per tipe ticket pada tabel support_trouble_ticket_sla.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tipe Trouble Ticket</span>
          <input
            list="support-sla-type-suggestions"
            value={troubleType}
            onChange={(event) => setTroubleType(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="KONEKSI / LATENCY / MODEM / PREVENTIVE"
            required
            disabled={isDisabled}
          />
          <datalist id="support-sla-type-suggestions">
            {typeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Durasi SLA (Hari)</span>
          <input
            type="number"
            min={1}
            value={durationDays}
            onChange={(event) => setDurationDays(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            required
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Jika tipe sudah ada, durasi akan diperbarui. Jika belum ada, sistem membuat SLA baru.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan SLA...' : 'Simpan SLA'}
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
