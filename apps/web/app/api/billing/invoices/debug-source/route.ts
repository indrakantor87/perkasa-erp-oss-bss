import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbQuery } from '@/lib/review-db'

type InvoiceSourceRow = {
  invoiceNo: string
  invoiceStatus: string | null
  collectionStatus: string | null
  suspendCandidate: number | null
}

type QueueSourceRow = {
  invoiceNo: string
  actionType: string | null
  actionStatus: string | null
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function getNormalizedInvoiceNoSqlExpression(expression: string) {
  return `REPLACE(REPLACE(REPLACE(REPLACE(UPPER(TRIM(${expression})), CHAR(13), ''), CHAR(10), ''), CHAR(9), ''), ' ', '')`
}

export async function GET(request: Request) {
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
      { message: 'Debug lookup invoice hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const url = new URL(request.url)
    const invoiceNo = normalizeText(url.searchParams.get('invoiceNo')).toUpperCase()
    if (!invoiceNo) {
      return Response.json({ message: 'Parameter invoiceNo wajib diisi.' }, { status: 400 })
    }

    const [hasCollectionStatus, hasSuspendCandidate, hasActionInvoiceId, hasActionType, hasActionStatus] = await Promise.all([
      hasReviewDbColumn('billing_invoices', 'collection_status'),
      hasReviewDbColumn('billing_invoices', 'suspend_candidate'),
      hasReviewDbColumn('billing_collection_actions', 'invoice_id'),
      hasReviewDbColumn('billing_collection_actions', 'action_type'),
      hasReviewDbColumn('billing_collection_actions', 'action_status'),
    ])

    const invoiceMatches = await runReviewDbQuery<InvoiceSourceRow>(
      `
        SELECT
          bi.invoice_no AS invoiceNo,
          bi.invoice_status AS invoiceStatus,
          ${hasCollectionStatus ? 'bi.collection_status' : 'NULL'} AS collectionStatus,
          ${hasSuspendCandidate ? 'bi.suspend_candidate' : 'NULL'} AS suspendCandidate
        FROM billing_invoices bi
        WHERE ${getNormalizedInvoiceNoSqlExpression('bi.invoice_no')} = ${getNormalizedInvoiceNoSqlExpression('?')}
        ORDER BY bi.id DESC
        LIMIT 5
      `,
      [invoiceNo],
    )

    const similarInvoices = await runReviewDbQuery<InvoiceSourceRow>(
      `
        SELECT
          bi.invoice_no AS invoiceNo,
          bi.invoice_status AS invoiceStatus,
          ${hasCollectionStatus ? 'bi.collection_status' : 'NULL'} AS collectionStatus,
          ${hasSuspendCandidate ? 'bi.suspend_candidate' : 'NULL'} AS suspendCandidate
        FROM billing_invoices bi
        WHERE UPPER(bi.invoice_no) LIKE CONCAT('%', UPPER(?), '%')
           OR UPPER(?) LIKE CONCAT('%', UPPER(bi.invoice_no), '%')
        ORDER BY bi.id DESC
        LIMIT 10
      `,
      [invoiceNo, invoiceNo],
    )

    const queueMatches =
      hasActionInvoiceId && hasActionType && hasActionStatus
        ? await runReviewDbQuery<QueueSourceRow>(
            `
              SELECT
                bi.invoice_no AS invoiceNo,
                action_latest.action_type AS actionType,
                action_latest.action_status AS actionStatus
              FROM billing_collection_actions action_latest
              INNER JOIN (
                SELECT invoice_id, MAX(id) AS latestId
                FROM billing_collection_actions
                GROUP BY invoice_id
              ) latest_ids
                ON latest_ids.latestId = action_latest.id
              INNER JOIN billing_invoices bi
                ON bi.id = action_latest.invoice_id
              WHERE ${getNormalizedInvoiceNoSqlExpression('bi.invoice_no')} = ${getNormalizedInvoiceNoSqlExpression('?')}
              LIMIT 5
            `,
            [invoiceNo],
          )
        : []

    return Response.json({
      invoiceNo,
      source,
      invoiceMatches,
      similarInvoices,
      queueMatches,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
