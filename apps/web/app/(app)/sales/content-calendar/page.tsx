import { redirect } from 'next/navigation'
import { ContentCalendarManager } from '@/components/digital-creator-manager'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'

export default async function ContentCalendarPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/content-calendar')) {
    redirect('/dashboard')
  }

  return <ContentCalendarManager role={session.role} />
}
