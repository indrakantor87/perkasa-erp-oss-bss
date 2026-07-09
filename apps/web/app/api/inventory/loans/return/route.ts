import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'
import { ensureInventoryLoanTable } from '@/lib/services/inventory-loan-service'

type LoanRow = {
  id: number
  loanCode: string
  loanQty: number
  returnedQty: number
  loanStatus: string
  inventoryItemId: number
  itemCode: string
  itemName: string
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function extractLoanId(value: string) {
  return Number.parseInt(value.split('|')[0]?.trim() ?? '', 10)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'update')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Pengembalian pinjaman inventory hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      loanId?: unknown
      returnQty?: unknown
      returnNotes?: unknown
    }

    const loanId = extractLoanId(String(payload.loanId ?? '').trim())
    const returnQty = Number.parseInt(String(payload.returnQty ?? '1').trim() || '1', 10)
    const returnNotes = String(payload.returnNotes ?? '').trim()

    if (!Number.isInteger(loanId) || loanId <= 0) {
      return Response.json({ message: 'Pinjaman inventory tidak valid.' }, { status: 400 })
    }
    if (!Number.isInteger(returnQty) || returnQty <= 0) {
      return Response.json({ message: 'Qty pengembalian harus lebih dari 0.' }, { status: 400 })
    }

    await ensureInventoryLoanTable()

    const [loan] = await runReviewDbQuery<LoanRow>(
      `
        SELECT
          iil.id,
          iil.loan_code AS loanCode,
          iil.loan_qty AS loanQty,
          iil.returned_qty AS returnedQty,
          iil.loan_status AS loanStatus,
          iil.inventory_item_id AS inventoryItemId,
          ii.item_code AS itemCode,
          ii.item_name AS itemName
        FROM inventory_item_loans iil
        JOIN inventory_items ii
          ON ii.id = iil.inventory_item_id
        WHERE iil.id = ?
        LIMIT 1
      `,
      [loanId],
    )

    if (!loan) {
      return Response.json({ message: 'Data pinjaman inventory tidak ditemukan.' }, { status: 404 })
    }

    const remainingQty = loan.loanQty - loan.returnedQty
    if (remainingQty <= 0 || String(loan.loanStatus).trim().toUpperCase() === 'RETURNED') {
      return Response.json({ message: 'Pinjaman inventory ini sudah selesai dikembalikan.' }, { status: 409 })
    }
    if (returnQty > remainingQty) {
      return Response.json({ message: 'Qty pengembalian melebihi sisa barang yang dipinjam.' }, { status: 409 })
    }

    const nextReturnedQty = loan.returnedQty + returnQty
    const nextStatus = nextReturnedQty >= loan.loanQty ? 'RETURNED' : 'PARTIAL_RETURN'
    const actor = `${session.displayName} (${session.username})`
    const noteText = returnNotes
      ? `[KEMBALI] ${actor} - ${returnNotes}`
      : `[KEMBALI] ${actor} - Pengembalian ${returnQty} item`

    await runReviewDbTransaction(async (connection) => {
      await connection.query(
        `
          INSERT INTO inventory_stock_movements (
            item_id,
            work_order_id,
            movement_type,
            reference_no,
            qty,
            unit_price,
            notes,
            movement_at
          )
          VALUES (?, NULL, 'IN', ?, ?, 0, ?, CURRENT_TIMESTAMP)
        `,
        [loan.inventoryItemId, loan.loanCode, returnQty, noteText],
      )

      await connection.query(
        `
          UPDATE inventory_items
          SET
            current_stock = current_stock + ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [returnQty, loan.inventoryItemId],
      )

      await connection.query(
        `
          UPDATE inventory_item_loans
          SET
            returned_qty = ?,
            loan_status = ?,
            returned_at = CASE WHEN ? = 'RETURNED' THEN CURRENT_TIMESTAMP ELSE returned_at END,
            return_notes = CASE
              WHEN return_notes IS NULL OR TRIM(return_notes) = '' THEN ?
              ELSE CONCAT(return_notes, '\n', ?)
            END,
            processed_by = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [nextReturnedQty, nextStatus, nextStatus, noteText, noteText, actor, loan.id],
      )
    })

    return Response.json({
      message: `Pengembalian ${loan.loanCode} untuk ${loan.itemCode} (${loan.itemName}) berhasil diproses.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
