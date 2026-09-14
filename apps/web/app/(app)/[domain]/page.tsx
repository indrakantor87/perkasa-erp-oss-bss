import dynamic from 'next/dynamic'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { DomainShell } from '@/components/domain-shell'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { requireSession } from '@/lib/auth'
import { salesWorkspace } from '@/lib/organization-workspaces'
import { getDomainPageData } from '@/lib/services/domain-service'
import { normalizeSupportLane } from '@/lib/support-lanes'
import { buildSupportLaneHref } from '@/lib/support-action-links'
import { NocDashboardCharts, type NocDashboardChartsProps } from '@/components/noc-dashboard-charts'
import type { GranularityKey, HistoricalSeriesDatum } from '@/components/historical-bar-chart'
import { GRANULARITY_OPTIONS } from '@/components/historical-bar-chart'
import type { SimpleBarDatum } from '@/components/simple-bar-chart'
import type { AppRole, DomainFormPrefill, DomainKey, DomainReviewRow, DomainReviewSection, SupportDrilldownContext, SupportLaneKey } from '@/lib/types'

const SalesDomainWorkspace = dynamic(
  () => import('@/components/sales-domain-workspace').then((mod) => mod.SalesDomainWorkspace),
)

const BillingDomainWorkspace = dynamic(
  () => import('@/components/billing-domain-workspace').then((mod) => mod.BillingDomainWorkspace),
)

const enabledDomains: DomainKey[] = ['sales', 'customers', 'support', 'inventory', 'hr', 'billing']

type OrgLink = { label: string; href: string; description: string; badge?: string }
type OrgSection = { title: string; description: string; links: OrgLink[] }

function resolveOrgVisibleLink(role: AppRole, link: OrgLink): OrgLink | null {
  return canAccessPath(role, link.href.split('?')[0] ?? link.href) ? link : null
}

function resolveOrgVisibleSections(role: AppRole, sections: OrgSection[]): OrgSection[] {
  return sections
    .map((section) => ({
      ...section,
      links: section.links
        .map((link) => resolveOrgVisibleLink(role, link))
        .filter((l): l is OrgLink => Boolean(l)),
    }))
    .filter((section) => section.links.length > 0)
}

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolveSupportDrilldown(
  lane: SupportLaneKey | null | undefined,
  focus: string | undefined,
): SupportDrilldownContext | undefined {
  const normalized = String(focus ?? '')
    .trim()
    .toUpperCase()

  if (!lane || !normalized) {
    return undefined
  }

  if (lane === 'sla' && normalized === 'SLA_OVERDUE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Ticket Overdue',
      detail: 'Lane ini difokuskan ke ticket dengan SLA yang sudah overdue agar operator bisa langsung mengamankan backlog kritis.',
      clearHref: '/support?lane=sla',
    }
  }

  if (lane === 'sla' && normalized === 'OVERDUE_RATE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Rasio Overdue',
      detail:
        'Lane ini dibuka dari KPI rasio overdue, sehingga operator membaca ticket overdue sebagai pembilang utama terhadap ticket open yang masih aktif.',
      clearHref: '/support?lane=sla',
    }
  }

  if (lane === 'tt' && normalized === 'OPEN_TICKETS') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Trouble Ticket Open',
      detail: 'Lane ini difokuskan ke ticket aktif yang masih membutuhkan progress, follow-up, atau eskalasi operasional.',
      clearHref: '/support?lane=tt',
    }
  }

  if (lane === 'tt' && normalized === 'MONTHLY_OPENED') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Ticket Periode Ini',
      detail: 'Lane ini dibuka dari KPI periode berjalan agar operator cepat membaca antrean trouble ticket terbaru pada bulan aktif.',
      clearHref: '/support?lane=tt',
    }
  }

  if (lane === 'tt' && normalized === 'READY_CLOSE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Ticket Siap Close',
      detail: 'Lane ini dipersempit ke ticket yang sudah punya progress valid dan siap masuk ke jalur close formal.',
      clearHref: '/support?lane=tt',
    }
  }

  if (lane === 'isolations' && normalized === 'ACTIVE_ISOLATIONS') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Isolir Aktif',
      detail: 'Lane ini difokuskan ke kasus isolir aktif yang perlu sinkron billing, restore, atau keputusan lanjut lapangan.',
      clearHref: '/support?lane=isolations',
    }
  }

  if (lane === 'dismantle' && normalized === 'RECENT_DISMANTLE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Dismantle Periode Ini',
      detail: 'Lane ini dibuka untuk meninjau kebutuhan persetujuan dan penutupan dismantle terbaru pada periode aktif.',
      clearHref: '/support?lane=dismantle',
    }
  }

  if (lane === 'dismantle' && normalized === 'OPEN_QUEUE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Antrean Dismantle Open',
      detail: 'Lane ini dipersempit ke kandidat terminate yang masih aktif di antrean dismantle dan belum masuk histori close.',
      clearHref: '/support?lane=dismantle',
    }
  }

  if (lane === 'dismantle' && normalized === 'FIELD_FOLLOW_UP') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Follow Up Lapangan',
      detail: 'Lane ini menyorot antrean dismantle open yang masih menunggu tindak lanjut lapangan sebelum bisa ditutup permanen.',
      clearHref: '/support?lane=dismantle',
    }
  }

  if (lane === 'dismantle' && (normalized === 'CLOSED_THIS_PERIOD' || normalized === 'MONTHLY_DISMANTLES')) {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Dismantle Close Periode Ini',
      detail: 'Lane ini dipersempit ke histori dismantle yang benar-benar ditutup pada periode aktif agar sinkron dengan KPI dashboard.',
      clearHref: '/support?lane=dismantle',
    }
  }

  return undefined
}

function resolveDomainDrilldown(domain: DomainKey, focus: string | undefined) {
  const normalized = String(focus ?? '')
    .trim()
    .toUpperCase()

  if (!normalized || domain === 'support') {
    return undefined
  }

  if (domain === 'sales') {
    if (normalized === 'ACTIVE_LEADS' || normalized === 'DIGITAL_LEADS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Lead Aktif',
        detail: 'Daftar sales dipersempit ke lead terbaru agar tim bisa langsung membaca funnel awal sesuai KPI yang dipilih.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'MONTHLY_ORDERS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Order Periode Ini',
        detail: 'Daftar sales dipersempit ke order yang benar-benar tercatat pada periode dashboard agar angka PSB mengikuti rule KPI yang sama.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'DIGITAL_ORDERS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Order Digital Periode Ini',
        detail: 'Daftar sales dipersempit ke order digital pada periode dashboard agar KPI digital tidak bercampur dengan source lain.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'ACTIVE_WORK_ORDERS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Work Order Aktif',
        detail: 'Daftar sales dipersempit ke work order aktif agar backlog lapangan tidak lagi diarahkan ke lane support yang salah.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'DIGITAL_SURVEYS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Survey Digital Periode Ini',
        detail: 'Daftar sales dipersempit ke survey digital pada periode dashboard agar basis query tetap 1:1 dengan KPI kartu.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'MONTHLY_ACTIVATIONS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Aktivasi Periode Ini',
        detail: 'Daftar sales dipersempit ke subscription aktivasi terbaru agar progres PSB yang sudah aktif cepat terlihat.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'ACTIVATION_RATE') {
      return {
        key: normalized,
        label: 'Fokus KPI: Rasio Aktivasi',
        detail:
          'Daftar sales menampilkan order periode aktif dan subscription yang sudah teraktivasi agar pembilang serta penyebut rasio bisa dibaca pada konteks yang sama.',
        clearHref: '/sales',
      }
    }
  }

  if (domain === 'billing') {
    if (normalized === 'OVERDUE_INVOICES') {
      return {
        key: normalized,
        label: 'Fokus KPI: Invoice Overdue',
        detail: 'Daftar billing dipersempit ke invoice overdue agar follow up, suspend, dan reconnect lebih cepat diprioritaskan.',
        clearHref: '/billing',
      }
    }
    if (normalized === 'BILLING_OVERDUE_AMOUNT') {
      return {
        key: normalized,
        label: 'Fokus KPI: Nominal Overdue',
        detail:
          'Daftar billing dipersempit ke invoice overdue dengan outstanding terbesar agar prioritas collection mengikuti nominal tagihan yang paling berat.',
        clearHref: '/billing',
      }
    }
    if (normalized === 'PARTIAL_INVOICES' || normalized === 'PARTIAL_PAYMENTS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Payment Parsial',
        detail: 'Daftar billing dipersempit ke invoice parsial agar tim bisa mengamankan pembayaran yang masih menggantung.',
        clearHref: '/billing',
      }
    }
    if (normalized === 'SUSPEND_CANDIDATES') {
      return {
        key: normalized,
        label: 'Fokus KPI: Suspend Candidates',
        detail: 'Daftar billing dipersempit ke antrean suspend-ready agar eksekusi suspend dan kontrol dampaknya lebih fokus.',
        clearHref: '/billing',
      }
    }
  }

  if (domain === 'hr') {
    if (normalized === 'TODAY_ATTENDANCE') {
      return {
        key: normalized,
        label: 'Fokus KPI: Absensi Hari Ini',
        detail: 'Daftar HR dipersempit ke rekap attendance hari ini agar monitoring disiplin kerja lebih cepat.',
        clearHref: '/hr',
      }
    }
    if (normalized === 'ATTENDANCE_RATE') {
      return {
        key: normalized,
        label: 'Fokus KPI: Rasio Kehadiran',
        detail:
          'Daftar HR menampilkan employee aktif dan attendance hari ini agar rasio kehadiran dibaca dari pembilang dan penyebut yang sama dengan kartu dashboard.',
        clearHref: '/hr',
      }
    }
    if (normalized === 'ACTIVE_LOANS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Pinjaman Aktif',
        detail: 'Daftar HR dipersempit ke loan terbaru agar kontrol pinjaman karyawan tidak tertinggal.',
        clearHref: '/hr',
      }
    }
    if (normalized === 'ACTIVE_EMPLOYEES') {
      return {
        key: normalized,
        label: 'Fokus KPI: Employee Aktif',
        detail: 'Daftar HR dipersempit ke employee terbaru agar master HR mudah diaudit sebelum payroll dan attendance diperluas.',
        clearHref: '/hr',
      }
    }
  }

  if (domain === 'inventory') {
    if (normalized === 'PENDING_REQUESTS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Request Pending',
        detail: 'Daftar inventory dipersempit ke request yang masih pending agar gudang bisa segera memproses antrean teknisi.',
        clearHref: '/inventory',
      }
    }
    if (normalized === 'MONTHLY_MOVEMENTS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Mutasi Bulan Ini',
        detail: 'Daftar inventory dipersempit ke stock movement terbaru agar audit keluar/masuk barang lebih fokus.',
        clearHref: '/inventory',
      }
    }
    if (normalized === 'ACTIVE_ITEMS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Item Aktif',
        detail: 'Daftar inventory dipersempit ke item master terbaru agar stok aktif dan minimum stock mudah dipantau.',
        clearHref: '/inventory',
      }
    }
  }

  return undefined
}

function resolvePositiveIntegerParam(value: string | string[] | undefined) {
  const resolved = resolveSearchParam(value)
  const parsed = Number(resolved)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function pickMetaField(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function parseIndonesianDateTime(raw: string): Date | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed === '-' || trimmed.toUpperCase() === 'CURRENT_TIMESTAMP') return null
  const normalized = trimmed.replace(',', '.').replace(/\s+/g, ' ')
  const fromIso = new Date(normalized)
  if (Number.isFinite(fromIso.getTime())) return fromIso
  const slashMatch = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/)
  if (slashMatch) {
    const [, d, m, y, hh, mm] = slashMatch
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh ?? 0), Number(mm ?? 0))
    if (Number.isFinite(date.getTime())) return date
  }
  const idMonths = [
    ['jan', 'januari'],
    ['feb', 'februari', 'pebruari'],
    ['mar', 'maret'],
    ['apr', 'april'],
    ['mei'],
    ['jun', 'juni'],
    ['jul', 'juli'],
    ['agu', 'agustus', 'aug'],
    ['sep', 'september', 'sept'],
    ['okt', 'oktober'],
    ['nov', 'november'],
    ['des', 'desember'],
  ]
  const lower = normalized.toLowerCase()
  for (let i = 0; i < idMonths.length; i++) {
    for (const alias of idMonths[i]) {
      if (lower.includes(alias)) {
        const digits = lower.match(/\d+/g)?.map((v) => Number(v)) ?? []
        const year = digits.find((v) => v >= 2000 && v <= 2100) ?? new Date().getFullYear()
        const day = digits.find((v) => v >= 1 && v <= 31 && v !== year) ?? 1
        const date = new Date(year, i, day)
        if (Number.isFinite(date.getTime())) return date
      }
    }
  }
  return null
}

function pickSupportRowDate(
  row: DomainReviewRow,
  kind:
    | 'ticket-opened'
    | 'ticket-closed'
    | 'ticket-progress'
    | 'ticket-sla-due'
    | 'isolation'
    | 'dismantle-transferred'
    | 'dismantle-closed',
): Date | null {
  const prefixMap: Record<typeof kind, string[]> = {
    'ticket-opened': ['Opened: '],
    'ticket-closed': ['Closed: '],
    'ticket-progress': ['Progress Updated: '],
    'ticket-sla-due': ['SLA Due: '],
    isolation: ['Isolasi: '],
    'dismantle-transferred': ['Transferred: '],
    'dismantle-closed': ['Closed: '],
  }
  const prefixes = prefixMap[kind]
  for (const prefix of prefixes) {
    const raw = pickMetaField(row.meta, prefix)
    if (raw) {
      const parsed = parseIndonesianDateTime(raw)
      if (parsed) return parsed
    }
  }
  if (row.filterTags?.length) {
    for (const tag of row.filterTags) {
      if (!tag.startsWith('PERIOD:')) continue
      const yyyymm = tag.slice('PERIOD:'.length)
      if (!yyyymm) continue
      const [y, m] = yyyymm.split('-').map((v) => Number(v))
      if (y && m) {
        const date = new Date(y, m - 1, 1)
        if (Number.isFinite(date.getTime())) return date
      }
    }
  }
  return null
}

function bucketKeyFor(date: Date, granularity: GranularityKey): { key: string; sort: number } {
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  if (granularity === 'DAILY') {
    const sort = y * 10000 + (m + 1) * 100 + d
    return { key: `${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}`, sort }
  }
  if (granularity === 'WEEKLY') {
    const start = new Date(y, 0, 1)
    const daysSince = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
    const week = Math.floor(daysSince / 7) + 1
    return { key: `W${week} ${y}`, sort: y * 1000 + week }
  }
  if (granularity === 'MONTHLY') {
    return { key: `${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][m]} ${y}`, sort: y * 100 + (m + 1) }
  }
  if (granularity === 'QUARTERLY') {
    const q = Math.floor(m / 3) + 1
    return { key: `Q${q} ${y}`, sort: y * 10 + q }
  }
  if (granularity === 'SEMESTER') {
    const s = m < 6 ? 1 : 2
    return { key: `S${s} ${y}`, sort: y * 10 + s }
  }
  return { key: `${y}`, sort: y }
}

function buildNocHistoricalSeries(
  rows: DomainReviewRow[],
  kind:
    | 'ticket-opened'
    | 'ticket-closed'
    | 'ticket-sla-due'
    | 'isolation'
    | 'dismantle-transferred'
    | 'dismantle-closed',
  granularity: GranularityKey,
  currentPeriodLabel: string,
  previousPeriodLabel: string,
): {
  series: HistoricalSeriesDatum[]
  currentLabel: string
  previousLabel: string
} {
  const dated: Array<{ date: Date; row: DomainReviewRow }> = []
  for (const row of rows) {
    const date = pickSupportRowDate(row, kind)
    if (date) dated.push({ date, row })
  }
  dated.sort((a, b) => a.date.getTime() - b.date.getTime())
  if (dated.length === 0) {
    return { series: [], currentLabel: currentPeriodLabel, previousLabel: previousPeriodLabel }
  }

  const latest = dated[dated.length - 1].date
  const earliest = dated[0].date

  const spanMonths = Math.max(
    1,
    (latest.getFullYear() - earliest.getFullYear()) * 12 + (latest.getMonth() - earliest.getMonth()) + 1,
  )

  function startOfGranularity(date: Date): Date {
    const y = date.getFullYear()
    const m = date.getMonth()
    const d = date.getDate()
    if (granularity === 'DAILY') return new Date(y, m, d)
    if (granularity === 'WEEKLY') {
      const day = (date.getDay() + 6) % 7
      return new Date(y, m, d - day)
    }
    if (granularity === 'MONTHLY') return new Date(y, m, 1)
    if (granularity === 'QUARTERLY') return new Date(y, Math.floor(m / 3) * 3, 1)
    if (granularity === 'SEMESTER') return new Date(y, m < 6 ? 0 : 6, 1)
    return new Date(y, 0, 1)
  }

  function addGranular(date: Date, n: number): Date {
    const y = date.getFullYear()
    const m = date.getMonth()
    if (granularity === 'DAILY') return new Date(y, m, date.getDate() + n)
    if (granularity === 'WEEKLY') return new Date(y, m, date.getDate() + 7 * n)
    if (granularity === 'MONTHLY') return new Date(y, m + n, 1)
    if (granularity === 'QUARTERLY') return new Date(y, m + 3 * n, 1)
    if (granularity === 'SEMESTER') return new Date(y, m + 6 * n, 1)
    return new Date(y + n, 0, 1)
  }

  const bucketsCount = Math.min(
    36,
    Math.max(
      4,
      granularity === 'DAILY'
        ? Math.min(21, spanMonths * 6)
        : granularity === 'WEEKLY'
          ? Math.min(12, spanMonths * 2)
          : granularity === 'MONTHLY'
            ? Math.min(12, spanMonths)
            : granularity === 'QUARTERLY'
              ? 6
              : 4,
    ),
  )

  const currentStart = addGranular(startOfGranularity(latest), -(bucketsCount - 1))
  const previousStart = addGranular(currentStart, -bucketsCount)
  const currentEnd = addGranular(startOfGranularity(latest), 1)
  const previousEnd = currentStart

  const currentLabel = `${bucketKeyFor(new Date(currentStart.getTime() + 1), granularity).key} s/d ${bucketKeyFor(latest, granularity).key}`
  const previousLabel = `${bucketKeyFor(new Date(previousStart.getTime() + 1), granularity).key} s/d ${bucketKeyFor(new Date(currentStart.getTime() - 1), granularity).key}`

  const currentBuckets = new Map<string, number>()
  const previousBuckets = new Map<string, number>()
  const order: string[] = []
  for (let i = 0; i < bucketsCount; i++) {
    const start = addGranular(currentStart, i)
    const b = bucketKeyFor(start, granularity)
    if (!currentBuckets.has(b.key)) {
      currentBuckets.set(b.key, 0)
      order.push(b.key)
    }
  }
  for (const { date } of dated) {
    if (date.getTime() >= currentStart.getTime() && date.getTime() < currentEnd.getTime()) {
      const b = bucketKeyFor(date, granularity)
      currentBuckets.set(b.key, (currentBuckets.get(b.key) ?? 0) + 1)
    } else if (date.getTime() >= previousStart.getTime() && date.getTime() < previousEnd.getTime()) {
      const b = bucketKeyFor(date, granularity)
      previousBuckets.set(b.key, (previousBuckets.get(b.key) ?? 0) + 1)
    }
  }

  const series: HistoricalSeriesDatum[] = order.map((key, idx) => ({
    bucket: key,
    bucketMeta: key,
    current: currentBuckets.get(key) ?? 0,
    previous: previousBuckets.get(order[idx % order.length] ?? '') ?? previousBuckets.get(key) ?? 0,
  }))

  return { series, currentLabel, previousLabel }
}

function buildBarFromKeyValue(
  entries: Array<{ label: string; count: number }>,
  toneResolver?: (label: string) => SimpleBarDatum['tone'],
): SimpleBarDatum[] {
  return entries.map((entry) => ({
    label: entry.label,
    value: entry.count,
    tone: toneResolver ? toneResolver(entry.label) : 'ink',
  }))
}

function resolveGranularity(raw: string | undefined): GranularityKey {
  const upper = String(raw ?? '').trim().toUpperCase()
  if (GRANULARITY_OPTIONS.some((opt) => opt.key === upper)) return upper as GranularityKey
  return 'MONTHLY'
}

function toneForTicketStatus(label: string): SimpleBarDatum['tone'] {
  const s = label.trim().toUpperCase()
  if (s.includes('READY') || s.includes('CLOSE') || s.includes('SELESAI')) return 'emerald'
  if (s.includes('CRITICAL') || s.includes('KRITIS') || s.includes('OVERDUE')) return 'rose'
  if (s.includes('PLANNED') || s.includes('FOLLOW UP') || s.includes('FOLLOWUP') || s.includes('JADWAL')) return 'amber'
  if (s.includes('WAITING') || s.includes('PROGRESS') || s.includes('DIPROSES')) return 'sky'
  return 'slate'
}

function toneForIsolationPipeline(label: string): SimpleBarDatum['tone'] {
  const s = label.trim().toUpperCase()
  if (s.includes('CLOSED') || s.includes('SELESAI') || s.includes('SUDAH')) return 'emerald'
  if (s.includes('OPEN') || s.includes('AKTIF')) return 'rose'
  if (s.includes('QUEUE') || s.includes('ANTRIAN') || s.includes('DIANTRE')) return 'amber'
  return 'slate'
}

function toneForTicketType(label: string): SimpleBarDatum['tone'] {
  const s = label.trim().toUpperCase()
  if (s.includes('TROUBLE') || s.includes('TT')) return 'sky'
  if (s.includes('PSB')) return 'emerald'
  if (s.includes('DISMANTLE') || s.includes('PUTUS')) return 'rose'
  if (s.includes('JALUR') || s.includes('MIGRASI')) return 'violet'
  return 'ink'
}

function findSupportSection(sections: DomainReviewSection[] | undefined, keyword: string) {
  if (!sections || sections.length === 0) return null
  return sections.find((section) => section.title.toUpperCase().includes(keyword.toUpperCase())) ?? null
}

function flattenSections(sections: DomainReviewSection[] | undefined): DomainReviewRow[] {
  if (!sections) return []
  return sections.flatMap((s) => s.rows ?? [])
}

function resolveTicketType(row: DomainReviewRow): string {
  const primary = (row.primary ?? '').trim().toUpperCase()
  if (primary) return primary
  const title = (row.primary ?? '').toUpperCase()
  if (title.includes('DISMANTLE') || title.includes('PUTUS') || title.includes('TERMINATE')) return 'DISMANTLE'
  if (title.includes('PSB') || title.includes('AKTIVASI')) return 'PSB'
  if (title.includes('JALUR') || title.includes('MIGRASI')) return 'JALUR'
  return 'TROUBLESHOOTS'
}

function ticketRowIsOverdue(row: DomainReviewRow): boolean {
  const sla = pickSupportRowDate(row, 'ticket-sla-due')
  if (!sla) {
    const status = (row.status ?? '').toUpperCase()
    return status.includes('OVERDUE') || status.includes('KRITIS') || status.includes('CRITICAL')
  }
  return sla.getTime() < Date.now()
}

function buildNocKpiStatusEntries(sections: DomainReviewSection[]): Array<{ label: string; count: number }> {
  const readyClose = findSupportSection(sections, 'Ready Close')?.rows.length ?? 0
  const critical = findSupportSection(sections, 'Critical Attention')?.rows.length ?? 0
  const planned = findSupportSection(sections, 'Planned Follow Up')?.rows.length ?? 0
  const waiting = findSupportSection(sections, 'Waiting Progress')?.rows.length ?? 0
  return [
    { label: 'Siap Close (Ready Close)', count: readyClose },
    { label: 'Perhatian Kritis (Critical)', count: critical },
    { label: 'Follow Up Terjadwal (Planned)', count: planned },
    { label: 'Menunggu Progress (Waiting)', count: waiting },
  ]
}

function buildNocKpiIsolationEntries(sections: DomainReviewSection[]): Array<{ label: string; count: number }> {
  const isolations = findSupportSection(sections, 'Isolir Aktif')?.rows.length ?? 0
  const dismantleOpen = findSupportSection(sections, 'Antrean Dismantle Open')?.rows.length ?? 0
  const dismantleClosed = findSupportSection(sections, 'Histori Dismantle')?.rows.length ?? 0
  return [
    { label: 'Isolasi Aktif (Open)', count: isolations },
    { label: 'Dalam Antrean Dismantle', count: dismantleOpen },
    { label: 'Dismantle Sudah Selesai (Closed)', count: dismantleClosed },
  ]
}

function buildNocKpiTicketTypeEntries(rows: DomainReviewRow[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = resolveTicketType(row)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  const preferredOrder = ['TROUBLESHOOTS', 'PSB', 'DISMANTLE', 'JALUR']
  const entries = Array.from(map.entries()).map(([label, count]) => ({ label, count }))
  return entries.sort((a, b) => {
    const ai = preferredOrder.indexOf(a.label)
    const bi = preferredOrder.indexOf(b.label)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return b.count - a.count
  })
}

function buildNocKpiOverduePerType(rows: DomainReviewRow[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>()
  for (const row of rows) {
    if (!ticketRowIsOverdue(row)) continue
    const key = resolveTicketType(row)
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  const preferredOrder = ['TROUBLESHOOTS', 'PSB', 'DISMANTLE', 'JALUR']
  const entries = Array.from(map.entries()).map(([label, count]) => ({ label, count }))
  if (entries.length === 0) {
    return preferredOrder.map((label) => ({ label, count: 0 }))
  }
  return entries.sort((a, b) => {
    const ai = preferredOrder.indexOf(a.label)
    const bi = preferredOrder.indexOf(b.label)
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return b.count - a.count
  })
}

type NocShortcutCard = {
  title: string
  description: string
  href: string
  badge: string
  counter?: number
}

function buildNocHeroShortcuts(sections: DomainReviewSection[], role: AppRole): NocShortcutCard[] {
  const ttOpen =
    (findSupportSection(sections, 'Ready Close')?.rows.length ?? 0) +
    (findSupportSection(sections, 'Critical Attention')?.rows.length ?? 0) +
    (findSupportSection(sections, 'Planned Follow Up')?.rows.length ?? 0) +
    (findSupportSection(sections, 'Waiting Progress')?.rows.length ?? 0)
  const slaOverdue = findSupportSection(sections, 'SLA Overdue')?.rows.length ?? 0
  const isolations = findSupportSection(sections, 'Isolir Aktif')?.rows.length ?? 0
  const dismantle = findSupportSection(sections, 'Antrean Dismantle Open')?.rows.length ?? 0

  const shortcuts: NocShortcutCard[] = [
    {
      title: 'Lane TT (Trouble Ticket)',
      description: 'Masuk ke workspace penanganan ticket open, ready close, critical, dan waiting progress.',
      href: buildSupportLaneHref('tt', { focus: 'OPEN_TICKETS' }),
      badge: 'Ticket',
      counter: ttOpen,
    },
    {
      title: 'Lane SLA Control',
      description: 'Pantau ticket SLA aktif, overdue, dan kontrol rasio SLA sebelum melewati batas.',
      href: buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' }),
      badge: 'SLA',
      counter: slaOverdue,
    },
    {
      title: 'Lane Isolations Aktif',
      description: 'Sinkron isolasi aktif, restore, dan keputusan billing untuk kasus terminate sementara.',
      href: buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' }),
      badge: 'Isolir',
      counter: isolations,
    },
    {
      title: 'Lane Dismantle (Open & Close)',
      description: 'Antrean dismantle open, transfer ke lapangan, dan histori dismantle close periode ini.',
      href: buildSupportLaneHref('dismantle', { focus: 'OPEN_QUEUE' }),
      badge: 'Dismantle',
      counter: dismantle,
    },
    {
      title: 'Tracking NOC Queue',
      description: 'NOC Queue expandable table: gabungan ticket, WO, assignment, progress log dalam satu tracking.',
      href: '/dashboard/tracking/noc-queue',
      badge: 'Tracking',
    },
    {
      title: 'Customer & CS Admin',
      description: 'Referensi data pelanggan, langganan, dan dashboard CS Admin untuk koordinasi lintas divisi.',
      href: '/customers/cs-admin',
      badge: 'Customer',
    },
  ]

  if (role === 'SUPER_ADMIN' || role === 'OWNER' || role === 'ADMIN') {
    shortcuts.splice(
      shortcuts.length - 1,
      0,
      {
        title: 'Dashboard Global Cross-Divisi',
        description: 'Dashboard lintas seluruh divisi untuk ringkasan operasional perusahaan (hanya admin & pemilik).',
        href: '/dashboard',
        badge: 'Global',
      },
    )
  }

  return shortcuts
}

function buildNocShortcutCards(role: AppRole): NocShortcutCard[] {
  const cards: NocShortcutCard[] = [
    {
      title: 'Lane TT (Trouble Ticket)',
      description: 'Workspace utama penanganan ticket: create, progress, escalate, assign, close.',
      href: '/support/tt',
      badge: 'Lane Kerja',
    },
    {
      title: 'Lane SLA Control',
      description: 'Pantau SLA aktif, overdue, dan rasio kinerja NOC terhadap komitmen SLA.',
      href: buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' }),
      badge: 'Lane Kerja',
    },
    {
      title: 'Lane Isolations',
      description: 'Kelola isolasi aktif, restore, dan keputusan terminate vs recovery layanan.',
      href: buildSupportLaneHref('isolations', { focus: 'ACTIVE_ISOLATIONS' }),
      badge: 'Lane Kerja',
    },
    {
      title: 'Lane Dismantle',
      description: 'Dismantle open queue, transfer ke lapangan, histori close periode ini.',
      href: buildSupportLaneHref('dismantle', { focus: 'OPEN_QUEUE' }),
      badge: 'Lane Kerja',
    },
    {
      title: 'Tracking NOC Queue',
      description: 'Expandable table NOC Queue 1 pane untuk semua ticket, WO, dan progress.',
      href: '/dashboard/tracking/noc-queue',
      badge: 'Tracking',
    },
    {
      title: 'Tracking Work Order',
      description: 'Tracking expandable work order untuk field execution dan assignment teknisi.',
      href: '/dashboard/tracking/work-orders',
      badge: 'Tracking',
    },
    {
      title: 'Tracking Trouble Ticket',
      description: 'Halaman tracking expandable untuk semua ticket lintas cabang.',
      href: '/dashboard/tracking/trouble-tickets',
      badge: 'Tracking',
    },
    {
      title: 'CS Admin Referensi',
      description: 'Data customer & subscription referensi untuk koordinasi CS dan NOC.',
      href: '/customers/cs-admin',
      badge: 'Referensi',
    },
  ]

  if (role === 'SUPER_ADMIN' || role === 'OWNER' || role === 'ADMIN') {
    cards.push({
      title: 'Dashboard Global Cross-Divisi',
      description: 'Ringkasan lintas divisi untuk level manajemen dan pemilik perusahaan.',
      href: '/dashboard',
      badge: 'Global',
    })
  }

  return cards
}

export function generateStaticParams() {
  return enabledDomains.map((domain) => ({ domain }))
}

export default async function DomainPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>
  searchParams: Promise<{
    lane?: string | string[]
    month?: string | string[]
    year?: string | string[]
    ticket?: string | string[]
    isolation?: string | string[]
    type?: string | string[]
    focus?: string | string[]
    lead?: string | string[]
    order?: string | string[]
    invoice?: string | string[]
    service?: string | string[]
    itemCode?: string | string[]
    request?: string | string[]
    employee?: string | string[]
    attendance?: string | string[]
    loan?: string | string[]
    payroll?: string | string[]
    inventoryView?: string | string[]
    inventoryAction?: string | string[]
    troubleTicketId?: string | string[]
    subscriptionId?: string | string[]
    jobCategory?: string | string[]
    notes?: string | string[]
    nocGranularity?: string | string[]
  }>
}) {
  const session = await requireSession()

  const { domain } = await params
  const resolvedSearchParams = await searchParams
  if (!canAccessPath(session.role, `/${domain}`)) {
    redirect('/dashboard')
  }

  const payload = await getDomainPageData(domain as DomainKey, session, {
    supportLane: normalizeSupportLane(resolvedSearchParams.lane),
    focus: resolveSearchParam(resolvedSearchParams.focus),
    month: resolvePositiveIntegerParam(resolvedSearchParams.month),
    year: resolvePositiveIntegerParam(resolvedSearchParams.year),
  })

  if (!payload) {
    notFound()
  }

  const domainPrefill: DomainFormPrefill = {
    lead: resolveSearchParam(resolvedSearchParams.lead),
    order: resolveSearchParam(resolvedSearchParams.order),
    invoice: resolveSearchParam(resolvedSearchParams.invoice),
    service: resolveSearchParam(resolvedSearchParams.service),
    itemCode: resolveSearchParam(resolvedSearchParams.itemCode),
    request: resolveSearchParam(resolvedSearchParams.request),
    employee: resolveSearchParam(resolvedSearchParams.employee),
    attendance: resolveSearchParam(resolvedSearchParams.attendance),
    loan: resolveSearchParam(resolvedSearchParams.loan),
    payroll: resolveSearchParam(resolvedSearchParams.payroll),
    troubleTicketId: resolveSearchParam(resolvedSearchParams.troubleTicketId),
    subscriptionId: resolveSearchParam(resolvedSearchParams.subscriptionId),
    jobCategory: resolveSearchParam(resolvedSearchParams.jobCategory),
    notes: resolveSearchParam(resolvedSearchParams.notes),
  }
  const resolvedDomainDrilldown = resolveDomainDrilldown(domain as DomainKey, resolveSearchParam(resolvedSearchParams.focus))
  const salesFocus = resolveSearchParam(resolvedSearchParams.focus)
  const salesLead = resolveSearchParam(resolvedSearchParams.lead)
  const salesOrder = resolveSearchParam(resolvedSearchParams.order)

  if ((domain as DomainKey) === 'support') {
    const lane = normalizeSupportLane(resolvedSearchParams.lane)
    const focus = resolveSearchParam(resolvedSearchParams.focus)
    const drilldown = resolveSupportDrilldown(lane, focus)
    if (!lane && !drilldown) {
      const granularity = resolveGranularity(resolveSearchParam(resolvedSearchParams.nocGranularity))
      const supportSections: DomainReviewSection[] = payload.content?.reviewSections ?? []
      const allTicketRows = flattenSections(
        supportSections.filter((s) =>
          ['Ready Close', 'Critical Attention', 'Planned Follow Up', 'Waiting Progress', 'SLA Open Aktif', 'SLA Overdue'].some((k) =>
            s.title.toUpperCase().includes(k.toUpperCase()),
          ),
        ),
      )
      const allIsolationRows = flattenSections(
        supportSections.filter((s) => s.title.toUpperCase().includes('ISOLIR')),
      )
      const dismantleOpenRows = flattenSections(
        supportSections.filter((s) => s.title.toUpperCase().includes('ANTREAN DISMANTLE OPEN')),
      )
      const dismantleClosedRows = flattenSections(
        supportSections.filter((s) => s.title.toUpperCase().includes('HISTORI DISMANTLE')),
      )
      const slaOverdueRows = flattenSections(
        supportSections.filter((s) => s.title.toUpperCase().includes('SLA OVERDUE')),
      )
      const combinedCloseRows = [...allTicketRows, ...dismantleClosedRows]

      const historicalOpened = buildNocHistoricalSeries(
        allTicketRows,
        'ticket-opened',
        granularity,
        'Periode saat ini',
        'Periode sebelumnya',
      )
      const historicalClosedCombined = buildNocHistoricalSeries(
        combinedCloseRows,
        'ticket-closed',
        granularity,
        'Periode saat ini',
        'Periode sebelumnya',
      )
      const historicalOverdue = buildNocHistoricalSeries(
        slaOverdueRows.length > 0 ? slaOverdueRows : allTicketRows.filter(ticketRowIsOverdue),
        'ticket-sla-due',
        granularity,
        'Periode saat ini',
        'Periode sebelumnya',
      )

      const chartStatusTicket = buildBarFromKeyValue(buildNocKpiStatusEntries(supportSections), toneForTicketStatus)
      const chartIsolationPipeline = buildBarFromKeyValue(
        buildNocKpiIsolationEntries(supportSections),
        toneForIsolationPipeline,
      )
      const chartTicketType = buildBarFromKeyValue(
        buildNocKpiTicketTypeEntries(allTicketRows),
        toneForTicketType,
      )
      const chartOverduePerType = buildBarFromKeyValue(
        buildNocKpiOverduePerType(allTicketRows),
        toneForTicketType,
      )

      const ttOpenCount =
        (findSupportSection(supportSections, 'Ready Close')?.rows.length ?? 0) +
        (findSupportSection(supportSections, 'Critical Attention')?.rows.length ?? 0) +
        (findSupportSection(supportSections, 'Planned Follow Up')?.rows.length ?? 0) +
        (findSupportSection(supportSections, 'Waiting Progress')?.rows.length ?? 0)
      const slaOverdueCount = findSupportSection(supportSections, 'SLA Overdue')?.rows.length ?? 0
      const isolationCount = findSupportSection(supportSections, 'Isolir Aktif')?.rows.length ?? 0
      const dismantleOpenCount = findSupportSection(supportSections, 'Antrean Dismantle Open')?.rows.length ?? 0
      const followUpCount = findSupportSection(supportSections, 'Planned Follow Up')?.rows.length ?? 0
      const criticalCount = findSupportSection(supportSections, 'Critical Attention')?.rows.length ?? 0

      const overdueRatio = ttOpenCount > 0 ? Math.round((slaOverdueCount / ttOpenCount) * 100) : 0
      const heroShortcuts = buildNocHeroShortcuts(supportSections, session.role)
      const shortcutCards = buildNocShortcutCards(session.role)

      const preserveParams: Record<string, string> = {}
      if (resolvedSearchParams.month) preserveParams.month = String(resolvedSearchParams.month)
      if (resolvedSearchParams.year) preserveParams.year = String(resolvedSearchParams.year)

      const charts: NocDashboardChartsProps = {
        granularity,
        granularityBasePath: '/support',
        granularityPreserveParams: preserveParams,
        historical: {
          opened: {
            title: 'Historis Ticket Dibuka (saat ini vs sebelumnya)',
            subtitle:
              'Jumlah ticket (trouble, PSB, jalur, dismantle) yang di-OPEN per bucket periode. Bandingkan dengan periode sebelumnya untuk menilai lonjakan atau penurunan beban kerja NOC.',
            series: historicalOpened.series,
            currentPeriodLabel: historicalOpened.currentLabel,
            previousPeriodLabel: historicalOpened.previousLabel,
            unitLabel: 'ticket',
            emptyNote:
              'Belum ada ticket yang dibuka dengan tanggal tercatat yang bisa dihistorisasi. Data muncul setelah openedAt tercatat di review DB.',
            onEmptyPreviousHint:
              'Sistem membangun perbandingan 2 periode otomatis. Review DB default menampilkan 5 rows ticket terbaru; agar terbentuk bucket historis lebih banyak, buat open ticket pada beberapa tanggal berbeda atau buka halaman /support/tt untuk data yang lebih luas.',
          },
          closedCombined: {
            title: 'Historis Penyelesaian (Ticket Closed + Dismantle Closed) — saat ini vs sebelumnya',
            subtitle:
              'Jumlah gabungan: ticket yang sudah CLOSE dan dismantle yang masuk histori CLOSE per bucket periode. Membantu menilai progres output penyelesaian NOC pada periode aktif.',
            series: historicalClosedCombined.series,
            currentPeriodLabel: historicalClosedCombined.currentLabel,
            previousPeriodLabel: historicalClosedCombined.previousLabel,
            unitLabel: 'penyelesaian',
            emptyNote:
              'Belum ada penyelesaian ticket/dismantle dengan tanggal close yang tercatat. Data muncul setelah close form disubmit dan masuk review DB.',
            onEmptyPreviousHint:
              'Sistem membangun perbandingan 2 periode otomatis. Review DB default menampilkan 5 rows terbaru; agar terbentuk bucket historis lebih banyak, tutup beberapa ticket dan dismantle pada tanggal berbeda.',
          },
          overdue: {
            title: 'Historis SLA Overdue (saat ini vs sebelumnya)',
            subtitle:
              'Jumlah ticket SLA Overdue per bucket periode saat ini vs sebelumnya. Tren naik = backlog kritis meningkat; tren turun = progres pengurangan backlog berjalan.',
            series: historicalOverdue.series,
            currentPeriodLabel: historicalOverdue.currentLabel,
            previousPeriodLabel: historicalOverdue.previousLabel,
            unitLabel: 'overdue',
            emptyNote:
              'Belum ada overdue ticket dengan tanggal SLA Due yang tercatat. Pastikan field slaDueAt terisi di ticket dan status SLA Overdue sesuai review DB.',
            onEmptyPreviousHint:
              'Review DB default menampilkan 5 rows SLA Overdue terbaru. Untuk analisa historis lintas beberapa kuartal, buka halaman /support/sla?focus=SLA_OVERDUE.',
          },
        },
        kpi: {
          ticketStatus: {
            title: 'Status Backlog Trouble Ticket',
            subtitle:
              'Distribusi ticket aktif per bucket status: Ready Close, Critical, Planned Follow Up, Waiting Progress. Fokus ke Critical dan Waiting yang paling lama idle.',
            unitLabel: 'ticket',
            data: chartStatusTicket,
            emptyNote: 'Belum ada ticket aktif di review DB support sections. Tabel akan terisi setelah ticket pertama dibuat.',
          },
          isolationPipeline: {
            title: 'Pipeline Isolasi → Dismantle → Close',
            subtitle:
              'Tiga tahapan pipeline: Isolasi Aktif (masuk terminasi) → dalam Antrean Dismantle Open → masuk Histori Dismantle (selesai).',
            unitLabel: 'kasus',
            data: chartIsolationPipeline,
            emptyNote:
              'Belum ada pipeline isolasi/dismantle tercatat. Tabel terisi setelah isolasi aktif pertama, dismantle open, dan histori close tercatat.',
          },
          ticketTypeDistribution: {
            title: 'Distribusi Ticket per Tipe (Troubleshoots / PSB / Dismantle / Jalur)',
            subtitle:
              'Komposisi beban kerja per jenis ticket: Troubleshoots (gangguan), PSB (aktivasi baru), Dismantle (terminasi), Jalur/Migrasi (perpindahan).',
            unitLabel: 'ticket',
            data: chartTicketType,
            emptyNote: 'Belum ada distribusi ticket per tipe yang tercatat. Data diambil dari primary field atau title ticket review DB.',
          },
          overduePerType: {
            title: 'Jumlah SLA Overdue per Tipe Ticket',
            subtitle:
              'Membandingkan tipe ticket mana yang paling banyak menembus SLA. Seringkali Troubleshoots & Dismantle mendominasi jika backlog menumpuk.',
            unitLabel: 'overdue',
            data: chartOverduePerType,
            emptyNote:
              'Belum ada overdue per tipe ticket yang tercatat. Jika semua 0, artinya SLA masih terjaga (bagus!). Data muncul setelah ada ticket masuk status overdue.',
          },
        },
      }

      return (
        <div id="noc-dashboard-root" className="content-fade-in space-y-4">
          <section id="noc-overview-hero" className="scroll-mt-24 panel p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="section-title">Divisi Operasional Jaringan</p>
                <h1 className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
                  NOC &amp; Troubleshoots — Dashboard Divisi
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-mute">
                  Dashboard ini memadatkan semua backlog, KPI, dan historis kinerja divisi NOC dalam SATU halaman (sama persis pola dengan
                  Dashboard Inventory). Gunakan visualisasi historis untuk membandingkan progres periode SEKARANG dengan periode SEBELUMNYA,
                  sehingga bisa menjawab: &quot;apakah backlog NOC semakin membaik atau memburuk?&quot;
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' })}
                  className="inline-flex rounded-full border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-muteStrong transition hover:bg-surface hover:text-inkStrong"
                >
                  Cek SLA Overdue
                </Link>
                <Link
                  href={buildSupportLaneHref('tt', { focus: 'OPEN_TICKETS' })}
                  className="inline-flex rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold text-accentInk transition hover:bg-accent/90 focus-visible:shadow-focus"
                >
                  Masuk Lane TT
                </Link>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-line bg-surfaceMuted/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">
                Lompat Cepat Dashboard NOC
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <a
                  href="#noc-overview-summary"
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muteStrong transition hover:bg-surfaceElevated hover:text-slate-950 focus-visible:shadow-focus"
                >
                  1. Ringkasan (3 kartu)
                </a>
                <a
                  href="#noc-overview-focus"
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muteStrong transition hover:bg-surfaceElevated hover:text-slate-950 focus-visible:shadow-focus"
                >
                  2. Fokus Backlog Kritis
                </a>
                <a
                  href="#noc-overview-historical"
                  className="rounded-full border border-accent bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20 hover:text-slate-950 focus-visible:shadow-focus"
                >
                  3. Historis ⭐ (Compare Periode)
                </a>
                <a
                  href="#noc-overview-kpi"
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muteStrong transition hover:bg-surfaceElevated hover:text-slate-950 focus-visible:shadow-focus"
                >
                  4. Kinerja Saat Ini (Snapshot)
                </a>
                <a
                  href="#noc-overview-shortcuts"
                  className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-muteStrong transition hover:bg-surfaceElevated hover:text-slate-950 focus-visible:shadow-focus"
                >
                  5. Shortcut Lane Kerja
                </a>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-mute">
                Tip: Review DB default menampilkan 5 rows terbaru per section. Untuk visualisasi historis dengan periode bucket yang lebih
                banyak, gunakan halaman masing-masing lane (
                <Link className="text-accent underline underline-offset-2" href={buildSupportLaneHref('tt')}>
                  TT
                </Link>
                ,{' '}
                <Link className="text-accent underline underline-offset-2" href={buildSupportLaneHref('sla')}>
                  SLA
                </Link>
                ,{' '}
                <Link className="text-accent underline underline-offset-2" href={buildSupportLaneHref('isolations')}>
                  Isolations
                </Link>
                ,{' '}
                <Link className="text-accent underline underline-offset-2" href={buildSupportLaneHref('dismantle')}>
                  Dismantle
                </Link>
                ) yang memuat data lebih panjang.
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {heroShortcuts.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group relative block overflow-hidden rounded-3xl border border-line bg-surfaceElevated p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-lineStrong hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="badge border-line bg-surfaceMuted text-muteStrong">{item.badge}</span>
                    <div className="flex items-center gap-1.5">
                      {typeof item.counter === 'number' && item.counter >= 0 ? (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-[0.08em] ${
                            item.counter > 0
                              ? 'border-rose-200 bg-rose-50 text-rose-800'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {item.counter} backlog
                        </span>
                      ) : null}
                      <span className="rounded-full border border-line bg-surfaceSoft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute transition group-hover:border-lineStrong">
                        buka
                      </span>
                    </div>
                  </div>
                  <h3 className="mt-4 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-inkStrong">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-mute">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>

          <section id="noc-overview-summary" className="scroll-mt-24 grid gap-4 md:grid-cols-3">
            <article className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
                Total Trouble Ticket Aktif &amp; Rasio Overdue
              </p>
              <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
                {ttOpenCount.toLocaleString('id-ID')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`badge ${overdueRatio >= 15 ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                  Rasio Overdue {overdueRatio}% ({slaOverdueCount})
                </span>
                <span className="badge border-line bg-surfaceMuted text-muteStrong">
                  Critical {criticalCount}
                </span>
              </div>
            </article>
            <article className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
                Isolasi Aktif + Dismantle Open Queue
              </p>
              <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
                {(isolationCount + dismantleOpenCount).toLocaleString('id-ID')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="badge border-rose-200 bg-rose-50 text-rose-800">
                  Isolasi Aktif {isolationCount}
                </span>
                <span className="badge border-amber-200 bg-amber-50 text-amber-800">
                  Dismantle Open {dismantleOpenCount}
                </span>
              </div>
            </article>
            <article className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
                Follow Up Jadwal + Escalation Pending
              </p>
              <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
                {(followUpCount + criticalCount).toLocaleString('id-ID')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="badge border-amber-200 bg-amber-50 text-amber-800">
                  Follow Up {followUpCount}
                </span>
                <span className="badge border-rose-200 bg-rose-50 text-rose-800">
                  Escalation {criticalCount}
                </span>
              </div>
            </article>
          </section>

          <section id="noc-overview-focus" className="scroll-mt-24 panel p-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
              <div>
                <p className="section-title">Fokus Backlog Kritis NOC</p>
                <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-inkStrong">
                  Top 5 SLA Overdue vs Top 5 Dismantle Age &gt; 3 hari
                </h2>
                <p className="mt-1 text-sm leading-6 text-mute">
                  Panel ini memadatkan 2 backlog TERKRITIS divisi NOC: (1) ticket yang sudah melewati SLA Due (prioritas tertinggi agar tidak
                  menambah rasio overdue), dan (2) dismantle yang sudah menginap lebih dari 3 hari di antrean (tanda bottleneck lapangan atau
                  koordinasi billing belum sinkron).
                </p>
              </div>
              <span className="badge border-line bg-surfaceMuted text-muteStrong self-start">
                {slaOverdueCount + dismantleOpenCount > 10 ? '10+ kritis' : `${slaOverdueCount + dismantleOpenCount} item kritis`}
              </span>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-surfaceMuted/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">
                      Kolom Kiri
                    </p>
                    <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-inkStrong">
                      SLA Overdue — Prioritas Tertinggi
                    </h3>
                  </div>
                  <Link
                    href={buildSupportLaneHref('sla', { focus: 'SLA_OVERDUE' })}
                    className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/20"
                  >
                    Lihat semua ({slaOverdueCount}) →
                  </Link>
                </div>
                <ul className="mt-3 space-y-2">
                  {slaOverdueRows.slice(0, 5).length > 0 ? (
                    slaOverdueRows.slice(0, 5).map((row, idx) => (
                      <li
                        key={`sla-${row.primary}-${idx}`}
                        className="rounded-2xl border border-line bg-surfaceElevated p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-inkStrong">{row.primary}</p>
                            <p className="mt-1 text-xs text-mute">{row.secondary}</p>
                          </div>
                          <span className="badge border-rose-200 bg-rose-50 text-rose-800 whitespace-nowrap">
                            {row.status}
                          </span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="rounded-2xl border border-dashed border-line bg-surface/40 p-6 text-center text-xs leading-5 text-mute">
                      🎉 Bagus! Saat ini TIDAK ADA ticket yang masuk SLA Overdue. Pertahankan dengan
                      follow-up aktif untuk ticket Waiting Progress &amp; Planned Follow Up.
                    </li>
                  )}
                </ul>
              </div>
              <div className="rounded-2xl border border-line bg-surfaceMuted/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute">
                      Kolom Kanan
                    </p>
                    <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-inkStrong">
                      Dismantle Age &gt; 3 Hari (bottleneck lapangan)
                    </h3>
                  </div>
                  <Link
                    href={buildSupportLaneHref('dismantle', { focus: 'OPEN_QUEUE' })}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                  >
                    Lihat semua ({dismantleOpenCount}) →
                  </Link>
                </div>
                <ul className="mt-3 space-y-2">
                  {dismantleOpenRows.slice(0, 5).length > 0 ? (
                    dismantleOpenRows.slice(0, 5).map((row, idx) => {
                      const transferred = pickSupportRowDate(row, 'dismantle-transferred')
                      const ageDays = transferred
                        ? Math.max(0, Math.floor((Date.now() - transferred.getTime()) / (24 * 60 * 60 * 1000)))
                        : 0
                      const tone =
                        ageDays > 7
                          ? 'border-rose-200 bg-rose-50 text-rose-800'
                          : ageDays > 3
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-sky-200 bg-sky-50 text-sky-800'
                      return (
                        <li
                          key={`dism-${row.primary}-${idx}`}
                          className="rounded-2xl border border-line bg-surfaceElevated p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-inkStrong">{row.primary}</p>
                              <p className="mt-1 text-xs text-mute">
                                {row.secondary} — {row.detail}
                              </p>
                            </div>
                            <span className={`badge whitespace-nowrap ${tone}`}>
                              Umur {ageDays} hari
                            </span>
                          </div>
                        </li>
                      )
                    })
                  ) : (
                    <li className="rounded-2xl border border-dashed border-line bg-surface/40 p-6 text-center text-xs leading-5 text-mute">
                      Belum ada antrean dismantle open yang menginap. Jika Isolasi Aktif sudah lebih
                      dari 3 hari, segera pindahkan ke lane dismantle agar throughput tetap tinggi.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          <NocDashboardCharts {...charts} />

          {shortcutCards.length > 0 ? (
            <section id="noc-overview-shortcuts" className="scroll-mt-24 panel p-4">
              <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
                <div>
                  <p className="section-title">Shortcut NOC &amp; Troubleshoots</p>
                  <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-inkStrong">
                    Masuk ke sub menu lane kerja &amp; tracking
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-mute">
                    Dashboard ini memadatkan monitoring; eksekusi harian (create ticket, update progress,
                    escalate, close, assignment WO, dll) tetap dilakukan dari lane kerja dan halaman tracking
                    yang sudah berdiri sendiri.
                  </p>
                </div>
                <span className="badge border-line bg-surfaceMuted text-muteStrong self-start">
                  {shortcutCards.length} menu
                </span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {shortcutCards.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group block overflow-hidden rounded-3xl border border-line bg-surfaceElevated p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-lineStrong hover:shadow-soft"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="badge border-line bg-surfaceMuted text-muteStrong">{item.badge}</span>
                      <span className="rounded-full border border-line bg-surfaceSoft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute transition group-hover:border-lineStrong">
                        Masuk
                      </span>
                    </div>
                    <h3 className="mt-4 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-inkStrong">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-mute">{item.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )
    }
  }

  if ((domain as DomainKey) === 'sales') {
    if (session.role === 'PENJUALAN' && !salesFocus && !salesLead && !salesOrder) {
      redirect('/sales/input-psb')
    }

    if (!salesFocus && !salesLead && !salesOrder) {
      const visPrimary = resolveOrgVisibleLink(session.role, salesWorkspace.primaryAction)
      const visSecondary = salesWorkspace.secondaryAction
        ? resolveOrgVisibleLink(session.role, salesWorkspace.secondaryAction)
        : null
      const visSections = resolveOrgVisibleSections(session.role, salesWorkspace.sections)
      return (
        <OrganizationWorkspacePage
          role={session.role}
          eyebrow={salesWorkspace.eyebrow}
          title={salesWorkspace.title}
          description={salesWorkspace.description}
          primaryAction={salesWorkspace.primaryAction}
          secondaryAction={salesWorkspace.secondaryAction}
          steps={salesWorkspace.steps}
          sections={salesWorkspace.sections}
          visiblePrimaryAction={visPrimary}
          visibleSecondaryAction={visSecondary}
          visibleSections={visSections}
        />
      )
    }

    return (
      <SalesDomainWorkspace
        content={payload.content}
        source={payload.source}
        capabilities={payload.capabilities}
        role={session.role}
        domainPrefill={domainPrefill}
        domainDrilldown={
          resolvedDomainDrilldown
            ? {
                ...resolvedDomainDrilldown,
                month: resolvePositiveIntegerParam(resolvedSearchParams.month),
                year: resolvePositiveIntegerParam(resolvedSearchParams.year),
              }
            : undefined
        }
      />
    )
  }

  if ((domain as DomainKey) === 'billing') {
    return (
      <BillingDomainWorkspace
        content={payload.content}
        source={payload.source}
        capabilities={payload.capabilities}
        role={session.role}
        domainPrefill={domainPrefill}
        domainDrilldown={
          resolvedDomainDrilldown
            ? {
                ...resolvedDomainDrilldown,
                month: resolvePositiveIntegerParam(resolvedSearchParams.month),
                year: resolvePositiveIntegerParam(resolvedSearchParams.year),
              }
            : undefined
        }
      />
    )
  }

  return (
    <DomainShell
      content={payload.content}
      source={payload.source}
      capabilities={payload.capabilities}
      role={session.role}
      supportFocus={payload.supportFocus}
      supportPrefill={{
        ticket: resolveSearchParam(resolvedSearchParams.ticket),
        isolation: resolveSearchParam(resolvedSearchParams.isolation),
        type: resolveSearchParam(resolvedSearchParams.type),
      }}
      domainPrefill={domainPrefill}
      inventoryView={resolveSearchParam(resolvedSearchParams.inventoryView)}
      inventoryAction={resolveSearchParam(resolvedSearchParams.inventoryAction)}
      domainDrilldown={
        resolvedDomainDrilldown
          ? {
              ...resolvedDomainDrilldown,
              month: resolvePositiveIntegerParam(resolvedSearchParams.month),
              year: resolvePositiveIntegerParam(resolvedSearchParams.year),
            }
          : undefined
      }
      supportDrilldown={resolveSupportDrilldown(
        normalizeSupportLane(resolvedSearchParams.lane),
        resolveSearchParam(resolvedSearchParams.focus),
      )}
    />
  )
}
