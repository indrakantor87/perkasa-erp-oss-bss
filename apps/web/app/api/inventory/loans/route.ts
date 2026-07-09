import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'
import { ensureInventoryLoanTable, generateInventoryLoanCode } from '@/lib/services/inventory-loan-service'

type ItemRow = {
  id: number
  itemCode: string
  itemName: string
  currentStock: number
  status: string
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function extractItemCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function parseDueAt(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return trimmed
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Pinjaman inventory hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      itemCode?: unknown
      qty?: unknown
      borrowerName?: unknown
      borrowerDivision?: unknown
      borrowerSubdivision?: unknown
      dueAt?: unknown
      loanNotes?: unknown
    }

    const itemCode = extractItemCode(String(payload.itemCode ?? '').trim())
    const qty = Number.parseInt(String(payload.qty ?? '1').trim() || '1', 10)
    const borrowerName = String(payload.borrowerName ?? '').trim()
    const borrowerDivision = String(payload.borrowerDivision ?? '').trim()
    const borrowerSubdivision = String(payload.borrowerSubdivision ?? '').trim()
    const dueAt = parseDueAt(String(payload.dueAt ?? ''))
    const loanNotes = String(payload.loanNotes ?? '').trim()

    if (!itemCode) {
      return Response.json({ message: 'Item inventory wajib dipilih.' }, { status: 400 })
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return Response.json({ message: 'Qty pinjaman harus lebih dari 0.' }, { status: 400 })
    }
    if (!borrowerName) {
      return Response.json({ message: 'Nama peminjam wajib diisi.' }, { status: 400 })
    }
    if (String(payload.dueAt ?? '').trim() && !dueAt) {
      return Response.json({ message: 'Tanggal jatuh tempo pengembalian tidak valid.' }, { status: 400 })
    }

    await ensureInventoryLoanTable()

    const [item] = await runReviewDbQuery<ItemRow>(
      `
        SELECT
          id,
          item_code AS itemCode,
          item_name AS itemName,
          current_stock AS currentStock,
          status
        FROM inventory_items
        WHERE UPPER(item_code) = UPPER(?)
        LIMIT 1
      `,
      [itemCode],
    )

    if (!item) {
      return Response.json({ message: 'Item inventory tidak ditemukan di review DB.' }, { status: 404 })
    }
    if (String(item.status).trim().toUpperCase() !== 'ACTIVE') {
      return Response.json({ message: 'Hanya item inventory aktif yang bisa dipinjamkan.' }, { status: 409 })
    }
    if (item.currentStock < qty) {
      return Response.json({ message: 'Stok item tidak cukup untuk dipinjamkan.' }, { status: 409 })
    }

    const loanCode = await generateInventoryLoanCode()
    const actor = `${session.displayName} (${session.username})`
    const noteText = loanNotes
      ? `[PINJAM] ${actor} - ${loanNotes}`
      : `[PINJAM] ${actor} - Barang dipinjamkan ke ${borrowerName}`

    await runReviewDbTransaction(async (connection) => {
      await connection.query(
        `
          INSERT INTO inventory_item_loans (
            loan_code,
            inventory_item_id,
            borrower_name,
            borrower_division,
            borrower_subdivision,
            loan_qty,
            returned_qty,
            loan_status,
            borrowed_at,
            due_at,
            returned_at,
            loan_notes,
            return_notes,
            created_by,
            processed_by
          )
          VALUES (?, ?, ?, ?, ?, ?, 0, 'BORROWED', CURRENT_TIMESTAMP, ?, NULL, ?, NULL, ?, ?)
        `,
        [
          loanCode,
          item.id,
          borrowerName,
          borrowerDivision || null,
          borrowerSubdivision || null,
          qty,
          dueAt,
          loanNotes || null,
          actor,
          actor,
        ],
      )

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
          VALUES (?, NULL, 'OUT', ?, ?, 0, ?, CURRENT_TIMESTAMP)
        `,
        [item.id, loanCode, qty, noteText],
      )

      await connection.query(
        `
          UPDATE inventory_items
          SET
            current_stock = current_stock - ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [qty, item.id],
      )
    })

    return Response.json({
      message: `Pinjaman ${loanCode} untuk ${item.itemCode} (${item.itemName}) berhasil dibuat.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
