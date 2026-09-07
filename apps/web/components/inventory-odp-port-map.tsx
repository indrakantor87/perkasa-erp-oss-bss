'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import type { DomainReviewRow } from '@/lib/types'

export type CanonicalPortStatus =
  | 'AVAILABLE'
  | 'USED'
  | 'BLOCKED'
  | 'RESERVED'
  | 'FAULTY'
  | 'DISABLED'
  | 'UNKNOWN'

export type OdpPortMapClientRow = {
  portId: number
  odpCode: string
  odpName: string
  portNo: number
  portStatus: CanonicalPortStatus
  serviceNo: string | null
  customerCode: string | null
  customerName: string | null
  installedAt: string | Date | null
}

export type OdpPortMapClientOverview = {
  odpId: number
  odpCode: string
  odpName: string
  totalPorts: number
  activePorts: number
  locationText: string | null
  latitude: number | null
  longitude: number | null
}

export type OdpPortMapClientResponse = {
  overview: OdpPortMapClientOverview | null
  ports: OdpPortMapClientRow[]
  statusSummary: Record<string, number>
  ready: boolean
  truncated?: boolean
  reason?: string
}

export const PORT_STATUS_LABELS: Record<CanonicalPortStatus, string> = {
  AVAILABLE: 'AVAILABLE · Tersedia',
  USED: 'USED · Terpakai',
  BLOCKED: 'BLOCKED · Diblokir',
  RESERVED: 'RESERVED · Dicadangkan',
  FAULTY: 'FAULTY · Bermasalah',
  DISABLED: 'DISABLED · Nonaktif',
  UNKNOWN: 'UNKNOWN · Tidak Diketahui',
}

export function toCanonicalPortStatus(value: string | null | undefined): CanonicalPortStatus {
  const normalized = String(value ?? '').trim().toUpperCase()
  switch (normalized) {
    case 'AVAILABLE':
    case 'UNUSED':
    case 'FREE':
      return 'AVAILABLE'
    case 'USED':
    case 'ACTIVE':
    case 'OCCUPIED':
      return 'USED'
    case 'BLOCKED':
    case 'LOCKED':
      return 'BLOCKED'
    case 'RESERVED':
    case 'PENDING':
    case 'HOLD':
      return 'RESERVED'
    case 'FAULTY':
    case 'FAULT':
    case 'BROKEN':
    case 'DAMAGED':
      return 'FAULTY'
    case 'DISABLED':
    case 'INACTIVE':
    case 'OFFLINE':
      return 'DISABLED'
    default:
      return 'UNKNOWN'
  }
}

export function getPortStatusBadgeTone(status: CanonicalPortStatus) {
  switch (status) {
    case 'AVAILABLE':
      return {
        chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        ring: 'ring-emerald-200',
        dot: '#10b981',
        panel: 'border-emerald-100 bg-emerald-50/40',
      }
    case 'USED':
      return {
        chip: 'border-sky-200 bg-sky-50 text-sky-700',
        ring: 'ring-sky-200',
        dot: '#0284c7',
        panel: 'border-sky-100 bg-sky-50/40',
      }
    case 'BLOCKED':
      return {
        chip: 'border-orange-300 bg-orange-50 text-orange-700',
        ring: 'ring-orange-200',
        dot: '#ea580c',
        panel: 'border-orange-100 bg-orange-50/40',
      }
    case 'RESERVED':
      return {
        chip: 'border-amber-200 bg-amber-50 text-amber-700',
        ring: 'ring-amber-200',
        dot: '#d97706',
        panel: 'border-amber-100 bg-amber-50/40',
      }
    case 'FAULTY':
      return {
        chip: 'border-rose-200 bg-rose-50 text-rose-700',
        ring: 'ring-rose-200',
        dot: '#e11d48',
        panel: 'border-rose-100 bg-rose-50/40',
      }
    case 'DISABLED':
      return {
        chip: 'border-slate-300 bg-slate-100 text-slate-600',
        ring: 'ring-slate-200',
        dot: '#475569',
        panel: 'border-slate-200 bg-slate-50/70',
      }
    default:
      return {
        chip: 'border-slate-200 bg-white text-slate-600',
        ring: 'ring-slate-200',
        dot: '#94a3b8',
        panel: 'border-slate-200 bg-white',
      }
  }
}

function formatDateTime(value: string | Date | null) {
  if (!value) return '-'
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatPortNumber(no: number) {
  if (!Number.isFinite(no) || no <= 0) return '#'
  if (no < 10) return `0${no}`
  return String(no)
}

export function buildCustomerDetailHref(params: { customerCode: string | null; serviceNo: string | null }) {
  if (params.serviceNo) {
    const focus = encodeURIComponent(params.serviceNo)
    return `/customers/cs-admin?focus=${focus}`
  }
  if (params.customerCode) {
    const focus = encodeURIComponent(params.customerCode)
    return `/customers/cs-admin?focus=${focus}`
  }
  return null
}

export function InventoryOdpPortMap({
  selectedRow,
  reviewDbReady,
}: {
  selectedRow: DomainReviewRow | null
  reviewDbReady: boolean
}) {
  const odpIdRaw = selectedRow?.id?.toString()?.startsWith('ODP-')
    ? selectedRow.id.slice('ODP-'.length)
    : null
  const odpCode = selectedRow?.primary ? String(selectedRow.primary).trim() : ''
  const odpName = selectedRow?.secondary ? String(selectedRow.secondary).trim() : ''
  const overviewLatitude = selectedRow ? Number(String(pickMeta(selectedRow.meta, 'Latitude: ') || '').trim() || '0') || null : null
  const overviewLongitude = selectedRow ? Number(String(pickMeta(selectedRow.meta, 'Longitude: ') || '').trim() || '0') || null : null
  const overviewTotalPorts = selectedRow
    ? Number.parseInt(String(pickMeta(selectedRow.meta, 'Total Ports: ') || '0').trim(), 10) || 0
    : 0
  const overviewActivePorts = selectedRow
    ? Number.parseInt(String(pickMeta(selectedRow.meta, 'Active Ports: ') || '0').trim(), 10) || 0
    : 0

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<OdpPortMapClientResponse | null>(null)

  useEffect(() => {
    setPayload(null)
    setError(null)
    setIsLoading(false)
    if (!reviewDbReady) return
    if (!selectedRow) return
    if (!odpCode && !odpIdRaw) return

    let cancelled = false
    setIsLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (odpCode) params.set('odpCode', odpCode)
    else if (odpIdRaw) params.set('odpId', odpIdRaw)

    fetch(`/api/inventory/odp-ports/map?${params.toString()}`)
      .then(async (response) => {
        const data = (await response.json()) as OdpPortMapClientResponse
        if (cancelled) return
        if (response.ok && data?.ready === true && !data?.reason) {
          setPayload(data)
          setError(null)
        } else if (response.ok && data?.ready === true && data?.reason?.trim()) {
          setPayload(data)
          setError(data.reason.trim())
        } else {
          setPayload({
            overview: null,
            ports: [],
            statusSummary: {},
            ready: Boolean(data?.ready),
          })
          setError(data?.reason?.trim() || `Gagal memuat port map (HTTP ${response.status}).`)
        }
      })
      .catch((err) => {
        if (cancelled) return
        setPayload({ overview: null, ports: [], statusSummary: {}, ready: false })
        setError(err?.message?.trim() || 'Gagal memuat port map ODP.')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [reviewDbReady, selectedRow?.id, odpCode, odpIdRaw])

  const effectiveOverview: OdpPortMapClientOverview | null = useMemo(() => {
    if (payload?.overview) return payload.overview
    if (!selectedRow) return null
    if (!odpCode && !odpIdRaw) return null
    const numericId = odpIdRaw ? Number.parseInt(odpIdRaw, 10) : 0
    if (!numericId && !odpCode) return null
    return {
      odpId: numericId || 0,
      odpCode,
      odpName,
      totalPorts: overviewTotalPorts,
      activePorts: overviewActivePorts,
      locationText: selectedRow.detail?.trim() || null,
      latitude: overviewLatitude,
      longitude: overviewLongitude,
    }
  }, [payload, selectedRow, odpCode, odpIdRaw, overviewTotalPorts, overviewActivePorts, overviewLatitude, overviewLongitude])

  const effectivePorts: OdpPortMapClientRow[] = useMemo(() => {
    return (payload?.ports ?? []).map((port) => ({
      ...port,
      portStatus: toCanonicalPortStatus(port.portStatus),
    }))
  }, [payload])

  const effectiveSummary = useMemo(() => {
    if (payload?.statusSummary && Object.keys(payload.statusSummary).length > 0) {
      const canonical: Record<string, number> = {}
      for (const rawKey of Object.keys(payload.statusSummary)) {
        const canonicalKey = toCanonicalPortStatus(rawKey)
        canonical[canonicalKey] = (canonical[canonicalKey] ?? 0) + Number(payload.statusSummary[rawKey] ?? 0)
      }
      return canonical
    }
    const tally: Record<string, number> = {}
    for (const port of effectivePorts) {
      tally[port.portStatus] = (tally[port.portStatus] ?? 0) + 1
    }
    return tally
  }, [payload, effectivePorts])

  const totalPortsByOverview = effectiveOverview?.totalPorts ?? 0
  const portsMissingFromDetail = effectivePorts.length === 0 ? 0 : Math.max(0, totalPortsByOverview - effectivePorts.length)

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            PORT MAP ODP
          </p>
          <h4 className="mt-1 text-lg font-semibold text-slate-950">
            {effectiveOverview?.odpName || effectiveOverview?.odpCode || 'Pilih ODP untuk melihat port map'}
          </h4>
          {(effectiveOverview?.odpName && effectiveOverview?.odpCode) ? (
            <p className="mt-1 text-xs text-slate-500">
              {effectiveOverview.odpCode} · {effectiveOverview.locationText || 'Lokasi ODP belum diisi'}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedRow ? (
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">
              {isLoading ? 'Memuat port map...' : error ? 'Ada masalah saat memuat port map' : 'Siap'}
            </span>
          ) : (
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">Belum ada ODP yang dipilih</span>
          )}
          {reviewDbReady ? (
            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Review DB Aktif</span>
          ) : (
            <span className="badge border-slate-300 bg-slate-100 text-slate-600">Review DB Tidak Aktif</span>
          )}
        </div>
      </header>

      {effectiveOverview ? (
        <div className="grid gap-3 border-b border-slate-200 bg-slate-50/70 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <OverviewMetricCard label="Total Port" value={effectiveOverview.totalPorts} tone="slate" />
          <OverviewMetricCard label="Aktif / Terpakai" value={effectiveOverview.activePorts} tone="sky" />
          <OverviewMetricCard
            label="Tersedia"
            value={Math.max(0, (effectiveOverview.totalPorts ?? 0) - (effectiveOverview.activePorts ?? 0))}
            tone="emerald"
          />
          <OverviewMetricCard
            label="Row Detail Port"
            value={effectivePorts.length}
            tone={portsMissingFromDetail > 0 ? 'amber' : 'slate'}
            hint={portsMissingFromDetail > 0 ? `Kurang ${portsMissingFromDetail} row dari total port header` : undefined}
          />
        </div>
      ) : null}

      {effectiveOverview ? (
        <div className="border-b border-slate-200 bg-white px-4 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Ringkasan Status Port
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {(['AVAILABLE', 'USED', 'BLOCKED', 'RESERVED', 'FAULTY', 'DISABLED'] as const).map((status) => {
              const count = Number(effectiveSummary[status] ?? 0)
              const tone = getPortStatusBadgeTone(status)
              return (
                <div
                  key={status}
                  className={`rounded-xl border ${tone.panel} px-3 py-2 shadow-none`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: tone.dot }}
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                      {status}
                    </span>
                  </div>
                  <div className="mt-1 text-xl font-semibold text-slate-950">{count}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {PORT_STATUS_LABELS[status].split(' · ')[1]}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="px-4 py-4">
        {!selectedRow ? (
          <EmptyState
            title="Pilih ODP terlebih dahulu"
            description="Pilih ODP dari daftar ODP terbaru atau klik marker di peta untuk memuat port map per ODP."
          />
        ) : !reviewDbReady ? (
          <EmptyState
            title="Review DB tidak aktif"
            description="Port map ODP hanya tersedia ketika review DB benar-benar tersedia. Saat ini aplikasi sedang menggunakan mode fallback."
          />
        ) : isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : effectivePorts.length === 0 ? (
          <EmptyState
            title="Belum ada port detail"
            description="ODP ini belum memiliki row detail network_odp_ports. Kapasitas port dapat dilihat di header ODP. Gunakan form Assign Port untuk generate row port detail."
          />
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
              {effectivePorts.map((port) => {
                const tone = getPortStatusBadgeTone(port.portStatus)
                const href = buildCustomerDetailHref({
                  customerCode: port.customerCode,
                  serviceNo: port.serviceNo,
                })
                return (
                  <article
                    key={`${port.portId}-${port.odpCode}-${port.portNo}`}
                    className={`group relative flex flex-col gap-1 rounded-2xl border ${tone.panel} px-3 py-3 transition hover:ring-2 hover:${tone.ring}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: tone.dot }}
                        />
                        <span className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] ${tone.chip}`}>
                          {port.portStatus}
                        </span>
                      </div>
                      <span className="text-base font-semibold leading-none text-slate-950 tabular-nums">
                        {formatPortNumber(port.portNo)}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">
                      Port #{formatPortNumber(port.portNo)} · {PORT_STATUS_LABELS[port.portStatus]}
                    </div>
                    <div className="mt-1 space-y-0.5 text-xs text-slate-700">
                      {port.serviceNo ? (
                        <div>
                          <span className="font-semibold">Service:</span> {port.serviceNo}
                        </div>
                      ) : null}
                      {port.customerCode ? (
                        <div>
                          <span className="font-semibold">Pelanggan:</span> {port.customerCode}
                          {port.customerName ? ` · ${port.customerName}` : ''}
                        </div>
                      ) : port.customerName ? (
                        <div>
                          <span className="font-semibold">Pelanggan:</span> {port.customerName}
                        </div>
                      ) : null}
                      {port.installedAt ? (
                        <div className="text-[11px] text-slate-500">
                          <span className="font-semibold">Dipasang:</span> {formatDateTime(port.installedAt)}
                        </div>
                      ) : null}
                    </div>
                    {href ? (
                      <div className="mt-2">
                        <Link
                          href={href}
                          className="inline-flex items-center rounded-md bg-slate-950 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-slate-800"
                        >
                          Lihat Pelanggan
                        </Link>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function OverviewMetricCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: number
  tone: 'slate' | 'sky' | 'emerald' | 'amber'
  hint?: string
}) {
  const toneMap = {
    slate: 'border-slate-200 bg-white',
    sky: 'border-sky-200 bg-sky-50/60',
    emerald: 'border-emerald-200 bg-emerald-50/60',
    amber: 'border-amber-200 bg-amber-50/60',
  } as const
  return (
    <div className={`rounded-xl border px-3 py-2 ${toneMap[tone]}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-950 tabular-nums">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-amber-700">{hint}</div> : null}
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 mx-auto max-w-xl text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6">
      <p className="text-sm font-semibold text-rose-700">Gagal memuat port map ODP</p>
      <p className="mt-1 text-xs leading-relaxed text-rose-600">{error}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
      {Array.from({ length: 20 }).map((_, index) => (
        <div
          key={`loading-${index}`}
          className="h-[96px] animate-pulse rounded-2xl border border-slate-200 bg-slate-100"
        />
      ))}
    </div>
  )
}
