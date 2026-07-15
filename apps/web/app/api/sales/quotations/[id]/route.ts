import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type QuotationRow = {
  id: number
  quotationNo: string
  leadId: number
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

const allowedDecisions = new Set(['APPROVED', 'REJECTED'])

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'sales', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Approval quotation hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const schemaReady = await Promise.all([
      hasReviewDbColumn('sales_quotations', 'id'),
      hasReviewDbColumn('sales_quotations', 'quotation_no'),
      hasReviewDbColumn('sales_quotations', 'lead_id'),
      hasReviewDbColumn('sales_quotations', 'status'),
    ]).then((items) => items.every(Boolean))

    if (!schemaReady) {
      return Response.json(
        { message: 'Schema sales_quotations belum siap. Jalankan schema SQL terbaru terlebih dulu.' },
        { status: 503 },
      )
    }

    const params = await context.params
    const quotationId = Number(params.id)
    if (!Number.isInteger(quotationId) || quotationId <= 0) {
      return Response.json({ message: 'ID quotation tidak valid.' }, { status: 400 })
    }

    const payload = (await request.json()) as {
      decision?: unknown
      approvalNotes?: unknown
    }

    const decision = String(payload.decision ?? '').trim().toUpperCase()
    const approvalNotesRaw = String(payload.approvalNotes ?? '').trim()

    if (!allowedDecisions.has(decision)) {
      return Response.json({ message: 'Keputusan approval tidak valid.' }, { status: 400 })
    }
    if (decision === 'REJECTED' && !approvalNotesRaw) {
      return Response.json({ message: 'Catatan reject wajib diisi.' }, { status: 400 })
    }

    const [quotation] = await runReviewDbQuery<QuotationRow>(
      `
        SELECT
          id,
          quotation_no AS quotationNo,
          lead_id AS leadId
        FROM sales_quotations
        WHERE id = ?
        LIMIT 1
      `,
      [quotationId],
    )
    if (!quotation) {
      return Response.json({ message: 'Quotation tidak ditemukan.' }, { status: 404 })
    }

    const nextQuotationStatus = decision === 'APPROVED' ? 'QUOTED' : 'REJECTED'
    const nextLeadStatus = decision === 'APPROVED' ? 'QUOTED' : 'QUOTATION_PREPARED'
    const approvalNotes = `[Review Quotation ${decision}] ${session.displayName} (${session.username})${
      approvalNotesRaw ? ` - ${approvalNotesRaw}` : ''
    }`

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE sales_quotations
        SET
          status = ?,
          approved_by = ?,
          approved_at = CURRENT_TIMESTAMP,
          approval_notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nextQuotationStatus, session.displayName, approvalNotes, quotation.id],
    )

    await runReviewDbExecute<ExecuteResult>(
      `
        UPDATE sales_leads
        SET
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nextLeadStatus, quotation.leadId],
    )

    return Response.json({
      message:
        decision === 'APPROVED'
          ? `Quotation ${quotation.quotationNo} berhasil di-approve dan siap dikirim sebagai penawaran.`
          : `Quotation ${quotation.quotationNo} di-reject. Catatan revisi sudah disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

