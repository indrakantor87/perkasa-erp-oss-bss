'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type SupportTicketProgressFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  ticketSuggestions: string[]
  initialTicketCode?: string
}

const statusOptions = ['OPEN', 'ON_PROGRESS', 'FOLLOW_UP'] as const

function parseTicketSuggestion(value: string) {
  const parts = value.split('|').map((item) => item.trim())
  return {
    ticketCode: parts[0] ?? '',
    customerName: parts[1] ?? '',
    status: parts[2] ?? 'OPEN',
    ticketType: parts[3] ?? '-',
    slaDays: parts[4] ?? '-',
    slaDueAt: parts[5] ?? '-',
    slaState: parts[6] ?? 'UNSET',
    ownerName: parts[7] ?? '-',
    followUpAt: parts[8] ?? '',
    latestProgress: parts.slice(9).join(' | ') || '-',
  }
}

function normalizeDateTimeLocalValue(value: string) {
  if (!value || value === '-') return ''

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function SupportTicketProgressForm({
  canUpdate,
  reviewDbReady,
  ticketSuggestions,
  initialTicketCode,
}: SupportTicketProgressFormProps) {
  const router = useRouter()
  const [ticketCode, setTicketCode] = useState(initialTicketCode?.trim() || parseTicketSuggestion(ticketSuggestions[0] ?? '').ticketCode)
  const [progressStatus, setProgressStatus] = useState<(typeof statusOptions)[number]>('ON_PROGRESS')
  const [ownerName, setOwnerName] = useState('')
  const [followUpAt, setFollowUpAt] = useState('')
  const [progressNotes, setProgressNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

  const currentSuggestion = useMemo(() => {
    const normalizedTicketCode = ticketCode.trim().toUpperCase()
    return (
      ticketSuggestions
        .map((item) => parseTicketSuggestion(item))
        .find((item) => item.ticketCode.trim().toUpperCase() === normalizedTicketCode) ?? null
    )
  }, [ticketCode, ticketSuggestions])

  useEffect(() => {
    if (initialTicketCode?.trim()) {
      setTicketCode(initialTicketCode.trim())
    }
  }, [initialTicketCode])

  useEffect(() => {
    if (!currentSuggestion) {
      return
    }

    const normalizedStatus = currentSuggestion.status.trim().toUpperCase()
    setProgressStatus(
      statusOptions.includes(normalizedStatus as (typeof statusOptions)[number])
        ? (normalizedStatus as (typeof statusOptions)[number])
        : 'ON_PROGRESS',
    )
    setOwnerName(currentSuggestion.ownerName !== '-' ? currentSuggestion.ownerName : '')
    setFollowUpAt(normalizeDateTimeLocalValue(currentSuggestion.followUpAt))
    setProgressNotes('')
  }, [currentSuggestion])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const normalizedTicketCode = ticketCode.trim().toUpperCase()
      const response = await fetch(`/api/support/trouble-tickets/${encodeURIComponent(normalizedTicketCode)}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          progressStatus,
          ownerName,
          followUpAt,
          progressNotes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Progress trouble ticket gagal diperbarui di review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Progress trouble ticket berhasil diperbarui.',
      })
      setProgressNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Progress Flow Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Update progress trouble ticket
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain Support.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi progress trouble ticket dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini mencatat progress non-destruktif per ticket, termasuk PIC, status kerja terbaru, dan jadwal follow-up berikutnya.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kode Ticket</span>
          <input
            list="support-ticket-progress-suggestions"
            value={ticketCode}
            onChange={(event) => setTicketCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="TT-202607-0001"
            required
            disabled={isDisabled}
          />
          <datalist id="support-ticket-progress-suggestions">
            {ticketSuggestions.map((item) => {
              const suggestion = parseTicketSuggestion(item)
              return <option key={item} value={suggestion.ticketCode} label={`${suggestion.ticketCode} - ${suggestion.customerName}`} />
            })}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status Progress</span>
          <select
            value={progressStatus}
            onChange={(event) => setProgressStatus(event.target.value as (typeof statusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">PIC / Owner</span>
          <input
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="NOC 1 / Teknisi Arif / SPV Support"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Follow-up Berikutnya</span>
          <input
            type="datetime-local"
            value={followUpAt}
            onChange={(event) => setFollowUpAt(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan Progress Baru</span>
          <textarea
            value={progressNotes}
            onChange={(event) => setProgressNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: teknisi sudah dihubungi, jalur dropcore dicek, menunggu akses rumah pelanggan pukul 16:00."
            required
            disabled={isDisabled}
          />
        </label>

        {currentSuggestion ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 lg:col-span-2">
            <div className="font-semibold text-slate-950">
              {currentSuggestion.customerName || '-'} • {currentSuggestion.ticketType || '-'}
            </div>
            <div className="mt-1">Status sekarang: {currentSuggestion.status || '-'}</div>
            <div className="mt-1">
              SLA: {currentSuggestion.slaDays || '-'} hari • Due {currentSuggestion.slaDueAt || '-'} • {currentSuggestion.slaState || 'UNSET'}
            </div>
            <div className="mt-1">PIC terakhir: {currentSuggestion.ownerName || '-'}</div>
            <div className="mt-1">Follow-up terakhir: {currentSuggestion.followUpAt || '-'}</div>
            <div className="mt-1">Ringkasan progress terakhir: {currentSuggestion.latestProgress || '-'}</div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Saran ticket diambil dari queue trouble ticket yang sedang tampil, lengkap dengan snapshot PIC dan follow-up terakhir.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Progress...' : 'Simpan Progress Ticket'}
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
