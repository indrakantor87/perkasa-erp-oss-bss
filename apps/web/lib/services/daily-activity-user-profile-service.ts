import {
  DAILY_ACTIVITY_PLANNING_LEVELS,
  isValidDailyActivityDivision,
  isValidDailyActivityPlanningLevel,
  isValidDailyActivitySubdivision,
  resolveDefaultDailyActivitySubdivision,
} from '@/lib/daily-activity-org'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getRoleMeta } from '@/lib/role-meta'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import type { AppSession } from '@/lib/auth-session'

type ExecuteResult = {
  affectedRows?: number
  insertId?: number
}

type ProfileRow = {
  id: number
  username: string
  divisionName: string | null
  subdivisionName: string | null
  planningLevel: string
  updatedAt: string | null
}

export type DailyActivityUserProfile = {
  id: string
  username: string
  divisionName: string
  subdivisionName: string
  planningLevel: string
  updatedAt: string
}

let dailyActivityUserProfileInitPromise: Promise<void> | null = null

export async function ensureDailyActivityUserProfileTable() {
  if (!dailyActivityUserProfileInitPromise) {
    dailyActivityUserProfileInitPromise = (async () => {
      await runReviewDbExecute<ExecuteResult>(
        `
          CREATE TABLE IF NOT EXISTS daily_activity_user_profiles (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            username VARCHAR(120) NOT NULL,
            division_name VARCHAR(120) NULL,
            subdivision_name VARCHAR(150) NULL,
            planning_level VARCHAR(20) NOT NULL DEFAULT 'LEADER',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY uq_daily_activity_user_profiles_username (username),
            KEY idx_daily_activity_user_profiles_scope (division_name, subdivision_name, planning_level)
          )
        `,
      )
    })()
  }

  await dailyActivityUserProfileInitPromise
}

function mapProfileRow(row: ProfileRow): DailyActivityUserProfile {
  const divisionName = String(row.divisionName ?? '').trim()
  const subdivisionName = String(row.subdivisionName ?? '').trim()
  const planningLevel = String(row.planningLevel ?? '').trim().toUpperCase()
  const updatedAt = String(row.updatedAt ?? '').trim()

  return {
    id: String(row.id),
    username: row.username,
    divisionName,
    subdivisionName,
    planningLevel,
    updatedAt,
  }
}

export async function getDailyActivityUserProfiles() {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return []
  }

  try {
    await ensureDailyActivityUserProfileTable()
    const rows = await runReviewDbQuery<ProfileRow>(
      `
        SELECT
          id,
          username AS username,
          division_name AS divisionName,
          subdivision_name AS subdivisionName,
          planning_level AS planningLevel,
          DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
        FROM daily_activity_user_profiles
        ORDER BY username ASC, id ASC
      `,
    )
    return rows.map(mapProfileRow)
  } catch {
    return []
  }
}

export async function getDailyActivityUserProfile(username: string) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return null
  }

  try {
    await ensureDailyActivityUserProfileTable()
    const [row] = await runReviewDbQuery<ProfileRow>(
      `
        SELECT
          id,
          username AS username,
          division_name AS divisionName,
          subdivision_name AS subdivisionName,
          planning_level AS planningLevel,
          DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
        FROM daily_activity_user_profiles
        WHERE username = ?
        LIMIT 1
      `,
      [username],
    )

    return row ? mapProfileRow(row) : null
  } catch {
    return null
  }
}

export async function resolveDailyActivityOrgContext(session: AppSession) {
  const roleMeta = getRoleMeta(session.role)
  const divisionOptions = roleMeta.division ? [roleMeta.division] : []
  const fallbackDivision = divisionOptions[0] ?? 'Teknisi'
  const fallbackSubdivision = resolveDefaultDailyActivitySubdivision(fallbackDivision, roleMeta.subdivision)

  const profile = await getDailyActivityUserProfile(session.username)
  const rawDivision = String(profile?.divisionName ?? '').trim()
  const rawSubdivision = String(profile?.subdivisionName ?? '').trim()
  const rawPlanningLevel = String(profile?.planningLevel ?? '').trim().toUpperCase()

  const divisionName = isValidDailyActivityDivision(rawDivision) ? rawDivision : fallbackDivision
  const subdivisionName = isValidDailyActivitySubdivision(divisionName, rawSubdivision)
    ? rawSubdivision
    : resolveDefaultDailyActivitySubdivision(divisionName, fallbackSubdivision)
  const planningLevel = isValidDailyActivityPlanningLevel(rawPlanningLevel) ? rawPlanningLevel : 'LEADER'

  return {
    divisionName,
    subdivisionName,
    planningLevel,
  }
}

export async function upsertDailyActivityUserProfile(params: {
  username: string
  divisionName: string
  subdivisionName: string
  planningLevel: string
}) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    throw new Error('Mode review database belum aktif.')
  }

  const username = params.username.trim()
  const divisionName = params.divisionName.trim()
  const subdivisionName = params.subdivisionName.trim()
  const planningLevel = params.planningLevel.trim().toUpperCase()

  if (!username) {
    throw new Error('Username wajib diisi.')
  }
  if (!isValidDailyActivityDivision(divisionName)) {
    throw new Error('Divisi daily activity tidak valid.')
  }
  if (!isValidDailyActivitySubdivision(divisionName, subdivisionName)) {
    throw new Error('Sub-divisi daily activity tidak valid.')
  }
  if (!isValidDailyActivityPlanningLevel(planningLevel)) {
    throw new Error('Level daily activity tidak valid.')
  }

  await ensureDailyActivityUserProfileTable()

  const [exists] = await runReviewDbQuery<{ total: number }>(
    `
      SELECT COUNT(*) AS total
      FROM auth_users
      WHERE username = ?
      LIMIT 1
    `,
    [username],
  )

  if (Number(exists?.total ?? 0) === 0) {
    throw new Error('Username tidak ditemukan pada auth users.')
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO daily_activity_user_profiles (username, division_name, subdivision_name, planning_level)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        division_name = VALUES(division_name),
        subdivision_name = VALUES(subdivision_name),
        planning_level = VALUES(planning_level),
        updated_at = CURRENT_TIMESTAMP
    `,
    [username, divisionName, subdivisionName || null, planningLevel],
  )
}

export function getDailyActivityUserProfileErrorDetail(error: unknown) {
  return getReviewDbErrorDetail(error)
}
