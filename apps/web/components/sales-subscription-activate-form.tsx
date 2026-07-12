'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type SalesSubscriptionActivateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  orderSuggestions: string[]
  initialOrderValue?: string
}

function extractOrderId(value: string) {
  const matched = value.trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

function normalizePackageReference(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function SalesSubscriptionActivateForm({
  canCreate,
  reviewDbReady,
  orderSuggestions,
  initialOrderValue,
}: SalesSubscriptionActivateFormProps) {
  const router = useRouter()
  const [orderValue, setOrderValue] = useState(initialOrderValue?.trim() || orderSuggestions[0] || '')
  const [packageReference, setPackageReference] = useState('')
  const [packageSuggestions, setPackageSuggestions] = useState<string[]>([])
  const [activatedAt, setActivatedAt] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('')
  const [addressLabel, setAddressLabel] = useState('Alamat Instalasi')
  const [address, setAddress] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  useEffect(() => {
    if (initialOrderValue?.trim()) {
      setOrderValue(initialOrderValue.trim())
    }
  }, [initialOrderValue])

  useEffect(() => {
    if (!reviewDbReady) {
      setPackageSuggestions([])
      return
    }

    let cancelled = false

    async function loadPackageSuggestions() {
      const response = await fetch('/api/sales/subscriptions', {
        method: 'GET',
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => null)) as { suggestions?: string[] } | null
      if (!response.ok || cancelled) {
        return
      }

      const nextSuggestions = Array.isArray(payload?.suggestions) ? payload.suggestions.filter(Boolean) : []
      setPackageSuggestions(nextSuggestions)
      setPackageReference((currentValue) => currentValue || nextSuggestions[0] || '')
    }

    void loadPackageSuggestions()

    return () => {
      cancelled = true
    }
  }, [reviewDbReady])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const salesOrderId = extractOrderId(orderValue)
    if (!salesOrderId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih sales order yang valid dari daftar saran.',
      })
      return
    }

    const normalizedPackageReference = normalizePackageReference(packageReference)
    if (!normalizedPackageReference) {
      setFeedback({
        tone: 'error',
        message: 'Kode atau nama paket wajib diisi.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/sales/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salesOrderId,
          packageReference: normalizedPackageReference,
          activatedAt: activatedAt || null,
          monthlyPrice,
          addressLabel,
          address,
          mapsUrl,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Aktivasi subscription gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Aktivasi subscription berhasil disimpan.',
      })
      setPackageReference(packageSuggestions[0] || '')
      setActivatedAt('')
      setMonthlyPrice('')
      setAddressLabel('Alamat Instalasi')
      setAddress('')
      setMapsUrl('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Activation</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Aktivasi subscription dari sales order
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Sales.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action aktivasi dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini mengubah sales order menjadi subscription aktif, sekaligus menyelaraskan customer master, paket layanan, dan work order instalasi bila tersedia.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Sales Order</span>
          <input
            list="sales-activation-order-suggestions"
            value={orderValue}
            onChange={(event) => setOrderValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | ORD-202607-0002 | Customer"
            required
            disabled={isDisabled}
          />
          <datalist id="sales-activation-order-suggestions">
            {orderSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Paket Layanan</span>
          <input
            list="sales-activation-package-suggestions"
            value={packageReference}
            onChange={(event) => setPackageReference(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="HOME-20M | Home 20 Mbps"
            required
            disabled={isDisabled}
          />
          <datalist id="sales-activation-package-suggestions">
            {packageSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Waktu Aktivasi</span>
          <input
            type="datetime-local"
            value={activatedAt}
            onChange={(event) => setActivatedAt(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Harga Bulanan</span>
          <input
            value={monthlyPrice}
            onChange={(event) => setMonthlyPrice(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Kosongkan untuk harga paket default"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Label Alamat</span>
          <input
            value={addressLabel}
            onChange={(event) => setAddressLabel(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alamat Instalasi / Kantor / Rumah"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Maps URL</span>
          <input
            value={mapsUrl}
            onChange={(event) => setMapsUrl(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="https://maps.app.goo.gl/..."
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Alamat Aktivasi</span>
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Jika customer order belum terbentuk, alamat ini dipakai untuk membuat alamat utama customer."
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan Aktivasi</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan final instalasi, serial ONU, atau konteks aktivasi layanan"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Saran order diambil dari review queue sales order aktif. Paket diambil langsung dari master `sales_packages` aktif pada review DB.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Mengaktifkan Subscription...' : 'Aktifkan Subscription'}
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
