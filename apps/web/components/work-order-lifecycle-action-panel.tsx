'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StatusBadge, type StatusTone } from '@/components/ui-status-badge'

type WorkOrderLifecycleActionPanelProps = {
  workOrderId: number
  currentStatus: string
  currentStatusLabel?: string | null
  currentStatusTone?: StatusTone | null
  canSchedule: boolean
  canStartOnProgress: boolean
  canComplete: boolean
  canClose: boolean
  reviewDbReady: boolean
}

type QueueRouteResponse = {
  message?: string
}

type CompleteRouteResponse = {
  success?: boolean
  idempotent?: boolean
  workOrderNo?: string
  status?: string
  closedAt?: string | null
  message?: string
  code?: string
}

type LifecycleAction = 'SCHEDULE' | 'START' | 'COMPLETE' | 'CLOSE'

export function WorkOrderLifecycleActionPanel({
  workOrderId,
  currentStatus,
  currentStatusLabel,
  currentStatusTone,
  canSchedule,
  canStartOnProgress,
  canComplete,
  canClose,
  reviewDbReady,
}: WorkOrderLifecycleActionPanelProps) {
  const router = useRouter()
  const [submitting, setSubmitting] = useState<LifecycleAction | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const showAny = canSchedule || canStartOnProgress || canComplete || canClose
  if (!showAny) {
    return null
  }

  function isDisabled(action: LifecycleAction) {
    if (!reviewDbReady) return true
    if (submitting != null) return true
    if (action === 'SCHEDULE' && !canSchedule) return true
    if (action === 'START' && !canStartOnProgress) return true
    if (action === 'COMPLETE' && !canComplete) return true
    if (action === 'CLOSE' && !canClose) return true
    return false
  }

  async function callQueueStatus(action: 'SCHEDULE' | 'START' | 'CLOSE', formEvent?: FormEvent<HTMLFormElement>) {
    formEvent?.preventDefault()
    if (isDisabled(action)) return

    let queueStatus: 'OPEN' | 'ON_PROGRESS' | 'TEMPORARY' | 'CLOSE' | 'FINAL_CLOSE' = 'ON_PROGRESS'
    let confirmText: string | null = null

    if (action === 'SCHEDULE') {
      queueStatus = 'TEMPORARY'
    } else if (action === 'START') {
      queueStatus = 'ON_PROGRESS'
    } else if (action === 'CLOSE') {
      queueStatus = 'FINAL_CLOSE'
      confirmText = 'Finalisasi work order ke status CLOSED? Setelah close audit final, work order tidak dapat dibuka kembali. Lanjutkan?'
    }

    if (confirmText && !globalThis.confirm(confirmText)) {
      return
    }

    setSubmitting(action)
    setFeedback(null)

    try {
      const endpoint = `/api/sales/work-orders/${encodeURIComponent(String(workOrderId))}/queue-status`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueStatus, notes: `Lifecycle action ${action} via WorkOrderLifecycleActionPanel` }),
      })
      const payload = (await response.json().catch(() => null)) as QueueRouteResponse | null
      if (response.status === 401) {
        setFeedback({ tone: 'error', message: 'Sesi login tidak aktif. Silakan login kembali.' })
        return
      }
      if (response.status === 403) {
        setFeedback({ tone: 'error', message: payload?.message || 'Otorisasi ditolak untuk action ini.' })
        return
      }
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Gagal menjalankan lifecycle action. Silakan coba kembali.' })
        return
      }
      setFeedback({
        tone: 'success',
        message: payload?.message || `Berhasil menjalankan action ${action}.`,
      })
      router.refresh()
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Kesalahan jaringan saat menjalankan action. Silakan coba kembali.',
      })
    } finally {
      setSubmitting(null)
    }
  }

  async function callComplete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled('COMPLETE')) return
    const reason = globalThis.prompt(
      '(Opsional) Tambahkan catatan penyelesaian untuk work order ini:\nCatatan ini akan disimpan ke WO status log, TT progress log, dan akan menjadi bukti penyelesaian formal.',
    )
    if (reason === null) {
      return
    }
    const confirmOk = globalThis.confirm(
      'Tandai work order ini sebagai COMPLETED?\n\nSistem akan:\n1. Mendebet SEMUA inventory item request aktif (movement OUT WORK_ORDER ref)\n2. Update current_stock inventory dengan race guard\n3. Insert log status COMPLETED beserta catatan\n4. Insert progress log Trouble Ticket linked\n5. Jika SEMUA WO linked untuk TT sudah COMPLETED → TT otomatis CLOSE cascade\n\nLanjutkan?',
    )
    if (!confirmOk) return

    setSubmitting('COMPLETE')
    setFeedback(null)

    try {
      const endpoint = `/api/sales/work-orders/${encodeURIComponent(String(workOrderId))}/complete`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reasonNotes: reason?.trim() || null }),
      })
      const payload = (await response.json().catch(() => null)) as CompleteRouteResponse | null
      if (response.status === 401) {
        setFeedback({ tone: 'error', message: 'Sesi login tidak aktif. Silakan login kembali.' })
        return
      }
      if (response.status === 403) {
        setFeedback({ tone: 'error', message: payload?.message || 'Otorisasi ditolak. Perlu support.update + inventory.create/manage izin.' })
        return
      }
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message:
            payload?.message ||
            payload?.code === 'INVENTORY_ITEM_INSUFFICIENT'
              ? 'Stok material tidak cukup untuk menyelesaikan work order ini.'
              : `Gagal menyelesaikan work order (HTTP ${response.status}). Silakan periksa log.`,
        })
        return
      }
      if (payload?.idempotent) {
        setFeedback({
          tone: 'success',
          message: `Work order ${payload?.workOrderNo ?? '#' + workOrderId} sudah COMPLETED sebelumnya (idempotent).`,
        })
      } else {
        setFeedback({
          tone: 'success',
          message:
            payload?.message ||
            `Berhasil menyelesaikan work order ${payload?.workOrderNo ?? '#' + workOrderId}. Material terdebit formal.`,
        })
      }
      router.refresh()
    } catch {
      setFeedback({
        tone: 'error',
        message: 'Kesalahan jaringan saat menyelesaikan work order. Silakan coba kembali.',
      })
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <section className="card-tier-2 border border-infoLine/60 p-5" aria-label="Lifecycle work order action panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-infoInk">
            Lifecycle Work Order
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="text-sm leading-6 text-inkStrong">
              Status saat ini:&nbsp;
            </p>
            <StatusBadge
              tone={(currentStatusTone ?? 'neutral') as StatusTone}
              label={currentStatusLabel || currentStatus || 'OPEN'}
            />
          </div>
          <p className="mt-1 text-xs leading-5 text-muteStrong">
            Gunakan tombol action untuk memajukan state machine work order dari OPEN sampai CLOSED audit final.
            Setiap transisi memicu status log + audit trail, dan CTA &quot;Selesaikan + Debit Material&quot;
            adalah SATU-SATUNYA jalur resmi deduction material linked ke WO (movement OUT WORK_ORDER ref)
            + otomatis cascade close Trouble Ticket jika semua WO selesai. Semua action wajib
            canPerformAction('support','update') + inventory permission untuk complete/close.
          </p>
        </div>

        <div className="flex flex-wrap items-stretch gap-2">
          {canSchedule ? (
            <form onSubmit={(e) => callQueueStatus('SCHEDULE', e)} className="inline-flex items-stretch">
              <button
                type="submit"
                disabled={isDisabled('SCHEDULE')}
                aria-label="Jadwalkan work order dispatch (TEMPORARY/PENDING scheduling)"
                title={
                  !reviewDbReady
                    ? 'Review DB belum aktif: action transisi ditolak.'
                    : 'Tandai work order sebagai SCHEDULED/PENDING TEMPORARY = sudah di-schedule dispatch ke teknisi lapangan.'
                }
                className="btn-secondary tap-44 inline-flex items-center justify-center whitespace-nowrap"
              >
                {submitting === 'SCHEDULE' ? 'Memproses...' : 'Jadwalkan'}
              </button>
            </form>
          ) : null}

          {canStartOnProgress ? (
            <form onSubmit={(e) => callQueueStatus('START', e)} className="inline-flex items-stretch">
              <button
                type="submit"
                disabled={isDisabled('START')}
                aria-label="Mulai eksekusi work order ON_PROGRESS"
                title={
                  !reviewDbReady
                    ? 'Review DB belum aktif: action transisi ditolak.'
                    : 'Tandai work order sedang ON_PROGRESS (teknisi sedang mengeksekusi pekerjaan lapangan). started_at auto-set jika belum.'
                }
                className="btn-primary tap-44 inline-flex items-center justify-center whitespace-nowrap"
              >
                {submitting === 'START' ? 'Memproses...' : 'Mulai Pengerjaan'}
              </button>
            </form>
          ) : null}

          {canComplete ? (
            <form onSubmit={callComplete} className="inline-flex items-stretch">
              <button
                type="submit"
                disabled={isDisabled('COMPLETE')}
                aria-label="Selesaikan work order dengan material deduction canonical"
                title={
                  !reviewDbReady
                    ? 'Review DB belum aktif: action penyelesaian ditolak.'
                    : 'Penyelesaian WORK ORDER FORMAL + DEBIT MATERIAL. SATU-SATUNYA jalur sah untuk mengurangi persediaan yang ter-link ke work order (single path canonical, tidak ada duplicate logic).'
                }
                className="btn-success tap-44 inline-flex items-center justify-center whitespace-nowrap"
              >
                {submitting === 'COMPLETE' ? 'Menyelesaikan...' : 'Selesaikan + Debit Material'}
              </button>
            </form>
          ) : null}

          {canClose ? (
            <form onSubmit={(e) => callQueueStatus('CLOSE', e)} className="inline-flex items-stretch">
              <button
                type="submit"
                disabled={isDisabled('CLOSE')}
                aria-label="Finalisasi work order ke CLOSED audit final"
                title={
                  !reviewDbReady
                    ? 'Review DB belum aktif.'
                    : 'Audit final: tandai work order CLOSED (permanen, tidak dapat dibuka kembali). Work order harus sudah COMPLETED + semua material diterima & TT linked sudah resolved.'
                }
                className="btn-ghost tap-44 inline-flex items-center justify-center whitespace-nowrap border border-line hover:border-infoLine"
              >
                {submitting === 'CLOSE' ? 'Memproses...' : 'Close Final'}
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {feedback ? (
        <div
          className={`mt-5 rounded-2xl border px-4 py-3 text-sm leading-6 ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          <p className="font-semibold">{feedback.tone === 'success' ? 'Sukses' : 'Peringatan'}</p>
          <p className="mt-1">{feedback.message}</p>
        </div>
      ) : null}
    </section>
  )
}
