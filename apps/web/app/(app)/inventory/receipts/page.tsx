import { notFound, redirect } from 'next/navigation'
import { InventoryReceiptsPage } from '@/components/inventory-receipts-page'
import { canPerformAction } from '@/lib/access-control'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'

export default async function InventoryReceiptsRoutePage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const payload = await getDomainPageData('inventory', session, {})

  if (!payload) {
    notFound()
  }

  return (
    <InventoryReceiptsPage
      canCreate={canPerformAction(session.role, 'inventory', 'create')}
      canUpdate={canPerformAction(session.role, 'inventory', 'update')}
      canExport={canPerformAction(session.role, 'inventory', 'export')}
      reviewDbReady={payload.source.effectiveMode === 'review-db' && !payload.source.isFallback}
    />
  )
}
