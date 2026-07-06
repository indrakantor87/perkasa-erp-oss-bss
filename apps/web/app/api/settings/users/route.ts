import { createHash } from 'node:crypto'
import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type CountRow = {
  total: number
}

type LookupRow = {
  id: number
}

const allowedStatuses = new Set(['ACTIVE', 'INACTIVE'])

function normalizeOptionalText(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

async function recordExists(tableName: 'auth_roles' | 'org_divisions' | 'org_branches', id: number) {
  const [row] = await runReviewDbQuery<LookupRow | CountRow>(
    `
      SELECT id
      FROM ${tableName}
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  )

  return Boolean(row)
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'user_settings', 'manage')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Create user internal hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const payload = (await request.json()) as {
      fullName?: unknown
      username?: unknown
      email?: unknown
      password?: unknown
      roleId?: unknown
      divisionId?: unknown
      branchId?: unknown
      status?: unknown
    }

    const fullName = String(payload.fullName ?? '').trim()
    const username = String(payload.username ?? '').trim().toLowerCase()
    const email = normalizeOptionalText(payload.email)?.toLowerCase() ?? null
    const password = String(payload.password ?? '').trim()
    const status = String(payload.status ?? '').trim().toUpperCase()

    const roleId = Number(payload.roleId)
    const divisionId = payload.divisionId == null || payload.divisionId === '' ? null : Number(payload.divisionId)
    const branchId = payload.branchId == null || payload.branchId === '' ? null : Number(payload.branchId)

    if (!fullName) {
      return Response.json({ message: 'Nama lengkap wajib diisi.' }, { status: 400 })
    }
    if (!username || !/^[a-z0-9._-]{3,40}$/i.test(username)) {
      return Response.json(
        { message: 'Username wajib diisi 3-40 karakter dan hanya boleh huruf, angka, titik, strip, atau underscore.' },
        { status: 400 }
      )
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ message: 'Format email tidak valid.' }, { status: 400 })
    }
    if (password.length < 6) {
      return Response.json({ message: 'Password awal minimal 6 karakter.' }, { status: 400 })
    }
    if (!Number.isInteger(roleId) || roleId <= 0) {
      return Response.json({ message: 'Role database wajib dipilih.' }, { status: 400 })
    }
    if (divisionId !== null && (!Number.isInteger(divisionId) || divisionId <= 0)) {
      return Response.json({ message: 'Divisi tidak valid.' }, { status: 400 })
    }
    if (branchId !== null && (!Number.isInteger(branchId) || branchId <= 0)) {
      return Response.json({ message: 'Cabang tidak valid.' }, { status: 400 })
    }
    if (!allowedStatuses.has(status)) {
      return Response.json({ message: 'Status user tidak valid.' }, { status: 400 })
    }

    const [roleExists, divisionExists, branchExists] = await Promise.all([
      recordExists('auth_roles', roleId),
      divisionId === null ? Promise.resolve(true) : recordExists('org_divisions', divisionId),
      branchId === null ? Promise.resolve(true) : recordExists('org_branches', branchId),
    ])

    if (!roleExists) {
      return Response.json({ message: 'Role database yang dipilih tidak ditemukan.' }, { status: 400 })
    }
    if (!divisionExists) {
      return Response.json({ message: 'Divisi yang dipilih tidak ditemukan.' }, { status: 400 })
    }
    if (!branchExists) {
      return Response.json({ message: 'Cabang yang dipilih tidak ditemukan.' }, { status: 400 })
    }

    const duplicates = await runReviewDbQuery<CountRow>(
      `
        SELECT COUNT(*) AS total
        FROM auth_users
        WHERE LOWER(username) = ?
           OR (? IS NOT NULL AND LOWER(COALESCE(email, '')) = ?)
      `,
      [username, email, email]
    )

    if (Number(duplicates[0]?.total ?? 0) > 0) {
      return Response.json(
        { message: 'Username atau email sudah dipakai oleh user internal lain.' },
        { status: 409 }
      )
    }

    const passwordHash = `sha256:${createHash('sha256').update(password).digest('hex')}`

    await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO auth_users (
          branch_id,
          division_id,
          role_id,
          full_name,
          username,
          email,
          password_hash,
          phone,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)
      `,
      [branchId, divisionId, roleId, fullName, username, email, passwordHash, status]
    )

    return Response.json({
      message: `User internal ${fullName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
