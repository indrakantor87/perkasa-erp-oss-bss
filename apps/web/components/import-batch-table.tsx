'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { ImportBatch } from '@/lib/types'

const statusTone: Record<ImportBatch['status'], string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  UPLOADED: 'bg-slate-100 text-slate-700',
  MAPPED: 'bg-blue-50 text-blue-700',
  VALIDATED: 'bg-emerald-50 text-emerald-700',
  IMPORTED: 'bg-violet-50 text-violet-700',
  FAILED: 'bg-rose-50 text-rose-700',
}

function buildBatchSummary(item: ImportBatch) {
  const readyRows = Math.max(item.validRows, 0)
  const invalidRows = Math.max(item.invalidRows, 0)
  const importedRows = Math.max(item.totalRows - invalidRows, 0)

  if (item.status === 'IMPORTED') {
    return {
      headline: `${importedRows.toLocaleString('id-ID')} final / ${invalidRows.toLocaleString('id-ID')} perlu review`,
      detail: `${item.duplicateRows.toLocaleString('id-ID')} duplikat terdeteksi saat review`,
    }
  }

  if (item.status === 'VALIDATED') {
    return {
      headline: `${readyRows.toLocaleString('id-ID')} siap transform / ${invalidRows.toLocaleString('id-ID')} perlu review`,
      detail: `${item.duplicateRows.toLocaleString('id-ID')} duplikat terdeteksi saat review`,
    }
  }

  return {
    headline: `${readyRows.toLocaleString('id-ID')} siap / ${invalidRows.toLocaleString('id-ID')} perlu review`,
    detail: `${item.duplicateRows.toLocaleString('id-ID')} duplikat terdeteksi saat review`,
  }
}

export function ImportBatchTable({
  items,
  canCleanup = false,
  reviewDbReady = false,
}: {
  items: ImportBatch[]
  canCleanup?: boolean
  reviewDbReady?: boolean
}) {
  const router = useRouter()
  const [busyBatchId, setBusyBatchId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  async function handleCleanup(item: ImportBatch) {
    if (item.status === 'IMPORTED') return
    if (busyBatchId === item.id) return

    const confirmed = window.confirm(
      `Anda yakin ingin membersihkan batch ${item.batchCode}?\n\n` +
        `Hanya record staging (batch, actions, transforms, legacy rows) yang akan dihapus. Data bisnis final (customer, order, billing, dll.) TIDAK akan terhapus.\n\n` +
        `Lanjutkan pembersihan permanen?`
    )
    if (!confirmed) return

    setBusyBatchId(item.id)
    setFeedback(null)

    try {
      const response = await fetch(`/api/import/batches/${item.id}`, {
        method: 'DELETE',
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || `Pembersihan batch ${item.batchCode} gagal.`,
        })
        return
      }
      setFeedback({
        tone: 'success',
        message: payload?.message || `Batch ${item.batchCode} berhasil dibersihkan.`,
      })
      router.refresh()
    } finally {
      setBusyBatchId(null)
    }
  }

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-line px-6 py-5">
        <p className="section-title">Daftar batch</p>
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
          Pusat import dan review data
        </h2>
      </div>

      {feedback ? (
        <div
          className={`px-6 py-3 text-sm ${
            feedback.tone === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100'
              : 'bg-rose-50 text-rose-800 border-b border-rose-100'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-slate-50 text-mute">
            <tr>
              <th className="px-6 py-4 font-semibold">Batch</th>
              <th className="px-6 py-4 font-semibold">Sumber</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Baris</th>
              <th className="px-6 py-4 font-semibold">Ringkasan</th>
              <th className="px-6 py-4 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={canCleanup ? 6 : 6}
                  className="px-6 py-10 text-center text-sm text-mute"
                >
                  {reviewDbReady
                    ? 'Tidak ada batch import saat ini. Buat batch baru di formulir di atas untuk memulai.'
                    : 'Mode review database belum aktif. Setelah tersedia, daftar batch akan tampil di sini.'}
                </td>
              </tr>
            ) : null}
            {items.map((item) => {
              const summary = buildBatchSummary(item)
              const eligibleCleanup = canCleanup && item.status !== 'IMPORTED'
              const busy = busyBatchId === item.id

              return (
              <tr key={item.id}>
                <td className="px-6 py-5">
                  <p className="font-semibold text-slate-950">{item.batchCode}</p>
                  <p className="mt-1 text-xs text-mute">{item.scope}</p>
                  <p className="mt-1 text-xs text-mute">
                    File: {item.sourceFileName || '-'}
                  </p>
                </td>
                <td className="px-6 py-5 font-medium text-slate-700">{item.sourceSystem}</td>
                <td className="px-6 py-5">
                  <span className={`badge border-transparent ${statusTone[item.status]}`}>
                    {item.status}
                  </span>
                </td>
                <td className="px-6 py-5 text-slate-700">{item.totalRows.toLocaleString('id-ID')}</td>
                <td className="px-6 py-5 text-slate-700">
                  <div className="space-y-1">
                    <p>{summary.headline}</p>
                    <p className="text-xs text-mute">{summary.detail}</p>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2">
                    <Link href={`/import/${item.id}`} className="text-sm font-semibold text-blue-700">
                      Buka batch
                    </Link>
                    {canCleanup ? (
                      item.status === 'IMPORTED' ? (
                        <span
                          className="badge border-transparent bg-slate-100 text-slate-600"
                          title="Batch berhasil diimport tidak dapat dihapus langsung (butuh approval bisnis terpisah)."
                        >
                          Terkunci
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCleanup(item)}
                          disabled={busy}
                          className="rounded-full bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-slate-300"
                        >
                          {busy ? 'Proses…' : 'Bersihkan'}
                        </button>
                      )
                    ) : null}
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 p-4 md:hidden">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-line bg-slate-50 p-6 text-center text-sm text-mute">
            {reviewDbReady
              ? 'Tidak ada batch import saat ini. Buat batch baru di formulir di atas untuk memulai.'
              : 'Mode review database belum aktif. Setelah tersedia, daftar batch akan tampil di sini.'}
          </div>
        ) : null}
        {items.map((item) => {
          const summary = buildBatchSummary(item)
          const eligibleCleanup = canCleanup && item.status !== 'IMPORTED'
          const busy = busyBatchId === item.id

          return (
          <article key={item.id} className="rounded-2xl border border-line bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-950">{item.batchCode}</p>
                <p className="mt-1 text-xs text-mute">{item.sourceSystem} • {item.scope}</p>
                <p className="mt-1 text-xs text-mute">File: {item.sourceFileName || '-'}</p>
              </div>
              <span className={`badge border-transparent ${statusTone[item.status]}`}>{item.status}</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-mute">{item.note}</p>
            <div className="mt-4 flex items-center justify-between text-xs font-medium text-slate-600">
              <span>{summary.headline}</span>
              <Link href={`/import/${item.id}`} className="font-semibold text-blue-700">
                Detail
              </Link>
            </div>
            <p className="mt-2 text-xs text-mute">{summary.detail}</p>
            {eligibleCleanup ? (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => handleCleanup(item)}
                  disabled={busy}
                  className="w-full rounded-full bg-rose-700 px-4 py-2 text-xs font-semibold text-white disabled:bg-slate-300"
                >
                  {busy ? 'Memproses pembersihan…' : `Bersihkan batch ${item.batchCode}`}
                </button>
              </div>
            ) : canCleanup && item.status === 'IMPORTED' ? (
              <p className="mt-4 rounded-full border border-slate-200 bg-white px-4 py-2 text-center text-xs font-semibold text-slate-600">
                Batch IMPORTED terkunci (butuh approval bisnis terpisah untuk hapus).
              </p>
            ) : null}
          </article>
        )})}
      </div>
    </div>
  )
}
