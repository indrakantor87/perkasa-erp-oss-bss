'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type SupportIsolationRestoreFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  isolationSuggestions: string[]
  initialIsolationValue?: string
}

function extractIsolationId(value: string) {
  const [rawId] = value.split('|')
  return rawId?.trim() ?? ''
}

export function SupportIsolationRestoreForm({
  canUpdate,
  reviewDbReady,
  isolationSuggestions,
  initialIsolationValue,
}: SupportIsolationRestoreFormProps) {
  const router = useRouter()
  const [isolationValue, setIsolationValue] = useState(
    initialIsolationValue?.trim() || isolationSuggestions[0] || '',
  )
  const [closeNote, setCloseNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

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
      const response = await fetch(`/api/support/isolations/${encodeURIComponent(isolationId)}/restore`, {
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
          message: payload?.message || 'Restorasi isolir gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Restorasi isolir berhasil disimpan.',
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
      <p className="section-title">Restorasi Isolir</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tutup isolir aktif
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain Support.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi restorasi isolir dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menutup isolir aktif dengan mengisi tanggal restorasi dan catatan penutupan pada review DB.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Data Isolir Aktif</span>
          <input
            list="support-isolation-restore-suggestions"
            value={isolationValue}
            onChange={(event) => setIsolationValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="123 | Nama Customer | Radbox"
            required
            disabled={isDisabled}
          />
          <datalist id="support-isolation-restore-suggestions">
            {isolationSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Catatan Restorasi</span>
          <textarea
            value={closeNote}
            onChange={(event) => setCloseNote(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Konfirmasi pembayaran, aktivasi ulang, atau catatan operasional lainnya"
            required
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Gunakan daftar saran agar sistem mengambil ID isolir aktif yang benar.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Restorasi...' : 'Simpan Restorasi'}
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
