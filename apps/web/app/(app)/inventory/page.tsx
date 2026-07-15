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
        title: 'Penataan Rak',
        description: 'Kelola rak, barcode rak, dan struktur lokasi barang.',
        href: '/inventory/racks',
      },
      {
        title: 'Pinjaman',
        description: 'Pinjamkan barang dan proses pengembalian dalam satu workspace.',
        href: '/inventory/loans',
      },
      {
        title: 'Network & ODP',
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
        title: 'Stock Movement',
        description: 'Barang keluar dan adjustment stok.',
        href: '/inventory/movements',
      },
      {
        title: 'Item Master',
        description: 'Master item inventory, barcode item, dan data stok dasar.',
        href: '/inventory/items',
      },
    )
  }

  return shortcuts
}

export default async function InventoryOverviewPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const payload = await getDomainPageData('inventory', session, {})
  if (!payload) {
    notFound()
  }

  const shortcuts = buildInventoryShortcuts(session.role)
  const requestHref =
    session.role === 'FIELD_TECHNICIAN' ? '/inventory/requests?inventoryAction=item-request' : '/inventory/requests'

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="section-title">{payload.content.eyebrow}</p>
            <h1 className="mt-1 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              {payload.content.title}
            </h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-mute">{payload.content.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/inventory/items"
              className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Lihat Item
            </Link>
            <Link
              href={requestHref}
              className="inline-flex rounded-full border border-slate-950 bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
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
            <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              {item.value}
            </p>
          </article>
        ))}
      </section>

      {shortcuts.length > 0 ? (
        <section className="panel p-4">
          <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
            <div>
              <p className="section-title">Shortcut Inventory</p>
              <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
                Masuk ke sub menu kerja
              </h2>
              <p className="mt-1 text-sm leading-6 text-mute">
                Menu utama Inventory dipadatkan menjadi ringkasan; eksekusi harian dilakukan dari sub menu yang sudah berdiri sendiri.
              </p>
            </div>
            <span className="badge border-slate-200 bg-white text-slate-600">{shortcuts.length} menu</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {shortcuts.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group block overflow-hidden rounded-3xl border border-line bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="badge border-slate-200 bg-white text-slate-600">Sub menu</span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition group-hover:border-slate-300">
                    Masuk
                  </span>
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-slate-950">
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
