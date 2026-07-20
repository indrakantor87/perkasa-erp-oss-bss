'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BillingDecisionHandoffPanel } from '@/components/billing-decision-handoff-panel'

type BillingCollectionActionFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  invoiceSuggestions: string[]
  batchInvoiceSuggestions: string[]
  followUpSuggestions: string[]
  promiseToPayBatchSuggestions: string[]
  suspendBatchSuggestions: string[]
  reconnectBatchSuggestions: string[]
  initialInvoiceNo?: string
}

const actionTypeOptions = ['REMINDER', 'CALL', 'VISIT', 'PROMISE_TO_PAY', 'SUSPEND', 'RECONNECT', 'WRITE_OFF'] as const
const actionStatusOptions = ['OPEN', 'DONE', 'CANCELLED'] as const
const openOnlyActionTypes = ['PROMISE_TO_PAY', 'SUSPEND', 'RECONNECT', 'WRITE_OFF'] as const
const openOnlyActionTypeSet = new Set<string>(openOnlyActionTypes)

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

function normalizeDateTimeLocalValue(value: string) {
  if (!value || value === '-') return ''

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export function BillingCollectionActionForm({
  canCreate,
  reviewDbReady,
  invoiceSuggestions,
  batchInvoiceSuggestions,
  followUpSuggestions,
  promiseToPayBatchSuggestions,
  suspendBatchSuggestions,
  reconnectBatchSuggestions,
  initialInvoiceNo,
}: BillingCollectionActionFormProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [invoiceNo, setInvoiceNo] = useState(initialInvoiceNo?.trim() || invoiceSuggestions[0] || '')
  const [actionType, setActionType] = useState<(typeof actionTypeOptions)[number]>('REMINDER')
  const [actionStatus, setActionStatus] = useState<(typeof actionStatusOptions)[number]>('OPEN')
  const [dueFollowUpAt, setDueFollowUpAt] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const currentSuggestion =
    followUpSuggestions
      .map((item) => parseFollowUpSuggestion(item))
      .find((item) => item.invoiceNo.trim().toUpperCase() === invoiceNo.trim().toUpperCase()) ?? null

  useEffect(() => {
    if (initialInvoiceNo?.trim()) {
      setMode('single')
      setInvoiceNo(initialInvoiceNo.trim())
    }
  }, [initialInvoiceNo])

  const helperText = useMemo(() => {
    if (!canCreate) {
      return 'Role aktif belum memiliki izin create pada domain Billing.'
    }
    if (!reviewDbReady) {
      return 'Mode review database belum aktif, jadi write action sengaja dinonaktifkan agar tidak menulis ke mock.'
    }
    if (openOnlyActionTypeSet.has(actionType)) {
      return mode === 'batch'
        ? `Mode batch membuka action ${actionType} massal dari antrean yang sesuai. Penyelesaian atau pembatalannya harus lewat resolve/status invoice agar jalur billing tetap konsisten.`
        : `Action ${actionType} hanya dibuat sebagai OPEN. Penyelesaian atau pembatalannya harus lewat resolve/status invoice agar lane billing tidak drift.`
    }
    return mode === 'batch'
      ? 'Mode batch menambah collection action massal dengan sumber antrean yang disesuaikan menurut jenis aksi, tanpa mengubah invoice secara destruktif.'
      : 'Form ini menambah histori collection action tanpa mengubah data inti invoice secara destruktif.'
  }, [actionType, canCreate, mode, reviewDbReady])

  const resolvedBatchSuggestions = useMemo(() => {
    if (actionType === 'PROMISE_TO_PAY') {
      return promiseToPayBatchSuggestions
    }
    if (actionType === 'SUSPEND') {
      return suspendBatchSuggestions
    }
    if (actionType === 'RECONNECT') {
      return reconnectBatchSuggestions
    }
    return batchInvoiceSuggestions
  }, [actionType, batchInvoiceSuggestions, promiseToPayBatchSuggestions, reconnectBatchSuggestions, suspendBatchSuggestions])

  const batchQueueLabel = useMemo(() => {
    if (actionType === 'PROMISE_TO_PAY') {
      return 'promise to pay'
    }
    if (actionType === 'SUSPEND') {
      return 'siap suspend'
    }
    if (actionType === 'RECONNECT') {
      return 'siap reconnect'
    }
    return 'tindak lanjut'
  }, [actionType])

  const handoffCopy = useMemo(() => {
    if (actionType === 'SUSPEND') {
      return {
        label: 'Keputusan suspend siap diteruskan ke Isolir dan SLA',
        detail:
          'Setelah action suspend dibuka, tim perlu menyelaraskan kasus pelanggan pada antrean isolir aktif, memantau ticket yang berisiko melewati SLA, dan menyiapkan supervisor jika kasus bergerak ke terminate.',
      }
    }
    if (actionType === 'RECONNECT') {
      return {
        label: 'Keputusan reconnect siap diteruskan ke recovery Billing dan Isolir',
        detail:
          'Action reconnect perlu disambungkan ke jalur restore agar support membaca pelanggan sebagai kandidat pemulihan layanan, bukan terminate.',
      }
    }
    if (actionType === 'PROMISE_TO_PAY') {
      return {
        label: 'Janji bayar menahan keputusan isolir atau terminate',
        detail:
          'Promise to pay menjaga kasus tetap pada jalur follow-up Billing. Antrean isolir, SLA, dan supervisor tetap perlu memonitor agar tidak salah didorong ke terminate terlalu cepat.',
      }
    }
    return {
      label: 'Collection follow-up tetap perlu sinkron lintas divisi',
      detail:
        'Reminder, call, atau visit yang dibuka di Billing sebaiknya selalu dibaca ulang terhadap kondisi Isolir, TT/SLA, dan kebutuhan eskalasi supervisor agar keputusan layanan tetap sinkron.',
    }
  }, [actionType])

  const allowedActionStatuses = useMemo(
    () => (openOnlyActionTypeSet.has(actionType) ? (['OPEN'] as (typeof actionStatusOptions)[number][]) : [...actionStatusOptions]),
    [actionType],
  )

  useEffect(() => {
    if (!currentSuggestion || mode !== 'single') {
      return
    }

    const matchedActionType = actionTypeOptions.find((item) => item === currentSuggestion.actionType)
    if (matchedActionType) {
      setActionType(matchedActionType)
    }
    if (!dueFollowUpAt) {
      setDueFollowUpAt(normalizeDateTimeLocalValue(currentSuggestion.followUp))
    }
  }, [currentSuggestion, dueFollowUpAt, mode])

  useEffect(() => {
    if (!allowedActionStatuses.includes(actionStatus)) {
      setActionStatus('OPEN')
    }
  }, [actionStatus, allowedActionStatuses])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/billing/collection-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceNo: mode === 'single' ? invoiceNo : '',
          invoiceNos: mode === 'batch' ? resolvedBatchSuggestions : [],
          actionType,
          actionStatus,
          dueFollowUpAt: dueFollowUpAt || null,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Collection action gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Collection action berhasil disimpan.',
      })
      setActionType('REMINDER')
      setActionStatus('OPEN')
      setDueFollowUpAt('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action Billing</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tambah collection action ke review DB
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">{helperText}</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Mode Action</span>
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value === 'batch' ? 'batch' : 'single')}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            <option value="single">Single invoice</option>
            <option value="batch">Batch tindak lanjut</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nomor Invoice</span>
          <input
            list="billing-invoice-suggestions"
            value={invoiceNo}
            onChange={(event) => setInvoiceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Masukkan invoice_no"
            required={mode === 'single'}
            disabled={isDisabled || mode === 'batch'}
          />
          <datalist id="billing-invoice-suggestions">
            {invoiceSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          {mode === 'batch' ? (
            <span className="text-xs text-mute">
              Batch akan memakai {resolvedBatchSuggestions.length} invoice dari antrean {batchQueueLabel} yang sedang tampil.
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Action Type</span>
          <select
            value={actionType}
            onChange={(event) => setActionType(event.target.value as (typeof actionTypeOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {actionTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Action Status</span>
          <select
            value={actionStatus}
            onChange={(event) => setActionStatus(event.target.value as (typeof actionStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {actionStatusOptions.map((item) => (
              <option key={item} value={item} disabled={!allowedActionStatuses.includes(item)}>
                {allowedActionStatuses.includes(item) ? item : `${item} (Gunakan Resolve)`}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Follow Up</span>
          <input
            type="datetime-local"
            value={dueFollowUpAt}
            onChange={(event) => setDueFollowUpAt(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan reminder, janji bayar, atau konteks tindakan..."
            disabled={isDisabled}
          />
        </label>

        {mode === 'single' && currentSuggestion ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 lg:col-span-2">
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
              Due {currentSuggestion.invoiceDue || '-'} • Follow Up {currentSuggestion.followUp || '-'} • {currentSuggestion.followUpState || 'UNSET'}
            </div>
            <div className="mt-1">
              Action terakhir: {currentSuggestion.actionType || '-'} • Suspend Candidate: {currentSuggestion.suspendCandidate || 'Tidak'}
            </div>
            <div className="mt-1">Catatan terakhir: {currentSuggestion.actionNotes || '-'}</div>
          </div>
        ) : null}

        <div className="lg:col-span-2">
          <BillingDecisionHandoffPanel
            decisionLabel={handoffCopy.label}
            detail={handoffCopy.detail}
          />
        </div>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            {(mode === 'batch' ? resolvedBatchSuggestions.length : invoiceSuggestions.length) > 0
              ? mode === 'batch'
                ? `Batch akan memproses seluruh invoice pada antrean ${batchQueueLabel} yang sedang tampil di halaman ini.`
                : `Saran invoice diambil dari antrean invoice tindak lanjut yang sedang tampil pada halaman ini.`
              : 'Belum ada saran invoice dari review antrean saat ini; Anda tetap bisa mengisi manual.'}
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : mode === 'batch' ? 'Simpan Batch Collection' : 'Simpan Collection Action'}
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
