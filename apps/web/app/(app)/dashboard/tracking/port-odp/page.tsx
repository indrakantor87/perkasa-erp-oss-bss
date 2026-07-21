import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'

export default async function TrackingPortOdpPage({
  searchParams,
}: {
  searchParams?: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard/tracking/port-odp') || !canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const params = new URLSearchParams()
  const focus = Array.isArray(resolvedSearchParams.focus) ? resolvedSearchParams.focus[0] : resolvedSearchParams.focus
  const month = Array.isArray(resolvedSearchParams.month) ? resolvedSearchParams.month[0] : resolvedSearchParams.month
  const year = Array.isArray(resolvedSearchParams.year) ? resolvedSearchParams.year[0] : resolvedSearchParams.year

  if (focus) {
    params.set('focus', focus)
  }
  if (month) {
    params.set('month', month)
  }
  if (year) {
    params.set('year', year)
  }

  const query = params.toString()
  redirect(query ? `/inventory/network?${query}` : '/inventory/network')
}
