import { redirect } from 'next/navigation'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { kantorWorkspace } from '@/lib/organization-workspaces'

export default async function KantorWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'kantor')) {
    redirect('/dashboard')
  }

  return <OrganizationWorkspacePage role={session.role} {...kantorWorkspace} />
}
