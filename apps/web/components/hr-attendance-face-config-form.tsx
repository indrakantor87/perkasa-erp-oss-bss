'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type HrAttendanceFaceConfigFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  initialConfig?: {
    isRequired: boolean
    verificationMode: string
    autoVerifyHighConfidence: boolean
    autoVerifyMinScore: number
    notes: string
  } | null
}

const verificationModes = ['MANUAL_REVIEW', 'CAMERA_CAPTURE'] as const

export function HrAttendanceFaceConfigForm({
  canUpdate,
  reviewDbReady,
  initialConfig,
}: HrAttendanceFaceConfigFormProps) {
  const router = useRouter()
  const [isRequired, setIsRequired] = useState(initialConfig?.isRequired ?? false)
  const [verificationMode, setVerificationMode] = useState(initialConfig?.verificationMode ?? 'MANUAL_REVIEW')
  const [autoVerifyHighConfidence, setAutoVerifyHighConfidence] = useState(initialConfig?.autoVerifyHighConfidence ?? false)
  const [autoVerifyMinScore, setAutoVerifyMinScore] = useState(String(initialConfig?.autoVerifyMinScore ?? 85))
  const [notes, setNotes] = useState(initialConfig?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/attendance/face', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isRequired,
          verificationMode,
          autoVerifyHighConfidence,
          autoVerifyMinScore,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Konfigurasi face attendance gagal disimpan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Konfigurasi face attendance berhasil diperbarui.',
      })
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Attendance Face</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Atur fondasi verifikasi wajah
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi konfigurasi face attendance dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menyiapkan mode verifikasi wajah attendance sebagai fondasi sebelum recognition engine penuh diaktifkan.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Mode verifikasi</span>
          <select
            value={verificationMode}
            onChange={(event) => setVerificationMode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {verificationModes.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Wajib verifikasi wajah</span>
          <select
            value={isRequired ? '1' : '0'}
            onChange={(event) => setIsRequired(event.target.value === '1')}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            <option value="0">Opsional dulu</option>
            <option value="1">Wajib saat check-in</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Auto-verify confidence tinggi</span>
          <select
            value={autoVerifyHighConfidence ? '1' : '0'}
            onChange={(event) => setAutoVerifyHighConfidence(event.target.value === '1')}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            <option value="0">Tetap manual review</option>
            <option value="1">Izinkan auto-verify aman</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Minimum score auto-verify</span>
          <input
            type="number"
            min="0"
            max="100"
            value={autoVerifyMinScore}
            onChange={(event) => setAutoVerifyMinScore(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: sementara gunakan capture browser/manual review sebelum recognition engine penuh."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Mode `CAMERA_CAPTURE` menyiapkan alur capture browser. Auto-verify hanya dipakai untuk capture confidence tinggi sesuai threshold yang Anda tetapkan.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Face Config...' : 'Simpan Face Attendance'}
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
