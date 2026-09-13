import Link from 'next/link'
import { InventoryItemRequestForm } from '@/components/inventory-item-request-form'
import { InventoryRequestStatusForm } from '@/components/inventory-request-status-form'
import { ExpandableCardRow } from '@/components/ui-expandable-card'
import { buildInventoryBarcodeDetailPath, extractInventoryItemCodeFromScan } from '@/lib/inventory-barcode-utils'
import type { DomainReviewRow, DomainReviewSection } from '@/lib/types'

function findSection(sections: DomainReviewSection[], keyword: string) {
  return sections.find((section) => section.title.toUpperCase().includes(keyword.toUpperCase())) ?? null
}

function pickMeta(meta: string[], prefix: string) {
  return meta.find((item) => item.startsWith(prefix))?.slice(prefix.length).trim() ?? ''
}

function getStatusTone(status: string) {
  const normalized = status.trim().toUpperCase()
  if (normalized.includes('SELESAI') || normalized.includes('COMPLETE')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }
  if (normalized.includes('PENDING')) {
    return 'border-amber-200 bg-amber-50 text-amber-700'
  }
  if (normalized.includes('PROGRESS')) {
    return 'border-sky-200 bg-sky-50 text-sky-700'
  }
  return 'border-slate-200 bg-white text-slate-600'
}

function normalizeText(value: string) {
  return value.trim().toUpperCase()
}

function parseMovementHandover(detail: string) {
  const handoverMatch = detail.match(/\[HANDOVER\]\s*(.*?)\s*->\s*(.*?)(?:\s*\|\s*\[PROOF\]|$)/i)
  const proofMatch = detail.match(/\[PROOF\]\s*(.*?)(?:\s*\/\s*(.*))?$/i)

  return {
    handoverFrom: handoverMatch?.[1]?.trim() || '',
    handoverTo: handoverMatch?.[2]?.trim() || '',
    proofType: proofMatch?.[1]?.trim() || '',
    proofRef: proofMatch?.[2]?.trim() || '',
  }
}

function getRowBarcodeHref(row: DomainReviewRow | null | undefined) {
  if (!row) return ''
  const itemCode = [row.primary, row.secondary, row.detail, ...row.meta]
    .map((value) => extractInventoryItemCodeFromScan(value))
    .find(Boolean)

  return itemCode ? buildInventoryBarcodeDetailPath(itemCode) : ''
}

function buildCountMap(rows: DomainReviewRow[], prefix?: string) {
  const map = new Map<string, number>()

  for (const row of rows) {
    const rawValue = prefix ? pickMeta(row.meta, prefix) : row.status
    const key = rawValue.trim() || 'Belum diisi'
    map.set(key, (map.get(key) ?? 0) + 1)
  }

  return Array.from(map.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label, count]) => ({ label, count }))
}

export function InventoryRequestOpsPanel({
  sections,
  canRequestCreate,
  canProcessRequest,
  reviewDbReady,
  itemSuggestions,
  requestSuggestions,
  rackSuggestions,
  movementRows,
  requireScan,
  initialItemValue,
  initialRequestValue,
}: {
  sections: DomainReviewSection[]
  canRequestCreate: boolean
  canProcessRequest: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  requestSuggestions: string[]
  rackSuggestions: string[]
  movementRows: DomainReviewRow[]
  requireScan: boolean
  initialItemValue?: string
  initialRequestValue?: string
}) {
  const requestSection = findSection(sections, 'REQUEST INVENTORY')
  const requestRows = requestSection?.rows ?? []

  const bySubdivision = requestSection ? buildCountMap(requestRows, 'Sub-divisi: ') : []
  const byStatus = requestSection ? buildCountMap(requestRows) : []
  const pendingRows = requestRows.filter((row) => row.status.trim().toUpperCase().includes('PENDING'))
  const movementOutRows = movementRows.filter((row) => normalizeText(row.primary) === 'OUT')
  const requestAuditRows = requestRows.map((row) => {
    const requestCode = row.primary.trim()
    const matchedMovement =
      movementOutRows.find((item) => normalizeText(item.status) === normalizeText(requestCode)) ??
      movementOutRows.find((item) => normalizeText(item.detail).includes(normalizeText(requestCode))) ??
      null
    const handover = matchedMovement ? parseMovementHandover(matchedMovement.detail) : null

    return {
      request: row,
      movement: matchedMovement,
      handover,
    }
  })
  const completedRows = requestAuditRows.filter(({ request }) => normalizeText(request.status) === 'SELESAI')
  const completedWithMovement = completedRows.filter(({ movement }) => Boolean(movement))
  const completedWithoutMovement = completedRows.filter(({ movement }) => !movement)
  const movementWithHandover = requestAuditRows.filter(
    ({ handover }) => Boolean(handover?.handoverFrom && handover?.handoverTo && handover?.proofRef),
  )

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Queue Request Inventory</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            Antrean kebutuhan teknisi per sub-divisi
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
            Panel ini membantu tim inventory membaca antrean request berdasarkan status proses dan asal
            sub-divisi teknisi, sehingga pemenuhan barang harian tidak tercampur antara PSB, Jalur &amp;
            Expan, dan Jointer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge border-transparent bg-slate-950 text-white">
            {requestRows.length} request
          </span>
          {pendingRows.length ? (
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">
              {pendingRows.length} pending
            </span>
          ) : null}
          {!requestSection ? (
            reviewDbReady ? (
              <span className="badge border-slate-200 bg-white text-slate-600">
                Data request belum tersedia
              </span>
            ) : (
              <span className="badge border-slate-200 bg-white text-slate-600">
                Review DB belum aktif
              </span>
            )
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-line bg-slate-50 p-5 xl:col-span-2">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Rekonsiliasi Request</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-950">Request, movement keluar, dan bukti handover</h4>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
                Ringkasan ini membantu inventory membaca request yang sudah selesai, apakah movement `OUT`
                sudah tercatat, dan apakah jejak serah-terima sudah terbaca di histori movement.
              </p>
            </div>
            <span className="badge border-slate-200 bg-white text-slate-600">{requestAuditRows.length} request dipantau</span>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-4">
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Request Selesai</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-900">{completedRows.length}</p>
              <p className="mt-2 text-sm leading-6 text-emerald-800">Request yang sudah ditutup di sisi proses inventory.</p>
            </article>
            <article className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">Movement Tercatat</p>
              <p className="mt-2 text-3xl font-semibold text-sky-900">{completedWithMovement.length}</p>
              <p className="mt-2 text-sm leading-6 text-sky-800">Request selesai yang sudah punya movement `OUT` terkait.</p>
            </article>
            <article className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">Belum Ada Movement</p>
              <p className="mt-2 text-3xl font-semibold text-amber-900">{completedWithoutMovement.length}</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">Request selesai yang perlu dicek ulang karena movement belum terbaca.</p>
            </article>
            <article className="rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">Bukti Handover</p>
              <p className="mt-2 text-3xl font-semibold text-violet-900">{movementWithHandover.length}</p>
              <p className="mt-2 text-sm leading-6 text-violet-800">Movement keluar yang sudah membawa jejak serah-terima.</p>
            </article>
          </div>
        </article>
        <article className="rounded-2xl border border-line bg-slate-50 p-5 xl:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Aksi Workspace</p>
          <div className={`mt-4 grid gap-4 ${canRequestCreate && canProcessRequest ? 'xl:grid-cols-2' : 'xl:grid-cols-1'}`}>
            {canRequestCreate ? (
            <div id="inventory-action-item-request" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4">
              <InventoryItemRequestForm
                canCreate={canRequestCreate}
                reviewDbReady={reviewDbReady}
                itemSuggestions={itemSuggestions}
                initialItemValue={initialItemValue}
                embedded
              />
            </div>
            ) : null}
            {canProcessRequest ? (
            <div id="inventory-action-request-status" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4">
              <InventoryRequestStatusForm
                canCreate={canProcessRequest}
                reviewDbReady={reviewDbReady}
                requestSuggestions={requestSuggestions}
                rackSuggestions={rackSuggestions}
                requireScan={requireScan}
                initialRequestValue={initialRequestValue}
                embedded
              />
            </div>
            ) : null}
          </div>
        </article>
        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Distribusi Queue</p>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">Per sub-divisi</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {bySubdivision.length ? (
                  bySubdivision.map((item) => (
                    <span key={item.label} className="badge border-slate-200 bg-white text-slate-600">
                      {item.label}: {item.count}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Belum ada sub-divisi pada request terbaru.</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-white p-4">
              <p className="text-sm font-semibold text-slate-950">Per status</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {byStatus.length ? (
                  byStatus.map((item) => (
                    <span key={item.label} className={`badge ${getStatusTone(item.label)}`}>
                      {item.label}: {item.count}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Belum ada request yang bisa direkap.</span>
                )}
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Request Terbaru</p>
          <div className="mt-4 space-y-3">
            {requestRows.length ? (
              requestRows.map((row, rIdx) => {
                const subdivision = pickMeta(row.meta, 'Sub-divisi: ')
                const requestedFor = pickMeta(row.meta, 'Untuk: ')
                const requestedAt = pickMeta(row.meta, 'Requested: ')
                const audit = requestAuditRows.find((item) => item.request.id === row.id) ?? null
                const handover = audit?.handover
                const requestBarcodeHref = getRowBarcodeHref(row)
                const movementBarcodeHref = getRowBarcodeHref(audit?.movement)

                const compactTop = (
                  <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between w-full">
                    <div className="flex flex-col gap-1">
                      <p className="text-[15px] font-bold text-slate-950 leading-snug">{row.primary}</p>
                      <p className="text-sm text-slate-600">{row.secondary}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <span className={`badge ${getStatusTone(row.status)}`}>{row.status}</span>
                    </div>
                  </div>
                )

                const compactBottom = <p className="text-sm leading-6 text-slate-700">{row.detail}</p>

                const badges: { key: string; tone: string; text: string; href?: string }[] = []
                if (audit?.movement) {
                  badges.push({
                    key: 'mv',
                    tone: 'border-sky-200 bg-sky-50 text-sky-700',
                    text: `Movement: ${audit.movement.primary} · ${audit.movement.status || 'NO-REF'}`,
                  })
                }
                if (!audit?.movement && normalizeText(row.status) === 'SELESAI') {
                  badges.push({
                    key: 'mv-out-pending',
                    tone: 'border-amber-200 bg-amber-50 text-amber-700',
                    text: 'Movement OUT belum terbaca',
                  })
                  badges.push({
                    key: 'mv-create',
                    tone: 'border-slate-900 bg-slate-950 text-white',
                    text: 'Buat Movement dari Request',
                    href: `/inventory/movements?inventoryAction=stock-movement&movementType=OUT&referenceType=REQUEST&requestId=${row.id}#inventory-action-stock-movement`,
                  })
                }
                if (!audit?.movement && normalizeText(row.status) !== 'SELESAI' && row.status.trim().toUpperCase() !== 'DRAFT') {
                  badges.push({
                    key: 'mv-shortcut',
                    tone: 'border-slate-300 bg-white text-slate-700',
                    text: 'Shortcut Movement',
                    href: `/inventory/movements?inventoryAction=stock-movement&movementType=OUT&referenceType=REQUEST&requestId=${row.id}#inventory-action-stock-movement`,
                  })
                }
                if (handover?.handoverFrom && handover?.handoverTo) {
                  badges.push({
                    key: 'ho',
                    tone: 'border-violet-200 bg-violet-50 text-violet-700',
                    text: `Handover: ${handover.handoverFrom} -> ${handover.handoverTo}`,
                  })
                }
                if (handover?.proofRef) {
                  badges.push({
                    key: 'proof',
                    tone: 'border-violet-200 bg-violet-50 text-violet-700',
                    text: `Bukti: ${handover.proofType || '-'} / ${handover.proofRef}`,
                  })
                }

                const detail = (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        {requestBarcodeHref ? (
                          <Link
                            href={requestBarcodeHref}
                            className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
                          >
                            Buka Barcode
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-100"
                        >
                          Update Status
                        </button>
                        {normalizeText(row.status) !== 'SELESAI' ? (
                          <Link
                            href={`/inventory/movements?inventoryAction=stock-movement&movementType=OUT&referenceType=REQUEST&requestId=${row.id}#inventory-action-stock-movement`}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100"
                          >
                            Buat Movement
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-lineStrong hover:bg-surface"
                        >
                          Detail Lengkap
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Sub-divisi</span>
                          <span className="tabular-nums text-slate-900">{subdivision || '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Untuk</span>
                          <span className="tabular-nums text-slate-900">{requestedFor || '-'}</span>
                          <span className="text-mute" aria-hidden>•</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold uppercase tracking-[0.14em] text-mute">Requested</span>
                          <span className="tabular-nums text-slate-900">{requestedAt || '-'}</span>
                        </div>
                      </div>
                    </div>

                    {badges.length ? (
                      <section className="space-y-2">
                        <h4 className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-slate-950">
                          Info & Shortcut
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {badges.map((b) =>
                            b.href ? (
                              <Link
                                key={b.key}
                                href={b.href}
                                className={`badge ${b.tone} transition hover:opacity-90`}
                              >
                                {b.text}
                              </Link>
                            ) : (
                              <span key={b.key} className={`badge ${b.tone}`}>
                                {b.text}
                              </span>
                            ),
                          )}
                        </div>
                      </section>
                    ) : null}

                    {audit?.movement ? (
                      <section className="space-y-2">
                        <h4 className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-slate-950">
                          Audit Movement Terkait
                        </h4>
                        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Movement ID</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Status</th>
                                <th className="text-xs font-semibold uppercase tracking-wider text-mute">Detail</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">
                                  <span className="tabular-nums font-semibold">{audit.movement.primary}</span>
                                  {movementBarcodeHref ? (
                                    <Link
                                      href={movementBarcodeHref}
                                      className="ml-3 inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400"
                                    >
                                      Barcode
                                    </Link>
                                  ) : null}
                                </td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800">{audit.movement.status || '-'}</td>
                                <td className="px-4 py-3 align-top text-sm text-slate-800 leading-6">{audit.movement.detail}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </section>
                    ) : null}
                  </div>
                )

                return (
                  <ExpandableCardRow
                    key={row.id}
                    id={row.id}
                    num={rIdx + 1}
                    compactTop={compactTop}
                    compactBottom={compactBottom}
                    detail={detail}
                  />
                )
              })
            ) : (
              <p className="text-sm text-slate-500">Belum ada request inventory yang bisa direview.</p>
            )}
          </div>
        </article>
      </div>
    </section>
  )
}
