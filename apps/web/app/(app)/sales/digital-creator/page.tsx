import { redirect } from 'next/navigation'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { digitalCreatorWorkspace } from '@/lib/organization-workspaces'

export default async function DigitalCreatorWorkspacePage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/digital-creator')) {
    redirect('/dashboard')
  }

  return <OrganizationWorkspacePage role={session.role} {...digitalCreatorWorkspace} />
}
