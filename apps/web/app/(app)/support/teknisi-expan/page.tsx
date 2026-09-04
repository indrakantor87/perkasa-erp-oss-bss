import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { teknisiExpanWorkspace } from '@/lib/organization-workspaces'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'

export default async function TeknisiExpanWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'teknisi-expan')) {
    redirect('/dashboard')
  }

  return (
    <OrganizationWorkspacePage
      role={session.role}
      eyebrow={teknisiExpanWorkspace.eyebrow}
      title={teknisiExpanWorkspace.title}
      description={teknisiExpanWorkspace.description}
      primaryAction={teknisiExpanWorkspace.primaryAction}
      secondaryAction={teknisiExpanWorkspace.secondaryAction}
      steps={teknisiExpanWorkspace.steps}
      sections={teknisiExpanWorkspace.sections}
    />
  )
}
