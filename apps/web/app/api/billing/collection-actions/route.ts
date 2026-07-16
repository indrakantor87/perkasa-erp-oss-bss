import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { readFileSync } from 'node:fs'

const allowedActionTypes = new Set([
  'REMINDER',
  'CALL',
  'VISIT',
  'PROMISE_TO_PAY',
  'SUSPEND',
  'RECONNECT',
  'WRITE_OFF',
])

const allowedActionStatuses = new Set(['OPEN', 'DONE', 'CANCELLED'])

type BillingInvoiceRow = {
  id: number
  invoiceNo: string
  invoiceStatus: string
  collectionStatus: string | null
  suspendCandidate: number | null
}

type AuthUserRow = {
  id: number
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function reportDebugEvent(event: Record<string, unknown>) {
  // #region debug-point C:billing-collection-action
  try {
    const env = readFileSync('.dbg/billing-suspend-gap.env', 'utf8')
    const debugUrl =
      env.match(/^DEBUG_SERVER_URL=(.+)$/m)?.[1]?.trim() || 'http://127.0.0.1:7777/event'
    const sessionId = env.match(/^DEBUG_SESSION_ID=(.+)$/m)?.[1]?.trim() || 'billing-suspend-gap'
    fetch(debugUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        runId: 'pre-fix',
        hypothesisId: 'C',
        location: 'api/billing/collection-actions',
        msg: '[DEBUG] billing collection action route',
        data: event,
        ts: Date.now(),
      }),
    }).catch(() => {})
  } catch {}
  // #endregion
}

type CreateCollectionActionParams = {
  invoiceNo: string
  actionType: string
  actionStatus: string
  dueFollowUpAt: Date | null
  notesRaw: string
  sessionUsername: string
  sessionDisplayName: string
}

const openOnlyActionTypes = new Set(['PROMISE_TO_PAY', 'SUSPEND', 'RECONNECT', 'WRITE_OFF'])

function mapCollectionStatus(actionType: string) {
  switch (actionType) {
    case 'PROMISE_TO_PAY':
      return 'PROMISE_TO_PAY'
    case 'SUSPEND':
      return 'SUSPEND'
    case 'RECONNECT':
      return 'RECONNECT'
    case 'VISIT':
      return 'FIELD_VISIT'
    case 'WRITE_OFF':
      return 'CLOSED'
    case 'REMINDER':
    case 'CALL':
    default:
      return 'REMINDER'
  }
}

async function getBillingInvoiceQueryParts() {
  const [hasCollectionStatus, hasSuspendCandidate] = await Promise.all([
    hasReviewDbColumn('billing_invoices', 'collection_status'),
    hasReviewDbColumn('billing_invoices', 'suspend_candidate'),
  ])

  return {
    collectionStatusExpression: hasCollectionStatus ? 'collection_status' : 'NULL',
    suspendCandidateExpression: hasSuspendCandidate ? 'suspend_candidate' : 'NULL',
  }
}

async function buildCollectionActionInsertPayload(params: {
  invoiceId: number
  actionType: string
  actionStatus: string
  dueFollowUpAt: Date | null
  handledByUserId: number | null
  notes: string
}) {
  const [hasInvoiceId, hasActionType, hasActionStatus, hasActionAt, hasDueFollowUpAt, hasHandledByUserId, hasNotes] =
    await Promise.all([
      hasReviewDbColumn('billing_collection_actions', 'invoice_id'),
      hasReviewDbColumn('billing_collection_actions', 'action_type'),
      hasReviewDbColumn('billing_collection_actions', 'action_status'),
      hasReviewDbColumn('billing_collection_actions', 'action_at'),
      hasReviewDbColumn('billing_collection_actions', 'due_follow_up_at'),
      hasReviewDbColumn('billing_collection_actions', 'handled_by_user_id'),
      hasReviewDbColumn('billing_collection_actions', 'notes'),
    ])

  if (!hasInvoiceId || !hasActionType || !hasActionStatus) {
    throw new Error(
      'Schema inti billing_collection_actions belum siap. Kolom invoice_id, action_type, dan action_status wajib tersedia.',
    )
  }

  const columns = ['invoice_id', 'action_type', 'action_status']
  const values: unknown[] = [params.invoiceId, params.actionType, params.actionStatus]

  if (hasActionAt) {
    columns.push('action_at')
    values.push(new Date())
  }
  if (hasDueFollowUpAt) {
    columns.push('due_follow_up_at')
    values.push(params.dueFollowUpAt)
  }
  if (hasHandledByUserId) {
    columns.push('handled_by_user_id')
    values.push(params.handledByUserId)
  }
  if (hasNotes) {
    columns.push('notes')
    values.push(params.notes)
  }

  return {
    columns,
    placeholders: columns.map(() => '?'),
    values,
  }
}

async function buildBillingInvoiceCollectionUpdatePayload(params: {
  actionType: string
  actionStatus: string
  currentCollectionStatus: string
}) {
  const [hasCollectionStatus, hasSuspendCandidate, hasUpdatedAt] = await Promise.all([
    hasReviewDbColumn('billing_invoices', 'collection_status'),
    hasReviewDbColumn('billing_invoices', 'suspend_candidate'),
    hasReviewDbColumn('billing_invoices', 'updated_at'),
  ])

  const assignments: string[] = []
  const values: unknown[] = []

  if (hasCollectionStatus) {
    assignments.push('collection_status = ?')
    values.push(
      params.actionStatus === 'OPEN' ? mapCollectionStatus(params.actionType) : params.currentCollectionStatus || 'REMINDER',
    )
  }
  if (hasSuspendCandidate) {
    assignments.push(`suspend_candidate = CASE
            WHEN ? = 'SUSPEND' THEN 1
            WHEN ? = 'RECONNECT' THEN 0
            ELSE suspend_candidate
          END`)
    values.push(params.actionStatus === 'OPEN' ? params.actionType : '', params.actionStatus === 'OPEN' ? params.actionType : '')
  }
  if (hasUpdatedAt) {
    assignments.push('updated_at = CURRENT_TIMESTAMP')
  }

  return assignments.length
    ? {
        assignments,
        values,
      }
    : null
}

async function createCollectionAction(params: CreateCollectionActionParams) {
  const billingInvoiceQueryParts = await getBillingInvoiceQueryParts()
  const [invoice] = await runReviewDbQuery<BillingInvoiceRow>(
    `
      SELECT
        id,
        invoice_no AS invoiceNo,
        invoice_status AS invoiceStatus,
        ${billingInvoiceQueryParts.collectionStatusExpression} AS collectionStatus,
        ${billingInvoiceQueryParts.suspendCandidateExpression} AS suspendCandidate
      FROM billing_invoices
      WHERE invoice_no = ?
      LIMIT 1
    `,
    [params.invoiceNo],
  )
  if (!invoice) {
    throw new Error(`Invoice ${params.invoiceNo} tidak ditemukan di review DB.`)
  }

  const invoiceStatus = String(invoice.invoiceStatus ?? '').trim().toUpperCase()
  const currentCollectionStatus = String(invoice.collectionStatus ?? '').trim().toUpperCase()
  if (invoiceStatus === 'PAID' || invoiceStatus === 'CANCELLED') {
    throw new Error(`Invoice ${invoice.invoiceNo} sudah berstatus ${invoiceStatus}, jadi tidak layak menerima collection action baru.`)
  }
  if (openOnlyActionTypes.has(params.actionType) && params.actionStatus !== 'OPEN') {
    throw new Error(
      `Action ${params.actionType} hanya boleh dibuat sebagai OPEN. Gunakan route resolve/status invoice untuk menutup atau membatalkan jalur ini secara formal.`,
    )
  }
  if (
    params.actionType === 'RECONNECT' &&
    invoiceStatus !== 'SUSPENDED' &&
    currentCollectionStatus !== 'RECONNECT' &&
    currentCollectionStatus !== 'SUSPEND' &&
    Number(invoice.suspendCandidate ?? 0) <= 0
  ) {
    throw new Error(`Invoice ${invoice.invoiceNo} belum berada pada jalur suspend/reconnect, jadi action RECONNECT belum valid.`)
  }

  const [handledBy] = await runReviewDbQuery<AuthUserRow>(
    `
      SELECT id
      FROM auth_users
      WHERE username = ?
      LIMIT 1
    `,
    [params.sessionUsername],
  )

  const userNote = `[Review Action] ${params.sessionDisplayName} (${params.sessionUsername})${
    params.notesRaw ? ` - ${params.notesRaw}` : ''
  }`
  const collectionActionInsertPayload = await buildCollectionActionInsertPayload({
    invoiceId: invoice.id,
    actionType: params.actionType,
    actionStatus: params.actionStatus,
    dueFollowUpAt: params.dueFollowUpAt,
    handledByUserId: handledBy?.id ?? null,
    notes: userNote,
  })

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO billing_collection_actions (
        ${collectionActionInsertPayload.columns.join(',\n        ')}
      )
      VALUES (${collectionActionInsertPayload.placeholders.join(', ')})
    `,
    collectionActionInsertPayload.values,
  )

  const billingInvoiceUpdatePayload = await buildBillingInvoiceCollectionUpdatePayload({
    actionType: params.actionType,
    actionStatus: params.actionStatus,
    currentCollectionStatus,
  })

  if (billingInvoiceUpdatePayload) {
    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE billing_invoices
        SET ${billingInvoiceUpdatePayload.assignments.join(',\n          ')}
        WHERE id = ?
      `,
      [...billingInvoiceUpdatePayload.values, invoice.id],
    )
  }
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'billing', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action billing hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      invoiceNo?: unknown
      invoiceNos?: unknown
      actionType?: unknown
      actionStatus?: unknown
      dueFollowUpAt?: unknown
      notes?: unknown
    }

    const invoiceNo = String(payload.invoiceNo ?? '').trim()
    const invoiceNos = Array.isArray(payload.invoiceNos)
      ? payload.invoiceNos.map((item) => String(item ?? '').trim()).filter(Boolean)
      : []
    const actionType = String(payload.actionType ?? '').trim().toUpperCase()
    const actionStatus = String(payload.actionStatus ?? '').trim().toUpperCase()
    const dueFollowUpAtRaw = String(payload.dueFollowUpAt ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()
    const isBatchMode = invoiceNos.length > 0

    reportDebugEvent({
      stage: 'payload-received',
      invoiceNo,
      invoiceCount: invoiceNos.length,
      actionType,
      actionStatus,
      hasDueFollowUpAt: Boolean(dueFollowUpAtRaw),
      hasNotes: Boolean(notesRaw),
      username: session.username,
    })

    if (!invoiceNo && !isBatchMode) {
      return Response.json({ message: 'Nomor invoice wajib diisi.' }, { status: 400 })
    }
    if (!allowedActionTypes.has(actionType)) {
      return Response.json({ message: 'Action type tidak valid.' }, { status: 400 })
    }
    if (!allowedActionStatuses.has(actionStatus)) {
      return Response.json({ message: 'Action status tidak valid.' }, { status: 400 })
    }

    const dueFollowUpAt = dueFollowUpAtRaw ? new Date(dueFollowUpAtRaw) : null
    if (dueFollowUpAt && !Number.isFinite(dueFollowUpAt.getTime())) {
      return Response.json({ message: 'Format follow up tidak valid.' }, { status: 400 })
    }

    if (isBatchMode) {
      const uniqueInvoiceNos = Array.from(new Set(invoiceNos))
      const successes: string[] = []
      const failures: Array<{ invoiceNo: string; message: string }> = []

      for (const currentInvoiceNo of uniqueInvoiceNos) {
        try {
          await createCollectionAction({
            invoiceNo: currentInvoiceNo,
            actionType,
            actionStatus,
            dueFollowUpAt,
            notesRaw,
            sessionUsername: session.username,
            sessionDisplayName: session.displayName,
          })
          successes.push(currentInvoiceNo)
          reportDebugEvent({
            stage: 'batch-create-success',
            invoiceNo: currentInvoiceNo,
            actionType,
            actionStatus,
          })
        } catch (error) {
          reportDebugEvent({
            stage: 'batch-create-failure',
            invoiceNo: currentInvoiceNo,
            actionType,
            actionStatus,
            error: error instanceof Error ? error.message : String(error),
          })
          failures.push({
            invoiceNo: currentInvoiceNo,
            message: error instanceof Error && error.message.trim() ? error.message.trim() : 'Collection action batch gagal.',
          })
        }
      }

      return Response.json({
        message: `Batch collection berhasil memproses ${successes.length} invoice.${failures.length ? ` ${failures.length} invoice dilewati.` : ''}`,
        createdCount: successes.length,
        failedCount: failures.length,
        successes,
        failures,
      })
    }

    await createCollectionAction({
      invoiceNo,
      actionType,
      actionStatus,
      dueFollowUpAt,
      notesRaw,
      sessionUsername: session.username,
      sessionDisplayName: session.displayName,
    })

    reportDebugEvent({
      stage: 'single-create-success',
      invoiceNo,
      actionType,
      actionStatus,
    })

    return Response.json({
      message: `Collection action untuk invoice ${invoiceNo} berhasil disimpan.`,
    })
  } catch (error) {
    reportDebugEvent({
      stage: 'route-error',
      error: error instanceof Error ? error.message : String(error),
    })
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
