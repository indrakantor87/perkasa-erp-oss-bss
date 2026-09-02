import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import type { AppRole } from '@/lib/types'

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
        title: 'Pinjaman Barang',
        description: 'Pinjamkan barang dan proses pengembalian dalam satu workspace.',
        href: '/inventory/loans',
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

  const cards: InventoryFocusCard[] = [
    {
      title: 'ODP dan Port',
      description: 'Pantau kapasitas ODP, status port, dan kondisi titik jaringan yang berdampak ke order dan ticket.',
      href: '/inventory/network',
      badge: 'utama',
    },
  ]

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

  if (session.role === 'SUPER_ADMIN') {
    const payload = await getDomainPageData('inventory', session, {
      focus: resolveSearchParam(resolvedSearchParams.focus),
      month: resolvePositiveIntegerParam(resolvedSearchParams.month),
      year: resolvePositiveIntegerParam(resolvedSearchParams.year),
    })

    if (!payload) {
      notFound()
    }

    const shortcuts = buildInventoryShortcuts(session.role)
    const focusCards = buildInventoryFocusCards(session.role)
    const requestHref = '/inventory/requests'

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
                  Fokus ini memadatkan alur yang paling dekat dengan pekerjaan lapangan: ODP dan port, assignment device,
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
