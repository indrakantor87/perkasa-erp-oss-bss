export type WorklistQueryState = {
  queue?: string
  domain?: string
  priority?: string
  status?: string
  q?: string
  mine?: boolean
  overdue?: boolean
  selected?: string
}

export function buildWorklistQueryHref(state: WorklistQueryState) {
  const searchParams = new URLSearchParams()

  if (state.queue) searchParams.set('queue', state.queue)
  if (state.domain) searchParams.set('domain', state.domain)
  if (state.priority) searchParams.set('priority', state.priority)
  if (state.status) searchParams.set('status', state.status)
  if (state.q) searchParams.set('q', state.q)
  if (state.mine) searchParams.set('mine', '1')
  if (state.overdue) searchParams.set('overdue', '1')
  if (state.selected) searchParams.set('selected', state.selected)

  const query = searchParams.toString()
  return query ? `/dashboard/worklist?${query}` : '/dashboard/worklist'
}
