import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import { SimpleBarChart, type SimpleBarDatum } from '@/components/simple-bar-chart'
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
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const resolvedSearchParams = (await searchParams) ?? {}
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
