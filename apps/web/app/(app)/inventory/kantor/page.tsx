import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { kantorWorkspace } from '@/lib/organization-workspaces'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'

export default async function KantorWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'kantor')) {
    redirect('/dashboard')
  }

  return (
    <OrganizationWorkspacePage
      role={session.role}
      eyebrow={kantorWorkspace.eyebrow}
      title={kantorWorkspace.title}
      description={kantorWorkspace.description}
      primaryAction={kantorWorkspace.primaryAction}
      secondaryAction={kantorWorkspace.secondaryAction}
      steps={kantorWorkspace.steps}
      sections={kantorWorkspace.sections}
    />
  )
}
