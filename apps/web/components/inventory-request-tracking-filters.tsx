'use client'

import Link from 'next/link'
import { useState } from 'react'
import { LookupIdPicker } from '@/components/lookup-id-picker'

export function InventoryRequestTrackingFilters({
  defaultValues,
}: {
  defaultValues: {
    q: string
    status: string
    requestType: string
    workOrderId: string
    troubleTicketId: string
  }
}) {
  const [workOrderRaw, setWorkOrderRaw] = useState(defaultValues.workOrderId)
  const [workOrderId, setWorkOrderId] = useState(
    (defaultValues.workOrderId.match(/^(\d+)/)?.[1] ?? defaultValues.workOrderId).trim(),
  )
  const [troubleTicketRaw, setTroubleTicketRaw] = useState(defaultValues.troubleTicketId)
  const [troubleTicketId, setTroubleTicketId] = useState(
    (defaultValues.troubleTicketId.match(/^(\d+)/)?.[1] ?? defaultValues.troubleTicketId).trim(),
  )

  return (
    <form className="mt-6 grid gap-4 lg:grid-cols-6" action="/dashboard/tracking/inventory-requests" method="get">
      <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
        <span className="font-semibold text-slate-950">Search</span>
        <input
          name="q"
          defaultValue={defaultValues.q}
          placeholder="IREQ-202607 / item code / requested by"
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        <span className="font-semibold text-slate-950">Status</span>
        <input
          name="status"
          defaultValue={defaultValues.status}
          placeholder="REQUEST"
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        <span className="font-semibold text-slate-950">Type</span>
        <input
          name="requestType"
          defaultValue={defaultValues.requestType}
          placeholder="WO_MATERIAL"
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
        />
      </label>

      <LookupIdPicker
        label="Work Order"
        value={workOrderRaw}
        endpoint="/api/lookups/work-orders"
        placeholder="Pilih WO dari review DB"
        disabled={false}
        onChange={({ raw, id }) => {
          setWorkOrderRaw(raw)
          setWorkOrderId(id)
        }}
      />

      <LookupIdPicker
        label="Trouble Ticket"
        value={troubleTicketRaw}
        endpoint="/api/lookups/trouble-tickets"
        placeholder="Pilih TT dari review DB"
        disabled={false}
        onChange={({ raw, id }) => {
          setTroubleTicketRaw(raw)
          setTroubleTicketId(id)
        }}
      />

      <input type="hidden" name="workOrderId" value={workOrderId} />
      <input type="hidden" name="troubleTicketId" value={troubleTicketId} />

      <div className="lg:col-span-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
        >
          Terapkan Filter
        </button>
        <Link
          href="/dashboard/tracking/inventory-requests"
          className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
        >
          Reset
        </Link>
      </div>
    </form>
  )
}

