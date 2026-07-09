'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type SupportTicketCloseFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  ticketSuggestions: string[]
  initialTicketCode?: string
}

export function SupportTicketCloseForm({
  canUpdate,
  reviewDbReady,
  ticketSuggestions,
  initialTicketCode,
}: SupportTicketCloseFormProps) {
  const router = useRouter()
  const [ticketCode, setTicketCode] = useState(initialTicketCode?.trim() || ticketSuggestions[0] || '')
  const [resolutionAction, setResolutionAction] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

  useEffect(() => {
    if (initialTicketCode?.trim()) {
      setTicketCode(initialTicketCode.trim())
    }
  }, [initialTicketCode])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const normalizedTicketCode = ticketCode.trim().toUpperCase()
      const response = await fetch(`/api/support/trouble-tickets/${encodeURIComponent(normalizedTicketCode)}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          resolutionAction,
          closeNotes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Trouble ticket gagal ditutup di review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Trouble ticket berhasil ditutup.',
      })
      setTicketCode(ticketSuggestions[0] ?? '')
      setResolutionAction('')
      setCloseNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Close Flow Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tutup trouble ticket review
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain Support.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi close flow support dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menutup trouble ticket yang masih open pada review DB agar alur open sampai close mulai bisa diuji langsung dari web.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kode Ticket</span>
          <input
            list="support-ticket-suggestions"
            value={ticketCode}
            onChange={(event) => setTicketCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="TT-202607-0001"
            required
            disabled={isDisabled}
          />
          <datalist id="support-ticket-suggestions">
            {ticketSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tindakan Penyelesaian</span>
          <input
            value={resolutionAction}
            onChange={(event) => setResolutionAction(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="RESET ONU / GANTI ADAPTOR / NORMALISASI JALUR"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Catatan Penutupan</span>
          <textarea
            value={closeNotes}
            onChange={(event) => setCloseNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Ringkasan hasil penanganan, konfirmasi customer, atau catatan teknisi"
            required
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Saran kode ticket diambil dari daftar ticket open yang sedang tampil pada halaman ini.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menutup Ticket...' : 'Tutup Trouble Ticket'}
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
