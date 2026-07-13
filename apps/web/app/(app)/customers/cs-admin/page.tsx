import { redirect } from 'next/navigation'
import { CsAdminWorkspaceDashboard } from '@/components/cs-admin-workspace-dashboard'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { getWorklistBucketsData } from '@/lib/services/worklist-service'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

const trackedQueues = ['Perlu Approval', 'Perlu Koreksi', 'Transfer atau Restore', 'Queue Risiko Tinggi'] as const

export default async function CsAdminWorkspacePage({
  searchParams,
}: {
  searchParams?: Promise<{
    queue?: string | string[]
    selected?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'cs-admin')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const selectedQueue = resolveSearchParam(resolvedSearchParams.queue) || trackedQueues[0]
  const selectedItemId = resolveSearchParam(resolvedSearchParams.selected)
  const payload = await getWorklistBucketsData(session, [...trackedQueues])

  return (
    <CsAdminWorkspaceDashboard
      role={session.role}
      source={payload.source}
      baseCount={payload.baseCount}
      buckets={payload.buckets}
      selectedQueue={selectedQueue}
      selectedItemId={selectedItemId}
    />
  )
}
