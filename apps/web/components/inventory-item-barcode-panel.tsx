'use client'

import Link from 'next/link'
import { InventoryItemCreateForm } from '@/components/inventory-item-create-form'
import { InventoryRackLayoutPanel } from '@/components/inventory-rack-layout-panel'
import type { DeviceLifecycleLogRow } from '@/lib/services/device-lifecycle-service'
import { useState } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { Download, Link2 } from 'lucide-react'
import type { DomainReviewSection } from '@/lib/types'
import { buildInventoryBarcodeDetailPath, buildInventoryItemRelativePath } from '@/lib/inventory-barcode-utils'

type InventoryBarcodeFeedback = {
  tone: 'success' | 'error'
  message: string
}

function findSection(sections: DomainReviewSection[], keyword: string) {
  return sections.find((section) => section.title.toUpperCase().includes(keyword.toUpperCase())) ?? null
}

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function pickFirstNonEmpty(values: Array<string | null | undefined>) {
  return values.find((value) => String(value ?? '').trim())?.trim() ?? ''
}

function getFeedbackToneClass(tone: InventoryBarcodeFeedback['tone']) {
  return tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-rose-200 bg-rose-50 text-rose-700'
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase()
}

function getItemCodeFingerprint(value: string | null | undefined) {
  const normalized = normalizeText(value)
  const matched = normalized.match(/(\d{6}-\d{4})$/)
  return matched ? matched[1] : normalized
}

function matchesItemComposite(value: string | null | undefined, itemCode: string) {
  const normalizedValue = normalizeText(value)
  const normalizedItemCode = normalizeText(itemCode)
  if (normalizedValue === normalizedItemCode || normalizedValue.startsWith(`${normalizedItemCode} |`)) {
    return true
  }

  const valueFingerprint = getItemCodeFingerprint(normalizedValue)
  const itemFingerprint = getItemCodeFingerprint(normalizedItemCode)
  return Boolean(valueFingerprint) && valueFingerprint === itemFingerprint
}

function formatLifecycleStatus(status: DeviceLifecycleLogRow['lifecycleStatus']) {
  switch (status) {
    case 'TEAM_PSB':
      return 'Team PSB'
    case 'TEAM_TROUBLESHOOTS':
      return 'Team Troubleshoots'
    case 'TEAM_JALUR':
      return 'Team Jalur'
    case 'TEAM_DISMANTLE':
      return 'Team Dismantle'
    case 'PENDING_NOC_VALIDATION':
      return 'Pending Validasi NOC'
    case 'REPLACE_OLD':
      return 'Replace Device Lama'
    case 'REPLACE_NEW':
      return 'Replace Device Baru'
    case 'INSTALLED':
      return 'Terpasang'
    case 'DAMAGED':
      return 'Rusak'
    case 'RETURNED':
      return 'Kembali'
    default:
      return status ? status.replace(/_/g, ' ') : 'Belum Ada Lifecycle'
  }
}

function getLifecycleTone(status: DeviceLifecycleLogRow['lifecycleStatus']) {
  switch (status) {
    case 'INSTALLED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'PENDING_NOC_VALIDATION':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'TEAM_PSB':
    case 'TEAM_TROUBLESHOOTS':
    case 'TEAM_JALUR':
    case 'TEAM_DISMANTLE':
      return 'border-sky-200 bg-sky-50 text-sky-700'
    case 'RETURNED':
    case 'DAMAGED':
      return 'border-violet-200 bg-violet-50 text-violet-700'
    default:
      return 'border-slate-200 bg-white text-slate-600'
  }
}

function formatHandoverProofType(type: DeviceLifecycleLogRow['handoverProofType']) {
  switch (type) {
    case 'BARCODE_SCAN':
      return 'Barcode Scan'
    case 'SERIAL_CHECK':
      return 'Cek Serial'
    case 'MANUAL_CONFIRMATION':
      return 'Konfirmasi Manual'
    default:
      return 'Belum Ada Bukti'
  }
}

function formatLifecycleValidationStatus(status: DeviceLifecycleLogRow['validationStatus']) {
  switch (status) {
    case 'APPROVED':
      return 'Disetujui'
    case 'REJECTED':
      return 'Ditolak'
    case 'PENDING':
      return 'Pending'
    case 'NOT_REQUIRED':
      return 'Tidak Perlu'
    default:
      return 'Belum Ada Validasi'
  }
}

function formatLifecycleEventType(type: DeviceLifecycleLogRow['eventType']) {
  switch (type) {
    case 'INVENTORY_INPUT':
      return 'Input Inventory'
    case 'NOC_CHECKIN':
      return 'Check-in NOC'
    case 'TECHNICIAN_DELEGATION':
      return 'Delegasi Teknisi'
    case 'TECHNICIAN_SCAN':
      return 'Scan Teknisi'
    case 'NOC_VALIDATION':
      return 'Validasi NOC'
    case 'REPLACE_OLD_CAPTURED':
      return 'Capture Device Lama'
    case 'REPLACE_NEW_PREPARED':
      return 'Siapkan Device Baru'
    case 'MANUAL_UPDATE':
      return 'Update Manual'
    default:
      return type ? type.replace(/_/g, ' ') : 'Event Lifecycle'
  }
}

function formatLifecycleTimestamp(value: string | null | undefined) {
  return String(value ?? '').trim() || '-'
}

async function downloadCanvasAsPng(canvas: HTMLCanvasElement, fileName: string) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) {
    throw new Error('Barcode tidak bisa dikonversi ke PNG.')
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 500)
}

async function downloadQrCode(fileRef: string, payload: string) {
  const canvas = document.createElement('canvas')
  await QRCode.toCanvas(canvas, payload, {
    width: 280,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  })
  await downloadCanvasAsPng(canvas, `${fileRef}-qr.png`)
}

async function downloadCode128(fileRef: string, payload: string) {
  const canvas = document.createElement('canvas')
  JsBarcode(canvas, payload, {
    format: 'CODE128',
    displayValue: true,
    height: 88,
    width: 2,
    margin: 12,
    background: '#ffffff',
    lineColor: '#0f172a',
    fontOptions: 'bold',
    fontSize: 14,
  })
  await downloadCanvasAsPng(canvas, `${fileRef}-code128.png`)
}

export function InventoryItemBarcodePanel({
  sections,
  canCreate,
  canUpdate,
  reviewDbReady,
  lifecycleItems,
}: {
  sections: DomainReviewSection[]
  canCreate: boolean
  canUpdate: boolean
  reviewDbReady: boolean
  lifecycleItems: DeviceLifecycleLogRow[]
}) {
  const [feedback, setFeedback] = useState<InventoryBarcodeFeedback | null>(null)
  const [manualItemCode, setManualItemCode] = useState('')
  const itemSection = findSection(sections, 'ITEM INVENTORY TERBARU')
  const requestSection = findSection(sections, 'REQUEST INVENTORY TEKNISI')
  const movementSection = findSection(sections, 'STOCK MOVEMENT TERBARU')
  const assignmentSection = findSection(sections, 'DEVICE ASSIGNMENT TERBARU')
  const returnSection = findSection(sections, 'DEVICE RETURN TERBARU')

  if (!itemSection?.rows.length) {
    return null
  }

  const reconciliationRows = itemSection.rows.map((row) => {
    const itemCode = row.primary
    const requestRows = (requestSection?.rows ?? []).filter((item) => matchesItemComposite(item.secondary, itemCode))
    const movementRows = (movementSection?.rows ?? []).filter((item) => matchesItemComposite(item.secondary, itemCode))
    const assignmentRows = (assignmentSection?.rows ?? []).filter((item) => matchesItemComposite(item.primary, itemCode))
    const returnRows = (returnSection?.rows ?? []).filter((item) => matchesItemComposite(item.primary, itemCode))
    const lifecycleRows = lifecycleItems.filter(
      (item) => getItemCodeFingerprint(item.itemCode) === getItemCodeFingerprint(itemCode),
    )

    return {
      item: row,
      requestRows,
      movementRows,
      assignmentRows,
      returnRows,
      lifecycleRows,
    }
  })
  const itemsWithSignals = reconciliationRows.filter(
    (item) =>
      item.requestRows.length ||
      item.movementRows.length ||
      item.assignmentRows.length ||
      item.returnRows.length ||
      item.lifecycleRows.length,
  )
  const itemsWithAssignment = reconciliationRows.filter((item) => item.assignmentRows.length).length
  const itemsWithReturn = reconciliationRows.filter((item) => item.returnRows.length).length
  const itemsWithRequest = reconciliationRows.filter((item) => item.requestRows.length).length
  const itemsWithLifecycle = reconciliationRows.filter((item) => item.lifecycleRows.length).length
  const itemsWithHandoverProof = reconciliationRows.filter((item) =>
    item.lifecycleRows.some((row) => Boolean(String(row.handoverProofRef ?? '').trim())),
  ).length

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Barcode Inventory</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Generate QR dan Code128 per item
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Barcode memakai relative path agar tetap aman dipakai di localhost, staging, maupun hosting. Hasil
            scan bisa langsung dipakai pada alur peminjaman dan pengambilan barang.
          </p>
        </div>
        <span className="badge border-transparent bg-slate-950 text-white">{itemSection.rows.length} item terbaru</span>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-line bg-slate-50 p-5 xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi Workspace</p>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div id="inventory-action-item-create" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4">
              <InventoryItemCreateForm canCreate={canCreate} reviewDbReady={reviewDbReady} embedded />
            </div>
            <div id="inventory-action-rack-layout" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4">
              <InventoryRackLayoutPanel canUpdate={canUpdate} reviewDbReady={reviewDbReady} embedded />
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-slate-50 p-5 xl:col-span-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Rekonsiliasi Per Barcode</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-950">Jejak request, movement, assignment, return, dan lifecycle per item</h4>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Panel ini membaca barcode atau item sebagai satu unit audit. Jadi inventory bisa langsung melihat
                apakah item pernah diminta, keluar, di-assign, dikembalikan, atau sudah bergerak ke NOC dan tim lapangan.
              </p>
            </div>
            <span className="badge border-slate-200 bg-white text-slate-600">{itemsWithSignals.length} item punya jejak operasional</span>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-5">
            <article className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">Ada Request</p>
              <p className="mt-2 text-3xl font-semibold text-sky-900">{itemsWithRequest}</p>
              <p className="mt-2 text-sm leading-6 text-sky-800">Item yang muncul di request teknisi atau proses barang.</p>
            </article>
            <article className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Ada Movement</p>
              <p className="mt-2 text-3xl font-semibold text-amber-900">
                {reconciliationRows.filter((item) => item.movementRows.length).length}
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-800">Item yang sudah tercatat keluar, masuk, atau adjustment.</p>
            </article>
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Ada Assignment</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-900">{itemsWithAssignment}</p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">Item yang sudah pernah ditautkan ke layanan atau work order.</p>
            </article>
            <article className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">Return atau Lifecycle</p>
              <p className="mt-2 text-3xl font-semibold text-violet-900">{Math.max(itemsWithReturn, itemsWithLifecycle)}</p>
              <p className="mt-2 text-sm leading-6 text-violet-800">Item yang sudah punya jejak pengembalian atau lifecycle terbaru.</p>
            </article>
            <article className="rounded-2xl border border-slate-300 bg-slate-100 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Ada Bukti Handover</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{itemsWithHandoverProof}</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">Item yang sudah punya referensi bukti serah terima antar aktor.</p>
            </article>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {reconciliationRows.map(({ item, requestRows, movementRows, assignmentRows, returnRows, lifecycleRows }) => {
              const currentStock = pickMeta(item.meta, 'Current Stock: ')
              const detailHref = buildInventoryBarcodeDetailPath(item.primary)
              const latestLifecycle = lifecycleRows[0] ?? null
              const latestAssignment = assignmentRows[0] ?? null
              const latestReturn = returnRows[0] ?? null
              const recentLifecycleRows = lifecycleRows.slice(0, 3)
              const latestSerial = pickFirstNonEmpty([
                pickMeta(latestAssignment?.meta ?? [], 'Serial: '),
                pickMeta(latestReturn?.meta ?? [], 'Serial: '),
                latestLifecycle?.handoverProofType === 'SERIAL_CHECK' ? latestLifecycle.handoverProofRef : '',
              ])
              const latestPic = pickFirstNonEmpty([
                latestLifecycle?.handoverToLabel,
                latestLifecycle?.actorName,
                latestAssignment?.secondary,
                latestReturn?.secondary,
              ])
              const latestLocation = pickFirstNonEmpty([latestLifecycle?.locationName, latestLifecycle?.locationCode])
              const latestTicket = pickFirstNonEmpty([latestLifecycle?.ticketRef])
              const latestValidation = formatLifecycleValidationStatus(latestLifecycle?.validationStatus)
              const latestUpdatedAt = formatLifecycleTimestamp(latestLifecycle?.createdAt)
              const latestHandover = latestLifecycle
                ? pickFirstNonEmpty([
                    latestLifecycle.handoverFromLabel || latestLifecycle.handoverToLabel
                      ? `${latestLifecycle.handoverFromLabel || '-'} -> ${latestLifecycle.handoverToLabel || '-'}`
                      : '',
                    latestLifecycle.handoverProofRef
                      ? `${formatHandoverProofType(latestLifecycle.handoverProofType)} / ${latestLifecycle.handoverProofRef}`
                      : '',
                  ])
                : ''

              return (
                <article key={`reconcile-${item.id}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{item.primary}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.secondary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="badge border-slate-200 bg-white text-slate-600">Stok: {currentStock || '-'}</span>
                      <span className="badge border-slate-200 bg-white text-slate-600">{item.status}</span>
                      {latestLifecycle ? (
                        <span className={`badge ${getLifecycleTone(latestLifecycle.lifecycleStatus)}`}>
                          {formatLifecycleStatus(latestLifecycle.lifecycleStatus)}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Request</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{requestRows.length}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{requestRows[0]?.primary || 'Belum ada request'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Movement</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{movementRows.length}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{movementRows[0]?.primary || 'Belum ada movement'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Assignment</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{assignmentRows.length}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{assignmentRows[0]?.status || 'Belum ada assignment'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Return</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{returnRows.length}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{returnRows[0]?.status || 'Belum ada return'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Lifecycle</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-950">{lifecycleRows.length}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        {latestLifecycle ? formatLifecycleStatus(latestLifecycle.lifecycleStatus) : 'Belum ada lifecycle'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Serial Terakhir</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{latestSerial || '-'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">PIC Terakhir</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{latestPic || '-'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Lokasi Terakhir</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{latestLocation || '-'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Handover Terakhir</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{latestHandover || '-'}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ticket Terakhir</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{latestTicket || '-'}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Validasi NOC</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{latestValidation}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Update Terakhir</p>
                      <p className="mt-2 text-sm font-semibold text-slate-950">{latestUpdatedAt}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={detailHref}
                      className="badge border-slate-300 bg-slate-950 text-white transition hover:bg-slate-800"
                    >
                      Buka Detail
                    </Link>
                    {requestRows.slice(0, 2).map((row) => (
                      <span key={row.id} className="badge border-sky-200 bg-sky-50 text-sky-700">
                        Request: {row.primary}
                      </span>
                    ))}
                    {movementRows.slice(0, 2).map((row) => (
                      <span key={row.id} className="badge border-amber-200 bg-amber-50 text-amber-700">
                        Movement: {row.primary} / {row.status}
                      </span>
                    ))}
                    {assignmentRows.slice(0, 1).map((row) => (
                      <span key={row.id} className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                        Assignment: {row.status}
                      </span>
                    ))}
                    {returnRows.slice(0, 1).map((row) => (
                      <span key={row.id} className="badge border-violet-200 bg-violet-50 text-violet-700">
                        Return: {row.status}
                      </span>
                    ))}
                    {latestLifecycle?.ticketRef ? (
                      <span className="badge border-slate-200 bg-white text-slate-600">Ticket: {latestLifecycle.ticketRef}</span>
                    ) : null}
                  </div>

                  {latestLifecycle ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-950">Lifecycle Terbaru</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {latestLifecycle.notes || latestLifecycle.eventType || 'Belum ada catatan tambahan.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {latestLifecycle.targetTeam ? (
                          <span className="badge border-slate-200 bg-white text-slate-600">Tim: {latestLifecycle.targetTeam}</span>
                        ) : null}
                        {latestLifecycle.actorName ? (
                          <span className="badge border-slate-200 bg-white text-slate-600">PIC: {latestLifecycle.actorName}</span>
                        ) : null}
                        {latestLifecycle.locationName ? (
                          <span className="badge border-slate-200 bg-white text-slate-600">Lokasi: {latestLifecycle.locationName}</span>
                        ) : null}
                        {latestLifecycle.handoverFromLabel || latestLifecycle.handoverToLabel ? (
                          <span className="badge border-slate-200 bg-white text-slate-600">
                            Handover: {latestLifecycle.handoverFromLabel || '-'} {'->'} {latestLifecycle.handoverToLabel || '-'}
                          </span>
                        ) : null}
                        {latestLifecycle.validationStatus ? (
                          <span className="badge border-slate-200 bg-white text-slate-600">
                            Validasi: {latestLifecycle.validationStatus}
                          </span>
                        ) : null}
                        {latestLifecycle.handoverProofRef ? (
                          <span className="badge border-slate-200 bg-white text-slate-600">
                            Bukti: {formatHandoverProofType(latestLifecycle.handoverProofType)} / {latestLifecycle.handoverProofRef}
                          </span>
                        ) : null}
                      </div>
                      {recentLifecycleRows.length ? (
                        <div className="mt-4 border-t border-slate-200 pt-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Timeline Ringkas</p>
                          <div className="mt-3 space-y-3">
                            {recentLifecycleRows.map((entry) => (
                              <div key={entry.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-950">
                                      {formatLifecycleStatus(entry.lifecycleStatus)} / {formatLifecycleEventType(entry.eventType)}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-slate-600">
                                      {entry.notes || entry.locationName || entry.ticketRef || 'Belum ada catatan tambahan.'}
                                    </p>
                                  </div>
                                  <span className="text-xs font-medium text-slate-500">{formatLifecycleTimestamp(entry.createdAt)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Generate manual</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Masukkan kode item</h4>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Jika item tidak muncul pada daftar terbaru, masukkan kode seperti `INV-202607-0001` untuk mengunduh barcode.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={manualItemCode}
              onChange={(event) => setManualItemCode(event.target.value)}
              placeholder="INV-YYYYMM-0001"
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
            <button
              type="button"
              disabled={!manualItemCode.trim()}
              onClick={() => {
                const code = manualItemCode.trim().toUpperCase()
                const relativePath = buildInventoryItemRelativePath(code)
                void downloadQrCode(code, relativePath)
                  .then(() =>
                    setFeedback({
                      tone: 'success',
                      message: `QR PNG untuk ${code} berhasil diunduh.`,
                    }),
                  )
                  .catch((error: unknown) =>
                    setFeedback({
                      tone: 'error',
                      message: error instanceof Error ? error.message : 'QR PNG gagal dibuat.',
                    }),
                  )
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            >
              <Download className="h-4 w-4" />
              QR PNG
            </button>
            <button
              type="button"
              disabled={!manualItemCode.trim()}
              onClick={() => {
                const code = manualItemCode.trim().toUpperCase()
                const relativePath = buildInventoryItemRelativePath(code)
                void downloadCode128(code, relativePath)
                  .then(() =>
                    setFeedback({
                      tone: 'success',
                      message: `Code128 PNG untuk ${code} berhasil diunduh.`,
                    }),
                  )
                  .catch((error: unknown) =>
                    setFeedback({
                      tone: 'error',
                      message: error instanceof Error ? error.message : 'Code128 PNG gagal dibuat.',
                    }),
                  )
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Download className="h-4 w-4" />
              Code128 PNG
            </button>
          </div>
        </article>

        {itemSection.rows.map((row) => {
          const relativePath = buildInventoryItemRelativePath(row.primary)
          const detailHref = buildInventoryBarcodeDetailPath(row.primary)
          const category = pickMeta(row.meta, 'Category: ')
          const unit = pickMeta(row.meta, 'Unit: ')
          const rack = pickMeta(row.meta, 'Rack: ')
          const rackBarcode = pickMeta(row.meta, 'Rack Barcode: ') || rack || row.primary

          return (
            <article key={row.id} className="rounded-2xl border border-line bg-slate-50 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{row.primary}</p>
                  <p className="mt-1 text-sm text-mute">{row.secondary}</p>
                </div>
                <span className="badge border-slate-200 bg-white text-slate-600">{row.status}</span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-700">{row.detail}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="badge border-slate-200 bg-white text-slate-600">Category: {category || '-'}</span>
                <span className="badge border-slate-200 bg-white text-slate-600">Unit: {unit || '-'}</span>
                <span className="badge border-slate-200 bg-white text-slate-600">Rack: {rack || '-'}</span>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Relative Path</p>
                <div className="mt-2 flex items-start gap-2">
                  <Link2 className="mt-0.5 h-4 w-4 text-slate-400" />
                  <p className="break-all text-sm text-slate-700">{relativePath}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={detailHref}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Buka Detail
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    void downloadQrCode(row.primary, relativePath)
                      .then(() =>
                        setFeedback({
                          tone: 'success',
                          message: `QR PNG untuk ${row.primary} berhasil diunduh.`,
                        }),
                      )
                      .catch((error: unknown) =>
                        setFeedback({
                          tone: 'error',
                          message: error instanceof Error ? error.message : 'QR PNG gagal dibuat.',
                        }),
                      )
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  <Download className="h-4 w-4" />
                  Download QR PNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void downloadCode128(row.primary, relativePath)
                      .then(() =>
                        setFeedback({
                          tone: 'success',
                          message: `Code128 PNG untuk ${row.primary} berhasil diunduh.`,
                        }),
                      )
                      .catch((error: unknown) =>
                        setFeedback({
                          tone: 'error',
                          message: error instanceof Error ? error.message : 'Code128 PNG gagal dibuat.',
                        }),
                      )
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Download className="h-4 w-4" />
                  Download Code128 PNG
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void downloadCode128(`${row.primary}-rack`, rackBarcode)
                      .then(() =>
                        setFeedback({
                          tone: 'success',
                          message: `Barcode rak untuk ${row.primary} berhasil diunduh.`,
                        }),
                      )
                      .catch((error: unknown) =>
                        setFeedback({
                          tone: 'error',
                          message: error instanceof Error ? error.message : 'Barcode rak gagal dibuat.',
                        }),
                      )
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700"
                >
                  <Download className="h-4 w-4" />
                  Download Barcode Rak
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {feedback ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${getFeedbackToneClass(feedback.tone)}`}>
          {feedback.message}
        </div>
      ) : null}
    </section>
  )
}
