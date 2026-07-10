'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type HrLoanStatusFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  loanSuggestions: string[]
  initialLoanValue?: string
}

const loanStatusOptions = ['ACTIVE', 'REJECTED', 'PAID'] as const

function extractLoanId(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function parseLoanSuggestion(value: string) {
  const parts = value.split('|').map((item) => item.trim())
  return {
    currentStatus: parts[2] ?? '',
  }
}

export function HrLoanStatusForm({
  canUpdate,
  reviewDbReady,
  loanSuggestions,
  initialLoanValue,
}: HrLoanStatusFormProps) {
  const router = useRouter()
  const [loanValue, setLoanValue] = useState(initialLoanValue?.trim() || loanSuggestions[0] || '')
  const [nextStatus, setNextStatus] = useState<(typeof loanStatusOptions)[number]>('ACTIVE')
  const [currentStatus, setCurrentStatus] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

  useEffect(() => {
    const parsed = parseLoanSuggestion(loanValue)
    const normalized = String(parsed.currentStatus || '').trim().toUpperCase()
    setCurrentStatus(normalized)

    if (loanStatusOptions.includes(normalized as (typeof loanStatusOptions)[number])) {
      setNextStatus(normalized as (typeof loanStatusOptions)[number])
      return
    }

    setNextStatus('ACTIVE')
  }, [loanValue])

  useEffect(() => {
    if (initialLoanValue?.trim()) {
      setLoanValue(initialLoanValue.trim())
    }
  }, [initialLoanValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const loanId = extractLoanId(loanValue)
    if (!loanId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih loan HR yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/loans', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loanId,
          nextStatus,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Status loan HR gagal diperbarui.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Status loan HR berhasil diperbarui.',
      })
      setNextStatus('ACTIVE')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Update Loan HR</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Ubah status loan
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi update status loan dinonaktifkan agar tidak menulis ke mock.'
            : 'Gunakan form ini untuk mengaktifkan, menolak, atau menutup loan HR dengan jejak audit actor yang langsung tercatat.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Loan HR</span>
          <input
            list="hr-loan-status-suggestions"
            value={loanValue}
            onChange={(event) => setLoanValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | Nama Karyawan | PENDING | KASBON | Rp 1.000.000 | Rp 100.000"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-loan-status-suggestions">
            {loanSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <div className="text-xs text-mute">Status saat ini: {currentStatus || '-'}</div>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status berikutnya</span>
          <select
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as (typeof loanStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {loanStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Catatan update</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Wajib untuk REJECTED, opsional untuk status lain"
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Saran loan diambil dari review section HR yang sedang tampil pada halaman ini.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Status Loan...' : 'Simpan Status Loan'}
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
