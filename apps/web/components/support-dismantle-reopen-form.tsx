'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SupportFormContextNote } from '@/components/support-form-context-note'

type SupportDismantleReopenFormProps = {
  canProcess: boolean
  reviewDbReady: boolean
  historySuggestions: string[]
  initialHistoryValue?: string
}

function extractHistoryId(value: string) {
  const [rawId] = value.split('|')
  return rawId?.trim() ?? ''
}

export function SupportDismantleReopenForm({
  canProcess,
  reviewDbReady,
  historySuggestions,
  initialHistoryValue,
}: SupportDismantleReopenFormProps) {
  const router = useRouter()
  const [historyValue, setHistoryValue] = useState(
    initialHistoryValue?.trim() || historySuggestions[0] || '',
  )
  const [reopenNote, setReopenNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canProcess || !reviewDbReady || submitting

  useEffect(() => {
    if (initialHistoryValue?.trim()) {
      setHistoryValue(initialHistoryValue.trim())
    }
  }, [initialHistoryValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const historyId = extractHistoryId(historyValue)
    if (!historyId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih histori dismantle yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch(`/api/support/dismantle-history/${encodeURIComponent(historyId)}/reopen`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reopenNote,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Reopen dismantle gagal diproses di review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Reopen dismantle berhasil diproses.',
      })
      setHistoryValue(historySuggestions[0] ?? '')
      setReopenNote('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Form Action Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Buka kembali histori ke queue aktif
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canProcess
          ? 'Role aktif belum memiliki akses operasional untuk reopen dismantle pada lane ini.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi reopen dismantle dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini mengembalikan histori dismantle ke queue aktif bila kasus perlu dibuka kembali tanpa membuat isolir baru dari nol.'}
      </p>
      <SupportFormContextNote
        items={[
          {
            label: 'Tujuan',
            value: 'Membuka kembali kasus yang ternyata belum layak dianggap selesai permanen.',
          },
          {
            label: 'Sumber',
            value: 'Pilihan hanya berasal dari histori dismantle yang sudah pernah ditutup sebelumnya.',
          },
          {
            label: 'Hasil',
            value: 'Kasus kembali ke queue aktif untuk ditinjau ulang tanpa membuat record isolir baru dari awal.',
          },
        ]}
      />

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Histori Dismantle</span>
          <input
            list="support-dismantle-reopen-suggestions"
            value={historyValue}
            onChange={(event) => setHistoryValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="35 | Nama Customer | Radbox"
            required
            disabled={isDisabled}
          />
          <datalist id="support-dismantle-reopen-suggestions">
            {historySuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Catatan Reopen</span>
          <textarea
            value={reopenNote}
            onChange={(event) => setReopenNote(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alasan pembukaan ulang, koreksi terminasi, atau kebutuhan recovery lapangan"
            required
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Gunakan reopen bila histori ternyata masih perlu ditinjau ulang atau kasus harus kembali ke queue aktif.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Membuka Kembali...' : 'Reopen Dismantle'}
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
