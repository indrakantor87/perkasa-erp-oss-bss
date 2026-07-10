import { redirect } from 'next/navigation'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { kantorWorkspace } from '@/lib/organization-workspaces'

export default async function KantorWorkspacePage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory/kantor')) {
    redirect('/dashboard')
  }

  return <OrganizationWorkspacePage role={session.role} {...kantorWorkspace} />
}
