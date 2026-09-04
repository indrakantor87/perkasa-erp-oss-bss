import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { digitalCreatorWorkspace } from '@/lib/organization-workspaces'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'

export default async function DigitalCreatorWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'digital-creator')) {
    redirect('/dashboard')
  }

  return (
    <OrganizationWorkspacePage
      role={session.role}
      eyebrow={digitalCreatorWorkspace.eyebrow}
      title={digitalCreatorWorkspace.title}
      description={digitalCreatorWorkspace.description}
      primaryAction={digitalCreatorWorkspace.primaryAction}
      secondaryAction={digitalCreatorWorkspace.secondaryAction}
      steps={digitalCreatorWorkspace.steps}
      sections={digitalCreatorWorkspace.sections}
    />
  )
}
