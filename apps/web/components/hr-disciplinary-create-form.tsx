'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type HrDisciplinaryCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  employeeSuggestions: string[]
  initialEmployeeId?: number
  initialIncidentDate?: string
}

const ALLOWED_SP_LEVELS = [
  { value: 'PEMBINAAN', label: 'Pembinaan' },
  { value: 'PERINGATAN_LISAN', label: 'Peringatan Lisan' },
  { value: 'SP1', label: 'SP 1 (Surat Peringatan I)' },
  { value: 'SP2', label: 'SP 2 (Surat Peringatan II)' },
  { value: 'SP3', label: 'SP 3 (Surat Peringatan III)' },
] as const

const ALLOWED_CREATE_STATUSES = [
  { value: 'DRAFT', label: 'Draft (belum dikirim)' },
  { value: 'PENDING_SUPERVISOR_APPROVAL', label: 'Menunggu Approval Supervisor' },
  { value: 'ACTIVE', label: 'Langsung Aktif (HR Executive)' },
] as const

type SpLevelValue = (typeof ALLOWED_SP_LEVELS)[number]['value']
type CreateStatusValue = (typeof ALLOWED_CREATE_STATUSES)[number]['value']

function extractEmployeeCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function toDateInputDefault(raw?: string) {
  if (raw) {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10)
    }
  }
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function HrDisciplinaryCreateForm({
  canCreate,
  reviewDbReady,
  employeeSuggestions,
  initialEmployeeId,
  initialIncidentDate,
}: HrDisciplinaryCreateFormProps) {
  const router = useRouter()
  const defaultIncidentDate = toDateInputDefault(initialIncidentDate)

  const initialEmployeeValue =
    typeof initialEmployeeId === 'number' && initialEmployeeId > 0
      ? employeeSuggestions.find((item) => {
          const match = item.match(/emp-id:(\d+)/i)
          return match ? Number(match[1]) === initialEmployeeId : false
        }) || ''
      : ''

  const [employeeValue, setEmployeeValue] = useState(initialEmployeeValue || employeeSuggestions[0] || '')
  const [spLevel, setSpLevel] = useState<SpLevelValue>('PEMBINAAN')
  const [incidentDate, setIncidentDate] = useState(defaultIncidentDate)
  const [effectiveFrom, setEffectiveFrom] = useState(defaultIncidentDate)
  const [effectiveTo, setEffectiveTo] = useState('')
  const [violationClause, setViolationClause] = useState('')
  const [violationDetail, setViolationDetail] = useState('')
  const [actionTaken, setActionTaken] = useState('')
  const [coachingNotes, setCoachingNotes] = useState('')
  const [followUpDate, setFollowUpDate] = useState('')
  const [status, setStatus] = useState<CreateStatusValue>('DRAFT')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  useEffect(() => {
    if (initialEmployeeValue) {
      setEmployeeValue(initialEmployeeValue)
    }
  }, [initialEmployeeValue])

  useEffect(() => {
    if (initialIncidentDate) {
      const normalized = toDateInputDefault(initialIncidentDate)
      setIncidentDate(normalized)
      if (!effectiveTo) {
        setEffectiveFrom(normalized)
      }
    }
  }, [initialIncidentDate])

  function clearWritableFields() {
    setViolationClause('')
    setViolationDetail('')
    setActionTaken('')
    setCoachingNotes('')
    setEffectiveTo('')
    setFollowUpDate('')
    setSpLevel('PEMBINAAN')
    setStatus('DRAFT')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const employeeCode = extractEmployeeCode(employeeValue)
    if (!employeeCode) {
      setFeedback({ tone: 'error', message: 'Pilih karyawan yang valid dari daftar saran.' })
      return
    }

    if (!violationClause.trim()) {
      setFeedback({ tone: 'error', message: 'Pasal/Point Peraturan pelanggaran wajib diisi.' })
      return
    }

    if (!violationDetail.trim()) {
      setFeedback({ tone: 'error', message: 'Kronologis detail pelanggaran wajib diisi.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      let employeeId: number | undefined

      const match = employeeValue.match(/emp-id:(\d+)/i)
      if (match) {
        employeeId = Number(match[1])
      } else {
        const lookup = await fetch(`/api/hr/employees?search=${encodeURIComponent(employeeCode)}&limit=1`)
        const lookupPayload = (await lookup.json().catch(() => null)) as {
          data?: Array<{ id: number; employee_code?: string; code?: string }>
          rows?: Array<{ id: number; employee_code?: string; code?: string }>
        } | null
        const items = lookupPayload?.data || lookupPayload?.rows || []
        employeeId = items[0]?.id
      }

      if (!employeeId || Number.isNaN(employeeId)) {
        setFeedback({
          tone: 'error',
          message: `Tidak dapat menemukan ID karyawan untuk kode ${employeeCode}. Coba pilih dari daftar saran.`,
        })
        return
      }

      const payloadBody: Record<string, unknown> = {
        employeeId,
        spLevel,
        incidentDate,
        violationClause: violationClause.trim(),
        violationDetail: violationDetail.trim(),
        status,
      }

      if (effectiveFrom) payloadBody.effectiveFrom = effectiveFrom
      if (effectiveTo) payloadBody.effectiveTo = effectiveTo
      if (actionTaken.trim()) payloadBody.actionTaken = actionTaken.trim()
      if (coachingNotes.trim()) payloadBody.coachingNotes = coachingNotes.trim()
      if (followUpDate) payloadBody.followUpDate = followUpDate

      const response = await fetch('/api/hr/disciplinary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadBody),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string; id?: number } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Sanksi SP gagal disimpan.' })
        return
      }

      setFeedback({
        tone: 'success',
        message:
          payload?.message ||
          `Sanksi ${spLevel} berhasil disimpan${payload?.id ? ` (ID: ${payload.id}).` : '.'}`,
      })
      clearWritableFields()
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action HR</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Buat Sanksi / Pembinaan Karyawan
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi pembuatan sanksi dinonaktifkan agar tidak menulis ke mock.'
            : 'Input catatan sanksi atau pembinaan formal kepada karyawan. Semua mutasi akan dicatat di audit log HR.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">
            Karyawan <span className="text-danger">*</span>
          </span>
          <input
            list="hr-disciplinary-employee-suggestions"
            value={employeeValue}
            onChange={(event) => setEmployeeValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="EMP-202607-0001 | Nama Karyawan"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-disciplinary-employee-suggestions">
            {employeeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tingkat Sanksi</span>
          <select
            value={spLevel}
            onChange={(event) => setSpLevel(event.target.value as SpLevelValue)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {ALLOWED_SP_LEVELS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status Draft</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as CreateStatusValue)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {ALLOWED_CREATE_STATUSES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">
            Tanggal Kejadian <span className="text-danger">*</span>
          </span>
          <input
            type="date"
            value={incidentDate}
            onChange={(event) => {
              setIncidentDate(event.target.value)
              if (!effectiveTo) setEffectiveFrom(event.target.value)
            }}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Berlaku Mulai</span>
          <input
            type="date"
            value={effectiveFrom}
            onChange={(event) => setEffectiveFrom(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Berlaku Sampai (opsional)</span>
          <input
            type="date"
            value={effectiveTo}
            onChange={(event) => setEffectiveTo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tgl Tindak Lanjut Coaching (opsional)</span>
          <input
            type="date"
            value={followUpDate}
            onChange={(event) => setFollowUpDate(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">
            Pasal / Point Peraturan <span className="text-danger">*</span>
          </span>
          <input
            type="text"
            value={violationClause}
            onChange={(event) => setViolationClause(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: Pasal 3.1.a - Keterlambatan absen > 30 menit"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">
            Kronologis Pelanggaran <span className="text-danger">*</span>
          </span>
          <textarea
            value={violationDetail}
            onChange={(event) => setViolationDetail(event.target.value)}
            rows={4}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Deskripsikan kronologis kejadian, waktu, tempat, dan bukti pendukung."
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Sanksi / Tindakan Diambil (opsional)</span>
          <input
            type="text"
            value={actionTaken}
            onChange={(event) => setActionTaken(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: Potongan gaji 5% + pembinaan 1x 30 menit"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan Coaching & Pembinaan (opsional)</span>
          <textarea
            value={coachingNotes}
            onChange={(event) => setCoachingNotes(event.target.value)}
            rows={3}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Rencana coaching, improvement point, dan target evaluasi 30/60/90 hari."
            disabled={isDisabled}
          />
        </label>

        <div className="flex items-center justify-between gap-4 lg:col-span-2">
          <div className="min-h-[24px] text-sm">
            {feedback ? (
              <span
                className={
                  feedback.tone === 'success'
                    ? 'font-medium text-emerald-700'
                    : 'font-medium text-danger'
                }
              >
                {feedback.message}
              </span>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Sanksi'}
          </button>
        </div>
      </form>
    </section>
  )
}
