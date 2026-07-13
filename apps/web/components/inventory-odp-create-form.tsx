'use client'

import Link from 'next/link'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { buildGoogleMapsHref } from '@/lib/map-links'

type InventoryOdpCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
}

export function InventoryOdpCreateForm({ canCreate, reviewDbReady }: InventoryOdpCreateFormProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [locationText, setLocationText] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [totalPorts, setTotalPorts] = useState('8')
  const [generatePorts, setGeneratePorts] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const mapsHref = buildGoogleMapsHref({
    latitude,
    longitude,
    query: locationText,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/odps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          name,
          locationText,
          latitude,
          longitude,
          totalPorts,
          generatePorts,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'ODP gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'ODP berhasil disimpan.',
      })
      setCode('')
      setName('')
      setLocationText('')
      setLatitude('')
      setLongitude('')
      setTotalPorts('8')
      setGeneratePorts(true)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action Inventory</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tambah ODP
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action ODP dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini membuat master ODP dan bisa sekaligus generate port default agar assignment layanan lebih cepat disiapkan.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kode ODP</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="ODP-PTI-001"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nama ODP</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="ODP Pati Kidul Blok A"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Lokasi (Text)</span>
          <textarea
            value={locationText}
            onChange={(event) => setLocationText(event.target.value)}
            className="min-h-20 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Patokan lokasi, alamat singkat, atau penanda lapangan"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Latitude</span>
          <input
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="-6.7451234"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Longitude</span>
          <input
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="111.0467890"
            disabled={isDisabled}
          />
        </label>

        <div className="rounded-2xl border border-line bg-slate-50 p-4 text-sm text-slate-700 lg:col-span-2">
          <p className="font-semibold text-slate-950">Preview maps dan kesiapan ODP</p>
          <p className="mt-2 leading-6 text-mute">
            ERP ini menyiapkan data ODP dengan koordinat yang bisa dibuka ke maps, lalu
            menjadi dasar untuk port ODP dan accessories/device assignment.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {mapsHref ? (
              <Link
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Preview di Google Maps
              </Link>
            ) : (
              <span className="badge border-slate-200 bg-white text-slate-500">
                Isi koordinat atau lokasi untuk preview maps
              </span>
            )}
            <span className="badge border-slate-200 bg-white text-slate-600">Port ODP siap digenerate</span>
            <span className="badge border-slate-200 bg-white text-slate-600">Accessories via device assignment</span>
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Total Port</span>
          <input
            type="number"
            min="1"
            max="128"
            value={totalPorts}
            onChange={(event) => setTotalPorts(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={generatePorts}
            onChange={(event) => setGeneratePorts(event.target.checked)}
            disabled={isDisabled}
          />
          <span>Generate port otomatis</span>
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">Jika generate port aktif, sistem akan membuat port 1..N dengan status AVAILABLE.</div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan ODP...' : 'Simpan ODP'}
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
