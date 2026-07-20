import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { teknisiDismantleWorkspace } from '@/lib/organization-workspaces'

export default async function TeknisiDismantleWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'teknisi-dismantle')) {
    redirect('/dashboard')
  }

  redirect(teknisiDismantleWorkspace.primaryAction.href)
}
