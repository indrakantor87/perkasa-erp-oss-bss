'use client'

import dynamic from 'next/dynamic'
import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LookupIdPicker } from '@/components/lookup-id-picker'
import { TechnicianUserPicker } from '@/components/technician-user-picker'
import { StatusBadge } from '@/components/ui-status-badge'
import { formatDateLocale } from '@/lib/timeline-utils'

const InventoryItemScanAssist = dynamic(
  () => import('@/components/inventory-item-scan-assist').then((module) => module.InventoryItemScanAssist),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-control border border-line bg-surfaceSoft px-4 py-3 text-sm text-muteStrong">
        Memuat panel scan barcode rak...
      </div>
    ),
  },
)

type MaterialUsageMovement = {
  id: number
  itemCode: string | null
  itemName: string | null
  qty: number | null
  movementType: string | null
  referenceType: string | null
  referenceNo: string | null
  movementStatus: string | null
  movementAt: string | null
  fromLocationCode: string | null
  toLocationCode: string | null
  technicianFullName: string | null
}

type WorkOrderMaterialUsagePanelProps = {
  workOrderId: number
  workOrderLabel: string
  movements: MaterialUsageMovement[]
  canCreate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  rackSuggestions: string[]
  requireScan: boolean
}

function extractItemCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function resolveMovementStatusTone(status: string | null | undefined): 'success' | 'warning' | 'neutral' | 'info' | 'danger' {
  const s = String(status ?? '').trim().toUpperCase()
  if (!s) return 'neutral'
  if (s === 'POSTED' || s === 'COMPLETED') return 'success'
  if (s === 'PENDING' || s === 'DRAFT') return 'warning'
  if (s === 'CANCELLED' || s === 'REJECTED' || s === 'VOID') return 'danger'
  return 'info'
}

export function WorkOrderMaterialUsagePanel({
  workOrderId,
  workOrderLabel,
  movements,
  canCreate,
  reviewDbReady,
  itemSuggestions,
  rackSuggestions,
  requireScan,
}: WorkOrderMaterialUsagePanelProps) {
  const router = useRouter()
  const [expandForm, setExpandForm] = useState(false)
  const [itemValue, setItemValue] = useState(itemSuggestions[0] || '')
  const [scanValue, setScanValue] = useState('')
  const [qty, setQty] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [referenceNo, setReferenceNo] = useState('')
  const [fromLocationRaw, setFromLocationRaw] = useState('')
  const [fromLocationId, setFromLocationId] = useState('')
  const [technicianRaw, setTechnicianRaw] = useState('')
  const [technicianUserId, setTechnicianUserId] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting
  const scanInputDisabled = !canCreate || submitting

  useEffect(() => {
    if (submitting || expandForm) return
    setFeedback(null)
  }, [submitting, expandForm])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const itemCode = extractItemCode(itemValue)
    if (!itemCode) {
      setFeedback({ tone: 'error', message: 'Pilih item inventory terlebih dahulu.' })
      return
    }
    const qtyParsed = Number.parseInt(String(qty || '0').trim() || '0', 10)
    if (!Number.isInteger(qtyParsed) || qtyParsed <= 0) {
      setFeedback({ tone: 'error', message: 'Qty material tidak valid.' })
      return
    }
    const scannedRackBarcode = extractItemCode(scanValue)
    if (requireScan) {
      if (!scannedRackBarcode) {
        setFeedback({ tone: 'error', message: 'Scan barcode rak wajib untuk mencatat material keluar.' })
        return
      }
      const matchedRack = rackSuggestions.find(
        (entry) => entry.split('|')[0]?.trim().toUpperCase() === scannedRackBarcode.toUpperCase(),
      )
      const matchedItemCode = matchedRack?.split('|')[1]?.trim() ?? ''
      if (matchedItemCode && matchedItemCode.toUpperCase() !== itemCode.toUpperCase()) {
        setFeedback({
          tone: 'error',
          message: `Barcode rak tidak cocok. Item ${itemCode} vs hasil scan ${matchedItemCode || 'item lain'}.`,
        })
        return
      }
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/stock-movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemCode,
          movementType: 'OUT',
          referenceType: 'WORK_ORDER',
          referenceNo,
          workOrderId,
          qty: qtyParsed,
          unitPrice,
          fromLocationId,
          technicianUserId,
          notes,
          scannedRackBarcode,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Material usage gagal dicatat ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || `Material usage ${itemCode} x ${qtyParsed} berhasil dicatat.`,
      })

      setItemValue(itemSuggestions[0] || '')
      setScanValue('')
      setQty('1')
      setUnitPrice('')
      setReferenceNo('')
      setFromLocationRaw('')
      setFromLocationId('')
      setTechnicianRaw('')
      setTechnicianUserId('')
      setNotes('')
      setExpandForm(false)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="card-tier-3 p-5" aria-label="Material usage work order">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muteStrong">Material Usage</p>
          <p className="mt-2 text-sm leading-6 text-mute">
            Histori material yang tercatat keluar untuk {workOrderLabel}. Data diambil dari movement stok canonical
            dengan referensi <span className="font-semibold text-inkStrong">WORK_ORDER #{workOrderId}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="success" label={`${movements.length} tercatat`} />
          <button
            type="button"
            onClick={() => setExpandForm((prev) => !prev)}
            disabled={!canCreate || !reviewDbReady}
            className="btn-primary tap-44 disabled:cursor-not-allowed disabled:opacity-60"
            aria-expanded={expandForm}
            aria-controls="material-usage-create-form"
          >
            {!canCreate
              ? 'Tanpa Akses Create'
              : !reviewDbReady
                ? 'Review DB Belum Aktif'
                : expandForm
                  ? 'Tutup Form'
                  : 'Catat Material Baru'}
          </button>
        </div>
      </div>

      <div className="mt-4 hidden overflow-x-auto rounded-control border border-line lg:block" aria-label="Tabel material usage">
        <table className="min-w-full divide-y divide-line">
          <thead className="bg-surfaceSoft">
            <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-muteStrong">
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Lokasi</th>
              <th className="px-4 py-3">Teknisi</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Tanggal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {movements.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-4 align-top">
                  <Link
                    href={`/dashboard/tracking/stock-movements/${row.id}`}
                    className="text-sm font-semibold text-inkStrong hover:opacity-90"
                    aria-label={`Buka detail movement ${row.itemCode ?? `Item #${row.id}`}`}
                  >
                    {row.itemCode ?? `Movement #${row.id}`}
                  </Link>
                  {row.itemName ? <p className="mt-1 text-sm text-mute">{row.itemName}</p> : null}
                </td>
                <td className="px-4 py-4 align-top text-sm text-inkStrong">
                  {row.qty != null ? `${row.qty} unit` : '-'}
                </td>
                <td className="px-4 py-4 align-top">
                  <StatusBadge
                    tone={resolveMovementStatusTone(row.movementStatus)}
                    label={row.movementStatus ?? row.movementType ?? 'POSTED'}
                  />
                </td>
                <td className="px-4 py-4 align-top text-sm text-mute">
                  {row.fromLocationCode || row.toLocationCode ? (
                    <>
                      {row.fromLocationCode ? `${row.fromLocationCode} → ` : ''}
                      {row.toLocationCode ?? 'Teknisi / Site'}
                    </>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-4 align-top text-sm text-mute">{row.technicianFullName ?? '-'}</td>
                <td className="px-4 py-4 align-top text-sm text-mute">
                  <span className="inline-flex flex-wrap gap-1">
                    <StatusBadge tone="neutral" label={row.referenceType ?? 'WORK_ORDER'} />
                    {row.referenceNo ? <StatusBadge tone="info" label={row.referenceNo} /> : null}
                  </span>
                </td>
                <td className="px-4 py-4 align-top text-sm text-muteStrong">{formatDateLocale(row.movementAt)}</td>
              </tr>
            ))}
            {!movements.length ? (
              <tr>
                <td className="px-4 py-6 text-sm text-muteStrong" colSpan={7}>
                  Belum ada material yang dicatat untuk Work Order ini.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3 lg:hidden" aria-label="Mobile material usage cards">
        {movements.length ? (
          movements.map((row) => (
            <article key={row.id} className="rounded-control border border-line bg-cardSubtle p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/dashboard/tracking/stock-movements/${row.id}`}
                  className="text-sm font-semibold text-inkStrong"
                >
                  {row.itemCode ?? `Movement #${row.id}`}
                </Link>
                <StatusBadge tone="success" label={`${row.qty ?? 0} unit`} />
              </div>
              {row.itemName ? <p className="mt-1 text-sm text-mute">{row.itemName}</p> : null}
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                <p className="text-muteStrong">
                  Status:{' '}
                  <span className="inline-flex">
                    <StatusBadge
                      tone={resolveMovementStatusTone(row.movementStatus)}
                      label={row.movementStatus ?? row.movementType ?? 'POSTED'}
                    />
                  </span>
                </p>
                <p className="text-muteStrong">
                  Waktu: <span className="font-medium text-inkStrong">{formatDateLocale(row.movementAt)}</span>
                </p>
                <p className="text-muteStrong">
                  Lokasi:{' '}
                  <span className="font-medium text-inkStrong">
                    {row.fromLocationCode ? `${row.fromLocationCode} → ` : ''}
                    {row.toLocationCode ?? 'Teknisi / Site'}
                  </span>
                </p>
                <p className="text-muteStrong">
                  Teknisi: <span className="font-medium text-inkStrong">{row.technicianFullName ?? '-'}</span>
                </p>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-control border border-dashed border-line bg-surfaceSoft p-4 text-sm text-muteStrong">
            Belum ada material yang dicatat untuk Work Order ini.
          </div>
        )}
      </div>

      {expandForm ? (
        <form
          id="material-usage-create-form"
          onSubmit={handleSubmit}
          className="mt-6 rounded-control border border-line bg-cardSubtle p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muteStrong">
                Catat Penggunaan Material Baru
              </p>
              <p className="mt-2 text-sm leading-6 text-mute">
                {!reviewDbReady
                  ? 'Mode review database belum aktif. Form tetap ditampilkan sebagai placeholder, tetapi write action belum dapat disimpan.'
                  : 'Movement keluar (OUT) akan dicatat dengan referenceType WORK_ORDER dan referenceId WO yang aktif. Stok akan divalidasi existing rules agar tidak minus.'}
              </p>
            </div>
            <StatusBadge tone="info" label={`WO #${workOrderId}`} />
          </div>

          {requireScan ? (
            <div className="mt-5">
              <InventoryItemScanAssist
                itemSuggestions={rackSuggestions}
                disabled={scanInputDisabled}
                guidancePreset="inventory_handover"
                onResolved={(value) => setScanValue(value)}
              />
              <div className="mt-2 text-sm text-mute">
                Scan barcode rak material sebelum menyimpan agar sesuai lokasi item di gudang.
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-muteStrong lg:col-span-2">
              <span className="font-semibold text-inkStrong">Item Inventory</span>
              <input
                list="material-usage-item-suggestions"
                value={itemValue}
                onChange={(event) => setItemValue(event.target.value)}
                className="rounded-control border border-line bg-white px-4 py-3 outline-none transition focus:border-ink disabled:cursor-not-allowed disabled:bg-surfaceSoft"
                placeholder="Pilih dari item inventory review DB"
                required
                disabled={isDisabled}
              />
              <datalist id="material-usage-item-suggestions">
                {itemSuggestions.map((entry) => (
                  <option key={entry} value={entry} />
                ))}
              </datalist>
              {!itemSuggestions.length ? (
                <span className="text-xs text-warningInk">
                  Daftar item inventory kosong. Silakan siapkan data item di modul Inventory terlebih dahulu.
                </span>
              ) : null}
            </label>

            <label className="flex flex-col gap-2 text-sm text-muteStrong">
              <span className="font-semibold text-inkStrong">Quantity</span>
              <input
                type="number"
                min={1}
                step={1}
                value={qty}
                onChange={(event) => setQty(event.target.value)}
                className="rounded-control border border-line bg-white px-4 py-3 outline-none transition focus:border-ink disabled:cursor-not-allowed disabled:bg-surfaceSoft"
                required
                disabled={isDisabled}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-muteStrong">
              <span className="font-semibold text-inkStrong">Harga Satuan (Opsional)</span>
              <input
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                className="rounded-control border border-line bg-white px-4 py-3 outline-none transition focus:border-ink disabled:cursor-not-allowed disabled:bg-surfaceSoft"
                placeholder="Kosongkan jika tidak diperlukan (0)"
                disabled={isDisabled}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-muteStrong">
              <span className="font-semibold text-inkStrong">Reference No (Opsional)</span>
              <input
                value={referenceNo}
                onChange={(event) => setReferenceNo(event.target.value)}
                className="rounded-control border border-line bg-white px-4 py-3 outline-none transition focus:border-ink disabled:cursor-not-allowed disabled:bg-surfaceSoft"
                placeholder="Contoh: SURAT-JALAN-001 / DO-2026-0007"
                disabled={isDisabled}
              />
            </label>

            <LookupIdPicker
              label="Source Location (Opsional)"
              value={fromLocationRaw}
              endpoint="/api/lookups/inventory-locations"
              placeholder="Pilih lokasi asal material"
              disabled={isDisabled}
              onChange={({ raw, id }) => {
                setFromLocationRaw(raw)
                setFromLocationId(id)
              }}
            />

            <TechnicianUserPicker
              label="Teknisi Penerima (Opsional)"
              value={technicianRaw}
              onChange={({ raw, userId }) => {
                setTechnicianRaw(raw)
                setTechnicianUserId(userId)
              }}
              disabled={isDisabled}
            />

            <label className="flex flex-col gap-2 text-sm text-muteStrong lg:col-span-2">
              <span className="font-semibold text-inkStrong">Catatan</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="min-h-24 rounded-control border border-line bg-white px-4 py-3 outline-none transition focus:border-ink disabled:cursor-not-allowed disabled:bg-surfaceSoft"
                placeholder="Keterangan pemakaian material, nomor SPK, atau konteks lapangan"
                disabled={isDisabled}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muteStrong">
              <p className="font-semibold uppercase tracking-[0.16em]">Reference Context (LOCKED)</p>
              <p className="mt-1 text-sm">
                movementType = <span className="font-semibold text-inkStrong">OUT</span> • referenceType ={' '}
                <span className="font-semibold text-inkStrong">WORK_ORDER</span> • workOrderId ={' '}
                <span className="font-semibold text-inkStrong">{workOrderId}</span>
              </p>
            </div>
            <button
              type="submit"
              disabled={isDisabled}
              className="rounded-full bg-inkStrong px-5 py-3 text-sm font-semibold text-surface disabled:cursor-not-allowed disabled:bg-mute"
            >
              {submitting ? 'Menyimpan Material Usage...' : 'Simpan Material Usage'}
            </button>
          </div>

          {feedback ? (
            <div
              className={`mt-4 rounded-control border px-4 py-3 text-sm ${
                feedback.tone === 'success'
                  ? 'border-successLine bg-successSoft text-successInk'
                  : 'border-warningLine bg-warningSoft text-warningInk'
              }`}
            >
              {feedback.message}
            </div>
          ) : null}
        </form>
      ) : null}
    </section>
  )
}
