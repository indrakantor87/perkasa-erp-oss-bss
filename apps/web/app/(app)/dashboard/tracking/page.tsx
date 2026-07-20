import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
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
    <div className="space-y-6">
      <DataSourceStatus source={source} />
      <section className="panel p-6">
        <p className="section-title">Tracking</p>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">Pekerjaan & Barang</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-mute">
          Halaman ini menampilkan tracking berbasis review DB untuk work order lapangan dan pergerakan barang.
        </p>
        <div className="mt-6 rounded-3xl border border-line bg-[var(--color-surface-soft)] p-5">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mute">Akses Cepat Saya</p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--color-ink-strong)]">{session.displayName}</h3>
              <p className="mt-2 text-sm leading-6 text-mute">
                Shortcut ini dipersonalisasi dari role dan session login agar user tidak perlu mulai dari tracking generik.
              </p>
            </div>
            <span className="solid-chip">{session.role}</span>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {recommendedCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="rounded-3xl border border-line bg-white p-5 transition hover:[border-color:var(--color-line-strong)]"
              >
                <span className="inline-flex rounded-full bg-[var(--color-surface-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-strong)]">
                  {card.badge}
                </span>
                <p className="mt-3 text-sm font-semibold text-[var(--color-ink-strong)]">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-mute">{card.description}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mute">Semua Tracking</p>
          <span className="h-px flex-1 bg-[var(--color-line)]" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Link
            href="/dashboard/tracking/noc-queue"
            className="surface-soft rounded-3xl border border-line p-5 transition hover:[border-color:var(--color-line-strong)]"
          >
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Ticketing Perkasa</p>
            <p className="mt-2 text-sm leading-6 text-mute">
              Satu tabel gabungan untuk PSB, Troubleshoots, Dismantle, dan Jalur dengan status antrean
              operasional dan ringkasan device terakhir.
            </p>
          </Link>
          <Link
            href="/dashboard/tracking/work-orders"
            className="surface-soft rounded-3xl border border-line p-5 transition hover:[border-color:var(--color-line-strong)]"
          >
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Tracking Pekerjaan (Work Order)</p>
            <p className="mt-2 text-sm leading-6 text-mute">List WO + detail status log, assignment log, dan movement terkait.</p>
          </Link>
          <Link
            href="/dashboard/tracking/stock-movements"
            className="surface-soft rounded-3xl border border-line p-5 transition hover:[border-color:var(--color-line-strong)]"
          >
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Tracking Barang (Stock Movement)</p>
            <p className="mt-2 text-sm leading-6 text-mute">List movement + filter WO/TT/teknisi/lokasi dan detail jejak barang.</p>
          </Link>
          <Link
            href="/dashboard/tracking/trouble-tickets"
            className="surface-soft rounded-3xl border border-line p-5 transition hover:[border-color:var(--color-line-strong)]"
          >
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Tracking Trouble Ticket</p>
            <p className="mt-2 text-sm leading-6 text-mute">
              List TT + detail work order terkait dan movement inventory yang terhubung ke ticket.
            </p>
          </Link>
          <Link
            href="/dashboard/tracking/inventory-requests"
            className="surface-soft rounded-3xl border border-line p-5 transition hover:[border-color:var(--color-line-strong)]"
          >
            <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Tracking Request Barang</p>
            <p className="mt-2 text-sm leading-6 text-mute">
              List request + detail konteks WO/TT dan movement terkait untuk audit pemakaian barang.
            </p>
          </Link>
        </div>
      </section>
    </div>
  )
}
