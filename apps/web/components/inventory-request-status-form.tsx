'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { InventoryItemScanAssist } from '@/components/inventory-item-scan-assist'

type InventoryRequestStatusFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  requestSuggestions: string[]
  rackSuggestions: string[]
  requireScan: boolean
  initialRequestValue?: string
  embedded?: boolean
}

const statusOptions = [
  { value: 'ON_PROGRESS', label: 'On Progress' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'COMPLETED', label: 'Selesai' },
] as const

const handoverProofOptions = [
  { value: 'BARCODE_SCAN', label: 'Barcode Scan' },
  { value: 'SERIAL_CHECK', label: 'Serial Check' },
  { value: 'MANUAL_CONFIRMATION', label: 'Manual Confirmation' },
] as const

function extractRequestId(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function extractRequestedItemCode(value: string) {
  const tokens = value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
  return tokens[1] ?? ''
}

function extractRackBarcode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

export function InventoryRequestStatusForm({
  canCreate,
  reviewDbReady,
  requestSuggestions,
  rackSuggestions,
  requireScan,
  initialRequestValue,
  embedded = false,
}: InventoryRequestStatusFormProps) {
  const router = useRouter()
  const [requestValue, setRequestValue] = useState(initialRequestValue?.trim() || requestSuggestions[0] || '')
  const [nextStatus, setNextStatus] = useState<(typeof statusOptions)[number]['value']>('ON_PROGRESS')
  const [pendingReason, setPendingReason] = useState('')
  const [processNotes, setProcessNotes] = useState('')
  const [handoverFrom, setHandoverFrom] = useState('')
  const [handoverTo, setHandoverTo] = useState('')
  const [handoverProofType, setHandoverProofType] = useState<(typeof handoverProofOptions)[number]['value']>('BARCODE_SCAN')
  const [handoverProofRef, setHandoverProofRef] = useState('')
  const [scanValue, setScanValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const scanRequired = requireScan && nextStatus === 'COMPLETED'
  const expectedItemCode = extractRequestedItemCode(requestValue).trim()

  useEffect(() => {
    if (initialRequestValue?.trim()) {
      setRequestValue(initialRequestValue.trim())
    }
  }, [initialRequestValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const requestId = extractRequestId(requestValue)
    if (!requestId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih request inventory yang valid dari daftar saran.',
      })
      return
    }

    if (scanRequired) {
      const scannedRackBarcode = extractRackBarcode(scanValue).trim()
      if (!scannedRackBarcode) {
        setFeedback({
          tone: 'error',
          message: 'Scan barcode rak wajib dilakukan sebelum status diubah ke Selesai.',
        })
        return
      }

      if (!expectedItemCode) {
        setFeedback({
          tone: 'error',
          message: 'Request ini belum memiliki referensi item yang bisa divalidasi.',
        })
        return
      }

      if (!rackSuggestions.some((item) => item.includes(`| ${expectedItemCode} |`))) {
        setFeedback({
          tone: 'error',
          message: `Item ${expectedItemCode} belum memiliki barcode rak. Lengkapi dulu data rak di item inventory.`,
        })
        return
      }

      const matchedRack = rackSuggestions.find((item) => item.split('|')[0]?.trim().toUpperCase() === scannedRackBarcode.toUpperCase())
      const matchedItemCode = matchedRack?.split('|')[1]?.trim() ?? ''
      if (matchedItemCode.toUpperCase() !== expectedItemCode.toUpperCase()) {
        setFeedback({
          tone: 'error',
          message: `Barcode rak tidak cocok. Request ini untuk item ${expectedItemCode}, tetapi barcode rak terbaca untuk ${matchedItemCode || 'item lain'}.`,
        })
        return
      }
    }

    if (nextStatus === 'COMPLETED') {
      if (!handoverFrom.trim() || !handoverTo.trim()) {
        setFeedback({
          tone: 'error',
          message: 'Serah-terima wajib mencatat asal dan penerima saat request diselesaikan.',
        })
        return
      }
      if (!handoverProofRef.trim()) {
        setFeedback({
          tone: 'error',
          message: 'Referensi bukti handover wajib diisi saat request diselesaikan.',
        })
        return
      }
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/requests/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          nextStatus,
          pendingReason,
          processNotes,
          handoverFrom,
          handoverTo,
          handoverProofType,
          handoverProofRef,
          scannedRackBarcode: scanRequired ? extractRackBarcode(scanValue).trim() : '',
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Status request inventory gagal diperbarui.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Status request inventory berhasil diperbarui.',
      })
      setNextStatus('ON_PROGRESS')
      setPendingReason('')
      setProcessNotes('')
      setHandoverFrom('')
      setHandoverTo('')
      setHandoverProofType('BARCODE_SCAN')
      setHandoverProofRef('')
      setScanValue('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={embedded ? 'space-y-4' : 'panel p-6'}>
      <p className="section-title">Processing Inventory</p>
      <h3 className={`font-[family-name:var(--font-heading)] font-semibold tracking-tight text-slate-950 ${embedded ? 'text-xl' : 'mt-2 text-2xl'}`}>
        Ubah status request barang
      </h3>
      <p className={`${embedded ? '' : 'mt-3'} text-sm leading-6 text-mute`}>
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Inventory.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi proses request inventory dinonaktifkan agar tidak menulis ke mock.'
            : 'Saat status diubah ke `Selesai`, sistem otomatis membuat stock movement keluar dan mengurangi stok item inventory.'}
      </p>

      <form onSubmit={handleSubmit} className={`${embedded ? '' : 'mt-6'} grid gap-4 lg:grid-cols-2`}>
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Request inventory</span>
          <input
            list="inventory-request-status-suggestions"
            value={requestValue}
            onChange={(event) => setRequestValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | IREQ-202607-0001 | INV-202607-0001 | Tang Crimping | Teknisi PSB | REQUEST"
            required
            disabled={isDisabled}
          />
          <datalist id="inventory-request-status-suggestions">
            {requestSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        {requireScan ? (
          <div className="lg:col-span-2">
            <InventoryItemScanAssist
              itemSuggestions={rackSuggestions}
              disabled={isDisabled || nextStatus !== 'COMPLETED'}
              guidancePreset="request_completion"
              onResolved={(value) => setScanValue(value)}
            />
            <div className="mt-2 text-sm text-mute">
              {nextStatus === 'COMPLETED'
                ? expectedItemCode
                  ? `Wajib scan barcode rak untuk item ${expectedItemCode} sebelum menandai request selesai.`
                  : 'Wajib scan barcode rak sebelum menandai request selesai.'
                : 'Scan barcode hanya dibutuhkan saat status diubah ke Selesai.'}
            </div>
          </div>
        ) : null}

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status berikutnya</span>
          <select
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as (typeof statusOptions)[number]['value'])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {statusOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Alasan pending</span>
          <input
            value={pendingReason}
            onChange={(event) => setPendingReason(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Wajib saat status Pending"
            disabled={isDisabled || nextStatus !== 'PENDING'}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan proses</span>
          <textarea
            value={processNotes}
            onChange={(event) => setProcessNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: sedang disiapkan gudang, menunggu approval, atau barang sudah diserahkan ke teknisi."
            disabled={isDisabled}
          />
        </label>

        {nextStatus === 'COMPLETED' ? (
          <>
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">Bukti Serah-Terima</p>
              <p className="mt-1 text-sm leading-6 text-mute">
                Saat request diselesaikan, catat siapa yang menyerahkan barang, siapa yang menerima,
                serta bukti yang dipakai agar movement keluar bisa diaudit.
              </p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Diserahkan dari</span>
                  <input
                    value={handoverFrom}
                    onChange={(event) => setHandoverFrom(event.target.value)}
                    className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                    placeholder="Contoh: Inventory / GA"
                    disabled={isDisabled}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Diterima oleh</span>
                  <input
                    value={handoverTo}
                    onChange={(event) => setHandoverTo(event.target.value)}
                    className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                    placeholder="Contoh: Team PSB / Teknisi Trouble"
                    disabled={isDisabled}
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Jenis bukti</span>
                  <select
                    value={handoverProofType}
                    onChange={(event) =>
                      setHandoverProofType(event.target.value as (typeof handoverProofOptions)[number]['value'])
                    }
                    className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                    disabled={isDisabled}
                  >
                    {handoverProofOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Referensi bukti</span>
                  <input
                    value={handoverProofRef}
                    onChange={(event) => setHandoverProofRef(event.target.value)}
                    className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                    placeholder="Contoh: HO-REQ-202607-0001"
                    disabled={isDisabled}
                  />
                </label>
              </div>
            </div>
          </>
        ) : null}

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Status yang dipakai: `Request`, `On Progress`, `Pending`, dan `Selesai`, dengan konteks
            sub-divisi teknisi agar proses gudang lebih akurat.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Memproses Status...' : 'Simpan Status Request'}
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
