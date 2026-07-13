'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { SupportFormContextNote } from '@/components/support-form-context-note'

type SupportIsolationFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  radboxSuggestions: string[]
  marketingSuggestions: string[]
  serviceSuggestions: string[]
}

export function SupportIsolationForm({
  canCreate,
  reviewDbReady,
  radboxSuggestions,
  marketingSuggestions,
  serviceSuggestions,
}: SupportIsolationFormProps) {
  const router = useRouter()
  const [serviceReference, setServiceReference] = useState(serviceSuggestions[0] ?? '')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [marketingName, setMarketingName] = useState(marketingSuggestions[0] ?? '')
  const [radboxName, setRadboxName] = useState(radboxSuggestions[0] ?? '')
  const [packagePrice, setPackagePrice] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/support/isolations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceReference,
          customerName,
          customerPhone,
          customerAddress,
          marketingName,
          radboxName,
          packagePrice,
          reason,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Data isolir gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Data isolir berhasil disimpan.',
      })
      setServiceReference(serviceSuggestions[0] ?? '')
      setCustomerName('')
      setCustomerPhone('')
      setCustomerAddress('')
      setMarketingName(marketingSuggestions[0] ?? '')
      setRadboxName(radboxSuggestions[0] ?? '')
      setPackagePrice('')
      setReason('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Form Action Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tambah pelanggan isolir aktif
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Support.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action isolir dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menambah data isolir aktif ke review DB agar alur suspend dan tindak lanjut support mulai bisa diuji dari web.'}
      </p>
      <SupportFormContextNote
        items={[
          {
            label: 'Tujuan',
            value: 'Mencatat pelanggan yang masuk status suspend aktif agar keputusan restore atau terminate punya anchor yang jelas.',
          },
          {
            label: 'Sumber',
            value: 'Service No, customer code, radbox, dan marketing mengikuti data support yang sedang tampil di lane isolir.',
          },
          {
            label: 'Hasil',
            value: 'Kasus baru siap diproses lebih lanjut ke restore billing atau transfer dismantle.',
          },
        ]}
      />

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Service No / Customer Code</span>
          <input
            list="support-isolation-service-suggestions"
            value={serviceReference}
            onChange={(event) => setServiceReference(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="SVC-000123 / CUST-00045"
            required
            disabled={isDisabled}
          />
          <datalist id="support-isolation-service-suggestions">
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
          <span className="font-semibold text-slate-950">Nomor Telepon</span>
          <input
            value={customerPhone}
            onChange={(event) => setCustomerPhone(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="62812xxxxxxx"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Radbox</span>
          <input
            list="support-isolation-radbox-suggestions"
            value={radboxName}
            onChange={(event) => setRadboxName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Radbox 26"
            disabled={isDisabled}
          />
          <datalist id="support-isolation-radbox-suggestions">
            {radboxSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Marketing</span>
          <input
            list="support-isolation-marketing-suggestions"
            value={marketingName}
            onChange={(event) => setMarketingName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama PIC marketing"
            disabled={isDisabled}
          />
          <datalist id="support-isolation-marketing-suggestions">
            {marketingSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Harga Paket</span>
          <input
            value={packagePrice}
            onChange={(event) => setPackagePrice(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="350000 atau Rp 350.000"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Alamat Customer</span>
          <textarea
            value={customerAddress}
            onChange={(event) => setCustomerAddress(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alamat pelanggan atau titik instalasi"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Alasan Isolir</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Tunggakan, permintaan sementara, atau alasan operasional lainnya"
            required
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Anchor isolir wajib memakai `Service No` atau `Customer Code`; saran radbox dan marketing diambil dari data isolir aktif yang sedang tampil.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Isolir...' : 'Simpan Isolir'}
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
