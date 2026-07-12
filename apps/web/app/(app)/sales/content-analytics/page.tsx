import { redirect } from 'next/navigation'
import { ContentAnalyticsManager } from '@/components/digital-creator-manager'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { getDigitalCreatorOptions } from '@/lib/services/digital-creator-service'

export default async function ContentAnalyticsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/content-analytics')) {
    redirect('/dashboard')
  }

  const options = await getDigitalCreatorOptions()

  return (
    <ContentAnalyticsManager
      role={session.role}
      campaignOptions={options.campaigns}
      contentOptions={options.contentItems}
    />
  )
}
