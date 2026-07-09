'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type HrLoanVoidFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  loanSuggestions: string[]
}

function extractLoanId(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function HrLoanVoidForm({ canUpdate, reviewDbReady, loanSuggestions }: HrLoanVoidFormProps) {
  const router = useRouter()
  const [loanValue, setLoanValue] = useState(loanSuggestions[0] ?? '')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

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
      const response = await fetch('/api/hr/loans/void', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loanId,
          reason,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Cancel/void loan HR gagal diproses.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Loan HR berhasil dibatalkan secara non-destruktif.',
      })
      setReason('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Void Loan HR</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Batalkan loan tanpa hapus histori
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi cancel/void loan dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini membatalkan loan dengan mengubah status menjadi CANCELLED tanpa menghapus row pinjaman, sehingga histori dan audit actor tetap utuh.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Loan HR</span>
          <input
            list="hr-loan-void-suggestions"
            value={loanValue}
            onChange={(event) => setLoanValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | Nama Karyawan | PENDING | KASBON | Rp 1.000.000 | Rp 100.000"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-loan-void-suggestions">
            {loanSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Alasan cancel/void</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: pengajuan ganda, nominal salah, atau kebutuhan pinjaman dibatalkan."
            required
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Loan yang dibatalkan akan tetap muncul di review HR dengan status `CANCELLED`.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Memproses Cancel Loan...' : 'Batalkan Loan'}
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
