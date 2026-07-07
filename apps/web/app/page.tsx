import { redirect } from 'next/navigation'
import { getDefaultLandingPath } from '@/lib/access-control-server'
import { getSession } from '@/lib/auth'

export default async function HomePage() {
  const session = await getSession()
  redirect(session ? getDefaultLandingPath(session.role) : '/login')
}
