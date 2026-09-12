'use client'

import { useEffect, useId, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import type { DomainReviewRow } from '@/lib/types'

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

export type OdpCapacityStatus = 'AVAILABLE' | 'LIMITED' | 'FULL' | 'UNKNOWN'

const ODP_CAPACITY_COLORS: Record<OdpCapacityStatus, string> = {
  AVAILABLE: '#10b981',
  LIMITED: '#f59e0b',
  FULL: '#ef4444',
  UNKNOWN: '#64748b',
}

export function getOdpCapacityStatus(params: { totalPorts: number; usedPorts: number }): OdpCapacityStatus {
  if (params.totalPorts <= 0) return 'UNKNOWN'
  const safeTotal = Number.isFinite(params.totalPorts) ? Math.max(0, Math.floor(params.totalPorts)) : 0
  const safeUsed = Number.isFinite(params.usedPorts) ? Math.max(0, Math.min(safeTotal, Math.floor(params.usedPorts))) : 0
  const available = safeTotal - safeUsed
  if (available <= 0) return 'FULL'
  if (available <= 4) return 'LIMITED'
  return 'AVAILABLE'
}

export function odpCapacityStatusLabel(status: OdpCapacityStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'AVAILABLE / AMAN'
    case 'LIMITED':
      return 'LIMITED / HAMPIR PENUH'
    case 'FULL':
      return 'FULL / PENUH'
    default:
      return 'UNKNOWN'
  }
}

export function getPortCapacityTone(params: { totalPorts: number; activePorts: number }) {
  const status = getOdpCapacityStatus({ totalPorts: params.totalPorts, usedPorts: params.activePorts })
  return ODP_CAPACITY_COLORS[status]
}

function buildOdpMarkerIcon(tone: string, selected = false) {
  const size = selected ? 18 : 14
  const border = selected ? '3px solid rgba(255,255,255,0.95)' : '2px solid rgba(15,23,42,0.9)'
  return L.divIcon({
    className: '',
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2],
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${tone};border:${border};box-shadow:0 0 0 2px rgba(15,23,42,0.28)"></span>`,
  })
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

function buildDeviceMarkerIcon() {
  return L.divIcon({
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<span style="display:block;position:relative;width:26px;height:26px;border-radius:9999px;"><span style="position:absolute;inset:0;border-radius:9999px;border:3px solid rgba(37,99,235,0.55);background:rgba(59,130,246,0.35);box-shadow:0 0 0 4px rgba(59,130,246,0.22);"></span><span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:block;width:12px;height:12px;border-radius:9999px;background:rgba(37,99,235,0.98);border:2px solid rgba(255,255,255,0.98);"></span></span>`,
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
  devicePoint,
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
  devicePoint?: { lat: number; lng: number; label?: string } | null
}) {
  const mapId = useId()
  const mapRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | L.MarkerClusterGroup | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const deviceLayerRef = useRef<L.LayerGroup | null>(null)
  const resizeRafRef = useRef<number | null>(null)
  const lastSizeRef = useRef<{ width: number; height: number } | null>(null)
  const layoutRafRef = useRef<number | null>(null)
  const layoutRaf2Ref = useRef<number | null>(null)

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
  const safeDevicePoint = useMemo(() => normalizePoint(devicePoint), [devicePoint])
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

      markerLayerRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
      })
      markerLayerRef.current.addTo(mapRef.current)
      routeLayerRef.current = L.layerGroup().addTo(mapRef.current)
      deviceLayerRef.current = L.layerGroup().addTo(mapRef.current)
    }

    const map = mapRef.current
    const markerLayer = markerLayerRef.current
    const routeLayer = routeLayerRef.current
    const deviceLayer = deviceLayerRef.current

    const chromeFixTimer1 = window.setTimeout(() => {
      map.invalidateSize()
      const chromeFixTimer2 = window.setTimeout(() => {
        map.invalidateSize()
        const chromeFixTimer3 = window.setTimeout(() => {
          map.invalidateSize()
          const chromeFixTimer4 = window.setTimeout(() => {
            map.invalidateSize()
            const chromeFixTimer5 = window.setTimeout(() => {
              map.invalidateSize()
              const chromeRaf1 = window.requestAnimationFrame(() => {
                map.invalidateSize()
                const chromeFixTimer6 = window.setTimeout(() => {
                    map.invalidateSize()
                    const chromeFixTimer7 = window.setTimeout(() => {
                      map.invalidateSize()
                      const chromeRaf2 = window.requestAnimationFrame(() => {
                        map.invalidateSize()
                        const chromeFixTimer8 = window.setTimeout(() => {
                          map.invalidateSize()
                          const chromeFixTimer9 = window.setTimeout(() => {
                            map.invalidateSize()
                            window.requestAnimationFrame(() => {
                              map.invalidateSize()
                            })
                          }, 1000)
                        }, 600)
                      })
                    }, 300)
                  }, 120)
              })
            }, 220)
            return () => window.clearTimeout(chromeFixTimer4)
          }, 160)
          return () => window.clearTimeout(chromeFixTimer3)
        }, 100)
        return () => window.clearTimeout(chromeFixTimer2)
      }, 60)
      return () => window.clearTimeout(chromeFixTimer1)
    }, 30)

    if (!map || !markerLayer) return

    const tileLayer = tileLayerRef.current
    if (tileLayer && tileLayer.on) {
      tileLayer.on('load', () => {
        window.setTimeout(() => {
          map.invalidateSize()
          window.requestAnimationFrame(() => map.invalidateSize())
        }, 0)
      })
    }

    markerLayer.clearLayers()
    routeLayer?.clearLayers()
    deviceLayer?.clearLayers()

    const markerBounds = L.latLngBounds([])
    markerItems.forEach((item) => {
      const marker = L.marker([item.latitude, item.longitude], {
        icon: buildOdpMarkerIcon(item.tone, item.row.id === selectedRowId),
        riseOnHover: true,
      })
      const statusTone =
        item.status === 'AVAILABLE'
          ? '#065f46'
          : item.status === 'LIMITED'
            ? '#b45309'
            : item.status === 'FULL'
              ? '#991b1b'
              : '#334155'
      const popupContent = `
        <div style="font-family: ui-sans-serif, system-ui; font-size: 12px; line-height: 1.55; min-width: 220px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">${item.row.secondary || item.row.primary}</div>
          <div style="opacity: 0.8; margin-bottom: 8px;">${item.row.primary}${item.row.detail && item.row.detail !== item.row.secondary ? ` · ${String(item.row.detail).slice(0, 60)}` : ''}</div>
          <div style="display:inline-block; padding: 2px 8px; border-radius: 9999px; background:${item.tone}; color:#ffffff; font-weight:700; margin-bottom:10px; font-size:11px; letter-spacing: 0.02em;">
            Status: ${item.status}
          </div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; margin-bottom: 10px;">
            <div>
              <div style="opacity: 0.7;">Port Tersedia:</div>
              <div style="font-weight:700; color:${statusTone};">${item.availablePorts}</div>
            </div>
            <div>
              <div style="opacity: 0.7;">Total Port:</div>
              <div style="font-weight:700;">${item.totalPorts}</div>
            </div>
            <div>
              <div style="opacity: 0.7;">Terpakai:</div>
              <div style="font-weight:700;">${item.activePorts}</div>
            </div>
            <div>
              <div style="opacity: 0.7;">${item.statusLabel.split(' / ')[0]}:</div>
              <div style="font-weight:700; color:${statusTone};">${item.availablePorts} / ${item.totalPorts}</div>
            </div>
          </div>
          <div style="opacity:0.7; margin-bottom: 10px; border-top: 1px solid rgba(15,23,42,0.08); padding-top: 8px;">
            Koordinat: ${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}
          </div>
          ${
            item.detailHref
              ? `<a href="${item.detailHref.replace(/"/g, '&quot;')}" style="display:inline-block; text-decoration:none; padding:6px 10px; border-radius:6px; background:#0f172a; color:#ffffff; font-weight:600; font-size:11px;">Lihat Detail ODP</a>`
              : '<div style="opacity:0.6; font-size:11px;">Belum ada tautan detail ODP.</div>'
          }
        </div>
      `
      marker.bindPopup(popupContent, { closeButton: true, autoPan: true, maxWidth: 320 })
      marker.on('click', () => {
        onSelectRow?.(item.row)
        if (!routeMode) {
          return
        }
        onPickRoutePoint?.({ row: item.row, lat: item.latitude, lng: item.longitude })
      })
      marker.addTo(markerLayer)
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

    if (deviceLayer && safeDevicePoint) {
      const deviceMarker = L.marker([safeDevicePoint.lat, safeDevicePoint.lng], {
        icon: buildDeviceMarkerIcon(),
        riseOnHover: true,
      })
      deviceMarker.bindPopup(
        `
          <div style="font-family: ui-sans-serif, system-ui; font-size: 12px; line-height: 1.4;">
            <div style="font-weight: 700; margin-bottom: 4px;">${safeDevicePoint.label || 'Lokasi Saya'}</div>
            <div style="opacity: 0.85;">${safeDevicePoint.lat.toFixed(6)}, ${safeDevicePoint.lng.toFixed(6)}</div>
          </div>
        `,
        { closeButton: true, autoPan: true },
      )
      deviceMarker.addTo(deviceLayer)
    }

    let finalBounds = L.latLngBounds([])
    let hasFinalBounds = false
    if (markerBounds.isValid()) {
      finalBounds.extend(markerBounds.getSouthWest())
      finalBounds.extend(markerBounds.getNorthEast())
      hasFinalBounds = true
    }
    if (safeDevicePoint) {
      finalBounds.extend([safeDevicePoint.lat, safeDevicePoint.lng])
      hasFinalBounds = true
    }
    if (safeProspectPoint) {
      finalBounds.extend([safeProspectPoint.lat, safeProspectPoint.lng])
      hasFinalBounds = true
    }

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
    } else if (hasFinalBounds && finalBounds.isValid()) {
      map.fitBounds(finalBounds.pad(0.3))
    } else if (markerItems.length && markerBounds.isValid()) {
      map.fitBounds(markerBounds.pad(0.2))
    } else if (safeDevicePoint) {
      map.setView([safeDevicePoint.lat, safeDevicePoint.lng], 16)
    } else {
      map.setView([-6.7450, 111.0375], 13)
    }

    map.invalidateSize()

    const markerCount = markerItems.length
    if (markerCount > 0) {
      const longRepaintT1 = window.setTimeout(() => {
        map.invalidateSize()
        if (markerBounds.isValid()) {
          try {
            map.fitBounds(markerBounds.pad(0.2))
          } catch (_e) {
            /* ignore */
          }
        }
        const longRepaintT2 = window.setTimeout(() => {
          map.invalidateSize()
          if (markerBounds.isValid()) {
            try {
              map.fitBounds(markerBounds.pad(0.25))
            } catch (_e) {
              /* ignore */
            }
          }
          window.requestAnimationFrame(() => {
            map.invalidateSize()
          })
          const longRepaintT3 = window.setTimeout(() => {
            map.invalidateSize()
            window.requestAnimationFrame(() => {
              map.invalidateSize()
              if (markerBounds.isValid()) {
                try {
                  map.fitBounds(markerBounds.pad(0.3))
                } catch (_e) {
                  /* ignore */
                }
              }
            })
          }, 1200)
          return () => window.clearTimeout(longRepaintT3)
        }, 600)
        return () => window.clearTimeout(longRepaintT2)
      }, 180)
    }
  }, [mapId, markerItems, onSelectRow, mapKey, routeMode, safeRoutePoints, fitMode, selectedRowId, safeProspectPoint, safeFocusPoints, onPickRoutePoint, selectedMarkerItem, safeDevicePoint])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        tileLayerRef.current = null
        markerLayerRef.current = null
        routeLayerRef.current = null
        deviceLayerRef.current = null
      }
      if (layoutRafRef.current) {
        cancelAnimationFrame(layoutRafRef.current)
        layoutRafRef.current = null
      }
      if (layoutRaf2Ref.current) {
        cancelAnimationFrame(layoutRaf2Ref.current)
        layoutRaf2Ref.current = null
      }
    }
  }, [])

  const resolvedHeight = typeof height === 'number' ? `${height}px` : '100%'
  return <div id={mapId} style={{ height: resolvedHeight, width: '100%' }} />
}
