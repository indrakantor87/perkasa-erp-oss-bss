import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { digitalCreatorWorkspace } from '@/lib/organization-workspaces'

export default async function DigitalCreatorWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'digital-creator')) {
    redirect('/dashboard')
  }

  redirect(digitalCreatorWorkspace.primaryAction.href)
}
