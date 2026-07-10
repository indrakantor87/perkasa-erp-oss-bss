'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type SalesSurveyCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  leadSuggestions: string[]
  initialLeadValue?: string
}

const surveyTypeOptions = ['HOME', 'DEDICATED', 'RESELLER'] as const
const surveyStatusOptions = ['REQUESTED', 'SCHEDULED', 'ON_PROGRESS'] as const
const feasibilityOptions = ['PENDING', 'FEASIBLE', 'NOT_FEASIBLE', 'NEED_REVIEW'] as const

function extractLeadId(value: string) {
  const matched = value.trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function SalesSurveyCreateForm({
  canCreate,
  reviewDbReady,
  leadSuggestions,
  initialLeadValue,
}: SalesSurveyCreateFormProps) {
  const router = useRouter()
  const [leadValue, setLeadValue] = useState(initialLeadValue?.trim() || leadSuggestions[0] || '')
  const [surveyType, setSurveyType] = useState<(typeof surveyTypeOptions)[number]>('HOME')
  const [surveyStatus, setSurveyStatus] = useState<(typeof surveyStatusOptions)[number]>('REQUESTED')
  const [feasibilityStatus, setFeasibilityStatus] = useState<(typeof feasibilityOptions)[number]>('PENDING')
  const [scheduledAt, setScheduledAt] = useState('')
  const [siteAddress, setSiteAddress] = useState('')
  const [technicalNotes, setTechnicalNotes] = useState('')
  const [customerRequestNotes, setCustomerRequestNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  useEffect(() => {
    if (initialLeadValue?.trim()) {
      setLeadValue(initialLeadValue.trim())
    }
  }, [initialLeadValue])

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
      const response = await fetch('/api/sales/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          surveyType,
          surveyStatus,
          feasibilityStatus,
          scheduledAt: scheduledAt || null,
          siteAddress,
          technicalNotes,
          customerRequestNotes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Survey gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Survey berhasil disimpan.',
      })
      setSurveyType('HOME')
      setSurveyStatus('REQUESTED')
      setFeasibilityStatus('PENDING')
      setScheduledAt('')
      setSiteAddress('')
      setTechnicalNotes('')
      setCustomerRequestNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action Sales</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Jadwalkan survey dari lead
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Sales.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action survey dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini membuat survey awal dari lead yang sudah ada agar proses coverage dan feasibility mulai tercatat dari web.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Lead Sumber</span>
          <input
            list="sales-survey-lead-suggestions"
            value={leadValue}
            onChange={(event) => setLeadValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="123 | Nama Prospek | Marketing"
            required
            disabled={isDisabled}
          />
          <datalist id="sales-survey-lead-suggestions">
            {leadSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Survey Type</span>
          <select
            value={surveyType}
            onChange={(event) => setSurveyType(event.target.value as (typeof surveyTypeOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {surveyTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status Survey</span>
          <select
            value={surveyStatus}
            onChange={(event) => setSurveyStatus(event.target.value as (typeof surveyStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {surveyStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Feasibility</span>
          <select
            value={feasibilityStatus}
            onChange={(event) => setFeasibilityStatus(event.target.value as (typeof feasibilityOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {feasibilityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Jadwal Survey</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Alamat Lokasi</span>
          <textarea
            value={siteAddress}
            onChange={(event) => setSiteAddress(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alamat lokasi survey atau titik pemasangan"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan Teknis</span>
          <textarea
            value={technicalNotes}
            onChange={(event) => setTechnicalNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Temuan teknis awal, ODP, jalur kabel, atau kebutuhan material"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan Permintaan Customer</span>
          <textarea
            value={customerRequestNotes}
            onChange={(event) => setCustomerRequestNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Jam kunjungan, kebutuhan layanan, atau preferensi customer"
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
            {submitting ? 'Menyimpan Survey...' : 'Simpan Survey'}
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
