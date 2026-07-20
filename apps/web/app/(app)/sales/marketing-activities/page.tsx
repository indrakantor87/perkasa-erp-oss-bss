import { redirect } from 'next/navigation'
import { MarketingActivityManager } from '@/components/marketing-activity-manager'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import {
  getMarketingCoveredAreaOptions,
  getMarketingUserOptions,
} from '@/lib/services/marketing-activity-service'

export default async function MarketingActivitiesPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/marketing-activities')) {
    redirect('/dashboard')
  }

  const [marketingOptions, coveredAreas] = await Promise.all([
    getMarketingUserOptions(),
    getMarketingCoveredAreaOptions(),
  ])

  return (
    <MarketingActivityManager
      role={session.role}
      username={session.username}
      displayName={session.displayName}
      marketingOptions={marketingOptions}
      coveredAreas={coveredAreas}
      displayMode="sales-focus"
    />
  )
}
