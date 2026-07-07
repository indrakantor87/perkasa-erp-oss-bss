import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExistingOdpRow = {
  id: number
}

type InsertResult = {
  insertId?: number
  affectedRows?: number
}

function normalizeNumber(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null
  const parsed = Number(raw.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
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
    return Response.json({ message: 'Write action ODP hanya aktif saat review DB benar-benar tersedia.' }, { status: 503 })
  }

  try {
    const payload = (await request.json()) as {
      code?: unknown
      name?: unknown
      locationText?: unknown
      latitude?: unknown
      longitude?: unknown
      totalPorts?: unknown
      generatePorts?: unknown
    }

    const code = String(payload.code ?? '').trim()
    const name = String(payload.name ?? '').trim()
    const locationText = String(payload.locationText ?? '').trim()
    const latitude = normalizeNumber(payload.latitude)
    const longitude = normalizeNumber(payload.longitude)
    const totalPorts = Number.parseInt(String(payload.totalPorts ?? '').trim() || '0', 10)
    const generatePorts = Boolean(payload.generatePorts)

    if (!code) {
      return Response.json({ message: 'Kode ODP wajib diisi.' }, { status: 400 })
    }
    if (!name) {
      return Response.json({ message: 'Nama ODP wajib diisi.' }, { status: 400 })
    }
    if (!Number.isInteger(totalPorts) || totalPorts <= 0 || totalPorts > 512) {
      return Response.json({ message: 'Total port tidak valid.' }, { status: 400 })
    }
    if (latitude !== null && (latitude < -90 || latitude > 90)) {
      return Response.json({ message: 'Latitude tidak valid.' }, { status: 400 })
    }
    if (longitude !== null && (longitude < -180 || longitude > 180)) {
      return Response.json({ message: 'Longitude tidak valid.' }, { status: 400 })
    }

    const existing = await runReviewDbQuery<ExistingOdpRow>(
      `
        SELECT id
        FROM network_odp
        WHERE UPPER(code) = UPPER(?)
        LIMIT 1
      `,
      [code],
    )
    if (existing.length > 0) {
      return Response.json({ message: 'Kode ODP sudah terpakai.' }, { status: 409 })
    }

    const insert = await runReviewDbExecute<InsertResult>(
      `
        INSERT INTO network_odp (
          code,
          name,
          location_text,
          latitude,
          longitude,
          total_ports,
          active_ports
        )
        VALUES (?, ?, ?, ?, ?, ?, 0)
      `,
      [code, name, locationText || null, latitude, longitude, totalPorts],
    )

    const odpId = Number(insert.insertId ?? 0)
    if (!odpId) {
      return Response.json({ message: 'ODP gagal dibuat di review DB.' }, { status: 500 })
    }

    if (generatePorts) {
      for (let portNo = 1; portNo <= totalPorts; portNo += 1) {
        await runReviewDbExecute<InsertResult>(
          `
            INSERT INTO network_odp_ports (
              odp_id,
              port_no,
              port_status,
              splitter_slot,
              core_label,
              subscription_id,
              customer_id,
              installed_at,
              notes
            )
            VALUES (?, ?, 'AVAILABLE', NULL, NULL, NULL, NULL, NULL, NULL)
          `,
          [odpId, portNo],
        )
      }
    }

    return Response.json({
      message: `ODP ${code} berhasil disimpan${generatePorts ? ` dan port 1..${totalPorts} berhasil digenerate` : ''}.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}

