'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ImportBatch } from '@/lib/types'

type ImportBatchActionPanelProps = {
  batchId: string
  batch: ImportBatch
  canApprove: boolean
  reviewDbReady: boolean
}

const transformStages = [
  {
    stage: '01',
    title: 'Tahap 1',
    detail: 'Inventory dan HR dasar',
  },
  {
    stage: '02',
    title: 'Tahap 2',
    detail: 'Customer, address, order, subscription',
  },
  {
    stage: '03',
    title: 'Tahap 3',
    detail: 'Work order dan support',
  },
  {
    stage: '04',
    title: 'Tahap 4',
    detail: 'Billing, payment, collection',
  },
] as const

export function ImportBatchActionPanel({
  batchId,
  batch,
  canApprove,
  reviewDbReady,
}: ImportBatchActionPanelProps) {
  const router = useRouter()
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(
    null
  )

  const validationDisabled = !canApprove || !reviewDbReady || busyAction !== null
  const transformDisabled =
    !canApprove ||
    !reviewDbReady ||
    busyAction !== null ||
    (batch.status !== 'VALIDATED' && batch.status !== 'IMPORTED')

  async function runValidate() {
    if (validationDisabled) return

    setBusyAction('validate')
    setFeedback(null)

    try {
      const response = await fetch(`/api/import/batches/${batchId}/validate`, {
        method: 'POST',
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Validasi batch gagal dijalankan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Validasi batch berhasil dijalankan.',
      })
      router.refresh()
    } finally {
      setBusyAction(null)
    }
  }

  async function runTransform(stage: (typeof transformStages)[number]['stage']) {
    if (transformDisabled) return

    setBusyAction(`transform-${stage}`)
    setFeedback(null)

    try {
      const response = await fetch(`/api/import/batches/${batchId}/transform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || `Transform tahap ${stage} gagal dijalankan.`,
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || `Transform tahap ${stage} berhasil dijalankan.`,
      })
      router.refresh()
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Approval & Transform</p>
      <h3 className="mt-3 text-lg font-semibold text-slate-950">Validasi dan eksekusi transform</h3>
      <p className="mt-2 text-sm leading-6 text-mute">
        {!canApprove
          ? 'Role aktif belum memiliki izin approve pada Import Center.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi validasi dan transform dinonaktifkan.'
            : 'Validasi akan menilai kesiapan row staging. Tombol transform menjalankan baseline SQL review sampai tahap yang dipilih dari konteks batch ini.'}
      </p>

      <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-700">
        Status batch saat ini: <span className="font-semibold text-slate-950">{batch.status}</span>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={runValidate}
          disabled={validationDisabled}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busyAction === 'validate' ? 'Memvalidasi...' : 'Validasi Batch'}
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {transformStages.map((item) => (
          <button
            key={item.stage}
            type="button"
            onClick={() => runTransform(item.stage)}
            disabled={transformDisabled}
            className="rounded-2xl border border-line bg-white px-4 py-4 text-left transition hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            <p className="text-sm font-semibold text-slate-950">
              {item.title} ({item.stage})
            </p>
            <p className="mt-1 text-sm leading-6 text-mute">{item.detail}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {busyAction === `transform-${item.stage}` ? 'Menjalankan...' : 'Jalankan tahap'}
            </p>
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-mute">
        Tahap yang lebih tinggi akan mengeksekusi baseline SQL review secara berurutan dari tahap 1 hingga tahap terpilih.
      </p>

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
