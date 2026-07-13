'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SupportFormContextNote } from '@/components/support-form-context-note'

type SupportDismantleFormProps = {
  canProcess: boolean
  reviewDbReady: boolean
  isolationSuggestions: string[]
  initialIsolationValue?: string
}

function extractIsolationId(value: string) {
  const [rawId] = value.split('|')
  return rawId?.trim() ?? ''
}

export function SupportDismantleForm({
  canProcess,
  reviewDbReady,
  isolationSuggestions,
  initialIsolationValue,
}: SupportDismantleFormProps) {
  const router = useRouter()
  const [isolationValue, setIsolationValue] = useState(
    initialIsolationValue?.trim() || isolationSuggestions[0] || '',
  )
  const [transferNote, setTransferNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canProcess || !reviewDbReady || submitting

  useEffect(() => {
    if (initialIsolationValue?.trim()) {
      setIsolationValue(initialIsolationValue.trim())
    }
  }, [initialIsolationValue])

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
          transferNote,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Transfer ke queue dismantle gagal diproses di review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Transfer ke queue dismantle berhasil diproses.',
      })
      setIsolationValue(isolationSuggestions[0] ?? '')
      setTransferNote('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Form Action Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Transfer ke queue dismantle
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canProcess
          ? 'Role aktif belum memiliki akses operasional untuk memproses dismantle pada lane ini.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi flow dismantle dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini memindahkan isolir aktif ke queue dismantle terlebih dahulu, sehingga terminasi final dan histori close diproses pada tahap berikutnya.'}
      </p>
      <SupportFormContextNote
        items={[
          {
            label: 'Tujuan',
            value: 'Mendorong kasus yang sudah tidak layak restore ke antrean terminate yang lebih formal.',
          },
          {
            label: 'Sumber',
            value: 'Sumber kasus berasal dari isolir aktif, bukan dari histori close atau data buatan baru.',
          },
          {
            label: 'Hasil',
            value: 'Kasus siap ditangani di queue dismantle untuk close lapangan atau reopen bila keputusan berubah.',
          },
        ]}
      />

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
          <span className="font-semibold text-slate-950">Catatan Transfer</span>
          <textarea
            value={transferNote}
            onChange={(event) => setTransferNote(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alasan terminasi, status perangkat, atau konteks kenapa kasus dipindahkan ke queue dismantle"
            required
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Data sumber belum diarsipkan pada tahap ini. Final close dilakukan dari queue dismantle aktif.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Memindahkan Queue...' : 'Transfer Ke Dismantle'}
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
