import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { PageHeader } from '@/components/page-header'
import { StatusBadge, type StatusTone } from '@/components/ui-status-badge'
import { TrackingIdentifierSearch } from '@/components/tracking-identifier-search'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import type { AppSession } from '@/lib/auth-session'
import { getDataSourceSnapshot } from '@/lib/data-source'

type TrackingEntryCard = {
  title: string
  description: string
  href: string
  badge: string
}

function resolveRecommendedBadgeTone(badge: string): StatusTone {
  const key = badge.toLowerCase()
  if (['teknisi', 'wo', 'operasional'].includes(key)) return 'info'
  if (['queue', 'noc', 'trouble', 'utama'].includes(key)) return 'pending'
  if (['barang', 'inventory'].includes(key)) return 'success'
  return 'neutral'
}

function buildPersonalSearch(session: AppSession) {
  const displayName = session.displayName.trim()
  if (displayName) {
    return displayName
  }
  return session.username.trim()
}

function buildWorkOrdersHref(session: AppSession, patch?: Record<string, string>) {
  const params = new URLSearchParams()
  if (session.userId) {
    params.set('mine', '1')
  } else {
    const q = buildPersonalSearch(session)
    if (q) {
      params.set('q', q)
    }
  }
  Object.entries(patch ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })
  return `/dashboard/tracking/work-orders?${params.toString()}`
}

function buildNocQueueHref(session: AppSession, patch?: Record<string, string>) {
  const params = new URLSearchParams()
  if (session.userId) {
    params.set('mine', '1')
  } else {
    const q = buildPersonalSearch(session)
    if (q) {
      params.set('q', q)
    }
  }
  Object.entries(patch ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })
  return `/dashboard/tracking/noc-queue?${params.toString()}`
}

function buildStockMovementsHref(session: AppSession, patch?: Record<string, string>) {
  const params = new URLSearchParams()
  if (session.userId) {
    params.set('technicianUserId', String(session.userId))
  }
  Object.entries(patch ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, value)
    }
  })
  return `/dashboard/tracking/stock-movements?${params.toString()}`
}

function buildRecommendedCards(session: AppSession): TrackingEntryCard[] {
  if (session.role === 'FIELD_TECHNICIAN') {
    return [
      {
        title: 'WO Saya',
        description: 'Masuk ke daftar work order yang sudah dipersempit ke assignment pribadi teknisi login.',
        href: buildWorkOrdersHref(session),
        badge: 'teknisi',
      },
      {
        title: 'Antrean NOC Saya',
        description: 'Masuk ke antrean NOC yang paling relevan dengan PIC login untuk tindak lanjut operasional.',
        href: buildNocQueueHref(session),
        badge: 'queue',
      },
      {
        title: 'Movement Barang Saya',
        description: 'Lihat movement inventory yang terkait ke teknisi login untuk audit barang keluar dan return.',
        href: buildStockMovementsHref(session),
        badge: 'barang',
      },
    ]
  }

  if (session.role === 'NOC_OPERATOR' || session.role === 'TT_OPERATOR') {
    return [
      {
        title: 'Antrean NOC Saya',
        description: 'Fokus ke ticket gabungan yang PIC-nya sesuai dengan user login Anda.',
        href: buildNocQueueHref(session),
        badge: 'noc',
      },
      {
        title: 'Antrean Trouble Saya',
        description: 'Langsung ke antrean trouble yang menjadi fokus utama follow up operasional NOC.',
        href: buildNocQueueHref(session, { ticketType: 'TROUBLESHOOTS' }),
        badge: 'trouble',
      },
      {
        title: 'WO Saya',
        description: 'Masuk ke daftar work order yang terkait dengan PIC login untuk validasi dan dispatch.',
        href: buildWorkOrdersHref(session),
        badge: 'wo',
      },
    ]
  }

  return [
    {
      title: 'Antrean NOC',
      description: 'Masuk ke meja antrean gabungan untuk PSB, Trouble, Dismantle, dan Jalur.',
      href: '/dashboard/tracking/noc-queue',
      badge: 'utama',
    },
    {
      title: 'Tracking Work Order',
      description: 'Masuk ke daftar work order lintas kategori dengan filter operasional penuh.',
      href: '/dashboard/tracking/work-orders',
      badge: 'operasional',
    },
    {
      title: 'Tracking Barang',
      description: 'Masuk ke audit movement inventory untuk membaca jejak barang lintas WO, TT, dan request.',
      href: '/dashboard/tracking/stock-movements',
      badge: 'inventory',
    },
  ]
}

export default async function DashboardTrackingIndexPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/dashboard')) {
    redirect('/dashboard')
  }

  const source = getDataSourceSnapshot()
  const recommendedCards = buildRecommendedCards(session)

  return (
    <div className="space-y-6 content-fade-in">
      <PageHeader
        eyebrow="Tracking"
        breadcrumbs={[
          { label: 'Workspace', href: '/dashboard' },
          { label: 'Tracking', href: '/dashboard/tracking' },
          { label: 'Pekerjaan & Barang', href: '/dashboard/tracking' },
        ]}
        title="Pekerjaan & Barang"
        description="Halaman ini menampilkan tracking berbasis review DB untuk work order lapangan dan pergerakan barang."
      />
      <DataSourceStatus source={source} />

      <TrackingIdentifierSearch />

      <section aria-label="Ringkasan Tracking" className="card-tier-1 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-inkStrong">Panduan Cepat: 4 Pertanyaan Utama</h2>
            <p className="text-sm leading-6 text-mute">
              Gunakan halaman ini untuk menjawab: <span className="font-medium text-ink"><strong>Di mana</strong> pekerjaan sekarang, <strong>siapa</strong> PIC-nya, <strong>apa</strong> yang baru saja terjadi, dan <strong>apa</strong> langkah berikutnya.</span>
            </p>
          </div>
          <StatusBadge tone="info" label="Operator Hub" size="sm" />
        </div>
      </section>
      <section aria-label="Akses cepat personal" className="card-tier-2 p-6 space-y-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mute">Akses Cepat Saya</p>
            <h3 className="text-lg font-semibold text-inkStrong">{session.displayName}</h3>
            <p className="text-sm leading-6 text-mute">
              Shortcut ini dipersonalisasi dari role dan session login agar user tidak perlu mulai dari tracking generik.
            </p>
          </div>
          <StatusBadge tone="neutral" label={session.role} size="md" />
        </div>
        <nav aria-label="Shortcut personal" className="grid gap-4 lg:grid-cols-3">
          {recommendedCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              aria-label={`Akses cepat: ${card.title}`}
              className="btn-secondary flex flex-col items-start gap-3 text-left min-h-[auto] !py-5 min-w-0 overflow-hidden"
            >
              <StatusBadge tone={resolveRecommendedBadgeTone(card.badge)} label={card.badge} size="sm" />
              <div className="space-y-2 min-w-0">
                <p className="text-sm font-semibold text-inkStrong truncate">{card.title}</p>
                <p className="text-sm leading-6 text-mute">{card.description}</p>
              </div>
            </Link>
          ))}
        </nav>
      </section>
      <section aria-label="Semua tracking" className="space-y-5">
        <div className="flex items-center gap-3 px-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mute">Semua Tracking</p>
          <span className="h-px flex-1 bg-line" />
        </div>
        <nav aria-label="Semua modul tracking" className="grid gap-4 md:grid-cols-2 min-w-0">
          <Link
            href="/dashboard/tracking/noc-queue"
            aria-label="Buka Ticketing Perkasa"
            className="btn-secondary flex flex-col items-start gap-2 text-left min-h-[auto] !py-5 min-w-0 overflow-hidden"
          >
            <p className="text-sm font-semibold text-inkStrong">Ticketing Perkasa</p>
            <p className="text-sm leading-6 text-mute">
              Satu tabel gabungan untuk PSB, Troubleshoots, Dismantle, dan Jalur dengan status antrean
              operasional dan ringkasan device terakhir.
            </p>
          </Link>
          <Link
            href="/dashboard/tracking/work-orders"
            aria-label="Buka Tracking Work Order"
            className="btn-secondary flex flex-col items-start gap-2 text-left min-h-[auto] !py-5 min-w-0 overflow-hidden"
          >
            <p className="text-sm font-semibold text-inkStrong">Tracking Pekerjaan (Work Order)</p>
            <p className="text-sm leading-6 text-mute">List WO + detail status log, assignment log, dan movement terkait.</p>
          </Link>
          <Link
            href="/dashboard/tracking/stock-movements"
            aria-label="Buka Tracking Stock Movement"
            className="btn-secondary flex flex-col items-start gap-2 text-left min-h-[auto] !py-5 min-w-0 overflow-hidden"
          >
            <p className="text-sm font-semibold text-inkStrong">Tracking Barang (Stock Movement)</p>
            <p className="text-sm leading-6 text-mute">List movement + filter WO/TT/teknisi/lokasi dan detail jejak barang.</p>
          </Link>
          <Link
            href="/dashboard/tracking/trouble-tickets"
            aria-label="Buka Tracking Trouble Ticket"
            className="btn-secondary flex flex-col items-start gap-2 text-left min-h-[auto] !py-5 min-w-0 overflow-hidden"
          >
            <p className="text-sm font-semibold text-inkStrong">Tracking Trouble Ticket</p>
            <p className="text-sm leading-6 text-mute">
              List TT + detail work order terkait dan movement inventory yang terhubung ke ticket.
            </p>
          </Link>
          <Link
            href="/dashboard/tracking/inventory-requests"
            aria-label="Buka Tracking Request Barang"
            className="btn-secondary flex flex-col items-start gap-2 text-left min-h-[auto] !py-5 min-w-0 overflow-hidden"
          >
            <p className="text-sm font-semibold text-inkStrong">Tracking Request Barang</p>
            <p className="text-sm leading-6 text-mute">
              List request + detail konteks WO/TT dan movement terkait untuk audit pemakaian barang.
            </p>
          </Link>
        </nav>
      </section>
    </div>
  )
}
