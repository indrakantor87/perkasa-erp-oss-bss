'use client'

import { InventoryItemCreateForm } from '@/components/inventory-item-create-form'
import { InventoryRackLayoutPanel } from '@/components/inventory-rack-layout-panel'
import { useState } from 'react'
import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'
import { Download, Link2 } from 'lucide-react'
import type { DomainReviewSection } from '@/lib/types'
import { buildInventoryItemRelativePath } from '@/lib/inventory-barcode-utils'

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

function getFeedbackToneClass(tone: InventoryBarcodeFeedback['tone']) {
  return tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-rose-200 bg-rose-50 text-rose-700'
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
}: {
  sections: DomainReviewSection[]
  canCreate: boolean
  canUpdate: boolean
  reviewDbReady: boolean
}) {
  const [feedback, setFeedback] = useState<InventoryBarcodeFeedback | null>(null)
  const [manualItemCode, setManualItemCode] = useState('')
  const itemSection = findSection(sections, 'ITEM INVENTORY TERBARU')

  if (!itemSection?.rows.length) {
    return null
  }

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
