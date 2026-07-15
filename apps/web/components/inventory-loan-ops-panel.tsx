import { InventoryItemLoanForm } from '@/components/inventory-item-loan-form'
import { InventoryLoanReturnForm } from '@/components/inventory-loan-return-form'
import type { DomainReviewRow, DomainReviewSection } from '@/lib/types'

function findSection(sections: DomainReviewSection[], keyword: string) {
  return sections.find((section) => section.title.toUpperCase().includes(keyword.toUpperCase())) ?? null
}

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function getStatusTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('RETURNED') || normalized.includes('DIKEMBALIKAN')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (normalized.includes('PARTIAL')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (normalized.includes('OVERDUE')) {
    return 'border-rose-200 bg-rose-50 text-rose-700'
  }
  return 'border-sky-200 bg-sky-50 text-sky-700'
}

function buildCountMap(rows: DomainReviewRow[]) {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = row.status.trim() || 'UNKNOWN'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return Array.from(map.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => ({ label, count }))
}

export function InventoryLoanOpsPanel({
  sections,
  canCreate,
  canUpdate,
  reviewDbReady,
  itemSuggestions,
  rackSuggestions,
  loanSuggestions,
  requireScan,
  initialItemValue,
  initialLoanValue,
}: {
  sections: DomainReviewSection[]
  canCreate: boolean
  canUpdate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  rackSuggestions: string[]
  loanSuggestions: string[]
  requireScan: boolean
  initialItemValue?: string
  initialLoanValue?: string
}) {
  const loanSection = findSection(sections, 'PINJAMAN INVENTORY')
  if (!loanSection) {
    return null
  }

  const overdueRows = loanSection.rows.filter((row) => row.status.toUpperCase().includes('OVERDUE'))
  const partialRows = loanSection.rows.filter((row) => row.status.toUpperCase().includes('PARTIAL'))
  const statusItems = buildCountMap(loanSection.rows)

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Pinjaman Dan Pengembalian</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Kontrol barang pinjam yang wajib kembali
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini memisahkan barang habis pakai dari barang yang harus kembali ke gudang. Fokus
            utamanya adalah pinjaman aktif, keterlambatan pengembalian, dan progress return sebagian.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">
            {loanSection.rows.length} pinjaman
          </span>
          {partialRows.length ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">
              {partialRows.length} return sebagian
            </span>
          ) : null}
          {overdueRows.length ? (
            <span className="badge border-rose-200 bg-rose-50 text-rose-700">
              {overdueRows.length} overdue
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-line bg-slate-50 p-5 xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi Workspace</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div id="inventory-action-item-loan" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4">
              <InventoryItemLoanForm
                canCreate={canCreate}
                reviewDbReady={reviewDbReady}
                itemSuggestions={itemSuggestions}
                rackSuggestions={rackSuggestions}
                requireScan={requireScan}
                initialItemValue={initialItemValue}
                embedded
              />
            </div>
            <div id="inventory-action-loan-return" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4">
              <InventoryLoanReturnForm
                canUpdate={canUpdate}
                reviewDbReady={reviewDbReady}
                loanSuggestions={loanSuggestions}
                initialLoanValue={initialLoanValue}
                embedded
              />
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Ringkasan Status</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {statusItems.map((item) => (
              <span key={item.label} className={`badge ${getStatusTone(item.label)}`}>
                {item.label}: {item.count}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Pinjaman Terbaru</p>
          <div className="mt-4 space-y-3">
            {loanSection.rows.map((row) => {
              const borrower = pickMeta(row.meta, 'Peminjam: ')
              const dueAt = pickMeta(row.meta, 'Jatuh Tempo: ')
              const remainingQty = pickMeta(row.meta, 'Sisa Pinjam: ')

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
                    <span className="badge border-slate-200 bg-white text-slate-600">
                      Peminjam: {borrower || '-'}
                    </span>
                    <span className="badge border-slate-200 bg-white text-slate-600">
                      Sisa Pinjam: {remainingQty || '-'}
                    </span>
                    <span className="badge border-slate-200 bg-white text-slate-600">
                      Jatuh Tempo: {dueAt || '-'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </div>
    </section>
  )
}
