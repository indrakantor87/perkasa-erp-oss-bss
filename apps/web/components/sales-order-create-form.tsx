'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { extractLeadTypeFromSuggestion, getOrderStatusOptions } from '@/lib/sales-workflow'

type SalesOrderCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  leadSuggestions: string[]
  marketingSuggestions: string[]
  initialLeadValue?: string
}

const orderTypeOptions = ['NEW_INSTALL', 'UPGRADE', 'DOWNGRADE', 'RELOCATION', 'TERMINATION'] as const

function extractLeadId(value: string) {
  const matched = value.trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function SalesOrderCreateForm({
  canCreate,
  reviewDbReady,
  leadSuggestions,
  marketingSuggestions,
  initialLeadValue,
}: SalesOrderCreateFormProps) {
  const router = useRouter()
  const [leadValue, setLeadValue] = useState(initialLeadValue?.trim() || leadSuggestions[0] || '')
  const [orderType, setOrderType] = useState<(typeof orderTypeOptions)[number]>('NEW_INSTALL')
  const [status, setStatus] = useState('REGISTERED')
  const [scheduledInstallationAt, setScheduledInstallationAt] = useState('')
  const [marketingName, setMarketingName] = useState(marketingSuggestions[0] ?? '')
  const [teknisiName, setTeknisiName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const leadType = extractLeadTypeFromSuggestion(leadValue) ?? 'HOME'
  const statusOptions = getOrderStatusOptions(leadType)

  useEffect(() => {
    if (initialLeadValue?.trim()) {
      setLeadValue(initialLeadValue.trim())
    }
  }, [initialLeadValue])

  useEffect(() => {
    if (!statusOptions.includes(status)) {
      setStatus(statusOptions[0] ?? 'REGISTERED')
    }
  }, [status, statusOptions])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const leadId = extractLeadId(leadValue)
    if (!leadId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih lead yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          orderType,
          status,
          scheduledInstallationAt: scheduledInstallationAt || null,
          marketingName,
          teknisiName,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Sales order gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Sales order berhasil disimpan.',
      })
      setOrderType('NEW_INSTALL')
      setStatus('REGISTERED')
      setScheduledInstallationAt('')
      setTeknisiName('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action Sales</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Buat sales order dari lead
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Sales.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action order dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini membuat sales order baru dari lead yang sudah ada agar funnel akuisisi mulai bergerak ke tahap delivery.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Lead Sumber</span>
          <input
            list="sales-lead-suggestions"
            value={leadValue}
            onChange={(event) => setLeadValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="123 | Nama Prospek | Marketing"
            required
            disabled={isDisabled}
          />
          <datalist id="sales-lead-suggestions">
            {leadSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Order Type</span>
          <select
            value={orderType}
            onChange={(event) => setOrderType(event.target.value as (typeof orderTypeOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {orderTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status Awal</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
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
          <span className="font-semibold text-slate-950">Jadwal Instalasi</span>
          <input
            type="datetime-local"
            value={scheduledInstallationAt}
            onChange={(event) => setScheduledInstallationAt(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Marketing</span>
          <input
            list="sales-order-marketing-suggestions"
            value={marketingName}
            onChange={(event) => setMarketingName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama PIC marketing"
            disabled={isDisabled}
          />
          <datalist id="sales-order-marketing-suggestions">
            {marketingSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Teknisi</span>
          <input
            value={teknisiName}
            onChange={(event) => setTeknisiName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama teknisi atau tim lapangan"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan order, kebutuhan instalasi, atau konteks follow up"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Lead suggestion diambil dari queue lead terbaru yang sedang tampil pada halaman Sales.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Order...' : 'Simpan Sales Order'}
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
