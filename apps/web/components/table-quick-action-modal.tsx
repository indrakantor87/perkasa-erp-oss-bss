'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

export type TableQuickActionBadge = {
  label: string
  tone?: string
}

export type TableQuickActionSection = {
  title: string
  value: string
  tone?: string
}

export type TableQuickActionLink = {
  label: string
  href: string
  tone?: 'primary' | 'secondary'
  external?: boolean
}

export type TableQuickActionPayload = {
  id: string
  title: string
  subtitle?: string
  description?: string
  badges?: TableQuickActionBadge[]
  sections?: TableQuickActionSection[]
  actions?: TableQuickActionLink[]
  draftLabel?: string
  draftSeed?: string
}

const quickActionStatusOptions = [
  { value: 'siap-dikerjakan', label: 'Siap dikerjakan sekarang' },
  { value: 'butuh-follow-up', label: 'Butuh follow up lanjutan' },
  { value: 'menunggu-tim-lain', label: 'Menunggu tim lain' },
  { value: 'perlu-eskalasi', label: 'Perlu eskalasi' },
]

export function TableQuickActionModal({
  item,
  onClose,
  heading = 'Aksi cepat dari tabel',
}: {
  item: TableQuickActionPayload | null
  onClose: () => void
  heading?: string
}) {
  const [draftStatus, setDraftStatus] = useState(quickActionStatusOptions[0]?.value ?? 'siap-dikerjakan')
  const [draftNote, setDraftNote] = useState('')
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    setDraftStatus(quickActionStatusOptions[0]?.value ?? 'siap-dikerjakan')
    setDraftNote(item.draftSeed ?? '')
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
      `${item.draftLabel ?? 'Item'}: ${item.title}`,
      item.subtitle ? `Referensi: ${item.subtitle}` : null,
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
            {item.badges?.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {item.badges.map((badge) => (
                  <span key={`${item.id}-${badge.label}`} className={`badge ${badge.tone ?? 'border-slate-200 bg-white text-slate-600'}`}>
                    {badge.label}
                  </span>
                ))}
              </div>
            ) : null}
            <h3 className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              {heading}
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-700">{item.title}</p>
            {item.subtitle ? <p className="mt-1 text-sm text-slate-600">{item.subtitle}</p> : null}
            {item.description ? <p className="mt-2 text-sm leading-6 text-mute">{item.description}</p> : null}
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
            {item.sections?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {item.sections.map((section) => (
                  <article
                    key={`${item.id}-${section.title}`}
                    className={`rounded-3xl border p-4 ${section.tone ?? 'border-slate-200 bg-slate-50'}`}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{section.title}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{section.value || '-'}</p>
                  </article>
                ))}
              </div>
            ) : (
              <article className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-mute">
                Belum ada detail tambahan untuk item ini. Gunakan aksi utama di sisi kanan untuk lanjut ke modul terkait.
              </article>
            )}
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
              </div>

              {copyFeedback ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {copyFeedback}
                </div>
              ) : null}
            </article>

            {item.actions?.length ? (
              <article className="rounded-3xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Aksi Lanjutan</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {item.actions.map((action) => (
                    <Link
                      key={`${item.id}-${action.label}-${action.href}`}
                      href={action.href}
                      target={action.external ? '_blank' : undefined}
                      rel={action.external ? 'noreferrer' : undefined}
                      className={
                        action.tone === 'primary'
                          ? 'inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800'
                          : 'inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950'
                      }
                    >
                      {action.label}
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
