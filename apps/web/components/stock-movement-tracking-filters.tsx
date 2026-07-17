'use client'

import Link from 'next/link'
import { useState } from 'react'
import { LookupIdPicker } from '@/components/lookup-id-picker'
import { TechnicianUserPicker } from '@/components/technician-user-picker'

export function StockMovementTrackingFilters({
  defaultValues,
}: {
  defaultValues: {
    q: string
    movementType: string
    referenceType: string
    workOrderId: string
    troubleTicketId: string
    technicianUserId: string
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
  const [technicianRaw, setTechnicianRaw] = useState(defaultValues.technicianUserId)
  const [technicianUserId, setTechnicianUserId] = useState(
    (defaultValues.technicianUserId.match(/^(\d+)/)?.[1] ?? defaultValues.technicianUserId).trim(),
  )

  return (
    <form className="mt-6 grid gap-4 lg:grid-cols-6" action="/dashboard/tracking/stock-movements" method="get">
      <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
        <span className="font-semibold text-slate-950">Search</span>
        <input
          name="q"
          defaultValue={defaultValues.q}
          placeholder="ITEM / reference no"
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        <span className="font-semibold text-slate-950">Type</span>
        <input
          name="movementType"
          defaultValue={defaultValues.movementType}
          placeholder="OUT"
          className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm text-slate-700">
        <span className="font-semibold text-slate-950">Ref Type</span>
        <input
          name="referenceType"
          defaultValue={defaultValues.referenceType}
          placeholder="WORK_ORDER"
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

      <TechnicianUserPicker
        label="Teknisi"
        value={technicianRaw}
        disabled={false}
        placeholder="Pilih teknisi untuk filter"
        onChange={({ raw, userId }) => {
          setTechnicianRaw(raw)
          setTechnicianUserId(userId)
        }}
      />

      <input type="hidden" name="workOrderId" value={workOrderId} />
      <input type="hidden" name="troubleTicketId" value={troubleTicketId} />
      <input type="hidden" name="technicianUserId" value={technicianUserId} />

      <div className="lg:col-span-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
        >
          Terapkan Filter
        </button>
        <Link
          href="/dashboard/tracking/stock-movements"
          className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
        >
          Reset
        </Link>
      </div>
    </form>
  )
}

