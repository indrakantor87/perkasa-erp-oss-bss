import type {
  AppRole,
  DomainReviewSection,
  SupportLaneActionKey,
  SupportLaneKey,
  SupportLaneSnapshot,
  SupportLaneWorkspace,
} from '@/lib/types'

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

export function getSupportLanePath(lane: SupportLaneKey) {
  return `/support/${lane}`
}

export function getSupportLaneOrder(role: AppRole) {
  return supportLaneOrder[role]
}

export function getPreferredSupportLane(role: AppRole): SupportLaneKey {
  return supportLaneOrder[role][0] ?? 'tt'
}

export function getActiveSupportLane(role: AppRole, selectedLane: SupportLaneKey | null): SupportLaneKey {
  return selectedLane ?? getPreferredSupportLane(role)
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

export function buildSupportLaneWorkspace(
  role: AppRole,
  lane: SupportLaneKey,
  snapshots: SupportLaneSnapshot[],
): SupportLaneWorkspace {
  const snapshot = snapshots.find((item) => item.key === lane) ?? {
    key: lane,
    title: getSupportLaneMeta(lane).title,
    shortLabel: getSupportLaneMeta(lane).shortLabel,
    accent: getSupportLaneMeta(lane).accent,
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
      actionKeys: ['ticket-create', 'ticket-close', 'sla-manage'],
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
        'Gunakan lane ini untuk finalisasi terminasi, validasi histori penutupan layanan, dan menjaga jejak dismantle tetap sinkron.',
      checklist: [
        'Pastikan kandidat dismantle berasal dari isolir atau keputusan terminasi yang valid.',
        'Verifikasi histori penutupan agar tidak ada pelanggan aktif yang salah terminasi.',
        'Simpan approval dan catatan terminasi sebagai jejak operasional.',
      ],
      actionKeys: ['dismantle-approve', 'isolation-restore'],
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
      actionKeys: ['sla-manage', 'ticket-close'],
      escalationNote:
        'Eskalasi ke lane TT jika problem teknis belum memiliki owner yang jelas atau update statusnya tertinggal.',
    },
  }

  const workspace = workspaceMap[lane]
  return {
    lane,
    title: workspace.title,
    summary: workspace.summary,
    checklist: workspace.checklist,
    actionKeys: workspace.actionKeys as SupportLaneActionKey[],
    sectionTitles: snapshot.sectionTitles,
    count: snapshot.count,
    escalationNote: workspace.escalationNote,
  }
}
