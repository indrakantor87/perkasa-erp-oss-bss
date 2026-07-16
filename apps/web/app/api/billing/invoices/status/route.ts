import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedStatuses = new Set(['CANCELLED', 'SUSPENDED', 'OVERDUE'])

type BillingInvoiceRow = {
  id: number
  invoiceNo: string
  customerName: string
  invoiceStatus: string
  paidAmount: number
  totalAmount: number
  notes: string | null
}

type BillingIsolationContextRow = {
  invoiceId: number
  invoiceNo: string
  subscriptionId: number | null
  orderId: number | null
  serviceNo: string | null
  customerCode: string | null
  customerName: string | null
  customerPhone: string | null
  customerAddress: string | null
}

type OpenIsolationRow = {
  id: number
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeOptionalText(value: unknown) {
  const normalized = normalizeText(value)
  return normalized || null
}

function getNormalizedInvoiceNoSqlExpression(expression: string) {
  return `REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(${expression})), CHAR(13), ''), CHAR(10), ''), CHAR(9), ''), ' ', '')`
}

async function getBillingInvoiceStatusQueryParts() {
  const [
    hasSubscriptionId,
    hasNotes,
    hasSubscriptionTableId,
    hasSubscriptionCustomerId,
    hasCustomerId,
    hasCustomerFullName,
  ] = await Promise.all([
    hasReviewDbColumn('billing_invoices', 'subscription_id'),
    hasReviewDbColumn('billing_invoices', 'notes'),
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'customer_id'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'full_name'),
  ])

  const canJoinSubscription = hasSubscriptionId && hasSubscriptionTableId
  const canJoinCustomer = canJoinSubscription && hasSubscriptionCustomerId && hasCustomerId

  return {
    customerJoin: canJoinCustomer
      ? `
      LEFT JOIN service_subscriptions ss
        ON ss.id = bi.subscription_id
      LEFT JOIN crm_customers c
        ON c.id = ss.customer_id`
      : '',
    customerNameExpression: canJoinCustomer && hasCustomerFullName ? 'c.full_name' : "'Customer belum terpetakan'",
    notesExpression: hasNotes ? 'bi.notes' : 'NULL',
  }
}

async function buildBillingInvoiceStatusUpdatePayload(params: {
  nextStatus: string
  mergedNotes: string
}) {
  const [hasInvoiceStatus, hasCollectionStatus, hasSuspendCandidate, hasNotes, hasUpdatedAt] = await Promise.all([
    hasReviewDbColumn('billing_invoices', 'invoice_status'),
    hasReviewDbColumn('billing_invoices', 'collection_status'),
    hasReviewDbColumn('billing_invoices', 'suspend_candidate'),
    hasReviewDbColumn('billing_invoices', 'notes'),
    hasReviewDbColumn('billing_invoices', 'updated_at'),
  ])

  if (!hasInvoiceStatus) {
    throw new Error('Schema inti billing_invoices belum siap. Kolom invoice_status wajib tersedia.')
  }

  const assignments = ['invoice_status = ?']
  const values: unknown[] = [params.nextStatus]

  if (hasCollectionStatus) {
    assignments.push(`collection_status = CASE
          WHEN ? = 'SUSPENDED' THEN 'SUSPEND'
          WHEN ? = 'OVERDUE' THEN 'REMINDER'
          ELSE 'CLOSED'
        END`)
    values.push(params.nextStatus, params.nextStatus)
  }
  if (hasSuspendCandidate) {
    assignments.push(`suspend_candidate = CASE
          WHEN ? = 'SUSPENDED' THEN 1
          ELSE 0
        END`)
    values.push(params.nextStatus)
  }
  if (hasNotes) {
    assignments.push('notes = ?')
    values.push(params.mergedNotes)
  }
  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  return {
    assignments,
    values,
  }
}

async function buildReconnectResolutionPayload(invoiceId: number, resolutionNote: string) {
  const [hasInvoiceId, hasActionStatus, hasDueFollowUpAt, hasNotes, hasActionType] = await Promise.all([
    hasReviewDbColumn('billing_collection_actions', 'invoice_id'),
    hasReviewDbColumn('billing_collection_actions', 'action_status'),
    hasReviewDbColumn('billing_collection_actions', 'due_follow_up_at'),
    hasReviewDbColumn('billing_collection_actions', 'notes'),
    hasReviewDbColumn('billing_collection_actions', 'action_type'),
  ])

  if (!hasInvoiceId || !hasActionStatus) {
    return null
  }

  const assignments = [`action_status = 'DONE'`]
  const values: unknown[] = []

  if (hasDueFollowUpAt) {
    assignments.push('due_follow_up_at = NULL')
  }
  if (hasNotes) {
    assignments.push(`notes = CASE
            WHEN notes IS NULL OR notes = '' THEN ?
            ELSE CONCAT(notes, '\n', ?)
          END`)
    values.push(resolutionNote, resolutionNote)
  }

  const whereClauses = ['invoice_id = ?', `COALESCE(UPPER(TRIM(action_status)), 'OPEN') = 'OPEN'`]
  values.push(invoiceId)

  if (hasActionType) {
    whereClauses.push(`COALESCE(UPPER(TRIM(action_type)), '') = 'RECONNECT'`)
  }

  return {
    assignments,
    whereClauses,
    values,
  }
}

async function loadBillingIsolationContext(invoiceNo: string) {
  const [
    hasInvoiceSubscriptionId,
    hasSubscriptionId,
    hasSubscriptionCustomerId,
    hasSubscriptionOrderId,
    hasSubscriptionServiceNo,
    hasCustomerId,
    hasCustomerCode,
    hasCustomerFullName,
    hasCustomerPhone,
    hasAddressCustomerId,
    hasAddressAddress,
    hasAddressIsPrimary,
  ] = await Promise.all([
    hasReviewDbColumn('billing_invoices', 'subscription_id'),
    hasReviewDbColumn('service_subscriptions', 'id'),
    hasReviewDbColumn('service_subscriptions', 'customer_id'),
    hasReviewDbColumn('service_subscriptions', 'order_id'),
    hasReviewDbColumn('service_subscriptions', 'service_no'),
    hasReviewDbColumn('crm_customers', 'id'),
    hasReviewDbColumn('crm_customers', 'customer_code'),
    hasReviewDbColumn('crm_customers', 'full_name'),
    hasReviewDbColumn('crm_customers', 'phone'),
    hasReviewDbColumn('crm_customer_addresses', 'customer_id'),
    hasReviewDbColumn('crm_customer_addresses', 'address'),
    hasReviewDbColumn('crm_customer_addresses', 'is_primary'),
  ])

  if (!hasInvoiceSubscriptionId || !hasSubscriptionId) {
    return null
  }

  const customerJoinClause =
    hasSubscriptionCustomerId && hasCustomerId
      ? `LEFT JOIN crm_customers c
        ON c.id = ss.customer_id`
      : `LEFT JOIN (
        SELECT
          NULL AS id,
          NULL AS customer_code,
          NULL AS full_name,
          NULL AS phone
      ) c
        ON 1 = 0`

  const addressJoinClause =
    hasSubscriptionCustomerId && hasCustomerId && hasAddressCustomerId && hasAddressAddress && hasAddressIsPrimary
      ? `LEFT JOIN crm_customer_addresses a
        ON a.customer_id = c.id
        AND a.is_primary = 1`
      : `LEFT JOIN (
        SELECT
          NULL AS customer_id,
          NULL AS address
      ) a
        ON 1 = 0`

  const [row] = await runReviewDbQuery<BillingIsolationContextRow>(
    `
      SELECT
        bi.id AS invoiceId,
        bi.invoice_no AS invoiceNo,
        bi.subscription_id AS subscriptionId,
        ${hasSubscriptionOrderId ? 'ss.order_id' : 'NULL'} AS orderId,
        ${hasSubscriptionServiceNo ? 'ss.service_no' : 'NULL'} AS serviceNo,
        ${hasCustomerCode ? 'c.customer_code' : 'NULL'} AS customerCode,
        ${hasCustomerFullName ? 'c.full_name' : 'NULL'} AS customerName,
        ${hasCustomerPhone ? 'c.phone' : 'NULL'} AS customerPhone,
        a.address AS customerAddress
      FROM billing_invoices bi
      LEFT JOIN service_subscriptions ss
        ON ss.id = bi.subscription_id
      ${customerJoinClause}
      ${addressJoinClause}
      WHERE ${getNormalizedInvoiceNoSqlExpression('bi.invoice_no')} = ${getNormalizedInvoiceNoSqlExpression('?')}
      LIMIT 1
    `,
    [invoiceNo],
  )

  return row ?? null
}

async function resolveMarketingNameFromSalesContext(orderId: number | null) {
  if (!orderId) {
    return null
  }

  try {
    const [
      hasSalesOrderId,
      hasSalesOrderMarketingName,
      hasSalesOrderLeadId,
      hasSalesLeadId,
      hasSalesLeadMarketingName,
    ] = await Promise.all([
      hasReviewDbColumn('sales_orders', 'id'),
      hasReviewDbColumn('sales_orders', 'marketing_name'),
      hasReviewDbColumn('sales_orders', 'lead_id'),
      hasReviewDbColumn('sales_leads', 'id'),
      hasReviewDbColumn('sales_leads', 'marketing_name'),
    ])

    if (
      !hasSalesOrderId ||
      (!hasSalesOrderMarketingName && !(hasSalesOrderLeadId && hasSalesLeadId && hasSalesLeadMarketingName))
    ) {
      return null
    }

    const marketingExpression =
      hasSalesOrderMarketingName && hasSalesOrderLeadId && hasSalesLeadId && hasSalesLeadMarketingName
        ? 'COALESCE(so.marketing_name, sl.marketing_name)'
        : hasSalesOrderMarketingName
          ? 'so.marketing_name'
          : 'sl.marketing_name'

    const leadJoinClause =
      hasSalesOrderLeadId && hasSalesLeadId && hasSalesLeadMarketingName
        ? `LEFT JOIN sales_leads sl
          ON sl.id = so.lead_id`
        : `LEFT JOIN (
          SELECT
            NULL AS id,
            NULL AS marketing_name
        ) sl
          ON 1 = 0`

    const [row] = await runReviewDbQuery<{ marketingName: string | null }>(
      `
        SELECT ${marketingExpression} AS marketingName
        FROM sales_orders so
        ${leadJoinClause}
        WHERE so.id = ?
        LIMIT 1
      `,
      [orderId],
    )

    return normalizeOptionalText(row?.marketingName)
  } catch {
    return null
  }
}

async function findOpenIsolationIds(subscriptionId: number) {
  const [hasSubscriptionId, hasStatus, hasRestorationDate] = await Promise.all([
    hasReviewDbColumn('support_isolations', 'subscription_id'),
    hasReviewDbColumn('support_isolations', 'status'),
    hasReviewDbColumn('support_isolations', 'restoration_date'),
  ])

  if (!hasSubscriptionId || !hasStatus) {
    return []
  }

  return runReviewDbQuery<OpenIsolationRow>(
    `
      SELECT id
      FROM support_isolations
      WHERE subscription_id = ?
        AND COALESCE(UPPER(TRIM(status)), 'OPEN') <> 'CLOSED'
        ${hasRestorationDate ? 'AND restoration_date IS NULL' : ''}
      ORDER BY id DESC
    `,
    [subscriptionId],
  )
}

async function syncIsolationForInvoiceStatus(params: {
  invoiceNo: string
  nextStatus: string
  actorLabel: string
  notes: string
}) {
  const context = await loadBillingIsolationContext(params.invoiceNo)
  if (!context?.subscriptionId) {
    return
  }

  const openIsolationIds = await findOpenIsolationIds(Number(context.subscriptionId))

  if (params.nextStatus === 'SUSPENDED') {
    if (openIsolationIds.length > 0) {
      return
    }

    const [
      hasSubscriptionId,
      hasCustomerName,
      hasCustomerAddress,
      hasCustomerPhone,
      hasMarketingName,
      hasRadboxName,
      hasPackagePrice,
      hasIsolationDate,
      hasReason,
      hasStatus,
      hasIsArchived,
    ] = await Promise.all([
      hasReviewDbColumn('support_isolations', 'subscription_id'),
      hasReviewDbColumn('support_isolations', 'customer_name'),
      hasReviewDbColumn('support_isolations', 'customer_address'),
      hasReviewDbColumn('support_isolations', 'customer_phone'),
      hasReviewDbColumn('support_isolations', 'marketing_name'),
      hasReviewDbColumn('support_isolations', 'radbox_name'),
      hasReviewDbColumn('support_isolations', 'package_price'),
      hasReviewDbColumn('support_isolations', 'isolation_date'),
      hasReviewDbColumn('support_isolations', 'reason'),
      hasReviewDbColumn('support_isolations', 'status'),
      hasReviewDbColumn('support_isolations', 'is_archived'),
    ])

    if (!hasSubscriptionId || !hasReason || !hasStatus) {
      return
    }

    const columns = ['subscription_id']
    const values: unknown[] = [context.subscriptionId]
    const placeholders = ['?']

    if (hasCustomerName) {
      columns.push('customer_name')
      values.push(context.customerName || 'Customer belum terpetakan')
      placeholders.push('?')
    }
    if (hasCustomerAddress) {
      columns.push('customer_address')
      values.push(context.customerAddress)
      placeholders.push('?')
    }
    if (hasCustomerPhone) {
      columns.push('customer_phone')
      values.push(context.customerPhone)
      placeholders.push('?')
    }
    if (hasMarketingName) {
      columns.push('marketing_name')
      values.push(await resolveMarketingNameFromSalesContext(context.orderId))
      placeholders.push('?')
    }
    if (hasRadboxName) {
      columns.push('radbox_name')
      values.push(`AUTO-SUSPEND ${context.serviceNo || context.customerCode || params.invoiceNo}`)
      placeholders.push('?')
    }
    if (hasPackagePrice) {
      columns.push('package_price')
      values.push(null)
      placeholders.push('?')
    }
    if (hasIsolationDate) {
      columns.push('isolation_date')
      placeholders.push('CURRENT_TIMESTAMP')
    }

    columns.push('reason')
    values.push(`[Sync Billing Suspend] ${params.actorLabel} - ${params.notes}`)
    placeholders.push('?')

    columns.push('status')
    values.push('OPEN')
    placeholders.push('?')

    if (hasIsArchived) {
      columns.push('is_archived')
      values.push(0)
      placeholders.push('?')
    }

    await runReviewDbExecute(
      `
        INSERT INTO support_isolations (
          ${columns.join(', ')}
        )
        VALUES (${placeholders.join(', ')})
      `,
      values,
    )
    return
  }

  if (params.nextStatus === 'OVERDUE' && openIsolationIds.length > 0) {
    const [hasRestorationDate, hasCloseNote, hasUpdatedAt] = await Promise.all([
      hasReviewDbColumn('support_isolations', 'restoration_date'),
      hasReviewDbColumn('support_isolations', 'close_note'),
      hasReviewDbColumn('support_isolations', 'updated_at'),
    ])

    const assignments = [`status = 'CLOSED'`]
    const values: unknown[] = []

    if (hasRestorationDate) {
      assignments.push('restoration_date = CURRENT_TIMESTAMP')
    }
    if (hasCloseNote) {
      assignments.push('close_note = ?')
      values.push(`[Auto Restored via Billing] ${params.actorLabel} - ${params.notes}`)
    }
    if (hasUpdatedAt) {
      assignments.push('updated_at = CURRENT_TIMESTAMP')
    }

    values.push(context.subscriptionId)

    await runReviewDbExecute(
      `
        UPDATE support_isolations
        SET
          ${assignments.join(',\n          ')}
        WHERE subscription_id = ?
          AND COALESCE(UPPER(TRIM(status)), 'OPEN') <> 'CLOSED'
          ${hasRestorationDate ? 'AND restoration_date IS NULL' : ''}
      `,
      values,
    )
  }
}

async function updateInvoiceStatus(params: {
  invoiceNo: string
  nextStatus: string
  notes: string
  actorLabel: string
}) {
  const invoiceQueryParts = await getBillingInvoiceStatusQueryParts()
  const [invoice] = await runReviewDbQuery<BillingInvoiceRow>(
    `
      SELECT
        bi.id,
        bi.invoice_no AS invoiceNo,
        ${invoiceQueryParts.customerNameExpression} AS customerName,
        bi.invoice_status AS invoiceStatus,
        bi.paid_amount AS paidAmount,
        bi.total_amount AS totalAmount,
        ${invoiceQueryParts.notesExpression} AS notes
      FROM billing_invoices bi
      ${invoiceQueryParts.customerJoin}
      WHERE ${getNormalizedInvoiceNoSqlExpression('bi.invoice_no')} = ${getNormalizedInvoiceNoSqlExpression('?')}
      LIMIT 1
    `,
    [params.invoiceNo],
  )

  if (!invoice) {
    throw new Error(`Invoice ${params.invoiceNo} tidak ditemukan di review DB.`)
  }

  const currentStatus = String(invoice.invoiceStatus).trim().toUpperCase()

  if (currentStatus === 'CANCELLED') {
    throw new Error(`Invoice ${invoice.invoiceNo} sudah berstatus CANCELLED.`)
  }
  if (params.nextStatus === 'CANCELLED' && Number(invoice.paidAmount) > 0) {
    throw new Error(
      `Invoice ${invoice.invoiceNo} sudah memiliki pembayaran ${Number(invoice.paidAmount)} sehingga tidak boleh dibatalkan.`,
    )
  }
  if (params.nextStatus === 'SUSPENDED') {
    if (currentStatus === 'SUSPENDED') {
      throw new Error(`Invoice ${invoice.invoiceNo} sudah berstatus SUSPENDED.`)
    }
    if (currentStatus === 'PAID') {
      throw new Error(`Invoice ${invoice.invoiceNo} yang sudah PAID tidak boleh disuspend.`)
    }
    if (Number(invoice.paidAmount) >= Number(invoice.totalAmount)) {
      throw new Error(`Invoice ${invoice.invoiceNo} sudah lunas sehingga tidak perlu disuspend.`)
    }
  }
  if (params.nextStatus === 'OVERDUE') {
    if (currentStatus === 'PAID') {
      throw new Error(`Invoice ${invoice.invoiceNo} yang sudah PAID tidak perlu diaktifkan lagi.`)
    }
    if (currentStatus !== 'SUSPENDED') {
      throw new Error(`Invoice ${invoice.invoiceNo} hanya bisa diaktifkan lagi bila saat ini berstatus SUSPENDED.`)
    }
  }

  const mergedNotes = [
    invoice.notes?.trim(),
    `[Status Update] ${params.actorLabel} -> ${params.nextStatus} - ${params.notes}`,
  ]
    .filter(Boolean)
    .join('\n')

  const invoiceUpdatePayload = await buildBillingInvoiceStatusUpdatePayload({
    nextStatus: params.nextStatus,
    mergedNotes,
  })
  await runReviewDbExecute(
    `
      UPDATE billing_invoices
      SET
        ${invoiceUpdatePayload.assignments.join(',\n        ')}
      WHERE id = ?
    `,
    [...invoiceUpdatePayload.values, invoice.id],
  )

  if (params.nextStatus === 'OVERDUE') {
    const resolutionNote = `[Auto Resolved via Status Update] ${params.actorLabel} mengaktifkan kembali invoice ke OVERDUE.`
    const reconnectResolutionPayload = await buildReconnectResolutionPayload(invoice.id, resolutionNote)

    if (reconnectResolutionPayload) {
      await runReviewDbExecute(
        `
          UPDATE billing_collection_actions
          SET
            ${reconnectResolutionPayload.assignments.join(',\n            ')}
          WHERE ${reconnectResolutionPayload.whereClauses.join('\n          AND ')}
        `,
        reconnectResolutionPayload.values,
      )
    }
  }

  return invoice
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'billing', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Update status invoice hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      invoiceNo?: unknown
      invoiceNos?: unknown
      nextStatus?: unknown
      notes?: unknown
    }

    const invoiceNo = normalizeText(payload.invoiceNo).toUpperCase()
    const invoiceNos = Array.isArray(payload.invoiceNos)
      ? payload.invoiceNos.map((item) => normalizeText(item).toUpperCase()).filter(Boolean)
      : []
    const nextStatus = normalizeText(payload.nextStatus).toUpperCase()
    const notes = normalizeText(payload.notes)
    const isBatchMode = invoiceNos.length > 0

    if (!invoiceNo && !isBatchMode) {
      return Response.json({ message: 'Nomor invoice wajib diisi.' }, { status: 400 })
    }
    if (!allowedStatuses.has(nextStatus)) {
      return Response.json({ message: 'Status invoice yang diminta tidak valid.' }, { status: 400 })
    }
    if (!notes) {
      return Response.json({ message: 'Catatan perubahan status wajib diisi.' }, { status: 400 })
    }

    const actorLabel = `${session.displayName} (${session.username})`

    if (isBatchMode) {
      if (nextStatus === 'CANCELLED') {
        return Response.json({ message: 'Batch status invoice saat ini hanya mendukung SUSPENDED atau OVERDUE.' }, { status: 400 })
      }

      const uniqueInvoiceNos = Array.from(new Set(invoiceNos))
      const successes: string[] = []
      const failures: Array<{ invoiceNo: string; message: string }> = []

      for (const currentInvoiceNo of uniqueInvoiceNos) {
        try {
          const invoice = await updateInvoiceStatus({
            invoiceNo: currentInvoiceNo,
            nextStatus,
            notes,
            actorLabel,
          })
          await syncIsolationForInvoiceStatus({
            invoiceNo: invoice.invoiceNo,
            nextStatus,
            notes,
            actorLabel,
          })
          successes.push(invoice.invoiceNo)
        } catch (error) {
          failures.push({
            invoiceNo: currentInvoiceNo,
            message: error instanceof Error && error.message.trim() ? error.message.trim() : 'Batch status invoice gagal.',
          })
        }
      }

      return Response.json({
        message: `Batch status invoice berhasil memproses ${successes.length} invoice ke ${nextStatus}.${failures.length ? ` ${failures.length} invoice dilewati.` : ''}`,
        updatedCount: successes.length,
        failedCount: failures.length,
        successes,
        failures,
      })
    }

    const invoice = await updateInvoiceStatus({
      invoiceNo,
      nextStatus,
      notes,
      actorLabel,
    })
    await syncIsolationForInvoiceStatus({
      invoiceNo: invoice.invoiceNo,
      nextStatus,
      notes,
      actorLabel,
    })

    return Response.json({
      message: `Invoice ${invoice.invoiceNo} untuk ${invoice.customerName} berhasil diubah ke ${nextStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
