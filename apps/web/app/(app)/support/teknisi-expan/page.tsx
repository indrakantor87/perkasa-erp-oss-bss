import { redirect } from 'next/navigation'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { teknisiExpanWorkspace } from '@/lib/organization-workspaces'

export default async function TeknisiExpanWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'teknisi-expan')) {
    redirect('/dashboard')
  }

  return <OrganizationWorkspacePage role={session.role} {...teknisiExpanWorkspace} />
}
