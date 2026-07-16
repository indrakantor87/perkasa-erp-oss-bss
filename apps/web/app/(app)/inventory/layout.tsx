import type { ReactNode } from 'react'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

export default function InventoryLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return children
}
