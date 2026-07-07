'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type HrLoanCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  employeeSuggestions: string[]
}

const loanStatusOptions = ['PENDING', 'ACTIVE', 'REJECTED', 'PAID'] as const

function extractEmployeeCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function HrLoanCreateForm({
  canCreate,
  reviewDbReady,
  employeeSuggestions,
}: HrLoanCreateFormProps) {
  const router = useRouter()
  const [employeeValue, setEmployeeValue] = useState(employeeSuggestions[0] ?? '')
  const [loanType, setLoanType] = useState('KASBON')
  const [amount, setAmount] = useState('')
  const [monthlyInstallment, setMonthlyInstallment] = useState('')
  const [loanDate, setLoanDate] = useState('')
  const [status, setStatus] = useState<(typeof loanStatusOptions)[number]>('PENDING')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const employeeCode = extractEmployeeCode(employeeValue)
    if (!employeeCode) {
      setFeedback({
        tone: 'error',
        message: 'Pilih employee yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeCode,
          loanType,
          amount,
          monthlyInstallment,
          loanDate: loanDate || null,
          status,
          description,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Loan HR gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Loan HR berhasil disimpan.',
      })
      setLoanType('KASBON')
      setAmount('')
      setMonthlyInstallment('')
      setLoanDate('')
      setStatus('PENDING')
      setDescription('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action HR</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tambah loan HR
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action loan dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini membuat pinjaman atau kasbon awal pada employee yang sudah ada agar histori loan mulai hidup dari web.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Employee</span>
          <input
            list="hr-loan-employee-suggestions"
            value={employeeValue}
            onChange={(event) => setEmployeeValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="EMP-202607-0001 | Nama Karyawan"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-loan-employee-suggestions">
            {employeeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Loan Type</span>
          <input
            value={loanType}
            onChange={(event) => setLoanType(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="KASBON"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof loanStatusOptions)[number])}
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
          <span className="font-semibold text-slate-950">Jumlah Pinjaman</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="1500000"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Cicilan Bulanan</span>
          <input
            value={monthlyInstallment}
            onChange={(event) => setMonthlyInstallment(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="250000"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Tanggal Loan</span>
          <input
            type="date"
            value={loanDate}
            onChange={(event) => setLoanDate(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Deskripsi</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan pinjaman, kebutuhan kasbon, atau konteks persetujuan"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Loan aktif dan pending akan langsung tampil di review section HR setelah data berhasil disimpan.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Loan...' : 'Simpan Loan HR'}
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
