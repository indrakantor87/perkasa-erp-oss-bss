'use client'

import type { FormEvent, KeyboardEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DailyActivityPlanForm } from '@/components/daily-activity-plan-form'
import {
  parseSmartPaste,
  UI_STATUSES,
  UI_STATUS_LABELS,
  UI_STATUS_COLORS,
  type DailyActivityUiStatus,
  type SmartPastePreviewItem,
} from '@/lib/smart-paste-parser'

type DailyActivityOption = {
  value: string
  label: string
}

type DailyActivitySmartPasteProps = {
  canCreate: boolean
  reviewDbReady: boolean
  defaultActivityDate: string
  defaultPlanningLevel: string
  lockOrgFields: boolean
  planningLevelOptions: DailyActivityOption[]
  divisionOptions: string[]
  subdivisionMap: Record<string, string[]>
  defaultDivision: string
  defaultSubdivision: string
  prefillReferenceWorkOrderId?: string
  prefillWorkOrderNo?: string
  prefillTroubleTicketId?: string
  prefillTroubleTicketNo?: string
  prefillActivityCategory?: string
  prefillActivityType?: string
  prefillNotes?: string
  hasPrefillContext?: boolean
}

type TabKey = 'smart' | 'manual'

const priorityOptions = [
  { value: 'HIGH', label: 'Tinggi' },
  { value: 'MEDIUM', label: 'Sedang' },
  { value: 'LOW', label: 'Rendah' },
] as const

const PASTE_PLACEHOLDER = `7 September 2026

Follow up pelanggan A.
Cek pelanggan B.
Koordinasi dengan NOC.
Survey lokasi C.
Meeting marketing.`

export function DailyActivitySmartPaste(props: DailyActivitySmartPasteProps) {
  const {
    canCreate,
    reviewDbReady,
    defaultActivityDate,
    defaultPlanningLevel,
    lockOrgFields,
    planningLevelOptions,
    divisionOptions,
    subdivisionMap,
    defaultDivision,
    defaultSubdivision,
  } = props

  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabKey>('smart')
  const [pasteText, setPasteText] = useState('')
  const [activityDate, setActivityDate] = useState(defaultActivityDate)
  const [dateSource, setDateSource] = useState<'detected' | 'fallback-today' | 'manual'>('manual')
  const [planningLevel, setPlanningLevel] = useState(defaultPlanningLevel || planningLevelOptions[0]?.value || 'LEADER')
  const [divisionName, setDivisionName] = useState(defaultDivision)
  const [subdivisionName, setSubdivisionName] = useState(defaultSubdivision)
  const [priorityLevel, setPriorityLevel] = useState<(typeof priorityOptions)[number]['value']>('MEDIUM')
  const [items, setItems] = useState<SmartPastePreviewItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'warn' | 'info'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const isOrgDisabled = isDisabled || lockOrgFields
  const subdivisionOptions = useMemo(() => subdivisionMap[divisionName] ?? [], [divisionName, subdivisionMap])

  useEffect(() => {
    if (subdivisionOptions.length === 0) {
      setSubdivisionName('')
      return
    }
    if (!subdivisionOptions.includes(subdivisionName)) {
      setSubdivisionName(subdivisionOptions[0] ?? '')
    }
  }, [subdivisionName, subdivisionOptions])

  const statusCounts = useMemo(() => {
    const c: Record<DailyActivityUiStatus, number> = { OPEN: 0, PENDING: 0, CLOSE: 0, CANCEL: 0 }
    for (const it of items) {
      if (UI_STATUSES.includes(it.status)) c[it.status]++
      else c.OPEN++
    }
    return c
  }, [items])
  const totalItems = items.length

  const handleProcessText = () => {
    setFeedback(null)
    if (!pasteText.trim()) {
      setFeedback({ tone: 'warn', message: 'Teks paste kosong. Tulis atau tempel minimal 1 aktivitas (bisa diawali tanggal atau langsung daftar aktivitas).' })
      return
    }
    const parsed = parseSmartPaste(pasteText)
    setActivityDate(parsed.activityDate)
    setDateSource(parsed.dateSource)
    if (parsed.items.length === 0) {
      setItems([])
      setFeedback({
        tone: 'warn',
        message:
          'Tidak ada aktivitas yang terdeteksi dari teks. Contoh format: tempel "7 September 2026" lalu daftar aktivitas setiap baris baru.',
      })
      return
    }
    setItems(parsed.items)
    const banner =
      parsed.dateSource === 'fallback-today'
        ? `Tanggal tidak terdeteksi dari baris pertama. Pakai tanggal hari ini (${parsed.activityDate}). Ubah jika perlu di bawah.`
        : `Berhasil memecah ${parsed.items.length} aktivitas dari teks. Tanggal = ${parsed.activityDate}. Review status dan teksnya sebelum simpan.`
    setFeedback({ tone: parsed.dateSource === 'fallback-today' ? 'info' : 'success', message: banner })
  }

  const handleClearAll = () => {
    setPasteText('')
    setItems([])
    setActivityDate(defaultActivityDate)
    setDateSource('manual')
    setFeedback(null)
  }

  const handleAddEmptyRow = () => {
    setItems((prev) => {
      const nextOrder = prev.length + 1
      const appended = [...prev, { order: nextOrder, activityText: '', status: 'OPEN' as const }]
      return appended
    })
  }

  const handleDeleteRow = (order: number) => {
    setItems((prev) =>
      prev
        .filter((it) => it.order !== order)
        .map((it, i) => ({ ...it, order: i + 1 })),
    )
  }

  const handleRowTextChange = (order: number, value: string) => {
    setItems((prev) => prev.map((it) => (it.order === order ? { ...it, activityText: value } : it)))
  }

  const handleRowStatusChange = (order: number, value: DailyActivityUiStatus) => {
    setItems((prev) => prev.map((it) => (it.order === order ? { ...it, status: value } : it)))
  }

  const handlePasteKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleProcessText()
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isDisabled || submitting) return
    if (totalItems === 0) {
      setFeedback({ tone: 'warn', message: 'Belum ada aktivitas untuk disimpan. Proses teks paste atau tambah baris terlebih dahulu.' })
      return
    }
    const nonEmpty = items.filter((it) => it.activityText.trim().length > 0)
    if (nonEmpty.length === 0) {
      setFeedback({ tone: 'warn', message: 'Semua baris aktivitas kosong. Isi teks minimal 3 karakter pada setidaknya 1 baris.' })
      return
    }
    setSubmitting(true)
    setFeedback({ tone: 'info', message: `Menyimpan ${nonEmpty.length} aktivitas...` })
    try {
      const resp = await fetch('/api/daily-activities/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityDate,
          planningLevel: isOrgDisabled ? planningLevel : planningLevel,
          divisionName: isOrgDisabled ? divisionName : divisionName,
          subdivisionName: isOrgDisabled ? subdivisionName : subdivisionName,
          priorityLevel,
          items: nonEmpty.map((it) => ({ activityText: it.activityText.trim(), status: it.status })),
        }),
      })
      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const msg = (data?.message as string) || `Gagal simpan (HTTP ${resp.status}).`
        setFeedback({ tone: 'error', message: `${msg} Data preview TETAP TERSEDIA untuk review, tidak dihapus.` })
        return
      }
      const savedCount = (data?.savedCount as number) ?? nonEmpty.length
      const firstCodes: string[] = Array.isArray(data?.codes) ? (data.codes as string[]).slice(0, 3) : []
      const codesText = firstCodes.length ? ` (${firstCodes.join(', ')}${savedCount > firstCodes.length ? ', ...' : ''})` : ''
      setFeedback({
        tone: 'success',
        message: `Berhasil menyimpan ${savedCount} aktivitas${codesText}. Daftar di bawah otomatis refresh.`,
      })
      setItems([])
      setPasteText('')
      router.refresh()
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err ?? 'Network error')
      setFeedback({
        tone: 'error',
        message: `Terjadi kesalahan saat menyimpan batch: ${cause}. Coba sebentar lagi. Preview TETAP dipertahankan.`,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const counterCls = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold'

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-950">Input Daily Activity</p>
          <p className="mt-1 text-xs text-mute">
            Smart Paste = tempel dari Notepad → pecah otomatis per aktivitas. Input Manual = 1 record per submit (form lama).
          </p>
        </div>
        <div role="tablist" aria-label="Daily Activity input mode" className="flex rounded-lg border border-line bg-slate-50 p-1 text-xs font-semibold">
          <button
            role="tab"
            aria-selected={activeTab === 'smart'}
            type="button"
            onClick={() => setActiveTab('smart')}
            className={
              'rounded-md px-3 py-1.5 transition ' +
              (activeTab === 'smart' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700')
            }
          >
            Smart Paste (Cepat)
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'manual'}
            type="button"
            onClick={() => setActiveTab('manual')}
            className={
              'rounded-md px-3 py-1.5 transition ' +
              (activeTab === 'manual' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700')
            }
          >
            Input Manual
          </button>
        </div>
      </div>

      {activeTab === 'manual' ? (
        <div className="mt-2">
          <DailyActivityPlanForm {...props} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="da-smart-paste-textarea" className="mb-1 block text-xs font-semibold text-slate-800">
              Teks dari Notepad (tempel disini)
              <span className="ml-2 font-normal text-mute">Ctrl/⌘ + Enter = proses cepat</span>
            </label>
            <textarea
              id="da-smart-paste-textarea"
              disabled={isDisabled}
              rows={8}
              placeholder={PASTE_PLACEHOLDER}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onKeyDown={handlePasteKeyDown}
              className="w-full resize-y rounded-xl border border-line bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleProcessText}
                disabled={isDisabled || !pasteText.trim()}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Proses Teks
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={isDisabled || (!pasteText && totalItems === 0)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Bersihkan Semua
              </button>
            </div>
          </div>

          {feedback ? (
            <div
              role="status"
              className={
                'rounded-xl border px-3 py-2 text-xs ' +
                (feedback.tone === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : feedback.tone === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : feedback.tone === 'warn'
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-sky-200 bg-sky-50 text-sky-800')
              }
            >
              {feedback.message}
            </div>
          ) : null}

          {totalItems > 0 || pasteText.trim().length > 0 ? (
            <section className="space-y-3 rounded-xl border border-line bg-slate-50/60 p-3">
              <header className="flex flex-wrap items-end gap-3">
                <div className="flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Tanggal Aktivitas</label>
                    <input
                      type="date"
                      disabled={isDisabled}
                      value={activityDate}
                      onChange={(e) => {
                        setActivityDate(e.target.value)
                        setDateSource('manual')
                      }}
                      className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                    {dateSource === 'fallback-today' ? (
                      <p className="mt-1 text-[10px] text-sky-700">Info: fallback ke hari ini. Ubah sesuai tanggal rencana.</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Level Plan</label>
                    <select
                      disabled={isOrgDisabled}
                      value={planningLevel}
                      onChange={(e) => setPlanningLevel(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      {planningLevelOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Divisi</label>
                    <select
                      disabled={isOrgDisabled}
                      value={divisionName}
                      onChange={(e) => setDivisionName(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      <option value="">— Pilih divisi —</option>
                      {divisionOptions.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Prioritas Global</label>
                    <select
                      disabled={isDisabled}
                      value={priorityLevel}
                      onChange={(e) => setPriorityLevel(e.target.value as (typeof priorityOptions)[number]['value'])}
                      className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      {priorityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </header>

              {subdivisionOptions.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="mb-1 block text-[11px] font-semibold text-slate-700">Sub Divisi</label>
                    <select
                      disabled={isOrgDisabled}
                      value={subdivisionName}
                      onChange={(e) => setSubdivisionName(e.target.value)}
                      className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      <option value="">— Pilih sub-divisi —</option>
                      {subdivisionOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-slate-200 pt-2">
                <span className={`${counterCls} border-slate-300 bg-white text-slate-700`}>
                  TOTAL<span className="tabular-nums">{'\u00A0'}{totalItems}</span>
                </span>
                {UI_STATUSES.map((s) => (
                  <span key={s} className={`${counterCls} ${UI_STATUS_COLORS[s]}`}>
                    {UI_STATUS_LABELS[s]}<span className="tabular-nums">{'\u00A0'}{statusCounts[s]}</span>
                  </span>
                ))}
              </div>

              <ul className="space-y-2">
                {items.map((it) => (
                  <li
                    key={it.order}
                    className="grid grid-cols-[auto_1fr_auto_auto] items-start gap-2 rounded-lg border border-line bg-white p-2"
                  >
                    <span className="mt-2 w-7 shrink-0 text-right text-[11px] font-bold text-slate-500 tabular-nums">
                      {it.order}.
                    </span>
                    <textarea
                      disabled={isDisabled}
                      rows={2}
                      value={it.activityText}
                      onChange={(e) => handleRowTextChange(it.order, e.target.value)}
                      placeholder="Aktivitas..."
                      aria-label={`Aktivitas ${it.order}`}
                      className="min-w-0 w-full resize-y rounded-md border border-line bg-white px-2 py-1.5 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                    <select
                      disabled={isDisabled}
                      value={it.status}
                      onChange={(e) => handleRowStatusChange(it.order, e.target.value as DailyActivityUiStatus)}
                      aria-label={`Status aktivitas ${it.order}`}
                      className="mt-1 w-28 shrink-0 rounded-md border border-line bg-white px-1.5 py-1.5 text-xs font-semibold focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    >
                      {UI_STATUSES.map((s) => (
                        <option key={s} value={s}>{UI_STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDeleteRow(it.order)}
                      disabled={isDisabled}
                      aria-label={`Hapus aktivitas ${it.order}`}
                      className="mt-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-2">
                <button
                  type="button"
                  onClick={handleAddEmptyRow}
                  disabled={isDisabled}
                  className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + Tambah 1 baris kosong
                </button>
                <button
                  type="submit"
                  disabled={isDisabled || totalItems === 0 || submitting}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Menyimpan...' : `Simpan Semua (${totalItems}) aktivitas`}
                </button>
              </div>
            </section>
          ) : null}
        </form>
      )}
    </div>
  )
}
