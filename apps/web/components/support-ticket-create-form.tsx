'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type SupportTicketCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  typeSuggestions: string[]
  serviceSuggestions: string[]
}

const categoryOptions = ['TT', 'PV'] as const
const statusOptions = ['OPEN', 'ON_PROGRESS'] as const

export function SupportTicketCreateForm({
  canCreate,
  reviewDbReady,
  typeSuggestions,
  serviceSuggestions,
}: SupportTicketCreateFormProps) {
  const router = useRouter()
  const [serviceReference, setServiceReference] = useState(serviceSuggestions[0] ?? '')
  const [customerName, setCustomerName] = useState('')
  const [customerUser, setCustomerUser] = useState('')
  const [category, setCategory] = useState<(typeof categoryOptions)[number]>('TT')
  const [ticketType, setTicketType] = useState(typeSuggestions[0] ?? 'KONEKSI')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('OPEN')
  const [problemCategory, setProblemCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/support/trouble-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceReference,
          customerName,
          customerUser,
          category,
          type: ticketType,
          status,
          problemCategory,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Trouble ticket review gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Trouble ticket review berhasil disimpan.',
      })
      setServiceReference(serviceSuggestions[0] ?? '')
      setCustomerName('')
      setCustomerUser('')
      setCategory('TT')
      setTicketType(typeSuggestions[0] ?? 'KONEKSI')
      setStatus('OPEN')
      setProblemCategory('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tambah trouble ticket review
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Support.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action support dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menambah trouble ticket open awal ke review DB agar queue support bisa diuji dari sisi input hingga tindak lanjut.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Service No / Customer Code</span>
          <input
            list="support-service-suggestions"
            value={serviceReference}
            onChange={(event) => setServiceReference(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="SVC-000123 / CUST-00045"
            required
            disabled={isDisabled}
          />
          <datalist id="support-service-suggestions">
            {serviceSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nama Customer</span>
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama pelanggan"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Customer User</span>
          <input
            value={customerUser}
            onChange={(event) => setCustomerUser(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="user / email pelanggan"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kategori</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as (typeof categoryOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {categoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tipe Ticket</span>
          <input
            list="support-type-suggestions"
            value={ticketType}
            onChange={(event) => setTicketType(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="KONEKSI / LATENCY / PREVENTIVE"
            required
            disabled={isDisabled}
          />
          <datalist id="support-type-suggestions">
            {typeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status Awal</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof statusOptions)[number])}
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
          <span className="font-semibold text-slate-950">Problem Category</span>
          <input
            value={problemCategory}
            onChange={(event) => setProblemCategory(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="FTTH / Backbone / WiFi / ONU"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Ringkasan keluhan pelanggan atau konteks ticket"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Anchor layanan wajib memakai `Service No` atau `Customer Code`, sedangkan saran type ticket diambil dari queue support yang sedang tampil.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Trouble Ticket'}
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
