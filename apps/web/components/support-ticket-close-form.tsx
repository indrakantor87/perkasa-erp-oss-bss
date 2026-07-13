'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SupportFormContextNote } from '@/components/support-form-context-note'

type SupportTicketCloseFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  ticketSuggestions: string[]
  initialTicketCode?: string
}

function parseTicketSuggestion(value: string) {
  const parts = value.split('|').map((item) => item.trim())
  return {
    ticketCode: parts[0] ?? '',
    customerName: parts[1] ?? '',
    status: parts[2] ?? '-',
    ticketType: parts[3] ?? '-',
    slaDays: parts[4] ?? '-',
    slaDueAt: parts[5] ?? '-',
    slaState: parts[6] ?? 'UNSET',
    ownerName: parts[7] ?? '-',
    followUpAt: parts[8] ?? '-',
    latestProgress: parts.slice(9).join(' | ') || '-',
  }
}

export function SupportTicketCloseForm({
  canUpdate,
  reviewDbReady,
  ticketSuggestions,
  initialTicketCode,
}: SupportTicketCloseFormProps) {
  const router = useRouter()
  const [ticketCode, setTicketCode] = useState(initialTicketCode?.trim() || parseTicketSuggestion(ticketSuggestions[0] ?? '').ticketCode)
  const [resolutionAction, setResolutionAction] = useState('')
  const [closeNotes, setCloseNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting
  const currentSuggestion =
    ticketSuggestions
      .map((item) => parseTicketSuggestion(item))
      .find((item) => item.ticketCode.trim().toUpperCase() === ticketCode.trim().toUpperCase()) ?? null
  const hasValidProgress =
    currentSuggestion != null &&
    currentSuggestion.latestProgress.trim() !== '-' &&
    ['ON_PROGRESS', 'FOLLOW_UP'].includes(currentSuggestion.status.trim().toUpperCase())

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
      setTicketCode(parseTicketSuggestion(ticketSuggestions[0] ?? '').ticketCode)
      setResolutionAction('')
      setCloseNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Form Action Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tutup trouble ticket review
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain Support.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi close flow support dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menutup trouble ticket yang sudah melewati fase progress aktif pada review DB, sehingga alur support tidak lagi lompat dari open langsung ke close.'}
      </p>
      <SupportFormContextNote
        items={[
          {
            label: 'Tujuan',
            value: 'Memfinalkan ticket yang benar-benar selesai agar queue tetap bersih dan terukur.',
          },
          {
            label: 'Sumber',
            value: 'Snapshot ticket menampilkan status, SLA, PIC, dan progress terakhir sebagai guard sebelum close.',
          },
          {
            label: 'Hasil',
            value: 'Ticket keluar dari antrian aktif dengan tindakan penyelesaian dan catatan penutupan yang terdokumentasi.',
          },
        ]}
      />

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
            {ticketSuggestions.map((item) => {
              const suggestion = parseTicketSuggestion(item)
              return <option key={item} value={suggestion.ticketCode} label={`${suggestion.ticketCode} - ${suggestion.customerName}`} />
            })}
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

        {currentSuggestion ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold text-slate-950">
              {currentSuggestion.customerName || '-'} • {currentSuggestion.ticketType || '-'}
            </div>
            <div className="mt-1">Status terakhir: {currentSuggestion.status || '-'}</div>
            <div className="mt-1">
              SLA: {currentSuggestion.slaDays || '-'} hari • Due {currentSuggestion.slaDueAt || '-'} • {currentSuggestion.slaState || 'UNSET'}
            </div>
            <div className="mt-1">PIC terakhir: {currentSuggestion.ownerName || '-'}</div>
            <div className="mt-1">Follow-up terakhir: {currentSuggestion.followUpAt || '-'}</div>
            <div className="mt-1">Ringkasan progress terakhir: {currentSuggestion.latestProgress || '-'}</div>
            <div className={`mt-2 font-medium ${hasValidProgress ? 'text-emerald-700' : 'text-amber-700'}`}>
              {hasValidProgress
                ? 'Ticket ini sudah punya progress aktif yang valid untuk dilanjutkan ke close.'
                : 'Ticket ini belum punya progress aktif yang valid. Simpan progress ticket terlebih dahulu sebelum close.'}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Saran ticket diambil dari daftar ticket open yang sedang tampil pada halaman ini, lengkap dengan snapshot progress terakhir agar penutupan tidak salah konteks.
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
