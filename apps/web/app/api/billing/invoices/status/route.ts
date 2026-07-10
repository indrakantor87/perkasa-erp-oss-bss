import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

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

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

async function updateInvoiceStatus(params: {
  invoiceNo: string
  nextStatus: string
  notes: string
  actorLabel: string
}) {
  const [invoice] = await runReviewDbQuery<BillingInvoiceRow>(
    `
      SELECT
        bi.id,
        bi.invoice_no AS invoiceNo,
        c.full_name AS customerName,
        bi.invoice_status AS invoiceStatus,
        bi.paid_amount AS paidAmount,
        bi.total_amount AS totalAmount,
        bi.notes
      FROM billing_invoices bi
      JOIN service_subscriptions ss
        ON ss.id = bi.subscription_id
      JOIN crm_customers c
        ON c.id = ss.customer_id
      WHERE bi.invoice_no = ?
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

  await runReviewDbExecute(
    `
      UPDATE billing_invoices
      SET
        invoice_status = ?,
        collection_status = CASE
          WHEN ? = 'SUSPENDED' THEN 'SUSPEND'
          WHEN ? = 'OVERDUE' THEN 'REMINDER'
          ELSE 'CLOSED'
        END,
        suspend_candidate = CASE
          WHEN ? = 'SUSPENDED' THEN 1
          ELSE 0
        END,
        notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [params.nextStatus, params.nextStatus, params.nextStatus, params.nextStatus, mergedNotes, invoice.id],
  )

  if (params.nextStatus === 'OVERDUE') {
    const resolutionNote = `[Auto Resolved via Status Update] ${params.actorLabel} mengaktifkan kembali invoice ke OVERDUE.`

    await runReviewDbExecute(
      `
        UPDATE billing_collection_actions
        SET
          action_status = 'DONE',
          due_follow_up_at = NULL,
          notes = CASE
            WHEN notes IS NULL OR notes = '' THEN ?
            ELSE CONCAT(notes, '\n', ?)
          END
        WHERE invoice_id = ?
          AND COALESCE(UPPER(TRIM(action_status)), 'OPEN') = 'OPEN'
          AND COALESCE(UPPER(TRIM(action_type)), '') = 'RECONNECT'
      `,
      [resolutionNote, resolutionNote, invoice.id],
    )
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

    return Response.json({
      message: `Invoice ${invoice.invoiceNo} untuk ${invoice.customerName} berhasil diubah ke ${nextStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
