import type { DomainReviewSection } from '@/lib/types'

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

export function InventoryStockReceiptPanel({
  sections,
}: {
  sections: DomainReviewSection[]
}) {
  const movementSection =
    sections.find((section) => section.title.toUpperCase().includes('STOCK MOVEMENT')) ?? null

  if (!movementSection) {
    return null
  }

  const inboundRows = movementSection.rows.filter((row) => row.status.trim().toUpperCase() === 'IN')
  if (!inboundRows.length) {
    return null
  }

  const totalQty = inboundRows.reduce((sum, row) => {
    const qty = Number.parseInt(pickMeta(row.meta, 'Qty: '), 10)
    return sum + (Number.isFinite(qty) ? qty : 0)
  }, 0)

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Ringkasan Barang Masuk</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Penerimaan stok terbaru yang mudah dipantau
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini memisahkan arus barang masuk dari movement lain, sehingga gudang bisa langsung
            memeriksa penerimaan stok tanpa membaca `OUT` atau `ADJUSTMENT`.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">{inboundRows.length} transaksi</span>
          <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">{totalQty} qty masuk</span>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {inboundRows.map((row) => {
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
                <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Barang Masuk</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-mute">{row.detail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="badge border-slate-200 bg-white text-slate-600">Qty: {qty || '-'}</span>
                <span className="badge border-slate-200 bg-white text-slate-600">Ref: {ref || '-'}</span>
                <span className="badge border-slate-200 bg-white text-slate-600">Harga: {price || '-'}</span>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
