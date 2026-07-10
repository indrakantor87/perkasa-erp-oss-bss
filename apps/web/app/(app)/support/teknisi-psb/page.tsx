import { redirect } from 'next/navigation'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { teknisiPsbWorkspace } from '@/lib/organization-workspaces'

export default async function TeknisiPsbWorkspacePage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/support/teknisi-psb')) {
    redirect('/dashboard')
  }

  return <OrganizationWorkspacePage role={session.role} {...teknisiPsbWorkspace} />
}
