import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import type { DomainReviewRow, DomainReviewSection } from '@/lib/types'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveIntegerParam(value: string | string[] | undefined) {
  const raw = resolveSearchParam(value)
  const parsed = Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function buildLogTabHref(
  nextTab: 'movement' | 'request',
  query: { focus?: string; month?: number; year?: number },
) {
  const params = new URLSearchParams()
  if (nextTab !== 'movement') params.set('logTab', nextTab)
  if (query.focus) params.set('focus', query.focus)
  if (query.month != null) params.set('month', String(query.month))
  if (query.year != null) params.set('year', String(query.year))
  const qs = params.toString()
  return `/inventory/logs${qs ? `?${qs}` : ''}`
}

function findSection(sections: DomainReviewSection[], keyword: string) {
  return sections.find((section) => section.title.toUpperCase().includes(keyword.toUpperCase())) ?? null
}

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function normalizeText(value: string) {
  return value.trim().toUpperCase()
}

function getStatusTone(status: string) {
  const normalized = normalizeText(status)
  if (normalized.includes('SELESAI') || normalized.includes('DONE') || normalized.includes('COMPLETE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (normalized.includes('PENDING') || normalized.includes('REVIEW')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (normalized.includes('OUT') || normalized.includes('PROGRESS')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  return 'border-slate-200 bg-white text-slate-600'
}

function getMovementTone(value: string) {
  const normalized = normalizeText(value)
  if (normalized === 'IN') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (normalized === 'OUT') return 'border-sky-200 bg-sky-50 text-sky-700'
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

export default async function InventoryLogsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    focus?: string | string[]
    month?: string | string[]
    year?: string | string[]
    logTab?: string | string[]
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

  if (!payload) {
    notFound()
  }

  const sections = payload.content.reviewSections ?? []
  const movementSection = findSection(sections, 'STOCK MOVEMENT')
  const requestSection = findSection(sections, 'REQUEST INVENTORY')
  const movementRows = movementSection?.rows ?? []
  const requestRows = requestSection?.rows ?? []
  const inboundCount = movementRows.filter((row) => normalizeText(row.primary) === 'IN').length
  const outboundCount = movementRows.filter((row) => normalizeText(row.primary) === 'OUT').length
  const pendingRequestCount = requestRows.filter((row) => normalizeText(row.status).includes('PENDING')).length
  const completedRequestCount = requestRows.filter(
    (row) =>
      normalizeText(row.status).includes('SELESAI') ||
      normalizeText(row.status).includes('COMPLETE') ||
      normalizeText(row.status).includes('DONE'),
  ).length

  const rawLogTab = resolveSearchParam(resolvedSearchParams.logTab)?.toUpperCase() ?? 'MOVEMENT'
  const activeTab: 'movement' | 'request' = rawLogTab === 'REQUEST' ? 'request' : 'movement'
  const focusQuery = resolveSearchParam(resolvedSearchParams.focus)
  const monthQuery = resolvePositiveIntegerParam(resolvedSearchParams.month)
  const yearQuery = resolvePositiveIntegerParam(resolvedSearchParams.year)
  const movementHref = buildLogTabHref('movement', { focus: focusQuery, month: monthQuery, year: yearQuery })
  const requestHref = buildLogTabHref('request', { focus: focusQuery, month: monthQuery, year: yearQuery })

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />

      <section className="panel p-6">
        <p className="section-title">Log Aktivitas Inventory</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              Aktivitas request dan movement inventory terbaru
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Halaman ini tidak lagi menjadi landing penghubung. Log aktivitas sekarang langsung menampilkan jejak request barang
              dan movement stok yang terbaca dari review DB.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventory/requests"
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Buka request
            </Link>
            <Link
              href="/inventory/movements"
              className="rounded-full border border-slate-950 bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Buka barang keluar
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Movement</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            {movementRows.length}
          </p>
        </article>
        <article className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Barang masuk</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            {inboundCount}
          </p>
        </article>
        <article className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Barang keluar</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            {outboundCount}
          </p>
        </article>
        <article className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Request pending</p>
          <p className="mt-3 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            {pendingRequestCount}
          </p>
        </article>
      </section>

      <section className="panel p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-title">Aktivitas Terbaru</p>
              <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
                {activeTab === 'movement'
                  ? 'Movement stok terbaru'
                  : 'Request barang terbaru'}
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="badge border-sky-200 bg-sky-50 text-sky-700">
                Movement: {movementRows.length}
              </span>
              <span className="badge border-amber-200 bg-amber-50 text-amber-700">
                Request pending: {pendingRequestCount}
              </span>
              <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                Request selesai: {completedRequestCount}
              </span>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Pilih tampilan log inventory"
            className="inline-flex w-full overflow-hidden rounded-2xl border border-line bg-surfaceMuted/40 p-1 sm:w-auto"
          >
            <Link
              role="tab"
              aria-selected={activeTab === 'movement'}
              href={movementHref}
              className={
                'inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition sm:flex-none ' +
                (activeTab === 'movement'
                  ? 'bg-slate-950 text-white shadow-sm ring-1 ring-slate-950/5'
                  : 'text-slate-700 hover:bg-surface hover:text-slate-950')
              }
            >
              <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70" aria-hidden />
              Movement Log
            </Link>
            <Link
              role="tab"
              aria-selected={activeTab === 'request'}
              href={requestHref}
              className={
                'inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition sm:flex-none ' +
                (activeTab === 'request'
                  ? 'bg-slate-950 text-white shadow-sm ring-1 ring-slate-950/5'
                  : 'text-slate-700 hover:bg-surface hover:text-slate-950')
              }
            >
              <span className="inline-block h-2 w-2 rounded-full bg-current opacity-70" aria-hidden />
              Request Log
            </Link>
          </div>

          <div className="mt-2">
            {activeTab === 'movement' ? (
              <div className="space-y-3">
                {movementRows.length ? (
                  movementRows.slice(0, 8).map((row: DomainReviewRow) => {
                    const qty = pickMeta(row.meta, 'Qty: ')
                    const ref = pickMeta(row.meta, 'Ref: ')
                    return (
                      <div key={row.id} className="rounded-2xl border border-line bg-white p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{row.secondary}</p>
                            <p className="mt-1 text-sm text-mute">{row.detail}</p>
                          </div>
                          <span className={`badge ${getMovementTone(row.primary)}`}>{row.primary}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="badge border-slate-200 bg-white text-slate-600">Qty: {qty || '-'}</span>
                          <span className="badge border-slate-200 bg-white text-slate-600">Ref: {ref || '-'}</span>
                          <span className={`badge ${getStatusTone(row.status)}`}>{row.status || '-'}</span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-slate-500">Belum ada movement yang bisa ditampilkan.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {requestRows.length ? (
                  requestRows.slice(0, 8).map((row: DomainReviewRow) => {
                    const subdivision = pickMeta(row.meta, 'Sub-divisi: ')
                    const requestedFor = pickMeta(row.meta, 'Untuk: ')
                    return (
                      <div key={row.id} className="rounded-2xl border border-line bg-white p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                            <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                          </div>
                          <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-700">{row.detail}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="badge border-slate-200 bg-white text-slate-600">Sub-divisi: {subdivision || '-'}</span>
                          <span className="badge border-slate-200 bg-white text-slate-600">Untuk: {requestedFor || '-'}</span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-slate-500">Belum ada request yang bisa ditampilkan.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
