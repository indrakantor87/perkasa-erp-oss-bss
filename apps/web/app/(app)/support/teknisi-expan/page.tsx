import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import type { AppRole } from '@/lib/types'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { teknisiExpanWorkspace } from '@/lib/organization-workspaces'
import type {
  OrganizationWorkspaceLink,
  OrganizationWorkspaceSection,
} from '@/components/organization-workspace-page'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'

function resolveVisibleLink(
  role: AppRole,
  link: OrganizationWorkspaceLink,
): OrganizationWorkspaceLink | null {
  return canAccessPath(role, link.href.split('?')[0] ?? link.href) ? link : null
}

function resolveVisibleSections(
  role: AppRole,
  sections: OrganizationWorkspaceSection[],
): OrganizationWorkspaceSection[] {
  return sections
    .map((section) => ({
      ...section,
      links: section.links
        .map((link) => resolveVisibleLink(role, link))
        .filter((l): l is OrganizationWorkspaceLink => Boolean(l)),
    }))
    .filter((section) => section.links.length > 0)
}

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
      visiblePrimaryAction={resolveVisibleLink(session.role, teknisiExpanWorkspace.primaryAction)}
      visibleSecondaryAction={
        teknisiExpanWorkspace.secondaryAction
          ? resolveVisibleLink(session.role, teknisiExpanWorkspace.secondaryAction)
          : null
      }
      visibleSections={resolveVisibleSections(session.role, teknisiExpanWorkspace.sections)}
    />
  )
}
