import { redirect } from 'next/navigation'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { tokoWorkspace } from '@/lib/organization-workspaces'

export default async function TokoWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'toko')) {
    redirect('/dashboard')
  }

  return <OrganizationWorkspacePage role={session.role} {...tokoWorkspace} />
}
