import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery, runReviewDbTransaction } from '@/lib/review-db'

type ItemRow = {
  id: number
  itemCode: string
  itemName: string
  currentStock: number
}

type ReceiptMovementRow = {
  id: number
  transactionId: string | null
  movementDate: string | null
  itemId: number
  itemCode: string
  itemName: string
  unitCode: string | null
  qty: number
  notes: string | null
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function extractItemCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function extractItemCodeFromSelection(value: string) {
  const raw = String(value ?? '').trim()
  if (!raw) return ''
  const dashIndex = raw.indexOf('-')
  if (dashIndex > 0) {
    const prefix = raw.slice(0, dashIndex).trim()
    if (prefix) return prefix
  }
  return extractItemCode(raw)
}

function normalizePrice(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return 0

  const normalized = raw.replace(/rp/gi, '').replace(/\s+/g, '').replace(/\./g, '').replace(/,/g, '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeDateToSql(value: unknown) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) return ''
  const date = new Date(trimmed)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function padSequence(value: number) {
  return String(value).padStart(3, '0')
}

async function generateReceiptCode(receiptDate: string) {
  const normalizedDate = normalizeDateToSql(receiptDate)
  if (!normalizedDate) {
    return ''
  }
  const compactDate = normalizedDate.replace(/-/g, '')
  const likePrefix = `BRG-MSK-${compactDate}-%`
  const rows = await runReviewDbQuery<{ transactionId: string | null }>(
    `
      SELECT reference_no AS transactionId
      FROM inventory_stock_movements
      WHERE movement_type = 'IN'
        AND reference_no LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )

  const currentCode = String(rows[0]?.transactionId ?? '')
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  const nextSequence = Number.isFinite(lastSequence) ? lastSequence + 1 : 1
  return `BRG-MSK-${compactDate}-${padSequence(nextSequence)}`
}

function parseReceiptNotes(value: string | null) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return { storeName: '', description: '' }
  }

  const parts = raw
    .split(' - ')
    .map((item) => item.trim())
    .filter(Boolean)

  const filtered: string[] = []
  let storeName = ''

  for (const part of parts) {
    if (part.startsWith('[BARANG MASUK]')) {
      continue
    }
    if (part.startsWith('Supplier/Sumber:')) {
      storeName = part.replace('Supplier/Sumber:', '').trim()
      continue
    }
    if (filtered.length === 0 && part.includes('(') && part.includes(')')) {
      continue
    }
    filtered.push(part)
  }

  return { storeName, description: filtered.join(' - ') }
}

function buildReceiptNote(params: {
  actor: string
  storeName?: string
  description?: string
}) {
  const storeName = String(params.storeName ?? '').trim()
  const description = String(params.description ?? '').trim()
  const noteSegments = ['[BARANG MASUK]', params.actor]
  if (storeName) {
    noteSegments.push(`Supplier/Sumber: ${storeName}`)
  }
  if (description) {
    noteSegments.push(description)
  }
  return noteSegments.join(' - ')
}

function resolveOptionalPositiveInt(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'inventory', 'view')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json({ message: 'Barang masuk hanya aktif saat review DB benar-benar tersedia.' }, { status: 503 })
  }

  try {
    const url = new URL(request.url)
    const search = String(url.searchParams.get('search') ?? '').trim()
    const limitRaw = Number.parseInt(String(url.searchParams.get('limit') ?? '10').trim() || '10', 10)
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(limitRaw, 200)) : 10
    const offset = resolveOptionalPositiveInt(url.searchParams.get('offset')) ?? 0
    const fromDate = normalizeDateToSql(url.searchParams.get('from'))
    const toDate = normalizeDateToSql(url.searchParams.get('to'))

    const filters: string[] = ["ism.movement_type = 'IN'"]
    const values: unknown[] = []

    if (fromDate) {
      filters.push('DATE(ism.movement_at) >= ?')
      values.push(fromDate)
    }
    if (toDate) {
      filters.push('DATE(ism.movement_at) <= ?')
      values.push(toDate)
    }
    if (search) {
      const like = `%${search}%`
      filters.push(
        `(UPPER(COALESCE(ism.reference_no, '')) LIKE UPPER(?) OR UPPER(ii.item_code) LIKE UPPER(?) OR UPPER(ii.item_name) LIKE UPPER(?) OR UPPER(COALESCE(ism.notes, '')) LIKE UPPER(?))`,
      )
      values.push(like, like, like, like)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
    const countValues = [...values]
    const countRows = await runReviewDbQuery<{ total: number }>(
      `
        SELECT COUNT(*) AS total
        FROM inventory_stock_movements ism
        INNER JOIN inventory_items ii
          ON ii.id = ism.item_id
        ${whereClause}
      `,
      countValues,
    )
    const total = Number(countRows[0]?.total ?? 0)

    values.push(limit, offset)
    const rows = await runReviewDbQuery<ReceiptMovementRow>(
      `
        SELECT
          ism.id,
          ism.reference_no AS transactionId,
          CAST(DATE(ism.movement_at) AS CHAR) AS movementDate,
          ism.item_id AS itemId,
          ii.item_code AS itemCode,
          ii.item_name AS itemName,
          iu.code AS unitCode,
          ism.qty AS qty,
          ism.notes AS notes
        FROM inventory_stock_movements ism
        INNER JOIN inventory_items ii
          ON ii.id = ism.item_id
        LEFT JOIN inventory_units iu
          ON iu.id = ii.unit_id
        ${whereClause}
        ORDER BY ism.movement_at DESC, ism.id DESC
        LIMIT ?
        OFFSET ?
      `,
      values,
    )

    const items = rows.map((row) => {
      const parsedNotes = parseReceiptNotes(row.notes)
      return {
        id: row.id,
        transactionId: row.transactionId || `BRG-MSK-${row.id}`,
        date: row.movementDate || '',
        itemCode: row.itemCode,
        itemName: row.itemName,
        storeName: parsedNotes.storeName || '',
        unitCode: row.unitCode || '',
        qty: Number(row.qty ?? 0),
        notes: parsedNotes.description || '',
      }
    })

    return Response.json({ items, total })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
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
      { message: 'Penerimaan barang hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      itemCode?: unknown
      qty?: unknown
      receiptDate?: unknown
      storeName?: unknown
      referenceNo?: unknown
      supplierName?: unknown
      unitPrice?: unknown
      notes?: unknown
    }

    const itemCode = extractItemCodeFromSelection(String(payload.itemCode ?? '').trim())
    const qty = Number.parseInt(String(payload.qty ?? '0').trim() || '0', 10)
    const receiptDate = normalizeDateToSql(payload.receiptDate) || ''
    const storeName = String(payload.storeName ?? payload.supplierName ?? '').trim()
    const referenceNo = String(payload.referenceNo ?? '').trim()
    const unitPrice = normalizePrice(payload.unitPrice)
    const notes = String(payload.notes ?? '').trim()

    if (!itemCode) {
      return Response.json({ message: 'Item inventory wajib dipilih.' }, { status: 400 })
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return Response.json({ message: 'Qty barang masuk harus lebih dari 0.' }, { status: 400 })
    }
    if (unitPrice === null || unitPrice < 0) {
      return Response.json({ message: 'Harga satuan barang masuk tidak valid.' }, { status: 400 })
    }

    const [item] = await runReviewDbQuery<ItemRow>(
      `
        SELECT
          id,
          item_code AS itemCode,
          item_name AS itemName,
          current_stock AS currentStock
        FROM inventory_items
        WHERE UPPER(item_code) = UPPER(?)
        LIMIT 1
      `,
      [itemCode],
    )
    if (!item) {
      return Response.json({ message: 'Item inventory tidak ditemukan di review DB.' }, { status: 404 })
    }

    const actor = `${session.displayName} (${session.username})`
    const noteText = buildReceiptNote({ actor, storeName, description: notes })
    const movementAt = receiptDate ? `${receiptDate} 00:00:00` : null
    const generatedReference = referenceNo || (receiptDate ? await generateReceiptCode(receiptDate) : '')
    const referenceValue = generatedReference || null

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
          VALUES (?, NULL, 'IN', ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))
        `,
        [item.id, referenceValue, qty, Number(unitPrice ?? 0), noteText, movementAt],
      )

      await connection.query(
        `
          UPDATE inventory_items
          SET
            current_stock = current_stock + ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [qty, item.id],
      )
    })

    return Response.json({
      message: `Barang masuk untuk ${item.itemCode} (${item.itemName}) berhasil dicatat.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

export async function PUT(request: Request) {
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
      { message: 'Edit barang masuk hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      id?: unknown
      itemCode?: unknown
      qty?: unknown
      receiptDate?: unknown
      storeName?: unknown
      notes?: unknown
    }

    const id = resolveOptionalPositiveInt(payload.id)
    const itemCode = extractItemCodeFromSelection(String(payload.itemCode ?? '').trim())
    const qty = Number.parseInt(String(payload.qty ?? '0').trim() || '0', 10)
    const receiptDate = normalizeDateToSql(payload.receiptDate)
    const storeName = String(payload.storeName ?? '').trim()
    const notes = String(payload.notes ?? '').trim()

    if (!id) {
      return Response.json({ message: 'ID transaksi tidak valid.' }, { status: 400 })
    }
    if (!itemCode) {
      return Response.json({ message: 'Item inventory wajib dipilih.' }, { status: 400 })
    }
    if (!Number.isInteger(qty) || qty <= 0) {
      return Response.json({ message: 'Qty barang masuk harus lebih dari 0.' }, { status: 400 })
    }
    if (!receiptDate) {
      return Response.json({ message: 'Tanggal wajib diisi.' }, { status: 400 })
    }

    const actor = `${session.displayName} (${session.username})`
    const noteText = buildReceiptNote({ actor, storeName, description: notes })

    const [selectedItem] = await runReviewDbQuery<ItemRow>(
      `
        SELECT
          id,
          item_code AS itemCode,
          item_name AS itemName,
          current_stock AS currentStock
        FROM inventory_items
        WHERE UPPER(item_code) = UPPER(?)
        LIMIT 1
      `,
      [itemCode],
    )
    if (!selectedItem) {
      return Response.json({ message: 'Item inventory tidak ditemukan di review DB.' }, { status: 404 })
    }

    await runReviewDbTransaction(async (connection) => {
      const [existingRows] = await connection.query(
        `
          SELECT
            id,
            item_id AS itemId,
            qty,
            movement_type AS movementType
          FROM inventory_stock_movements
          WHERE id = ?
          LIMIT 1
        `,
        [id],
      )
      const existing = Array.isArray(existingRows) ? (existingRows[0] as { itemId: number; qty: number; movementType: string } | undefined) : undefined
      if (!existing || String(existing.movementType).toUpperCase() !== 'IN') {
        throw new Error('Transaksi barang masuk tidak ditemukan.')
      }

      const previousQty = Number(existing.qty ?? 0)
      const previousItemId = Number(existing.itemId ?? 0)
      const movementAt = `${receiptDate} 00:00:00`

      if (previousItemId === selectedItem.id) {
        const delta = qty - previousQty
        if (delta !== 0) {
          const [stockRows] = await connection.query(
            `
              SELECT current_stock AS currentStock
              FROM inventory_items
              WHERE id = ?
              LIMIT 1
            `,
            [previousItemId],
          )
          const current = Array.isArray(stockRows) ? (stockRows[0] as { currentStock: number } | undefined) : undefined
          const nextStock = Number(current?.currentStock ?? 0) + delta
          if (nextStock < 0) {
            throw new Error('Stok tidak cukup untuk memperbarui transaksi ini.')
          }
          await connection.query(
            `
              UPDATE inventory_items
              SET
                current_stock = current_stock + ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            [delta, previousItemId],
          )
        }
      } else {
        const [oldStockRows] = await connection.query(
          `
            SELECT current_stock AS currentStock
            FROM inventory_items
            WHERE id = ?
            LIMIT 1
          `,
          [previousItemId],
        )
        const oldStock = Array.isArray(oldStockRows) ? (oldStockRows[0] as { currentStock: number } | undefined) : undefined
        const nextOldStock = Number(oldStock?.currentStock ?? 0) - previousQty
        if (nextOldStock < 0) {
          throw new Error('Stok tidak cukup untuk memindahkan transaksi ini.')
        }
        await connection.query(
          `
            UPDATE inventory_items
            SET
              current_stock = current_stock - ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [previousQty, previousItemId],
        )
        await connection.query(
          `
            UPDATE inventory_items
            SET
              current_stock = current_stock + ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [qty, selectedItem.id],
        )
      }

      await connection.query(
        `
          UPDATE inventory_stock_movements
          SET
            item_id = ?,
            qty = ?,
            notes = ?,
            movement_at = ?
          WHERE id = ?
        `,
        [selectedItem.id, qty, noteText, movementAt, id],
      )
    })

    return Response.json({ message: 'Barang masuk berhasil diperbarui.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    return Response.json({ message }, { status: message.includes('tidak ditemukan') ? 404 : 500 })
  }
}

export async function DELETE(request: Request) {
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
      { message: 'Hapus barang masuk hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const url = new URL(request.url)
    const id = resolveOptionalPositiveInt(url.searchParams.get('id'))
    if (!id) {
      return Response.json({ message: 'ID transaksi tidak valid.' }, { status: 400 })
    }

    await runReviewDbTransaction(async (connection) => {
      const [existingRows] = await connection.query(
        `
          SELECT
            id,
            item_id AS itemId,
            qty,
            movement_type AS movementType
          FROM inventory_stock_movements
          WHERE id = ?
          LIMIT 1
        `,
        [id],
      )
      const existing = Array.isArray(existingRows) ? (existingRows[0] as { itemId: number; qty: number; movementType: string } | undefined) : undefined
      if (!existing || String(existing.movementType).toUpperCase() !== 'IN') {
        throw new Error('Transaksi barang masuk tidak ditemukan.')
      }

      const itemId = Number(existing.itemId ?? 0)
      const qty = Number(existing.qty ?? 0)
      const [stockRows] = await connection.query(
        `
          SELECT current_stock AS currentStock
          FROM inventory_items
          WHERE id = ?
          LIMIT 1
        `,
        [itemId],
      )
      const stock = Array.isArray(stockRows) ? (stockRows[0] as { currentStock: number } | undefined) : undefined
      const nextStock = Number(stock?.currentStock ?? 0) - qty
      if (nextStock < 0) {
        throw new Error('Stok tidak cukup untuk menghapus transaksi ini.')
      }

      await connection.query(
        `
          UPDATE inventory_items
          SET
            current_stock = current_stock - ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [qty, itemId],
      )
      await connection.query('DELETE FROM inventory_stock_movements WHERE id = ?', [id])
    })

    return Response.json({ message: 'Transaksi barang masuk berhasil dihapus.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : getReviewDbErrorDetail(error)
    const status = message.includes('tidak ditemukan') ? 404 : message.includes('Stok tidak cukup') ? 409 : 500
    return Response.json({ message }, { status })
  }
}
