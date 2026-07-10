import type { AppRole } from '@/lib/types'
import { canAccessPath } from '@/lib/access-control-server'
import { moduleCards } from '@/lib/mock-dashboard'
import { navigationItems } from '@/lib/navigation'

export function getAccessibleNavigationItems(role: AppRole) {
  return navigationItems.filter((item) => canAccessPath(role, item.href))
}

export function getVisibleModuleCards(role: AppRole) {
  return moduleCards.filter((item) => canAccessPath(role, item.href))
}
