import { notFound, redirect } from 'next/navigation'
import { InventoryDamagedPage } from '@/components/inventory-damaged-page'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'

export default async function InventoryDamagedItemsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const payload = await getDomainPageData('inventory', session, {})
  if (!payload) {
    notFound()
  }

  return (
    <InventoryDamagedPage
      source={payload.source}
      canCreate={canPerformAction(session.role, 'inventory', 'create')}
      reviewDbReady={payload.source.effectiveMode === 'review-db' && !payload.source.isFallback}
    />
  )
}

