'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type HrSalarySlipVoidFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  salarySlipSuggestions: string[]
}

function extractSalarySlipId(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function parseSalarySlipSuggestion(value: string) {
  const parts = value.split('|').map((item) => item.trim())
  return {
    period: parts[2] ?? '',
    status: parts[3] ?? '',
    income: parts[4] ?? '-',
    deduction: parts[5] ?? '-',
  }
}

export function HrSalarySlipVoidForm({
  canUpdate,
  reviewDbReady,
  salarySlipSuggestions,
}: HrSalarySlipVoidFormProps) {
  const router = useRouter()
  const [salarySlipValue, setSalarySlipValue] = useState(salarySlipSuggestions[0] ?? '')
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedIncome, setSelectedIncome] = useState('-')
  const [selectedDeduction, setSelectedDeduction] = useState('-')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

  useEffect(() => {
    const parsed = parseSalarySlipSuggestion(salarySlipValue)
    setSelectedPeriod(parsed.period)
    setSelectedStatus(parsed.status)
    setSelectedIncome(parsed.income || '-')
    setSelectedDeduction(parsed.deduction || '-')
  }, [salarySlipValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const salarySlipId = extractSalarySlipId(salarySlipValue)
    if (!salarySlipId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih slip gaji yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/salary-slips/void', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          salarySlipId,
          reason,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Void slip gaji gagal diproses.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Slip gaji berhasil di-void.',
      })
      setReason('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Void Payroll</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Void slip gaji non-destruktif
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi void slip gaji dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menandai slip gaji sebagai void tanpa menghapus row payroll, sehingga histori tetap utuh dan audit actor tetap lengkap.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Slip gaji</span>
          <input
            list="hr-salary-slip-void-suggestions"
            value={salarySlipValue}
            onChange={(event) => setSalarySlipValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="18 | Nama Karyawan | 07/2026 | RELEASED | Rp 5.000.000 | Rp 300.000"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-salary-slip-void-suggestions">
            {salarySlipSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <div className="grid gap-1 text-xs text-mute sm:grid-cols-3">
            <span>Periode: {selectedPeriod || '-'}</span>
            <span>Status: {selectedStatus || '-'}</span>
            <span>Income/Deduction: {selectedIncome} / {selectedDeduction}</span>
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Alasan void</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: payroll duplikat, periode salah, atau koreksi komponen gaji."
            required
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Slip yang sudah di-void tidak dihapus dan akan tampil sebagai status `VOIDED` di review HR. Ringkasan di atas membantu memastikan slip yang dipilih memang benar sebelum dibatalkan.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Memproses Void...' : 'Void Slip Gaji'}
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
