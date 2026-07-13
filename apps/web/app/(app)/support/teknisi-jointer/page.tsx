import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { teknisiJointerWorkspace } from '@/lib/organization-workspaces'

export default async function TeknisiJointerWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'teknisi-jointer')) {
    redirect('/dashboard')
  }

  redirect(teknisiJointerWorkspace.primaryAction.href)
}
