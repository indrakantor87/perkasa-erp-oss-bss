import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/ui-status-badge'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'
import { getTroubleTicketTrackingList, getWorkOrderTrackingList } from '@/lib/services/tracking-service'
import type { DataSourceSnapshot } from '@/lib/types'

type CustomerTTRow = {
  id: number
  ticketCode: string | null
  customerName: string | null
  category: string | null
  type: string | null
  status: string | null
  openedAt: string | null
  closedAt: string | null
}

type CustomerWORow = {
  id: number
  workOrderNo: string | null
  customerName: string | null
  jobCategory: string | null
  workType: string | null
  status: string | null
  scheduledAt: string | null
}

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function buildTtStatusTone(status: string | null | undefined) {
  const s = String(status ?? '').trim().toUpperCase()
  if (s === 'CLOSED' || s === 'COMPLETED' || s === 'RESOLVED' || s === 'READY') return 'closed' as const
  if (s === 'ACCEPTED' || s === 'IN_PROGRESS' || s === 'ON_PROGRESS' || s.startsWith('ON_')) return 'in_progress' as const
  if (s === 'OPEN' || s === 'OVERDUE' || s === 'ESCALATED') return 'danger' as const
  if (s === 'PENDING' || s === 'REVIEW' || s === 'WAITING' || s === 'HOLD' || s === 'MONITOR') return 'pending' as const
  if (s === 'ASSIGNED') return 'assigned' as const
  return 'neutral' as const
}

function buildWoStatusTone(status: string | null | undefined) {
  const s = String(status ?? '').trim().toUpperCase()
  if (s === 'DONE' || s === 'COMPLETED' || s === 'CLOSED') return 'closed' as const
  if (s === 'IN_PROGRESS' || s === 'ON_PROGRESS' || s.startsWith('ON_')) return 'in_progress' as const
  if (s === 'OPEN' || s === 'OVERDUE') return 'danger' as const
  if (s === 'SCHEDULED' || s === 'PENDING' || s === 'HOLD') return 'pending' as const
  if (s === 'ASSIGNED') return 'assigned' as const
  return 'neutral' as const
}

async function getCustomerTroubleTickets(customerNameLike: string, source: DataSourceSnapshot): Promise<CustomerTTRow[]> {
  if (source.effectiveMode !== 'review-db' || source.isFallback) return []
  if (!customerNameLike.trim()) return []

  const [
    hasId, hasTicketCode, hasCustomerName, hasCategory, hasType, hasStatus, hasOpenedAt, hasClosedAt,
  ] = await Promise.all([
    hasReviewDbColumn('support_trouble_tickets', 'id'),
    hasReviewDbColumn('support_trouble_tickets', 'ticket_code'),
    hasReviewDbColumn('support_trouble_tickets', 'customer_name'),
    hasReviewDbColumn('support_trouble_tickets', 'category'),
    hasReviewDbColumn('support_trouble_tickets', 'type'),
    hasReviewDbColumn('support_trouble_tickets', 'status'),
    hasReviewDbColumn('support_trouble_tickets', 'opened_at'),
    hasReviewDbColumn('support_trouble_tickets', 'closed_at'),
  ])

  if (!hasId || !hasCustomerName) return []

  const rows = await runReviewDbQuery<CustomerTTRow>(
    `
      SELECT
        tt.id AS id,
        ${hasTicketCode ? 'tt.ticket_code' : 'NULL'} AS ticketCode,
        ${hasCustomerName ? 'tt.customer_name' : 'NULL'} AS customerName,
        ${hasCategory ? 'tt.category' : 'NULL'} AS category,
        ${hasType ? 'tt.type' : 'NULL'} AS type,
        ${hasStatus ? 'tt.status' : 'NULL'} AS status,
        ${hasOpenedAt ? 'tt.opened_at' : 'NULL'} AS openedAt,
        ${hasClosedAt ? 'tt.closed_at' : 'NULL'} AS closedAt
      FROM support_trouble_tickets tt
      WHERE tt.customer_name LIKE ?
      ORDER BY tt.id DESC
      LIMIT 20
    `,
    [`%${customerNameLike}%`],
  )

  return rows
}

async function getCustomerWorkOrders(customerNameLike: string, source: DataSourceSnapshot): Promise<CustomerWORow[]> {
  if (source.effectiveMode !== 'review-db' || source.isFallback) return []
  if (!customerNameLike.trim()) return []

  const [
    hasId, hasWoNo, hasCustomerName, hasJobCategory, hasWorkType, hasStatus, hasScheduledAt,
  ] = await Promise.all([
    hasReviewDbColumn('field_work_orders', 'id'),
    hasReviewDbColumn('field_work_orders', 'work_order_no'),
    hasReviewDbColumn('field_work_orders', 'customer_name'),
    hasReviewDbColumn('field_work_orders', 'job_category'),
    hasReviewDbColumn('field_work_orders', 'work_type'),
    hasReviewDbColumn('field_work_orders', 'status'),
    hasReviewDbColumn('field_work_orders', 'scheduled_at'),
  ])

  if (!hasId || !hasCustomerName) return []

  const rows = await runReviewDbQuery<CustomerWORow>(
    `
      SELECT
        wo.id AS id,
        ${hasWoNo ? 'wo.work_order_no' : 'NULL'} AS workOrderNo,
        ${hasCustomerName ? 'wo.customer_name' : 'NULL'} AS customerName,
        ${hasJobCategory ? 'wo.job_category' : 'NULL'} AS jobCategory,
        ${hasWorkType ? 'wo.work_type' : 'NULL'} AS workType,
        ${hasStatus ? 'wo.status' : 'NULL'} AS status,
        ${hasScheduledAt ? 'wo.scheduled_at' : 'NULL'} AS scheduledAt
      FROM field_work_orders wo
      WHERE wo.customer_name LIKE ?
      ORDER BY wo.id DESC
      LIMIT 20
    `,
    [`%${customerNameLike}%`],
  )

  return rows
}

function GapCard(props: { title: string; reason: string; hint?: string }) {
  return (
    <div className="card-tier-2 border border-dashed border-warningLine bg-warningSoft/40 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warningInk/80">INTEGRATION GAP</p>
          <h4 className="mt-2 font-semibold text-warningInk">{props.title}</h4>
        </div>
        <StatusBadge tone="warning" label="NOT_CONNECTED" size="sm" />
      </div>
      <p className="mt-3 text-sm leading-6 text-warningInk/90">{props.reason}</p>
      {props.hint ? (
        <p className="mt-2 text-xs leading-5 text-warningInk/70">Catatan: {props.hint}</p>
      ) : null}
    </div>
  )
}

function EmptyCard(props: { title: string; subtitle?: string }) {
  return (
    <div className="card-tier-2 border border-line bg-surfaceSoft p-4 sm:p-5 text-center">
      <p className="text-sm font-semibold text-inkStrong">{props.title}</p>
      {props.subtitle ? (
        <p className="mt-1 text-xs leading-5 text-mute">{props.subtitle}</p>
      ) : null}
    </div>
  )
}

export default async function CustomerHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>
  searchParams: Promise<{
    name?: string | string[]
    subscription?: string | string[]
    phone?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/customers')) {
    redirect('/dashboard')
  }

  const { customerId } = await params
  const resolvedSearchParams = await searchParams
  const nameParam = resolveSearchParam(resolvedSearchParams.name)
  const subscriptionParam = resolveSearchParam(resolvedSearchParams.subscription)
  const phoneParam = resolveSearchParam(resolvedSearchParams.phone)

  const source = getDataSourceSnapshot()
  const fallbackLabel = customerId && customerId !== '[customerId]' ? customerId : (nameParam || 'Customer Lookup')

  const breadcrumbs = [
    { label: 'Workspace', href: '/dashboard' },
    { label: 'Customers', href: '/customers' },
    { label: fallbackLabel },
  ]

  const pageActions = (
    <>
      <Link href="/customers" className="btn-ghost tap-44 focus-visible:shadow-focus">
        Kembali ke Customers
      </Link>
      <Link href="/dashboard/tracking" className="btn-secondary tap-44 focus-visible:shadow-focus">
        Buka Tracking
      </Link>
    </>
  )

  const [ttRows, woRows] = source.effectiveMode === 'review-db' && !source.isFallback
    ? await Promise.all([
        getCustomerTroubleTickets(nameParam || '', source),
        getCustomerWorkOrders(nameParam || '', source),
      ])
    : [[], []] as const

  const customerIdentity = {
    id: customerId,
    name: nameParam || customerId,
    subscription: subscriptionParam,
    phone: phoneParam,
  }

  return (
    <div className="space-y-6 content-fade-in">
      <DataSourceStatus source={source} />
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={customerIdentity.name || `Customer #${customerId}`}
        description="Rekap histori customer: layanan, ticket gangguan, work order lapangan, aktivitas tim, material/asset, dan resolusi terakhir."
        actions={pageActions}
      />

      <section aria-label="Identitas customer" className="card-tier-1 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muteStrong">Snapshot Customer</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-mute">ID Lookup</p>
                <p className="mt-1 font-semibold text-inkStrong">{customerIdentity.id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-mute">Nama</p>
                <p className="mt-1 font-semibold text-inkStrong">{customerIdentity.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-mute">Subscription</p>
                <p className="mt-1 font-semibold text-inkStrong">{customerIdentity.subscription || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-mute">Phone</p>
                <p className="mt-1 font-semibold text-inkStrong">{customerIdentity.phone || '-'}</p>
              </div>
            </div>
          </div>
          <StatusBadge tone="info" label="Customer History" size="md" />
        </div>
      </section>

      <section aria-label="Ringkasan cepat" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-tier-2 border border-line bg-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">Ticket Gangguan</p>
          <p className="mt-2 text-3xl font-semibold text-inkStrong">{ttRows.length}</p>
          <p className="mt-2 text-sm leading-6 text-mute">Trouble ticket terhubung ke nama customer ini.</p>
        </div>
        <div className="card-tier-2 border border-line bg-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">Work Order Lapangan</p>
          <p className="mt-2 text-3xl font-semibold text-inkStrong">{woRows.length}</p>
          <p className="mt-2 text-sm leading-6 text-mute">Work order field yang mencantumkan nama customer.</p>
        </div>
        <div className="card-tier-2 border border-line bg-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">Aktivitas Harian</p>
          <p className="mt-2 text-3xl font-semibold text-inkStrong">—</p>
          <p className="mt-2 text-sm leading-6 text-mute">Lihat bagian Integration Gap Daily Activity di bawah.</p>
        </div>
        <div className="card-tier-2 border border-line bg-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">Asset / Material</p>
          <p className="mt-2 text-3xl font-semibold text-inkStrong">—</p>
          <p className="mt-2 text-sm leading-6 text-mute">Lihat bagian Integration Gap Asset & Material di bawah.</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section aria-label="Layanan & Subscription" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Layanan / Subscription
                </p>
                <p className="mt-1 text-xs text-mute">Paket layanan, nomor internet, dan status aktif customer.</p>
              </div>
              <StatusBadge tone="warning" label="GAP" size="sm" />
            </div>
            <div className="mt-5">
              <GapCard
                title="Customer ↔ Service Subscription belum terhubung via join canonical."
                reason="Kolom referensi customer_id pada tabel service_subscriptions / sales_subscriptions atau join kolom customer_name canonical belum tersedia untuk query yang andal. Tidak ada data fabricate; tampilan ini sengaja jujur menandai integration gap."
                hint="Jika di kemudian hari tersedia foreign key customer_id, section ini akan otomatis terisi setelah source query ditambahkan (tanpa alter table produksi saat ini)."
              />
            </div>
          </section>

          <section aria-label="Trouble Ticket customer" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Trouble Ticket Terkait
                </p>
                <p className="mt-1 text-xs text-mute">
                  {ttRows.length
                    ? `${ttRows.length} ticket terakhir yang cocok dengan nama customer "${customerIdentity.name || customerId}".`
                    : 'Daftar ticket gangguan yang mengacu ke customer ini.'}
                </p>
              </div>
              <StatusBadge tone="neutral" label={String(ttRows.length)} size="sm" />
            </div>
            <div className="mt-5 space-y-3">
              {ttRows.length ? (
                ttRows.map((row) => (
                  <Link
                    key={`tt-${row.id}`}
                    href={`/dashboard/tracking/trouble-tickets/${row.id}`}
                    className="block rounded-control border border-line bg-cardSubtle px-4 py-3 transition hover:border-lineStrong"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-inkStrong">
                        {row.ticketCode || `TT #${row.id}`}
                      </p>
                      <StatusBadge tone={buildTtStatusTone(row.status)} label={row.status || 'DRAFT'} size="sm" />
                    </div>
                    <p className="mt-1 text-sm leading-6 text-mute">
                      {[row.type, row.category].filter(Boolean).join(' • ') || 'Trouble Ticket'}
                      {row.openedAt ? ` • Dibuka ${row.openedAt}` : ''}
                      {row.closedAt ? ` • Ditutup ${row.closedAt}` : ''}
                    </p>
                  </Link>
                ))
              ) : source.effectiveMode === 'review-db' && !source.isFallback ? (
                <EmptyCard
                  title="Belum ada trouble ticket yang cocok dengan lookup customer ini."
                  subtitle="Nama customer pada ticket mungkin berbeda format atau ticket belum dibuat."
                />
              ) : (
                <EmptyCard
                  title="Mode Review DB belum aktif."
                  subtitle="Daftar ticket gangguan hanya tersedia jika review database terhubung (tanpa fabrication / mock data)."
                />
              )}
            </div>
          </section>

          <section aria-label="Work Order customer" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Work Order Lapangan Terkait
                </p>
                <p className="mt-1 text-xs text-mute">
                  {woRows.length
                    ? `${woRows.length} work order terakhir yang mencantumkan nama customer "${customerIdentity.name || customerId}".`
                    : 'Daftar WO field untuk customer ini.'}
                </p>
              </div>
              <StatusBadge tone="neutral" label={String(woRows.length)} size="sm" />
            </div>
            <div className="mt-5 space-y-3">
              {woRows.length ? (
                woRows.map((row) => (
                  <Link
                    key={`wo-${row.id}`}
                    href={`/dashboard/tracking/work-orders/${row.id}`}
                    className="block rounded-control border border-line bg-cardSubtle px-4 py-3 transition hover:border-lineStrong"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-inkStrong">
                        {row.workOrderNo || `WO #${row.id}`}
                      </p>
                      <StatusBadge tone={buildWoStatusTone(row.status)} label={row.status || 'OPEN'} size="sm" />
                    </div>
                    <p className="mt-1 text-sm leading-6 text-mute">
                      {[row.jobCategory, row.workType].filter(Boolean).join(' • ') || 'Field Work Order'}
                      {row.scheduledAt ? ` • Jadwal ${row.scheduledAt}` : ''}
                    </p>
                  </Link>
                ))
              ) : source.effectiveMode === 'review-db' && !source.isFallback ? (
                <EmptyCard
                  title="Belum ada work order yang cocok dengan lookup customer ini."
                  subtitle="Tim field mungkin belum membuat WO dari ticket atau WO dicatat dengan format nama customer berbeda."
                />
              ) : (
                <EmptyCard
                  title="Mode Review DB belum aktif."
                  subtitle="Daftar work order hanya tersedia jika review database terhubung (tanpa fabrication / mock data)."
                />
              )}
            </div>
          </section>

          <section aria-label="Resolusi & Close Notes" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Resolusi & Close Notes
                </p>
                <p className="mt-1 text-xs text-mute">Rangkuman tindakan resolusi dari TT/WO close terbaru untuk customer.</p>
              </div>
              <StatusBadge tone="warning" label="GAP" size="sm" />
            </div>
            <div className="mt-5">
              <GapCard
                title="Customer ↔ Close Notes agregasi belum tersedia."
                reason="Agregasi field `close_notes` + `resolution_action` per ticket untuk satu customer membutuhkan join dengan identitas customer yang andal (canonical ID). Menggunakan LIKE customer_name berisiko false positive. Bagian ini ditandai gap bukan karena tidak ada datanya, tapi karena join integrity belum terjamin."
                hint="Buka masing-masing Trouble Ticket untuk membaca close notes secara verbatim."
              />
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section aria-label="Daily Activity history" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Daily Activity Tim
                </p>
                <p className="mt-1 text-xs text-mute">Catatan aktivitas harian teknisi / CS yang bersentuhan dengan customer.</p>
              </div>
              <StatusBadge tone="warning" label="GAP" size="sm" />
            </div>
            <div className="mt-5">
              <GapCard
                title="Customer ↔ Daily Activity belum terhubung via kolom referensi canonical."
                reason="Tabel daily_activity_records (atau domain pencatatan activity) belum menyimpan customer_id / trouble_ticket_id / work_order_id dengan FK terverifikasi pada query history aggregator ini. Tanpa kolom itu, kita tidak bisa mencocokkan activity ke customer tanpa fabrication."
                hint="Data activity individual masih tersedia pada halaman Daily Activity per teknisi / per tanggal."
              />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Link
                href="/dashboard/daily-activity"
                className="btn-secondary tap-44 focus-visible:shadow-focus"
              >
                Buka Daily Activity
              </Link>
            </div>
          </section>

          <section aria-label="Material / Asset usage history" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Material & Asset
                </p>
                <p className="mt-1 text-xs text-mute">Perangkat yang dipasang / diganti, serta material yang terpakai untuk customer.</p>
              </div>
              <StatusBadge tone="warning" label="GAP" size="sm" />
            </div>
            <div className="mt-5">
              <GapCard
                title="Customer ↔ Inventory Movements / Device Lifecycle belum terintegrasi via lookup canonical."
                reason="Stock movement dan device lifecycle records sudah menyimpan work_order_id / trouble_ticket_id (bagian dari WO/TT terkait). Tapi aggregasi ke customer membutuhkan hop WO → customer / TT → customer yang belum divalidasi integrity-nya untuk halaman ini; jadi tidak ditampilkan agar tidak menyesatkan."
                hint="Buka detail Tracking Work Order / Trouble Ticket untuk melihat inventory movements dan device lifecycle terkait pekerjaan itu secara verbatim."
              />
            </div>
          </section>

          <section aria-label="Customer Quick Actions" className="card-tier-2 border border-line p-4 sm:p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">Aksi Cepat CS</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-1">
              <Link
                href={`/support?lane=tt&focus=OPEN_TICKETS&customer=${encodeURIComponent(customerIdentity.name || customerId)}`}
                className="btn-secondary tap-44 focus-visible:shadow-focus text-center"
              >
                Lihat Antre Ticket Customer
              </Link>
              <Link
                href={`/sales#sales-action-work-order-create`}
                className="btn-secondary tap-44 focus-visible:shadow-focus text-center"
              >
                Buat Work Order Baru (dari Sales)
              </Link>
              <Link
                href="/support?lane=tt"
                className="btn-ghost tap-44 focus-visible:shadow-focus text-center"
              >
                Lane Support TT
              </Link>
              <Link
                href="/customers/cs-admin"
                className="btn-ghost tap-44 focus-visible:shadow-focus text-center"
              >
                Workspace CS Admin
              </Link>
            </div>
          </section>

          <section aria-label="Legend status integrasi" className="card-tier-2 border border-dashed border-line bg-surfaceSoft p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muteStrong">Legend Coverage</p>
            <div className="mt-4 space-y-2 text-sm leading-6 text-mute">
              <p>
                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border-emerald-200 bg-emerald-50 text-emerald-700 mr-2">CONNECTED</span>
                Data benar-benar berasal dari review DB canonical dengan kolom yang telah di-audit.
              </p>
              <p>
                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border-amber-200 bg-amber-50 text-amber-700 mr-2">NOT_CONNECTED</span>
                Join integrity belum cukup kuat untuk ditampilkan; sengaja tidak memakai data mock apapun.
              </p>
              <p>
                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border-slate-200 bg-white text-slate-700 mr-2">EMPTY</span>
                Review DB aktif tapi query tidak mengembalikan hasil (tidak berarti nol data, hanya tidak cocok dengan lookup ini).
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
