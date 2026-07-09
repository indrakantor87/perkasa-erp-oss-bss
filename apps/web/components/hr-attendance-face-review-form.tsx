'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type HrAttendanceFaceReviewFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  reviewSuggestions: string[]
}

const decisionOptions = ['PENDING_REVIEW', 'VERIFIED', 'REJECTED'] as const

function parseReviewSuggestion(value: string) {
  const parts = value.split('|').map((item) => item.trim())
  return {
    faceLogId: parts[0] ?? '',
    employeeCode: parts[1] ?? '',
    status: parts[2] ?? '',
    captureRef: parts[3] ?? '',
    verificationMode: parts[4] ?? '',
    matchScore: parts[5] ?? '0',
    confidenceBand: parts[6] ?? 'LOW',
    recommendation: parts[7] ?? 'PENDING_REVIEW',
    autoReviewEligible: parts[8] ?? 'Tidak',
    baselineReferenceRef: parts[9] ?? '-',
    baselineMatchScore: parts[10] ?? '0',
    baselineMatchBand: parts[11] ?? 'NO_BASELINE',
    baselineMatchOutcome: parts[12] ?? 'NO_BASELINE',
    recommendationReason: parts.slice(13).join(' | ') || '',
  }
}

export function HrAttendanceFaceReviewForm({
  canUpdate,
  reviewDbReady,
  reviewSuggestions,
}: HrAttendanceFaceReviewFormProps) {
  const router = useRouter()
  const [reviewValue, setReviewValue] = useState(reviewSuggestions[0] ?? '')
  const [decisionStatus, setDecisionStatus] = useState<(typeof decisionOptions)[number]>('VERIFIED')
  const [reviewNotes, setReviewNotes] = useState('')
  const [applyBaselineFeedback, setApplyBaselineFeedback] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const parsed = parseReviewSuggestion(reviewValue)
  const isDisabled = !canUpdate || !reviewDbReady || submitting

  useEffect(() => {
    if (
      parsed.recommendation === 'PENDING_REVIEW' ||
      parsed.recommendation === 'VERIFIED' ||
      parsed.recommendation === 'REJECTED'
    ) {
      setDecisionStatus(parsed.recommendation)
    }
  }, [parsed.recommendation])

  useEffect(() => {
    setApplyBaselineFeedback(parsed.baselineMatchOutcome === 'MATCH')
  }, [parsed.faceLogId, parsed.baselineMatchOutcome])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    if (!parsed.faceLogId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih log review wajah yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/attendance/face/review', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faceLogId: parsed.faceLogId,
          decisionStatus,
          reviewNotes,
          applyBaselineFeedback,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Review verifikasi wajah gagal disimpan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Review verifikasi wajah berhasil disimpan.',
      })
      setReviewNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Face Review</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Review verifikasi wajah attendance
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi review verifikasi wajah dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini memproses antrean verifikasi wajah menjadi VERIFIED, REJECTED, atau dikembalikan ke PENDING_REVIEW sebagai placeholder workflow sebelum matching otomatis aktif.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Log verifikasi wajah</span>
          <input
            list="hr-attendance-face-review-suggestions"
            value={reviewValue}
            onChange={(event) => setReviewValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | EMP-202607-0001 | PENDING_REVIEW | face-EMP-... | CAMERA_CAPTURE | 82 | VERIFIED | alasan"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-attendance-face-review-suggestions">
            {reviewSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <div className="grid gap-1 text-xs text-mute sm:grid-cols-2">
            <span>Employee: {parsed.employeeCode || '-'}</span>
            <span>Status saat ini: {parsed.status || '-'}</span>
            <span>Mode: {parsed.verificationMode || '-'}</span>
            <span>Capture Ref: {parsed.captureRef || '-'}</span>
            <span>Skor placeholder: {parsed.matchScore || '0'}</span>
            <span>Confidence band: {parsed.confidenceBand || '-'}</span>
            <span>Baseline ref: {parsed.baselineReferenceRef || '-'}</span>
            <span>Baseline score: {parsed.baselineMatchScore || '0'}</span>
            <span>Baseline band: {parsed.baselineMatchBand || '-'}</span>
            <span>Baseline outcome: {parsed.baselineMatchOutcome || '-'}</span>
            <span>Rekomendasi: {parsed.recommendation || '-'}</span>
            <span>Auto-review aman: {parsed.autoReviewEligible || 'Tidak'}</span>
          </div>
          <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {parsed.recommendationReason || 'Belum ada alasan rekomendasi.'}
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Keputusan review</span>
          <select
            value={decisionStatus}
            onChange={(event) => setDecisionStatus(event.target.value as (typeof decisionOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {decisionOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Catatan review</span>
          <textarea
            value={reviewNotes}
            onChange={(event) => setReviewNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Isi alasan jika ditolak, atau catatan verifikasi bila perlu."
            disabled={isDisabled}
          />
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={applyBaselineFeedback}
            onChange={(event) => setApplyBaselineFeedback(event.target.checked)}
            disabled={isDisabled || parsed.baselineMatchOutcome !== 'MATCH' || decisionStatus !== 'VERIFIED'}
            className="mt-1 h-4 w-4 rounded border-line text-slate-950 focus:ring-slate-400"
          />
          <span>
            <span className="block font-semibold text-slate-950">Perkuat baseline employee bila aman</span>
            <span className="mt-1 block">
              {parsed.baselineMatchOutcome === 'MATCH'
                ? 'Saat review disimpan sebagai VERIFIED, capture ini boleh memperbarui baseline employee aktif secara terkontrol.'
                : 'Opsi ini aktif hanya bila outcome baseline adalah MATCH dan keputusan review adalah VERIFIED.'}
            </span>
          </span>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Status `REJECTED` sebaiknya disertai catatan. Jika outcome baseline `RETAKE`, item akan masuk antrean retake operasional secara otomatis.
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isDisabled}
              onClick={() =>
                setDecisionStatus(
                  parsed.recommendation === 'PENDING_REVIEW' ||
                    parsed.recommendation === 'VERIFIED' ||
                    parsed.recommendation === 'REJECTED'
                    ? (parsed.recommendation as (typeof decisionOptions)[number])
                    : 'PENDING_REVIEW',
                )
              }
              className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              Gunakan Rekomendasi
            </button>
            <button
              type="button"
              disabled={isDisabled || parsed.autoReviewEligible !== 'Ya'}
              onClick={() => setDecisionStatus('VERIFIED')}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              Auto-Verify Aman
            </button>
            <button
              type="submit"
              disabled={isDisabled}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? 'Menyimpan Review...' : 'Simpan Review Wajah'}
            </button>
          </div>
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
