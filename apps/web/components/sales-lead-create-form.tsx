'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getLeadStatusOptions } from '@/lib/sales-workflow'

type SalesLeadCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  marketingSuggestions: string[]
}

const leadTypeOptions = ['HOME', 'CORPORATE', 'RESELLER'] as const

export function SalesLeadCreateForm({
  canCreate,
  reviewDbReady,
  marketingSuggestions,
}: SalesLeadCreateFormProps) {
  const router = useRouter()
  const [customerName, setCustomerName] = useState('')
  const [leadType, setLeadType] = useState<(typeof leadTypeOptions)[number]>('HOME')
  const [status, setStatus] = useState('NEW')
  const [source, setSource] = useState('Manual Review')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [marketingName, setMarketingName] = useState(marketingSuggestions[0] ?? '')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const statusOptions = getLeadStatusOptions(leadType)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/sales/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName,
          leadType,
          status,
          source,
          phone,
          address,
          marketingName,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Lead review gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Lead review berhasil disimpan.',
      })
      setCustomerName('')
      setLeadType('HOME')
      setStatus('NEW')
      setSource('Manual Review')
      setPhone('')
      setAddress('')
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
        Tambah lead review ke database
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Sales.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action lead dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menambah lead baru ke queue review Sales agar funnel akuisisi bisa diuji end-to-end.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nama Customer / Prospek</span>
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama calon pelanggan"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Lead Type</span>
          <select
            value={leadType}
            onChange={(event) => {
              const nextLeadType = event.target.value as (typeof leadTypeOptions)[number]
              setLeadType(nextLeadType)
              const nextOptions = getLeadStatusOptions(nextLeadType)
              if (!nextOptions.includes(status)) {
                setStatus(nextOptions[0] ?? 'NEW')
              }
            }}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {leadTypeOptions.map((item) => (
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
          <span className="font-semibold text-slate-950">Source</span>
          <input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Referral / WhatsApp / Direct Sales"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">No. HP</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="08xxxxxxxxxx"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Marketing</span>
          <input
            list="sales-marketing-suggestions"
            value={marketingName}
            onChange={(event) => setMarketingName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama PIC marketing"
            disabled={isDisabled}
          />
          <datalist id="sales-marketing-suggestions">
            {marketingSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Alamat</span>
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alamat prospek / lokasi pemasangan"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan awal lead, kebutuhan layanan, atau konteks follow up"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Marketing suggestion diambil dari queue lead dan survey yang sedang tampil pada halaman Sales.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Lead Review'}
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
