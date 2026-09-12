'use client'

import { useEffect, useId, useMemo, useRef } from 'react'
import L from 'leaflet'
import type { DomainReviewRow } from '@/lib/types'

const PRESET_PATI_BOUNDS = L.latLngBounds([-6.8350, 110.8800], [-6.6400, 111.2200])

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function toNumber(value: string) {
  const raw = String(value ?? '').trim()
  if (!raw || raw === '-') return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : null
}

function parseGeoCoordinate(value: string, kind: 'lat' | 'lng') {
  const parsed = toNumber(value)
  if (parsed == null) return null
  if (kind === 'lat') {
    return parsed >= -90 && parsed <= 90 ? parsed : null
  }
  return parsed >= -180 && parsed <= 180 ? parsed : null
}

export type OdpCapacityStatus = 'EMPTY_FREE' | 'AVAILABLE_UNDER50' | 'OVER50' | 'FULL' | 'UNKNOWN'

const ODP_CAPACITY_COLORS: Record<OdpCapacityStatus, string> = {
  EMPTY_FREE: '#059669',
  AVAILABLE_UNDER50: '#10b981',
  OVER50: '#f59e0b',
  FULL: '#ef4444',
  UNKNOWN: '#64748b',
}

export function getOdpCapacityStatus(params: { totalPorts: number; usedPorts: number }): OdpCapacityStatus {
  const safeTotal = Number.isFinite(params.totalPorts) ? Math.max(0, Math.floor(params.totalPorts)) : 0
  if (safeTotal <= 0) return 'UNKNOWN'
  const safeUsed = Number.isFinite(params.usedPorts) ? Math.max(0, Math.min(safeTotal, Math.floor(params.usedPorts))) : 0
  const available = safeTotal - safeUsed
  if (available <= 0) return 'FULL'
  if (safeUsed === 0) return 'EMPTY_FREE'
  const persenTerpakai = safeUsed / safeTotal
  if (persenTerpakai >= 0.5) return 'OVER50'
  return 'AVAILABLE_UNDER50'
}

export function odpCapacityStatusLabel(status: OdpCapacityStatus): string {
  switch (status) {
    case 'EMPTY_FREE':
      return 'MASIH KOSONG (< 50%)'
    case 'AVAILABLE_UNDER50':
      return 'SISA BANYAK (< 50%)'
    case 'OVER50':
      return 'TERPAKAI > 50%'
    case 'FULL':
      return 'PENUH'
    default:
      return 'DATA KAPASITAS TIDAK LENGKAP'
  }
}

export function odpCapacityShortLegend(status: OdpCapacityStatus): string {
  switch (status) {
    case 'EMPTY_FREE':
      return '< 50%'
    case 'AVAILABLE_UNDER50':
      return '< 50%'
    case 'OVER50':
      return '> 50%'
    case 'FULL':
      return 'PENUH'
    default:
      return 'N/A'
  }
}

export function getPortCapacityTone(params: { totalPorts: number; activePorts: number }) {
  const status = getOdpCapacityStatus({ totalPorts: params.totalPorts, usedPorts: params.activePorts })
  return ODP_CAPACITY_COLORS[status]
}

const ODP_CIRCLE_STYLE_CACHE = new Map<string, L.CircleMarkerOptions>()

function buildOdpCircleStyle(tone: string, selected = false, highlighted = false): L.CircleMarkerOptions {
  const cacheKey = `${tone}:${selected ? 'S' : 'X'}:${highlighted ? 'H' : 'X'}`
  const cached = ODP_CIRCLE_STYLE_CACHE.get(cacheKey)
  if (cached) return cached
  const baseRadius = selected ? 7 : 5
  const radius = highlighted ? baseRadius + 1.5 : baseRadius
  const strokeColor = selected
    ? '#ffffff'
    : highlighted
      ? '#2563eb'
      : 'rgba(15,23,42,0.72)'
  const strokeWeight = selected ? 2.5 : highlighted ? 2.5 : 1.2
  const fillOpacity = selected ? 1 : highlighted ? 1 : 0.92
  const style: L.CircleMarkerOptions = {
    radius,
    fillColor: tone,
    fillOpacity,
    color: strokeColor,
    weight: strokeWeight,
    opacity: 1,
    lineCap: 'round',
    lineJoin: 'round',
  }
  ODP_CIRCLE_STYLE_CACHE.set(cacheKey, style)
  return style
}

function normalizeRoutePoints(points?: Array<{ lat: number; lng: number }>) {
  return Array.isArray(points) ? points.filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng)) : []
}

function buildRoutePointIcon(index: number) {
  const label = String(index + 1)
  return L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<span style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:9999px;background:rgba(37,99,235,0.95);border:2px solid rgba(226,232,240,0.95);color:#ffffff;font-weight:700;font-size:11px;box-shadow:0 6px 18px rgba(2,6,23,0.35)">${label}</span>`,
  })
}

function buildProspectMarkerIcon() {
  return L.divIcon({
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    html: `<span style="display:flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:9999px;background:rgba(225,29,72,0.96);border:3px solid rgba(255,255,255,0.96);color:#ffffff;font-weight:700;font-size:11px;box-shadow:0 8px 22px rgba(2,6,23,0.35)">P</span>`,
  })
}

function normalizePoint(point?: { lat: number; lng: number; label?: string } | null) {
  if (!point) return null
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) ? point : null
}

export function InventoryOdpLeafletMap({
  rows,
  height,
  onSelectRow,
  onPickRoutePoint,
  mapKey,
  routeMode = false,
  routePoints,
  fitMode = 'markers',
  selectedRowId,
  prospectPoint,
  focusPoints,
  buildDetailHref,
  highlightRowIds,
}: {
  rows: DomainReviewRow[]
  height?: number
  onSelectRow?: (row: DomainReviewRow) => void
  onPickRoutePoint?: (params: { row: DomainReviewRow; lat: number; lng: number }) => void
  mapKey?: string
  routeMode?: boolean
  routePoints?: Array<{ lat: number; lng: number }>
  fitMode?: 'markers' | 'route' | 'selection'
  selectedRowId?: string | null
  prospectPoint?: { lat: number; lng: number; label?: string } | null
  focusPoints?: Array<{ lat: number; lng: number; label?: string }>
  buildDetailHref?: (row: DomainReviewRow) => string | undefined | null
  highlightRowIds?: string[] | null
}) {
  const mapId = useId()
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const resizeRafRef = useRef<number | null>(null)
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null)
  const layoutRafRef = useRef<number | null>(null)
  const layoutRaf2Ref = useRef<number | null>(null)
  const userInteractedRef = useRef<boolean>(false)
  const firstPresetAppliedRef = useRef<boolean>(false)
  const repaintTimersRef = useRef<number[]>([])
  const lastMapKeyRef = useRef<string | null>(null)
  const markerInstanceMapRef = useRef<Map<string, L.CircleMarker>>(new Map())
  const lastMarkerItemsSignatureRef = useRef<string>('')
  const chromeTimersRef = useRef<number[]>([])
  const lastSelectedRef = useRef<string | null>(null)
  const lastHighlightSigRef = useRef<string>('')

  const markerItems = useMemo(() => {
    return rows
      .map((row) => {
        const latitude = parseGeoCoordinate(pickMeta(row.meta, 'Latitude: '), 'lat')
        const longitude = parseGeoCoordinate(pickMeta(row.meta, 'Longitude: '), 'lng')
        if (latitude === null || longitude === null) {
          return null
        }
        if (latitude === 0 && longitude === 0) {
          return null
        }
        const totalPorts = Number.parseInt(pickMeta(row.meta, 'Total Ports: ') || '0', 10) || 0
        const activePorts = Number.parseInt(pickMeta(row.meta, 'Active Ports: ') || '0', 10) || 0
        const usedPorts = activePorts
        const availablePorts = Math.max(0, totalPorts - usedPorts)
        const status = getOdpCapacityStatus({ totalPorts, usedPorts })
        const tone = ODP_CAPACITY_COLORS[status]
        const statusLabel = odpCapacityStatusLabel(status)
        const detailHref = buildDetailHref?.(row) ?? null

        return {
          row,
          latitude,
          longitude,
          tone,
          status,
          statusLabel,
          totalPorts,
          activePorts,
          availablePorts,
          detailHref,
        }
      })
      .filter(Boolean) as Array<{
      row: DomainReviewRow
      latitude: number
      longitude: number
      tone: string
      status: OdpCapacityStatus
      statusLabel: string
      totalPorts: number
      activePorts: number
      availablePorts: number
      detailHref: string | null
    }>
  }, [rows, buildDetailHref])

  const safeRoutePoints = useMemo(() => normalizeRoutePoints(routePoints), [routePoints])
  const safeProspectPoint = useMemo(() => normalizePoint(prospectPoint), [prospectPoint])
  const safeFocusPoints = useMemo(() => normalizeRoutePoints(focusPoints), [focusPoints])
  const safeHighlightRowIds = useMemo(() => (Array.isArray(highlightRowIds) ? highlightRowIds.filter((id) => typeof id === 'string') : []), [highlightRowIds])
  const selectedMarkerItem = useMemo(
    () => markerItems.find((item) => item.row.id === selectedRowId) ?? null,
    [markerItems, selectedRowId],
  )

  useEffect(() => {
    const element = document.getElementById(mapId)
    if (!element) return
    if (!('ResizeObserver' in globalThis)) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      const { width, height } = entry.contentRect
      if (!(width > 0 && height > 0)) return

      const lastSize = lastSizeRef.current
      if (lastSize && Math.abs(lastSize.width - width) < 0.5 && Math.abs(lastSize.height - height) < 0.5) return
      lastSizeRef.current = { width, height }

      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current)
      }

      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = null
        mapRef.current?.invalidateSize()
      })
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
      if (resizeRafRef.current) {
        cancelAnimationFrame(resizeRafRef.current)
        resizeRafRef.current = null
      }
      lastSizeRef.current = null
    }
  }, [mapId])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (layoutRafRef.current) {
      cancelAnimationFrame(layoutRafRef.current)
      layoutRafRef.current = null
    }

    if (layoutRaf2Ref.current) {
      cancelAnimationFrame(layoutRaf2Ref.current)
      layoutRaf2Ref.current = null
    }

    layoutRafRef.current = requestAnimationFrame(() => {
      layoutRafRef.current = null
      map.invalidateSize()
      layoutRaf2Ref.current = requestAnimationFrame(() => {
        layoutRaf2Ref.current = null
        map.invalidateSize()
      })
    })

    return () => {
      if (layoutRafRef.current) {
        cancelAnimationFrame(layoutRafRef.current)
        layoutRafRef.current = null
      }
      if (layoutRaf2Ref.current) {
        cancelAnimationFrame(layoutRaf2Ref.current)
        layoutRaf2Ref.current = null
      }
    }
  }, [height])

  useEffect(() => {
    const element = document.getElementById(mapId)
    if (!element) return

    if (!mapRef.current) {
      mapRef.current = L.map(element, {
        zoomControl: true,
        attributionControl: true,
      })

      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      })
      tileLayer.addTo(mapRef.current)
      tileLayerRef.current = tileLayer

      markerLayerRef.current = L.layerGroup()
      markerLayerRef.current.addTo(mapRef.current)
      routeLayerRef.current = L.layerGroup().addTo(mapRef.current)

      const onUserInteract = () => {
        userInteractedRef.current = true
      }
      mapRef.current.on('zoomstart', onUserInteract)
      mapRef.current.on('dragstart', onUserInteract)
      mapRef.current.on('movestart', onUserInteract)
    }

    const map = mapRef.current
    const markerLayer = markerLayerRef.current
    const routeLayer = routeLayerRef.current

    if (lastMapKeyRef.current !== String(mapKey)) {
      lastMapKeyRef.current = String(mapKey)
      userInteractedRef.current = false
      firstPresetAppliedRef.current = false
      lastMarkerItemsSignatureRef.current = ''
      lastSelectedRef.current = null
      lastHighlightSigRef.current = ''
    }

    const needFullMarkerRebuild = () => {
      try {
        const sig = markerItems.map((i) => `${i.row.id}|${i.latitude.toFixed(6)}|${i.longitude.toFixed(6)}|${i.tone}|${i.totalPorts}|${i.activePorts}|${i.status}`).join(';')
        if (sig !== lastMarkerItemsSignatureRef.current) {
          lastMarkerItemsSignatureRef.current = sig
          return true
        }
        return false
      } catch {
        return true
      }
    }

    chromeTimersRef.current.forEach((t) => window.clearTimeout(t))
    chromeTimersRef.current = []

    const chromePaint1 = window.setTimeout(() => {
      map.invalidateSize()
      const chromePaint2 = window.setTimeout(() => {
        map.invalidateSize()
      }, 220)
      chromeTimersRef.current.push(chromePaint2)
    }, 60)
    chromeTimersRef.current.push(chromePaint1)

    if (!map || !markerLayer) return

    const markerBounds = L.latLngBounds([])

    const tileLayer = tileLayerRef.current
    if (tileLayer && tileLayer.on && !(tileLayer as any)._odpOnLoadBound) {
      ;(tileLayer as any)._odpOnLoadBound = true
      tileLayer.on('load', () => {
        window.setTimeout(() => {
          map.invalidateSize()
          window.requestAnimationFrame(() => {
            map.invalidateSize()
            if (!userInteractedRef.current && markerItems.length > 0 && markerBounds.isValid()) {
              try {
                map.fitBounds(markerBounds.pad(0.25))
                window.setTimeout(() => {
                  map.invalidateSize()
                }, 80)
              } catch (_e) {
                /* ignore */
              }
            }
          })
        }, 0)
      })
    }

    const fullRebuild = needFullMarkerRebuild()
    if (fullRebuild) {
      markerInstanceMapRef.current.forEach((m) => {
        try { m.remove() } catch { /* ignore */ }
      })
      markerInstanceMapRef.current.clear()
      markerLayer.clearLayers()
    }
    routeLayer?.clearLayers()

    const highlightSet = new Set(safeHighlightRowIds)
    const highlightSig = [...highlightSet].sort().join('|')
    const selectedChanged = lastSelectedRef.current !== (selectedRowId ?? null)
    const highlightChanged = lastHighlightSigRef.current !== highlightSig
    if (selectedChanged) lastSelectedRef.current = selectedRowId ?? null
    if (highlightChanged) lastHighlightSigRef.current = highlightSig

    const buildPopupForItem = (item: typeof markerItems[number]) => {
      const namaOdp = item.row.primary ? String(item.row.primary).trim() : item.row.secondary ? String(item.row.secondary).trim() : `ODP (id: ${String(item.row.id).slice(0, 8)})`
      const popHuman = item.row.secondary ? String(item.row.secondary).trim() : namaOdp
      const shortBadge =
        item.status === 'FULL'
          ? 'PENUH'
          : item.status === 'OVER50'
            ? '> 50%'
            : item.status === 'UNKNOWN'
              ? 'N/A'
              : '< 50%'
      return `
        <div style="font-family: ui-sans-serif, system-ui; font-size: 12px; line-height: 1.55; min-width: 230px;">
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 2px;">${namaOdp}</div>
          <div style="opacity: 0.78; margin-bottom: 8px;">${popHuman}${item.row.detail && String(item.row.detail) !== popHuman ? ` · ${String(item.row.detail).slice(0, 60)}` : ''}</div>
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px;">
            <span style="display:inline-block; padding: 2px 10px; border-radius: 9999px; background:${item.tone}; color:#ffffff; font-weight:700; font-size:11px; letter-spacing: 0.02em;">
              Terpakai: ${item.activePorts}/${item.totalPorts}
            </span>
            <span style="display:inline-block; padding: 2px 10px; border-radius: 9999px; background:rgba(15,23,42,0.9); color:#ffffff; font-weight:600; font-size:11px;">
              ${shortBadge}
            </span>
          </div>
          <div style="opacity:0.78; border-top: 1px solid rgba(15,23,42,0.08); padding-top: 8px;">
            ${Number.isFinite(item.latitude) && Number.isFinite(item.longitude) ? `${Number(item.latitude).toFixed(6)}, ${Number(item.longitude).toFixed(6)}` : 'Koordinat tidak terbaca'}
          </div>
          ${
            item.totalPorts <= 0
              ? '<div style="margin-top:8px; padding:6px 8px; border-radius:8px; background:rgba(100,116,139,0.12); color:#475569; font-size:11px;">Data kapasitas ODP ini belum terbaca lengkap.</div>'
              : ''
          }
          ${
            item.detailHref
              ? `<a href="${item.detailHref.replace(/"/g, '&quot;')}" style="display:inline-block; margin-top:10px; text-decoration:none; padding:6px 10px; border-radius:6px; background:#0f172a; color:#ffffff; font-weight:600; font-size:11px;">Lihat Detail ODP</a>`
              : '<div style="margin-top:8px; opacity:0.6; font-size:11px;">Klik marker ini untuk pilih ODP di panel samping.</div>'
          }
        </div>
      `
    }

    markerItems.forEach((item) => {
      const isSelected = item.row.id === selectedRowId
      const isHighlighted = highlightSet.has(item.row.id)
      let marker: L.CircleMarker | undefined
      if (!fullRebuild) {
        marker = markerInstanceMapRef.current.get(item.row.id)
        if (marker && (selectedChanged || highlightChanged)) {
          marker.setStyle(buildOdpCircleStyle(item.tone, isSelected, isHighlighted))
        }
      }
      if (!marker) {
        marker = L.circleMarker([item.latitude, item.longitude], buildOdpCircleStyle(item.tone, isSelected, isHighlighted))
        markerInstanceMapRef.current.set(item.row.id, marker)
        marker.on('click', () => {
          onSelectRow?.(item.row)
          if (!marker?.isPopupOpen()) {
            marker?.bindPopup(buildPopupForItem(item), { closeButton: true, autoPan: true, maxWidth: 320 })
            marker?.openPopup()
          }
          if (routeMode) {
            onPickRoutePoint?.({ row: item.row, lat: item.latitude, lng: item.longitude })
          }
        })
        marker.addTo(markerLayer)
      }
      markerBounds.extend([item.latitude, item.longitude])
    })

    let routeBounds: L.LatLngBounds | null = null
    if (routeLayer && safeRoutePoints.length) {
      const latLngs = safeRoutePoints.map((point) => L.latLng(point.lat, point.lng))
      routeBounds = L.latLngBounds(latLngs)
      if (latLngs.length >= 2) {
        L.polyline(latLngs, {
          color: '#60a5fa',
          weight: 4,
          opacity: 0.9,
        }).addTo(routeLayer)
      }
      latLngs.forEach((latLng, index) => {
        L.marker(latLng, {
          icon: buildRoutePointIcon(index),
          interactive: false,
          keyboard: false,
        }).addTo(routeLayer)
      })
    }

    let selectionBounds: L.LatLngBounds | null = null
    if (fitMode === 'selection') {
      selectionBounds = L.latLngBounds([])
      safeFocusPoints.forEach((point) => {
        selectionBounds?.extend([point.lat, point.lng])
      })
    }

    if (routeLayer && safeProspectPoint) {
      const prospectMarker = L.marker([safeProspectPoint.lat, safeProspectPoint.lng], {
        icon: buildProspectMarkerIcon(),
        riseOnHover: true,
      })
      prospectMarker.bindPopup(
        `
          <div style="font-family: ui-sans-serif, system-ui; font-size: 12px; line-height: 1.4;">
            <div style="font-weight: 700; margin-bottom: 4px;">${safeProspectPoint.label || 'Lokasi Prospek'}</div>
            <div style="opacity: 0.85;">${safeProspectPoint.lat.toFixed(6)}, ${safeProspectPoint.lng.toFixed(6)}</div>
          </div>
        `,
        { closeButton: true, autoPan: true },
      )
      prospectMarker.addTo(routeLayer)

      if (selectedMarkerItem) {
        L.polyline(
          [
            [selectedMarkerItem.latitude, selectedMarkerItem.longitude],
            [safeProspectPoint.lat, safeProspectPoint.lng],
          ],
          {
            color: '#f43f5e',
            weight: 3,
            opacity: 0.95,
            dashArray: '8 8',
          },
        ).addTo(routeLayer)
      }
    }

    let finalBounds = L.latLngBounds([])
    let hasFinalBounds = false
    if (markerBounds.isValid()) {
      finalBounds.extend(markerBounds.getSouthWest())
      finalBounds.extend(markerBounds.getNorthEast())
      hasFinalBounds = true
    }
    if (safeProspectPoint) {
      finalBounds.extend([safeProspectPoint.lat, safeProspectPoint.lng])
      hasFinalBounds = true
    }

    if (fitMode === 'route' || fitMode === 'selection') {
      userInteractedRef.current = false
    }

    const userDidInteract = userInteractedRef.current
    const firstRunNoPresetYet = !firstPresetAppliedRef.current
    const isFirstLoadPresetOnly =
      fitMode === 'markers' && !safeProspectPoint && firstRunNoPresetYet && !userDidInteract

    if (fitMode === 'route' && routeBounds && safeRoutePoints.length >= 2) {
      map.fitBounds(routeBounds.pad(0.2))
    } else if (fitMode === 'selection' && selectionBounds?.isValid()) {
      const pointsCount = safeFocusPoints.length
      if (pointsCount === 1) {
        const point = safeFocusPoints[0]
        map.setView([point.lat, point.lng], 18)
      } else {
        map.fitBounds(selectionBounds.pad(0.2))
      }
    } else if (userDidInteract) {
      // User sudah melakukan zoom / drag manual. JANGAN override posisi view map.
    } else if (isFirstLoadPresetOnly) {
      map.fitBounds(PRESET_PATI_BOUNDS.pad(0.02), { maxZoom: 15 })
      firstPresetAppliedRef.current = true
    } else if (hasFinalBounds && finalBounds.isValid()) {
      map.fitBounds(finalBounds.pad(0.3))
    } else if (markerItems.length && markerBounds.isValid()) {
      map.fitBounds(markerBounds.pad(0.25))
    } else if (!userDidInteract) {
      map.fitBounds(PRESET_PATI_BOUNDS.pad(0.02), { maxZoom: 15 })
      firstPresetAppliedRef.current = true
    }
  }, [mapId, markerItems, onSelectRow, mapKey, routeMode, safeRoutePoints, fitMode, safeProspectPoint, safeFocusPoints, onPickRoutePoint, selectedMarkerItem, selectedRowId, safeHighlightRowIds])

  useEffect(() => {
    return () => {
      repaintTimersRef.current.forEach((t) => window.clearTimeout(t))
      repaintTimersRef.current = []
      chromeTimersRef.current.forEach((t) => window.clearTimeout(t))
      chromeTimersRef.current = []
      markerInstanceMapRef.current.clear()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        tileLayerRef.current = null
        markerLayerRef.current = null
        routeLayerRef.current = null
      }
      if (layoutRafRef.current) {
        cancelAnimationFrame(layoutRafRef.current)
        layoutRafRef.current = null
      }
      if (layoutRaf2Ref.current) {
        cancelAnimationFrame(layoutRaf2Ref.current)
        layoutRaf2Ref.current = null
      }
      userInteractedRef.current = false
      firstPresetAppliedRef.current = false
      lastMapKeyRef.current = null
    }
  }, [])

  const resolvedHeight = typeof height === 'number' ? `${height}px` : '100%'
  return <div id={mapId} style={{ position: 'absolute', inset: 0, height: resolvedHeight, width: '100%', display: 'block', overflow: 'hidden' }} />
}
