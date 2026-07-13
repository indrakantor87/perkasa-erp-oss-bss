'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { WorklistItem } from '@/lib/types'

const priorityTone: Record<WorklistItem['priority'], string> = {
  tinggi: 'bg-rose-50 text-rose-700',
  sedang: 'bg-amber-50 text-amber-700',
  rendah: 'bg-emerald-50 text-emerald-700',
}

const quickActionStatusOptions = [
  { value: 'siap-dikerjakan', label: 'Siap dikerjakan sekarang' },
  { value: 'butuh-follow-up', label: 'Butuh follow up lanjutan' },
  { value: 'menunggu-tim-lain', label: 'Menunggu tim lain' },
  { value: 'perlu-eskalasi', label: 'Perlu eskalasi' },
]

function buildQuickActionDraft(item: WorklistItem) {
  return [
    item.nextAction ? `Langkah awal: ${item.nextAction}` : null,
    item.reason ? `Alasan muncul: ${item.reason}` : null,
    item.blockingInfo ? `Blocker: ${item.blockingInfo}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

export function WorklistQuickActionModal({
  item,
  onClose,
  title = 'Aksi cepat dari tabel kerja',
}: {
  item: WorklistItem | null
  onClose: () => void
  title?: string
}) {
  const [draftStatus, setDraftStatus] = useState(quickActionStatusOptions[0]?.value ?? 'siap-dikerjakan')
  const [draftNote, setDraftNote] = useState('')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    setDraftStatus(quickActionStatusOptions[0]?.value ?? 'siap-dikerjakan')
    setDraftNote(buildQuickActionDraft(item))
    setCopyFeedback(null)
  }, [item])

  useEffect(() => {
    if (!item) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [item, onClose])

  const draftSummary = useMemo(() => {
    if (!item) return ''
    const selectedStatus =
      quickActionStatusOptions.find((option) => option.value === draftStatus)?.label ?? draftStatus
    return [
      `Item: ${item.title}`,
      `Queue: ${item.queue}`,
      `Status kerja: ${selectedStatus}`,
      draftNote ? `Catatan: ${draftNote}` : null,
    ]
      .filter(Boolean)
      .join('\n')
  }, [draftNote, draftStatus, item])

  if (!item) {
    return null
  }

  async function handleCopyDraft() {
    try {
      await navigator.clipboard.writeText(draftSummary)
      setCopyFeedback('Ringkasan tindak lanjut berhasil disalin.')
    } catch {
      setCopyFeedback('Clipboard browser tidak tersedia. Salin manual dari kolom catatan.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Tutup popup aksi cepat" className="absolute inset-0" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl rounded-3xl border border-line bg-white shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-line px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge border-slate-200 bg-white text-slate-600">{item.domain}</span>
              <span className="badge border-slate-200 bg-white text-slate-600">{item.queue}</span>
              <span className={`badge ${priorityTone[item.priority]}`}>{item.priority}</span>
              <span className="badge border-transparent bg-slate-950 text-white">{item.status}</span>
            </div>
            <h3 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-700">{item.title}</p>
            <p className="mt-1 text-sm leading-6 text-mute">{item.detail}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Tutup
          </button>
        </div>

        <div className="grid gap-4 px-6 py-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Alasan Muncul</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.reason || '-'}</p>
              </article>
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Langkah Berikut</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.nextAction || '-'}</p>
              </article>
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">PIC / Target</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.owner || '-'}</p>
                <p className="mt-1 text-sm leading-6 text-mute">{item.dueLabel || 'Belum ada target eksplisit'}</p>
              </article>
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Blocker</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.blockingInfo || 'Belum ada blocker eksplisit.'}</p>
              </article>
            </div>

            {item.correlationSummary ? (
              <article className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Konteks Kasus</p>
                <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                  <p>Pelanggan: {item.correlationSummary.customer || '-'}</p>
                  <p>Layanan: {item.correlationSummary.service || '-'}</p>
                  <p>PIC: {item.correlationSummary.owner || '-'}</p>
                </div>
                {item.correlationSummary.items.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.correlationSummary.items.map((entry) => (
                      <span key={`${entry.label}-${entry.value}`} className="badge border-slate-200 bg-slate-50 text-slate-700">
                        {entry.label}: {entry.value}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ) : null}

            {item.healthSignal ? (
              <article className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sinyal Kesehatan</p>
                <p className="mt-3 text-sm font-semibold text-slate-900">{item.healthSignal.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{item.healthSignal.detail}</p>
              </article>
            ) : null}
          </div>

          <div className="space-y-4">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Form Tindak Lanjut Cepat</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Form ini dipakai sebagai draft kerja cepat di browser saat membaca tabel. Belum menyimpan ke backend.
              </p>

              <div className="mt-4 grid gap-4">
                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Status kerja</span>
                  <select
                    value={draftStatus}
                    onChange={(event) => setDraftStatus(event.target.value)}
                    className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                  >
                    {quickActionStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Catatan operator</span>
                  <textarea
                    rows={8}
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    placeholder="Tulis ringkasan tindak lanjut yang ingin dibawa ke modul utama."
                    className="min-h-40 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleCopyDraft()}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  Salin ringkasan
                </button>
                <Link
                  href={item.href}
                  className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {item.actionLabel}
                </Link>
              </div>

              {copyFeedback ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {copyFeedback}
                </div>
              ) : null}
            </article>

            {item.recommendedActions?.items.length ? (
              <article className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Aksi Rekomendasi</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {item.recommendedActions.items.map((action) => (
                    <Link
                      key={`${item.id}-${action.label}-${action.href}`}
                      href={action.href}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </article>
            ) : null}

            {item.handoffLinks?.length ? (
              <article className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Shortcut Lanjutan</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {item.handoffLinks.map((link) => (
                    <Link
                      key={`${item.id}-${link.label}-${link.href}`}
                      href={link.href}
                      className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </article>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
