import { redirect } from 'next/navigation'
import { TechnicianWorkspacePage } from '@/components/technician-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { teknisiTroubleshootsWorkspaceConfig } from '@/lib/technician-workspace-config'

export default async function TeknisiTroubleshootsWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'teknisi-troubleshoots')) {
    redirect('/dashboard')
  }

  return <TechnicianWorkspacePage session={session} role={session.role} config={teknisiTroubleshootsWorkspaceConfig} />
}
