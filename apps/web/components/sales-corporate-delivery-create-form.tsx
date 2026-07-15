'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type ContractSummary = {
  id: number
  contractNo: string
  status: string
  quotationNo: string
  customerName: string
}

type CorporateDeliveryCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
}

const milestoneStatusOptions = ['PLANNED', 'IN_PROGRESS', 'DONE', 'BLOCKED'] as const

function extractContractId(value: string) {
  const matched = String(value ?? '').trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function SalesCorporateDeliveryCreateForm({
  canCreate,
  reviewDbReady,
}: CorporateDeliveryCreateFormProps) {
  const router = useRouter()
  const [contractValue, setContractValue] = useState('')
  const [milestoneCode, setMilestoneCode] = useState('DELIVERY_PLAN')
  const [milestoneName, setMilestoneName] = useState('Delivery Planning')
  const [status, setStatus] = useState<(typeof milestoneStatusOptions)[number]>('PLANNED')
  const [ownerName, setOwnerName] = useState('')
  const [plannedAt, setPlannedAt] = useState('')
  const [notes, setNotes] = useState('')
  const [contracts, setContracts] = useState<ContractSummary[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  useEffect(() => {
    if (!reviewDbReady) return
    void (async () => {
      const response = await fetch('/api/sales/contracts')
      const payload = (await response.json().catch(() => null)) as { contracts?: ContractSummary[] } | null
      setContracts(payload?.contracts ?? [])
    })()
  }, [reviewDbReady])

  const suggestions = useMemo(
    () =>
      contracts.map(
        (item) => `${item.id} | ${item.contractNo} | ${item.customerName} | ${item.status} | ${item.quotationNo}`,
      ),
    [contracts],
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const contractId = extractContractId(contractValue)
    if (!contractId) {
      setFeedback({ tone: 'error', message: 'Pilih kontrak corporate yang valid dari daftar saran.' })
      return
    }

    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/sales/corporate-deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          milestoneCode,
          milestoneName,
          status,
          ownerName,
          plannedAt: plannedAt || null,
          notes,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Milestone delivery corporate gagal disimpan.' })
        return
      }

      setFeedback({ tone: 'success', message: payload?.message || 'Milestone delivery corporate berhasil disimpan.' })
      setMilestoneCode('DELIVERY_PLAN')
      setMilestoneName('Delivery Planning')
      setStatus('PLANNED')
      setOwnerName('')
      setPlannedAt('')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Corporate Delivery</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Catat milestone delivery corporate
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Sales.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi milestone delivery corporate dinonaktifkan.'
            : 'Jalur corporate dipisah dari instalasi home. Gunakan milestone ini untuk planning, handover, deployment, dan progres delivery.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Kontrak Corporate</span>
          <input
            list="sales-corporate-delivery-contract-suggestions"
            value={contractValue}
            onChange={(event) => setContractValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="7 | CTR-202607-0001 | PT ABC | SIGNED | QTN-..."
            required
            disabled={isDisabled}
          />
          <datalist id="sales-corporate-delivery-contract-suggestions">
            {suggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Kode Milestone</span>
          <input
            value={milestoneCode}
            onChange={(event) => setMilestoneCode(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="DELIVERY_PLAN"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nama Milestone</span>
          <input
            value={milestoneName}
            onChange={(event) => setMilestoneName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Delivery Planning / Handover / Deployment"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof milestoneStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {milestoneStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">PIC / Owner</span>
          <input
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama PM / engineer / tim delivery"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Jadwal / Target</span>
          <input
            type="datetime-local"
            value={plannedAt}
            onChange={(event) => setPlannedAt(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Catatan deployment, kebutuhan last-mile, IP public, eskalasi vendor, dll."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">Delivery corporate dipisah agar tidak tercampur dengan instalasi home biasa.</div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Milestone'}
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

