import { createHash } from 'node:crypto'
import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import { recordAuthUserAudit } from '@/lib/services/auth-user-audit-service'

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

type RoleLookupRow = {
  id: number
  code: string
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

    const roleRef = payload.roleId
    const divisionRef = payload.divisionId
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
    if (!String(roleRef ?? '').trim()) {
      return Response.json({ message: 'Role database wajib dipilih.' }, { status: 400 })
    }
    if (branchId !== null && (!Number.isInteger(branchId) || branchId <= 0)) {
      return Response.json({ message: 'Cabang tidak valid.' }, { status: 400 })
    }
    if (!allowedStatuses.has(status)) {
      return Response.json({ message: 'Status user tidak valid.' }, { status: 400 })
    }

    const [{ id: roleId, code: roleCode }, branchExists] = await Promise.all([
      ensureRoleId(roleRef),
      branchId === null ? Promise.resolve(true) : recordExists('org_branches', branchId),
    ])

    if (!roleCode || !roleId) {
      return Response.json({ message: 'Role database yang dipilih tidak ditemukan.' }, { status: 400 })
    }
    if (!allowedRoleCodes.has(roleCode)) {
      return Response.json({ message: 'Role legacy tidak lagi boleh dipakai untuk user baru. Pilih role final.' }, { status: 400 })
    }
    const resolvedDivisionRef = resolveDivisionRefForRole(roleCode, divisionRef)
    const { id: divisionId, code: divisionCode } = await ensureDivisionId(resolvedDivisionRef)
    if (String(resolvedDivisionRef ?? '').trim() && (!divisionCode || (divisionId ?? 0) <= 0)) {
      return Response.json({ message: 'Divisi final yang dipilih tidak ditemukan.' }, { status: 400 })
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

    const result = await runReviewDbExecute<ExecuteResult>(
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

    if (typeof result.insertId === 'number' && result.insertId > 0) {
      try {
        await recordAuthUserAudit({
          authUserId: result.insertId,
          actionType: 'CREATE',
          actor: session.displayName,
          targetUsername: username,
          detail: `User internal dibuat dengan role ID ${roleId}, status ${status}, dan nama ${fullName}.`,
        })
      } catch {
        // Audit tidak boleh membatalkan pembuatan user utama.
      }
    }

    return Response.json({
      message: `User internal ${fullName} berhasil disimpan.`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
