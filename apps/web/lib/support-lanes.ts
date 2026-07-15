import type {
  AppRole,
  DomainReviewSection,
  SupportLaneActionKey,
  SupportLaneKey,
  SupportLaneSnapshot,
  SupportLaneReviewSummary,
  SupportLaneWorkspace,
} from '@/lib/types'
import { translateUiText, type UiLanguage } from '@/lib/ui-language'

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

const supportLaneAliases: Record<string, SupportLaneKey> = {
  'trouble-ticket': 'tt',
  troubleticket: 'tt',
  trouble_tickets: 'tt',
  'trouble-tickets': 'tt',
  isolation: 'isolations',
  dismantles: 'dismantle',
}

function matchesSupportLaneSectionTitle(title: string, lane: SupportLaneKey) {
  const normalizedTitle = title.trim().toUpperCase()

  if (lane === 'tt') {
    return normalizedTitle.startsWith('TROUBLE TICKET ')
  }

  if (lane === 'sla') {
    return normalizedTitle.startsWith('SLA TICKET ') || normalizedTitle.startsWith('SLA TROUBLE TICKET')
  }

  return supportLaneMetaMap[lane].sectionKeywords.some((keyword) => normalizedTitle.includes(keyword))
}

const supportLaneOrder: Record<AppRole, SupportLaneKey[]> = {
  OWNER: ['tt', 'isolations', 'dismantle', 'sla'],
  SUPER_ADMIN: ['tt', 'isolations', 'dismantle', 'sla'],
  ADMIN: ['tt', 'isolations', 'dismantle', 'sla'],
  FINANCE: ['isolations', 'sla', 'tt'],
  HR: ['tt', 'sla'],
  GA: ['dismantle', 'isolations', 'tt'],
  PENJUALAN: ['isolations', 'tt', 'dismantle', 'sla'],
  SALES_MARKETING: ['isolations', 'tt', 'dismantle', 'sla'],
  CS_OPERATOR: ['isolations', 'tt', 'dismantle', 'sla'],
  CS_ADMIN: ['isolations', 'tt', 'dismantle', 'sla'],
  NOC_OPERATOR: ['tt', 'sla', 'isolations'],
  FIELD_TECHNICIAN: ['tt', 'sla', 'isolations'],
  TT_OPERATOR: ['tt', 'sla'],
  DIGITAL_CREATOR: ['tt', 'isolations', 'dismantle', 'sla'],
  DISMANTLE_OPERATOR: ['dismantle', 'isolations'],
}

export function normalizeSupportLane(value: string | string[] | undefined): SupportLaneKey | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) {
    return null
  }

  const normalized = raw.trim().toLowerCase()
  if (supportLaneAliases[normalized]) {
    return supportLaneAliases[normalized]
  }

  if (!SUPPORT_LANE_KEYS.includes(normalized as SupportLaneKey)) {
    return null
  }

  return normalized as SupportLaneKey
}

export function getSupportLanePath(lane: SupportLaneKey) {
  return `/support/${lane}`
}

export function getSupportLaneOrder(role: AppRole) {
  return supportLaneOrder[role]
}

export function canAccessSupportLane(role: AppRole, lane: SupportLaneKey) {
  return getSupportLaneOrder(role).includes(lane)
}

export function getPreferredSupportLane(role: AppRole): SupportLaneKey {
  return supportLaneOrder[role][0] ?? 'tt'
}

export function getActiveSupportLane(role: AppRole, selectedLane: SupportLaneKey | null): SupportLaneKey {
  if (selectedLane && canAccessSupportLane(role, selectedLane)) {
    return selectedLane
  }
  return getPreferredSupportLane(role)
}

export function getSupportLaneMeta(lane: SupportLaneKey, language: UiLanguage = 'id') {
  return {
    key: lane,
    ...supportLaneMetaMap[lane],
    title: translateUiText(supportLaneMetaMap[lane].title, language),
    shortLabel: translateUiText(supportLaneMetaMap[lane].shortLabel, language),
  }
}

export function getSupportLaneSections(sections: DomainReviewSection[], lane: SupportLaneKey) {
  return sections.filter((section) => matchesSupportLaneSectionTitle(section.title, lane))
}

export function buildSupportLaneSnapshots(
  role: AppRole,
  sections: DomainReviewSection[],
  language: UiLanguage = 'id',
): SupportLaneSnapshot[] {
  return getSupportLaneOrder(role).map((lane) => {
    const laneMeta = getSupportLaneMeta(lane, language)
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

export function buildSupportLaneWorkspace(
  role: AppRole,
  lane: SupportLaneKey,
  snapshots: SupportLaneSnapshot[],
  language: UiLanguage = 'id',
): SupportLaneWorkspace {
  const snapshot = snapshots.find((item) => item.key === lane) ?? {
    key: lane,
    title: getSupportLaneMeta(lane, language).title,
    shortLabel: getSupportLaneMeta(lane, language).shortLabel,
    accent: getSupportLaneMeta(lane, language).accent,
    count: 0,
    sectionTitles: [],
  }

  const workspaceMap: Record<
    SupportLaneKey,
    Omit<SupportLaneWorkspace, 'lane' | 'sectionTitles' | 'count'>
  > = {
    tt: {
      title:
        role === 'TT_OPERATOR' || role === 'NOC_OPERATOR'
          ? 'Workspace Trouble Ticket'
          : 'Workspace Monitoring Trouble Ticket',
      summary:
        'Fokuskan ticket terbuka, cek jenis gangguan, dorong update status, lalu tutup loop setelah penanganan teknis selesai.',
      checklist: [
        'Validasi ticket baru dan pastikan jenis gangguan sudah jelas.',
        'Pastikan tindak lanjut teknis atau eskalasi lapangan sudah dicatat.',
        'Tutup ticket yang sudah selesai agar antrian operasional tetap bersih.',
      ],
      actionKeys: ['ticket-create', 'ticket-progress', 'ticket-escalate', 'ticket-close', 'sla-manage'],
      escalationNote:
        'Eskalasi ke lane SLA atau teknisi lapangan jika ticket berpotensi melewati target durasi.',
    },
    isolations: {
      title: 'Workspace Isolir Dan Recovery',
      summary:
        'Kelola suspend aktif, restore pelanggan yang sudah siap dipulihkan, dan siapkan kandidat yang perlu diteruskan ke proses dismantle.',
      checklist: [
        'Cek identitas pelanggan, radbox, dan alasan isolir sebelum tindakan.',
        'Pulihkan pelanggan yang sudah memenuhi syarat restore.',
        'Tandai kasus yang perlu diteruskan ke terminasi permanen.',
      ],
      actionKeys: ['isolation-create', 'isolation-restore', 'dismantle-approve'],
      escalationNote:
        'Eskalasi ke lane dismantle bila status pelanggan tidak lagi bisa dipulihkan dan perlu terminasi penuh.',
    },
    dismantle: {
      title: 'Workspace Dismantle',
      summary:
        'Gunakan lane ini untuk membaca kandidat terminasi dari isolir aktif, memfinalkan keputusan dismantle, dan menjaga histori penutupan layanan tetap sinkron.',
      checklist: [
        'Pastikan kandidat dismantle berasal dari isolir atau keputusan terminasi yang valid.',
        'Verifikasi queue open sebelum pelanggan dipindahkan ke histori dismantle.',
        'Simpan close note atau reopen note sebagai jejak operasional.',
      ],
      actionKeys: ['dismantle-approve', 'dismantle-close', 'dismantle-reopen', 'isolation-restore'],
      escalationNote:
        'Kembalikan ke lane isolir bila kasus ternyata masih perlu recovery pelanggan, bukan terminasi.',
    },
    sla: {
      title:
        role === 'FIELD_TECHNICIAN'
          ? 'Workspace Prioritas Lapangan'
          : 'Workspace Kontrol SLA',
      summary:
        'Pantau aturan durasi penanganan, samakan prioritas dengan ticket aktif, dan dorong tim support/lapangan menangani kasus yang mendekati overdue.',
      checklist: [
        'Review aturan SLA per tipe ticket yang sedang aktif.',
        'Cocokkan ticket prioritas dengan target durasi yang berlaku.',
        'Eskalasi kasus yang mendekati atau melewati SLA ke operator terkait.',
      ],
      actionKeys: ['sla-manage', 'ticket-progress', 'ticket-escalate', 'ticket-close'],
      escalationNote:
        'Eskalasi ke lane TT jika problem teknis belum memiliki owner yang jelas atau update statusnya tertinggal.',
    },
  }

  const workspace = workspaceMap[lane]
  return {
    lane,
    title: translateUiText(workspace.title, language),
    summary: translateUiText(workspace.summary, language),
    checklist: workspace.checklist.map((item) => translateUiText(item, language)),
    actionKeys: workspace.actionKeys as SupportLaneActionKey[],
    sectionTitles: snapshot.sectionTitles,
    count: snapshot.count,
    escalationNote: translateUiText(workspace.escalationNote, language),
  }
}

export function canUseSupportAction(params: {
  role: AppRole
  actionKey: SupportLaneActionKey
  canCreate: boolean
  canUpdate: boolean
  canApprove: boolean
}) {
  const { role, actionKey, canCreate, canUpdate, canApprove } = params

  switch (actionKey) {
    case 'ticket-create':
      return canCreate
    case 'ticket-progress':
    case 'ticket-escalate':
    case 'ticket-close':
      return canUpdate
    case 'sla-manage':
      return canApprove
    case 'isolation-create':
      return canCreate
    case 'isolation-restore':
      return canUpdate
    case 'dismantle-approve':
    case 'dismantle-close':
    case 'dismantle-reopen':
      return canApprove || role === 'DISMANTLE_OPERATOR'
    default:
      return false
  }
}

export function canProcessSupportDismantle(role: AppRole, canApprove: boolean) {
  return canApprove || role === 'DISMANTLE_OPERATOR'
}

export function buildSupportLaneReviewSummary(
  sections: DomainReviewSection[],
): SupportLaneReviewSummary {
  const rows = sections.flatMap((section) => section.rows)
  const statusCounts = new Map<string, number>()

  for (const row of rows) {
    const status = row.status || 'UNKNOWN'
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)
  }

  const dominantStatus =
    Array.from(statusCounts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? '-'

  const metaHighlights = Array.from(
    new Set(
      rows
        .flatMap((row) => row.meta)
        .filter(Boolean)
        .slice(0, 12),
    ),
  ).slice(0, 4)

  return {
    totalRows: rows.length,
    sectionCount: sections.length,
    dominantStatus,
    topItems: rows.slice(0, 3).map((row) => `${row.primary} - ${row.secondary}`),
    metaHighlights,
  }
}
