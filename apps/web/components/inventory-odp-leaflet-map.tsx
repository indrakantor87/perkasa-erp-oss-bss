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

function getPortCapacityTone(params: { totalPorts: number; activePorts: number }) {
  if (params.totalPorts <= 0) return '#64748b'
  const ratio = params.activePorts / params.totalPorts
  if (params.activePorts >= params.totalPorts) return '#ef4444'
  if (ratio >= 0.5) return '#f59e0b'
  return '#10b981'
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

function normalizePoint(point?: { lat: number; lng: number; label?: string } | null) {
  if (!point) return null
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) ? point : null
}

export function InventoryOdpLeafletMap({
  rows,
  height = 420,
  onSelectRow,
  onPickRoutePoint,
  mapKey,
  routeMode = false,
  routePoints,
  fitMode = 'markers',
  selectedRowId,
  prospectPoint,
  focusPoints,
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
}) {
  const mapId = useId()
  const mapRef = useRef<L.Map | null>(null)
  const markerLayerRef = useRef<L.LayerGroup | L.MarkerClusterGroup | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)

  const markerItems = useMemo(() => {
    return rows
      .map((row) => {
        const latitude = toNumber(pickMeta(row.meta, 'Latitude: '))
        const longitude = toNumber(pickMeta(row.meta, 'Longitude: '))
        if (latitude === null || longitude === null) {
          return null
        }
        const totalPorts = Number.parseInt(pickMeta(row.meta, 'Total Ports: ') || '0', 10) || 0
        const activePorts = Number.parseInt(pickMeta(row.meta, 'Active Ports: ') || '0', 10) || 0
        const tone = getPortCapacityTone({ totalPorts, activePorts })

        return {
          row,
          latitude,
          longitude,
          tone,
          totalPorts,
          activePorts,
        }
      })
      .filter(Boolean) as Array<{
      row: DomainReviewRow
      latitude: number
      longitude: number
      tone: string
      totalPorts: number
      activePorts: number
    }>
  }, [rows])

  const safeRoutePoints = useMemo(() => normalizeRoutePoints(routePoints), [routePoints])
  const safeProspectPoint = useMemo(() => normalizePoint(prospectPoint), [prospectPoint])
  const safeFocusPoints = useMemo(() => normalizeRoutePoints(focusPoints), [focusPoints])
  const selectedMarkerItem = useMemo(
    () => markerItems.find((item) => item.row.id === selectedRowId) ?? null,
    [markerItems, selectedRowId],
  )

  useEffect(() => {
    const element = document.getElementById(mapId)
    if (!element) return

    if (!mapRef.current) {
      mapRef.current = L.map(element, {
        zoomControl: true,
        attributionControl: true,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapRef.current)

      markerLayerRef.current = L.markerClusterGroup({
        chunkedLoading: true,
        showCoverageOnHover: false,
      })
      markerLayerRef.current.addTo(mapRef.current)
      routeLayerRef.current = L.layerGroup().addTo(mapRef.current)
    }

    const map = mapRef.current
    const markerLayer = markerLayerRef.current
    const routeLayer = routeLayerRef.current
    if (!map || !markerLayer) return

    markerLayer.clearLayers()
    routeLayer?.clearLayers()

    const markerBounds = L.latLngBounds([])
    markerItems.forEach((item) => {
      const marker = L.marker([item.latitude, item.longitude], {
        icon: buildOdpMarkerIcon(item.tone, item.row.id === selectedRowId),
        riseOnHover: true,
      })
      const popupContent = `
        <div style="font-family: ui-sans-serif, system-ui; font-size: 12px; line-height: 1.4;">
          <div style="font-weight: 700; margin-bottom: 4px;">${item.row.primary}</div>
          <div style="opacity: 0.85; margin-bottom: 6px;">${item.row.detail || ''}</div>
          <div style="opacity: 0.85;">Port ${item.activePorts}/${item.totalPorts}</div>
          <div style="opacity: 0.85;">${item.latitude.toFixed(6)}, ${item.longitude.toFixed(6)}</div>
        </div>
      `
      marker.bindPopup(popupContent, { closeButton: true, autoPan: true })
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
    } else if (markerItems.length && markerBounds.isValid()) {
      map.fitBounds(markerBounds.pad(0.2))
    } else {
      map.setView([-6.9, 110.4], 10)
    }

    map.invalidateSize()
  }, [mapId, markerItems, onSelectRow, mapKey, routeMode, safeRoutePoints, fitMode, selectedRowId, safeProspectPoint, safeFocusPoints, onPickRoutePoint, selectedMarkerItem])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerLayerRef.current = null
        routeLayerRef.current = null
      }
    }
  }, [])

  return <div id={mapId} style={{ height, width: '100%' }} />
}
