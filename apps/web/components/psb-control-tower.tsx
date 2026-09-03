'use client'

import { memo, type MouseEvent } from 'react'
import Link from 'next/link'
import type {
  PsbActivationStatus,
  PsbBillingStatus,
  PsbListItem,
  PsbListStatus,
  PsbTimelineEvent,
} from '@/lib/psb-list-shared'

type ControlTowerProps = {
  item: PsbListItem
  canUpdate: boolean
  canApprove: boolean
  TransitionSlot: React.ReactNode
}

function getStatusTone(status: PsbListStatus) {
  switch (status) {
    case 'BARU':
      return { badge: 'border-sky-200 bg-sky-50 text-sky-700', dot: 'bg-sky-500', label: 'Baru' }
    case 'REVIEW_CS':
      return { badge: 'border-amber-200 bg-amber-50 text-amber-700', dot: 'bg-amber-500', label: 'Review CS' }
    case 'PERLU_KOREKSI':
      return { badge: 'border-orange-200 bg-orange-50 text-orange-700', dot: 'bg-orange-500', label: 'Perlu Koreksi' }
    case 'DISETUJUI':
      return { badge: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', label: 'Disetujui' }
    case 'DITOLAK':
      return { badge: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500', label: 'Ditolak' }
    case 'DITRANSFER_KE_TICKETING':
      return { badge: 'border-violet-200 bg-violet-50 text-violet-700', dot: 'bg-violet-500', label: 'Sudah ke Ticketing' }
    default:
      return { badge: 'border-slate-200 bg-slate-50 text-slate-700', dot: 'bg-slate-500', label: status }
  }
}

function getActivationLabelAndTone(status: PsbActivationStatus) {
  switch (status) {
    case 'CUSTOMER_ACTIVE':
      return { label: 'Aktif', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: '✅' }
    case 'RADIUS_ACTIVATED':
      return { label: 'Radius Aktif', tone: 'border-teal-200 bg-teal-50 text-teal-700', icon: '🔌' }
    case 'ODP_PORT_ASSIGNED':
      return { label: 'Port ODP Siap', tone: 'border-indigo-200 bg-indigo-50 text-indigo-700', icon: '🟦' }
    case 'ONU_ASSIGNED':
      return { label: 'ONU Siap', tone: 'border-sky-200 bg-sky-50 text-sky-700', icon: '📦' }
    case 'PENDING':
    default:
      return { label: 'Pending', tone: 'border-slate-200 bg-slate-50 text-slate-600', icon: '⏳' }
  }
}

function getBillingLabelAndTone(status: PsbBillingStatus) {
  switch (status) {
    case 'FIRST_PAYMENT_RECEIVED':
      return { label: 'Pembayaran Pertama', tone: 'border-emerald-200 bg-emerald-50 text-emerald-700', icon: '💚' }
    case 'INVOICE_SENT':
      return { label: 'Invoice Terkirim', tone: 'border-sky-200 bg-sky-50 text-sky-700', icon: '📩' }
    case 'INVOICE_DRAFT':
      return { label: 'Draft Invoice', tone: 'border-amber-200 bg-amber-50 text-amber-700', icon: '📝' }
    case 'NOT_GENERATED':
    default:
      return { label: 'Belum Generate', tone: 'border-slate-200 bg-slate-50 text-slate-600', icon: '🗒️' }
  }
}

function formatClock(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 5)
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function formatDateTimeLong(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function buildFallbackTimeline(item: PsbListItem): PsbTimelineEvent[] {
  return [
    {
      key: 'PSB_CREATED',
      label: 'PSB dibuat',
      happenedAt: item.createdAt,
      actorLabel: item.salesOwnerName ?? 'Sales',
      notes: item.activityNotes,
    },
    {
      key: 'CS_REVIEWED',
      label: 'CS Review',
      happenedAt: item.reviewedAt,
      actorLabel: item.csPicName ?? 'CS',
      notes: item.reviewNotes,
    },
    {
      key: 'APPROVED',
      label: 'Approved',
      happenedAt: item.approvedAt,
      actorLabel: item.csPicName ?? 'CS Admin',
      notes: item.reviewNotes,
    },
    {
      key: 'WO_CREATED',
      label: 'WO dibuat',
      happenedAt: item.workOrderCreatedAt,
      actorLabel: 'NOC',
      notes: item.workOrderCode ? `Work Order ${item.workOrderCode}` : null,
    },
    {
      key: 'TECHNICIAN_ASSIGNED',
      label: 'Teknisi assigned',
      happenedAt: item.technicianAssignedAt,
      actorLabel: item.technicianName,
      notes: item.technicianName ? `${item.technicianName} sebagai pelaksana lapangan` : null,
    },
    {
      key: 'INSTALLATION_SCHEDULED',
      label: 'Instalasi',
      happenedAt: item.installationStartedAt ?? item.requestedInstallDate,
      actorLabel: item.technicianName,
      notes: item.escortNotes ?? item.activityNotes,
    },
    {
      key: 'ONU_INSTALLED',
      label: 'ONU installed',
      happenedAt: item.onuInstalledAt,
      actorLabel: item.technicianName,
      notes: item.onuSerialNumber ? `Serial ${item.onuSerialNumber}` : null,
    },
    {
      key: 'ODP_PORT_ASSIGNED',
      label: 'ODP Port assigned',
      happenedAt: item.odpPortAssignedAt,
      actorLabel: 'NOC / Teknisi',
      notes: item.odpCode && item.odpPortLabel ? `${item.odpCode} · ${item.odpPortLabel}` : null,
    },
    {
      key: 'RADIUS_ACTIVATED',
      label: 'Radius activated',
      happenedAt: item.radiusActivatedAt,
      actorLabel: 'NOC / Radius',
      notes: null,
    },
    {
      key: 'CUSTOMER_ACTIVE',
      label: 'Customer active',
      happenedAt: item.customerActiveAt,
      actorLabel: item.csPicName ?? 'NOC',
      notes: null,
    },
    {
      key: 'BILLING_INVOICE_GENERATED',
      label: 'Invoice bulan pertama',
      happenedAt: item.invoiceGeneratedAt,
      actorLabel: 'Finance',
      notes: null,
    },
    {
      key: 'BILLING_PAYMENT_RECEIVED',
      label: 'Pembayaran diterima',
      happenedAt: item.firstPaymentReceivedAt,
      actorLabel: 'Finance',
      notes: null,
    },
  ]
}

function getTimelineTone(event: PsbTimelineEvent, index: number, total: number) {
  const done = Boolean(event.happenedAt)
  const active = !done && index === Math.min(
    total - 1,
    buildFallbackTimelineIndexHint(event.key, {})
  )
  if (done) return 'dot:bg-emerald-500 ring:ring-emerald-100 line:bg-emerald-200 text:text-emerald-700 bg:bg-emerald-50/70'
  if (active) return 'dot:bg-indigo-500 ring:ring-indigo-100 line:bg-slate-200 text:text-indigo-700 bg:bg-indigo-50/70'
  return 'dot:bg-slate-300 ring:ring-slate-50 line:bg-slate-200 text:text-slate-500 bg:bg-slate-50'
}

function buildFallbackTimelineIndexHint(key: PsbTimelineEvent['key'], _ctx: Record<string, unknown>) {
  const order: PsbTimelineEvent['key'][] = [
    'PSB_CREATED',
    'CS_REVIEWED',
    'APPROVED',
    'WO_CREATED',
    'TECHNICIAN_ASSIGNED',
    'INSTALLATION_SCHEDULED',
    'ONU_INSTALLED',
    'ODP_PORT_ASSIGNED',
    'RADIUS_ACTIVATED',
    'CUSTOMER_ACTIVE',
    'BILLING_INVOICE_GENERATED',
    'BILLING_PAYMENT_RECEIVED',
  ]
  return Math.max(0, order.indexOf(key))
}

function InfoTile({
  label,
  value,
  subValue,
  href,
  tone,
  icon,
}: {
  label: string
  value: React.ReactNode
  subValue?: React.ReactNode
  href?: string
  tone?: { badge: string }
  icon?: React.ReactNode
}) {
  const wrapperClass = href
    ? 'rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md'
    : 'rounded-2xl border border-slate-200 bg-white p-4'
  const body = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        {icon ? <span aria-hidden>{icon}</span> : null}
      </div>
      <div>
        <p
          className={
            tone
              ? `inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${tone.badge}`
              : 'text-base font-semibold leading-6 text-slate-950 break-words'
          }
        >
          {value}
        </p>
      </div>
      {subValue ? (
        <p className="text-xs leading-5 text-slate-500 break-words">{subValue}</p>
      ) : null}
    </div>
  )
  if (href) {
    return (
      <Link href={href} className={wrapperClass} target="_blank" rel="noreferrer">
        {body}
      </Link>
    )
  }
  return <div className={wrapperClass}>{body}</div>
}

export const PsbControlTower = memo(function PsbControlTower({
  item,
  canUpdate,
  canApprove,
  TransitionSlot,
}: ControlTowerProps) {
  const status = getStatusTone(item.status)
  const activation = getActivationLabelAndTone(item.activationStatus)
  const billing = getBillingLabelAndTone(item.billingStatus)
  const timeline = item.timelineEvents?.length ? item.timelineEvents : buildFallbackTimeline(item)
  const firstNotDoneIndex = Math.max(
    0,
    timeline.findIndex((e) => !e.happenedAt)
  )
  const activeIndex = firstNotDoneIndex === -1 ? timeline.length - 1 : firstNotDoneIndex

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-200/70">Control Tower · PSB End-to-End</p>
            <h2 className="text-2xl font-bold tracking-tight">{item.psbListCode}</h2>
            <p className="text-sm text-slate-300">{item.nextActionLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur ${status.badge}`}>
              <span className={`inline-block h-2 w-2 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            <span className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur ${activation.tone}`}>
              <span aria-hidden>{activation.icon}</span>
              Aktivasi · {activation.label}
            </span>
            <span className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur ${billing.tone}`}>
              <span aria-hidden>{billing.icon}</span>
              Billing · {billing.label}
            </span>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <InfoTile
          label="Customer"
          value={item.customerName}
          subValue={item.customerPhone ?? 'Nomor HP belum diisi'}
          href={`/customers?q=${encodeURIComponent(item.customerName ?? '')}`}
          icon="👤"
        />
        <InfoTile
          label="Package"
          value={item.packageLabel ?? '-'}
          subValue={item.requestedInstallDate ? `Target pasang: ${formatDateTimeLong(item.requestedInstallDate)}` : 'Tanggal target belum diset'}
          icon="📶"
        />
        <InfoTile
          label="Status"
          value={status.label}
          subValue={formatDateTimeLong(item.updatedAt)}
          tone={{ badge: status.badge }}
          icon="🚦"
        />
        <InfoTile
          label="Sales"
          value={item.salesOwnerName ?? '-'}
          subValue={item.createdAt ? `Dibuat: ${formatDateTimeLong(item.createdAt)}` : undefined}
          icon="🧑💼"
        />
        <InfoTile
          label="Location"
          value={item.areaLabel ?? item.addressText.slice(0, 32)}
          subValue={item.addressText}
          href={item.googleMapsLink ?? undefined}
          icon="📍"
        />
        <InfoTile
          label="Network"
          value={item.odpCode ?? '-'}
          subValue={item.odpPortLabel ?? 'ODP / Port ODP belum ditetapkan'}
          icon="🗄️"
        />
        <InfoTile
          label="Work Order"
          value={
            item.transferredWorkOrderId ? (
              <Link
                href={`/dashboard/tracking/work-orders/${item.transferredWorkOrderId}`}
                className="text-base font-semibold leading-6 text-slate-950 underline-offset-4 hover:underline break-words"
                onClick={(e: MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
              >
                {item.workOrderCode ?? `WO #${item.transferredWorkOrderId}`}
              </Link>
            ) : (
              item.workOrderCode ?? '-'
            )
          }
          subValue={
            item.transferredWorkOrderId
              ? item.technicianAssignedAt
                ? `Assigned: ${formatDateTimeLong(item.technicianAssignedAt)}`
                : 'Menunggu penugasan teknisi'
              : 'Menunggu transfer ke Ticketing'
          }
          href={
            item.transferredWorkOrderId
              ? `/dashboard/tracking/work-orders/${item.transferredWorkOrderId}`
              : undefined
          }
          icon="🧾"
        />
        {item.transferredTicketRef ? (
          <InfoTile
            label="Trouble Ticket"
            value={
              <Link
                href={`/dashboard/tracking/noc-queue?ticketType=PSB&q=${encodeURIComponent(item.transferredTicketRef)}`}
                className="text-base font-semibold leading-6 text-slate-950 underline-offset-4 hover:underline break-words"
                onClick={(e: MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
              >
                {item.transferredTicketRef}
              </Link>
            }
            subValue={'Kategori PSB · Pemasangan Baru'}
            href={`/dashboard/tracking/noc-queue?ticketType=PSB&q=${encodeURIComponent(item.transferredTicketRef)}`}
            icon="🎫"
          />
        ) : null}
        <InfoTile
          label="Technician"
          value={item.technicianName ?? '-'}
          subValue={item.technicianAssignedAt ? `Assigned: ${formatDateTimeLong(item.technicianAssignedAt)}` : 'Menunggu penugasan teknisi'}
          icon="👷"
        />
        <InfoTile
          label="Inventory"
          value={item.onuSerialNumber ?? '-'}
          subValue={item.onuInstalledAt ? `Terpasang: ${formatDateTimeLong(item.onuInstalledAt)}` : 'Perangkat ONU belum di-assign'}
          icon="📦"
        />
        <InfoTile
          label="Customer Master"
          value={
            item.customerId ? (
              <Link
                href={`/customers/${encodeURIComponent(String(item.customerId))}`}
                className="text-base font-semibold leading-6 text-slate-950 underline-offset-4 hover:underline break-words"
                onClick={(e: MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
                target="_blank"
                rel="noreferrer"
              >
                {item.customerCode ?? `Customer #${item.customerId}`}
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                (Belum dibuat)
              </span>
            )
          }
          subValue={
            item.customerId
              ? item.customerCode
                ? `CRM ID #${item.customerId}`
                : `CRM ID #${item.customerId} · Finalisasi aktivasi untuk generate kode pelanggan`
              : 'Finalisasi aktivasi untuk generate data pelanggan otomatis sesuai rule CRM existing.'
          }
          href={item.customerId ? `/customers/${encodeURIComponent(String(item.customerId))}` : undefined}
          icon="🏢"
        />
        <InfoTile
          label="Subscription"
          value={
            item.subscriptionId ? (
              <Link
                href={`/sales/subscriptions?q=${encodeURIComponent(item.serviceNo ?? String(item.subscriptionId))}`}
                className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                onClick={(e: MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
                target="_blank"
                rel="noreferrer"
                aria-label={`Buka subscription ${item.serviceNo ?? `SVC-${String(item.subscriptionId).padStart(6, '0')}`} di halaman sales`}
              >
                {item.serviceNo ?? `SVC-${String(item.subscriptionId).padStart(6, '0')}`}
              </Link>
            ) : (
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                (Belum dibuat)
              </span>
            )
          }
          subValue={
            item.subscriptionId
              ? `Langganan ID #${item.subscriptionId} · Status ACTIVE (jika finalisasi sukses)`
              : 'Finalisasi aktivasi untuk generate langganan baru dan linkage ke master pelanggan.'
          }
          href={item.subscriptionId ? `/sales/subscriptions?q=${encodeURIComponent(item.serviceNo ?? String(item.subscriptionId))}` : undefined}
          icon="🔐"
        />
        <InfoTile
          label="Activation"
          value={`${activation.icon} ${activation.label}`}
          subValue={item.radiusActivatedAt ? `Radius on: ${formatDateTimeLong(item.radiusActivatedAt)}` : item.customerActiveAt ? `Aktif: ${formatDateTimeLong(item.customerActiveAt)}` : 'Menunggu teknisi selesai instalasi'}
          tone={{ badge: activation.tone }}
          icon="🔌"
        />
        <InfoTile
          label="Billing"
          value={`${billing.icon} ${billing.label}`}
          subValue={item.invoiceGeneratedAt ? `Invoice: ${formatDateTimeLong(item.invoiceGeneratedAt)}` : item.firstPaymentReceivedAt ? `Lunas: ${formatDateTimeLong(item.firstPaymentReceivedAt)}` : 'Akan generate setelah customer aktif'}
          tone={{ badge: billing.tone }}
          icon="🧾"
        />
        <InfoTile
          label="Role Batch"
          value={canApprove ? 'Approve aktif' : canUpdate ? 'Update aktif' : 'Mode monitor'}
          subValue={canApprove ? 'Bisa Approve & Transfer Ticketing' : canUpdate ? 'Bisa Submit Review / Minta Koreksi' : 'Hanya melihat progress PSB'}
          icon="🛡️"
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Timeline End-to-End</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-950">Perjalanan PSB {item.psbListCode}</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Selesai
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Saat Ini
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              Akan Datang
            </span>
          </div>
        </div>

        <ol className="relative mt-6 space-y-4 pl-2">
          <span
            aria-hidden
            className="pointer-events-none absolute left-[35px] top-3 h-[calc(100%-1.5rem)] w-px bg-gradient-to-b from-emerald-200 via-indigo-100 to-slate-200"
          />
          {timeline.map((event, index) => {
            const isLast = index === timeline.length - 1
            const toneCode = getTimelineTone(event, index, timeline.length)
            const isActive = !event.happenedAt && index === activeIndex
            const isDone = Boolean(event.happenedAt)
            const [dotTone, ringTone] = toneCode.split(' ').filter((part) => part.startsWith('dot:') || part.startsWith('ring:')).map((t) => t.split(':')[1])
            const textTone = toneCode.split(' ').find((t) => t.startsWith('text:'))?.split(':')[1] ?? 'text-slate-700'
            const bgTone = toneCode.split(' ').find((t) => t.startsWith('bg:'))?.split(':')[1] ?? 'bg-slate-50'
            return (
              <li key={`${event.key}-${index}`} className="relative">
                <div
                  className={`absolute left-[19px] top-1 flex h-8 w-8 items-center justify-center rounded-full ring-8 ${ringTone}`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full ring-2 ring-white ${dotTone}`}
                  />
                </div>
                <div className={`ml-16 rounded-2xl border border-slate-200 ${bgTone} px-4 py-3 ${isActive ? 'shadow-[0_0_0_2px_rgba(99,102,241,0.15)]' : ''}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-semibold ${isDone ? 'text-slate-950' : textTone}`}>
                        {index + 1}. {event.label}
                      </p>
                      {isActive ? (
                        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-700">
                          In Progress
                        </span>
                      ) : null}
                      {isLast && isDone ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                          Complete
                        </span>
                      ) : null}
                    </div>
                    <p className={`text-xs font-semibold ${event.happenedAt ? 'text-slate-700' : 'text-slate-400'}`}>
                      {formatClock(event.happenedAt) ?? '--:--'}
                    </p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{event.actorLabel ?? '—'}</span>
                    <span>·</span>
                    <span>{formatDateTimeLong(event.happenedAt)}</span>
                  </div>
                  {event.notes ? (
                    <p className="mt-2 text-xs leading-5 text-slate-600">{event.notes}</p>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      {TransitionSlot}
    </div>
  )
})
