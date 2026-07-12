import { redirect } from 'next/navigation'
import { CampaignManager } from '@/components/digital-creator-manager'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'

export default async function CampaignsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/campaigns')) {
    redirect('/dashboard')
  }

  return <CampaignManager role={session.role} />
}
