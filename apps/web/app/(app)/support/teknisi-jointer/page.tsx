import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { teknisiJointerWorkspace } from '@/lib/organization-workspaces'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'

export default async function TeknisiJointerWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'teknisi-jointer')) {
    redirect('/dashboard')
  }

  return (
    <OrganizationWorkspacePage
      role={session.role}
      eyebrow={teknisiJointerWorkspace.eyebrow}
      title={teknisiJointerWorkspace.title}
      description={teknisiJointerWorkspace.description}
      primaryAction={teknisiJointerWorkspace.primaryAction}
      secondaryAction={teknisiJointerWorkspace.secondaryAction}
      steps={teknisiJointerWorkspace.steps}
      sections={teknisiJointerWorkspace.sections}
    />
  )
}
