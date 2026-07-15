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

type CorporateAcceptanceCreateFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
}

const acceptanceStatusOptions = ['TESTING', 'UAT', 'ACCEPTED', 'REJECTED'] as const

function extractContractId(value: string) {
  const matched = String(value ?? '').trim().match(/^(\d+)/)
  return matched ? matched[1] : ''
}

export function SalesCorporateAcceptanceCreateForm({
  canUpdate,
  reviewDbReady,
}: CorporateAcceptanceCreateFormProps) {
  const router = useRouter()
  const [contractValue, setContractValue] = useState('')
  const [status, setStatus] = useState<(typeof acceptanceStatusOptions)[number]>('TESTING')
  const [notes, setNotes] = useState('')
  const [contracts, setContracts] = useState<ContractSummary[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

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
      const response = await fetch('/api/sales/corporate-acceptances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractId,
          status,
          notes,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({ tone: 'error', message: payload?.message || 'Acceptance/UAT corporate gagal disimpan.' })
        return
      }

      setFeedback({ tone: 'success', message: payload?.message || 'Acceptance/UAT corporate berhasil disimpan.' })
      setStatus('TESTING')
      setNotes('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Corporate Acceptance</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Catat testing, UAT, dan acceptance
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain Sales.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi acceptance corporate dinonaktifkan.'
            : 'Aktivasi corporate hanya boleh setelah acceptance berstatus ACCEPTED.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Kontrak Corporate</span>
          <input
            list="sales-corporate-acceptance-contract-suggestions"
            value={contractValue}
            onChange={(event) => setContractValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="7 | CTR-202607-0001 | PT ABC | SIGNED | QTN-..."
            required
            disabled={isDisabled}
          />
          <datalist id="sales-corporate-acceptance-contract-suggestions">
            {suggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status Acceptance</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof acceptanceStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {acceptanceStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Catatan</span>
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Hasil test, punch list, catatan UAT, PIC customer"
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">Status `ACCEPTED` akan membuka jalur aktivasi corporate.</div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Acceptance'}
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

