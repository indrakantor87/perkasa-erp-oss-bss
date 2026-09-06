'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BATCH_SCOPE_NAMES, getBatchScopeCapability } from '@/lib/import-batch-capabilities'
import {
  getScopeContract,
  type BatchScopeName,
} from '@/lib/import-column-contract'

type ImportBatchCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
}

type FeedbackTone = 'success' | 'error' | 'warning'

const sourceOptions = ['WEB_PSB', 'FINANCE', 'GA'] as const
const scopeSuggestions: readonly BatchScopeName[] = BATCH_SCOPE_NAMES

const allowedFileExts = new Set(['xlsx', 'xls', 'csv', 'json'])

function normalizeScopeClient(value: string): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')
}

const typeBadge: Record<string, string> = {
  string: 'bg-sky-100 text-sky-700',
  number: 'bg-indigo-100 text-indigo-700',
  integer: 'bg-violet-100 text-violet-700',
  boolean: 'bg-amber-100 text-amber-700',
  date: 'bg-emerald-100 text-emerald-700',
}

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
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(
    null
  )

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const normalizedScope = useMemo(() => normalizeScopeClient(scope), [scope])
  const scopeContract = useMemo(
    () =>
      BATCH_SCOPE_NAMES.includes(normalizedScope as BatchScopeName)
        ? getScopeContract(normalizedScope as BatchScopeName)
        : undefined,
    [normalizedScope]
  )
  const capabilityDisplay = scopeContract
    ? getBatchScopeCapability(normalizedScope as BatchScopeName)?.displayName ??
      (normalizedScope as BatchScopeName)
    : null
  const templateBtnDisabled =
    !scopeContract || isDisabled

  async function handleDownloadTemplate() {
    if (!scopeContract) return
    try {
      const url = `/api/import/template?scope=${encodeURIComponent(scopeContract.scope)}`
      window.location.assign(url)
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Gagal generate template untuk scope ini.',
      })
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const normalized = normalizeScopeClient(scope)

    if (!BATCH_SCOPE_NAMES.includes(normalized as BatchScopeName)) {
      setFeedback({
        tone: 'error',
        message:
          'Pilih scope dari 6 pilihan canonical (USER_AND_ORDER, BILLING, INVENTORY, HR, CUSTOMER_REVIEW, SUPPORT_REVIEW). Scope custom tidak didukung untuk batch baru.',
      })
      return
    }

    if (normalized.endsWith('_SAMPLE')) {
      setFeedback({
        tone: 'error',
        message:
          "Scope dengan suffix '_SAMPLE' adalah internal legacy parser alias. JANGAN gunakan untuk membuat batch baru. Pilih scope canonical tanpa suffix.",
      })
      return
    }

    const srcFileName = sourceFileName.trim()
    if (srcFileName) {
      const parts = srcFileName.toLowerCase().split('.')
      const ext = parts.length > 1 ? (parts.pop() ?? '') : ''
      if (ext && !allowedFileExts.has(ext)) {
        setFeedback({
          tone: 'warning',
          message:
            'Nama file sumber berekstensi diluar XLSX/XLS/CSV/JSON. Upload hanya menerima 4 ekstensi tersebut. Lanjutkan jika ini hanya placeholder label (bukan upload langsung).',
        })
      }
    } else {
      setFeedback(null)
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/import/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceSystem,
          scope: normalized,
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
          <span className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-950">Import Scope</span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={templateBtnDisabled}
              className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ⬇ Template XLSX
            </button>
          </span>
          <input
            list="import-scope-suggestions"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="USER_AND_ORDER"
            required
            disabled={isDisabled}
          />
          <datalist id="import-scope-suggestions">
            {scopeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        {!scopeContract ? (
          <p className="lg:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-3 text-xs italic text-mute">
            Pilih scope canonical dari suggestion di atas untuk melihat kolom dan sheet yang
            diperlukan, serta untuk mengaktifkan tombol unduh template.
          </p>
        ) : (
          <section className="lg:col-span-2 mt-1 space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">
                📋 Informasi Kolom: {capabilityDisplay}
              </p>
              <span className="rounded-full bg-slate-200/70 px-3 py-1 text-xs text-mute">
                {scopeContract.sheets.length} sheets ·{' '}
                {scopeContract.sheets.reduce(
                  (acc, s) =>
                    acc + s.columns.filter((c2) => c2.templateHeader).length,
                  0
                )}{' '}
                kolom
              </span>
            </header>

            <div className="grid gap-3">
              {scopeContract.sheets.map((sheet, idx) => {
                const visibleCols = sheet.columns.filter((c) => c.templateHeader)
                const reqCount = visibleCols.filter((c) => c.required).length
                return (
                  <details
                    key={sheet.key}
                    open={idx === 0}
                    className="rounded-xl border border-line bg-white p-3"
                  >
                    <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                      Sheet:{' '}
                      <code className="rounded bg-slate-100 px-2 py-0.5 text-xs">
                        {sheet.key}
                      </code>
                      <span className="text-mute text-[11px] italic">
                        {sheet.displayName}
                      </span>
                      <span className="ml-auto rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
                        {reqCount} wajib
                      </span>
                    </summary>
                    <div className="mt-3 overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-xs">
                        <thead className="bg-slate-50">
                          <tr className="text-slate-500">
                            <th className="px-2 py-2 text-left font-semibold">Column</th>
                            <th className="px-2 py-2 text-left font-semibold">Required</th>
                            <th className="px-2 py-2 text-left font-semibold">Type</th>
                            <th className="px-2 py-2 text-left font-semibold">
                              Format &amp; Keterangan
                            </th>
                            <th className="px-2 py-2 text-left font-semibold">
                              Contoh Format
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {visibleCols.map((c) => (
                            <tr key={c.parserField}>
                              <td className="px-2 py-1.5 align-top">
                                <code className="rounded bg-slate-50 px-1 py-0.5 font-mono text-[11px]">
                                  {c.parserField}
                                </code>
                              </td>
                              <td className="px-2 py-1.5 align-top">
                                {c.required ? (
                                  <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                                    WAJIB
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-slate-500">
                                    Opsional
                                  </span>
                                )}
                              </td>
                              <td className="px-2 py-1.5 align-top">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                                    typeBadge[c.type] ??
                                    'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {c.type}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 align-top">
                                <div className="space-y-0.5">
                                  <p className="text-slate-700">{c.description}</p>
                                  {c.format ? (
                                    <p className="italic text-mute">Format: {c.format}</p>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-2 py-1.5 align-top">
                                <code className="whitespace-nowrap rounded bg-slate-50 px-1 py-0.5 text-[10px] text-slate-500">
                                  {c.example}
                                </code>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )
              })}
            </div>
          </section>
        )}

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
              : feedback.tone === 'warning'
                ? 'border-amber-200 bg-amber-50 text-amber-700'
                : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </section>
  )
}
