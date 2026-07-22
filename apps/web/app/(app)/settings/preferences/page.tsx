import { redirect } from 'next/navigation'
import { SettingsPreferencesPage } from '@/components/settings-preferences-page'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'

export default async function SettingsPreferencesRoutePage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/settings/preferences')) {
    redirect('/dashboard')
  }

  const canOpenImport = canAccessPath(session.role, '/import')

  return <SettingsPreferencesPage canOpenImport={canOpenImport} />
}
