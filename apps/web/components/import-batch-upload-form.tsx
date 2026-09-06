'use client'

import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BATCH_SCOPE_NAMES } from '@/lib/import-batch-capabilities'

type FeedbackTone = 'success' | 'error' | 'warning'

type ImportBatchUploadFormProps = {
  batchId: string
  batchCode: string
  sourceFileName?: string | null
  hasExistingRows: boolean
  canUpload: boolean
  reviewDbReady: boolean
  batchScope?: string
}

const ALLOWED_EXT = ['.xlsx', '.xls', '.csv', '.json'] as const
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function ImportBatchUploadForm({
  batchId,
  batchCode,
  sourceFileName,
  hasExistingRows,
  canUpload,
  reviewDbReady,
  batchScope,
}: ImportBatchUploadFormProps) {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null)

  const isDisabled = !canUpload || !reviewDbReady || hasExistingRows || submitting

  const normalizedScope = String(batchScope ?? '').trim().toUpperCase()
  const hasValidScope = batchScope && (BATCH_SCOPE_NAMES as readonly string[]).includes(normalizedScope)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setFeedback(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedFile || isDisabled) {
      return
    }

    const fname = selectedFile.name.toLowerCase()
    const extIdx = fname.lastIndexOf('.')
    const ext = extIdx >= 0 ? fname.slice(extIdx) : ''
    if (!(ALLOWED_EXT as readonly string[]).includes(ext)) {
      setFeedback({
        tone: 'error',
        message: 'Format file tidak didukung. Pilih file XLSX, XLS, CSV, atau JSON.',
      })
      return
    }

    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setFeedback({
        tone: 'error',
        message: 'Ukuran file melebihi batas maksimal 10MB. Kompres atau pecah file jika diperlukan.',
      })
      return
    }

    const hasPathSep = selectedFile.name.includes('/') || selectedFile.name.includes('\\')
    if (hasPathSep) {
      setFeedback({
        tone: 'warning',
        message: 'Nama file mengandung path separator. Nama akan disanitasi otomatis di server.',
      })
    } else {
      setFeedback(null)
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch(`/api/import/batches/${batchId}`, {
        method: 'POST',
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Upload file sumber gagal.',
        })
        return
      }

      const msg = payload?.message || 'File sumber berhasil diunggah ke batch.'
      const prefix = hasPathSep
        ? 'PERHATIAN: Nama file mengandung path separator dan telah disanitasi. '
        : ''
      setFeedback({ tone: 'success', message: prefix + msg })
      setSelectedFile(null)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Upload sumber</p>
      <h3 className="mt-3 text-lg font-semibold text-slate-950">Lampirkan file batch</h3>
      <p className="mt-2 text-sm leading-6 text-mute">
        {!canUpload
          ? 'Role aktif belum memiliki izin upload pada Import Center.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi upload file dinonaktifkan agar tidak menyimpan file ke mode mock.'
            : hasExistingRows
              ? `Batch ${batchCode} sudah memiliki row staging. Upload ulang dikunci agar review tetap non-destruktif, jadi gunakan batch baru untuk file revisi.`
              : `File akan disimpan lokal untuk batch ${batchCode}, lalu parser akan mencoba memuat row staging otomatis sesuai scope batch.`}
      </p>

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 space-y-1">
        <div>
          File sumber saat ini: <span className="font-semibold text-slate-950">{sourceFileName || '-'}</span>
        </div>
        {hasValidScope ? (
          <div>
            <a
            href={`/api/import/template?scope=${encodeURIComponent(normalizedScope)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-700 underline decoration-dotted underline-offset-2 hover:text-sky-900"
          >
            Butuh template? Unduh template XLSX {normalizedScope}
          </a>
          </div>
        ) : null}
      </div>

        {hasExistingRows ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Batch ini sudah berisi staging hasil upload sebelumnya. Untuk menjaga histori review dan transform, file baru harus masuk ke batch baru, bukan menimpa batch lama.
          </div>
        ) : null}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="rounded-2xl border border-line bg-white px-4 py-3 text-xs leading-5 text-mute">
          Gunakan `JSON` terstruktur atau workbook `XLSX/XLS` multi-sheet dengan nama section sesuai scope batch.
          `CSV` hanya aman untuk scope satu section seperti review customer atau support.
        </div>

        <label className="block space-y-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Pilih file</span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv,.json"
            onChange={handleFileChange}
            disabled={isDisabled}
            className="block w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-semibold file:text-white disabled:cursor-not-allowed"
          />
        </label>

        {feedback ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : feedback.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 text-sm text-mute sm:flex-row sm:items-center sm:justify-between">
          <span>{selectedFile ? `Siap upload: ${selectedFile.name}` : 'Belum ada file dipilih.'}</span>
          <button
            type="submit"
            disabled={isDisabled || !selectedFile}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Mengunggah...' : hasExistingRows ? 'Batch Sudah Terkunci' : 'Upload File Sumber'}
          </button>
        </div>
      </form>
    </section>
  )
}
