'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type QuotationCreateProps = {
  canCreate: boolean
  reviewDbReady: boolean
  leadSuggestions: string[]
  initialLeadValue?: string
}

type SlaProfile = {
  id: number
  code: string
  name: string
}

function extractLeadId(value: string) {
  const matched = String(value ?? '').trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function SalesCorporateQuotationCreateForm({
  canCreate,
  reviewDbReady,
  leadSuggestions,
  initialLeadValue,
}: QuotationCreateProps) {
  const router = useRouter()
  const [leadValue, setLeadValue] = useState(initialLeadValue?.trim() || leadSuggestions[0] || '')
  const [packageCode, setPackageCode] = useState('')
  const [slaCode, setSlaCode] = useState('')
  const [monthlyPrice, setMonthlyPrice] = useState('0')
  const [installationFee, setInstallationFee] = useState('0')
  const [contractMonths, setContractMonths] = useState('12')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [profiles, setProfiles] = useState<SlaProfile[]>([])
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  useEffect(() => {
    if (initialLeadValue?.trim()) {
      setLeadValue(initialLeadValue.trim())
    }
  }, [initialLeadValue])

  useEffect(() => {
    if (!reviewDbReady) return
    void (async () => {
      const response = await fetch('/api/sales/sla-profiles')
      const payload = (await response.json().catch(() => null)) as { profiles?: SlaProfile[] } | null
      setProfiles(payload?.profiles ?? [])
    })()
  }, [reviewDbReady])

  const slaOptions = useMemo(() => profiles.map((item) => item.code).filter(Boolean), [profiles])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const leadId = extractLeadId(leadValue)
    if (!leadId) {
      setFeedback({ tone: 'error', message: 'Pilih lead corporate yang valid dari daftar saran.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/sales/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          packageCode: packageCode || null,
          slaCode: slaCode || null,
          monthlyPrice: Number(monthlyPrice || '0'),
          installationFee: Number(installationFee || '0'),
          contractMonths: Number(contractMonths || '12'),
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Quotation corporate gagal dibuat.' })
        return
      }

      setFeedback({ tone: 'success', message: payload?.message || 'Quotation corporate berhasil dibuat.' })
      setPackageCode('')
      setSlaCode('')
      setMonthlyPrice('0')
      setInstallationFee('0')
      setContractMonths('12')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Corporate (Dedicated) Flow</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Buat quotation corporate
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Sales.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi quotation corporate dinonaktifkan.'
            : 'Quotation corporate akan masuk ke antrian internal approval sebelum bisa dikunci sebagai kontrak.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Lead Corporate</span>
          <input
            list="sales-corporate-lead-suggestions"
            value={leadValue}
            onChange={(event) => setLeadValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="123 | CORPORATE | Nama Prospek | MKT: ... | WA: ..."
            required
            disabled={isDisabled}
          />
          <datalist id="sales-corporate-lead-suggestions">
            {leadSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Package Code (opsional)</span>
          <input
            value={packageCode}
            onChange={(event) => setPackageCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="PKG-DEDICATED-001"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">SLA Code (opsional)</span>
          <input
            list="sales-sla-profile-suggestions"
            value={slaCode}
            onChange={(event) => setSlaCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="SLA-CORP-4H"
            disabled={isDisabled}
          />
          <datalist id="sales-sla-profile-suggestions">
            {slaOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Harga Bulanan</span>
          <input
            inputMode="numeric"
            value={monthlyPrice}
            onChange={(event) => setMonthlyPrice(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="2000000"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Biaya Instalasi</span>
          <input
            inputMode="numeric"
            value={installationFee}
            onChange={(event) => setInstallationFee(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="0"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Durasi Kontrak (bulan)</span>
          <input
            inputMode="numeric"
            value={contractMonths}
            onChange={(event) => setContractMonths(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Kebutuhan bandwidth, IP public, last mile, SLA, biaya khusus, dll."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">Quotation akan mengunci guardrail corporate sebelum delivery dimulai.</div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Buat Quotation'}
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

