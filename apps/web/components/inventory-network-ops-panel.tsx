'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { InventoryDeviceAssignmentForm } from '@/components/inventory-device-assignment-form'
import { InventoryDeviceReturnForm } from '@/components/inventory-device-return-form'
import { InventoryOdpCreateForm } from '@/components/inventory-odp-create-form'
import { InventoryOdpPortAssignForm } from '@/components/inventory-odp-port-assign-form'
import { InventoryOdpPortStatusForm } from '@/components/inventory-odp-port-status-form'
import { TableQuickActionModal, type TableQuickActionPayload } from '@/components/table-quick-action-modal'
import { useEffect, useMemo, useState } from 'react'
import { Download, Map, Pencil, Plus, Upload } from 'lucide-react'
import type { DomainReviewRow, DomainReviewSection } from '@/lib/types'

const InventoryOdpLeafletMap = dynamic(
  () => import('@/components/inventory-odp-leaflet-map').then((module) => module.InventoryOdpLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] w-full items-center justify-center bg-slate-950 text-sm font-medium text-slate-300">
        Memuat peta ODP...
      </div>
    ),
  },
)

const InventoryOdpImportExcelModal = dynamic(
  () => import('@/components/inventory-odp-import-excel-modal').then((module) => module.InventoryOdpImportExcelModal),
  {
    ssr: false,
  },
)

function findSection(sections: DomainReviewSection[], keyword: string) {
  return sections.find((section) => section.title.toUpperCase().includes(keyword.toUpperCase())) ?? null
}

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function isAccessoryCategory(value: string) {
  const normalized = value.trim().toUpperCase()
  return normalized.includes('AKSES') || normalized.includes('ACCESS')
}

function buildOdpMapHref(row: DomainReviewRow) {
  const latitude = pickMeta(row.meta, 'Latitude: ')
  const longitude = pickMeta(row.meta, 'Longitude: ')
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  const zoom = 18
  return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(String(lat))}&mlon=${encodeURIComponent(String(lng))}#map=${zoom}/${encodeURIComponent(
    String(lat),
  )}/${encodeURIComponent(String(lng))}`
}

function getStatusTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('FAULT') || normalized.includes('DISABLED')) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  if (normalized.includes('RESERVED')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (normalized.includes('USED') || normalized.includes('ACTIVE') || normalized.includes('/')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  if (normalized.includes('DONE') || normalized.includes('AVAILABLE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  return 'border-slate-200 bg-white text-slate-600'
}

function buildCsvCell(value: string) {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim()
  return `"${normalized.replace(/"/g, '""')}"`
}

function getPortCapacityTone(params: { totalPorts: number; activePorts: number }) {
  if (params.totalPorts <= 0) return 'border-slate-500/60 bg-slate-500/10 text-slate-100'
  const ratio = params.activePorts / params.totalPorts
  if (params.activePorts >= params.totalPorts) return 'border-red-500/60 bg-red-500/10 text-red-100'
  if (ratio >= 0.5) return 'border-amber-500/60 bg-amber-500/10 text-amber-100'
  return 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
}

function getPortCapacityLabel(params: { totalPorts: number; activePorts: number }) {
  if (params.totalPorts <= 0) return 'n/a'
  if (params.activePorts >= params.totalPorts) return 'Penuh'
  if (params.activePorts / params.totalPorts >= 0.5) return '> 50%'
  return '< 50%'
}

function buildRouteDistanceMeters(points: Array<{ lat: number; lng: number }>) {
  if (points.length < 2) return 0
  const earthRadius = 6371000
  let total = 0
  for (let index = 1; index < points.length; index += 1) {
    const left = points[index - 1]
    const right = points[index]
    const lat1 = (left.lat * Math.PI) / 180
    const lat2 = (right.lat * Math.PI) / 180
    const dLat = ((right.lat - left.lat) * Math.PI) / 180
    const dLng = ((right.lng - left.lng) * Math.PI) / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    total += earthRadius * c
  }
  return total
}

function formatDistanceMeters(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0 m'
  if (value < 1000) return `${Math.round(value)} m`
  return `${(value / 1000).toFixed(2)} km`
}

function formatDistanceMetersWithUnit(value: number, unit: 'auto' | 'm' | 'km') {
  if (!Number.isFinite(value) || value <= 0) return '0 m'
  if (unit === 'm') return `${Math.round(value)} m`
  if (unit === 'km') return `${(value / 1000).toFixed(2)} km`
  return formatDistanceMeters(value)
}

function exportOdpCsv(rows: DomainReviewRow[]) {
  const headers = ['#', 'Nama ODP', 'POP', 'Lokasi', 'Kapasitas', 'Terpakai', 'Sisa', 'Status', 'Status Tiang']
  const lines = [headers.map(buildCsvCell).join(',')]
  rows.forEach((row, index) => {
    const totalPorts = Number.parseInt(pickMeta(row.meta, 'Total Ports: ') || '0', 10) || 0
    const activePorts = Number.parseInt(pickMeta(row.meta, 'Active Ports: ') || '0', 10) || 0
    const remaining = Math.max(0, totalPorts - activePorts)
    const status = getPortCapacityLabel({ totalPorts, activePorts })

    lines.push(
      [
        String(index + 1),
        row.primary,
        row.secondary,
        row.detail,
        String(totalPorts || '-'),
        String(activePorts || '-'),
        String(remaining || '-'),
        status,
        'n/a',
      ]
        .map(buildCsvCell)
        .join(','),
    )
  })

  const content = `\uFEFF${lines.join('\n')}`
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const filename = `port-odp-${new Date().toISOString().slice(0, 10)}.csv`
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(link.href), 500)
}

function buildInventoryQuickActionPayload(row: DomainReviewRow): TableQuickActionPayload {
  const totalPorts = pickMeta(row.meta, 'Total Ports: ')
  const activePorts = pickMeta(row.meta, 'Active Ports: ')
  const latitude = pickMeta(row.meta, 'Latitude: ')
  const longitude = pickMeta(row.meta, 'Longitude: ')
  const mapHref = buildOdpMapHref(row)

  return {
    id: row.id,
    title: row.primary,
    subtitle: row.secondary,
    description: row.detail,
    draftLabel: 'ODP',
    draftSeed: [
      totalPorts ? `Total Ports: ${totalPorts}` : null,
      activePorts ? `Active Ports: ${activePorts}` : null,
      latitude ? `Latitude: ${latitude}` : null,
      longitude ? `Longitude: ${longitude}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    badges: [
      { label: row.status, tone: getStatusTone(row.status) },
      ...(totalPorts ? [{ label: `Total ${totalPorts}` }] : []),
      ...(activePorts ? [{ label: `Active ${activePorts}` }] : []),
    ],
    sections: [
      {
        title: 'Lokasi',
        value: row.detail,
      },
      {
        title: 'Port',
        value: [`Total: ${totalPorts || '-'}`, `Active: ${activePorts || '-'}`].join('\n'),
      },
      {
        title: 'Koordinat',
        value: [`Lat: ${latitude || '-'}`, `Lng: ${longitude || '-'}`].join('\n'),
      },
      {
        title: 'Referensi',
        value: row.secondary,
      },
    ],
    actions: mapHref
      ? [
          {
            label: 'Buka Maps',
            href: mapHref,
            tone: 'primary',
            external: true,
          },
        ]
      : [],
  }
}

export function InventoryNetworkOpsPanel({
  sections,
  canCreate,
  canUpdate,
  reviewDbReady,
  itemSuggestions,
  odpSuggestions,
  assignmentSuggestions,
  showDeviceReturnForm,
}: {
  sections: DomainReviewSection[]
  canCreate: boolean
  canUpdate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  odpSuggestions: string[]
  assignmentSuggestions: string[]
  showDeviceReturnForm: boolean
}) {
  const odpSection = findSection(sections, 'ODP TERBARU')
  const usedPortSection = findSection(sections, 'PORT TERPAKAI')
  const issuePortSection = findSection(sections, 'PORT BERMASALAH')
  const assignmentSection = findSection(sections, 'DEVICE ASSIGNMENT')
  const returnSection = findSection(sections, 'DEVICE RETURN')

  if (!odpSection && !usedPortSection && !issuePortSection && !assignmentSection) {
    return null
  }

  const accessoryAssignments = (assignmentSection?.rows ?? []).filter((row) =>
    isAccessoryCategory(pickMeta(row.meta, 'Category: ')),
  )
  const odpRows = odpSection?.rows ?? []
  const usedPortRows = usedPortSection?.rows ?? []
  const issuePortRows = issuePortSection?.rows ?? []
  const assignmentRows = assignmentSection?.rows ?? []
  const returnRows = returnSection?.rows ?? []
  const [quickActionItem, setQuickActionItem] = useState<TableQuickActionPayload | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState('')
  const [mapRefreshKey, setMapRefreshKey] = useState(0)
  const [mapFitKey, setMapFitKey] = useState(0)
  const [mapFullscreenActive, setMapFullscreenActive] = useState(false)
  const [routeMode, setRouteMode] = useState(false)
  const [routePoints, setRoutePoints] = useState<Array<{ lat: number; lng: number; label: string }>>([])
  const [routeDistanceUnit, setRouteDistanceUnit] = useState<'auto' | 'm' | 'km'>('auto')
  const [mapFitMode, setMapFitMode] = useState<'markers' | 'route'>('markers')
  const canWrite = canCreate && reviewDbReady

  const normalizedSearch = searchQuery.trim().toLowerCase()
  const filteredOdpRows = odpRows.filter((row) => {
    if (!normalizedSearch) return true
    const latitude = pickMeta(row.meta, 'Latitude: ')
    const longitude = pickMeta(row.meta, 'Longitude: ')
    return [row.primary, row.secondary, row.detail, latitude, longitude].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(normalizedSearch),
    )
  })
  const visibleOdpRows = filteredOdpRows.slice(0, pageSize)
  const routeDistanceMeters = useMemo(() => buildRouteDistanceMeters(routePoints), [routePoints])

  useEffect(() => {
    if (routeMode) return
    if (routePoints.length === 0) return
    setRoutePoints([])
    setMapFitMode('markers')
    setMapFitKey((current) => current + 1)
  }, [routeMode, routePoints.length])

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-gradient-to-b from-[#071a3e] via-[#0b1f45] to-[#10284f] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-white">PORT ODP</h3>
          <p className="mt-1 text-sm leading-5 text-slate-200">Kapasitas ODP bisa berbeda. Merah (penuh), Kuning (&gt; 50%), Hijau (&lt; 50%).</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowMap((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-950"
          >
            <Map className="h-4 w-4" />
            {showMap ? 'Tutup Peta' : 'Lihat Peta'}
          </button>
          {canWrite ? (
            <Link
              href="/inventory#inventory-action-odp-create"
              className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus className="h-4 w-4" />
              Tambah ODP
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm font-semibold text-slate-400"
            >
              <Plus className="h-4 w-4" />
              Tambah ODP
            </button>
          )}
          <button
            type="button"
            onClick={() => exportOdpCsv(visibleOdpRows)}
            className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
          {canWrite ? (
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <Upload className="h-4 w-4" />
              Import Excel
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm font-semibold text-slate-400"
            >
              <Upload className="h-4 w-4" />
              Import Excel
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/20 px-4 py-3 text-sm text-slate-100">
        Fokus ke data PORT ODP untuk kebutuhan operasional CS & Admin CS sesuai struktur menu terbaru.
      </div>

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={String(pageSize)}
            onChange={(event) => setPageSize(Number.parseInt(event.target.value, 10))}
            className="rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="10">Tampil 10</option>
            <option value="25">Tampil 25</option>
            <option value="50">Tampil 50</option>
          </select>
          <select className="rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-white outline-none">
            <option>Semua POP</option>
          </select>
          <select className="rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-white outline-none">
            <option>CS & Admin CS</option>
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2 text-sm text-slate-100">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Cari ODP / lokasi... (paste link maps)"
            className="w-[340px] bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {showMap ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/20">
          <div className="flex flex-col gap-2 border-b border-slate-700 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setRouteMode((current) => !current)}
                className="rounded-md border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-700"
              >
                Mode Rute: {routeMode ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                disabled={routePoints.length === 0}
                onClick={() =>
                  setRoutePoints((current) => {
                    if (current.length === 0) return current
                    return current.slice(0, -1)
                  })
                }
                className={
                  routePoints.length === 0
                    ? 'rounded-md border border-slate-700 bg-slate-900/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400'
                    : 'rounded-md border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-700'
                }
              >
                Undo
              </button>
              <button
                type="button"
                disabled={routePoints.length === 0}
                onClick={() => setRoutePoints([])}
                className={
                  routePoints.length === 0
                    ? 'rounded-md border border-slate-700 bg-slate-900/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400'
                    : 'rounded-md border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-700'
                }
              >
                Reset Rute
              </button>
              <details className="relative">
                <summary className="cursor-pointer list-none rounded-md border border-slate-600 bg-slate-800/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-700">
                  Jarak: {formatDistanceMetersWithUnit(routeDistanceMeters, routeDistanceUnit)}
                </summary>
                <div className="absolute left-0 top-[calc(100%+6px)] z-[600] w-[180px] rounded-xl border border-slate-700 bg-slate-950/95 p-2 shadow-[0_16px_40px_rgba(2,6,23,0.45)]">
                  {(
                    [
                      { key: 'auto' as const, label: 'Auto' },
                      { key: 'm' as const, label: 'Meter (m)' },
                      { key: 'km' as const, label: 'Kilometer (km)' },
                    ] as const
                  ).map((item) => {
                    const active = routeDistanceUnit === item.key
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setRouteDistanceUnit(item.key)}
                        className={
                          active
                            ? 'w-full rounded-md border border-white bg-white px-3 py-2 text-left text-xs font-semibold text-slate-950'
                            : 'w-full rounded-md border border-slate-700 bg-slate-900/30 px-3 py-2 text-left text-xs font-semibold text-white transition hover:bg-slate-800/70'
                        }
                      >
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              </details>
              <button
                type="button"
                onClick={() => setMapFitKey((current) => current + 1)}
                className="rounded-md border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-700"
              >
                Reset View
              </button>
              <button
                type="button"
                disabled={routePoints.length < 2}
                onClick={() => {
                  if (routePoints.length < 2) return
                  setMapFitMode((current) => (current === 'markers' ? 'route' : 'markers'))
                  setMapFitKey((current) => current + 1)
                }}
                className={
                  routePoints.length < 2
                    ? 'rounded-md border border-slate-700 bg-slate-900/30 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400'
                    : 'rounded-md border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-700'
                }
              >
                Fit: {mapFitMode === 'route' ? 'Rute' : 'Marker'}
              </button>
              <button
                type="button"
                onClick={() => setMapRefreshKey((current) => current + 1)}
                className="rounded-md border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-700"
              >
                Refresh Peta
              </button>
              <button
                type="button"
                onClick={() => {
                  const container = document.getElementById('odp-leaflet-map-shell')
                  if (!container) return
                  if (!document.fullscreenElement) {
                    container.requestFullscreen?.().then(() => setMapFullscreenActive(true)).catch(() => null)
                  } else {
                    document.exitFullscreen?.().then(() => setMapFullscreenActive(false)).catch(() => null)
                  }
                }}
                className="rounded-md border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-700"
              >
                {mapFullscreenActive ? 'Keluar Fullscreen' : 'Fullscreen'}
              </button>
            </div>
            <span className="badge border-slate-600 bg-slate-800/70 text-slate-100">{filteredOdpRows.length} marker</span>
          </div>
          {routeMode ? (
            <div className="border-b border-slate-700 bg-slate-950/30 px-3 py-2 text-xs text-slate-200">
              Mode Rute aktif. Klik marker untuk menambahkan titik rute. Gunakan Undo/Reset Rute untuk koreksi urutan.
            </div>
          ) : null}
          <div id="odp-leaflet-map-shell" className="relative h-[520px] w-full bg-slate-950">
            <div className="pointer-events-none absolute left-3 top-3 z-[500] flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-slate-600 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                Mode Rute: {routeMode ? 'ON' : 'OFF'}
              </span>
              <span className="rounded-md border border-slate-600 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                Titik: {routePoints.length}
              </span>
            </div>
            <div className="pointer-events-none absolute right-3 top-3 z-[500] flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-slate-600 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                Marker: {filteredOdpRows.length}
              </span>
              <span className="rounded-md border border-slate-600 bg-slate-950/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white">
                Fit: {mapFitMode === 'route' ? 'Rute' : 'Marker'}
              </span>
            </div>
            <InventoryOdpLeafletMap
              rows={filteredOdpRows}
              height={520}
              mapKey={`${mapRefreshKey}:${mapFitKey}`}
              routeMode={routeMode}
              routePoints={routePoints}
              fitMode={mapFitMode}
              onSelectRow={(row) => setQuickActionItem(buildInventoryQuickActionPayload(row))}
              onPickRoutePoint={({ row, lat, lng }) => {
                if (!routeMode) return
                setRoutePoints((current) => [...current, { lat, lng, label: row.primary }].slice(0, 24))
              }}
            />
          </div>
          {routeMode && routePoints.length ? (
            <div className="border-t border-slate-700 bg-slate-950/30 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-200">Daftar Titik Rute</p>
                <span className="badge border-slate-600 bg-slate-800/70 text-slate-100">{routePoints.length} titik</span>
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {routePoints.map((point, index) => (
                  <div key={`${point.lat}-${point.lng}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700 bg-slate-900/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {index + 1}. {point.label}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-300">
                        {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setRoutePoints((current) => {
                          if (index < 0 || index >= current.length) return current
                          return current.filter((_, itemIndex) => itemIndex !== index)
                        })
                      }
                      className="rounded-md border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-slate-700"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <InventoryOdpImportExcelModal open={showImportModal} onClose={() => setShowImportModal(false)} />

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-700 bg-[#152643] shadow-[0_10px_30px_rgba(2,6,23,0.25)]">
        <div className="overflow-x-auto">
          <table className="min-w-[1180px] w-full border-collapse">
            <thead className="bg-[#162d66]">
              <tr className="text-left text-[11px] font-bold uppercase tracking-[0.14em] text-slate-100">
                <th className="w-[44px] px-3 py-3"></th>
                <th className="w-[60px] px-3 py-3">#</th>
                <th className="w-[200px] px-3 py-3">Nama ODP</th>
                <th className="w-[140px] px-3 py-3">POP</th>
                <th className="px-3 py-3">Lokasi</th>
                <th className="w-[120px] px-3 py-3">Kapasitas</th>
                <th className="w-[120px] px-3 py-3">Terpakai</th>
                <th className="w-[120px] px-3 py-3">Sisa</th>
                <th className="w-[120px] px-3 py-3">Status</th>
                <th className="w-[140px] px-3 py-3">Status Tiang</th>
                <th className="w-[90px] px-3 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700 bg-[#1c2b45]">
              {visibleOdpRows.map((row, index) => {
                const totalPorts = Number.parseInt(pickMeta(row.meta, 'Total Ports: ') || '0', 10) || 0
                const activePorts = Number.parseInt(pickMeta(row.meta, 'Active Ports: ') || '0', 10) || 0
                const remaining = Math.max(0, totalPorts - activePorts)
                const mapHref = buildOdpMapHref(row)
                const statusTone = getPortCapacityTone({ totalPorts, activePorts })

                return (
                  <tr key={row.id} className="align-top transition-colors hover:bg-[#24395c]">
                    <td className="px-3 py-2 text-sm text-slate-100"></td>
                    <td className="px-3 py-2 text-sm text-slate-100">{index + 1}</td>
                    <td className="px-3 py-2 text-sm font-semibold text-white">{row.primary}</td>
                    <td className="px-3 py-2 text-sm text-slate-100">{row.secondary}</td>
                    <td className="px-3 py-2 text-sm text-slate-100">
                      <p className="line-clamp-2">{row.detail}</p>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-100">{totalPorts || '-'}</td>
                    <td className="px-3 py-2 text-sm text-slate-100">{activePorts || '-'}</td>
                    <td className="px-3 py-2 text-sm text-slate-100">{remaining || '-'}</td>
                    <td className="px-3 py-2 text-sm">
                      <span className={`badge ${statusTone}`}>{getPortCapacityLabel({ totalPorts, activePorts })}</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-slate-100">n/a</td>
                    <td className="px-3 py-2 text-sm">
                      <button
                        type="button"
                        onClick={() => setQuickActionItem(buildInventoryQuickActionPayload(row))}
                        className="inline-flex items-center justify-center rounded-md border border-slate-600 bg-slate-800/80 p-2 text-white transition hover:bg-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {mapHref ? (
                        <Link href={mapHref} target="_blank" rel="noreferrer" className="sr-only">
                          Buka Maps
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
              {!visibleOdpRows.length ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-sm text-slate-300">
                    Belum ada ODP yang bisa direview.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <details className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/20 px-4 py-3 text-sm text-slate-100">
        <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-white">Data Pendukung</summary>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <article className="rounded-xl border border-line bg-slate-50 p-4 xl:col-span-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Aksi Workspace</p>
          <div className="mt-3 grid gap-4 xl:grid-cols-2">
            <div id="inventory-action-odp-create" className="scroll-mt-24 rounded-xl border border-line bg-white p-4">
              <InventoryOdpCreateForm canCreate={canCreate} reviewDbReady={reviewDbReady} embedded />
            </div>
            <div id="inventory-action-odp-port-assign" className="scroll-mt-24 rounded-xl border border-line bg-white p-4">
              <InventoryOdpPortAssignForm
                canUpdate={canUpdate}
                reviewDbReady={reviewDbReady}
                odpSuggestions={odpSuggestions}
                embedded
              />
            </div>
            <div id="inventory-action-odp-port-status" className="scroll-mt-24 rounded-xl border border-line bg-white p-4">
              <InventoryOdpPortStatusForm
                canUpdate={canUpdate}
                reviewDbReady={reviewDbReady}
                odpSuggestions={odpSuggestions}
                embedded
              />
            </div>
            <div id="inventory-action-device-assignment" className="scroll-mt-24 rounded-xl border border-line bg-white p-4">
              <InventoryDeviceAssignmentForm
                canCreate={canCreate}
                reviewDbReady={reviewDbReady}
                itemSuggestions={itemSuggestions}
                embedded
              />
            </div>
          </div>
        </article>
        <article className="rounded-xl border border-line bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Port Terpakai & Port Issue</p>
          <div className="mt-3 space-y-3">
            {usedPortRows.slice(0, 4).map((row) => (
              <div key={row.id} className="rounded-xl border border-line bg-white p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                    <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                  </div>
                  <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{row.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.meta.map((item) => (
                    <span key={`${row.id}-${item}`} className="badge border-slate-200 bg-white text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {issuePortRows.slice(0, 3).map((row) => (
              <div key={row.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-amber-950">{row.primary}</p>
                    <p className="mt-1 text-sm text-amber-800">{row.secondary}</p>
                  </div>
                  <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-amber-900">{row.detail}</p>
              </div>
            ))}
            {!usedPortRows.length && !issuePortRows.length ? (
              <p className="text-sm text-slate-500">Belum ada port terpakai atau port issue yang tampil di review terbaru.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-xl border border-line bg-slate-50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Device Assignment</p>
          <div className="mt-3 space-y-3">
            {assignmentRows.slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-xl border border-line bg-white p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                    <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                  </div>
                  <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{row.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.meta.map((item) => (
                    <span
                      key={`${row.id}-${item}`}
                      className={`badge ${
                        item.startsWith('Category: ') && isAccessoryCategory(item.replace('Category: ', ''))
                          ? 'border-violet-200 bg-violet-50 text-violet-700'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {!assignmentRows.length ? (
              <p className="text-sm text-slate-500">Belum ada assignment device yang tampil pada review inventory.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-xl border border-line bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Device Return</p>
            <span className="badge border-slate-200 bg-white text-slate-600">{returnRows.length} histori</span>
          </div>

          {showDeviceReturnForm ? (
            <div id="inventory-action-device-return" className="mt-3 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4">
              <InventoryDeviceReturnForm
                canCreate={canCreate}
                reviewDbReady={reviewDbReady}
                assignmentSuggestions={assignmentSuggestions}
                embedded
              />
            </div>
          ) : null}

          <div className="mt-3 space-y-3">
            {returnRows.slice(0, 6).map((row) => (
              <div key={row.id} className="rounded-xl border border-line bg-white p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                    <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                  </div>
                  <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{row.detail}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.meta.map((item) => (
                    <span key={`${row.id}-${item}`} className="badge border-slate-200 bg-white text-slate-600">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {!returnRows.length ? (
              <p className="text-sm text-slate-500">Belum ada histori return perangkat yang tampil pada review inventory.</p>
            ) : null}
          </div>
        </article>
      </div>
      </details>

      <TableQuickActionModal
        item={quickActionItem}
        onClose={() => setQuickActionItem(null)}
        heading="Aksi cepat dari tabel ODP"
      />
    </section>
  )
}
