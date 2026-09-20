'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { isValidTransition } from '@/lib/services/field-tech-transitions'
import { resolveCanonicalSlaState, type CanonicalSlaState } from '@/lib/services/sla-resolver'
import { StatusBadge, resolveStatusBadgeTone } from '@/components/ui-status-badge'
import { UiButton, IconChevronDown } from '@/components/ui-button'
import {
  ExpandableHeaderLeftCells,
  ExpandableRow,
} from '@/components/ui-expandable-table'
import type {
  TechnicianLaneCounters,
  TechnicianLaneTicketDetail,
  TechnicianLaneTicketEvidence,
  TechnicianLaneTicketRow,
  TechnicianLaneTimelineEntry,
  TechnicianLaneTemporaryPeriod,
} from '@/lib/services/technician-lane-service'

export type TechnicianLanePageProps = {
  laneTitle: string
  laneKey: string
  eyebrow: string
  description: string
  ticketTypeLabel: string
  sessionUserId: number
  items: TechnicianLaneTicketRow[]
  counters: TechnicianLaneCounters
  countersError: string | null
  error: string | null
  q: string
  status: string
  priority: string
  detailsById?: Record<number, TechnicianLaneTicketDetail | null>
}

function formatDateShort(value: string | Date | null | undefined): string {
  if (!value) return '-'
  try {
    const d = typeof (value as any)?.getTime === 'function' ? (value as Date) : new Date(value as string)
    if (!Number.isFinite(d.getTime())) return String(value).slice(0, 16)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return String(value).slice(0, 16)
  }
}

function formatDurationMinutes(totalMinutes: number): string {
  const n = Math.max(0, Math.floor(Number(totalMinutes ?? 0)))
  const h = Math.floor(n / 60)
  const m = n % 60
  if (h <= 0) return `${m} menit`
  return `${h}j ${m}m`
}

function computeSlaInfo(row: {
  openedAt: string | Date | null | undefined
  slaDueAt: string | Date | null | undefined
  temporaryPeriods?: TechnicianLaneTemporaryPeriod[] | null
}): {
  state: CanonicalSlaState
  dueLabel: string
  effectiveMinutes: number
  temporaryMinutes: number
} {
  const openedAtInput = (row.openedAt as unknown) as string | Date | null | undefined
  const openedAtRaw = openedAtInput ? new Date(openedAtInput as any) : null
  const openedAt = openedAtRaw && Number.isFinite(openedAtRaw.getTime()) ? openedAtRaw : null
  const slaDueAtInput = (row.slaDueAt as unknown) as string | Date | null | undefined
  const slaDueAtRaw = slaDueAtInput ? new Date(slaDueAtInput as any) : null
  const slaDueAt = slaDueAtRaw && Number.isFinite(slaDueAtRaw.getTime()) ? slaDueAtRaw : null
  const tempPeriods = Array.isArray(row.temporaryPeriods)
    ? row.temporaryPeriods.map((p) => {
        const sInput = (p.startedAt as unknown) as string | Date | null | undefined
        const sRaw = sInput ? new Date(sInput as any) : new Date()
        const s = Number.isFinite(sRaw.getTime()) ? sRaw : new Date()
        let e: Date | null = null
        if (p.endedAt) {
          const eInput = (p.endedAt as unknown) as string | Date
          const eRaw = new Date(eInput as any)
          if (Number.isFinite(eRaw.getTime())) e = eRaw
        }
        return { startedAt: s, endedAt: e }
      })
    : undefined
  let effectiveMinutes = 0
  let temporaryMinutes = 0
  if (openedAt && Number.isFinite(openedAt.getTime())) {
    const baseMs = Math.max(0, Date.now() - openedAt.getTime())
    let closedTempMs = 0
    if (tempPeriods) {
      for (const p of tempPeriods) {
        const s = p.startedAt
        if (!p.endedAt) continue
        const e = p.endedAt
        if (Number.isFinite(s.getTime()) && Number.isFinite(e.getTime()) && e.getTime() > s.getTime()) {
          closedTempMs += e.getTime() - s.getTime()
        }
      }
    }
    temporaryMinutes = Math.max(0, Math.floor(closedTempMs / (1000 * 60)))
    effectiveMinutes = Math.max(0, Math.floor((baseMs - closedTempMs) / (1000 * 60)))
  }
  let fallbackHours: number | null = null
  if (!slaDueAt && openedAt) fallbackHours = 24
  const state = resolveCanonicalSlaState({
    slaDueAt,
    openedAt,
    fallbackTargetHours: fallbackHours,
    temporaryPeriods: tempPeriods,
  })
  let dueLabel = formatDateShort(slaDueAt)
  if (dueLabel === '-' && openedAt && fallbackHours) {
    const due = new Date(openedAt.getTime() + fallbackHours * 3600 * 1000)
    dueLabel = formatDateShort(due)
  }
  return { state, dueLabel, effectiveMinutes, temporaryMinutes }
}

function slaBadgeClass(state: CanonicalSlaState): string {
  switch (state) {
    case 'ON_TRACK':
      return 'status-chip-success bg-successSoft border-successLine text-successInk'
    case 'WARNING':
      return 'status-chip-warning bg-warningSoft border-warningLine text-warningInk'
    case 'BREACHED':
      return 'status-chip-danger bg-dangerSoft border-dangerLine text-dangerInk'
    case 'TEMPORARY_PAUSED':
      return 'status-chip-info bg-infoSoft border-infoLine text-infoInk'
    case 'UNSET':
    default:
      return 'status-chip-neutral bg-surfaceSoft border-line text-muteStrong'
  }
}

function slaBadgeLabel(state: CanonicalSlaState): string {
  switch (state) {
    case 'ON_TRACK': return 'ON TRACK'
    case 'WARNING': return 'PERINGATAN'
    case 'BREACHED': return 'TERLAMBAT'
    case 'TEMPORARY_PAUSED': return 'DIPAUSE'
    case 'UNSET':
    default: return 'BELUM SET'
  }
}

function priorityTone(priority: string): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  const p = String(priority ?? '').trim().toUpperCase()
  if (p === 'URGENT') return 'danger'
  if (p === 'HIGH') return 'warning'
  if (p === 'MEDIUM') return 'info'
  if (p === 'LOW') return 'success'
  return 'neutral'
}

function truncate(value: string | null | undefined, max: number): string {
  if (!value) return '-'
  const v = String(value)
  if (v.length <= max) return v
  return v.slice(0, max - 1) + '…'
}

export default function TechnicianLanePage(props: TechnicianLanePageProps) {
  const {
    laneTitle,
    laneKey,
    eyebrow,
    description,
    ticketTypeLabel,
    sessionUserId,
    items,
    counters,
    error,
    q,
    status,
    priority,
    countersError,
    detailsById,
  } = props

  const totalCols = 10
  const [expandedTicketId, setExpandedTicketId] = useState<number | null>(null)

  const ticketTypeForTransitions = useMemo(() => {
    const k = String(laneKey ?? '').trim().toUpperCase()
    if (k.includes('TROUBLE')) return 'TROUBLE'
    return k
  }, [laneKey])

  const isTroubleLane = ticketTypeForTransitions === 'TROUBLE'

  function actionAllowed(row: TechnicianLaneTicketRow, action: string): boolean {
    const owned =
      row.assignedUserId != null && Number(row.assignedUserId) === Number(sessionUserId)
    if (!owned) return false
    const st = String(row.status ?? '').trim().toUpperCase()
    const act = String(action ?? '').trim().toUpperCase()
    return isValidTransition(st, act, ticketTypeForTransitions)
  }

  function evidenceAllowed(row: TechnicianLaneTicketRow): boolean {
    const owned =
      row.assignedUserId != null && Number(row.assignedUserId) === Number(sessionUserId)
    if (!owned) return false
    const st = String(row.status ?? '').trim().toUpperCase()
    return st !== 'COMPLETED' && st !== 'CLOSED'
  }

  function submitAllowed(row: TechnicianLaneTicketRow): boolean {
    if (!actionAllowed(row, 'SUBMIT')) return false
    const st = String(row.status ?? '').trim().toUpperCase()
    return st === 'ON_PROGRESS' || st === 'IN_PROGRESS' || st === 'TEMPORARY' || st === 'PENDING' || st === 'ON_HOLD'
  }

  function tempAllowed(row: TechnicianLaneTicketRow): boolean {
    if (!isTroubleLane) return false
    return actionAllowed(row, 'TEMPORARY')
  }

  function resumeAllowed(row: TechnicianLaneTicketRow): boolean {
    if (!isTroubleLane) return false
    return actionAllowed(row, 'RESUME')
  }

  function renderDetail(row: TechnicianLaneTicketRow) {
    const detail = detailsById?.[row.id] ?? null
    const evidences = (detail?.evidences ?? []) as TechnicianLaneTicketEvidence[]
    const timeline = (detail?.timeline ?? []) as TechnicianLaneTimelineEntry[]
    const tempPeriods = (detail?.temporaryPeriods ?? []) as TechnicianLaneTemporaryPeriod[]
    const slaInfo = computeSlaInfo({
      openedAt: row.openedAt,
      slaDueAt: row.slaDueAt,
      temporaryPeriods: tempPeriods,
    })

    const customerName = detail?.customerName ?? row.customerName ?? '-'
    const address = detail?.address ?? row.address ?? '-'
    const phone = detail?.phone ?? row.phone ?? '-'
    const workLocation = address
    const jenisPekerjaan = detail?.title ?? row.title ?? ticketTypeLabel

    return (
      <div className="space-y-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Informasi Pelanggan</h4>
            <div className="rounded-2xl border border-line bg-white p-4 space-y-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-mute min-w-[7rem] shrink-0">Nama</span>
                <span className="font-semibold text-inkStrong text-right break-words">{customerName}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-mute min-w-[7rem] shrink-0">Telepon</span>
                <span className="font-medium text-inkStrong text-right break-words tabular-nums">{phone || '-'}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-mute min-w-[7rem] shrink-0">Alamat</span>
                <span className="font-medium text-inkStrong text-right break-words">{address}</span>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Lokasi & Jenis Pekerjaan</h4>
            <div className="rounded-2xl border border-line bg-white p-4 space-y-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-mute min-w-[9rem] shrink-0">Jenis Pekerjaan</span>
                <span className="font-semibold text-inkStrong text-right break-words">{jenisPekerjaan}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-mute min-w-[9rem] shrink-0">Lokasi Pekerjaan</span>
                <span className="font-medium text-inkStrong text-right break-words">{workLocation}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-mute min-w-[9rem] shrink-0">Status Terkini</span>
                <span className="shrink-0">
                  <StatusBadge tone={resolveStatusBadgeTone(row.status)} label={String(row.status ?? '-')} />
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-mute min-w-[9rem] shrink-0">Prioritas</span>
                <span className="shrink-0">
                  <StatusBadge tone={priorityTone(row.priority)} label={String(row.priority ?? '-')} uppercase />
                </span>
              </div>
            </div>
          </section>
        </div>

        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Timeline Pekerjaan</h4>
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <table className="min-w-full divide-y divide-line">
              <thead style={{ backgroundColor: 'var(--color-surface-soft)' }}>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-mute">
                  <th className="px-4 py-3">Acara</th>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {timeline.length > 0 ? (
                  timeline.map((t) => (
                    <tr key={t.key}>
                      <td className="px-4 py-3 align-top text-sm font-medium text-inkStrong">{t.label}</td>
                      <td className="px-4 py-3 align-top text-sm tabular-nums text-muteStrong">
                        {formatDateShort(t.at)}
                      </td>
                      <td className="px-4 py-3 align-top text-sm text-mute break-words">
                        {t.note ? truncate(t.note, 120) : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-4 py-5 text-sm text-mute">
                      Belum ada riwayat.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Bukti Pengerjaan (Evidence)</h4>
            <div className="rounded-2xl border border-line bg-white p-4 space-y-3 text-sm">
              {evidences.length > 0 ? (
                evidences.map((e) => (
                  <div key={e.id} className="rounded-xl border border-line bg-surfaceSoft p-3 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge border-infoLine bg-infoSoft text-infoInk text-[10px] uppercase tracking-[0.14em] font-semibold">
                        {String(e.evidenceType ?? 'FOTO')}
                      </span>
                      <span className="text-xs text-mute tabular-nums">
                        Upload: {formatDateShort(e.uploadedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muteStrong">
                      <span className="font-semibold text-inkStrong">{e.uploadedByName ?? `user#${e.uploadedByUserId ?? '?'}`}</span>
                    </p>
                    <p className="text-xs text-mute break-words">
                      {e.notes || e.storageReference || 'Tidak ada catatan'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-mute">Belum ada evidence terunggah.</p>
              )}
              <div className="pt-2 border-t border-line">
                <UiButton
                  variant="secondary"
                  size="md"
                  block
                  disabled={!evidenceAllowed(row)}
                  ariaLabel="Buka panel evidence untuk ticket ini"
                >
                  {evidenceAllowed(row) ? 'Upload / Lihat Evidence' : 'Evidence tidak tersedia'}
                </UiButton>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Informasi SLA</h4>
            <div className="rounded-2xl border border-line bg-white p-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-mute">State SLA</span>
                <span
                  className={
                    'status-label inline-flex items-center rounded-full border font-semibold px-3 py-1 text-xs uppercase tracking-[0.14em] ' +
                    slaBadgeClass(slaInfo.state)
                  }
                >
                  {slaBadgeLabel(slaInfo.state)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-mute">Tenggat</span>
                <span className="font-semibold tabular-nums text-inkStrong">{slaInfo.dueLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-mute">Durasi Efektif</span>
                <span className="font-medium tabular-nums text-inkStrong">
                  {formatDurationMinutes(slaInfo.effectiveMinutes)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-mute">Total Durasi Temporary</span>
                <span className="font-medium tabular-nums text-inkStrong">
                  {formatDurationMinutes(slaInfo.temporaryMinutes)}
                </span>
              </div>
            </div>
          </section>
        </div>

        <section className="space-y-2 pt-2 border-t border-line">
          <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi Pekerjaan</h5>
          <div className="flex flex-wrap items-stretch gap-3">
            {actionAllowed(row, 'ACCEPT') ? (
              <UiButton
                variant="primary"
                size="lg"
                ariaLabel={`Terima assignment ticket ${row.ticketCode}`}
              >
                Terima
              </UiButton>
            ) : null}
            {actionAllowed(row, 'START') ? (
              <UiButton
                variant="primary"
                size="lg"
                ariaLabel={`Mulai pengerjaan ticket ${row.ticketCode}`}
              >
                Mulai
              </UiButton>
            ) : null}
            {tempAllowed(row) ? (
              <UiButton
                variant="secondary"
                size="lg"
                ariaLabel={`Tandai temporary ticket ${row.ticketCode}`}
                className="bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                Temporary
              </UiButton>
            ) : null}
            {resumeAllowed(row) ? (
              <UiButton
                variant="secondary"
                size="lg"
                ariaLabel={`Resume pengerjaan ticket ${row.ticketCode} dari temporary`}
                className="bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100"
              >
                Resume
              </UiButton>
            ) : null}
            {evidenceAllowed(row) ? (
              <UiButton
                variant="secondary"
                size="lg"
                ariaLabel={`Buka evidence panel ticket ${row.ticketCode}`}
              >
                Evidence
              </UiButton>
            ) : null}
            {submitAllowed(row) ? (
              <UiButton
                variant="success"
                size="lg"
                ariaLabel={`Submit hasil pengerjaan ticket ${row.ticketCode}`}
              >
                Submit Hasil
              </UiButton>
            ) : null}
          </div>
        </section>
      </div>
    )
  }

  function renderCompactRowCells(row: TechnicianLaneTicketRow) {
    const slaInfo = computeSlaInfo({
      openedAt: row.openedAt,
      slaDueAt: row.slaDueAt,
    })
    return (
      <>
        <td className="px-4 py-3 align-middle max-w-[16ch]">
          <span
            className="text-sm font-semibold text-inkStrong whitespace-nowrap overflow-hidden text-ellipsis block"
            title={row.ticketCode}
          >
            {row.ticketCode}
          </span>
        </td>
        <td className="px-4 py-3 align-middle max-w-[12ch]">
          <span
            className="badge border-transparent whitespace-nowrap block max-w-[12ch] overflow-hidden text-ellipsis"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
            title={ticketTypeLabel}
          >
            {truncate(ticketTypeLabel, 12)}
          </span>
        </td>
        <td className="px-4 py-3 align-middle text-sm max-w-[18ch]">
          <p
            className="font-semibold text-inkStrong whitespace-nowrap overflow-hidden text-ellipsis"
            title={row.customerName ?? '-'}
          >
            {row.customerName ?? '-'}
          </p>
        </td>
        <td className="px-4 py-3 align-middle text-sm text-muteStrong max-w-[24ch]">
          <span
            className="whitespace-nowrap overflow-hidden text-ellipsis block"
            title={row.address ?? '-'}
          >
            {truncate(row.address ?? '-', 32)}
          </span>
        </td>
        <td className="px-4 py-3 align-middle">
          <StatusBadge
            tone={priorityTone(row.priority)}
            label={String(row.priority ?? '-')}
            size="sm"
          />
        </td>
        <td className="px-4 py-3 align-middle space-y-1 min-w-[12ch]">
          <div className="flex items-center gap-2">
            <span
              className={
                'status-label inline-flex items-center rounded-full border font-semibold px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] ' +
                slaBadgeClass(slaInfo.state)
              }
            >
              {slaBadgeLabel(slaInfo.state)}
            </span>
          </div>
          <p className="text-[11px] tabular-nums text-mute whitespace-nowrap">{slaInfo.dueLabel}</p>
        </td>
        <td className="px-4 py-3 align-middle">
          <StatusBadge
            tone={resolveStatusBadgeTone(row.status)}
            label={String(row.status ?? '-')}
            size="sm"
          />
        </td>
        <td className="px-4 py-3 align-middle">
          <div className="flex flex-wrap gap-2 items-center min-h-[2.5rem]">
            {actionAllowed(row, 'ACCEPT') ? (
              <UiButton
                variant="primary"
                size="sm"
                ariaLabel={`Terima ticket ${row.ticketCode}`}
              >
                Terima
              </UiButton>
            ) : null}
            {actionAllowed(row, 'START') ? (
              <UiButton
                variant="primary"
                size="sm"
                ariaLabel={`Mulai ticket ${row.ticketCode}`}
              >
                Mulai
              </UiButton>
            ) : null}
            {tempAllowed(row) ? (
              <UiButton
                variant="secondary"
                size="sm"
                ariaLabel={`Temporary ticket ${row.ticketCode}`}
                className="bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                Temporary
              </UiButton>
            ) : null}
            {resumeAllowed(row) ? (
              <UiButton
                variant="secondary"
                size="sm"
                ariaLabel={`Resume ticket ${row.ticketCode}`}
                className="bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100"
              >
                Resume
              </UiButton>
            ) : null}
            {evidenceAllowed(row) ? (
              <UiButton
                variant="secondary"
                size="sm"
                ariaLabel={`Evidence ticket ${row.ticketCode}`}
              >
                Evidence
              </UiButton>
            ) : null}
            {submitAllowed(row) ? (
              <UiButton
                variant="success"
                size="sm"
                ariaLabel={`Submit ticket ${row.ticketCode}`}
              >
                Submit
              </UiButton>
            ) : null}
          </div>
        </td>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mute">
              {eyebrow}
            </p>
            <h1 className="text-2xl font-semibold text-inkStrong">{laneTitle}</h1>
            <p className="max-w-3xl text-sm leading-6 text-mute">{description}</p>
          </div>
          <Link
            href="/dashboard/worklist"
            className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-inkStrong"
          >
            Kembali ke Worklist
          </Link>
        </div>

        {counters && counters.total > 0 && !countersError ? (
          <section
            aria-label={`Ringkasan ${laneTitle}`}
            className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div className="card-tier-2 border border-sky-200 bg-sky-50/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Menunggu Terima</p>
              <p className="mt-2 text-3xl font-bold text-sky-900 tabular-nums">{counters.assigned}</p>
              <p className="mt-1 text-xs text-sky-700">Assignment ASSIGNED menunggu konfirmasi.</p>
            </div>
            <div className="card-tier-2 border border-indigo-200 bg-indigo-50/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-700">Sudah Diterima</p>
              <p className="mt-2 text-3xl font-bold text-indigo-900 tabular-nums">{counters.accepted}</p>
              <p className="mt-1 text-xs text-indigo-700">ACCEPTED, segera mulai eksekusi.</p>
            </div>
            <div className="card-tier-2 border border-amber-200 bg-amber-50/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">On Progress</p>
              <p className="mt-2 text-3xl font-bold text-amber-900 tabular-nums">{counters.onProgress}</p>
              <p className="mt-1 text-xs text-amber-700">Pekerjaan lapangan berjalan.</p>
            </div>
            {isTroubleLane ? (
              <div className="card-tier-2 border border-violet-200 bg-violet-50/50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-700">Temporary</p>
                <p className="mt-2 text-3xl font-bold text-violet-900 tabular-nums">{counters.temporary}</p>
                <p className="mt-1 text-xs text-violet-700">Pending / butuh resume.</p>
              </div>
            ) : null}
            <div className="card-tier-2 border border-emerald-200 bg-emerald-50/50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Sudah Submit</p>
              <p className="mt-2 text-3xl font-bold text-emerald-900 tabular-nums">{counters.submitted}</p>
              <p className="mt-1 text-xs text-emerald-700">Hasil disubmit, menunggu close.</p>
            </div>
          </section>
        ) : null}

        <form
          className="mt-6 grid gap-4 lg:grid-cols-5"
          action=""
          method="get"
        >
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Cari Ticket</span>
            <input
              name="q"
              defaultValue={q}
              placeholder="ID Ticket / Nama Pelanggan / Alamat"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Status</span>
            <input
              name="status"
              defaultValue={status}
              placeholder="ASSIGNED"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Prioritas</span>
            <input
              name="priority"
              defaultValue={priority}
              placeholder="HIGH / MEDIUM"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="lg:col-span-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
            >
              Terapkan Filter
            </button>
            <span className="solid-chip">{items.length} item</span>
            <span className="text-xs text-mute tabular-nums">
              Sesi teknisi: user#{sessionUserId}
            </span>
          </div>
        </form>

        {error ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <p className="text-sm font-semibold">Gagal memuat data ticket</p>
            <p className="mt-2 text-sm leading-6 break-words">{error}</p>
          </div>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-3xl border border-line">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line">
              <thead style={{ backgroundColor: 'var(--color-surface-soft)' }}>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-mute">
                  <ExpandableHeaderLeftCells />
                  <th className="px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Lokasi / Alamat</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">SLA + Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-surface">
                {items.map((row, idx) => {
                  const compactRow = renderCompactRowCells(row)
                  const detail = renderDetail(row)
                  const isOpen = expandedTicketId === row.id
                  return (
                    <ExpandableRow
                      key={row.id}
                      id={`${row.id}`}
                      num={idx + 1}
                      totalCols={totalCols}
                      compactRow={compactRow}
                      detail={detail}
                      startOpen={isOpen}
                      onToggle={(next) => setExpandedTicketId(next ? row.id : null)}
                    />
                  )
                })}
                {!items.length ? (
                  <tr>
                    <td className="px-4 py-8 text-sm text-mute" colSpan={totalCols}>
                      <div className="text-center space-y-2">
                        <p className="font-semibold text-inkStrong">Tidak ada ticket</p>
                        <p className="text-xs">
                          Tidak ada {ticketTypeLabel} yang ditugaskan ke Anda pada kombinasi filter ini.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-mute">
          <Link
            href="/dashboard/tracking/work-orders"
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-medium text-muteStrong transition hover:text-inkStrong"
          >
            <IconChevronDown className="h-3 w-3 rotate-90" />
            Buka tracking work orders lengkap
          </Link>
        </div>
      </section>
    </div>
  )
}
