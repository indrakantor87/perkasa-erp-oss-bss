import { redirect } from 'next/navigation'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { teknisiExpanWorkspace } from '@/lib/organization-workspaces'

export default async function TeknisiExpanWorkspacePage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/support/teknisi-expan')) {
    redirect('/dashboard')
  }

  return <OrganizationWorkspacePage role={session.role} {...teknisiExpanWorkspace} />
}
