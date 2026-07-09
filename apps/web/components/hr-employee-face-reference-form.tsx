'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type HrEmployeeFaceReferenceFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  employeeSuggestions: string[]
  trendSuggestions: string[]
  verifiedCaptureSuggestions: string[]
}

const verificationModes = ['MANUAL_REVIEW', 'CAMERA_CAPTURE'] as const
type VerificationMode = (typeof verificationModes)[number]

function parseEmployeeSuggestion(value: string) {
  const parts = value.split('|').map((item) => item.trim())
  return {
    employeeId: parts[0] ?? '',
    employeeCode: parts[1] ?? '',
    employeeName: parts[2] ?? '',
    employmentStatus: parts[3] ?? '',
    referenceRef: parts[4] ?? '',
      verificationMode:
        parts[5] === 'MANUAL_REVIEW' || parts[5] === 'CAMERA_CAPTURE'
          ? (parts[5] as VerificationMode)
          : ('CAMERA_CAPTURE' as VerificationMode),
  }
}

export function HrEmployeeFaceReferenceForm({
  canUpdate,
  reviewDbReady,
  employeeSuggestions,
  trendSuggestions,
  verifiedCaptureSuggestions,
}: HrEmployeeFaceReferenceFormProps) {
  const router = useRouter()
  const [employeeValue, setEmployeeValue] = useState(employeeSuggestions[0] ?? '')
  const parsedSelection = useMemo(() => parseEmployeeSuggestion(employeeValue), [employeeValue])
  const candidateForEmployee = useMemo(() => {
    const employeeId = parsedSelection.employeeId
    if (!employeeId) {
      return null
    }

    const suggestion = verifiedCaptureSuggestions.find((item) => item.split('|')[0]?.trim() === employeeId)
    if (!suggestion) {
      return null
    }

    const parts = suggestion.split('|').map((item) => item.trim())
    return {
      employeeId: parts[0] ?? '',
      captureRef: parts[1] ?? '',
      verificationMode:
        parts[2] === 'MANUAL_REVIEW' || parts[2] === 'CAMERA_CAPTURE'
          ? (parts[2] as VerificationMode)
          : ('CAMERA_CAPTURE' as VerificationMode),
      reviewedAt: parts[3] ?? '',
    }
  }, [parsedSelection.employeeId, verifiedCaptureSuggestions])
  const trendForEmployee = useMemo(() => {
    const employeeId = parsedSelection.employeeId
    if (!employeeId) {
      return null
    }

    const suggestion = trendSuggestions.find((item) => item.split('|')[0]?.trim() === employeeId)
    if (!suggestion) {
      return null
    }

    const parts = suggestion.split('|').map((item) => item.trim())
    return {
      employeeId: parts[0] ?? '',
      historyCount: parts[1] ?? '0',
      averageScore: parts[2] ?? '0.0',
      latestScore: parts[3] ?? '0',
      bestScore: parts[4] ?? '0',
      latestSource: parts[5] ?? '-',
      driftStatus: parts[6] ?? 'INSUFFICIENT_DATA',
      gapFromAverage: parts[7] ?? '0.0',
      gapFromBest: parts[8] ?? '0',
    }
  }, [parsedSelection.employeeId, trendSuggestions])
  const [verificationMode, setVerificationMode] = useState<VerificationMode>(parsedSelection.verificationMode as VerificationMode)
  const [referenceRef, setReferenceRef] = useState(parsedSelection.referenceRef === '-' ? '' : parsedSelection.referenceRef)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

  useEffect(() => {
    setVerificationMode(
      parsedSelection.verificationMode === 'MANUAL_REVIEW' || parsedSelection.verificationMode === 'CAMERA_CAPTURE'
        ? parsedSelection.verificationMode
        : 'CAMERA_CAPTURE',
    )
    setReferenceRef(parsedSelection.referenceRef === '-' ? '' : parsedSelection.referenceRef)
    setNotes('')
  }, [parsedSelection.referenceRef, parsedSelection.verificationMode])

  useEffect(() => {
    if (!candidateForEmployee) {
      return
    }

    if (!parsedSelection.referenceRef || parsedSelection.referenceRef === '-') {
      setVerificationMode(candidateForEmployee.verificationMode)
      setReferenceRef(candidateForEmployee.captureRef)
    }
  }, [candidateForEmployee, parsedSelection.referenceRef])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    if (!parsedSelection.employeeId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih employee HR yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/employees/face-reference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeId: parsedSelection.employeeId,
          verificationMode,
          referenceRef,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Baseline referensi wajah employee gagal disimpan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Baseline referensi wajah employee berhasil disimpan.',
      })
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Employee Face Reference</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Simpan baseline referensi wajah employee
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi baseline referensi wajah dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menyimpan baseline wajah per employee secara side-car agar matching engine nanti punya referensi awal tanpa mengubah tabel employee inti.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Employee aktif</span>
          <input
            list="hr-employee-face-reference-suggestions"
            value={employeeValue}
            onChange={(event) => setEmployeeValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="21 | EMP-202607-0001 | Nama Karyawan | KARYAWAN | face-emp-001 | CAMERA_CAPTURE"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-employee-face-reference-suggestions">
            {employeeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <div className="rounded-2xl border border-dashed border-line bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Employee terpilih</p>
          <p className="mt-2">Kode: {parsedSelection.employeeCode || '-'}</p>
          <p>Nama: {parsedSelection.employeeName || '-'}</p>
          <p>Status: {parsedSelection.employmentStatus || '-'}</p>
        </div>

        <div className="rounded-2xl border border-dashed border-line bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-950">Baseline saat ini</p>
          <p className="mt-2">Mode: {parsedSelection.verificationMode || '-'}</p>
          <p>Reference Ref: {parsedSelection.referenceRef && parsedSelection.referenceRef !== '-' ? parsedSelection.referenceRef : 'Belum ada'}</p>
        </div>

        <div className="rounded-2xl border border-dashed border-line bg-slate-50 px-4 py-3 text-sm text-slate-700 lg:col-span-2">
          <p className="font-semibold text-slate-950">Trend baseline employee</p>
          {trendForEmployee ? (
            <>
              <p className="mt-2">Riwayat baseline: {trendForEmployee.historyCount}</p>
              <p>Rata-rata score: {trendForEmployee.averageScore}</p>
              <p>Score terbaru: {trendForEmployee.latestScore}</p>
              <p>Score terbaik: {trendForEmployee.bestScore}</p>
              <p>Status drift: {trendForEmployee.driftStatus}</p>
              <p>Gap ke rata-rata: {trendForEmployee.gapFromAverage}</p>
              <p>Gap ke score terbaik: {trendForEmployee.gapFromBest}</p>
              <p>Sumber terbaru: {trendForEmployee.latestSource || '-'}</p>
            </>
          ) : (
            <p className="mt-2">Trend belum tersedia. Setelah baseline manual atau reinforce mulai tercatat, ringkasannya muncul di sini.</p>
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-line bg-slate-50 px-4 py-3 text-sm text-slate-700 lg:col-span-2">
          <p className="font-semibold text-slate-950">Kandidat VERIFIED terbaru</p>
          {candidateForEmployee ? (
            <>
              <p className="mt-2">Capture Ref: {candidateForEmployee.captureRef}</p>
              <p>Mode: {candidateForEmployee.verificationMode}</p>
              <p>Reviewed At: {candidateForEmployee.reviewedAt || '-'}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    setVerificationMode(candidateForEmployee.verificationMode)
                    setReferenceRef(candidateForEmployee.captureRef)
                  }}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  Gunakan Kandidat VERIFIED
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2">Belum ada capture VERIFIED yang bisa dipakai otomatis untuk employee ini.</p>
          )}
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Mode referensi</span>
          <select
            value={verificationMode}
            onChange={(event) => setVerificationMode(event.target.value as VerificationMode)}
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
          <span className="font-semibold text-slate-950">Reference ref</span>
          <input
            value={referenceRef}
            onChange={(event) => setReferenceRef(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="face-EMP-202607-0001-reference"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: capture baseline onboarding, referensi wajah paling terang, atau baseline hasil verifikasi admin HR."
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Employee `ARCHIVED` tetap ditolak di backend. Jika employee belum punya baseline, kandidat `VERIFIED` terbaru akan dipakai sebagai prefill aman.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Baseline...' : 'Simpan Referensi Wajah'}
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
