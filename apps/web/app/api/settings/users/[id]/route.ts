import { createHash } from 'node:crypto'
import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordAuthUserAudit } from '@/lib/services/auth-user-audit-service'

type LookupRow = {
  id: number
}

type UserLookupRow = {
  id: number
  username: string
  fullName: string
  email: string | null
  roleId: number | null
  divisionId: number | null
  branchId: number | null
  status: string
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
        , username AS username
        , full_name AS fullName
        , email AS email
        , role_id AS roleId
        , division_id AS divisionId
        , branch_id AS branchId
        , status AS status
      FROM auth_users
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  )

  return row ?? null
}

function getUpdateDetail(params: {
  previous: UserLookupRow
  next: {
    fullName: string
    email: string | null
    roleId: number
    divisionId: number | null
    branchId: number | null
    status: string
  }
}) {
  const changes: string[] = []

  if (params.previous.fullName !== params.next.fullName) {
    changes.push(`nama: ${params.previous.fullName} -> ${params.next.fullName}`)
  }
  if ((params.previous.email ?? '') !== (params.next.email ?? '')) {
    changes.push(`email: ${params.previous.email ?? '-'} -> ${params.next.email ?? '-'}`)
  }
  if ((params.previous.roleId ?? 0) !== params.next.roleId) {
    changes.push(`role ID: ${params.previous.roleId ?? '-'} -> ${params.next.roleId}`)
  }
  if ((params.previous.divisionId ?? 0) !== (params.next.divisionId ?? 0)) {
    changes.push(`divisi ID: ${params.previous.divisionId ?? '-'} -> ${params.next.divisionId ?? '-'}`)
  }
  if ((params.previous.branchId ?? 0) !== (params.next.branchId ?? 0)) {
    changes.push(`cabang ID: ${params.previous.branchId ?? '-'} -> ${params.next.branchId ?? '-'}`)
  }
  if (params.previous.status !== params.next.status) {
    changes.push(`status: ${params.previous.status} -> ${params.next.status}`)
  }

  return changes.length
    ? `Profil user internal diperbarui (${changes.join('; ')}).`
    : 'Profil user internal disimpan ulang tanpa perubahan field utama.'
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

    try {
      await recordAuthUserAudit({
        authUserId: userId,
        actionType: 'UPDATE',
        actor: session.displayName,
        targetUsername: existingUser.username,
        detail: getUpdateDetail({
          previous: existingUser,
          next: { fullName, email, roleId, divisionId, branchId, status },
        }),
      })
    } catch {
      // Audit tidak boleh membatalkan update utama.
    }

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

      try {
        await recordAuthUserAudit({
          authUserId: userId,
          actionType: 'RESET_PASSWORD',
          actor: session.displayName,
          targetUsername: existingUser.username,
          detail: 'Password user internal direset melalui halaman settings/users.',
        })
      } catch {
        // Audit tidak boleh membatalkan reset password utama.
      }
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
