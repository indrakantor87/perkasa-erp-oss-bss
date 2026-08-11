'use client'

import type { FormEvent, ChangeEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PACKAGE_OPTIONS = [
  'HOME ADVAN',
  'HOME BASIC',
  'HOME ENTERTAIN',
  'HOME LITE',
  'HOME LITE ( BUNDLING 4BULAN + FREE 1BULAN)',
  'HOME MINI',
  'HOME SMALL',
  'HOME SMART',
  'HOME STREAM',
  'HOME_MINI (PROMO 4+1)',
] as const

type PackageOption = (typeof PACKAGE_OPTIONS)[number]

type SalesPsbInputFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  defaultSalesOwner: string
  isMarketingRole: boolean
}

function normalizeWhatsApp(raw: string) {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('62')) {
    return digits
  }
  if (digits.startsWith('0')) {
    return `62${digits.slice(1)}`
  }
  return digits
}

function normalizeGoogleMapsInput(rawValue: string) {
  const value = rawValue.trim()
  if (!value) {
    return { normalized: '', valid: true }
  }
  const directPair = value.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (directPair) {
    const lat = Number(directPair[1])
    const lng = Number(directPair[2])
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return {
        normalized: `https://maps.google.com/?q=${encodeURIComponent(`${lat},${lng}`)}`,
        valid: true,
      }
    }
  }
  const normalizedUrl = value.startsWith('http://') || value.startsWith('https://') ? value : `https://${value}`
  try {
    const url = new URL(normalizedUrl)
    const hostname = url.hostname.toLowerCase()
    const isGoogleMapsHost =
      hostname === 'maps.google.com' ||
      hostname === 'maps.app.goo.gl' ||
      hostname.endsWith('.google.com') ||
      hostname === 'google.com' ||
      hostname.endsWith('.google.co.id') ||
      hostname === 'goo.gl'
    const pathname = url.pathname.toLowerCase()
    const hasMapSignal =
      hostname === 'maps.google.com' ||
      hostname === 'maps.app.goo.gl' ||
      pathname.startsWith('/maps') ||
      pathname.includes('/place') ||
      pathname.includes('/search') ||
      url.searchParams.has('q') ||
      url.searchParams.has('query') ||
      url.searchParams.has('ll') ||
      url.searchParams.has('destination')
    if (!isGoogleMapsHost || !hasMapSignal) {
      return { normalized: value, valid: false }
    }
    return { normalized: url.toString(), valid: true }
  } catch {
    return { normalized: value, valid: false }
  }
}

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

export function SalesPsbInputForm({
  canCreate,
  reviewDbReady,
  defaultSalesOwner,
  isMarketingRole,
}: SalesPsbInputFormProps) {
  const router = useRouter()

  const [customerName, setCustomerName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [waPhone, setWaPhone] = useState('')
  const [packageLabel, setPackageLabel] = useState<PackageOption>('HOME LITE')
  const [marketingName, setMarketingName] = useState(defaultSalesOwner)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoCompressedBase64, setPhotoCompressedBase64] = useState<string | null>(null)
  const [mapsLink, setMapsLink] = useState('')
  const [description, setDescription] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isWriteBlocked = !canCreate || !reviewDbReady || submitting
  const isSubmitDisabled = isWriteBlocked
  const isFormFieldDisabled = !canCreate || submitting
  const mapsInputState = normalizeGoogleMapsInput(mapsLink)
  const uiReviewEnabled = !reviewDbReady && canCreate && !submitting
  void uiReviewEnabled

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      setPhotoFile(null)
      setPhotoPreview(null)
      setPhotoCompressedBase64(null)
      return
    }
    if (!file.type.startsWith('image/')) {
      setFeedback({ tone: 'error', message: 'Foto Rumah hanya menerima file gambar (jpg/png/webp).' })
      return
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setFeedback({ tone: 'error', message: 'Ukuran Foto Rumah melebihi batas 10MB.' })
      return
    }
    setPhotoFile(file)
    setFeedback(null)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '')
      setPhotoPreview(dataUrl)
      const img = new Image()
      img.onload = () => {
        const maxWidth = 1600
        const scale = Math.min(1, maxWidth / img.width)
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          const compressed = canvas.toDataURL('image/jpeg', 0.82)
          setPhotoCompressedBase64(compressed)
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitDisabled) return

    if (!customerName.trim()) {
      setFeedback({ tone: 'error', message: 'Nama Pelanggan wajib diisi.' })
      return
    }
    const normalizedWa = normalizeWhatsApp(waPhone)
    if (normalizedWa.length < 10) {
      setFeedback({ tone: 'error', message: 'No WA Aktif belum valid (minimal 10 digit).' })
      return
    }
    if (!mapsInputState.valid) {
      setFeedback({ tone: 'error', message: 'Link Google Maps belum valid. Gunakan URL Google Maps atau koordinat latitude,longitude.' })
      return
    }
    if (!packageLabel) {
      setFeedback({ tone: 'error', message: 'Pilih Paket terlebih dahulu.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/sales/psb-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: normalizedWa,
          packageLabel,
          salesOwnerName: marketingName.trim() || defaultSalesOwner,
          googleMapsLink: mapsInputState.normalized || undefined,
          birthDate: birthDate || undefined,
          activityNotes: description.trim() || undefined,
          housePhotoFileName: photoFile?.name ?? undefined,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { id?: number; message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Input PSB gagal disimpan.' })
        return
      }
      setFeedback({ tone: 'success', message: payload?.message || 'Input PSB berhasil disimpan.' })
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

  const photoFileName = photoFile?.name ?? null

  return (
    <div className="space-y-6">
      <section>
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Input Data PSB
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Isi data pelanggan baru secara singkat dan rapi.
          </p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nama Pelanggan</span>
          <input
            type="text"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            disabled={isFormFieldDisabled}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tanggal Lahir</span>
          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            disabled={isFormFieldDisabled}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">No WA Aktif</span>
          <input
            type="tel"
            value={waPhone}
            onChange={(event) => setWaPhone(event.target.value)}
            disabled={isFormFieldDisabled}
            placeholder="08xxxxxxxxx"
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Paket</span>
          <select
            value={packageLabel}
            onChange={(event) => setPackageLabel(event.target.value as PackageOption)}
            disabled={isFormFieldDisabled}
            className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            required
          >
            {PACKAGE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Marketing</span>
            <input
              type="text"
              value={marketingName}
              onChange={(event) => setMarketingName(event.target.value)}
              disabled={isFormFieldDisabled || isMarketingRole}
              placeholder="Masukkan nama marketing"
              className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            />
            <span className="text-xs text-slate-400">
              Untuk role selain `MARKETING`, kolom ini bisa diisi manual.
            </span>
          </label>
        </div>

        <div className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Foto Rumah (Max 10MB - Otomatis Dikompres)</span>
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-3">
              <label
                className={`inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 ${
                  isFormFieldDisabled ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                }`}
              >
                Browse...
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={isFormFieldDisabled}
                  className="sr-only"
                />
              </label>
              <span className="text-sm text-slate-500">
                {photoFileName ? photoFileName : 'No file selected.'}
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Foto akan dikompres otomatis sebelum dikirim.
            </p>
            {photoPreview ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
                <img
                  src={photoPreview}
                  alt="Preview Foto Rumah"
                  className="max-h-48 w-full object-cover"
                />
              </div>
            ) : null}
          </div>
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Link Google Maps</span>
          <input
            type="text"
            value={mapsLink}
            onChange={(event) => setMapsLink(event.target.value)}
            disabled={isFormFieldDisabled}
            placeholder="https://maps.google.com/..."
            className={`rounded-lg border px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${
              mapsLink && !mapsInputState.valid
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
                : 'border-slate-300 focus:border-slate-500'
            }`}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Deskripsi (Opsional)</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            disabled={isFormFieldDisabled}
            className="min-h-24 resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 placeholder:text-slate-400 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          />
        </label>

        {feedback ? (
          <div
            className={`lg:col-span-2 rounded-lg border px-4 py-3 text-sm ${
              feedback.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="lg:col-span-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="inline-flex items-center justify-center rounded-md bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-100"
          >
            {submitting ? 'Mengirim...' : 'Kirim'}
          </button>
        </div>
      </form>
    </div>
  )
}
