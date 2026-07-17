'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LookupIdPicker } from '@/components/lookup-id-picker'
import {
  INVENTORY_REQUEST_DIVISION,
  INVENTORY_REQUEST_SUBDIVISIONS,
  type InventoryRequestSubdivision,
} from '@/lib/inventory-request-org'

type InventoryItemRequestFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  initialItemValue?: string
  embedded?: boolean
}

function extractItemCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

const requestTypeOptions = ['WO_MATERIAL', 'TECHNICIAN_REPLENISH', 'TROUBLE_SUPPORT', 'JALUR_PROJECT', 'MANUAL'] as const

export function InventoryItemRequestForm({
  canCreate,
  reviewDbReady,
  itemSuggestions,
  initialItemValue,
  embedded = false,
}: InventoryItemRequestFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [itemValue, setItemValue] = useState(initialItemValue || itemSuggestions[0] || '')
  const [qty, setQty] = useState('1')
  const [requestedSubdivision, setRequestedSubdivision] = useState<InventoryRequestSubdivision>(
    INVENTORY_REQUEST_SUBDIVISIONS[0],
  )
  const [requestedFor, setRequestedFor] = useState('')
  const [requestType, setRequestType] = useState<(typeof requestTypeOptions)[number]>('MANUAL')
  const [workOrderRaw, setWorkOrderRaw] = useState('')
  const [workOrderId, setWorkOrderId] = useState('')
  const [troubleTicketRaw, setTroubleTicketRaw] = useState('')
  const [troubleTicketId, setTroubleTicketId] = useState('')
  const [requestNotes, setRequestNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  useEffect(() => {
    const workOrderIdParam = String(searchParams.get('workOrderId') ?? '').trim()
    const troubleTicketIdParam = String(searchParams.get('troubleTicketId') ?? '').trim()
    const requestTypeParam = String(searchParams.get('requestType') ?? '').trim().toUpperCase()

    if (workOrderIdParam && !workOrderId) {
      setWorkOrderRaw(workOrderIdParam)
      setWorkOrderId(workOrderIdParam)
    }
    if (troubleTicketIdParam && !troubleTicketId) {
      setTroubleTicketRaw(troubleTicketIdParam)
      setTroubleTicketId(troubleTicketIdParam)
    }
    if (requestTypeParam && requestType === 'MANUAL' && requestTypeOptions.includes(requestTypeParam as (typeof requestTypeOptions)[number])) {
      setRequestType(requestTypeParam as (typeof requestTypeOptions)[number])
    }
  }, [searchParams, requestType, troubleTicketId, workOrderId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const itemCode = extractItemCode(itemValue)
    if (!itemCode) {
      setFeedback({
        tone: 'error',
        message: 'Pilih item inventory yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemCode,
          qty,
          requestedSubdivision,
          requestedFor,
          requestType,
          workOrderId,
          troubleTicketId,
          requestNotes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Request inventory gagal dibuat.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Request inventory berhasil dibuat.',
      })
      setQty('1')
      setRequestedSubdivision(INVENTORY_REQUEST_SUBDIVISIONS[0])
      setRequestedFor('')
      setRequestType('MANUAL')
      setWorkOrderRaw('')
      setWorkOrderId('')
      setTroubleTicketRaw('')
      setTroubleTicketId('')
      setRequestNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={embedded ? 'space-y-4' : 'panel p-6'}>
      <p className="section-title">Marketplace Internal</p>
      <h3 className={`font-[family-name:var(--font-heading)] font-semibold tracking-tight text-slate-950 ${embedded ? 'text-xl' : 'mt-2 text-2xl'}`}>
        Request kebutuhan teknisi
      </h3>
      <p className={`${embedded ? '' : 'mt-3'} text-sm leading-6 text-mute`}>
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi request inventory dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini meniru alur marketplace internal: teknisi memilih item, mengirim request, lalu Inventory memproses sampai selesai atau pending.'}
      </p>

      <form onSubmit={handleSubmit} className={`${embedded ? '' : 'mt-6'} grid gap-4 lg:grid-cols-2`}>
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Item yang dibutuhkan</span>
          <input
            list="inventory-request-item-suggestions"
            value={itemValue}
            onChange={(event) => setItemValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="INV-202607-0001 | ONU ZTE F660"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-request-item-suggestions">
            {itemSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Qty request</span>
          <input
            type="number"
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            min="1"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Divisi</span>
          <input
            value={INVENTORY_REQUEST_DIVISION}
            className="rounded-2xl border border-line bg-slate-50 px-4 py-3 text-slate-500 outline-none"
            disabled
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Sub-divisi teknisi</span>
          <select
            value={requestedSubdivision}
            onChange={(event) => setRequestedSubdivision(event.target.value as InventoryRequestSubdivision)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {INVENTORY_REQUEST_SUBDIVISIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Jenis Request</span>
          <select
            value={requestType}
            onChange={(event) => setRequestType(event.target.value as (typeof requestTypeOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {requestTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Untuk teknisi / tim</span>
          <input
            value={requestedFor}
            onChange={(event) => setRequestedFor(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Teknisi Fadil / Tim Instalasi POP Timur"
            disabled={isDisabled}
          />
        </label>

        <LookupIdPicker
          label="Work Order (Opsional)"
          value={workOrderRaw}
          endpoint="/api/lookups/work-orders"
          placeholder="Pilih WO dari review DB"
          disabled={isDisabled}
          onChange={({ raw, id }) => {
            setWorkOrderRaw(raw)
            setWorkOrderId(id)
          }}
        />

        <LookupIdPicker
          label="Trouble Ticket (Opsional)"
          value={troubleTicketRaw}
          endpoint="/api/lookups/trouble-tickets"
          placeholder="Pilih TT dari review DB"
          disabled={isDisabled}
          onChange={({ raw, id }) => {
            setTroubleTicketRaw(raw)
            setTroubleTicketId(id)
          }}
        />

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan kebutuhan</span>
          <textarea
            value={requestNotes}
            onChange={(event) => setRequestNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: untuk instalasi baru, butuh cepat hari ini, atau untuk penanganan gangguan lapangan."
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Status awal request akan masuk sebagai `Request`, dengan tag divisi teknisi dan sub-divisi
            agar Inventory bisa memproses per tim sebelum mengubah ke `On Progress`, `Pending`, atau
            `Selesai`.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Mengirim Request...' : 'Kirim Request Inventory'}
          </button>
        </div>
      </form>

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </section>
  )
}
