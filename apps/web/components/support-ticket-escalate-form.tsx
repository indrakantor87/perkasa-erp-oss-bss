'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type SupportTicketEscalateFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  ticketSuggestions: string[]
  initialTicketCode?: string
}

const escalationLevelOptions = ['OVERDUE', 'DUE_TODAY', 'MANUAL'] as const

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
    latestProgress: parts[9] ?? '-',
    escalationTarget: parts[10] ?? '-',
    escalationLevel: parts[11] ?? '-',
    escalationAt: parts[12] ?? '-',
    escalationReason: parts.slice(13).join(' | ') || '-',
  }
}

function getDefaultEscalationLevel(value: string) {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'OVERDUE' || normalized === 'DUE_TODAY') {
    return normalized as (typeof escalationLevelOptions)[number]
  }
  return 'MANUAL'
}

export function SupportTicketEscalateForm({
  canUpdate,
  reviewDbReady,
  ticketSuggestions,
  initialTicketCode,
}: SupportTicketEscalateFormProps) {
  const router = useRouter()
  const [ticketCode, setTicketCode] = useState(initialTicketCode?.trim() || parseTicketSuggestion(ticketSuggestions[0] ?? '').ticketCode)
  const [escalationTarget, setEscalationTarget] = useState('')
  const [escalationLevel, setEscalationLevel] = useState<(typeof escalationLevelOptions)[number]>('MANUAL')
  const [escalationReason, setEscalationReason] = useState('')
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
  const allowedEscalationLevels = useMemo(() => {
    const slaState = (currentSuggestion?.slaState || '').trim().toUpperCase()
    if (slaState === 'OVERDUE') {
      return ['OVERDUE', 'MANUAL'] as (typeof escalationLevelOptions)[number][]
    }
    if (slaState === 'DUE_TODAY') {
      return ['DUE_TODAY', 'MANUAL'] as (typeof escalationLevelOptions)[number][]
    }
    return ['MANUAL'] as (typeof escalationLevelOptions)[number][]
  }, [currentSuggestion?.slaState])
  const helperText = useMemo(() => {
    if (!canUpdate) {
      return 'Role aktif belum memiliki izin update pada domain Support.'
    }
    if (!reviewDbReady) {
      return 'Mode review database belum aktif, jadi eskalasi trouble ticket dinonaktifkan agar tidak menulis ke mock.'
    }
    if (allowedEscalationLevels.includes('OVERDUE')) {
      return 'Ticket ini sudah melewati SLA, sehingga level OVERDUE atau MANUAL boleh dipakai untuk jalur eskalasi formal.'
    }
    if (allowedEscalationLevels.includes('DUE_TODAY')) {
      return 'Ticket ini jatuh tempo hari ini, sehingga level DUE_TODAY atau MANUAL boleh dipakai untuk eskalasi preventif.'
    }
    return 'Ticket ini belum due menurut SLA, jadi form hanya mengizinkan eskalasi MANUAL agar jalur overdue tidak dipakai sembarang.'
  }, [allowedEscalationLevels, canUpdate, reviewDbReady])
  const isSameEscalationPath =
    currentSuggestion != null &&
    escalationTarget.trim().toUpperCase() !== '' &&
    escalationTarget.trim().toUpperCase() === currentSuggestion.escalationTarget.trim().toUpperCase() &&
    escalationLevel === currentSuggestion.escalationLevel.trim().toUpperCase()
  const escalationContextHint = isSameEscalationPath
    ? 'Eskalasi ini memakai target dan level yang sama dengan eskalasi terakhir. Pastikan ada alasan baru atau progress baru sebelum submit ulang.'
    : 'Gunakan alasan yang spesifik agar jalur eskalasi formal mudah ditelusuri oleh SPV atau owner berikutnya.'

  useEffect(() => {
    if (initialTicketCode?.trim()) {
      setTicketCode(initialTicketCode.trim())
    }
  }, [initialTicketCode])

  useEffect(() => {
    if (!currentSuggestion) return

    setEscalationLevel(getDefaultEscalationLevel(currentSuggestion.slaState))
    setEscalationReason('')
  }, [currentSuggestion])

  useEffect(() => {
    if (!allowedEscalationLevels.includes(escalationLevel)) {
      setEscalationLevel(allowedEscalationLevels[0] ?? 'MANUAL')
    }
  }, [allowedEscalationLevels, escalationLevel])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const normalizedTicketCode = ticketCode.trim().toUpperCase()
      const response = await fetch(`/api/support/trouble-tickets/${encodeURIComponent(normalizedTicketCode)}/escalate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          escalationTarget,
          escalationLevel,
          escalationReason,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Eskalasi trouble ticket gagal disimpan di review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Eskalasi trouble ticket berhasil disimpan.',
      })
      setEscalationReason('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Escalation Flow Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Eskalasi trouble ticket overdue
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">{helperText}</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kode Ticket</span>
          <input
            list="support-ticket-escalation-suggestions"
            value={ticketCode}
            onChange={(event) => setTicketCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="TT-202607-0001"
            required
            disabled={isDisabled}
          />
          <datalist id="support-ticket-escalation-suggestions">
            {ticketSuggestions.map((item) => {
              const suggestion = parseTicketSuggestion(item)
              return <option key={item} value={suggestion.ticketCode} label={`${suggestion.ticketCode} - ${suggestion.customerName}`} />
            })}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tujuan Eskalasi</span>
          <input
            value={escalationTarget}
            onChange={(event) => setEscalationTarget(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="SPV SUPPORT / TIM LAPANGAN / NOC LEAD"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Level Eskalasi</span>
          <select
            value={escalationLevel}
            onChange={(event) => setEscalationLevel(event.target.value as (typeof escalationLevelOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {escalationLevelOptions.map((item) => (
              <option key={item} value={item} disabled={!allowedEscalationLevels.includes(item)}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Alasan Eskalasi</span>
          <textarea
            value={escalationReason}
            onChange={(event) => setEscalationReason(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: SLA sudah overdue, teknisi belum dapat slot kunjungan, perlu eskalasi ke SPV support untuk prioritas lapangan."
            required
            disabled={isDisabled}
          />
          <span className={`text-xs ${isSameEscalationPath ? 'text-amber-700' : 'text-mute'}`}>{escalationContextHint}</span>
        </label>

        {currentSuggestion ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 lg:col-span-2">
            <div className="font-semibold text-slate-950">
              {currentSuggestion.customerName || '-'} • {currentSuggestion.ticketType || '-'}
            </div>
            <div className="mt-1">Status: {currentSuggestion.status || '-'}</div>
            <div className="mt-1">
              SLA: {currentSuggestion.slaDays || '-'} hari • Due {currentSuggestion.slaDueAt || '-'} • {currentSuggestion.slaState || 'UNSET'}
            </div>
            <div className="mt-1">PIC terakhir: {currentSuggestion.ownerName || '-'}</div>
            <div className="mt-1">Follow-up terakhir: {currentSuggestion.followUpAt || '-'}</div>
            <div className="mt-1">Progress terakhir: {currentSuggestion.latestProgress || '-'}</div>
            <div className="mt-1">Eskalasi terakhir: {currentSuggestion.escalationTarget || '-'} • {currentSuggestion.escalationLevel || '-'}</div>
            <div className="mt-1">Waktu eskalasi terakhir: {currentSuggestion.escalationAt || '-'}</div>
            <div className="mt-1">Alasan terakhir: {currentSuggestion.escalationReason || '-'}</div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Ticket diambil dari queue TT aktif yang sudah membawa konteks SLA, progress, dan jejak eskalasi terakhir.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Eskalasi...' : 'Simpan Eskalasi Ticket'}
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
