import { InventoryStockMovementForm } from '@/components/inventory-stock-movement-form'
import { InventoryStockReceiptForm } from '@/components/inventory-stock-receipt-form'
import type { DomainReviewSection } from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function normalizeText(value: string) {
  return value.trim().toUpperCase()
}

function getMovementTone(value: string) {
  const normalized = normalizeText(value)
  if (normalized === 'IN') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (normalized === 'OUT') {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  return 'border-amber-200 bg-amber-50 text-amber-700'
}

function hasHandoverProof(detail: string) {
  return /\[HANDOVER\].*\[PROOF\]/i.test(detail)
}

export function InventoryStockReceiptPanel({
  sections,
  canCreate,
  reviewDbReady,
  itemSuggestions,
  rackSuggestions,
  requireScan,
  initialItemValue,
  focusAction,
}: {
  sections: DomainReviewSection[]
  canCreate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  rackSuggestions: string[]
  requireScan: boolean
  initialItemValue?: string
  focusAction?: 'stock-receipt' | 'stock-movement' | null
}) {
  const movementSection =
    sections.find((section) => section.title.toUpperCase().includes('STOCK MOVEMENT')) ?? null

  if (!movementSection) {
    return null
  }

  const inboundRows = movementSection.rows.filter((row) => normalizeText(row.primary) === 'IN')
  const outboundRows = movementSection.rows.filter((row) => normalizeText(row.primary) === 'OUT')
  const handoverRows = movementSection.rows.filter((row) => hasHandoverProof(row.detail))
  const adjustmentRows = movementSection.rows.filter((row) => normalizeText(row.primary) === 'ADJUSTMENT')
  const isReceiptFocus = focusAction === 'stock-receipt'
  const isMovementFocus = focusAction === 'stock-movement'
  const visibleRows = isReceiptFocus
    ? inboundRows
    : isMovementFocus
      ? movementSection.rows.filter((row) => normalizeText(row.primary) !== 'IN')
      : movementSection.rows

  const totalQty = inboundRows.reduce((sum, row) => {
    const qty = Number.parseInt(pickMeta(row.meta, 'Qty: '), 10)
    return sum + (Number.isFinite(qty) ? qty : 0)
  }, 0)
  const totalOutboundQty = outboundRows.reduce((sum, row) => {
    const qty = Number.parseInt(pickMeta(row.meta, 'Qty: '), 10)
    return sum + (Number.isFinite(qty) ? qty : 0)
  }, 0)

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Stock & Movement</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            {isReceiptFocus ? 'Barang masuk untuk menambah stok gudang' : isMovementFocus ? 'Barang keluar dan adjustment stok' : 'Barang masuk dan movement stok dalam satu workspace'}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            {isReceiptFocus
              ? 'Halaman ini difokuskan untuk pencatatan receipt barang masuk agar proses penambahan stok gudang tidak bercampur dengan arus barang keluar.'
              : isMovementFocus
                ? 'Halaman ini difokuskan untuk barang keluar, retur, dan adjustment stok agar perubahan arus keluar bisa diproses dari satu workspace operasional.'
                : 'Workspace ini menyatukan pencatatan barang masuk dan stock movement agar gudang tidak berpindah konteks saat mengelola arus stok harian.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">{visibleRows.length} transaksi</span>
          <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">{totalQty} qty masuk</span>
          {!isReceiptFocus ? <span className="badge border-sky-200 bg-sky-50 text-sky-700">{totalOutboundQty} qty keluar</span> : null}
          {!isReceiptFocus && handoverRows.length ? (
            <span className="badge border-violet-200 bg-violet-50 text-violet-700">{handoverRows.length} handover</span>
          ) : null}
        </div>
      </div>

      <div className={`mt-6 grid gap-3 ${isReceiptFocus ? 'xl:grid-cols-2' : 'xl:grid-cols-4'}`}>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Barang Masuk</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-900">{inboundRows.length}</p>
          <p className="mt-2 text-sm leading-6 text-emerald-800">Transaksi penerimaan stok yang tercatat pada review terbaru.</p>
        </article>
        {!isReceiptFocus ? (
        <article className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">Barang Keluar</p>
          <p className="mt-2 text-3xl font-semibold text-sky-900">{outboundRows.length}</p>
          <p className="mt-2 text-sm leading-6 text-sky-800">Movement keluar yang memengaruhi alokasi barang ke lapangan atau tujuan lain.</p>
        </article>
        ) : null}
        {!isReceiptFocus ? (
        <article className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">Bukti Handover</p>
          <p className="mt-2 text-3xl font-semibold text-violet-900">{handoverRows.length}</p>
          <p className="mt-2 text-sm leading-6 text-violet-800">Movement yang sudah menyimpan jejak serah-terima dan referensi bukti.</p>
        </article>
        ) : null}
        {!isReceiptFocus ? (
        <article className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Adjustment</p>
          <p className="mt-2 text-3xl font-semibold text-amber-900">
            {adjustmentRows.length}
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-800">Penyesuaian stok yang perlu dibaca bersama arus barang masuk dan keluar.</p>
        </article>
        ) : null}
      </div>

      <article className="mt-6 rounded-2xl border border-line bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi Workspace</p>
        <div className={`mt-4 grid gap-4 ${isReceiptFocus || isMovementFocus ? 'xl:grid-cols-1' : 'xl:grid-cols-2'}`}>
          {!isMovementFocus ? (
          <div id="inventory-action-stock-receipt" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4">
            <InventoryStockReceiptForm
              canCreate={canCreate}
              reviewDbReady={reviewDbReady}
              itemSuggestions={itemSuggestions}
              initialItemValue={initialItemValue}
              embedded
            />
          </div>
          ) : null}
          {!isReceiptFocus ? (
          <div id="inventory-action-stock-movement" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4">
            <InventoryStockMovementForm
              canCreate={canCreate}
              reviewDbReady={reviewDbReady}
              itemSuggestions={itemSuggestions}
              rackSuggestions={rackSuggestions}
              requireScan={requireScan}
              initialItemValue={initialItemValue}
              embedded
            />
          </div>
          ) : null}
        </div>
      </article>

      <div className="mt-6 space-y-3">
        {visibleRows.map((row) => {
          const qty = pickMeta(row.meta, 'Qty: ')
          const ref = pickMeta(row.meta, 'Ref: ')
          const price = pickMeta(row.meta, 'Harga: ')

          return (
            <article key={row.id} className="rounded-2xl border border-line bg-slate-50 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                  <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                </div>
                <span className={`badge ${getMovementTone(row.primary)}`}>{row.primary}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-mute">{row.detail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="badge border-slate-200 bg-white text-slate-600">Qty: {qty || '-'}</span>
                <span className="badge border-slate-200 bg-white text-slate-600">Ref: {ref || '-'}</span>
                <span className="badge border-slate-200 bg-white text-slate-600">Harga: {price || '-'}</span>
                {hasHandoverProof(row.detail) ? (
                  <span className="badge border-violet-200 bg-violet-50 text-violet-700">Bukti handover tercatat</span>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
