'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type SalesCoverageCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  leadSuggestions: string[]
}

const coverageStatusOptions = ['PLANNED', 'AVAILABLE', 'LIMITED', 'UNAVAILABLE'] as const

function extractLeadId(value: string) {
  const matched = value.trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function SalesCoverageCreateForm({
  canCreate,
  reviewDbReady,
  leadSuggestions,
}: SalesCoverageCreateFormProps) {
  const router = useRouter()
  const [leadValue, setLeadValue] = useState(leadSuggestions[0] ?? '')
  const [areaName, setAreaName] = useState('')
  const [village, setVillage] = useState('')
  const [district, setDistrict] = useState('')
  const [city, setCity] = useState('')
  const [province, setProvince] = useState('')
  const [coverageStatus, setCoverageStatus] = useState<(typeof coverageStatusOptions)[number]>('PLANNED')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

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
      const response = await fetch('/api/sales/covered-areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          areaName,
          village,
          district,
          city,
          province,
          coverageStatus,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Coverage gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Coverage berhasil disimpan.',
      })
      setAreaName('')
      setVillage('')
      setDistrict('')
      setCity('')
      setProvince('')
      setCoverageStatus('PLANNED')
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
        Validasi coverage dari lead
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Sales.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action coverage dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini membuat master coverage area awal dari lead yang sedang direview agar proses survey dan order punya konteks area yang lebih jelas.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Lead Sumber</span>
          <input
            list="sales-coverage-lead-suggestions"
            value={leadValue}
            onChange={(event) => setLeadValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="123 | Nama Prospek | Marketing"
            required
            disabled={isDisabled}
          />
          <datalist id="sales-coverage-lead-suggestions">
            {leadSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nama Area</span>
          <input
            value={areaName}
            onChange={(event) => setAreaName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Perumahan, kawasan, atau cluster"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Desa / Kelurahan</span>
          <input
            value={village}
            onChange={(event) => setVillage(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama desa atau kelurahan"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kecamatan</span>
          <input
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama kecamatan"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kota / Kabupaten</span>
          <input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama kota atau kabupaten"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Provinsi</span>
          <input
            value={province}
            onChange={(event) => setProvince(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama provinsi"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status Coverage</span>
          <select
            value={coverageStatus}
            onChange={(event) => setCoverageStatus(event.target.value as (typeof coverageStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {coverageStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan port, jalur, kapasitas, atau hasil pengecekan area"
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
            {submitting ? 'Menyimpan Coverage...' : 'Simpan Coverage'}
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
