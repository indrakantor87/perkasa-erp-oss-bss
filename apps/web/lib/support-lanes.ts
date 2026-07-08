import type { AppRole, DomainReviewSection, SupportLaneKey, SupportLaneSnapshot } from '@/lib/types'

export const SUPPORT_LANE_KEYS: SupportLaneKey[] = ['tt', 'isolations', 'dismantle', 'sla']

type SupportLaneMeta = {
  title: string
  shortLabel: string
  accent: string
  sectionKeywords: string[]
}

const supportLaneMetaMap: Record<SupportLaneKey, SupportLaneMeta> = {
  tt: {
    title: 'Queue Trouble Ticket',
    shortLabel: 'TT',
    accent: 'bg-orange-50 text-orange-700',
    sectionKeywords: ['TROUBLE'],
  },
  isolations: {
    title: 'Queue Isolir Aktif',
    shortLabel: 'Isolir',
    accent: 'bg-amber-50 text-amber-700',
    sectionKeywords: ['ISOLIR'],
  },
  dismantle: {
    title: 'Dismantle Dan Terminasi',
    shortLabel: 'Dismantle',
    accent: 'bg-rose-50 text-rose-700',
    sectionKeywords: ['DISMANTLE'],
  },
  sla: {
    title: 'Kontrol SLA',
    shortLabel: 'SLA',
    accent: 'bg-sky-50 text-sky-700',
    sectionKeywords: ['SLA'],
  },
}

const supportLaneOrder: Record<AppRole, SupportLaneKey[]> = {
  SUPER_ADMIN: ['tt', 'isolations', 'dismantle', 'sla'],
  SALES_MARKETING: ['isolations', 'tt', 'dismantle', 'sla'],
  CS_OPERATOR: ['isolations', 'tt', 'dismantle', 'sla'],
  CS_ADMIN: ['isolations', 'tt', 'dismantle', 'sla'],
  NOC_OPERATOR: ['tt', 'sla', 'isolations', 'dismantle'],
  FIELD_TECHNICIAN: ['tt', 'sla', 'isolations', 'dismantle'],
  TT_OPERATOR: ['tt', 'sla', 'isolations', 'dismantle'],
  DIGITAL_CREATOR: ['tt', 'isolations', 'dismantle', 'sla'],
  DISMANTLE_OPERATOR: ['dismantle', 'isolations', 'tt', 'sla'],
}

export function normalizeSupportLane(value: string | string[] | undefined): SupportLaneKey | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) {
    return null
  }

  const normalized = raw.trim().toLowerCase()
  if (!SUPPORT_LANE_KEYS.includes(normalized as SupportLaneKey)) {
    return null
  }

  return normalized as SupportLaneKey
}

export function getSupportLaneOrder(role: AppRole) {
  return supportLaneOrder[role]
}

export function getPreferredSupportLane(role: AppRole): SupportLaneKey {
  return supportLaneOrder[role][0] ?? 'tt'
}

export function getSupportLaneMeta(lane: SupportLaneKey) {
  return {
    key: lane,
    ...supportLaneMetaMap[lane],
  }
}

export function getSupportLaneSections(sections: DomainReviewSection[], lane: SupportLaneKey) {
  const keywords = supportLaneMetaMap[lane].sectionKeywords
  return sections.filter((section) =>
    keywords.some((keyword) => section.title.toUpperCase().includes(keyword)),
  )
}

export function buildSupportLaneSnapshots(
  role: AppRole,
  sections: DomainReviewSection[],
): SupportLaneSnapshot[] {
  return getSupportLaneOrder(role).map((lane) => {
    const laneMeta = getSupportLaneMeta(lane)
    const laneSections = getSupportLaneSections(sections, lane)
    return {
      key: lane,
      title: laneMeta.title,
      shortLabel: laneMeta.shortLabel,
      accent: laneMeta.accent,
      count: laneSections.reduce((total, section) => total + section.rows.length, 0),
      sectionTitles: laneSections.map((section) => section.title),
    }
  })
}
