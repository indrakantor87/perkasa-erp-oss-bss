import Link from 'next/link'
import type { WorklistItem } from '@/lib/types'
import { buildWorklistQueryHref, type WorklistQueryState } from '@/components/worklist/worklist-query'

type WorklistTableProps = {
  items: WorklistItem[]
  selectedItemId?: string
  state: WorklistQueryState
}

const priorityTone: Record<WorklistItem['priority'], string> = {
  tinggi: 'bg-rose-50 text-rose-700',
  sedang: 'bg-amber-50 text-amber-700',
  rendah: 'bg-emerald-50 text-emerald-700',
}

export function WorklistTable({ items, selectedItemId, state }: WorklistTableProps) {
  if (!items.length) {
    return (
      <section className="panel p-6">
        <p className="section-title">Daftar Item</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">Tidak ada item pada kombinasi filter ini</h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-mute">
          Coba longgarkan filter queue, domain, atau keyword. Jika hasil tetap kosong, memang belum ada item yang masuk ke queue tersebut.
        </p>
      </section>
    )
  }

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">Daftar Item</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Tabel kerja yang bisa dipilih satu per satu</h3>
        </div>
        <span className="badge border-slate-200 bg-white text-slate-600">{items.length} item</span>
      </div>

      <div className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 xl:block">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              <th className="px-4 py-3">Prioritas</th>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Queue</th>
              <th className="px-4 py-3">Judul</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {items.map((item) => {
              const active = item.id === selectedItemId
              const selectHref = buildWorklistQueryHref({
                ...state,
                selected: item.id,
              })

              return (
                <tr key={item.id} className={active ? 'bg-slate-50' : ''}>
                  <td className="px-4 py-4 align-top">
                    <span className={`badge ${priorityTone[item.priority]}`}>{item.priority}</span>
                  </td>
                  <td className="px-4 py-4 align-top text-sm font-medium text-slate-700">{item.domain}</td>
                  <td className="px-4 py-4 align-top text-sm text-slate-700">{item.queue}</td>
                  <td className="px-4 py-4 align-top">
                    <Link href={selectHref} className="block space-y-1 hover:opacity-90">
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.subtitle}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span className="badge border-transparent bg-slate-950 text-white">{item.status}</span>
                  </td>
                  <td className="px-4 py-4 align-top text-sm leading-6 text-mute">{item.detail}</td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-col gap-2">
                      <Link
                        href={selectHref}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                      >
                        Lihat detail
                      </Link>
                      <Link
                        href={item.href}
                        className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        {item.actionLabel}
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-4 xl:hidden">
        {items.map((item) => {
          const active = item.id === selectedItemId
          const selectHref = buildWorklistQueryHref({
            ...state,
            selected: item.id,
          })

          return (
            <article key={item.id} className={`rounded-3xl border p-5 ${active ? 'border-slate-950 bg-slate-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge border-slate-200 bg-white text-slate-600">{item.domain}</span>
                <span className={`badge ${priorityTone[item.priority]}`}>{item.priority}</span>
                <span className="badge border-transparent bg-slate-950 text-white">{item.status}</span>
              </div>
              <p className="mt-4 text-base font-semibold text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{item.subtitle}</p>
              <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
              <div className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">{item.queue}</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={selectHref}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  Lihat detail
                </Link>
                <Link
                  href={item.href}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {item.actionLabel}
                </Link>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
