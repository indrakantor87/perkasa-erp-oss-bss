import { redirect } from 'next/navigation'
import { DigitalLeadManager } from '@/components/digital-creator-manager'
import { requireSession } from '@/lib/auth'
import { canAccessPath } from '@/lib/access-control-server'
import { getDigitalCreatorOptions } from '@/lib/services/digital-creator-service'

export default async function DigitalLeadsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/sales/digital-leads')) {
    redirect('/dashboard')
  }

  const options = await getDigitalCreatorOptions()

  return (
    <DigitalLeadManager
      role={session.role}
      campaignOptions={options.campaigns}
      salesLeadOptions={options.salesLeads}
    />
  )
}
