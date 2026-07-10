import { redirect } from 'next/navigation'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { teknisiJointerWorkspace } from '@/lib/organization-workspaces'

export default async function TeknisiJointerWorkspacePage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/support/teknisi-jointer')) {
    redirect('/dashboard')
  }

  return <OrganizationWorkspacePage role={session.role} {...teknisiJointerWorkspace} />
}
