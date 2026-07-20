import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { teknisiTroubleshootsWorkspace } from '@/lib/organization-workspaces'

export default async function TeknisiTroubleshootsWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'teknisi-troubleshoots')) {
    redirect('/dashboard')
  }

  redirect(teknisiTroubleshootsWorkspace.primaryAction.href)
}
