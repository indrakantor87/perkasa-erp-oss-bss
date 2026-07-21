import { redirect } from 'next/navigation'
import { InventoryReportPage } from '@/components/inventory-report-page'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getInventoryMovementReportData } from '@/lib/services/inventory-report-service'

export default async function InventoryOutReportPageRoute() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const data = await getInventoryMovementReportData('OUT')

  return (
    <InventoryReportPage
      mode="movement"
      title="Laporan Barang Keluar"
      description="Riwayat barang keluar dari request selesai dan movement `OUT` atau `ADJUSTMENT` yang mengurangi atau menyesuaikan stok inventory."
      source={data.source}
      warning={data.warning}
      items={data.items}
      siblingHref="/inventory/reports/in"
      siblingLabel="Buka barang masuk"
    />
  )
}
