import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { buildInventoryBarcodeDetailPath, buildInventoryItemRelativePath } from '@/lib/inventory-barcode-utils'
import { hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'
import { getDeviceLifecycleLogs, type DeviceLifecycleLogRow } from '@/lib/services/device-lifecycle-service'
import { getDomainPageData } from '@/lib/services/domain-service'
import { buildSupportLaneHref } from '@/lib/support-action-links'
import type { DataSourceSnapshot, DomainReviewRow, DomainReviewSection } from '@/lib/types'

type ReviewDbBarcodeDismantleHistoryRow = {
  historyId: number
  customerName: string | null
  serviceNo: string | null
  closedAt: string | null
  closeNote: string | null
  returnedItemCodes: string | null
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

function parseReturnedItemCodes(value: string | null | undefined) {
  return Array.from(
    new Set(
      String(value ?? '')
        .split(/[\r\n,;]+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean),
    ),
  )
}

async function getDismantleHistoryRowsForItem(itemCode: string, source: DataSourceSnapshot) {
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return [] as ReviewDbBarcodeDismantleHistoryRow[]
  }

  const [
    hasHistoryId,
    hasCloseNote,
    hasReturnedItemCodes,
    hasClosedAt,
    hasHistoryCustomerName,
    hasIsolationId,
    hasIsolationCustomerName,
    hasIsolationSubscriptionId,
    hasServiceSubscriptionId,
    hasServiceSubscriptionNo,
  ] = await Promise.all([
    hasReviewDbColumn('support_dismantle_history', 'id'),
    hasReviewDbColumn('support_dismantle_history', 'close_note'),
    hasReviewDbColumn('support_dismantle_history', 'returned_item_codes'),
    hasReviewDbColumn('support_dismantle_history', 'closed_at'),
    hasReviewDbColumn('support_dismantle_history', 'customer_name'),
    hasReviewDbColumn('support_dismantle_history', 'isolation_id'),
    hasReviewDbColumn('support_isolations', 'customer_name'),
    hasReviewDbColumn('support_isolations', 'subscription_id'),
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'service_no'),
  ])

  if (!hasHistoryId || (!hasCloseNote && !hasReturnedItemCodes)) {
    return [] as ReviewDbBarcodeDismantleHistoryRow[]
  }

  const searchToken = `%${itemCode}%`
  const rows = await runReviewDbQuery<ReviewDbBarcodeDismantleHistoryRow>(
    `
      SELECT
        dh.id AS historyId,
        ${
          hasHistoryCustomerName
            ? 'dh.customer_name'
            : hasIsolationId && hasIsolationCustomerName
              ? 'si.customer_name'
              : "CONCAT('Histori Dismantle #', dh.id)"
        } AS customerName,
        ${
          hasIsolationId && hasIsolationSubscriptionId && hasServiceSubscriptionId && hasServiceSubscriptionNo
            ? 'ss.service_no'
            : 'NULL'
        } AS serviceNo,
        ${hasClosedAt ? 'dh.closed_at' : 'NULL'} AS closedAt,
        ${hasCloseNote ? 'dh.close_note' : 'NULL'} AS closeNote,
        ${hasReturnedItemCodes ? 'dh.returned_item_codes' : 'NULL'} AS returnedItemCodes
      FROM support_dismantle_history dh
      ${hasIsolationId ? 'LEFT JOIN support_isolations si ON si.id = dh.isolation_id' : ''}
      ${
        hasIsolationId && hasIsolationSubscriptionId && hasServiceSubscriptionId
          ? 'LEFT JOIN service_subscriptions ss ON ss.id = si.subscription_id'
          : ''
      }
      WHERE ${
        hasReturnedItemCodes && hasCloseNote
          ? '(dh.returned_item_codes LIKE ? OR dh.close_note LIKE ?)'
          : hasReturnedItemCodes
            ? 'dh.returned_item_codes LIKE ?'
            : 'dh.close_note LIKE ?'
      }
      ORDER BY ${hasClosedAt ? 'dh.closed_at' : 'dh.id'} DESC, dh.id DESC
      LIMIT 10
    `,
    hasReturnedItemCodes && hasCloseNote ? [searchToken, searchToken] : [searchToken],
  )

  return rows.filter((row) => {
    const explicitCodes = parseReturnedItemCodes(row.returnedItemCodes)
    if (explicitCodes.length) {
      return explicitCodes.includes(itemCode)
    }

    return row.closeNote?.toUpperCase().includes(itemCode) ?? false
  })
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

function buildTrackingHref(rowId: string, prefix: 'REQ' | 'MOV') {
  const matched = rowId.match(new RegExp(`^${prefix}-(\\d+)$`))
  if (!matched) {
    return null
  }

  return prefix === 'REQ'
    ? `/dashboard/tracking/inventory-requests/${matched[1]}`
    : `/dashboard/tracking/stock-movements/${matched[1]}`
}

function DetailListCard({
  title,
  description,
  rows,
  emptyMessage,
  hrefBuilder,
}: {
  title: string
  description: string
  rows: DomainReviewRow[]
  emptyMessage: string
  hrefBuilder?: (row: DomainReviewRow) => string | null
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-title">{title}</p>
          <p className="mt-2 text-sm leading-6 text-mute">{description}</p>
        </div>
        <span className="badge border-slate-200 bg-white text-slate-600">{rows.length}</span>
      </div>

      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row) => {
            const href = hrefBuilder?.(row) ?? null
            const content = (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                      {row.primary} {row.secondary ? `• ${row.secondary}` : ''}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-mute">{row.detail}</p>
                  </div>
                  <span className="badge border-slate-200 bg-white text-slate-600">{row.status || '-'}</span>
                </div>
                {row.meta.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.meta.slice(0, 4).map((meta) => (
                      <span key={`${row.id}-${meta}`} className="badge border-slate-200 bg-white text-slate-600">
                        {meta}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            )

            if (!href) {
              return (
                <div key={row.id} className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                  {content}
                </div>
              )
            }

            return (
              <Link
                key={row.id}
                href={href}
                className="block rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 transition hover:[border-color:var(--color-line-strong)]"
              >
                {content}
              </Link>
            )
          })
        ) : (
          <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-mute">
            {emptyMessage}
          </div>
        )}
      </div>
    </section>
  )
}

export default async function InventoryBarcodeDetailPage({
  params,
}: {
  params: Promise<{ itemCode: string }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/inventory')) {
    redirect('/dashboard')
  }

  const { itemCode: rawItemCode } = await params
  const itemCode = decodeURIComponent(rawItemCode ?? '').trim().toUpperCase()
  if (!itemCode) {
    notFound()
  }

  const [payload, lifecyclePayload] = await Promise.all([
    getDomainPageData('inventory', session, {}),
    getDeviceLifecycleLogs({ limit: 200 }),
  ])
  if (!payload) {
    notFound()
  }

  const sections = payload.content.reviewSections ?? []
  const dismantleHistoryRows = await getDismantleHistoryRowsForItem(itemCode, payload.source)
  const itemSection = findSection(sections, 'ITEM INVENTORY TERBARU')
  const requestSection = findSection(sections, 'REQUEST INVENTORY TEKNISI')
  const movementSection = findSection(sections, 'STOCK MOVEMENT TERBARU')
  const assignmentSection = findSection(sections, 'DEVICE ASSIGNMENT TERBARU')
  const returnSection = findSection(sections, 'DEVICE RETURN TERBARU')

  const itemRow =
    itemSection?.rows.find((row) => normalizeText(row.primary) === normalizeText(itemCode)) ??
    itemSection?.rows.find((row) => getItemCodeFingerprint(row.primary) === getItemCodeFingerprint(itemCode)) ??
    null

  const requestRows = (requestSection?.rows ?? []).filter((item) => matchesItemComposite(item.secondary, itemCode))
  const movementRows = (movementSection?.rows ?? []).filter((item) => matchesItemComposite(item.secondary, itemCode))
  const assignmentRows = (assignmentSection?.rows ?? []).filter((item) => matchesItemComposite(item.primary, itemCode))
  const returnRows = (returnSection?.rows ?? []).filter((item) => matchesItemComposite(item.primary, itemCode))
  const lifecycleRows = lifecyclePayload.items.filter(
    (item) => getItemCodeFingerprint(item.itemCode) === getItemCodeFingerprint(itemCode),
  )

  if (!itemRow && !requestRows.length && !movementRows.length && !assignmentRows.length && !returnRows.length && !lifecycleRows.length) {
    notFound()
  }

  const itemLabel = itemRow?.secondary || lifecycleRows[0]?.itemName || requestRows[0]?.secondary.split('|')[1]?.trim() || '-'
  const relativePath = buildInventoryItemRelativePath(itemCode)
  const detailPath = buildInventoryBarcodeDetailPath(itemCode)
  const latestLifecycle = lifecycleRows[0] ?? null
  const latestAssignment = assignmentRows[0] ?? null
  const latestReturn = returnRows[0] ?? null
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
  const dismantleBacklinkRows: DomainReviewRow[] = dismantleHistoryRows.map((entry) => ({
    id: `DIS-${entry.historyId}`,
    primary: entry.customerName || `Histori Dismantle #${entry.historyId}`,
    secondary: entry.serviceNo || '-',
    status: 'CLOSE',
    detail:
      entry.closeNote?.split('\n').find((line) => line.trim())?.trim() ||
      'Kasus dismantle close yang mengembalikan item ini ke histori support.',
    meta: [
      `Closed: ${entry.closedAt || '-'}`,
      `Service No: ${entry.serviceNo || '-'}`,
      `Returned Item Codes: ${
        parseReturnedItemCodes(entry.returnedItemCodes).length
          ? parseReturnedItemCodes(entry.returnedItemCodes).join(', ')
          : itemCode
      }`,
      `Support History ID: ${entry.historyId}`,
    ],
  }))

  return (
    <div className="space-y-6">
      <DataSourceStatus source={payload.source} />
      <section className="panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="section-title">Detail Barcode Inventory</p>
            <h1 className="mt-2 text-2xl font-semibold text-[var(--color-ink-strong)]">{itemCode}</h1>
            <p className="mt-3 text-sm leading-6 text-mute">
              {itemLabel} {latestLifecycle?.ticketRef ? `• ${latestLifecycle.ticketRef}` : ''}{' '}
              {latestLifecycle?.lifecycleStatus ? `• ${formatLifecycleStatus(latestLifecycle.lifecycleStatus)}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/inventory/items"
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Kembali ke item
            </Link>
            <Link
              href={detailPath}
              className="surface-soft inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
            >
              Refresh detail
            </Link>
          </div>
        </div>

        {lifecyclePayload.error ? (
          <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
            <p className="text-sm font-semibold">Lifecycle review DB belum bisa dibaca penuh</p>
            <p className="mt-2 text-sm leading-6">{lifecyclePayload.error}</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {[
            { label: 'Request', value: requestRows.length },
            { label: 'Movement', value: movementRows.length },
            { label: 'Assignment', value: assignmentRows.length },
            { label: 'Return', value: returnRows.length },
            { label: 'Lifecycle', value: lifecycleRows.length },
            { label: 'Bukti Handover', value: lifecycleRows.filter((row) => row.handoverProofRef).length },
          ].map((card) => (
            <article key={card.label} className="rounded-2xl border border-line bg-surface px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-[var(--color-ink-strong)]">{card.value}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-line bg-surface p-5">
            <p className="section-title">Ringkasan Item</p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Kode Item</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">{itemCode}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Nama Item</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">{itemLabel}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Status Master</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">{itemRow?.status || '-'}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Stok Saat Ini</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">{pickMeta(itemRow?.meta ?? [], 'Current Stock: ') || '-'}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Rack</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">{pickMeta(itemRow?.meta ?? [], 'Rack: ') || '-'}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Relative Path</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)] break-all text-right">{relativePath}</dd>
              </div>
            </dl>
            {itemRow?.detail ? (
              <div className="mt-5 rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Deskripsi</p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-ink-strong)]">{itemRow.detail}</p>
              </div>
            ) : null}
          </section>

          <section className="rounded-3xl border border-line bg-surface p-5">
            <p className="section-title">Audit Terkini</p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Ticket Terakhir</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">{latestLifecycle?.ticketRef || '-'}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Status Lifecycle</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">
                  {formatLifecycleStatus(latestLifecycle?.lifecycleStatus)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Validasi NOC</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">
                  {formatLifecycleValidationStatus(latestLifecycle?.validationStatus)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Serial Terakhir</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">{latestSerial || '-'}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">PIC Terakhir</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">{latestPic || '-'}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Lokasi Terakhir</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">{latestLocation || '-'}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Handover Terakhir</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)] text-right">{latestHandover || '-'}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-mute">Update Terakhir</dt>
                <dd className="font-semibold text-[var(--color-ink-strong)]">{latestLifecycle?.createdAt || '-'}</dd>
              </div>
            </dl>
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <DetailListCard
            title="Request Terkait"
            description="Request barang yang memakai item atau barcode ini."
            rows={requestRows}
            emptyMessage="Belum ada request yang tertaut ke item ini."
            hrefBuilder={(row) => buildTrackingHref(row.id, 'REQ')}
          />
          <DetailListCard
            title="Movement Terkait"
            description="Pergerakan stok masuk atau keluar yang terkait ke item ini."
            rows={movementRows}
            emptyMessage="Belum ada movement yang tertaut ke item ini."
            hrefBuilder={(row) => buildTrackingHref(row.id, 'MOV')}
          />
          <DetailListCard
            title="Assignment Terkait"
            description="Assignment device yang menghubungkan item ini ke layanan atau work order."
            rows={assignmentRows}
            emptyMessage="Belum ada assignment yang tertaut ke item ini."
          />
          <DetailListCard
            title="Return Terkait"
            description="Return perangkat yang mengembalikan item ini ke inventory atau audit lapangan."
            rows={returnRows}
            emptyMessage="Belum ada return yang tertaut ke item ini."
          />
          <DetailListCard
            title="Histori Dismantle Terkait"
            description="Kasus terminate close yang mengembalikan item ini dan bisa dibuka lagi ke lane support dismantle."
            rows={dismantleBacklinkRows}
            emptyMessage="Belum ada histori dismantle yang mengembalikan item ini."
            hrefBuilder={(row) =>
              buildSupportLaneHref('dismantle', {
                focus: 'CLOSED_THIS_PERIOD',
                customer: row.primary,
                service: row.secondary !== '-' ? row.secondary : '',
                dismantleHistory: `${row.id.replace(/^DIS-/, '')} | ${row.primary} | ${row.secondary}`,
              })
            }
          />
        </div>

        <section className="mt-6 rounded-3xl border border-line bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="section-title">Timeline Lifecycle Penuh</p>
              <p className="mt-2 text-sm leading-6 text-mute">
                Histori end-to-end per barcode dari inventory, NOC, tim lapangan, sampai validasi akhir.
              </p>
            </div>
            <span className="badge border-slate-200 bg-white text-slate-600">{lifecycleRows.length} event</span>
          </div>

          <div className="mt-4 space-y-3">
            {lifecycleRows.length ? (
              lifecycleRows.map((entry) => (
                <article key={entry.id} className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                        {formatLifecycleStatus(entry.lifecycleStatus)} • {formatLifecycleEventType(entry.eventType)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-mute">
                        {entry.notes || entry.locationName || entry.ticketRef || 'Belum ada catatan tambahan.'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {entry.ticketRef ? (
                        <span className="badge border-slate-200 bg-white text-slate-600">{entry.ticketRef}</span>
                      ) : null}
                      <span className="badge border-slate-200 bg-white text-slate-600">{entry.createdAt || '-'}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.actorName ? (
                      <span className="badge border-slate-200 bg-white text-slate-600">PIC: {entry.actorName}</span>
                    ) : null}
                    {entry.locationName ? (
                      <span className="badge border-slate-200 bg-white text-slate-600">Lokasi: {entry.locationName}</span>
                    ) : null}
                    {entry.targetTeam ? (
                      <span className="badge border-slate-200 bg-white text-slate-600">Tim: {entry.targetTeam}</span>
                    ) : null}
                    <span className="badge border-slate-200 bg-white text-slate-600">
                      Validasi: {formatLifecycleValidationStatus(entry.validationStatus)}
                    </span>
                    {entry.handoverFromLabel || entry.handoverToLabel ? (
                      <span className="badge border-slate-200 bg-white text-slate-600">
                        Handover: {entry.handoverFromLabel || '-'} {'->'} {entry.handoverToLabel || '-'}
                      </span>
                    ) : null}
                    {entry.handoverProofRef ? (
                      <span className="badge border-slate-200 bg-white text-slate-600">
                        Bukti: {formatHandoverProofType(entry.handoverProofType)} / {entry.handoverProofRef}
                      </span>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-mute">
                Belum ada histori lifecycle untuk barcode ini.
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  )
}
