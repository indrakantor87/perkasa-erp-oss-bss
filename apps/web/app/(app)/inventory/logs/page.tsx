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

      <section className="grid gap-4 md:grid-cols-4">
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Movement</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {movementRows.length}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Barang masuk</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {inboundCount}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Barang keluar</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {outboundCount}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Request pending</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {pendingRequestCount}
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="panel p-6">
          <p className="section-title">Movement Log</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Movement stok terbaru
          </h2>
          <div className="mt-4 space-y-3">
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
        </article>

        <article className="panel p-6">
          <p className="section-title">Request Log</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Request barang terbaru
          </h2>
          <div className="mt-4 space-y-3">
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
        </article>
      </section>
    </div>
  )
}
