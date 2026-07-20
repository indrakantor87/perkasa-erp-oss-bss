import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { AppRole } from '@/lib/types'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbQuery } from '@/lib/review-db'

export type AppSession = {
  userId?: number
  username: string
  displayName: string
  role: AppRole
  branchId: number | null
  branchIds: number[]
}

type MockAuthUser = AppSession & {
  passwordEnvKey: string
}

type ReviewAuthUserRow = {
  userId: number
  username: string
  fullName: string
  roleCode: string
  passwordHash: string
  status: string
  branchId: number | null
}

type AuthAttemptResult =
  | { session: AppSession; source: 'review-db' | 'mock' }
  | { session: null; reason: 'not_found' | 'invalid_password' | 'inactive' | 'unavailable' }

const DEFAULT_AUTH_SECRET = 'perkasa-erp-oss-bss-dev-secret'

function parseBooleanEnv(value: string | undefined) {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return null
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return null
}

function parseBootstrapMockAuthCredentials() {
  const raw = process.env.BOOTSTRAP_MOCK_AUTH_CREDENTIALS?.trim()
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([username, password]) => {
        const normalizedUsername = username.trim().toLowerCase()
        const normalizedPassword = typeof password === 'string' ? password.trim() : ''
        if (!normalizedUsername || !normalizedPassword) {
          return []
        }
        return [[normalizedUsername, normalizedPassword]]
      })
    )
  } catch {
    return {}
  }
}

function getBootstrapMockPassword(user: Pick<MockAuthUser, 'username' | 'passwordEnvKey'>) {
  const directPassword = process.env[user.passwordEnvKey]?.trim()
  if (directPassword) {
    return directPassword
  }

  const credentialMap = parseBootstrapMockAuthCredentials()
  return credentialMap[user.username] ?? null
}

export const mockAuthUsers: MockAuthUser[] = [
  {
    username: 'admin.perkasa',
    passwordEnvKey: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_ADMIN_PERKASA',
    displayName: 'Super Admin Perkasa',
    role: 'SUPER_ADMIN',
    branchId: 1,
    branchIds: [1],
  },
  {
    username: 'marketing.review',
    passwordEnvKey: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_MARKETING_REVIEW',
    displayName: 'Marketing Review',
    role: 'SALES_MARKETING',
    branchId: 1,
    branchIds: [1],
  },
  {
    username: 'cs.operator',
    passwordEnvKey: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_CS_OPERATOR',
    displayName: 'Operator CS Review',
    role: 'CS_OPERATOR',
    branchId: 1,
    branchIds: [1],
  },
  {
    username: 'cs.review',
    passwordEnvKey: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_CS_REVIEW',
    displayName: 'Admin CS Review',
    role: 'CS_ADMIN',
    branchId: 1,
    branchIds: [1],
  },
  {
    username: 'support.ops',
    passwordEnvKey: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_SUPPORT_OPS',
    displayName: 'Operator NOC Support',
    role: 'NOC_OPERATOR',
    branchId: 1,
    branchIds: [1],
  },
  {
    username: 'tt.review',
    passwordEnvKey: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_TT_REVIEW',
    displayName: 'TT Operator Review',
    role: 'TT_OPERATOR',
    branchId: 1,
    branchIds: [1],
  },
  {
    username: 'dismantle.review',
    passwordEnvKey: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_DISMANTLE_REVIEW',
    displayName: 'Dismantle Review',
    role: 'DISMANTLE_OPERATOR',
    branchId: 1,
    branchIds: [1],
  },
  {
    username: 'creator.review',
    passwordEnvKey: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_CREATOR_REVIEW',
    displayName: 'Creator Digital Review',
    role: 'DIGITAL_CREATOR',
    branchId: 1,
    branchIds: [1],
  },
  {
    username: 'field.review',
    passwordEnvKey: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_FIELD_REVIEW',
    displayName: 'Field Technician Review',
    role: 'FIELD_TECHNICIAN',
    branchId: 1,
    branchIds: [1],
  },
]

export function isBootstrapMockAuthEnabled() {
  if (process.env.NODE_ENV === 'production') {
    return false
  }

  const override = parseBooleanEnv(process.env.ALLOW_BOOTSTRAP_MOCK_AUTH)
  if (override !== null) {
    return override
  }

  const source = getDataSourceSnapshot()
  return source.effectiveMode !== 'review-db' || source.isFallback
}

function getAuthSecret() {
  const configuredSecret = process.env.AUTH_SESSION_SECRET?.trim()
  if (configuredSecret) {
    return configuredSecret
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SESSION_SECRET wajib diisi pada environment production.')
  }

  return DEFAULT_AUTH_SECRET
}

function signPayload(payload: string) {
  return createHmac('sha256', getAuthSecret()).update(payload).digest('hex')
}

function mapReviewRoleToAppRole(roleCode: string): AppRole {
  const normalized = roleCode.trim().toUpperCase()
  if (normalized === 'OWNER') return 'OWNER'
  if (normalized === 'SUPER_ADMIN') return 'SUPER_ADMIN'
  if (normalized === 'ADMIN') return 'ADMIN'
  if (normalized === 'FINANCE') return 'FINANCE'
  if (normalized === 'HR') return 'HR'
  if (normalized === 'GA') return 'GA'
  if (normalized === 'PENJUALAN') return 'PENJUALAN'
  if (normalized === 'MARKETING' || normalized === 'SALES') return 'PENJUALAN'
  if (normalized === 'CS') return 'CS_OPERATOR'
  if (normalized === 'ADMIN_CS') return 'CS_ADMIN'
  if (normalized === 'NOC') return 'NOC_OPERATOR'
  if (normalized === 'TEKNISI' || normalized === 'TEKNISI_PSB') return 'FIELD_TECHNICIAN'
  if (normalized === 'TROUBLESHOOTS') return 'TT_OPERATOR'
  if (normalized === 'CREATOR_DIGITAL') return 'DIGITAL_CREATOR'
  if (normalized === 'DISMANTLE') return 'DISMANTLE_OPERATOR'
  if (['OPERATOR', 'SUPPORT_OPS', 'SUPPORT_OPERATOR'].includes(normalized)) return 'NOC_OPERATOR'
  return 'CS_ADMIN'
}

function comparePassword(candidate: string, storedHash: string) {
  const normalizedStored = storedHash.trim()
  if (!normalizedStored) return false
  if (candidate === normalizedStored) return true

  const sha256 = createHash('sha256').update(candidate).digest('hex')
  return (
    normalizedStored.toLowerCase() === sha256.toLowerCase() ||
    normalizedStored.toLowerCase() === `sha256:${sha256}`.toLowerCase()
  )
}

export function authenticateMockUser(username: string, password: string): AppSession | null {
  const normalizedUsername = username.trim().toLowerCase()
  const candidate = mockAuthUsers.find((user) => {
    if (user.username !== normalizedUsername) {
      return false
    }

    const expectedPassword = getBootstrapMockPassword(user)
    return expectedPassword != null && expectedPassword === password
  })

  if (!candidate) {
    return null
  }

  return {
    username: candidate.username,
    displayName: candidate.displayName,
    role: candidate.role,
    branchId: candidate.branchId,
    branchIds: candidate.branchIds,
  }
}

async function authenticateReviewDbUser(username: string, password: string): Promise<AuthAttemptResult> {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return { session: null, reason: 'unavailable' }
  }

  try {
    const normalizedUsername = username.trim().toLowerCase()
    const users = await runReviewDbQuery<ReviewAuthUserRow>(
      `
        SELECT
          au.id AS userId,
          au.username AS username,
          au.full_name AS fullName,
          ar.code AS roleCode,
          au.password_hash AS passwordHash,
          au.status AS status,
          au.branch_id AS branchId
        FROM auth_users au
        JOIN auth_roles ar
          ON ar.id = au.role_id
        WHERE LOWER(au.username) = ?
           OR LOWER(COALESCE(au.email, '')) = ?
        LIMIT 1
      `,
      [normalizedUsername, normalizedUsername],
    )

    const candidate = users[0]
    if (!candidate) {
      return { session: null, reason: 'not_found' }
    }
    if (String(candidate.status).trim().toUpperCase() !== 'ACTIVE') {
      return { session: null, reason: 'inactive' }
    }
    if (!comparePassword(password, candidate.passwordHash)) {
      return { session: null, reason: 'invalid_password' }
    }

    const resolvedRole = mapReviewRoleToAppRole(candidate.roleCode)
    const resolvedBranchId = Number(candidate.branchId)
    const baseBranchId = Number.isFinite(resolvedBranchId) && resolvedBranchId > 0 ? resolvedBranchId : null
    const branchIds: number[] = []
    if (baseBranchId) {
      branchIds.push(baseBranchId)
    }
    if (resolvedRole === 'ADMIN') {
      const rows = await runReviewDbQuery<{ branchId: number }>(
        `
          SELECT
            branch_id AS branchId
          FROM auth_user_branch_access
          WHERE auth_user_id = ?
        `,
        [candidate.userId],
      ).catch(() => [])
      rows.forEach((row) => {
        const branchId = Number(row.branchId)
        if (Number.isFinite(branchId) && branchId > 0 && !branchIds.includes(branchId)) {
          branchIds.push(branchId)
        }
      })
    }

    return {
      session: {
        userId: candidate.userId,
        username: candidate.username,
        displayName: candidate.fullName,
        role: resolvedRole,
        branchId: baseBranchId,
        branchIds,
      },
      source: 'review-db',
    }
  } catch {
    return { session: null, reason: 'unavailable' }
  }
}

export async function authenticateUser(username: string, password: string): Promise<AuthAttemptResult> {
  const reviewAttempt = await authenticateReviewDbUser(username, password)
  if (reviewAttempt.session) {
    return reviewAttempt
  }
  if (reviewAttempt.reason === 'invalid_password' || reviewAttempt.reason === 'inactive') {
    return reviewAttempt
  }

  if (!isBootstrapMockAuthEnabled()) {
    return reviewAttempt
  }

  const mockSession = authenticateMockUser(username, password)
  if (mockSession) {
    return { session: mockSession, source: 'mock' }
  }

  return reviewAttempt.reason === 'unavailable'
    ? { session: null, reason: 'not_found' }
    : reviewAttempt
}

export function createSessionToken(session: AppSession) {
  const payload = Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')
  const signature = signPayload(payload)

  return `${payload}.${signature}`
}

export function parseSessionToken(token: string | undefined | null): AppSession | null {
  if (!token) {
    return null
  }

  const [payload, signature] = token.split('.')
  if (!payload || !signature) {
    return null
  }

  const expectedSignature = signPayload(payload)
  const left = Buffer.from(signature)
  const right = Buffer.from(expectedSignature)

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as AppSession
    if (!parsed?.username || !parsed?.displayName || !parsed?.role) {
      return null
    }

    const branchId = Number(parsed.branchId)
    const normalizedBranchId = Number.isFinite(branchId) && branchId > 0 ? branchId : null
    const normalizedBranchIds = Array.isArray(parsed.branchIds)
      ? parsed.branchIds
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
      : []

    return {
      ...parsed,
      branchId: normalizedBranchId,
      branchIds: normalizedBranchIds.length > 0 ? normalizedBranchIds : normalizedBranchId ? [normalizedBranchId] : [],
    }
  } catch {
    return null
  }
}
