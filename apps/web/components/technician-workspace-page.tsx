import { OrganizationWorkspacePage, type OrganizationWorkspaceLink, type OrganizationWorkspaceSection, type OrganizationWorkspaceStep } from '@/components/organization-workspace-page'
import type { AppSession } from '@/lib/auth-session'
import type { AppRole } from '@/lib/types'

export type TechnicianWorkspaceConfig = {
  eyebrow: string
  title: string
  description: string
  workOrderJobCategory?: string
  queueTicketType?: string
  inventoryReferenceType?: string
  primaryActionLabel?: string
  primaryActionDescription?: string
  secondaryActionLabel?: string
  secondaryActionDescription?: string
  steps: OrganizationWorkspaceStep[]
  sections: OrganizationWorkspaceSection[]
}

function buildPersonalWorkOrderSearch(session: AppSession) {
  const displayName = session.displayName.trim()
  if (displayName) {
    return displayName
  }
  return session.username.trim()
}

function mergeHrefQuery(baseHref: string, extraQuery: string) {
  if (!extraQuery.startsWith('?')) {
    return baseHref
  }

  const [basePath, baseQuery = ''] = baseHref.split('?')
  const merged = new URLSearchParams(baseQuery)
  const extras = new URLSearchParams(extraQuery.slice(1))
  extras.forEach((value, key) => {
    merged.set(key, value)
  })

  const query = merged.toString()
  return query ? `${basePath}?${query}` : basePath ?? baseHref
}

function buildWorkOrderHref(session: AppSession, config: TechnicianWorkspaceConfig) {
  const params = new URLSearchParams()
  if (config.workOrderJobCategory) {
    params.set('jobCategory', config.workOrderJobCategory)
  }
  if (session.userId) {
    params.set('mine', '1')
  } else {
    const q = buildPersonalWorkOrderSearch(session)
    if (q) {
      params.set('q', q)
    }
  }
  return `/dashboard/tracking/work-orders?${params.toString()}`
}

function buildQueueHref(config: TechnicianWorkspaceConfig) {
  const params = new URLSearchParams()
  if (config.queueTicketType) {
    params.set('ticketType', config.queueTicketType)
  }
  return `/dashboard/tracking/noc-queue?${params.toString()}`
}

function buildInventoryHref(config: TechnicianWorkspaceConfig) {
  const params = new URLSearchParams()
  if (config.inventoryReferenceType) {
    params.set('referenceType', config.inventoryReferenceType)
  }
  return `/dashboard/tracking/stock-movements?${params.toString()}`
}

function personalizeLinkHref(session: AppSession, config: TechnicianWorkspaceConfig, href: string) {
  if (href.startsWith('__AUTO_WORK_ORDERS__')) {
    return mergeHrefQuery(buildWorkOrderHref(session, config), href.slice('__AUTO_WORK_ORDERS__'.length))
  }
  if (href.startsWith('__AUTO_QUEUE__')) {
    return mergeHrefQuery(buildQueueHref(config), href.slice('__AUTO_QUEUE__'.length))
  }
  if (href.startsWith('__AUTO_MOVEMENTS__')) {
    return mergeHrefQuery(buildInventoryHref(config), href.slice('__AUTO_MOVEMENTS__'.length))
  }
  return href
}

function personalizeSections(session: AppSession, config: TechnicianWorkspaceConfig) {
  return config.sections.map((section) => ({
    ...section,
    links: section.links.map((link) => ({
      ...link,
      href: personalizeLinkHref(session, config, link.href),
    })),
  }))
}

export function TechnicianWorkspacePage({
  session,
  role,
  config,
}: {
  session: AppSession
  role: AppRole
  config: TechnicianWorkspaceConfig
}) {
  const sections = personalizeSections(session, config)
  const primaryAction: OrganizationWorkspaceLink = {
    label: config.primaryActionLabel || 'Buka pekerjaan saya',
    href: buildWorkOrderHref(session, config),
    description:
      config.primaryActionDescription || 'Masuk ke daftar work order yang sudah dipersempit ke jenis kerja dan identitas login Anda.',
  }
  const secondaryAction: OrganizationWorkspaceLink | undefined = config.queueTicketType
    ? {
        label: config.secondaryActionLabel || 'Buka queue terkait',
        href: buildQueueHref(config),
        description: config.secondaryActionDescription || 'Masuk ke queue ticketing untuk melihat sumber kerja teknis yang relevan.',
      }
    : undefined

  return (
    <OrganizationWorkspacePage
      role={role}
      eyebrow={config.eyebrow}
      title={`${config.title} • ${session.displayName}`}
      description={config.description}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      steps={config.steps}
      sections={sections}
    />
  )
}
