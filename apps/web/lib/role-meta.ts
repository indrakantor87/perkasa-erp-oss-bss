import type { AppRole } from '@/lib/types'

type RoleMeta = {
  label: string
  shortLabel: string
  tone: string
  scope: string
}

const roleMetaMap: Record<AppRole, RoleMeta> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    shortLabel: 'Admin Global',
    tone: 'bg-slate-950 text-white',
    scope: 'Akses penuh lintas domain, user, dan permission.',
  },
  SALES_MARKETING: {
    label: 'Sales Marketing',
    shortLabel: 'Marketing',
    tone: 'bg-sky-600 text-white',
    scope: 'Prospek, survey awal, customer awal, dan monitoring lintas domain.',
  },
  CS_OPERATOR: {
    label: 'CS Operator',
    shortLabel: 'CS',
    tone: 'bg-blue-600 text-white',
    scope: 'Input operasional, list kerja, support dasar, dan ODP terbatas.',
  },
  CS_ADMIN: {
    label: 'CS Admin',
    shortLabel: 'Admin CS',
    tone: 'bg-indigo-600 text-white',
    scope: 'Supervisor operasional CS dengan approval dan koreksi data tertentu.',
  },
  NOC_OPERATOR: {
    label: 'NOC Operator',
    shortLabel: 'NOC',
    tone: 'bg-emerald-600 text-white',
    scope: 'Trouble ticket teknis, monitoring jaringan, dan ODP operasional.',
  },
  FIELD_TECHNICIAN: {
    label: 'Field Technician',
    shortLabel: 'Teknisi',
    tone: 'bg-amber-500 text-slate-950',
    scope: 'Eksekusi lapangan, hasil kunjungan, dan update teknis sesuai queue.',
  },
  TT_OPERATOR: {
    label: 'Trouble Ticket Operator',
    shortLabel: 'TT',
    tone: 'bg-orange-600 text-white',
    scope: 'Penanganan trouble ticket dengan scope support yang sempit.',
  },
  DIGITAL_CREATOR: {
    label: 'Digital Creator',
    shortLabel: 'Creator',
    tone: 'bg-fuchsia-600 text-white',
    scope: 'Campaign, lead digital, konten, dan analytics marketing.',
  },
  DISMANTLE_OPERATOR: {
    label: 'Dismantle Operator',
    shortLabel: 'Dismantle',
    tone: 'bg-rose-600 text-white',
    scope: 'Queue dismantle, catatan lapangan, dan penyelesaian pembongkaran.',
  },
}

export function getRoleMeta(role: AppRole) {
  return roleMetaMap[role]
}
