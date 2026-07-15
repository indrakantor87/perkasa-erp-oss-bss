'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type InventoryDeviceAssignmentFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  embedded?: boolean
}

const assignmentStatusOptions = ['ASSIGNED', 'RETURNED', 'DAMAGED', 'LOST'] as const

function extractItemCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function InventoryDeviceAssignmentForm({
  canCreate,
  reviewDbReady,
  itemSuggestions,
  embedded = false,
}: InventoryDeviceAssignmentFormProps) {
  const router = useRouter()
  const [itemValue, setItemValue] = useState(itemSuggestions[0] ?? '')
  const [serviceNo, setServiceNo] = useState('')
  const [workOrderNo, setWorkOrderNo] = useState('')
  const [customerCode, setCustomerCode] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [macAddress, setMacAddress] = useState('')
  const [assignmentStatus, setAssignmentStatus] = useState<(typeof assignmentStatusOptions)[number]>('ASSIGNED')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

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
      const response = await fetch('/api/inventory/device-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemCode,
          serviceNo,
          workOrderNo,
          customerCode,
          serialNumber,
          macAddress,
          assignmentStatus,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Device assignment gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Device assignment berhasil disimpan.',
      })
      setServiceNo('')
      setWorkOrderNo('')
      setCustomerCode('')
      setSerialNumber('')
      setMacAddress('')
      setAssignmentStatus('ASSIGNED')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={embedded ? 'space-y-4' : 'panel p-6'}>
      <p className="section-title">Write Action Inventory</p>
      <h3 className={`font-[family-name:var(--font-heading)] font-semibold tracking-tight text-slate-950 ${embedded ? 'text-xl' : 'mt-2 text-2xl'}`}>
        Assign perangkat
      </h3>
      <p className={`${embedded ? '' : 'mt-3'} text-sm leading-6 text-mute`}>
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action device assignment dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menautkan item inventory ke subscription/work order/customer dan otomatis mencatat stok keluar bila status ASSIGNED.'}
      </p>

      <form onSubmit={handleSubmit} className={`${embedded ? '' : 'mt-6'} grid gap-4 lg:grid-cols-2`}>
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Item Inventory</span>
          <input
            list="inventory-device-item-suggestions"
            value={itemValue}
            onChange={(event) => setItemValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="INV-202607-0001 | ONU ZTE F660"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-device-item-suggestions">
            {itemSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Service No</span>
          <input
            value={serviceNo}
            onChange={(event) => setServiceNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="SVC-000501 (opsional)"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Work Order No</span>
          <input
            value={workOrderNo}
            onChange={(event) => setWorkOrderNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="WO-202607-0021 (opsional)"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Customer Code</span>
          <input
            value={customerCode}
            onChange={(event) => setCustomerCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="CUST-00123 (opsional)"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Serial Number</span>
          <input
            value={serialNumber}
            onChange={(event) => setSerialNumber(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="F660-ABC-0001"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">MAC Address</span>
          <input
            value={macAddress}
            onChange={(event) => setMacAddress(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="AA:BB:CC:DD:EE:FF"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Status Assignment</span>
          <select
            value={assignmentStatus}
            onChange={(event) => setAssignmentStatus(event.target.value as (typeof assignmentStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {assignmentStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-20 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan assignment, kondisi perangkat, atau detail instalasi"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">Jika stok item tidak cukup, assignment akan ditolak.</div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Assignment...' : 'Simpan Device Assignment'}
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
