'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
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
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Tutup modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        className={`relative z-10 max-h-[92vh] w-full ${maxWidthClass} overflow-y-auto rounded-3xl border border-line bg-white shadow-2xl`}
      >
        <div className="sticky top-0 z-10 flex flex-col gap-4 border-b border-line bg-white/95 px-6 py-5 backdrop-blur lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Daily Activity</p>
            <h3 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              {title}
            </h3>
            {subtitle ? <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            Tutup
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  )
}

export function DailyActivityWorkspaceToolbar(props: DailyActivityWorkspaceToolbarProps) {
  const { canCreate, reviewDbReady, todayItemsCount, todayLabel } = props
  const isActionDisabled = !canCreate || !reviewDbReady

  const [inputModalOpen, setInputModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)

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
      <section className="panel p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
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
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-row">
            <button
              type="button"
              disabled={isActionDisabled}
              onClick={() => setInputModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              title="Tempel daftar aktivitas dari Notepad sekaligus (Smart Paste)"
            >
              <span aria-hidden>+</span>
              <span>INPUT</span>
            </button>
            <button
              type="button"
              disabled={isActionDisabled}
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 py-2.5 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
              title="Buat 1 aktivitas manual"
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
        </div>
      </section>

      <ModalShell
        open={inputModalOpen}
        onClose={() => setInputModalOpen(false)}
        title="INPUT DAILY ACTIVITY"
        subtitle="Tempel laporan aktivitas dari Notepad, parsing otomatis per baris, review status, lalu simpan semua sekaligus."
        maxWidthClass="max-w-6xl"
      >
        <DailyActivitySmartPaste {...props} forceMode="smart" onSavedSuccess={handleInputSaved} />
      </ModalShell>

      <ModalShell
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="CREATE DAILY ACTIVITY"
        subtitle="Buat satu aktivitas manual dengan detail lengkap. Cocok untuk input spesifik yang butuh field terstruktur."
        maxWidthClass="max-w-5xl"
      >
        <DailyActivityPlanForm {...props} onSavedSuccess={handleCreateSaved} />
      </ModalShell>
    </>
  )
}
