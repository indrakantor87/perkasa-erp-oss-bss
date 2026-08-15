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
          <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink-strong)]">Kunci tampilan antrean melalui URL</h3>
          <p className="mt-2 text-sm leading-6 text-mute">
            Semua filter memakai query parameter agar tautan bisa dibagikan ke tim dengan konteks yang sama.
          </p>
        </div>
        <Link
          href={resetHref}
          className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
        >
          Reset filter
        </Link>
      </div>

      <form className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-2">
          <span className="form-field-label">Antrean</span>
          <select
            name="queue"
            defaultValue={state.queue}
            className="form-field"
          >
            {queueOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="form-field-label">Domain</span>
          <select
            name="domain"
            defaultValue={state.domain || ''}
            className="form-field"
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
          <span className="form-field-label">Prioritas</span>
          <select
            name="priority"
            defaultValue={state.priority || ''}
            className="form-field"
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
          <span className="form-field-label">Status</span>
          <select
            name="status"
            defaultValue={state.status || ''}
            className="form-field"
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
          <span className="form-field-label">Customer atau keyword</span>
          <input
            type="text"
            name="q"
            defaultValue={state.q || ''}
            placeholder="Nama customer, kode ticket, work order, lead"
            className="form-field placeholder:text-mute"
          />
        </label>

        <label className="surface-soft flex items-center gap-3 rounded-xl border px-4 py-3">
          <input type="checkbox" name="mine" value="1" defaultChecked={state.mine} className="h-4 w-4 rounded accent-[var(--color-accent)]" />
          <span className="text-sm text-[var(--color-mute-strong)]">Hanya item saya</span>
        </label>

        <label className="surface-soft flex items-center gap-3 rounded-xl border px-4 py-3">
          <input
            type="checkbox"
            name="overdue"
            value="1"
            defaultChecked={state.overdue}
            className="h-4 w-4 rounded accent-[var(--color-accent)]"
          />
          <span className="text-sm text-[var(--color-mute-strong)]">Hanya item overdue / kritikal</span>
        </label>

        <div className="xl:col-span-4">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
          >
            Terapkan filter
          </button>
        </div>
      </form>
    </section>
  )
}
