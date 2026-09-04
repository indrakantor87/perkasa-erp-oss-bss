import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'

export default async function InventoryLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }
  return children
}
