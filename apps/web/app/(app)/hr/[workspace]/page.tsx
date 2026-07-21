import { notFound, redirect } from 'next/navigation'
import { HrWorkspacePage } from '@/components/hr-workspace-page'
import type { HrWorkspaceKey } from '@/components/hr-workspace-page'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'

const validHrWorkspaces: HrWorkspaceKey[] = ['overview', 'employees', 'attendance', 'salary', 'loans', 'permissions', 'disciplinary']

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveIntegerParam(value: string | string[] | undefined) {
  const raw = resolveSearchParam(value)
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function isHrWorkspaceKey(value: string): value is HrWorkspaceKey {
  return validHrWorkspaces.includes(value as HrWorkspaceKey)
}

export default async function HrWorkspaceRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>
  searchParams?: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/hr')) {
    redirect('/dashboard')
  }

  const { workspace } = await params
  if (!isHrWorkspaceKey(workspace) || workspace === 'overview') {
    notFound()
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const payload = await getDomainPageData('hr', session, {
    focus: resolveSearchParam(resolvedSearchParams.focus),
    month: resolvePositiveIntegerParam(resolvedSearchParams.month),
    year: resolvePositiveIntegerParam(resolvedSearchParams.year),
  })

  if (!payload) {
    notFound()
  }

  return (
    <HrWorkspacePage
      content={payload.content}
      source={payload.source}
      capabilities={payload.capabilities}
      role={session.role}
      activeWorkspace={workspace}
    />
  )
}
