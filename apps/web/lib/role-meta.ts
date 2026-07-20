import type { AppRole } from '@/lib/types'
import { translateUiText, type UiLanguage } from '@/lib/ui-language'

type RoleMeta = {
  label: string
  shortLabel: string
  tone: string
  scope: string
  division: string
  subdivision: string
}

const roleMetaMap: Record<AppRole, RoleMeta> = {
  OWNER: {
    label: 'Owner',
    shortLabel: 'Owner',
    tone: 'bg-slate-800 text-white',
    scope: 'Ringkasan performa lintas divisi dengan akses baca (read-only).',
    division: 'Lintas Divisi',
    subdivision: 'Owner',
  },
  SUPER_ADMIN: {
    label: 'Super Admin',
    shortLabel: 'Admin Global',
    tone: 'bg-slate-950 text-white',
    scope: 'Akses penuh lintas domain, user, dan permission.',
    division: 'Lintas Divisi',
    subdivision: 'Kontrol Global',
  },
  ADMIN: {
    label: 'Admin',
    shortLabel: 'Admin',
    tone: 'bg-slate-900 text-white',
    scope: 'Kontrol operasional lintas divisi sesuai scope cabang yang diberikan.',
    division: 'Lintas Divisi',
    subdivision: 'Admin Operasional',
  },
  FINANCE: {
    label: 'Finance',
    shortLabel: 'Finance',
    tone: 'bg-emerald-700 text-white',
    scope: 'Billing, collection, monitoring suspend, dan ringkasan PSB terkait cabang.',
    division: 'Finance & Billing',
    subdivision: 'Finance',
  },
  HR: {
    label: 'HR',
    shortLabel: 'HR',
    tone: 'bg-indigo-700 text-white',
    scope: 'Absensi, payroll, dan operasional SDM sesuai cabang.',
    division: 'Finance & HR',
    subdivision: 'HR',
  },
  GA: {
    label: 'GA',
    shortLabel: 'GA',
    tone: 'bg-sky-700 text-white',
    scope: 'Inventory, aset, dan kebutuhan operasional umum sesuai cabang.',
    division: 'Operasional',
    subdivision: 'GA',
  },
  PENJUALAN: {
    label: 'Penjualan',
    shortLabel: 'Sales',
    tone: 'bg-sky-600 text-white',
    scope: 'Input PSB, list PSB, dan monitoring operasional terkait penjualan sesuai cabang.',
    division: 'Pemasaran dan Pelayanan',
    subdivision: 'Penjualan',
  },
  SALES_MARKETING: {
    label: 'Sales Marketing',
    shortLabel: 'Marketing',
    tone: 'bg-sky-600 text-white',
    scope: 'Prospek, survey awal, customer awal, dan monitoring lintas domain.',
    division: 'Pemasaran dan Pelayanan',
    subdivision: 'Penjualan',
  },
  CS_OPERATOR: {
    label: 'CS Operator',
    shortLabel: 'CS',
    tone: 'bg-blue-600 text-white',
    scope: 'Input operasional, list kerja, support dasar, dan ODP terbatas.',
    division: 'Pemasaran dan Pelayanan',
    subdivision: 'CS',
  },
  CS_ADMIN: {
    label: 'CS Admin',
    shortLabel: 'Admin CS',
    tone: 'bg-indigo-600 text-white',
    scope: 'Supervisor operasional CS dengan approval dan koreksi data tertentu.',
    division: 'Pemasaran dan Pelayanan',
    subdivision: 'Admin CS',
  },
  NOC_OPERATOR: {
    label: 'NOC Operator',
    shortLabel: 'NOC',
    tone: 'bg-emerald-600 text-white',
    scope: 'Ticketing teknis, kontrol SLA, validasi progres lapangan, dan monitoring jaringan operasional.',
    division: 'Operasional Teknis',
    subdivision: 'NOC',
  },
  FIELD_TECHNICIAN: {
    label: 'Field Technician',
    shortLabel: 'Teknisi',
    tone: 'bg-amber-500 text-slate-950',
    scope: 'Eksekusi lapangan, hasil kunjungan, dan update teknis sesuai queue.',
    division: 'Teknis dan Expan',
    subdivision: 'Teknisi (PSB/Jalur & Expan/Jointer)',
  },
  TT_OPERATOR: {
    label: 'Trouble Ticket Operator',
    shortLabel: 'TT',
    tone: 'bg-orange-600 text-white',
    scope: 'Penanganan trouble ticket dengan scope support yang sempit.',
    division: 'Pemasaran dan Pelayanan',
    subdivision: 'Troubleshoots',
  },
  DIGITAL_CREATOR: {
    label: 'Digital Creator',
    shortLabel: 'Creator',
    tone: 'bg-fuchsia-600 text-white',
    scope: 'Campaign, lead digital, konten, dan analytics marketing.',
    division: 'Pemasaran dan Pelayanan',
    subdivision: 'Creator Digital',
  },
  DISMANTLE_OPERATOR: {
    label: 'Dismantle Operator',
    shortLabel: 'Dismantle',
    tone: 'bg-rose-600 text-white',
    scope: 'Antrean dismantle, catatan lapangan, dan penyelesaian pembongkaran.',
    division: 'Pemasaran dan Pelayanan',
    subdivision: 'Dismantle',
  },
}

export function getRoleMeta(role: AppRole, language: UiLanguage = 'id') {
  const roleMeta = roleMetaMap[role]

  if (language === 'id') {
    return roleMeta
  }

  return {
    ...roleMeta,
    label: translateUiText(roleMeta.label, language),
    shortLabel: translateUiText(roleMeta.shortLabel, language),
    scope: translateUiText(roleMeta.scope, language),
    division: translateUiText(roleMeta.division, language),
    subdivision: translateUiText(roleMeta.subdivision, language),
  }
}
