'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ImportBatchCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
}

const sourceOptions = ['WEB_PSB', 'FINANCE', 'GA'] as const
const scopeSuggestions = [
  'USER_AND_ORDER_SAMPLE',
  'BILLING_SAMPLE',
  'INVENTORY_SAMPLE',
  'HR_SAMPLE',
  'CUSTOMER_REVIEW',
  'SUPPORT_REVIEW',
] as const

export function ImportBatchCreateForm({
  canCreate,
  reviewDbReady,
}: ImportBatchCreateFormProps) {
  const router = useRouter()
  const [sourceSystem, setSourceSystem] = useState<(typeof sourceOptions)[number]>('WEB_PSB')
  const [scope, setScope] = useState('')
  const [sourceFileName, setSourceFileName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null
  )

  const isDisabled = !canCreate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/import/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceSystem,
          scope,
          sourceFileName,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; batchId?: string }
        | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Batch import gagal dibuat.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Batch import berhasil dibuat.',
      })
      setScope('')
      setSourceFileName('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action Import</p>
      <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Buat batch review baru
      </h2>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada Import Center.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi create batch dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menambah batch baru ke `staging_import_batches` sebagai pintu masuk review import dari web.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Source System</span>
          <select
            value={sourceSystem}
            onChange={(event) =>
              setSourceSystem(event.target.value as (typeof sourceOptions)[number])
            }
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {sourceOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Import Scope</span>
          <input
            list="import-scope-suggestions"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="USER_AND_ORDER_SAMPLE"
            required
            disabled={isDisabled}
          />
          <datalist id="import-scope-suggestions">
            {scopeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Nama File Sumber</span>
          <input
            value={sourceFileName}
            onChange={(event) => setSourceFileName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="contoh: review-webpsb-juli.xlsx"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan Batch</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan review batch, konteks import, atau tujuan validasi"
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 text-sm text-mute lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            `batch_code` dibuat otomatis agar konsisten dan tidak bentrok dengan batch lain.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Buat Batch Review'}
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
