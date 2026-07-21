import { redirect } from 'next/navigation'
import { InventoryReportPage } from '@/components/inventory-report-page'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getInventoryStockReportData } from '@/lib/services/inventory-report-service'

export default async function InventoryStockReportPageRoute() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const data = await getInventoryStockReportData()

  return (
    <InventoryReportPage
      mode="stock"
      title="Laporan Stok"
      description="Pantau stok item aktif, minimum stok, dan item yang perlu perhatian lebih cepat langsung dari inventory."
      source={data.source}
      warning={data.warning}
      items={data.items}
    />
  )
}
