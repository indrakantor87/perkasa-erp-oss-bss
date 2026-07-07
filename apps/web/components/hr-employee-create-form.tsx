'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type HrEmployeeCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
}

export function HrEmployeeCreateForm({ canCreate, reviewDbReady }: HrEmployeeCreateFormProps) {
  const router = useRouter()
  const [branchCode, setBranchCode] = useState('')
  const [divisionCode, setDivisionCode] = useState('')
  const [fullName, setFullName] = useState('')
  const [positionName, setPositionName] = useState('')
  const [employmentStatus, setEmploymentStatus] = useState('KARYAWAN')
  const [joinDate, setJoinDate] = useState('')
  const [baseSalary, setBaseSalary] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          branchCode,
          divisionCode,
          fullName,
          positionName,
          employmentStatus,
          joinDate: joinDate || null,
          baseSalary,
          phone,
          whatsapp,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Employee HR gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Employee HR berhasil disimpan.',
      })
      setBranchCode('')
      setDivisionCode('')
      setFullName('')
      setPositionName('')
      setEmploymentStatus('KARYAWAN')
      setJoinDate('')
      setBaseSalary('')
      setPhone('')
      setWhatsapp('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action HR</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tambah employee HR
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action HR dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menambah employee master awal agar absensi, payroll, dan loan nantinya punya fondasi data yang bisa langsung dipakai.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kode Cabang</span>
          <input
            value={branchCode}
            onChange={(event) => setBranchCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Opsional, mis. PATI"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kode Divisi</span>
          <input
            value={divisionCode}
            onChange={(event) => setDivisionCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Opsional, mis. SUPPORT"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Nama Karyawan</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama lengkap karyawan"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Jabatan</span>
          <input
            value={positionName}
            onChange={(event) => setPositionName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Teknisi, Admin, Collector, dll"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status Karyawan</span>
          <input
            value={employmentStatus}
            onChange={(event) => setEmploymentStatus(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="KARYAWAN / KONTRAK / MAGANG"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tanggal Join</span>
          <input
            type="date"
            value={joinDate}
            onChange={(event) => setJoinDate(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Gaji Pokok</span>
          <input
            value={baseSalary}
            onChange={(event) => setBaseSalary(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="3500000"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">No. HP</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="08xxxxxxxxxx"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">WhatsApp</span>
          <input
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="08xxxxxxxxxx"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Cabang dan divisi boleh dikosongkan dulu, tetapi kalau diisi harus cocok dengan master review DB.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Employee...' : 'Simpan Employee HR'}
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
