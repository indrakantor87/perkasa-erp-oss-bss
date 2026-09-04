import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { legalWorkspace } from '@/lib/organization-workspaces'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'

export default async function LegalWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'legal')) {
    redirect('/dashboard')
  }

  return (
    <OrganizationWorkspacePage
      role={session.role}
      eyebrow={legalWorkspace.eyebrow}
      title={legalWorkspace.title}
      description={legalWorkspace.description}
      primaryAction={legalWorkspace.primaryAction}
      secondaryAction={legalWorkspace.secondaryAction}
      steps={legalWorkspace.steps}
      sections={legalWorkspace.sections}
    />
  )
}
