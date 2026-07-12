'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BillingDecisionHandoffPanel } from '@/components/billing-decision-handoff-panel'

type BillingInvoiceStatusFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  invoiceSuggestions: string[]
  followUpSuggestions: string[]
  reconnectSuggestions: string[]
  suspendBatchSuggestions: string[]
  reconnectBatchSuggestions: string[]
  initialInvoiceNo?: string
}

const nextStatusOptions = ['CANCELLED', 'SUSPENDED', 'OVERDUE'] as const

function parseFollowUpSuggestion(value: string) {
  const parts = value.split('|').map((item) => item.trim())
  return {
    invoiceNo: parts[0] ?? '',
    customerName: parts[1] ?? '',
    invoiceStatus: parts[2] ?? '-',
    total: parts[3] ?? 'Rp0',
    paid: parts[4] ?? 'Rp0',
    remaining: parts[5] ?? 'Rp0',
    invoiceDue: parts[6] ?? '-',
    followUp: parts[7] ?? '-',
    followUpState: parts[8] ?? 'UNSET',
    actionType: parts[9] ?? '-',
    collectionStatus: parts[10] ?? '-',
    suspendCandidate: parts[11] ?? 'Tidak',
    actionNotes: parts.slice(12).join(' | ') || '-',
  }
}

export function BillingInvoiceStatusForm({
  canUpdate,
  reviewDbReady,
  invoiceSuggestions,
  followUpSuggestions,
  reconnectSuggestions,
  suspendBatchSuggestions,
  reconnectBatchSuggestions,
  initialInvoiceNo,
}: BillingInvoiceStatusFormProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [invoiceNo, setInvoiceNo] = useState(initialInvoiceNo?.trim() || invoiceSuggestions[0] || '')
  const [nextStatus, setNextStatus] = useState<(typeof nextStatusOptions)[number]>('CANCELLED')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting
  const currentSuggestion = useMemo(
    () => {
      const normalizedInvoiceNo = invoiceNo.trim().toUpperCase()
      return (
        followUpSuggestions
          .map((item) => parseFollowUpSuggestion(item))
          .find((item) => item.invoiceNo.trim().toUpperCase() === normalizedInvoiceNo) ??
        reconnectSuggestions
          .map((item) => parseFollowUpSuggestion(item))
          .find((item) => item.invoiceNo.trim().toUpperCase() === normalizedInvoiceNo) ??
        null
      )
    },
    [followUpSuggestions, invoiceNo, reconnectSuggestions],
  )

  useEffect(() => {
    if (initialInvoiceNo?.trim()) {
      setMode('single')
      setInvoiceNo(initialInvoiceNo.trim())
    }
  }, [initialInvoiceNo])

  const helperText = useMemo(() => {
    if (!canUpdate) {
      return 'Role aktif belum memiliki izin update pada domain Billing.'
    }
    if (!reviewDbReady) {
      return 'Mode review database belum aktif, jadi update status invoice dinonaktifkan agar tidak menulis ke mock.'
    }
    if (mode === 'batch') {
      return nextStatus === 'SUSPENDED'
        ? 'Mode batch menandai seluruh invoice siap suspend dari antrean terkait sebagai SUSPENDED tanpa menghapus histori penagihan.'
        : 'Mode batch mengaktifkan kembali antrean reconnect dari invoice yang sedang SUSPENDED ke jalur OVERDUE.'
    }
    if (nextStatus === 'SUSPENDED') {
      return 'Mode ini menandai invoice belum lunas sebagai SUSPENDED dan mengangkat suspend candidate tanpa menghapus histori penagihan.'
    }
    if (nextStatus === 'OVERDUE') {
      return 'Mode ini mengaktifkan kembali invoice yang sedang SUSPENDED ke jalur overdue/reconnect agar billing bisa ditindaklanjuti lagi.'
    }
    return 'Mode ini membatalkan invoice yang belum memiliki pembayaran agar histori billing tetap aman dan tidak destruktif.'
  }, [canUpdate, mode, nextStatus, reviewDbReady])

  const titleText =
    nextStatus === 'SUSPENDED'
      ? 'Suspend invoice belum lunas'
      : nextStatus === 'OVERDUE'
        ? 'Aktifkan lagi invoice suspend'
        : 'Batalkan invoice yang belum terbayar'

  const notesLabel =
    nextStatus === 'SUSPENDED'
      ? 'Catatan Suspend'
      : nextStatus === 'OVERDUE'
        ? 'Catatan Reconnect'
        : 'Catatan Pembatalan'

  const notesPlaceholder =
    nextStatus === 'SUSPENDED'
      ? 'Alasan suspend, status lapangan, atau keputusan penagihan lanjutan.'
      : nextStatus === 'OVERDUE'
        ? 'Alasan reconnect, konfirmasi pembayaran parsial, atau hasil negosiasi terbaru.'
        : 'Alasan cancel, koreksi periode, duplikasi invoice, atau kebutuhan operator.'

  const submitLabel =
    nextStatus === 'SUSPENDED'
      ? mode === 'batch'
        ? 'Suspend Batch Invoice'
        : 'Suspend Invoice'
      : nextStatus === 'OVERDUE'
        ? mode === 'batch'
          ? 'Aktifkan Lagi Batch'
          : 'Aktifkan Lagi Invoice'
        : 'Batalkan Invoice'

  const batchSuggestions = nextStatus === 'SUSPENDED' ? suspendBatchSuggestions : reconnectBatchSuggestions
  const batchAllowed = nextStatus !== 'CANCELLED'

  const handoffCopy = useMemo(() => {
    if (nextStatus === 'SUSPENDED') {
      return {
        label: 'Suspend invoice harus langsung terbaca di Isolir dan SLA',
        detail:
          'Begitu invoice dipindahkan ke jalur suspend, Billing perlu memastikan queue Isolir membaca pelanggan sebagai kandidat follow-up aktif, sementara TT/SLA tetap dipantau bila masih ada gangguan teknis yang berjalan.',
      }
    }
    if (nextStatus === 'OVERDUE') {
      return {
        label: 'Reconnect ke overdue mengaktifkan jalur recovery lintas Billing dan Support',
        detail:
          'Saat invoice suspend diaktifkan lagi, fokus bergeser ke recovery: Billing memonitor follow-up baru, Isolir menilai restore, dan Supervisor memastikan kasus tidak salah dibaca sebagai terminate.',
      }
    }
    return {
      label: 'Cancel invoice tetap butuh validasi lintas divisi',
      detail:
        'Pembatalan invoice yang belum terbayar perlu dibaca ulang oleh Supervisor dan Support agar tidak ada ticket, isolir, atau queue terminate yang masih bergerak berdasarkan invoice yang sudah dibatalkan.',
    }
  }, [nextStatus])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/billing/invoices/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceNo: mode === 'single' ? invoiceNo : '',
          invoiceNos: mode === 'batch' ? batchSuggestions : [],
          nextStatus,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Pembatalan invoice gagal diproses.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Status invoice berhasil diperbarui.',
      })
      setInvoiceNo(invoiceSuggestions[0] ?? '')
      setMode('single')
      setNextStatus('CANCELLED')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Status Invoice</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        {titleText}
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">{helperText}</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Mode Update</span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value === 'batch' ? 'batch' : 'single')}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            <option value="single">Single invoice</option>
            <option value="batch" disabled={!batchAllowed}>
              Batch operasional
            </option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Aksi Status</span>
          <select
            value={nextStatus}
            onChange={(event) => {
              const value = event.target.value as (typeof nextStatusOptions)[number]
              setNextStatus(value)
              if (value === 'CANCELLED') {
                setMode('single')
              }
            }}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            <option value="CANCELLED">Cancel unpaid</option>
            <option value="SUSPENDED">Suspend unpaid</option>
            <option value="OVERDUE">Reconnect to overdue</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nomor Invoice</span>
          <input
            list="billing-status-invoice-suggestions"
            value={invoiceNo}
            onChange={(event) => setInvoiceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="INV-202607-0008"
            required={mode === 'single'}
            disabled={isDisabled || mode === 'batch'}
          />
          <datalist id="billing-status-invoice-suggestions">
            {invoiceSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          {mode === 'batch' ? (
            <span className="text-xs text-mute">
              Batch akan memakai {batchSuggestions.length} invoice dari antrean {nextStatus === 'SUSPENDED' ? 'siap suspend' : 'siap reconnect'}.
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">{notesLabel}</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder={notesPlaceholder}
            required
            disabled={isDisabled}
          />
        </label>

        {mode === 'single' && currentSuggestion ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div className="font-semibold text-slate-950">
              {currentSuggestion.customerName || '-'} • {currentSuggestion.invoiceNo || '-'}
            </div>
            <div className="mt-1">
              Invoice: {currentSuggestion.invoiceStatus || '-'} • Collection: {currentSuggestion.collectionStatus || '-'}
            </div>
            <div className="mt-1">
              Total {currentSuggestion.total || 'Rp0'} • Paid {currentSuggestion.paid || 'Rp0'} • Remaining {currentSuggestion.remaining || 'Rp0'}
            </div>
            <div className="mt-1">
              Due {currentSuggestion.invoiceDue || '-'} • Follow Up {currentSuggestion.followUp || '-'} •{' '}
              {currentSuggestion.followUpState || 'UNSET'}
            </div>
            <div className="mt-1">
              Action aktif: {currentSuggestion.actionType || '-'} • Suspend Candidate: {currentSuggestion.suspendCandidate || 'Tidak'}
            </div>
            <div className="mt-1">Catatan aktif: {currentSuggestion.actionNotes || '-'}</div>
          </div>
        ) : null}

        <BillingDecisionHandoffPanel
          decisionLabel={handoffCopy.label}
          detail={handoffCopy.detail}
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            {mode === 'batch'
              ? `Batch memakai antrean ${nextStatus === 'SUSPENDED' ? 'siap suspend' : 'siap reconnect'} yang sedang tampil pada halaman ini.`
              : 'Saran invoice diambil dari daftar invoice billing dan queue follow-up yang sedang tampil pada halaman ini.'}
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Status...' : submitLabel}
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
