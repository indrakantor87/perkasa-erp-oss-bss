import { redirect } from 'next/navigation'
import { InventoryReportPage } from '@/components/inventory-report-page'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getInventoryMovementReportData } from '@/lib/services/inventory-report-service'

export default async function InventoryInReportPageRoute() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const data = await getInventoryMovementReportData('IN')

  return (
    <InventoryReportPage
      mode="movement"
      title="Laporan Barang Masuk"
      description="Riwayat barang masuk dari receipt pembelian, pengembalian pinjaman, dan movement `IN` lain yang menambah stok inventory."
      source={data.source}
      warning={data.warning}
      items={data.items}
      siblingHref="/inventory/reports/out"
      siblingLabel="Buka barang keluar"
    />
  )
}
