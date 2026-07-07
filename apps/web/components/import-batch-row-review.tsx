'use client'

import { useMemo, useState } from 'react'
import type { BatchDetail } from '@/lib/types'

type ImportBatchRowReviewProps = {
  rows: BatchDetail['rows']
}

type RowStatus = BatchDetail['rows'][number]['status'] | 'ALL'
type RowDomain =
  | 'ALL'
  | 'USER'
  | 'CUSTOMER'
  | 'SALES'
  | 'SUPPORT'
  | 'BILLING'
  | 'INVENTORY'
  | 'HR'
  | 'OTHER'

const rowTone: Record<BatchDetail['rows'][number]['status'], string> = {
  PENDING: 'bg-slate-100 text-slate-700',
  MAPPED: 'bg-blue-50 text-blue-700',
  VALID: 'bg-emerald-50 text-emerald-700',
  INVALID: 'bg-rose-50 text-rose-700',
  IMPORTED: 'bg-violet-50 text-violet-700',
  SKIPPED: 'bg-amber-50 text-amber-700',
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

function resolveDomain(row: BatchDetail['rows'][number]): RowDomain {
  const target = row.targetId.trim().toLowerCase()
  if (target.startsWith('auth_users') || target.startsWith('hr_employees')) {
    return target.startsWith('auth_users') ? 'USER' : 'HR'
  }
  if (target.startsWith('crm_customers') || target.startsWith('crm_customer_addresses')) {
    return 'CUSTOMER'
  }
  if (target.startsWith('sales_orders') || target.startsWith('service_subscriptions') || target.startsWith('service_work_orders')) {
    return 'SALES'
  }
  if (target.startsWith('support_')) {
    return 'SUPPORT'
  }
  if (target.startsWith('billing_')) {
    return 'BILLING'
  }
  if (target.startsWith('inventory_') || target.startsWith('network_odp') || target.startsWith('network_odp_ports')) {
    return 'INVENTORY'
  }

  const idPrefix = row.id.includes('-') ? row.id.split('-')[0]?.toLowerCase() : ''
  if (idPrefix === 'user') return 'USER'
  if (idPrefix === 'customer' || idPrefix === 'address') return 'CUSTOMER'
  if (idPrefix === 'order' || idPrefix === 'subscription' || idPrefix === 'workorder') return 'SALES'
  if (idPrefix === 'support' || idPrefix === 'ticket' || idPrefix === 'isolation' || idPrefix === 'dismantle') return 'SUPPORT'
  if (idPrefix === 'invoice' || idPrefix === 'payment' || idPrefix === 'collection') return 'BILLING'
  if (idPrefix === 'item' || idPrefix === 'movement' || idPrefix === 'odp' || idPrefix === 'port') return 'INVENTORY'
  if (idPrefix === 'employee' || idPrefix === 'attendance' || idPrefix === 'salary' || idPrefix === 'loan') return 'HR'

  return 'OTHER'
}

export function ImportBatchRowReview({ rows }: ImportBatchRowReviewProps) {
  const [statusFilter, setStatusFilter] = useState<RowStatus>('ALL')
  const [domainFilter, setDomainFilter] = useState<RowDomain>('ALL')
  const [query, setQuery] = useState('')

  const domainOptions = useMemo(() => {
    const set = new Set<RowDomain>()
    for (const row of rows) {
      set.add(resolveDomain(row))
    }
    const base: RowDomain[] = ['ALL']
    const preferred: RowDomain[] = ['USER', 'CUSTOMER', 'SALES', 'SUPPORT', 'BILLING', 'INVENTORY', 'HR', 'OTHER']
    for (const item of preferred) {
      if (set.has(item)) base.push(item)
    }
    return base
  }, [rows])

  const filteredRows = useMemo(() => {
    const needle = normalizeText(query)
    return rows.filter((row) => {
      if (statusFilter !== 'ALL' && row.status !== statusFilter) return false
      const domain = resolveDomain(row)
      if (domainFilter !== 'ALL' && domain !== domainFilter) return false
      if (!needle) return true

      const haystack = normalizeText(
        [
          row.legacyId,
          row.normalizedKey,
          row.targetId,
          row.note,
          row.status,
          domain,
        ]
          .filter(Boolean)
          .join(' '),
      )
      return haystack.includes(needle)
    })
  }, [rows, statusFilter, domainFilter, query])

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="grid gap-3 md:grid-cols-12">
        <label className="md:col-span-6 flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Cari</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Legacy ID, normalized key, target, catatan..."
          />
        </label>

        <label className="md:col-span-3 flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as RowStatus)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          >
            {(['ALL', 'INVALID', 'VALID', 'MAPPED', 'IMPORTED', 'SKIPPED', 'PENDING'] as RowStatus[]).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="md:col-span-3 flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Domain</span>
          <select
            value={domainFilter}
            onChange={(event) => setDomainFilter(event.target.value as RowDomain)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          >
            {domainOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-mute">
        <span>
          Menampilkan {filteredRows.length.toLocaleString('id-ID')} dari {rows.length.toLocaleString('id-ID')} row
        </span>
        {(statusFilter !== 'ALL' || domainFilter !== 'ALL' || query.trim()) && (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL')
              setDomainFilter('ALL')
              setQuery('')
            }}
            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Reset filter
          </button>
        )}
      </div>

      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-slate-50 text-mute">
            <tr>
              <th className="px-6 py-4 font-semibold">Legacy ID</th>
              <th className="px-6 py-4 font-semibold">Normalized Key</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Target</th>
              <th className="px-6 py-4 font-semibold">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {filteredRows.map((row) => (
              <tr key={row.id}>
                <td className="px-6 py-5 font-medium text-slate-900">{row.legacyId}</td>
                <td className="px-6 py-5 text-slate-700">{row.normalizedKey}</td>
                <td className="px-6 py-5">
                  <span className={`badge border-transparent ${rowTone[row.status]}`}>{row.status}</span>
                </td>
                <td className="px-6 py-5 text-slate-700">{row.targetId}</td>
                <td className="px-6 py-5 text-slate-700">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 md:hidden">
        {filteredRows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-line bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-950">{row.legacyId}</p>
                <p className="mt-1 text-xs text-mute">{row.normalizedKey}</p>
              </div>
              <span className={`badge border-transparent ${rowTone[row.status]}`}>{row.status}</span>
            </div>
            <p className="mt-4 text-sm text-slate-700">Target: {row.targetId}</p>
            <p className="mt-2 text-sm leading-6 text-mute">{row.note}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
