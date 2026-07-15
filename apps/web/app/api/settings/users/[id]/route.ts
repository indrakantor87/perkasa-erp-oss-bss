import { createHash } from 'node:crypto'
import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { ensureAuthUserAuditTable, recordAuthUserAudit } from '@/lib/services/auth-user-audit-service'

type LookupRow = {
  id: number
}

type RoleLookupRow = {
  id: number
  code: string
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
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
const allowedRoleCodes = new Set([
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'FINANCE',
  'HR',
  'GA',
  'PENJUALAN',
  'CS',
  'NOC',
  'TROUBLESHOOTS',
  'CREATOR_DIGITAL',
  'DISMANTLE',
  'TEKNISI_PSB',
])
const allowedDivisionCodes = new Set([
  'PEMASARAN_PELAYANAN',
  'FINANCE_HR',
  'GENERAL_AFFAIR',
  'TEKNIS_EKSPAN',
  'OPERASIONAL',
])

const roleLabels: Record<string, string> = {
  OWNER: 'Owner',
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  FINANCE: 'Finance',
  HR: 'HR',
  GA: 'GA',
  PENJUALAN: 'Penjualan',
  CS: 'Customer Service',
  NOC: 'NOC',
  TROUBLESHOOTS: 'Troubleshoots',
  CREATOR_DIGITAL: 'Creator Digital',
  DISMANTLE: 'Dismantle',
  TEKNISI_PSB: 'Teknisi PSB',
}

const divisionLabels: Record<string, string> = {
  PEMASARAN_PELAYANAN: 'Pemasaran dan Pelayanan',
  FINANCE_HR: 'Finance & HR',
  GENERAL_AFFAIR: 'General Affair',
  TEKNIS_EKSPAN: 'Teknis & Ekspan',
  OPERASIONAL: 'Operasional',
}

const roleDivisionMap: Record<string, string> = {
  PENJUALAN: 'PEMASARAN_PELAYANAN',
  CS: 'PEMASARAN_PELAYANAN',
  CREATOR_DIGITAL: 'PEMASARAN_PELAYANAN',
  NOC: 'PEMASARAN_PELAYANAN',
  TROUBLESHOOTS: 'PEMASARAN_PELAYANAN',
  FINANCE: 'FINANCE_HR',
  HR: 'FINANCE_HR',
  GA: 'GENERAL_AFFAIR',
  TEKNISI_PSB: 'TEKNIS_EKSPAN',
  DISMANTLE: 'TEKNIS_EKSPAN',
  OWNER: 'OPERASIONAL',
  SUPER_ADMIN: 'OPERASIONAL',
  ADMIN: 'OPERASIONAL',
}

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

async function getRoleCodeById(id: number) {
  const [row] = await runReviewDbQuery<RoleLookupRow>(
    `
      SELECT id, code
      FROM auth_roles
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  )

  return row?.code?.trim().toUpperCase() ?? null
}

async function getRoleIdByCode(code: string) {
  const [row] = await runReviewDbQuery<RoleLookupRow>(
    `
      SELECT id, code
      FROM auth_roles
      WHERE UPPER(code) = ?
      LIMIT 1
    `,
    [code]
  )

  return row?.id ?? null
}

async function getDivisionCodeById(id: number) {
  const [row] = await runReviewDbQuery<RoleLookupRow>(
    `
      SELECT id, code
      FROM org_divisions
      WHERE id = ?
      LIMIT 1
    `,
    [id]
  )

  return row?.code?.trim().toUpperCase() ?? null
}

async function getDivisionIdByCode(code: string) {
  const [row] = await runReviewDbQuery<RoleLookupRow>(
    `
      SELECT id, code
      FROM org_divisions
      WHERE UPPER(code) = ?
      LIMIT 1
    `,
    [code]
  )

  return row?.id ?? null
}

async function ensureRoleId(roleRef: unknown) {
  const raw = String(roleRef ?? '').trim()
  if (!raw) {
    return { id: null, code: null }
  }

  const numericId = Number(raw)
  if (Number.isInteger(numericId) && numericId > 0) {
    const roleCode = await getRoleCodeById(numericId)
    return { id: roleCode ? numericId : null, code: roleCode }
  }

  const roleCode = raw.toUpperCase()
  if (!allowedRoleCodes.has(roleCode)) {
    return { id: null, code: roleCode }
  }

  const existingId = await getRoleIdByCode(roleCode)
  if (existingId) {
    return { id: existingId, code: roleCode }
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO auth_roles (code, name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name)
    `,
    [roleCode, roleLabels[roleCode] ?? roleCode]
  )

  const insertedId = await getRoleIdByCode(roleCode)
  return { id: insertedId, code: roleCode }
}

async function ensureDivisionId(divisionRef: unknown) {
  const raw = String(divisionRef ?? '').trim()
  if (!raw) {
    return { id: null, code: null }
  }

  const numericId = Number(raw)
  if (Number.isInteger(numericId) && numericId > 0) {
    const divisionCode = await getDivisionCodeById(numericId)
    return { id: divisionCode ? numericId : null, code: divisionCode }
  }

  const divisionCode = raw.toUpperCase()
  if (!allowedDivisionCodes.has(divisionCode)) {
    return { id: null, code: divisionCode }
  }

  const existingId = await getDivisionIdByCode(divisionCode)
  if (existingId) {
    return { id: existingId, code: divisionCode }
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO org_divisions (code, name)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name)
    `,
    [divisionCode, divisionLabels[divisionCode] ?? divisionCode]
  )

  const insertedId = await getDivisionIdByCode(divisionCode)
  return { id: insertedId, code: divisionCode }
}

function resolveDivisionRefForRole(roleCode: string, divisionRef: unknown) {
  const mappedDivisionCode = roleDivisionMap[roleCode]
  if (!mappedDivisionCode) {
    return divisionRef
  }

  return mappedDivisionCode
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

    const roleRef = payload.roleId
    const divisionRef = payload.divisionId
    const branchId = payload.branchId == null || payload.branchId === '' ? null : Number(payload.branchId)

    if (!fullName) {
      return Response.json({ message: 'Nama lengkap wajib diisi.' }, { status: 400 })
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ message: 'Format email tidak valid.' }, { status: 400 })
    }
    if (!String(roleRef ?? '').trim()) {
      return Response.json({ message: 'Role database wajib dipilih.' }, { status: 400 })
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

    const [{ id: roleId, code: roleCode }, branchExists] = await Promise.all([
      ensureRoleId(roleRef),
      branchId === null ? Promise.resolve(true) : recordExists('org_branches', branchId),
    ])

    if (!roleCode || !roleId) {
      return Response.json({ message: 'Role database yang dipilih tidak ditemukan.' }, { status: 400 })
    }
    if (!allowedRoleCodes.has(roleCode)) {
      return Response.json({ message: 'Role legacy tidak lagi boleh dipakai di form user. Pilih role final.' }, { status: 400 })
    }
    const resolvedDivisionRef = resolveDivisionRefForRole(roleCode, divisionRef)
    const { id: divisionId, code: divisionCode } = await ensureDivisionId(resolvedDivisionRef)
    if (String(resolvedDivisionRef ?? '').trim() && (!divisionCode || (divisionId ?? 0) <= 0)) {
      return Response.json({ message: 'Divisi final yang dipilih tidak ditemukan.' }, { status: 400 })
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

export async function DELETE(
  _request: Request,
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
      { message: 'Hapus user internal hanya aktif saat review DB benar-benar tersedia.' },
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
    if (existingUser.username === session.username) {
      return Response.json({ message: 'User yang sedang login tidak boleh menghapus akunnya sendiri.' }, { status: 400 })
    }

    await ensureAuthUserAuditTable()

    try {
      await recordAuthUserAudit({
        authUserId: userId,
        actionType: 'UPDATE',
        actor: session.displayName,
        targetUsername: existingUser.username,
        detail: `Penghapusan user internal dijalankan dari halaman settings/users untuk akun ${existingUser.fullName}.`,
      })
    } catch {
      // Audit tidak boleh membatalkan hapus utama.
    }

    try {
      await runReviewDbExecute(
        `
          UPDATE staging_legacy_user_records
          SET target_user_id = NULL
          WHERE target_user_id = ?
        `,
        [userId]
      )
    } catch {
      // Cleanup tambahan tidak boleh membatalkan jalur hapus utama.
    }

    try {
      await runReviewDbExecute(
        `
          UPDATE sales_surveys
          SET requested_by_user_id = NULL
          WHERE requested_by_user_id = ?
        `,
        [userId]
      )
    } catch {
      // Cleanup tambahan tidak boleh membatalkan jalur hapus utama.
    }

    try {
      await runReviewDbExecute(
        `
          UPDATE billing_payments
          SET received_by_user_id = NULL
          WHERE received_by_user_id = ?
        `,
        [userId]
      )
    } catch {
      // Cleanup tambahan tidak boleh membatalkan jalur hapus utama.
    }

    try {
      await runReviewDbExecute(
        `
          UPDATE billing_collection_actions
          SET handled_by_user_id = NULL
          WHERE handled_by_user_id = ?
        `,
        [userId]
      )
    } catch {
      // Cleanup tambahan tidak boleh membatalkan jalur hapus utama.
    }

    try {
      await runReviewDbExecute(
        `
          DELETE FROM auth_user_branch_access
          WHERE auth_user_id = ?
        `,
        [userId]
      )
    } catch {
      // Cleanup tambahan tidak boleh membatalkan jalur hapus utama.
    }

    try {
      await runReviewDbExecute(
        `
          DELETE FROM auth_user_audit_logs
          WHERE auth_user_id = ?
        `,
        [userId]
      )
    } catch {
      // Cleanup tambahan tidak boleh membatalkan jalur hapus utama.
    }

    await runReviewDbExecute(
      `
        DELETE FROM auth_users
        WHERE id = ?
      `,
      [userId]
    )

    return Response.json({
      message: `User internal ${existingUser.fullName} berhasil dihapus.`,
    })
  } catch (error) {
    return Response.json(
      {
        message: `User internal belum bisa dihapus. ${getReviewDbErrorDetail(error)}`,
      },
      { status: 500 }
    )
  }
}
