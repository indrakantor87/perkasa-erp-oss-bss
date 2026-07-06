import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import type { AppRole } from '@/lib/types'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { runReviewDbQuery } from '@/lib/review-db'

export type AppSession = {
  username: string
  displayName: string
  role: AppRole
}

type MockAuthUser = AppSession & {
  password: string
}

type ReviewAuthUserRow = {
  username: string
  fullName: string
  roleCode: string
  passwordHash: string
  status: string
}

type AuthAttemptResult =
  | { session: AppSession; source: 'review-db' | 'mock' }
  | { session: null; reason: 'not_found' | 'invalid_password' | 'inactive' | 'unavailable' }

const DEFAULT_AUTH_SECRET = 'perkasa-erp-oss-bss-dev-secret'

export const mockAuthUsers: MockAuthUser[] = [
  {
    username: 'admin.perkasa',
    password: 'Perkasa123!',
    displayName: 'Super Admin Perkasa',
    role: 'SUPER_ADMIN',
  },
  {
    username: 'cs.review',
    password: 'CsReview123!',
    displayName: 'Admin CS Review',
    role: 'ADMIN_DIVISI',
  },
  {
    username: 'support.ops',
    password: 'SupportOps123!',
    displayName: 'Operator Support',
    role: 'OPERATOR',
  },
]

function getAuthSecret() {
  return process.env.AUTH_SESSION_SECRET || DEFAULT_AUTH_SECRET
}

function signPayload(payload: string) {
  return createHmac('sha256', getAuthSecret()).update(payload).digest('hex')
}

function mapReviewRoleToAppRole(roleCode: string): AppRole {
  const normalized = roleCode.trim().toUpperCase()
  if (normalized === 'SUPER_ADMIN') return 'SUPER_ADMIN'
  if (['OPERATOR', 'SUPPORT_OPS', 'SUPPORT_OPERATOR'].includes(normalized)) return 'OPERATOR'
  return 'ADMIN_DIVISI'
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
  const candidate = mockAuthUsers.find(
    (user) => user.username === normalizedUsername && user.password === password
  )

  if (!candidate) {
    return null
  }

  return {
    username: candidate.username,
    displayName: candidate.displayName,
    role: candidate.role,
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
          au.username AS username,
          au.full_name AS fullName,
          ar.code AS roleCode,
          au.password_hash AS passwordHash,
          au.status AS status
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

    return {
      session: {
        username: candidate.username,
        displayName: candidate.fullName,
        role: mapReviewRoleToAppRole(candidate.roleCode),
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

    return parsed
  } catch {
    return null
  }
}
