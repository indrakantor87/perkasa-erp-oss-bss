import { redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'

export default async function InventoryOverviewPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  if (session.role === 'FIELD_TECHNICIAN') {
    redirect('/inventory/requests?inventoryAction=item-request')
  }

  redirect('/inventory/network')
}
