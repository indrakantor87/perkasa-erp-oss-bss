import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { PageHeader } from '@/components/page-header'
import { StatusBadge } from '@/components/ui-status-badge'
import { canAccessPath, canPerformAction } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'
import { getTroubleTicketTrackingList, getWorkOrderTrackingList } from '@/lib/services/tracking-service'
import type { DataSourceSnapshot } from '@/lib/types'

type CustomerLookupParams = {
  customerNameLike: string
  customerIdRaw: string | null
  serviceNo: string | null
  subscriptionNo: string | null
}

type CustomerSubscriptionRow = {
  id: number
  serviceNo: string | null
  planLabel: string | null
  status: string | null
  activatedAt: string | null
  nextBillingAt: string | null
  billingCycle: string | null
  recurringAmount: string | null
}

type CustomerTTRow = {
  id: number
  ticketCode: string | null
  customerName: string | null
  category: string | null
  type: string | null
  status: string | null
  openedAt: string | null
  closedAt: string | null
  matchMode: 'exact_customer_id' | 'exact_service_no' | 'exact_subscription_no' | 'name_like' | 'none'
  resolutionAction: string | null
  closeNotes: string | null
  latestProgress: string | null
  descendantWoIds: number[]
  descendantWoCodes: (string | null)[]
}

type CustomerWORow = {
  id: number
  workOrderNo: string | null
  customerName: string | null
  jobCategory: string | null
  workType: string | null
  status: string | null
  scheduledAt: string | null
  matchMode: 'exact_customer_id' | 'exact_service_no' | 'exact_subscription_no' | 'name_like' | 'none'
  sourceTroubleTicketId: number | null
  sourceTroubleTicketCode: string | null
  completionNotes: string | null
  completedAt: string | null
}

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function buildTtStatusTone(status: string | null | undefined) {
  const s = String(status ?? '').trim().toUpperCase()
  if (s === 'CLOSED' || s === 'COMPLETED' || s === 'RESOLVED' || s === 'READY') return 'closed' as const
  if (s === 'ACCEPTED' || s === 'IN_PROGRESS' || s === 'ON_PROGRESS' || s.startsWith('ON_')) return 'in_progress' as const
  if (s === 'OPEN' || s === 'OVERDUE' || s === 'ESCALATED') return 'danger' as const
  if (s === 'PENDING' || s === 'REVIEW' || s === 'WAITING' || s === 'HOLD' || s === 'MONITOR') return 'pending' as const
  if (s === 'ASSIGNED') return 'assigned' as const
  return 'neutral' as const
}

function buildWoStatusTone(status: string | null | undefined) {
  const s = String(status ?? '').trim().toUpperCase()
  if (s === 'DONE' || s === 'COMPLETED' || s === 'CLOSED') return 'closed' as const
  if (s === 'IN_PROGRESS' || s === 'ON_PROGRESS' || s.startsWith('ON_')) return 'in_progress' as const
  if (s === 'OPEN' || s === 'OVERDUE') return 'danger' as const
  if (s === 'SCHEDULED' || s === 'PENDING' || s === 'HOLD') return 'pending' as const
  if (s === 'ASSIGNED') return 'assigned' as const
  return 'neutral' as const
}

function resolveMatchModeBadge(mode: CustomerTTRow['matchMode'] | CustomerWORow['matchMode']) {
  switch (mode) {
    case 'exact_customer_id':
      return {
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' as const,
        label: 'Exact Match · Customer ID',
      }
    case 'exact_service_no':
      return {
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' as const,
        label: 'Exact Match · Service No',
      }
    case 'exact_subscription_no':
      return {
        tone: 'border-emerald-200 bg-emerald-50 text-emerald-700' as const,
        label: 'Exact Match · Subscription',
      }
    case 'name_like':
      return {
        tone: 'border-amber-200 bg-amber-50 text-amber-700' as const,
        label: 'Fallback · Name LIKE',
      }
    default:
      return { tone: 'border-slate-200 bg-slate-50 text-slate-600' as const, label: 'Lookup' }
  }
}

function resolveSubscriptionStatusTone(status: string | null | undefined) {
  const s = String(status ?? '').trim().toUpperCase()
  if (s === 'ACTIVE' || s === 'AKTIF' || s === 'RUNNING' || s === 'SUBSCRIBED') return 'in_progress' as const
  if (s === 'PENDING' || s === 'PROVISIONING' || s === 'TRIAL') return 'pending' as const
  if (s === 'SUSPENDED' || s === 'NON_AKTIF' || s === 'OVERDUE' || s.startsWith('BLOCK')) return 'danger' as const
  if (s === 'TERMINATED' || s === 'CLOSED' || s === 'CANCELED') return 'closed' as const
  return 'neutral' as const
}

async function getCustomerTroubleTickets(lookup: CustomerLookupParams, source: DataSourceSnapshot): Promise<CustomerTTRow[]> {
  if (source.effectiveMode !== 'review-db' || source.isFallback) return []

  const numericCustomerId = lookup.customerIdRaw && /^\d+$/.test(lookup.customerIdRaw.trim())
    ? Number.parseInt(lookup.customerIdRaw.trim(), 10)
    : null

  const [
    hasId, hasTicketCode, hasCustomerName, hasCategory, hasType, hasStatus, hasOpenedAt, hasClosedAt,
    hasCustomerId, hasServiceNo, hasSubscriptionNo,
    hasResolutionAction, hasCloseNotes, hasLatestProgress,
  ] = await Promise.all([
    hasReviewDbColumn('support_trouble_tickets', 'id'),
    hasReviewDbColumn('support_trouble_tickets', 'ticket_code'),
    hasReviewDbColumn('support_trouble_tickets', 'customer_name'),
    hasReviewDbColumn('support_trouble_tickets', 'category'),
    hasReviewDbColumn('support_trouble_tickets', 'type'),
    hasReviewDbColumn('support_trouble_tickets', 'status'),
    hasReviewDbColumn('support_trouble_tickets', 'opened_at'),
    hasReviewDbColumn('support_trouble_tickets', 'closed_at'),
    hasReviewDbColumn('support_trouble_tickets', 'customer_id'),
    hasReviewDbColumn('support_trouble_tickets', 'service_no'),
    hasReviewDbColumn('support_trouble_tickets', 'subscription_no'),
    hasReviewDbColumn('support_trouble_tickets', 'resolution_action'),
    hasReviewDbColumn('support_trouble_tickets', 'close_notes'),
    hasReviewDbColumn('support_trouble_tickets', 'latest_progress'),
  ])

  if (!hasId || !hasCustomerName) return []

  let whereClause = ''
  const values: unknown[] = []
  let matchMode: CustomerTTRow['matchMode'] = 'none'

  if (numericCustomerId !== null && hasCustomerId) {
    whereClause = 'tt.customer_id = ?'
    values.push(numericCustomerId)
    matchMode = 'exact_customer_id'
  } else if (lookup.serviceNo && hasServiceNo) {
    whereClause = 'tt.service_no = ?'
    values.push(String(lookup.serviceNo).trim())
    matchMode = 'exact_service_no'
  } else if (lookup.subscriptionNo && hasSubscriptionNo) {
    whereClause = 'tt.subscription_no = ?'
    values.push(String(lookup.subscriptionNo).trim())
    matchMode = 'exact_subscription_no'
  } else if (lookup.customerNameLike.trim()) {
    whereClause = 'tt.customer_name LIKE ?'
    values.push(`%${lookup.customerNameLike.trim()}%`)
    matchMode = 'name_like'
  } else {
    return []
  }

  const rows = await runReviewDbQuery<Omit<CustomerTTRow, 'descendantWoIds' | 'descendantWoCodes'> & { __rawClosed?: unknown }>(
    `
      SELECT
        tt.id AS id,
        ${hasTicketCode ? 'tt.ticket_code' : 'NULL'} AS ticketCode,
        ${hasCustomerName ? 'tt.customer_name' : 'NULL'} AS customerName,
        ${hasCategory ? 'tt.category' : 'NULL'} AS category,
        ${hasType ? 'tt.type' : 'NULL'} AS type,
        ${hasStatus ? 'tt.status' : 'NULL'} AS status,
        ${hasOpenedAt ? 'tt.opened_at' : 'NULL'} AS openedAt,
        ${hasClosedAt ? 'tt.closed_at' : 'NULL'} AS closedAt,
        ${hasResolutionAction ? 'tt.resolution_action' : 'NULL'} AS resolutionAction,
        ${hasCloseNotes ? 'tt.close_notes' : 'NULL'} AS closeNotes,
        ${hasLatestProgress ? 'tt.latest_progress' : 'NULL'} AS latestProgress
      FROM support_trouble_tickets tt
      WHERE ${whereClause}
      ORDER BY tt.id DESC
      LIMIT 20
    `,
    values,
  )

  if (rows.length === 0) return [] as CustomerTTRow[]

  const ttIds = rows.map((r) => Number(r.id)).filter((n) => Number.isFinite(n) && n > 0)
  const [
    hasWoTTId, hasWoId, hasWoNo,
  ] = await Promise.all([
    hasReviewDbColumn('field_work_orders', 'trouble_ticket_id'),
    hasReviewDbColumn('field_work_orders', 'id'),
    hasReviewDbColumn('field_work_orders', 'work_order_no'),
  ])

  const woMap = new Map<number, { ids: number[]; codes: (string | null)[] }>()
  if (hasWoTTId && hasWoId && ttIds.length > 0) {
    try {
      const placeholders = ttIds.map(() => '?').join(', ')
      const woRows = await runReviewDbQuery<{ sourceTtId: unknown; id: unknown; workOrderNo: unknown }>(
        `
          SELECT
            wo.trouble_ticket_id AS sourceTtId,
            wo.id AS id,
            ${hasWoNo ? 'wo.work_order_no' : 'NULL'} AS workOrderNo
          FROM field_work_orders wo
          WHERE wo.trouble_ticket_id IN (${placeholders})
          ORDER BY wo.id ASC
        `,
        ttIds,
      )
      for (const woRow of woRows) {
        const ttKey = Number(woRow.sourceTtId)
        if (!Number.isFinite(ttKey) || ttKey <= 0) continue
        const wId = Number(woRow.id)
        const bucket = woMap.get(ttKey) ?? { ids: [], codes: [] }
        if (Number.isFinite(wId) && wId > 0) bucket.ids.push(wId)
        bucket.codes.push(typeof woRow.workOrderNo === 'string' ? woRow.workOrderNo : null)
        woMap.set(ttKey, bucket)
      }
    } catch (_e) {
      // skip descendant linkage on column error
    }
  }

  return rows.map((row) => {
    const bucket = woMap.get(Number(row.id)) ?? { ids: [], codes: [] }
    return {
      id: Number(row.id),
      ticketCode: row.ticketCode ?? null,
      customerName: row.customerName ?? null,
      category: row.category ?? null,
      type: row.type ?? null,
      status: row.status ?? null,
      openedAt: row.openedAt ?? null,
      closedAt: row.closedAt ?? null,
      matchMode,
      resolutionAction: row.resolutionAction ?? null,
      closeNotes: row.closeNotes ?? null,
      latestProgress: row.latestProgress ?? null,
      descendantWoIds: bucket.ids,
      descendantWoCodes: bucket.codes,
    }
  })
}

async function getCustomerWorkOrders(lookup: CustomerLookupParams, source: DataSourceSnapshot): Promise<CustomerWORow[]> {
  if (source.effectiveMode !== 'review-db' || source.isFallback) return []

  const numericCustomerId = lookup.customerIdRaw && /^\d+$/.test(lookup.customerIdRaw.trim())
    ? Number.parseInt(lookup.customerIdRaw.trim(), 10)
    : null

  const [
    hasId, hasWoNo, hasCustomerName, hasJobCategory, hasWorkType, hasStatus, hasScheduledAt,
    hasCustomerId, hasServiceNo, hasSubscriptionNo,
    hasWoTTId, hasCompletionNotes, hasCompletedAt,
    hasTTId, hasTTCode,
  ] = await Promise.all([
    hasReviewDbColumn('field_work_orders', 'id'),
    hasReviewDbColumn('field_work_orders', 'work_order_no'),
    hasReviewDbColumn('field_work_orders', 'customer_name'),
    hasReviewDbColumn('field_work_orders', 'job_category'),
    hasReviewDbColumn('field_work_orders', 'work_type'),
    hasReviewDbColumn('field_work_orders', 'status'),
    hasReviewDbColumn('field_work_orders', 'scheduled_at'),
    hasReviewDbColumn('field_work_orders', 'customer_id'),
    hasReviewDbColumn('field_work_orders', 'service_no'),
    hasReviewDbColumn('field_work_orders', 'subscription_no'),
    hasReviewDbColumn('field_work_orders', 'trouble_ticket_id'),
    hasReviewDbColumn('field_work_orders', 'completion_notes'),
    hasReviewDbColumn('field_work_orders', 'completed_at'),
    hasReviewDbColumn('support_trouble_tickets', 'id'),
    hasReviewDbColumn('support_trouble_tickets', 'ticket_code'),
  ])

  if (!hasId || !hasCustomerName) return []

  let whereClause = ''
  const values: unknown[] = []
  let matchMode: CustomerWORow['matchMode'] = 'none'

  if (numericCustomerId !== null && hasCustomerId) {
    whereClause = 'wo.customer_id = ?'
    values.push(numericCustomerId)
    matchMode = 'exact_customer_id'
  } else if (lookup.serviceNo && hasServiceNo) {
    whereClause = 'wo.service_no = ?'
    values.push(String(lookup.serviceNo).trim())
    matchMode = 'exact_service_no'
  } else if (lookup.subscriptionNo && hasSubscriptionNo) {
    whereClause = 'wo.subscription_no = ?'
    values.push(String(lookup.subscriptionNo).trim())
    matchMode = 'exact_subscription_no'
  } else if (lookup.customerNameLike.trim()) {
    whereClause = 'wo.customer_name LIKE ?'
    values.push(`%${lookup.customerNameLike.trim()}%`)
    matchMode = 'name_like'
  } else {
    return []
  }

  const canJoinSourceTT = hasWoTTId && hasTTId && hasTTCode
  const rows = await runReviewDbQuery<{
    id: unknown
    workOrderNo: unknown
    customerName: unknown
    jobCategory: unknown
    workType: unknown
    status: unknown
    scheduledAt: unknown
    sourceTroubleTicketId: unknown
    sourceTroubleTicketCode: unknown
    completionNotes: unknown
    completedAt: unknown
  }>(
    `
      SELECT
        wo.id AS id,
        ${hasWoNo ? 'wo.work_order_no' : 'NULL'} AS workOrderNo,
        ${hasCustomerName ? 'wo.customer_name' : 'NULL'} AS customerName,
        ${hasJobCategory ? 'wo.job_category' : 'NULL'} AS jobCategory,
        ${hasWorkType ? 'wo.work_type' : 'NULL'} AS workType,
        ${hasStatus ? 'wo.status' : 'NULL'} AS status,
        ${hasScheduledAt ? 'wo.scheduled_at' : 'NULL'} AS scheduledAt,
        ${canJoinSourceTT ? 'wo.trouble_ticket_id' : 'NULL'} AS sourceTroubleTicketId,
        ${canJoinSourceTT ? 'tt.ticket_code' : 'NULL'} AS sourceTroubleTicketCode,
        ${hasCompletionNotes ? 'wo.completion_notes' : 'NULL'} AS completionNotes,
        ${hasCompletedAt ? 'wo.completed_at' : 'NULL'} AS completedAt
      FROM field_work_orders wo
      ${canJoinSourceTT ? 'LEFT JOIN support_trouble_tickets tt ON tt.id = wo.trouble_ticket_id' : ''}
      WHERE ${whereClause}
      ORDER BY wo.id DESC
      LIMIT 20
    `,
    values,
  )

  return rows.map((row) => ({
    id: Number(row.id),
    workOrderNo: typeof row.workOrderNo === 'string' ? row.workOrderNo : null,
    customerName: typeof row.customerName === 'string' ? row.customerName : null,
    jobCategory: typeof row.jobCategory === 'string' ? row.jobCategory : null,
    workType: typeof row.workType === 'string' ? row.workType : null,
    status: typeof row.status === 'string' ? row.status : null,
    scheduledAt: typeof row.scheduledAt === 'string' ? row.scheduledAt : null,
    matchMode,
    sourceTroubleTicketId: row.sourceTroubleTicketId != null ? Number(row.sourceTroubleTicketId) || null : null,
    sourceTroubleTicketCode: typeof row.sourceTroubleTicketCode === 'string' ? row.sourceTroubleTicketCode : null,
    completionNotes: typeof row.completionNotes === 'string' ? row.completionNotes : null,
    completedAt: typeof row.completedAt === 'string' ? row.completedAt : null,
  }))
}

async function getCustomerSubscriptions(lookup: CustomerLookupParams, source: DataSourceSnapshot): Promise<CustomerSubscriptionRow[]> {
  if (source.effectiveMode !== 'review-db' || source.isFallback) return []

  const numericCustomerId = lookup.customerIdRaw && /^\d+$/.test(lookup.customerIdRaw.trim())
    ? Number.parseInt(lookup.customerIdRaw.trim(), 10)
    : null

  const [
    hasId, hasServiceNo, hasPlanLabel, hasPackageName, hasProductName,
    hasStatus, hasActivatedAt, hasNextBillingAt, hasBillingCycle,
    hasRecurringAmount, hasMonthlyFee,
    hasCustomerId, hasSubscriptionNo, hasCustomerName,
  ] = await Promise.all([
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'service_no'),
    hasReviewDbColumn('service_subscriptions', 'plan_label'),
    hasReviewDbColumn('service_subscriptions', 'package_name'),
    hasReviewDbColumn('service_subscriptions', 'product_label'),
    hasReviewDbColumn('service_subscriptions', 'status'),
    hasReviewDbColumn('service_subscriptions', 'activated_at'),
    hasReviewDbColumn('service_subscriptions', 'next_billing_at'),
    hasReviewDbColumn('service_subscriptions', 'billing_cycle'),
    hasReviewDbColumn('service_subscriptions', 'recurring_amount'),
    hasReviewDbColumn('service_subscriptions', 'monthly_fee'),
    hasReviewDbColumn('service_subscriptions', 'customer_id'),
    hasReviewDbColumn('service_subscriptions', 'subscription_no'),
    hasReviewDbColumn('service_subscriptions', 'customer_name'),
  ])

  if (!hasId) return []

  const planCol = hasPlanLabel
    ? 'plan_label'
    : hasPackageName
      ? 'package_name'
      : hasProductName
        ? 'product_label'
        : null
  const amountCol = hasRecurringAmount
    ? 'recurring_amount'
    : hasMonthlyFee
      ? 'monthly_fee'
      : null

  let whereClause = ''
  const values: unknown[] = []

  if (numericCustomerId !== null && hasCustomerId) {
    whereClause = 'ss.customer_id = ?'
    values.push(numericCustomerId)
  } else if (lookup.subscriptionNo && hasSubscriptionNo) {
    whereClause = 'ss.subscription_no = ?'
    values.push(String(lookup.subscriptionNo).trim())
  } else if (lookup.serviceNo && hasServiceNo) {
    whereClause = 'ss.service_no = ?'
    values.push(String(lookup.serviceNo).trim())
  } else if (lookup.customerNameLike.trim() && hasCustomerName) {
    whereClause = 'ss.customer_name LIKE ?'
    values.push(`%${lookup.customerNameLike.trim()}%`)
  } else {
    return []
  }

  const rows = await runReviewDbQuery<CustomerSubscriptionRow>(
    `
      SELECT
        ss.id AS id,
        ${hasServiceNo ? 'ss.service_no' : 'NULL'} AS serviceNo,
        ${planCol ? `ss.${planCol}` : 'NULL'} AS planLabel,
        ${hasStatus ? 'ss.status' : 'NULL'} AS status,
        ${hasActivatedAt ? 'ss.activated_at' : 'NULL'} AS activatedAt,
        ${hasNextBillingAt ? 'ss.next_billing_at' : 'NULL'} AS nextBillingAt,
        ${hasBillingCycle ? 'ss.billing_cycle' : 'NULL'} AS billingCycle,
        ${amountCol ? `ss.${amountCol}` : 'NULL'} AS recurringAmount
      FROM service_subscriptions ss
      WHERE ${whereClause}
      ORDER BY ss.id DESC
      LIMIT 10
    `,
    values,
  )

  return rows
}

function GapCard(props: { title: string; reason: string; hint?: string }) {
  return (
    <div className="card-tier-2 border border-dashed border-warningLine bg-warningSoft/40 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-warningInk/80">INTEGRATION GAP</p>
          <h4 className="mt-2 font-semibold text-warningInk">{props.title}</h4>
        </div>
        <StatusBadge tone="warning" label="NOT_CONNECTED" size="sm" />
      </div>
      <p className="mt-3 text-sm leading-6 text-warningInk/90">{props.reason}</p>
      {props.hint ? (
        <p className="mt-2 text-xs leading-5 text-warningInk/70">Catatan: {props.hint}</p>
      ) : null}
    </div>
  )
}

function EmptyCard(props: { title: string; subtitle?: string }) {
  return (
    <div className="card-tier-2 border border-line bg-surfaceSoft p-4 sm:p-5 text-center">
      <p className="text-sm font-semibold text-inkStrong">{props.title}</p>
      {props.subtitle ? (
        <p className="mt-1 text-xs leading-5 text-mute">{props.subtitle}</p>
      ) : null}
    </div>
  )
}

export default async function CustomerHistoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>
  searchParams: Promise<{
    name?: string | string[]
    subscription?: string | string[]
    phone?: string | string[]
  }>
}) {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/customers')) {
    redirect('/dashboard')
  }

  const canCreateSupport = canPerformAction(session.role, 'support', 'create')
  const canExportCustomers = canPerformAction(session.role, 'customers', 'export')

  const { customerId } = await params
  const resolvedSearchParams = await searchParams
  const nameParam = resolveSearchParam(resolvedSearchParams.name)
  const subscriptionParam = resolveSearchParam(resolvedSearchParams.subscription)
  const phoneParam = resolveSearchParam(resolvedSearchParams.phone)
  const serviceNoParam = resolveSearchParam((resolvedSearchParams as { service?: string | string[] }).service)

  const lookup: CustomerLookupParams = {
    customerNameLike: nameParam || '',
    customerIdRaw: customerId && customerId !== '[customerId]' ? customerId : null,
    serviceNo: serviceNoParam || null,
    subscriptionNo: subscriptionParam || null,
  }

  const source = getDataSourceSnapshot()
  const fallbackLabel = lookup.customerIdRaw ?? (nameParam || 'Customer Lookup')

  const breadcrumbs = [
    { label: 'Workspace', href: '/dashboard' },
    { label: 'Customers', href: '/customers' },
    { label: fallbackLabel },
  ]

  const prefillParams = new URLSearchParams()
  if (nameParam) prefillParams.set('customer', nameParam)
  if (phoneParam) prefillParams.set('phone', phoneParam)
  if (subscriptionParam) prefillParams.set('subscription', subscriptionParam)
  if (lookup.customerIdRaw && /^\d+$/.test(lookup.customerIdRaw)) prefillParams.set('customerId', lookup.customerIdRaw)
  const prefill = prefillParams.toString()

  const pageActions = (
    <>
      <Link href="/customers" className="btn-ghost tap-44 focus-visible:shadow-focus">
        Kembali ke Customers
      </Link>
      <Link href="/dashboard/tracking" className="btn-secondary tap-44 focus-visible:shadow-focus">
        Buka Tracking
      </Link>
      {canCreateSupport ? (
        <>
          <Link
            href={`/support?lane=tt&focus=CREATE_COMPLAINT${prefill ? `&${prefill}` : ''}`}
            className="btn-primary tap-44 focus-visible:shadow-focus"
          >
            Buat Keluhan (Complaint)
          </Link>
          <Link
            href={`/support?lane=tt&focus=CREATE_SERVICE_REQUEST${prefill ? `&${prefill}` : ''}`}
            className="btn-secondary tap-44 focus-visible:shadow-focus"
          >
            Buat Service Request
          </Link>
        </>
      ) : null}
    </>
  )

  const [ttRows, woRows, subscriptionRows] = source.effectiveMode === 'review-db' && !source.isFallback
    ? await Promise.all([
        getCustomerTroubleTickets(lookup, source),
        getCustomerWorkOrders(lookup, source),
        getCustomerSubscriptions(lookup, source),
      ])
    : [[], [], []] as const

  const ttMatchMode = ttRows.length ? ttRows[0].matchMode : 'none'
  const woMatchMode = woRows.length ? woRows[0].matchMode : 'none'

  const customerIdentity = {
    id: lookup.customerIdRaw ?? customerId,
    name: nameParam || (lookup.customerIdRaw ? `Customer #${lookup.customerIdRaw}` : customerId),
    subscription: subscriptionParam,
    serviceNo: serviceNoParam,
    phone: phoneParam,
  }

  const closedResolutions = ttRows
    .filter((t) => (t.status === 'CLOSED' || t.status === 'RESOLVED') && (t.resolutionAction || t.closeNotes))
    .sort((a, b) => {
      const at = a.closedAt ? Date.parse(a.closedAt) : -Infinity
      const bt = b.closedAt ? Date.parse(b.closedAt) : -Infinity
      return bt - at
    })
    .slice(0, 5)

  type TimelineEvent = {
    kind:
      | 'TT_CREATED'
      | 'TT_PROGRESS'
      | 'TT_CLOSED'
      | 'WO_SCHEDULED'
      | 'WO_ASSIGNED'
      | 'WO_COMPLETED'
      | 'UNKNOWN'
    id: string
    label: string
    anchor: string
    href: string | null
    timestamp: number
    timestampLabel: string
    description: string | null
  }

  const correlationTimeline: TimelineEvent[] = (() => {
    const events: TimelineEvent[] = []
    for (const tt of ttRows) {
      if (tt.openedAt) {
        const tms = Date.parse(tt.openedAt)
        if (!Number.isNaN(tms)) {
          events.push({
            kind: 'TT_CREATED',
            id: `tt-opened-${tt.id}`,
            label: 'TT Dibuka',
            anchor: tt.ticketCode || `TT #${tt.id}`,
            href: `/dashboard/tracking/trouble-tickets/${tt.id}`,
            timestamp: tms,
            timestampLabel: tt.openedAt,
            description: [tt.type, tt.category].filter(Boolean).join(' • ') || null,
          })
        }
      }
      if (tt.latestProgress && tt.status !== 'CLOSED' && tt.status !== 'RESOLVED') {
        const base = tt.openedAt ? Date.parse(tt.openedAt) : Date.now()
        events.push({
          kind: 'TT_PROGRESS',
          id: `tt-progress-${tt.id}`,
          label: 'TT Progress',
          anchor: tt.ticketCode || `TT #${tt.id}`,
          href: `/dashboard/tracking/trouble-tickets/${tt.id}`,
          timestamp: base + 1,
          timestampLabel: `${tt.status || 'ON_PROGRESS'} — latest progress`,
          description: tt.latestProgress,
        })
      }
      if (tt.closedAt) {
        const tms = Date.parse(tt.closedAt)
        if (!Number.isNaN(tms)) {
          events.push({
            kind: 'TT_CLOSED',
            id: `tt-closed-${tt.id}`,
            label: 'TT Ditutup',
            anchor: tt.ticketCode || `TT #${tt.id}`,
            href: `/dashboard/tracking/trouble-tickets/${tt.id}`,
            timestamp: tms,
            timestampLabel: tt.closedAt,
            description: [tt.resolutionAction, tt.closeNotes].filter(Boolean).join(' — ') || null,
          })
        }
      }
    }
    for (const wo of woRows) {
      if (wo.scheduledAt) {
        const tms = Date.parse(wo.scheduledAt)
        if (!Number.isNaN(tms)) {
          events.push({
            kind: 'WO_SCHEDULED',
            id: `wo-sched-${wo.id}`,
            label: 'WO Dijadwalkan',
            anchor: wo.workOrderNo || `WO #${wo.id}`,
            href: `/dashboard/tracking/work-orders/${wo.id}`,
            timestamp: tms,
            timestampLabel: wo.scheduledAt,
            description: [wo.jobCategory, wo.workType].filter(Boolean).join(' • ') || null,
          })
        }
      }
      if (wo.status === 'ASSIGNED' || wo.status === 'ACCEPTED') {
        const base = wo.scheduledAt ? Date.parse(wo.scheduledAt) : Date.now()
        events.push({
          kind: 'WO_ASSIGNED',
          id: `wo-assign-${wo.id}`,
          label: 'WO Diambil Teknisi',
          anchor: wo.workOrderNo || `WO #${wo.id}`,
          href: `/dashboard/tracking/work-orders/${wo.id}`,
          timestamp: base + 2,
          timestampLabel: `Status ${wo.status}`,
          description: wo.jobCategory ? `Kategori: ${wo.jobCategory}` : null,
        })
      }
      if (wo.completedAt) {
        const tms = Date.parse(wo.completedAt)
        if (!Number.isNaN(tms)) {
          events.push({
            kind: 'WO_COMPLETED',
            id: `wo-done-${wo.id}`,
            label: 'WO Selesai',
            anchor: wo.workOrderNo || `WO #${wo.id}`,
            href: `/dashboard/tracking/work-orders/${wo.id}`,
            timestamp: tms,
            timestampLabel: wo.completedAt,
            description: wo.completionNotes || null,
          })
        }
      }
    }
    return events.sort((a, b) => a.timestamp - b.timestamp)
  })()

  return (
    <div className="space-y-6 content-fade-in">
      <DataSourceStatus source={source} />
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={customerIdentity.name || `Customer #${customerId}`}
        description="Rekap histori customer: layanan, ticket gangguan, work order lapangan, aktivitas tim, material/asset, dan resolusi terakhir."
        actions={pageActions}
      />

      <section aria-label="Identitas customer" className="card-tier-1 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muteStrong">Snapshot Customer</p>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-mute">ID Lookup</p>
                <p className="mt-1 font-semibold text-inkStrong">{customerIdentity.id}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-mute">Nama</p>
                <p className="mt-1 font-semibold text-inkStrong">{customerIdentity.name || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-mute">No. Layanan</p>
                <p className="mt-1 font-semibold text-inkStrong">{customerIdentity.serviceNo || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-mute">Subscription</p>
                <p className="mt-1 font-semibold text-inkStrong">{customerIdentity.subscription || '-'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-mute">Phone</p>
                <p className="mt-1 font-semibold text-inkStrong">{customerIdentity.phone || '-'}</p>
              </div>
            </div>
          </div>
          <StatusBadge tone="info" label="Customer History" size="md" />
        </div>
      </section>

      <section aria-label="Ringkasan cepat" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="card-tier-2 border border-line bg-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">Layanan Aktif</p>
          <p className="mt-2 text-3xl font-semibold text-inkStrong">{subscriptionRows.length}</p>
          <p className="mt-2 text-sm leading-6 text-mute">Paket berlangganan aktif untuk customer ini.</p>
        </div>
        <div className="card-tier-2 border border-line bg-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">Ticket Gangguan</p>
          <p className="mt-2 text-3xl font-semibold text-inkStrong">{ttRows.length}</p>
          <p className="mt-2 text-sm leading-6 text-mute">Trouble ticket terhubung ke lookup customer ini.</p>
        </div>
        <div className="card-tier-2 border border-line bg-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">Work Order Lapangan</p>
          <p className="mt-2 text-3xl font-semibold text-inkStrong">{woRows.length}</p>
          <p className="mt-2 text-sm leading-6 text-mute">Work order field untuk lookup customer ini.</p>
        </div>
        <div className="card-tier-2 border border-line bg-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">Aktivitas Harian</p>
          <p className="mt-2 text-3xl font-semibold text-inkStrong">—</p>
          <p className="mt-2 text-sm leading-6 text-mute">Lihat bagian Integration Gap Daily Activity di bawah.</p>
        </div>
        <div className="card-tier-2 border border-line bg-card p-4 sm:p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-muteStrong">Asset / Material</p>
          <p className="mt-2 text-3xl font-semibold text-inkStrong">—</p>
          <p className="mt-2 text-sm leading-6 text-mute">Lihat bagian Integration Gap Asset & Material di bawah.</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section aria-label="Layanan & Subscription" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Ringkasan Layanan Aktif
                </p>
                <p className="mt-1 text-xs text-mute">Paket berlangganan, nomor internet, billing cycle, dan status aktif customer.</p>
              </div>
              {subscriptionRows.length ? (
                <StatusBadge tone="neutral" label={String(subscriptionRows.length)} size="sm" />
              ) : source.effectiveMode === 'review-db' && !source.isFallback ? (
                <StatusBadge tone="warning" label="GAP" size="sm" />
              ) : (
                <StatusBadge tone="neutral" label="Review DB off" size="sm" />
              )}
            </div>
            <div className="mt-5 space-y-3">
              {subscriptionRows.length ? (
                subscriptionRows.map((row) => (
                  <Link
                    key={`sub-${row.id}`}
                    href={`/sales/subscriptions?q=${encodeURIComponent(row.serviceNo ?? String(row.id))}`}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-control border border-line bg-cardSubtle px-4 py-4 transition hover:border-lineStrong no-underline"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-inkStrong">
                        {row.serviceNo || `Subscription #${row.id}`}
                      </p>
                      <StatusBadge tone={resolveSubscriptionStatusTone(row.status)} label={row.status || 'UNKNOWN'} size="sm" />
                      {row.billingCycle ? (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                          {row.billingCycle}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink">
                      {row.planLabel || 'Paket layanan'}
                      {row.recurringAmount ? (
                        <span className="ml-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                          {row.recurringAmount}
                        </span>
                      ) : null}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs text-mute sm:grid-cols-3">
                      <div>
                        <p className="uppercase tracking-[0.14em] text-muteStrong">Aktif Sejak</p>
                        <p className="mt-1 font-semibold text-inkStrong">{row.activatedAt || '-'}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.14em] text-muteStrong">Billing Berikutnya</p>
                        <p className="mt-1 font-semibold text-inkStrong">{row.nextBillingAt || '-'}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-[0.14em] text-muteStrong">ID</p>
                        <p className="mt-1 font-semibold text-inkStrong">#{row.id}</p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : source.effectiveMode === 'review-db' && !source.isFallback ? (
                <GapCard
                  title="Belum ditemukan record subscription untuk lookup customer ini."
                  reason="Query sudah berjalan dengan exact match priority (customer_id → service_no → subscription_no → fallback name LIKE) tapi belum mengembalikan hasil. Tidak ada fabricate data."
                  hint="Periksa kembali foreign key customer_id pada tabel service_subscriptions, atau gunakan lookup service_no / subscription_no yang eksplisit via URL query parameter `?subscription=` / `?service=`."
                />
              ) : (
                <EmptyCard
                  title="Mode Review DB belum aktif."
                  subtitle="Ringkasan layanan hanya tersedia jika review database terhubung (tanpa fabrication / mock data)."
                />
              )}
            </div>
          </section>

          <section aria-label="Trouble Ticket customer" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                    Trouble Ticket Terkait
                  </p>
                  {ttRows.length ? (
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${resolveMatchModeBadge(ttMatchMode).tone}`}>
                      {resolveMatchModeBadge(ttMatchMode).label}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-mute">
                  {ttRows.length
                    ? `${ttRows.length} ticket terakhir untuk lookup customer "${customerIdentity.name || customerIdentity.id}".`
                    : 'Daftar ticket gangguan yang mengacu ke customer ini.'}
                </p>
              </div>
              <StatusBadge tone="neutral" label={String(ttRows.length)} size="sm" />
            </div>
            <div className="mt-5 space-y-3">
              {ttRows.length ? (
                ttRows.map((row) => (
                  <div
                    key={`tt-${row.id}`}
                    className="rounded-control border border-line bg-cardSubtle px-4 py-3 transition hover:border-lineStrong"
                  >
                    <Link
                      href={`/dashboard/tracking/trouble-tickets/${row.id}`}
                      className="block"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-inkStrong">
                          {row.ticketCode || `TT #${row.id}`}
                        </p>
                        <StatusBadge tone={buildTtStatusTone(row.status)} label={row.status || 'DRAFT'} size="sm" />
                      </div>
                      <p className="mt-1 text-sm leading-6 text-mute">
                        {[row.type, row.category].filter(Boolean).join(' • ') || 'Trouble Ticket'}
                        {row.openedAt ? ` • Dibuka ${row.openedAt}` : ''}
                        {row.closedAt ? ` • Ditutup ${row.closedAt}` : ''}
                      </p>
                    </Link>
                    {(row.status === 'CLOSED' || row.status === 'RESOLVED') && (row.resolutionAction || row.closeNotes) ? (
                      <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5">
                        {row.resolutionAction ? (
                          <p className="text-xs font-semibold text-emerald-800">
                            Resolusi: {row.resolutionAction}
                          </p>
                        ) : null}
                        {row.closeNotes ? (
                          <p className="mt-1 text-[11px] leading-5 text-emerald-700/90">
                            Close Notes: {row.closeNotes}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {row.latestProgress && row.status !== 'CLOSED' && row.status !== 'RESOLVED' ? (
                      <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Progress Terbaru</p>
                        <p className="mt-1 text-xs leading-5 text-sky-900/90">{row.latestProgress}</p>
                      </div>
                    ) : null}
                    {row.descendantWoIds?.length ? (
                      <div className="mt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muteStrong mb-1.5">
                          Work Order Turunan ({row.descendantWoIds.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {row.descendantWoIds.map((woId, idx) => {
                            const woCode = row.descendantWoCodes?.[idx]
                            return (
                              <Link
                                key={`tt-${row.id}-wo-${woId}`}
                                href={`/dashboard/tracking/work-orders/${woId}`}
                                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition"
                              >
                                {woCode || `WO #${woId}`}
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              ) : source.effectiveMode === 'review-db' && !source.isFallback ? (
                <EmptyCard
                  title="Belum ada trouble ticket yang cocok dengan lookup customer ini."
                  subtitle="Nama customer pada ticket mungkin berbeda format atau ticket belum dibuat."
                />
              ) : (
                <EmptyCard
                  title="Mode Review DB belum aktif."
                  subtitle="Daftar ticket gangguan hanya tersedia jika review database terhubung (tanpa fabrication / mock data)."
                />
              )}
            </div>
          </section>

          <section aria-label="Work Order customer" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                    Work Order Lapangan Terkait
                  </p>
                  {woRows.length ? (
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${resolveMatchModeBadge(woMatchMode).tone}`}>
                      {resolveMatchModeBadge(woMatchMode).label}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-mute">
                  {woRows.length
                    ? `${woRows.length} work order terakhir untuk lookup customer "${customerIdentity.name || customerIdentity.id}".`
                    : 'Daftar WO field untuk customer ini.'}
                </p>
              </div>
              <StatusBadge tone="neutral" label={String(woRows.length)} size="sm" />
            </div>
            <div className="mt-5 space-y-3">
              {woRows.length ? (
                woRows.map((row) => (
                  <div
                    key={`wo-${row.id}`}
                    className="rounded-control border border-line bg-cardSubtle px-4 py-3 transition hover:border-lineStrong"
                  >
                    <Link
                      href={`/dashboard/tracking/work-orders/${row.id}`}
                      className="block"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-inkStrong">
                          {row.workOrderNo || `WO #${row.id}`}
                        </p>
                        <StatusBadge tone={buildWoStatusTone(row.status)} label={row.status || 'OPEN'} size="sm" />
                      </div>
                      <p className="mt-1 text-sm leading-6 text-mute">
                        {[row.jobCategory, row.workType].filter(Boolean).join(' • ') || 'Field Work Order'}
                        {row.scheduledAt ? ` • Jadwal ${row.scheduledAt}` : ''}
                      </p>
                    </Link>
                    {row.sourceTroubleTicketId ? (
                      <div className="mt-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muteStrong mb-1">
                          Berasal dari Trouble Ticket
                        </p>
                        <Link
                          href={`/dashboard/tracking/trouble-tickets/${row.sourceTroubleTicketId}`}
                          className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700 hover:border-indigo-400 hover:text-indigo-900 transition"
                        >
                          {row.sourceTroubleTicketCode || `TT #${row.sourceTroubleTicketId}`}
                        </Link>
                      </div>
                    ) : null}
                    {(row.status === 'COMPLETED' || row.status === 'CLOSED') && row.completionNotes ? (
                      <div className="mt-2.5 rounded-xl border border-violet-200 bg-violet-50/80 px-3 py-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700 mb-1">
                          Catatan Penyelesaian
                        </p>
                        <p className="text-xs leading-5 text-violet-900/90">{row.completionNotes}</p>
                      </div>
                    ) : null}
                    {row.completedAt ? (
                      <p className="mt-2 text-[11px] text-mute">
                        Selesai pada: <span className="font-semibold text-inkStrong">{row.completedAt}</span>
                      </p>
                    ) : null}
                  </div>
                ))
              ) : source.effectiveMode === 'review-db' && !source.isFallback ? (
                <EmptyCard
                  title="Belum ada work order yang cocok dengan lookup customer ini."
                  subtitle="Tim field mungkin belum membuat WO dari ticket atau WO dicatat dengan format nama customer berbeda."
                />
              ) : (
                <EmptyCard
                  title="Mode Review DB belum aktif."
                  subtitle="Daftar work order hanya tersedia jika review database terhubung (tanpa fabrication / mock data)."
                />
              )}
            </div>
          </section>

          <section aria-label="Resolusi & Close Notes" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Resolusi & Close Notes
                </p>
                <p className="mt-1 text-xs text-mute">
                  {closedResolutions.length
                    ? `${closedResolutions.length} tindakan resolusi terbaru dari ticket yang sudah ditutup.`
                    : 'Rangkuman tindakan resolusi dari TT/WO close terbaru untuk customer.'}
                </p>
              </div>
              {closedResolutions.length ? (
                <StatusBadge tone="success" label={`${closedResolutions.length} Closed`} size="sm" />
              ) : source.effectiveMode === 'review-db' && !source.isFallback ? (
                <StatusBadge tone="neutral" label="Empty" size="sm" />
              ) : (
                <StatusBadge tone="neutral" label="Review DB off" size="sm" />
              )}
            </div>
            <div className="mt-5 space-y-3">
              {closedResolutions.length ? (
                closedResolutions.map((row, idx) => (
                  <div
                    key={`res-${row.id}-${idx}`}
                    className="rounded-control border border-emerald-100 bg-emerald-50/60 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/dashboard/tracking/trouble-tickets/${row.id}`}
                        className="text-sm font-semibold text-emerald-900 hover:text-emerald-700 underline-offset-2 hover:underline"
                      >
                        {row.ticketCode || `TT #${row.id}`}
                      </Link>
                      <StatusBadge tone="success" label={row.status || 'CLOSED'} size="sm" />
                      {row.closedAt ? (
                        <span className="text-[11px] text-mute">Ditutup {row.closedAt}</span>
                      ) : null}
                    </div>
                    {row.resolutionAction ? (
                      <p className="mt-2 text-sm font-semibold leading-6 text-emerald-900">
                        Resolusi: {row.resolutionAction}
                      </p>
                    ) : null}
                    {row.closeNotes ? (
                      <p className="mt-1 text-xs leading-5 text-emerald-800/90 whitespace-pre-wrap">
                        {row.closeNotes}
                      </p>
                    ) : null}
                    {row.descendantWoIds?.length ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {row.descendantWoIds.map((woId, woIdx) => (
                          <Link
                            key={`res-${row.id}-wo-${woId}`}
                            href={`/dashboard/tracking/work-orders/${woId}`}
                            className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:border-emerald-400 transition"
                          >
                            {row.descendantWoCodes?.[woIdx] || `WO #${woId}`}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : source.effectiveMode === 'review-db' && !source.isFallback ? (
                <EmptyCard
                  title="Belum ada ticket yang berstatus CLOSED / RESOLVED untuk customer ini."
                  subtitle="Semua resolusi akan muncul di sini segera setelah ticket ditandai selesai."
                />
              ) : (
                <EmptyCard
                  title="Mode Review DB belum aktif."
                  subtitle="Agregasi close notes hanya tersedia jika review database terhubung."
                />
              )}
            </div>
          </section>

          <section aria-label="Correlation Timeline Customer TT WO" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Correlation Timeline
                </p>
                <p className="mt-1 text-xs text-mute">
                  Urutan kronologis Customer → TT → WO → Progress → Resolution → Close (linkable setiap entry).
                </p>
              </div>
              {correlationTimeline.length ? (
                <StatusBadge tone="info" label={`${correlationTimeline.length} events`} size="sm" />
              ) : source.effectiveMode === 'review-db' && !source.isFallback ? (
                <StatusBadge tone="neutral" label="Empty" size="sm" />
              ) : (
                <StatusBadge tone="neutral" label="Review DB off" size="sm" />
              )}
            </div>
            <div className="mt-5">
              {correlationTimeline.length ? (
                <ol className="relative border-l border-slate-200 ml-2.5 space-y-5">
                  {correlationTimeline.map((ev, idx) => (
                    <li key={`tl-${ev.kind}-${ev.id}-${idx}`} className="ml-5">
                      <span
                        className={`absolute -left-1.5 mt-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-white ${
                          ev.kind === 'TT_CREATED'
                            ? 'bg-amber-500'
                            : ev.kind === 'TT_PROGRESS'
                            ? 'bg-sky-500'
                            : ev.kind === 'TT_CLOSED'
                            ? 'bg-emerald-500'
                            : ev.kind === 'WO_SCHEDULED' || ev.kind === 'WO_ASSIGNED'
                            ? 'bg-indigo-500'
                            : ev.kind === 'WO_COMPLETED'
                            ? 'bg-violet-500'
                            : 'bg-slate-400'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muteStrong">
                          {ev.label}
                        </p>
                        {ev.href ? (
                          <Link
                            href={ev.href}
                            className="text-sm font-semibold text-inkStrong hover:text-indigo-700 underline-offset-2 hover:underline"
                          >
                            {ev.anchor || ev.href.split('/').pop()}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-inkStrong">{ev.anchor}</p>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-mute">{ev.timestampLabel}</p>
                      {ev.description ? (
                        <p className="mt-1 text-xs leading-5 text-ink/90">{ev.description}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : source.effectiveMode === 'review-db' && !source.isFallback ? (
                <EmptyCard
                  title="Belum ada event TT/WO yang bisa diurutkan untuk timeline ini."
                  subtitle="Setelah ada ticket dan WO, timeline korelasi akan tampil otomatis."
                />
              ) : (
                <EmptyCard
                  title="Mode Review DB belum aktif."
                  subtitle="Timeline korelasi hanya tersedia jika review database terhubung."
                />
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section aria-label="Daily Activity history" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Daily Activity Tim
                </p>
                <p className="mt-1 text-xs text-mute">Catatan aktivitas harian teknisi / CS yang bersentuhan dengan customer.</p>
              </div>
              <StatusBadge tone="warning" label="GAP" size="sm" />
            </div>
            <div className="mt-5">
              <GapCard
                title="Customer ↔ Daily Activity belum terhubung via kolom referensi canonical."
                reason="Tabel daily_activity_records (atau domain pencatatan activity) belum menyimpan customer_id / trouble_ticket_id / work_order_id dengan FK terverifikasi pada query history aggregator ini. Tanpa kolom itu, kita tidak bisa mencocokkan activity ke customer tanpa fabrication."
                hint="Data activity individual masih tersedia pada halaman Daily Activity per teknisi / per tanggal."
              />
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Link
                href="/dashboard/daily-activity"
                className="btn-secondary tap-44 focus-visible:shadow-focus"
              >
                Buka Daily Activity
              </Link>
            </div>
          </section>

          <section aria-label="Material / Asset usage history" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">
                  Material & Asset
                </p>
                <p className="mt-1 text-xs text-mute">Perangkat yang dipasang / diganti, serta material yang terpakai untuk customer.</p>
              </div>
              <StatusBadge tone="warning" label="GAP" size="sm" />
            </div>
            <div className="mt-5">
              <GapCard
                title="Customer ↔ Inventory Movements / Device Lifecycle belum terintegrasi via lookup canonical."
                reason="Stock movement dan device lifecycle records sudah menyimpan work_order_id / trouble_ticket_id (bagian dari WO/TT terkait). Tapi aggregasi ke customer membutuhkan hop WO → customer / TT → customer yang belum divalidasi integrity-nya untuk halaman ini; jadi tidak ditampilkan agar tidak menyesatkan."
                hint="Buka detail Tracking Work Order / Trouble Ticket untuk melihat inventory movements dan device lifecycle terkait pekerjaan itu secara verbatim."
              />
            </div>
          </section>

          <section aria-label="Customer Quick Actions" className="card-tier-2 border border-line p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muteStrong">Aksi Cepat CS</p>
              {canCreateSupport ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  Akses Tulis Aktif
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                  Mode Read-Only
                </span>
              )}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-1">
              {canCreateSupport ? (
                <>
                  <Link
                    href={`/support?lane=tt&focus=CREATE_COMPLAINT${prefill ? `&${prefill}` : ''}`}
                    className="btn-primary tap-44 focus-visible:shadow-focus text-center"
                  >
                    Buat Keluhan (Complaint)
                  </Link>
                  <Link
                    href={`/support?lane=tt&focus=CREATE_SERVICE_REQUEST${prefill ? `&${prefill}` : ''}`}
                    className="btn-secondary tap-44 focus-visible:shadow-focus text-center"
                  >
                    Buat Service Request
                  </Link>
                </>
              ) : null}
              <Link
                href={`/support?lane=tt&focus=OPEN_TICKETS&customer=${encodeURIComponent(customerIdentity.name || customerIdentity.id)}`}
                className="btn-secondary tap-44 focus-visible:shadow-focus text-center"
              >
                Lihat Antre Ticket Customer
              </Link>
              {canPerformAction(session.role, 'sales', 'create') ? (
                <Link
                  href={`/sales#sales-action-work-order-create`}
                  className="btn-secondary tap-44 focus-visible:shadow-focus text-center"
                >
                  Buat Work Order Baru (dari Sales)
                </Link>
              ) : null}
              <Link
                href="/support?lane=tt"
                className="btn-ghost tap-44 focus-visible:shadow-focus text-center"
              >
                Lane Support TT
              </Link>
              <Link
                href="/customers/cs-admin"
                className="btn-ghost tap-44 focus-visible:shadow-focus text-center"
              >
                Workspace CS Admin
              </Link>
              {!canCreateSupport ? (
                <div className="mt-1 rounded-control border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs leading-5 text-amber-700">
                  Catatan: Role aktif tidak memiliki izin <strong>support:create</strong>. CTA Buat Keluhan dan Buat Service Request sengaja disembunyikan untuk menjaga integritas alur otorisasi.
                </div>
              ) : null}
            </div>
          </section>

          <section aria-label="Legend status integrasi" className="card-tier-2 border border-dashed border-line bg-surfaceSoft p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muteStrong">Legend Coverage</p>
            <div className="mt-4 space-y-2 text-sm leading-6 text-mute">
              <p>
                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border-emerald-200 bg-emerald-50 text-emerald-700 mr-2">CONNECTED</span>
                Data benar-benar berasal dari review DB canonical dengan kolom yang telah di-audit.
              </p>
              <p>
                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border-amber-200 bg-amber-50 text-amber-700 mr-2">NOT_CONNECTED</span>
                Join integrity belum cukup kuat untuk ditampilkan; sengaja tidak memakai data mock apapun.
              </p>
              <p>
                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border-slate-200 bg-white text-slate-700 mr-2">EMPTY</span>
                Review DB aktif tapi query tidak mengembalikan hasil (tidak berarti nol data, hanya tidak cocok dengan lookup ini).
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
