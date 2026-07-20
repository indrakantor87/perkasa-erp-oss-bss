import type { AppRole } from '@/lib/types'

export type OrganizationWorkspaceKey =
  | 'cs-admin'
  | 'digital-creator'
  | 'teknisi-psb'
  | 'teknisi-expan'
  | 'teknisi-jointer'
  | 'teknisi-troubleshoots'
  | 'teknisi-dismantle'
  | 'legal'
  | 'kantor'
  | 'toko'

const organizationWorkspaceRoles: Record<OrganizationWorkspaceKey, AppRole[]> = {
  'cs-admin': ['SUPER_ADMIN', 'CS_ADMIN'],
  'digital-creator': ['SUPER_ADMIN', 'DIGITAL_CREATOR'],
  'teknisi-psb': ['SUPER_ADMIN', 'FIELD_TECHNICIAN'],
  'teknisi-expan': ['SUPER_ADMIN', 'FIELD_TECHNICIAN'],
  'teknisi-jointer': ['SUPER_ADMIN', 'FIELD_TECHNICIAN'],
  'teknisi-troubleshoots': ['SUPER_ADMIN', 'FIELD_TECHNICIAN'],
  'teknisi-dismantle': ['SUPER_ADMIN', 'FIELD_TECHNICIAN'],
  legal: ['SUPER_ADMIN'],
  kantor: ['SUPER_ADMIN'],
  toko: ['SUPER_ADMIN'],
}

export function canAccessOrganizationWorkspace(role: AppRole, workspace: OrganizationWorkspaceKey) {
  return organizationWorkspaceRoles[workspace].includes(role)
}
