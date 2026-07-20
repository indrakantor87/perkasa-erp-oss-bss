'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type SalesPsbInputFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  defaultSalesOwner: string
}

export function SalesPsbInputForm({
  canCreate,
  reviewDbReady,
  defaultSalesOwner,
}: SalesPsbInputFormProps) {
  const router = useRouter()
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [addressText, setAddressText] = useState('')
  const [areaLabel, setAreaLabel] = useState('')
  const [packageLabel, setPackageLabel] = useState('')
  const [odpCode, setOdpCode] = useState('')
  const [requestedInstallDate, setRequestedInstallDate] = useState('')
  const [salesOwnerName, setSalesOwnerName] = useState(defaultSalesOwner)
  const [escortNotes, setEscortNotes] = useState('')
  const [activityNotes, setActivityNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) {
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/sales/psb-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName,
          customerPhone,
          addressText,
          areaLabel,
          packageLabel,
          odpCode,
          requestedInstallDate,
          salesOwnerName,
          escortNotes,
          activityNotes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { id?: number; message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Input PSB gagal disimpan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Input PSB berhasil disimpan.',
      })

      if (payload?.id) {
        router.push(`/list-psb?selected=${payload.id}`)
        router.refresh()
        return
      }

      router.push('/list-psb')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Input Penjualan</p>
            <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              Input PSB
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Halaman ini khusus untuk prospek lapangan yang siap diajukan ke proses pemasangan baru. Setelah disimpan,
              data langsung masuk ke `List PSB` untuk dipilih CS, dijadwalkan, lalu diteruskan ke ticket PSB.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/list-psb"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Buka List PSB
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="badge border-sky-200 bg-sky-50 text-sky-700">Alur: Input Penjualan</span>
          <span className="badge border-amber-200 bg-amber-50 text-amber-700">Review dan Pilih CS</span>
          <span className="badge border-violet-200 bg-violet-50 text-violet-700">Ticketing PSB</span>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Form Tunggal</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Prospek lapangan ke List PSB</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {!canCreate
              ? 'Role aktif belum memiliki izin input pada domain Penjualan.'
              : !reviewDbReady
                ? 'Write-side Input PSB hanya aktif saat review DB benar-benar tersedia.'
                : 'Isi data inti customer dan kebutuhan pemasangan. Tidak ada tahap lead, survey, atau coverage terpisah di layar ini.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Nama Customer</span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="Nama calon pelanggan"
              disabled={isDisabled}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">No WhatsApp</span>
            <input
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="08xxxxxxxxxx"
              disabled={isDisabled}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Alamat Pemasangan</span>
            <textarea
              value={addressText}
              onChange={(event) => setAddressText(event.target.value)}
              rows={4}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="Alamat lengkap lokasi pemasangan"
              disabled={isDisabled}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Area</span>
            <input
              value={areaLabel}
              onChange={(event) => setAreaLabel(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="Contoh: Pati Kota"
              disabled={isDisabled}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Paket Layanan</span>
            <input
              value={packageLabel}
              onChange={(event) => setPackageLabel(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="Contoh: Home 20 Mbps"
              disabled={isDisabled}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">ODP</span>
            <input
              value={odpCode}
              onChange={(event) => setOdpCode(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="Opsional bila sudah diketahui"
              disabled={isDisabled}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Permintaan Jadwal Customer</span>
            <input
              type="datetime-local"
              value={requestedInstallDate}
              onChange={(event) => setRequestedInstallDate(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              disabled={isDisabled}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Nama Penjualan</span>
            <input
              value={salesOwnerName}
              onChange={(event) => setSalesOwnerName(event.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="PIC penjualan"
              disabled={isDisabled}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Pengawalan Lokasi</span>
            <textarea
              value={escortNotes}
              onChange={(event) => setEscortNotes(event.target.value)}
              rows={3}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="Titik maps, patokan rumah, atau info pendampingan lapangan"
              disabled={isDisabled}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Catatan Prospek</span>
            <textarea
              value={activityNotes}
              onChange={(event) => setActivityNotes(event.target.value)}
              rows={4}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="Konteks lapangan yang perlu dibaca CS sebelum menjadwalkan"
              disabled={isDisabled}
            />
          </label>

          {feedback ? (
            <div
              className={`lg:col-span-2 rounded-2xl border px-4 py-3 text-sm ${
                feedback.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Setelah disimpan, data akan diarahkan ke `List PSB` agar bisa langsung dibaca dan diproses oleh CS.
            </p>
            <button
              type="submit"
              disabled={isDisabled}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-900 bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {submitting ? 'Menyimpan Input PSB...' : 'Simpan ke List PSB'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
