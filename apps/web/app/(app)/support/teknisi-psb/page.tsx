import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { teknisiPsbWorkspace } from '@/lib/organization-workspaces'

export default async function TeknisiPsbWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'teknisi-psb')) {
    redirect('/dashboard')
  }

  redirect(teknisiPsbWorkspace.primaryAction.href)
}
