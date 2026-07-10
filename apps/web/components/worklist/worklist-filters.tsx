import Link from 'next/link'
import { buildWorklistQueryHref, type WorklistQueryState } from '@/components/worklist/worklist-query'

type WorklistFiltersProps = {
  state: WorklistQueryState
  queueOptions: string[]
}

const domainOptions = ['Sales', 'Customers', 'Support', 'Inventory', 'Import']
const priorityOptions = ['tinggi', 'sedang', 'rendah']
const statusOptions = ['OPEN', 'PENDING', 'REVIEW', 'READY', 'MONITOR', 'CLOSED']

export function WorklistFilters({ state, queueOptions }: WorklistFiltersProps) {
  const resetHref = buildWorklistQueryHref({ queue: state.queue })

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Filter Global</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Kunci tampilan queue melalui URL</h3>
          <p className="mt-2 text-sm leading-6 text-mute">
            Semua filter memakai query parameter agar tautan bisa dibagikan ke tim dengan konteks yang sama.
          </p>
        </div>
        <Link
          href={resetHref}
          className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
        >
          Reset filter
        </Link>
      </div>

      <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Queue</span>
          <select
            name="queue"
            defaultValue={state.queue}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
          >
            {queueOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Domain</span>
          <select
            name="domain"
            defaultValue={state.domain || ''}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
          >
            <option value="">Semua domain</option>
            {domainOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Prioritas</span>
          <select
            name="priority"
            defaultValue={state.priority || ''}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
          >
            <option value="">Semua prioritas</option>
            {priorityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Status</span>
          <select
            name="status"
            defaultValue={state.status || ''}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-slate-400"
          >
            <option value="">Semua status</option>
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 xl:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Customer atau keyword</span>
          <input
            type="text"
            name="q"
            defaultValue={state.q || ''}
            placeholder="Nama customer, kode ticket, work order, lead"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input type="checkbox" name="mine" value="1" defaultChecked={state.mine} className="h-4 w-4 rounded border-slate-300" />
          <span className="text-sm text-slate-700">Hanya item saya</span>
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <input
            type="checkbox"
            name="overdue"
            value="1"
            defaultChecked={state.overdue}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">Hanya item overdue / kritikal</span>
        </label>

        <div className="xl:col-span-4">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Terapkan filter
          </button>
        </div>
      </form>
    </section>
  )
}
