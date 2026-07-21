import { redirect } from 'next/navigation'
import { InventoryMasterSummaryPage } from '@/components/inventory-master-summary-page'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getInventoryMasterData } from '@/lib/services/inventory-master-service'

export default async function InventoryUnitsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const data = await getInventoryMasterData()

  return (
    <InventoryMasterSummaryPage
      title="Satuan Barang"
      description="Daftar satuan inventory yang saat ini dipakai item master, sehingga operator bisa cepat membaca konsistensi unit dan beban stok per satuan."
      sectionTitle="Satuan Inventory"
      items={data.units}
      source={data.source}
      warning={data.warning}
      siblingHref="/inventory/master/categories"
      siblingLabel="Buka jenis barang"
    />
  )
}
