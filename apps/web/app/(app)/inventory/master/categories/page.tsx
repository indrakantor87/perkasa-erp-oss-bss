import { redirect } from 'next/navigation'
import { InventoryMasterSummaryPage } from '@/components/inventory-master-summary-page'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getInventoryMasterData } from '@/lib/services/inventory-master-service'

export default async function InventoryCategoriesPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const data = await getInventoryMasterData()

  return (
    <InventoryMasterSummaryPage
      title="Jenis Barang"
      description="Daftar kategori item inventory yang sudah aktif di review DB, lengkap dengan jumlah item dan total stok agar jalur data master lebih jelas."
      sectionTitle="Kategori Inventory"
      items={data.categories}
      source={data.source}
      warning={data.warning}
      siblingHref="/inventory/master/units"
      siblingLabel="Buka satuan"
    />
  )
}
