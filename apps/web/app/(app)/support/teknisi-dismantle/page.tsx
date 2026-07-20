import { redirect } from 'next/navigation'
import { TechnicianWorkspacePage } from '@/components/technician-workspace-page'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { teknisiDismantleWorkspaceConfig } from '@/lib/technician-workspace-config'

export default async function TeknisiDismantleWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'teknisi-dismantle')) {
    redirect('/dashboard')
  }

  return <TechnicianWorkspacePage session={session} role={session.role} config={teknisiDismantleWorkspaceConfig} />
}
