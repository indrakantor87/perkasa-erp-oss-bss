'use client'

import type { ChangeEvent, FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ImportBatchUploadFormProps = {
  batchId: string
  batchCode: string
  sourceFileName?: string | null
  hasExistingRows: boolean
  canUpload: boolean
  reviewDbReady: boolean
}

export function ImportBatchUploadForm({
  batchId,
  batchCode,
  sourceFileName,
  hasExistingRows,
  canUpload,
  reviewDbReady,
}: ImportBatchUploadFormProps) {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null
  )

  const isDisabled = !canUpload || !reviewDbReady || hasExistingRows || submitting

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

    setSubmitting(true)
    setFeedback(null)

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

      setFeedback({
        tone: 'success',
        message: payload?.message || 'File sumber berhasil diunggah ke batch.',
      })
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

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
        File sumber saat ini: <span className="font-semibold text-slate-950">{sourceFileName || '-'}</span>
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
