'use client'

/* ============================================================
 * G23.65A RC8 FORCE RECOMPILE TRIGGER BLOCK (NO LOGIC CHANGE)
 * ------------------------------------------------------------
 * Content-only modification to force Next.js 16 Turbopack to
 * compute a NEW content hash for this source file, so that the
 * stale persistent dev cache entry (old compiled chunk before
 * the ModalShell rewrite + data-g2364-dialog attribute pattern)
 * will NOT match the new hash. The Turbopack cache key is the
 * source content hash, so ANY content change (even a comment)
 * invalidates the cache entry WITHOUT needing to delete any
 * generated files under .next (which user has forbidden).
 * ------------------------------------------------------------
 * Affected: 0 lines of business logic. This block is a pure
 * comment, parsed out by the TypeScript compiler before emit.
 * Hash change marker: 2026-09-06T11:58:00Z G23.65A-RC8v2
 * ============================================================ */

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { DailyActivitySmartPaste } from '@/components/daily-activity-smart-paste'
import { DailyActivityPlanForm } from '@/components/daily-activity-plan-form'

type DailyActivityOption = {
  value: string
  label: string
}

type DailyActivityWorkspaceToolbarProps = {
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
  todayItemsCount: number
  todayLabel: string
}

function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-6xl',
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  maxWidthClass?: string
}) {
  // FORCE RECOMPILE G23.65A RC8 FIX: trivial content edit 0 logic change → update content hash untuk trigger Turbopack recompile new chunk (no cache delete needed)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const STYLE_ID = 'g2364-modal-static-rules'
    if (!document.getElementById(STYLE_ID)) {
      const styleEl = document.createElement('style')
      styleEl.id = STYLE_ID
      styleEl.textContent = `
        [data-g2364-dialog="1"] {
          position: fixed;
          inset: 0;
          z-index: 50;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 1rem;
          background-color: rgba(2, 6, 23, 0.7);
          backdrop-filter: blur(4px);
        }
        @media (min-width: 640px) {
          [data-g2364-dialog="1"] {
            padding: 2rem 1rem;
          }
        }
        [data-g2364-dialog="1"] > div[role="presentation"],
        [data-g2364-dialog="1"] > div:not([aria-label]) {
          position: relative;
          z-index: 60;
          display: flex;
          flex-direction: column;
          width: 100%;
          max-width: var(--g2364-maxw, 72rem);
          max-height: calc(100vh - 2rem);
          min-height: clamp(420px, 60vh, 480px);
          overflow: hidden;
          border-radius: 1.5rem;
          border: 1px solid var(--color-line, #d6deea);
          background-color: #ffffff;
          background-color: var(--color-surface, #ffffff);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        @media (min-width: 640px) {
          [data-g2364-dialog="1"] > div[role="presentation"],
          [data-g2364-dialog="1"] > div:not([aria-label]) {
            max-height: calc(100vh - 4rem);
            min-height: max(480px, 60vh);
          }
        }
        [data-g2364-dialog="1"] > div:not([aria-label]) > div:first-child {
          position: sticky;
          top: 0;
          z-index: 10;
          flex-shrink: 0;
          border-bottom: 1px solid var(--color-line, #d6deea);
          background-color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          padding: 1.25rem 1.5rem;
        }
        [data-g2364-dialog="1"] > div:not([aria-label]) > div:last-of-type {
          flex: 1 1 auto;
          min-height: 320px;
          overflow-y: auto;
          background-color: #ffffff;
          background-color: var(--color-surface, #ffffff);
          padding: 1.5rem;
        }
        [data-g2364-dialog="1"] [data-g2364-wrap="1"] {
          min-height: 360px;
        }
      `
      document.head.appendChild(styleEl)
    }

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    (
      <div
        data-g2364-dialog="1"
        role="dialog"
        aria-modal="true"
        aria-labelledby="g2364-modal-title"
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-4 sm:py-8 backdrop-blur-sm"
      >
        <button
          type="button"
          aria-label="Tutup modal"
          className="absolute inset-0 cursor-default"
          onClick={onClose}
        />
        <div
          className={`relative z-[60] flex w-full flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl g2364-modal-outer ${maxWidthClass}`}
        >
          <div className="sticky top-0 z-10 shrink-0 flex flex-col gap-4 border-b border-line bg-white/95 px-6 py-5 backdrop-blur lg:flex-row lg:items-start lg:justify-between">
            <div id="g2364-modal-title">
              <p className="section-title">Daily Activity</p>
              <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
                {title}
              </h3>
              {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">{subtitle}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
            >
              Tutup
            </button>
          </div>
          <div className="flex-1 overflow-y-auto g2364-modal-body px-6 py-6">{children}</div>
        </div>
      </div>
    ),
    document.body,
  )
}

export function DailyActivityWorkspaceToolbar(props: DailyActivityWorkspaceToolbarProps) {
  const { canCreate, reviewDbReady, todayItemsCount, todayLabel } = props
  const isActionDisabled = !canCreate || !reviewDbReady

  const [inputModalOpen, setInputModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

  useEffect(() => {
    const STYLE_ID = 'g2364-daily-activity-modal-css'
    if (document.getElementById(STYLE_ID)) return
    const cssText = `
      .g2364-modal-outer { min-height: clamp(420px, 60vh, 480px) !important; }
      @media (min-width: 640px) {
        .g2364-modal-outer { min-height: max(480px, 60vh) !important; max-height: 90vh !important; }
      }
      .g2364-modal-body { min-height: 320px !important; background-color: #ffffff !important; }
      .g2364-modal-wrap { min-height: 360px !important; }
    `
    const styleEl = document.createElement('style')
    styleEl.id = STYLE_ID
    styleEl.setAttribute('data-origin', 'daily-activity-workspace-toolbar-g2364')
    styleEl.textContent = cssText
    document.head.appendChild(styleEl)
    return () => {
      const existing = document.getElementById(STYLE_ID)
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing)
    }
  }, [])

  const handleInputSaved = () => {
    setInputModalOpen(false)
  }
  const handleCreateSaved = () => {
    setCreateModalOpen(false)
  }
  const handleJumpToFilter = () => {
    const el = document.getElementById('daily-activity-filter-bar')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <>
      <section className="panel p-4 min-w-0">
        <div className="flex flex-col gap-3 w-full min-w-0 lg:flex-row lg:items-center lg:justify-between lg:flex-wrap">
          <div className="min-w-0">
            <p className="section-title">Aktivitas {todayLabel}</p>
            <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              {todayItemsCount > 0
                ? `${todayItemsCount} aktivitas hari ini`
                : 'Belum ada aktivitas hari ini'}
            </h3>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">
              Gunakan toolbar disamping untuk input cepat, buat manual, atau filter.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto sm:justify-start justify-center items-stretch sm:items-center sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={isActionDisabled}
              onClick={() => setInputModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:ring-2 disabled:ring-slate-200"
              title={
                isActionDisabled
                  ? (!canCreate ? 'Akun Anda tidak memiliki izin create daily activity' : 'Review DB belum siap — tunggu koneksi data source')
                  : 'Tempel daftar aktivitas dari Notepad sekaligus (Smart Paste)'
              }
            >
              <span aria-hidden>+</span>
              <span>INPUT</span>
            </button>
            <button
              type="button"
              disabled={isActionDisabled}
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:border-slate-300 disabled:text-slate-500"
              title={
                isActionDisabled
                  ? (!canCreate ? 'Akun Anda tidak memiliki izin create daily activity' : 'Review DB belum siap — tunggu koneksi data source')
                  : 'Buat 1 aktivitas manual'
              }
            >
              <span aria-hidden>+</span>
              <span>CREATE</span>
            </button>
            <button
              type="button"
              onClick={handleJumpToFilter}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              title="Lompat ke panel Filter"
            >
              <span aria-hidden>⚑</span>
              <span>FILTER</span>
            </button>
          </div>
          {isActionDisabled ? (
            <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 lg:w-auto">
              <strong className="font-semibold">Toolbar dinonaktifkan:</strong>{' '}
              {!canCreate ? 'Role Anda belum memiliki izin <create> untuk Daily Activity (hubungi admin).' : 'Review DB fallback aktif — koneksi staging review-db belum ready.'}
            </div>
          ) : null}
        </div>
      </section>

      <ModalShell
        open={inputModalOpen}
        onClose={() => setInputModalOpen(false)}
        title="INPUT DAILY ACTIVITY"
        subtitle="Tempel laporan aktivitas dari Notepad, parsing otomatis per baris, review status, lalu simpan semua sekaligus."
        maxWidthClass="max-w-6xl"
      >
        <div data-g2364-wrap="1" className="space-y-4 g2364-modal-wrap">
          {isActionDisabled ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong className="font-semibold">Form dalam status nonaktif:</strong>{' '}
              {!canCreate
                ? 'Role Anda belum memiliki izin <create> untuk Daily Activity. Hubungi admin agar dapat menambahkan aktivitas.'
                : 'Koneksi Review DB (staging/prod) belum ready — sistem saat ini fallback ke mock data (read-only). Form akan aktif otomatis setelah koneksi review-db siap. DataSourceStatus di bawah toolbar menampilkan status sumber data saat ini.'}
            </div>
          ) : null}
          <DailyActivitySmartPaste {...props} forceMode="smart" onSavedSuccess={handleInputSaved} />
        </div>
      </ModalShell>

      <ModalShell
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="CREATE DAILY ACTIVITY"
        subtitle="Buat satu aktivitas manual dengan detail lengkap. Cocok untuk input spesifik yang butuh field terstruktur."
        maxWidthClass="max-w-5xl"
      >
        <div data-g2364-wrap="1" className="space-y-4 g2364-modal-wrap">
          {isActionDisabled ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong className="font-semibold">Form dalam status nonaktif:</strong>{' '}
              {!canCreate
                ? 'Role Anda belum memiliki izin <create> untuk Daily Activity. Hubungi admin agar dapat menambahkan aktivitas.'
                : 'Koneksi Review DB (staging/prod) belum ready — sistem saat ini fallback ke mock data (read-only). Form akan aktif otomatis setelah koneksi review-db siap. DataSourceStatus di bawah toolbar menampilkan status sumber data saat ini.'}
            </div>
          ) : null}
          <DailyActivityPlanForm {...props} onSavedSuccess={handleCreateSaved} />
        </div>
      </ModalShell>
    </>
  )
}

/* ============================================================
 * G23.65A RC8 END-OF-FILE FORCE RECOMPILE MARKER
 * ------------------------------------------------------------
 * Second content marker. Adding this block ensures the file's
 * content hash deviates significantly from any pre-existing
 * stale cache entry stored under .next/dev/cache/turbopack/.
 * This guarantees a cache miss and forces Turbopack to re-run
 * the source => chunk compilation pipeline for this module,
 * WITHOUT deleting any generated cache artifacts (compliant
 * with user's explicit NO-CACHE-FLUSH directive).
 * Marker timestamp: 2026-09-06T11:58:30Z EOF v2
 * ============================================================ */
