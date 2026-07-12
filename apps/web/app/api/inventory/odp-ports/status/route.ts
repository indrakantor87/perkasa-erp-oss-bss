import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

const allowedStatuses = new Set(['AVAILABLE', 'RESERVED', 'FAULTY', 'DISABLED'])

type OdpRow = {
  id: number
  code: string
}

type PortRow = {
  id: number
  portStatus: string
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function normalizeStatus(value: unknown) {
  return String(value ?? '').trim().toUpperCase()
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
    return Response.json({ message: 'Write action update port hanya aktif saat review DB benar-benar tersedia.' }, { status: 503 })
  }

  try {
    const payload = (await request.json()) as {
      odpCode?: unknown
      portNo?: unknown
      portStatus?: unknown
      clearMapping?: unknown
      notes?: unknown
    }

    const odpCode = String(payload.odpCode ?? '').trim()
    const portNo = Number.parseInt(String(payload.portNo ?? '').trim() || '0', 10)
    const portStatus = normalizeStatus(payload.portStatus)
    const clearMapping = Boolean(payload.clearMapping)
    const notesRaw = String(payload.notes ?? '').trim()

    if (!odpCode) {
      return Response.json({ message: 'ODP wajib dipilih.' }, { status: 400 })
    }
    if (!Number.isInteger(portNo) || portNo <= 0) {
      return Response.json({ message: 'Port no tidak valid.' }, { status: 400 })
    }
    if (!allowedStatuses.has(portStatus)) {
      return Response.json({ message: 'Status port tidak valid.' }, { status: 400 })
    }

    const [odp] = await runReviewDbQuery<OdpRow>(
      `
        SELECT id, code
        FROM network_odp
        WHERE UPPER(code) = UPPER(?)
        LIMIT 1
      `,
      [odpCode],
    )
    if (!odp) {
      return Response.json({ message: 'ODP tidak ditemukan di review DB.' }, { status: 404 })
    }

    const [port] = await runReviewDbQuery<PortRow>(
      `
        SELECT id, port_status AS portStatus
        FROM network_odp_ports
        WHERE odp_id = ?
          AND port_no = ?
        LIMIT 1
      `,
      [odp.id, portNo],
    )
    if (!port) {
      return Response.json({ message: 'Port ODP tidak ditemukan. Pastikan port sudah digenerate.' }, { status: 404 })
    }

    const currentStatus = normalizeStatus(port.portStatus)
    const noteText = `[Update Port] ${session.displayName} (${session.username})${notesRaw ? ` - ${notesRaw}` : ''}`

    await runReviewDbExecute<InsertResult>(
      `
        UPDATE network_odp_ports
        SET
          port_status = ?,
          subscription_id = CASE
            WHEN ? = 1 THEN NULL
            ELSE subscription_id
          END,
          customer_id = CASE
            WHEN ? = 1 THEN NULL
            ELSE customer_id
          END,
          installed_at = CASE
            WHEN ? = 1 THEN NULL
            ELSE installed_at
          END,
          notes = CASE
            WHEN notes IS NULL OR TRIM(notes) = '' THEN ?
            ELSE CONCAT(notes, '\n', ?)
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [portStatus, clearMapping ? 1 : 0, clearMapping ? 1 : 0, clearMapping ? 1 : 0, noteText, noteText, port.id],
    )

    if (currentStatus === 'USED' || portStatus === 'USED') {
      await runReviewDbExecute<InsertResult>(
        `
          UPDATE network_odp
          SET
            active_ports = (
              SELECT COUNT(*)
              FROM network_odp_ports
              WHERE odp_id = ?
                AND port_status = 'USED'
            ),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [odp.id, odp.id],
      )
    }

    return Response.json({
      message: `Port ${odp.code} #${portNo} berhasil diubah dari ${currentStatus} ke ${portStatus}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
