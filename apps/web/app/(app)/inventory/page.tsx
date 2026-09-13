import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import { SimpleBarChart, type SimpleBarDatum } from '@/components/simple-bar-chart'
import {
  GRANULARITY_OPTIONS,
  HistoricalBarChart,
  type GranularityKey,
  type HistoricalSeriesDatum,
} from '@/components/historical-bar-chart'
import type { AppRole, DomainReviewRow, DomainReviewSection } from '@/lib/types'

function findInventorySection(sections: DomainReviewSection[] | undefined, keyword: string) {
  if (!sections || sections.length === 0) return null
  return sections.find((section) => section.title.toUpperCase().includes(keyword.toUpperCase())) ?? null
}

function pickMetaField(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function statusGroupRequest(status: string): SimpleBarDatum['tone'] {
  const s = status.trim().toUpperCase()
  if (s.includes('SELESAI') || s.includes('DONE') || s.includes('COMPLETE')) return 'emerald'
  if (s.includes('PENDING')) return 'amber'
  if (s.includes('DIPROSES') || s.includes('PROSES') || s.includes('PROGRESS')) return 'sky'
  if (s.includes('BATAL') || s.includes('CANCEL') || s.includes('REJECT')) return 'rose'
  return 'slate'
}

function statusGroupLoan(status: string): SimpleBarDatum['tone'] {
  const s = status.trim().toUpperCase()
  if (s.includes('DIKEMBALIKAN') || s.includes('RETURNED') || s.includes('SELESAI')) return 'emerald'
  if (s.includes('PARTIAL')) return 'amber'
  if (s.includes('OVERDUE') || s.includes('TERLAMBAT')) return 'rose'
  return 'sky'
}

function toneForMovement(primary: string): SimpleBarDatum['tone'] {
  const s = primary.trim().toUpperCase()
  if (s === 'IN') return 'emerald'
  if (s === 'OUT') return 'sky'
  if (s === 'ADJUSTMENT') return 'violet'
  return 'slate'
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

function countByStatus(rows: DomainReviewRow[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = row.status.trim() || 'TANPA STATUS'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

function countByMetaPrefix(rows: DomainReviewRow[], prefix: string): Array<{ label: string; count: number }> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = pickMetaField(row.meta, prefix).trim() || 'TIDAK TERDAFTAR'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ label, count }))
}

function countByMovementPrimary(rows: DomainReviewRow[]): Array<{ label: string; count: number }> {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = row.primary.trim().toUpperCase() || 'TANPA JENIS'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  const preferredOrder = ['IN', 'OUT', 'ADJUSTMENT']
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

function pickRowDate(row: DomainReviewRow, kind: 'movement' | 'request' | 'loan'): Date | null {
  const prefixes =
    kind === 'movement' ? ['At: '] : kind === 'request' ? ['Requested: '] : ['Dipinjam: ', 'Dikembalikan: ']
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

function buildHistoricalSeries(
  rows: DomainReviewRow[],
  kind: 'movement' | 'request' | 'loan',
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
    const date = pickRowDate(row, kind)
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
    Math.max(4, granularity === 'DAILY' ? Math.min(21, spanMonths * 6) : granularity === 'WEEKLY' ? Math.min(12, spanMonths * 2) : granularity === 'MONTHLY' ? Math.min(12, spanMonths) : granularity === 'QUARTERLY' ? 6 : 4),
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
  for (const { date, row: _row } of dated) {
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
    previous:
      previousBuckets.get(order[idx % order.length] ?? '') ??
      previousBuckets.get(key) ??
      0,
  }))

  return { series, currentLabel, previousLabel }
}

type InventoryShortcut = {
  title: string
  description: string
  href: string
}

type InventoryFocusCard = {
  title: string
  description: string
  href: string
  badge: string
}

function buildInventoryShortcuts(role: AppRole): InventoryShortcut[] {
  const canCreate = ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'GA', 'CS_ADMIN'].includes(role)
  const canUpdate = ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'GA', 'CS_ADMIN', 'CS_OPERATOR', 'NOC_OPERATOR', 'FIELD_TECHNICIAN'].includes(role)

  if (role === 'FIELD_TECHNICIAN') {
    return [
      {
        title: 'Request Barang',
        description: 'Ajukan request barang untuk kebutuhan lapangan.',
        href: '/inventory/requests?inventoryAction=item-request',
      },
    ]
  }

  const shortcuts: InventoryShortcut[] = []

  if (canUpdate) {
    shortcuts.push(
      {
        title: 'Pinjaman Barang',
        description: 'Pinjamkan barang dan proses pengembalian dalam satu workspace.',
        href: '/inventory/loans',
      },
      {
        title: 'Request Barang',
        description: 'Antrean request teknisi dan proses pengambilan barang.',
        href: '/inventory/requests',
      },
      {
        title: 'Log Aktivitas',
        description: 'Ringkasan pergerakan stok dan request inventory yang sedang berjalan.',
        href: '/inventory/logs',
      },
      {
        title: 'Penataan Rak',
        description: 'Kelola rak, barcode rak, dan struktur lokasi barang.',
        href: '/inventory/racks',
      },
      {
        title: 'Port ODP',
        description: 'Kelola ODP, port, assignment, dan return perangkat.',
        href: '/inventory/network',
      },
    )
  }

  if (canCreate) {
    shortcuts.push(
      {
        title: 'Barang Masuk',
        description: 'Fokus ke receipt stok gudang.',
        href: '/inventory/receipts',
      },
      {
        title: 'Barang Keluar',
        description: 'Barang keluar, retur, dan adjustment stok.',
        href: '/inventory/movements',
      },
      {
        title: 'Data Barang',
        description: 'Master item inventory, barcode item, dan data stok dasar.',
        href: '/inventory/items',
      },
    )
  }

  return shortcuts
}

function buildInventoryFocusCards(role: AppRole): InventoryFocusCard[] {
  const canCreate = ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'GA', 'CS_ADMIN'].includes(role)
  const canUpdate = ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'GA', 'CS_ADMIN', 'CS_OPERATOR', 'NOC_OPERATOR', 'FIELD_TECHNICIAN'].includes(role)

  const cards: InventoryFocusCard[] = []

  if (canUpdate) {
    cards.push({
      title: 'Pinjaman Barang',
      description: 'Kelola pinjaman aktif, proses pengembalian, dan pantau status overdue barang wajib kembali ke gudang.',
      href: '/inventory/loans',
      badge: 'pinjaman',
    })
  }

  cards.push({
    title: 'ODP dan Port',
    description: 'Pantau kapasitas ODP, status port, dan kondisi titik jaringan yang berdampak ke order dan ticket.',
    href: '/inventory/network',
    badge: 'utama',
  })

  if (canUpdate) {
    cards.push(
      {
        title: 'Assignment Device',
        description: 'Pasangkan perangkat ke ODP atau layanan aktif, lalu sinkronkan return perangkat dari lapangan.',
        href: '/inventory/network?inventoryAction=device-assignment#inventory-action-device-assignment',
        badge: 'tracking device',
      },
      {
        title: 'Request Barang',
        description: 'Masuk ke request material lapangan dan proses permintaan barang yang masih berjalan.',
        href: '/inventory/requests?inventoryAction=item-request#inventory-action-item-request',
        badge: 'permintaan',
      },
      {
        title: 'Stock Movement',
        description: 'Baca barang keluar, barang kembali, dan adjustment stok yang memengaruhi kesiapan operasional.',
        href: '/inventory/movements?inventoryAction=stock-movement#inventory-action-stock-movement',
        badge: 'mutasi',
      },
    )
  }

  if (canCreate) {
    cards.push({
      title: 'Barcode dan Rak',
      description: 'Kelola penataan rak, barcode rak, dan item master agar lokasi fisik barang tetap mudah diaudit.',
      href: '/inventory/racks?inventoryAction=rack-layout#inventory-action-rack-layout',
      badge: 'lokasi fisik',
    })
  }

  return cards
}

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveIntegerParam(value: string | string[] | undefined) {
  const raw = resolveSearchParam(value)
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export default async function InventoryOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
    inventoryView?: string | string[]
    inventoryAction?: string | string[]
    itemCode?: string | string[]
    request?: string | string[]
    inventoryGranularity?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
  const rawGranularity = resolveSearchParam(resolvedSearchParams.inventoryGranularity)?.trim().toUpperCase()
  const granularity: GranularityKey = GRANULARITY_OPTIONS.some((o) => o.key === rawGranularity)
    ? (rawGranularity as GranularityKey)
    : 'MONTHLY'

  const payload = await getDomainPageData('inventory', session, {
    focus: resolveSearchParam(resolvedSearchParams.focus),
    month: resolvePositiveIntegerParam(resolvedSearchParams.month),
    year: resolvePositiveIntegerParam(resolvedSearchParams.year),
  })

  if (payload) {
    const shortcuts = buildInventoryShortcuts(session.role)
    const focusCards = buildInventoryFocusCards(session.role)
    const requestHref = '/inventory/requests'
    const reviewSections = payload.content.reviewSections ?? []

    const requestSection = findInventorySection(reviewSections, 'REQUEST INVENTORY')
    const requestRows = requestSection?.rows ?? []
    const loanSection = findInventorySection(reviewSections, 'PINJAMAN INVENTORY')
    const loanRows = loanSection?.rows ?? []
    const movementSection = findInventorySection(reviewSections, 'STOCK MOVEMENT')
    const movementRows = movementSection?.rows ?? []

    const chartStatusRequest: SimpleBarDatum[] = buildBarFromKeyValue(
      countByStatus(requestRows),
      statusGroupRequest,
    )
    const chartSubdivRequest: SimpleBarDatum[] = buildBarFromKeyValue(
      countByMetaPrefix(requestRows, 'Sub-divisi: '),
      () => 'accent',
    )
    const chartStatusLoan: SimpleBarDatum[] = buildBarFromKeyValue(countByStatus(loanRows), statusGroupLoan)
    const chartSubdivLoan: SimpleBarDatum[] = buildBarFromKeyValue(
      countByMetaPrefix(loanRows, 'Sub-divisi: '),
      () => 'violet',
    )
    const chartMovementKind: SimpleBarDatum[] = buildBarFromKeyValue(
      countByMovementPrimary(movementRows),
      toneForMovement,
    )

    const historicalRequest = buildHistoricalSeries(requestRows, 'request', granularity, 'Periode saat ini', 'Periode sebelumnya')
    const historicalMovement = buildHistoricalSeries(movementRows, 'movement', granularity, 'Periode saat ini', 'Periode sebelumnya')
    const historicalLoan = buildHistoricalSeries(loanRows, 'loan', granularity, 'Periode saat ini', 'Periode sebelumnya')
    const setGranularityHref = (next: GranularityKey) => {
      const nextParams = new URLSearchParams()
      if (resolvedSearchParams.focus) nextParams.set('focus', String(resolvedSearchParams.focus))
      if (resolvedSearchParams.month) nextParams.set('month', String(resolvedSearchParams.month))
      if (resolvedSearchParams.year) nextParams.set('year', String(resolvedSearchParams.year))
      nextParams.set('inventoryGranularity', next)
      return `/inventory${nextParams.toString() ? `?${nextParams.toString()}` : ''}`
    }

    return (
      <div className="space-y-4">
        <section className="panel p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="section-title">{payload.content.eyebrow}</p>
              <h1 className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
                {payload.content.title}
              </h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-mute">{payload.content.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/inventory/items"
                className="inline-flex rounded-full border border-line bg-surfaceSoft px-4 py-2 text-sm font-semibold text-muteStrong transition hover:bg-surface hover:text-inkStrong"
              >
                Lihat Item
              </Link>
              <Link
                href={requestHref}
                className="inline-flex rounded-full border border-accent bg-accent px-4 py-2 text-sm font-semibold text-accentInk transition hover:bg-accent/90 focus-visible:shadow-focus"
              >
                Buka Request
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {payload.content.summaries.map((item) => (
            <article key={item.label} className="panel p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{item.label}</p>
              <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-inkStrong">
                {item.value}
              </p>
            </article>
          ))}
        </section>

        {focusCards.length > 0 ? (
          <section className="panel p-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
              <div>
                <p className="section-title">Fokus Inventory</p>
                <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-inkStrong">
                  Jalur kerja prioritas untuk inventory operasional
                </h2>
                <p className="mt-1 text-sm leading-6 text-mute">
                  Fokus ini memadatkan alur yang paling dekat dengan pekerjaan lapangan: Pinjaman barang, ODP dan port, assignment device,
                  request barang, stock movement, dan penataan lokasi fisik.
                </p>
              </div>
              <span className="badge border-line bg-surfaceMuted text-muteStrong">{focusCards.length} fokus</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {focusCards.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group block overflow-hidden rounded-3xl border border-line bg-surfaceElevated p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-lineStrong hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="badge border-line bg-surfaceMuted text-muteStrong">{item.badge}</span>
                    <span className="rounded-full border border-line bg-surfaceSoft px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute transition group-hover:border-lineStrong">
                      buka
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

        <section className="space-y-4">
          <div className="panel p-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
              <div>
                <p className="section-title">Pemantauan Kinerja Inventory</p>
                <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-inkStrong">
                  Ringkasan visual proses operasional gudang
                </h2>
                <p className="mt-1 text-sm leading-6 text-mute">
                  Visualisasi ini menampilkan angka hitung mentah (tidak ada prediksi, asumsi, atau smoothing). Data diambil langsung dari
                  transaksi request, stock movement, dan pinjaman barang terbaru, sehingga bisa dipakai sebagai acuan dasar pengambilan
                  keputusan.
                </p>
              </div>
              <span className="badge border-line bg-surfaceMuted text-muteStrong self-start">5 diagram batang</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SimpleBarChart
              title="Status Request Barang"
              subtitle="Distribusi request per status. Cek jika menumpuk pada PENDING / DIPROSES untuk mengatur prioritas."
              unitLabel="request"
              data={chartStatusRequest}
              emptyNote="Belum ada transaksi request. Tabel akan terisi setelah request pertama dibuat."
            />
            <SimpleBarChart
              title="Stock Movement (Masuk / Keluar / Penyesuaian)"
              subtitle="Perbandingan barang masuk (IN), barang keluar (OUT), dan penyesuaian stok (ADJUSTMENT)."
              unitLabel="transaksi"
              data={chartMovementKind}
              emptyNote="Belum ada transaksi stock movement (receipt, pemakaian, atau penyesuaian stok)."
            />
            <SimpleBarChart
              title="Request per Sub-divisi"
              subtitle="Melihat beban request per tim. Sub-divisi dengan request tinggi bisa dicek stok buffer-nya."
              unitLabel="request"
              data={chartSubdivRequest}
              emptyNote="Belum ada request per sub-divisi yang tercatat."
            />
            <SimpleBarChart
              title="Status Pinjaman Barang"
              subtitle="Distribusi pinjaman: Aktif / Dikembalikan / Partial / Overdue. Fokus ke overdue dan partial untuk akuntabilitas."
              unitLabel="pinjaman"
              data={chartStatusLoan}
              emptyNote="Belum ada transaksi pinjaman barang yang tercatat."
            />
            <div className="lg:col-span-2">
              <SimpleBarChart
                title="Pinjaman Barang per Sub-divisi"
                subtitle="Memantau tim mana yang paling banyak meminjam aset gudang untuk audit dan pengawasan penggunaan."
                unitLabel="pinjaman"
                data={chartSubdivLoan}
                emptyNote="Belum ada pinjaman per sub-divisi yang tercatat."
                heightPx={260}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="panel p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
              <div>
                <p className="section-title">Pemantauan Historis Inventory</p>
                <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-inkStrong">
                  Perbandingan kinerja periode saat ini vs periode sebelumnya
                </h2>
                <p className="mt-1 text-sm leading-6 text-mute">
                  Visualisasi historis ini menampilkan perbandingan LITERAL periode sekarang dengan periode sebelumnya, tanpa prediksi, tanpa
                  smoothing, dan tanpa interpolasi. Warna gelap = periode saat ini; warna abu = periode sebelumnya. Gunakan toggle periodisitas
                  di kanan atas untuk ganti granularitas seperti tampilan TradingView: harian sampai tahunan.
                </p>
              </div>
              <div className="flex flex-col gap-1 text-xs leading-6 text-mute md:items-end">
                <span className="badge border-line bg-surfaceMuted text-muteStrong self-start md:self-end">
                  Mode: {GRANULARITY_OPTIONS.find((o) => o.key === granularity)?.label ?? 'Bulanan'}
                </span>
                <span>Toggle periodisitas = ubah skala agregasi bucket perbandingan historis.</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <HistoricalBarChart
              title="Historis Request Barang (saat ini vs sebelumnya)"
              subtitle="Jumlah request barang per bucket periode. Bandingkan dengan periode sebelumnya untuk menilai lonjakan atau penurunan beban kerja gudang."
              granularity={granularity}
              setGranularityHref={setGranularityHref}
              currentPeriodLabel={historicalRequest.currentLabel}
              previousPeriodLabel={historicalRequest.previousLabel}
              series={historicalRequest.series}
              unitLabel="request"
              emptyNote="Belum ada request barang yang bisa dihistorisasi. Data muncul setelah request dengan tanggal dibuat tercatat di sistem."
              onEmptyPreviousHint="Sistem membangun perbandingan 2 periode otomatis (periode sekarang + periode sebelumnya). Jika data hanya tersedia 1 periode, periode sebelumnya akan bernilai 0 sebagai pembanding nol."
            />
            <HistoricalBarChart
              title="Historis Stock Movement (saat ini vs sebelumnya)"
              subtitle="Jumlah transaksi barang IN, OUT, dan ADJUSTMENT per bucket periode. Pantau ratio IN/OUT dan sinyal ADJUSTMENT yang berlebih untuk temukan proses pencatatan yang perlu diperbaiki."
              granularity={granularity}
              setGranularityHref={setGranularityHref}
              currentPeriodLabel={historicalMovement.currentLabel}
              previousPeriodLabel={historicalMovement.previousLabel}
              series={historicalMovement.series}
              unitLabel="transaksi"
              emptyNote="Belum ada stock movement dengan tanggal tercatat yang bisa dihistorisasi."
              onEmptyPreviousHint="Jika bucket periode sebelumnya kosong, artinya belum ada transaksi movement tercatat pada periode pembanding."
            />
            <HistoricalBarChart
              title="Historis Pinjaman Barang (saat ini vs sebelumnya)"
              subtitle="Jumlah pinjaman per bucket periode. Membantu mengukur kapan aset fisik banyak dipinjam teknisi lapangan (puncak proyek, maintenance periodik, dll)."
              granularity={granularity}
              setGranularityHref={setGranularityHref}
              currentPeriodLabel={historicalLoan.currentLabel}
              previousPeriodLabel={historicalLoan.previousLabel}
              series={historicalLoan.series}
              unitLabel="pinjaman"
              emptyNote="Belum ada pinjaman barang dengan tanggal tercatat yang bisa dihistorisasi."
              onEmptyPreviousHint="Sistem tidak menampilkan data dummy. Periode sebelumnya kosong berarti periode tersebut memang 0 transaksi."
            />
          </div>
        </section>

        {shortcuts.length > 0 ? (
          <section className="panel p-4">
            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
              <div>
                <p className="section-title">Shortcut Inventory</p>
                <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-inkStrong">
                  Masuk ke sub menu kerja
                </h2>
                <p className="mt-1 text-sm leading-6 text-mute">
                  Menu utama Inventory dipadatkan menjadi ringkasan; eksekusi harian dilakukan dari sub menu yang sudah berdiri
                  sendiri.
                </p>
              </div>
              <span className="badge border-line bg-surfaceMuted text-muteStrong">{shortcuts.length} menu</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {shortcuts.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group block overflow-hidden rounded-3xl border border-line bg-surfaceElevated p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-lineStrong hover:shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="badge border-line bg-surfaceMuted text-muteStrong">Sub menu</span>
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

  if (session.role === 'FIELD_TECHNICIAN') {
    redirect('/inventory/requests?inventoryAction=item-request')
  }

  redirect('/inventory/network')
}
