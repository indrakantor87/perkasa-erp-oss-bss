'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TechnicianUserPicker } from '@/components/technician-user-picker'

type SalesWorkOrderCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  orderSuggestions: string[]
  initialOrderValue?: string
  initialTroubleTicketId?: number | string
  initialSubscriptionId?: number | string
  initialJobCategory?: 'PSB' | 'TROUBLE' | 'JALUR' | 'EXPAN' | 'JOINTER'
  initialNotes?: string
}

const workTypeOptions = ['INSTALLATION', 'REPAIR', 'DISMANTLE', 'RELOCATION'] as const
const workStatusOptions = ['OPEN', 'SCHEDULED', 'ON_PROGRESS'] as const
const jobCategoryOptions = ['PSB', 'TROUBLE', 'JALUR', 'EXPAN', 'JOINTER'] as const
const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

function extractOrderId(value: string) {
  const matched = value.trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function SalesWorkOrderCreateForm({
  canCreate,
  reviewDbReady,
  orderSuggestions,
  initialOrderValue,
  initialTroubleTicketId,
  initialSubscriptionId,
  initialJobCategory,
  initialNotes,
}: SalesWorkOrderCreateFormProps) {
  const router = useRouter()
  const [orderValue, setOrderValue] = useState(initialOrderValue?.trim() || orderSuggestions[0] || '')
  const [workType, setWorkType] = useState<(typeof workTypeOptions)[number]>('INSTALLATION')
  const [status, setStatus] = useState<(typeof workStatusOptions)[number]>('SCHEDULED')
  const [jobCategory, setJobCategory] = useState<(typeof jobCategoryOptions)[number]>(
    (initialJobCategory as (typeof jobCategoryOptions)[number]) || 'PSB',
  )
  const [priority, setPriority] = useState<(typeof priorityOptions)[number]>('MEDIUM')
  const [scheduledAt, setScheduledAt] = useState('')
  const [currentPicRaw, setCurrentPicRaw] = useState('')
  const [currentPicUserId, setCurrentPicUserId] = useState('')
  const [technicianName, setTechnicianName] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [notes, setNotes] = useState(initialNotes?.trim() || '')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  useEffect(() => {
    if (initialOrderValue?.trim()) {
      setOrderValue(initialOrderValue.trim())
    }
  }, [initialOrderValue])

  useEffect(() => {
    if (initialJobCategory) {
      const normalized = String(initialJobCategory).trim().toUpperCase() as (typeof jobCategoryOptions)[number]
      if (jobCategoryOptions.includes(normalized)) {
        setJobCategory(normalized)
      }
    }
  }, [initialJobCategory])

  useEffect(() => {
    if (initialNotes?.trim()) {
      setNotes(initialNotes.trim())
    }
  }, [initialNotes])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const salesOrderId = extractOrderId(orderValue)
    const troubleTicketIdNormalized = initialTroubleTicketId != null ? Number(initialTroubleTicketId) : NaN
    const subscriptionIdNormalized = initialSubscriptionId != null ? Number(initialSubscriptionId) : NaN

    const hasTroubleTicket = Number.isInteger(troubleTicketIdNormalized) && troubleTicketIdNormalized > 0
    const hasSalesOrder = Boolean(salesOrderId)

    if (!hasTroubleTicket && !hasSalesOrder) {
      setFeedback({
        tone: 'error',
        message: 'Pilih sales order yang valid, atau buat work order dari trouble ticket untuk mengisi konteks pekerjaan.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const sourceType: 'SALES_ORDER' | 'TROUBLE_TICKET' | 'MANUAL' = hasTroubleTicket
        ? 'TROUBLE_TICKET'
        : hasSalesOrder
          ? 'SALES_ORDER'
          : 'MANUAL'

      const body: Record<string, unknown> = {
        sourceType,
        workType,
        status,
        jobCategory,
        priority,
        scheduledAt: scheduledAt || null,
        currentPicUserId,
        technicianName,
        address,
        latitude,
        longitude,
        notes,
      }

      if (salesOrderId) {
        body.salesOrderId = salesOrderId
      }
      if (Number.isInteger(troubleTicketIdNormalized) && troubleTicketIdNormalized > 0) {
        body.troubleTicketId = troubleTicketIdNormalized
      }
      if (Number.isInteger(subscriptionIdNormalized) && subscriptionIdNormalized > 0) {
        body.subscriptionId = subscriptionIdNormalized
      }

      const response = await fetch('/api/sales/work-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Work order gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Work order berhasil disimpan.',
      })
      setWorkType('INSTALLATION')
      setStatus('SCHEDULED')
      setJobCategory('PSB')
      setPriority('MEDIUM')
      setScheduledAt('')
      setCurrentPicRaw('')
      setCurrentPicUserId('')
      setTechnicianName('')
      setAddress('')
      setLatitude('')
      setLongitude('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Delivery Work Order</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Buat work order dari sales order
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Sales.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action work order dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini meneruskan sales order aktif ke tahap delivery lapangan agar alur lead -> order -> work order mulai utuh di web.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Sales Order</span>
          <input
            list="sales-work-order-suggestions"
            value={orderValue}
            onChange={(event) => setOrderValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | ORD-202607-0002 | Customer"
            required
            disabled={isDisabled}
          />
          <datalist id="sales-work-order-suggestions">
            {orderSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Work Type</span>
          <select
            value={workType}
            onChange={(event) => setWorkType(event.target.value as (typeof workTypeOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {workTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kategori Pekerjaan</span>
          <select
            value={jobCategory}
            onChange={(event) => setJobCategory(event.target.value as (typeof jobCategoryOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {jobCategoryOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status Awal</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof workStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {workStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Prioritas</span>
          <select
            value={priority}
            onChange={(event) => setPriority(event.target.value as (typeof priorityOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {priorityOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Jadwal Pekerjaan</span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(event) => setScheduledAt(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <TechnicianUserPicker
          label="PIC Teknisi (Opsional)"
          value={currentPicRaw}
          onChange={({ raw, userId }) => {
            setCurrentPicRaw(raw)
            setCurrentPicUserId(userId)
          }}
          disabled={isDisabled}
        />

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Teknisi / Tim</span>
          <input
            value={technicianName}
            onChange={(event) => setTechnicianName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama teknisi, vendor, atau tim instalasi"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Alamat Pekerjaan (Opsional)</span>
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alamat instalasi / lokasi kerja lapangan"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Latitude (Opsional)</span>
          <input
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="-6.1234567"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Longitude (Opsional)</span>
          <input
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="106.1234567"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan instalasi, kebutuhan material, atau konteks lapangan"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Saran order diambil dari review queue sales order aktif yang sedang tampil pada halaman Sales.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Work Order...' : 'Simpan Work Order'}
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
