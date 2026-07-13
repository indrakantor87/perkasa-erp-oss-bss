import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { legalWorkspace } from '@/lib/organization-workspaces'

export default async function LegalWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'legal')) {
    redirect('/dashboard')
  }

  redirect(legalWorkspace.primaryAction.href)
}
