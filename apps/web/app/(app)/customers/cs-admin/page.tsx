import { redirect } from 'next/navigation'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { csAdminWorkspace } from '@/lib/organization-workspaces'

export default async function CsAdminWorkspacePage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/customers/cs-admin')) {
    redirect('/dashboard')
  }

  return <OrganizationWorkspacePage role={session.role} {...csAdminWorkspace} />
}
