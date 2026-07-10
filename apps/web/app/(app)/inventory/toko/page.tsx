import { redirect } from 'next/navigation'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { tokoWorkspace } from '@/lib/organization-workspaces'

export default async function TokoWorkspacePage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory/toko')) {
    redirect('/dashboard')
  }

  return <OrganizationWorkspacePage role={session.role} {...tokoWorkspace} />
}
