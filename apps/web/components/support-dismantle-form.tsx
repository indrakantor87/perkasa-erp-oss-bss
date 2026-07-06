'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type SupportDismantleFormProps = {
  canApprove: boolean
  reviewDbReady: boolean
  isolationSuggestions: string[]
}

function extractIsolationId(value: string) {
  const matched = value.trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function SupportDismantleForm({
  canApprove,
  reviewDbReady,
  isolationSuggestions,
}: SupportDismantleFormProps) {
  const router = useRouter()
  const [isolationValue, setIsolationValue] = useState(isolationSuggestions[0] ?? '')
  const [closeNote, setCloseNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canApprove || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const isolationId = extractIsolationId(isolationValue)
    if (!isolationId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih data isolir aktif yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch(`/api/support/isolations/${encodeURIComponent(isolationId)}/dismantle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          closeNote,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Dismantle gagal diproses di review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Dismantle berhasil diproses.',
      })
      setIsolationValue(isolationSuggestions[0] ?? '')
      setCloseNote('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Dismantle Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Pindahkan ke histori dismantle
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canApprove
          ? 'Role aktif belum memiliki izin approve pada domain Support, sehingga flow dismantle dikunci.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi flow dismantle dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menyimpan snapshot pelanggan ke histori dismantle lalu mengarsipkan sumber isolir agar jejak operasional tetap aman.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Data Isolir Aktif</span>
          <input
            list="support-dismantle-suggestions"
            value={isolationValue}
            onChange={(event) => setIsolationValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="123 | Nama Customer | Radbox"
            required
            disabled={isDisabled}
          />
          <datalist id="support-dismantle-suggestions">
            {isolationSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Catatan Dismantle</span>
          <textarea
            value={closeNote}
            onChange={(event) => setCloseNote(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alasan terminasi, pelepasan perangkat, atau catatan lapangan"
            required
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Data sumber akan diarsipkan setelah berhasil dipindahkan ke histori dismantle.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Memproses Dismantle...' : 'Simpan Dismantle'}
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
