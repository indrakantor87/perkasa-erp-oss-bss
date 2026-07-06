import { createHash } from 'node:crypto'
import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type LookupRow = {
  id: number
}

type UserLookupRow = {
  id: number
}

type CountRow = {
  total: number
}

const allowedStatuses = new Set(['ACTIVE', 'INACTIVE'])

function normalizeOptionalText(value: unknown) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

async function recordExists(tableName: 'auth_roles' | 'org_divisions' | 'org_branches', id: number) {
  const [row] = await runReviewDbQuery<LookupRow>(
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

async function getUserById(id: number) {
  const [row] = await runReviewDbQuery<UserLookupRow>(
    `
      SELECT id
      FROM auth_users
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  )

  return row ?? null
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
      { message: 'Kelola user internal hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 }
    )
  }

  try {
    const { id } = await params
    const userId = Number(id)
    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json({ message: 'ID user tidak valid.' }, { status: 400 })
    }

    const existingUser = await getUserById(userId)
    if (!existingUser) {
      return Response.json({ message: 'User internal tidak ditemukan.' }, { status: 404 })
    }

    const payload = (await request.json()) as {
      fullName?: unknown
      email?: unknown
      roleId?: unknown
      divisionId?: unknown
      branchId?: unknown
      status?: unknown
      newPassword?: unknown
    }

    const fullName = String(payload.fullName ?? '').trim()
    const email = normalizeOptionalText(payload.email)?.toLowerCase() ?? null
    const status = String(payload.status ?? '').trim().toUpperCase()
    const newPassword = String(payload.newPassword ?? '').trim()

    const roleId = Number(payload.roleId)
    const divisionId = payload.divisionId == null || payload.divisionId === '' ? null : Number(payload.divisionId)
    const branchId = payload.branchId == null || payload.branchId === '' ? null : Number(payload.branchId)

    if (!fullName) {
      return Response.json({ message: 'Nama lengkap wajib diisi.' }, { status: 400 })
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ message: 'Format email tidak valid.' }, { status: 400 })
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
    if (newPassword && newPassword.length < 6) {
      return Response.json({ message: 'Password baru minimal 6 karakter.' }, { status: 400 })
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

    const [duplicateEmail] = await runReviewDbQuery<CountRow>(
      `
        SELECT COUNT(*) AS total
        FROM auth_users
        WHERE id <> ?
          AND (? IS NOT NULL AND LOWER(COALESCE(email, '')) = ?)
      `,
      [userId, email, email]
    )

    if (Number(duplicateEmail?.total ?? 0) > 0) {
      return Response.json({ message: 'Email sudah dipakai oleh user internal lain.' }, { status: 409 })
    }

    await runReviewDbExecute(
      `
        UPDATE auth_users
        SET
          branch_id = ?,
          division_id = ?,
          role_id = ?,
          full_name = ?,
          email = ?,
          status = ?
        WHERE id = ?
      `,
      [branchId, divisionId, roleId, fullName, email, status, userId]
    )

    if (newPassword) {
      const passwordHash = `sha256:${createHash('sha256').update(newPassword).digest('hex')}`
      await runReviewDbExecute(
        `
          UPDATE auth_users
          SET password_hash = ?
          WHERE id = ?
        `,
        [passwordHash, userId]
      )
    }

    return Response.json({
      message: newPassword
        ? `User internal ${fullName} berhasil diperbarui dan password telah direset.`
        : `User internal ${fullName} berhasil diperbarui.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
