'use client'

import Link from 'next/link'
import { useState } from 'react'
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
  const [filtersOpen, setFiltersOpen] = useState(false)
  const anyActiveFilter =
    state.domain ||
    state.priority ||
    state.status ||
    state.q ||
    state.mine ||
    state.overdue

  return (
    <section aria-label="Worklist filters" className="card-tier-2 border border-line p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1 min-w-0">
          <p className="section-title">Filter Antrean</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="mt-1 text-lg font-semibold text-inkStrong sm:text-xl">
              Kunci tampilan antrean melalui URL
            </h3>
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              aria-expanded={filtersOpen}
              aria-controls="worklist-filters-form-panel"
              className="btn-base btn-ghost focus-visible:shadow-focus tap-44 inline-flex h-11 shrink-0 items-center gap-2 rounded-control border border-line bg-surfaceSoft px-4 text-sm font-medium text-ink transition hover:border-lineStrong lg:hidden"
            >
              {filtersOpen ? 'Tutup filter' : anyActiveFilter ? 'Filter aktif ▾' : 'Buka filter ▸'}
            </button>
          </div>
          <p className="mt-2 hidden text-sm leading-6 text-mute sm:block">
            Semua filter memakai query parameter agar tautan bisa dibagikan ke tim dengan konteks yang sama.
          </p>
        </div>
        <Link
          href={resetHref}
          aria-label="Reset semua filter worklist"
          className="btn-base btn-ghost focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control border border-line bg-surfaceSoft px-4 text-sm font-medium text-ink transition hover:border-lineStrong hover:text-inkStrong"
        >
          Reset filter
        </Link>
      </div>

      <form
        id="worklist-filters-form-panel"
        className={`grid gap-4 md:grid-cols-2 xl:grid-cols-4 ${filtersOpen ? 'mt-5' : 'hidden mt-0 md:mt-6 md:grid'}`}
      >
        <label className="space-y-1.5">
          <span className="form-field-label">Antrean</span>
          <select
            name="queue"
            defaultValue={state.queue}
            aria-label="Pilih antrean kerja"
            className="form-field"
          >
            {queueOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="form-field-label">Domain</span>
          <select
            name="domain"
            defaultValue={state.domain || ''}
            aria-label="Pilih domain kerja"
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

        <label className="space-y-1.5">
          <span className="form-field-label">Prioritas</span>
          <select
            name="priority"
            defaultValue={state.priority || ''}
            aria-label="Pilih prioritas item"
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

        <label className="space-y-1.5">
          <span className="form-field-label">Status</span>
          <select
            name="status"
            defaultValue={state.status || ''}
            aria-label="Pilih status item"
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

        <label className="space-y-1.5 xl:col-span-2">
          <span className="form-field-label">Customer atau keyword</span>
          <input
            type="text"
            name="q"
            defaultValue={state.q || ''}
            placeholder="Nama customer, kode ticket, work order, lead"
            aria-label="Cari customer atau keyword"
            className="form-field placeholder:text-mute"
          />
        </label>

        <label className="flex items-center gap-3 rounded-control border border-line bg-surfaceSoft px-4 py-3">
          <input
            type="checkbox"
            name="mine"
            value="1"
            defaultChecked={state.mine}
            aria-label="Hanya tampilkan item saya"
            className="h-4 w-4 rounded accent"
          />
          <span className="text-sm text-muteStrong">Hanya item saya</span>
        </label>

        <label className="flex items-center gap-3 rounded-control border border-line bg-surfaceSoft px-4 py-3">
          <input
            type="checkbox"
            name="overdue"
            value="1"
            defaultChecked={state.overdue}
            aria-label="Hanya tampilkan item overdue atau kritikal"
            className="h-4 w-4 rounded accent"
          />
          <span className="text-sm text-muteStrong">Hanya item overdue / kritikal</span>
        </label>

        <div className="xl:col-span-4 flex items-center gap-3">
          <button
            type="submit"
            aria-label="Terapkan filter worklist"
            className="btn-base btn-primary focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center rounded-control px-5 text-sm font-semibold transition hover:opacity-90"
          >
            Terapkan filter
          </button>
        </div>
      </form>
    </section>
  )
}
