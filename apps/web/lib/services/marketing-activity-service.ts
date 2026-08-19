import type { AppRole } from '@/lib/types'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { mockAuthUsers, type AppSession } from '@/lib/auth-session'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type MarketingActivityRecordRow = {
  id: number
  activityDate: string | Date
  marketingUsername: string
  marketingName: string
  activityText: string | null
  notes: string | null
  areaId: number | null
  areaName: string | null
  areaId2: number | null
  areaName2: string | null
  areaId3: number | null
  areaName3: string | null
  areaId4: number | null
  areaName4: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

type MarketingUserRow = {
  username: string
  fullName: string
}

export type MarketingActivityRecord = {
  id: number
  date: string
  marketingUsername: string
  marketingName: string
  activity: string
  notes: string | null
  areaId: number | null
  areaId2: number | null
  areaId3: number | null
  areaId4: number | null
  area: { name: string } | null
  area2: { name: string } | null
  area3: { name: string } | null
  area4: { name: string } | null
  createdAt: string
  updatedAt: string
}

export type MarketingCoveredAreaOption = {
  id: number
  name: string
}

export type MarketingActivityMutationInput = {
  date?: unknown
  marketingName?: unknown
  activity?: unknown
  notes?: unknown
  areaId?: unknown
  areaId2?: unknown
  areaId3?: unknown
  areaId4?: unknown
}

export type MarketingActivityImportRowError = {
  row: number
  errors: string[]
}

export type MarketingActivityImportResult = {
  successCount: number
  errorCount: number
  totalCount: number
  rowErrors: MarketingActivityImportRowError[]
}

function toIsoDate(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(parsed.getTime())) {
    return ''
  }
  return parsed.toISOString().slice(0, 10)
}

function toIsoDateTime(value: string | Date) {
  const parsed = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(parsed.getTime())) {
    return ''
  }
  return parsed.toISOString()
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim()
}

function normalizeOptionalText(value: unknown) {
  const normalized = normalizeText(value)
  return normalized || null
}

function normalizeOptionalInt(value: unknown) {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function dedupeAreaIds(values: Array<number | null>) {
  const seen = new Set<number>()
  return values.map((value) => {
    if (value == null) return null
    if (seen.has(value)) return null
    seen.add(value)
    return value
  })
}

function buildMockMarketingUsers() {
  return mockAuthUsers
    .filter((user) => user.role === 'SALES_MARKETING')
    .map((user) => ({
      username: user.username,
      fullName: user.displayName,
    }))
}

function resolveReadScopeRole(role: AppRole) {
  return role === 'PENJUALAN' || role === 'SALES_MARKETING' || role === 'SUPER_ADMIN' || role === 'CS_ADMIN' || role === 'DIGITAL_CREATOR'
}

export function canMutateMarketingActivities(role: AppRole) {
  return role === 'SUPER_ADMIN' || role === 'SALES_MARKETING' || role === 'PENJUALAN'
}

export async function ensureMarketingActivitiesTable() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS sales_marketing_activities (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        activity_date DATE NOT NULL,
        marketing_username VARCHAR(120) NOT NULL,
        marketing_name VARCHAR(150) NOT NULL,
        area_id BIGINT UNSIGNED NULL,
        area_id_2 BIGINT UNSIGNED NULL,
        area_id_3 BIGINT UNSIGNED NULL,
        area_id_4 BIGINT UNSIGNED NULL,
        activity_text TEXT NULL,
        notes TEXT NULL,
        created_by_username VARCHAR(120) NOT NULL,
        updated_by_username VARCHAR(120) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_sales_marketing_activities_date (activity_date, marketing_username),
        KEY idx_sales_marketing_activities_marketing (marketing_username, activity_date),
        CONSTRAINT fk_sales_marketing_activities_area_1 FOREIGN KEY (area_id) REFERENCES sales_covered_areas(id),
        CONSTRAINT fk_sales_marketing_activities_area_2 FOREIGN KEY (area_id_2) REFERENCES sales_covered_areas(id),
        CONSTRAINT fk_sales_marketing_activities_area_3 FOREIGN KEY (area_id_3) REFERENCES sales_covered_areas(id),
        CONSTRAINT fk_sales_marketing_activities_area_4 FOREIGN KEY (area_id_4) REFERENCES sales_covered_areas(id)
      )
    `,
  )
}

export async function getMarketingCoveredAreaOptions() {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return [] as MarketingCoveredAreaOption[]
  }

  const rows = await runReviewDbQuery<MarketingCoveredAreaOption>(
    `
      SELECT
        id,
        area_name AS name
      FROM sales_covered_areas
      ORDER BY area_name ASC
    `,
  )

  return rows
}

export async function getMarketingUserOptions() {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return buildMockMarketingUsers()
  }

  try {
    const rows = await runReviewDbQuery<MarketingUserRow>(
      `
        SELECT
          au.username AS username,
          au.full_name AS fullName
        FROM auth_users au
        JOIN auth_roles ar
          ON ar.id = au.role_id
        WHERE au.status = 'ACTIVE'
          AND UPPER(ar.code) IN ('MARKETING', 'SALES_MARKETING')
        ORDER BY au.full_name ASC, au.username ASC
      `,
    )

    return rows.length ? rows : buildMockMarketingUsers()
  } catch {
    return buildMockMarketingUsers()
  }
}

async function resolveMarketingIdentity(inputName: string) {
  const marketingUsers = await getMarketingUserOptions()
  const normalized = inputName.trim().toLowerCase()
  const matched = marketingUsers.find(
    (item) =>
      item.fullName.trim().toLowerCase() === normalized ||
      item.username.trim().toLowerCase() === normalized,
  )
  return matched ?? null
}

function mapMarketingActivityRow(row: MarketingActivityRecordRow): MarketingActivityRecord {
  return {
    id: row.id,
    date: toIsoDate(row.activityDate),
    marketingUsername: row.marketingUsername,
    marketingName: row.marketingName,
    activity: normalizeText(row.activityText) || '-',
    notes: row.notes,
    areaId: row.areaId,
    areaId2: row.areaId2,
    areaId3: row.areaId3,
    areaId4: row.areaId4,
    area: row.areaName ? { name: row.areaName } : null,
    area2: row.areaName2 ? { name: row.areaName2 } : null,
    area3: row.areaName3 ? { name: row.areaName3 } : null,
    area4: row.areaName4 ? { name: row.areaName4 } : null,
    createdAt: toIsoDateTime(row.createdAt),
    updatedAt: toIsoDateTime(row.updatedAt),
  }
}

export async function getMarketingActivities(params: {
  session: AppSession
  month?: number | null
  year?: number | null
  marketing?: string | null
}) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return [] as MarketingActivityRecord[]
  }

  if (!resolveReadScopeRole(params.session.role)) {
    return [] as MarketingActivityRecord[]
  }

  await ensureMarketingActivitiesTable()

  const month = params.month && params.month >= 1 && params.month <= 12 ? params.month : null
  const year = params.year && params.year >= 2000 ? params.year : null
  const marketing = normalizeText(params.marketing)
  const filters: string[] = []
  const values: unknown[] = []

  if (month && year) {
    filters.push('YEAR(ma.activity_date) = ? AND MONTH(ma.activity_date) = ?')
    values.push(year, month)
  }

  if (params.session.role === 'SALES_MARKETING' || params.session.role === 'PENJUALAN') {
    filters.push('LOWER(ma.marketing_username) = ?')
    values.push(params.session.username.trim().toLowerCase())
  } else if (marketing) {
    filters.push('(LOWER(ma.marketing_name) LIKE ? OR LOWER(ma.marketing_username) LIKE ?)')
    values.push(`%${marketing.toLowerCase()}%`, `%${marketing.toLowerCase()}%`)
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const rows = await runReviewDbQuery<MarketingActivityRecordRow>(
    `
      SELECT
        ma.id AS id,
        ma.activity_date AS activityDate,
        ma.marketing_username AS marketingUsername,
        ma.marketing_name AS marketingName,
        ma.activity_text AS activityText,
        ma.notes AS notes,
        ma.area_id AS areaId,
        area1.area_name AS areaName,
        ma.area_id_2 AS areaId2,
        area2.area_name AS areaName2,
        ma.area_id_3 AS areaId3,
        area3.area_name AS areaName3,
        ma.area_id_4 AS areaId4,
        area4.area_name AS areaName4,
        ma.created_at AS createdAt,
        ma.updated_at AS updatedAt
      FROM sales_marketing_activities ma
      LEFT JOIN sales_covered_areas area1
        ON area1.id = ma.area_id
      LEFT JOIN sales_covered_areas area2
        ON area2.id = ma.area_id_2
      LEFT JOIN sales_covered_areas area3
        ON area3.id = ma.area_id_3
      LEFT JOIN sales_covered_areas area4
        ON area4.id = ma.area_id_4
      ${whereClause}
      ORDER BY ma.activity_date DESC, ma.marketing_name ASC, ma.id DESC
    `,
    values,
  )

  return rows.map(mapMarketingActivityRow)
}

async function getMarketingActivityById(id: number) {
  const rows = await runReviewDbQuery<MarketingActivityRecordRow>(
    `
      SELECT
        ma.id AS id,
        ma.activity_date AS activityDate,
        ma.marketing_username AS marketingUsername,
        ma.marketing_name AS marketingName,
        ma.activity_text AS activityText,
        ma.notes AS notes,
        ma.area_id AS areaId,
        area1.area_name AS areaName,
        ma.area_id_2 AS areaId2,
        area2.area_name AS areaName2,
        ma.area_id_3 AS areaId3,
        area3.area_name AS areaName3,
        ma.area_id_4 AS areaId4,
        area4.area_name AS areaName4,
        ma.created_at AS createdAt,
        ma.updated_at AS updatedAt
      FROM sales_marketing_activities ma
      LEFT JOIN sales_covered_areas area1
        ON area1.id = ma.area_id
      LEFT JOIN sales_covered_areas area2
        ON area2.id = ma.area_id_2
      LEFT JOIN sales_covered_areas area3
        ON area3.id = ma.area_id_3
      LEFT JOIN sales_covered_areas area4
        ON area4.id = ma.area_id_4
      WHERE ma.id = ?
      LIMIT 1
    `,
    [id],
  )

  return rows[0] ? mapMarketingActivityRow(rows[0]) : null
}

function assertWriteReady() {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    throw new Error('Write action Aktivitas Marketing hanya aktif saat review DB benar-benar tersedia.')
  }
}

function assertCanMutate(session: AppSession) {
  if (!canMutateMarketingActivities(session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah Aktivitas Marketing.')
  }
}

async function validateAreaIds(areaIds: Array<number | null>) {
  const filtered = areaIds.filter((item): item is number => item != null)
  if (!filtered.length) {
    return
  }
  const placeholders = filtered.map(() => '?').join(', ')
  const rows = await runReviewDbQuery<{ id: number }>(
    `
      SELECT id
      FROM sales_covered_areas
      WHERE id IN (${placeholders})
    `,
    filtered,
  )
  if (rows.length !== filtered.length) {
    throw new Error('Salah satu area coverage yang dipilih tidak ditemukan.')
  }
}

export async function createMarketingActivity(params: {
  session: AppSession
  payload: MarketingActivityMutationInput
}) {
  assertWriteReady()
  assertCanMutate(params.session)
  await ensureMarketingActivitiesTable()

  const date = normalizeText(params.payload.date)
  if (!date) {
    throw new Error('Tanggal aktivitas wajib diisi.')
  }

  let marketingUsername = params.session.username
  let marketingName = params.session.displayName
  if (params.session.role !== 'SALES_MARKETING' && params.session.role !== 'PENJUALAN') {
    const resolvedMarketing = await resolveMarketingIdentity(normalizeText(params.payload.marketingName))
    if (!resolvedMarketing) {
      throw new Error('Marketing harus dipilih dari user marketing yang valid.')
    }
    marketingUsername = resolvedMarketing.username
    marketingName = resolvedMarketing.fullName
  }

  const areaIds = dedupeAreaIds([
    normalizeOptionalInt(params.payload.areaId),
    normalizeOptionalInt(params.payload.areaId2),
    normalizeOptionalInt(params.payload.areaId3),
    normalizeOptionalInt(params.payload.areaId4),
  ])
  await validateAreaIds(areaIds)

  const activity = normalizeText(params.payload.activity) || '-'
  const notes = normalizeOptionalText(params.payload.notes)
  const result = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO sales_marketing_activities (
        activity_date,
        marketing_username,
        marketing_name,
        area_id,
        area_id_2,
        area_id_3,
        area_id_4,
        activity_text,
        notes,
        created_by_username,
        updated_by_username
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      date,
      marketingUsername,
      marketingName,
      areaIds[0],
      areaIds[1],
      areaIds[2],
      areaIds[3],
      activity,
      notes,
      params.session.username,
      params.session.username,
    ],
  )

  const insertedId = Number(result.insertId ?? 0)
  return insertedId > 0 ? getMarketingActivityById(insertedId) : null
}

export async function updateMarketingActivity(params: {
  id: number
  session: AppSession
  payload: MarketingActivityMutationInput
}) {
  assertWriteReady()
  assertCanMutate(params.session)
  await ensureMarketingActivitiesTable()

  const existing = await getMarketingActivityById(params.id)
  if (!existing) {
    throw new Error('Aktivitas marketing tidak ditemukan.')
  }
  if (
    (params.session.role === 'SALES_MARKETING' || params.session.role === 'PENJUALAN') &&
    existing.marketingUsername !== params.session.username
  ) {
    throw new Error('Anda hanya bisa mengubah aktivitas milik sendiri.')
  }

  const date = normalizeText(params.payload.date)
  if (!date) {
    throw new Error('Tanggal aktivitas wajib diisi.')
  }

  let marketingUsername = existing.marketingUsername
  let marketingName = existing.marketingName
  if (params.session.role !== 'SALES_MARKETING' && params.session.role !== 'PENJUALAN') {
    const resolvedMarketing = await resolveMarketingIdentity(normalizeText(params.payload.marketingName))
    if (!resolvedMarketing) {
      throw new Error('Marketing harus dipilih dari user marketing yang valid.')
    }
    marketingUsername = resolvedMarketing.username
    marketingName = resolvedMarketing.fullName
  }

  const areaIds = dedupeAreaIds([
    normalizeOptionalInt(params.payload.areaId),
    normalizeOptionalInt(params.payload.areaId2),
    normalizeOptionalInt(params.payload.areaId3),
    normalizeOptionalInt(params.payload.areaId4),
  ])
  await validateAreaIds(areaIds)

  const activity = normalizeText(params.payload.activity) || '-'
  const notes = normalizeOptionalText(params.payload.notes)

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE sales_marketing_activities
      SET
        activity_date = ?,
        marketing_username = ?,
        marketing_name = ?,
        area_id = ?,
        area_id_2 = ?,
        area_id_3 = ?,
        area_id_4 = ?,
        activity_text = ?,
        notes = ?,
        updated_by_username = ?
      WHERE id = ?
    `,
    [
      date,
      marketingUsername,
      marketingName,
      areaIds[0],
      areaIds[1],
      areaIds[2],
      areaIds[3],
      activity,
      notes,
      params.session.username,
      params.id,
    ],
  )

  return getMarketingActivityById(params.id)
}

export async function deleteMarketingActivity(params: { id: number; session: AppSession }) {
  assertWriteReady()
  assertCanMutate(params.session)
  await ensureMarketingActivitiesTable()

  const existing = await getMarketingActivityById(params.id)
  if (!existing) {
    throw new Error('Aktivitas marketing tidak ditemukan.')
  }
  if (
    (params.session.role === 'SALES_MARKETING' || params.session.role === 'PENJUALAN') &&
    existing.marketingUsername !== params.session.username
  ) {
    throw new Error('Anda hanya bisa menghapus aktivitas milik sendiri.')
  }

  await runReviewDbExecute<ExecuteResult>(
    `
      DELETE FROM sales_marketing_activities
      WHERE id = ?
      LIMIT 1
    `,
    [params.id],
  )
}

export function getMarketingActivityErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  return getReviewDbErrorDetail(error)
}

function validateAndNormalizeBatchRow(
  rawRow: unknown,
  rowNumber: number,
  marketingUserOptions: Array<{ username: string; fullName: string }>,
  areaOptions: MarketingCoveredAreaOption[],
  sessionRole: AppSession['role'],
  sessionDisplayName: string,
  sessionUsername: string,
): { valid: MarketingActivityMutationInput | null; errors: string[] } {
  const errors: string[] = []
  const record = (rawRow ?? {}) as Record<string, unknown>

  const dateRaw = record['Tanggal'] ?? record['date'] ?? record['Date'] ?? record['tanggal']
  const marketingRaw = record['Marketing'] ?? record['marketing'] ?? record['marketingName'] ?? record['Nama Marketing']
  const area1Raw = record['Area 1'] ?? record['area1'] ?? record['Area'] ?? record['area'] ?? record['areaId']
  const area2Raw = record['Area 2'] ?? record['area2'] ?? record['areaId2']
  const area3Raw = record['Area 3'] ?? record['area3'] ?? record['areaId3']
  const area4Raw = record['Area 4'] ?? record['area4'] ?? record['areaId4']
  const activityRaw = record['Aktivitas'] ?? record['activity'] ?? record['Kegiatan']
  const notesRaw = record['Keterangan'] ?? record['notes'] ?? record['catatan'] ?? record['Note']

  const dateValue = toIsoDate(String(dateRaw ?? ''))
  if (!dateValue) {
    errors.push('Tanggal tidak valid (format: YYYY-MM-DD atau DD/MM/YYYY).')
  }

  let marketingUsername = sessionUsername
  let marketingName = sessionDisplayName
  if (sessionRole !== 'SALES_MARKETING' && sessionRole !== 'PENJUALAN') {
    const marketingLookup = String(marketingRaw ?? '').trim().toLowerCase()
    if (!marketingLookup) {
      errors.push('Kolom Marketing wajib diisi untuk import lintas marketing.')
    } else {
      const matched = marketingUserOptions.find(
        (item) =>
          item.fullName.trim().toLowerCase() === marketingLookup ||
          item.username.trim().toLowerCase() === marketingLookup,
      )
      if (matched) {
        marketingUsername = matched.username
        marketingName = matched.fullName
      } else {
        errors.push(`Marketing "${String(marketingRaw).trim()}" tidak ditemukan di daftar user marketing.`)
      }
    }
  }

  const areaNameToIdMap = new Map(areaOptions.map((item) => [item.name.trim().toLowerCase(), item.id]))
  function resolveAreaId(value: unknown): number | '' {
    if (value === null || value === undefined) return ''
    const stringValue = String(value).trim()
    if (!stringValue || stringValue === '-') return ''
    const numeric = Number(stringValue)
    if (Number.isInteger(numeric) && numeric > 0 && areaOptions.some((item) => item.id === numeric)) {
      return numeric
    }
    const lookupId = areaNameToIdMap.get(stringValue.toLowerCase())
    return lookupId ?? ''
  }

  const areaId1 = resolveAreaId(area1Raw)
  const areaId2 = resolveAreaId(area2Raw)
  const areaId3 = resolveAreaId(area3Raw)
  const areaId4 = resolveAreaId(area4Raw)
  const areaIdsWithValues = [areaId1, areaId2, areaId3, areaId4].filter((value) => value !== '') as number[]
  const uniqueAreaIds = Array.from(new Set(areaIdsWithValues))
  if (areaIdsWithValues.length !== uniqueAreaIds.length) {
    errors.push('Area 1 s/d Area 4 tidak boleh ada duplikat dalam satu baris.')
  }
  void rowNumber
  return {
    valid: errors.length === 0 ? {
      date: dateValue,
      marketingName,
      activity: activityRaw,
      notes: notesRaw,
      areaId: areaId1 || undefined,
      areaId2: areaId2 || undefined,
      areaId3: areaId3 || undefined,
      areaId4: areaId4 || undefined,
    } : null,
    errors,
  }
}

export async function batchCreateMarketingActivities(params: {
  session: AppSession
  rows: unknown[]
}): Promise<MarketingActivityImportResult> {
  assertWriteReady()
  assertCanMutate(params.session)
  await ensureMarketingActivitiesTable()

  const marketingOptions = await getMarketingUserOptions()
  const areaOptions = await getMarketingCoveredAreaOptions()

  const rowErrors: MarketingActivityImportRowError[] = []
  const validPayloads: MarketingActivityMutationInput[] = []

  params.rows.forEach((rawRow, zeroIndex) => {
    const rowNumber = zeroIndex + 2
    const { valid, errors } = validateAndNormalizeBatchRow(
      rawRow,
      rowNumber,
      marketingOptions,
      areaOptions,
      params.session.role,
      params.session.displayName,
      params.session.username,
    )
    if (errors.length) {
      rowErrors.push({ row: rowNumber, errors })
    } else if (valid) {
      validPayloads.push(valid)
    }
  })

  let successCount = 0
  if (validPayloads.length) {
    const isSelfScopedRole = params.session.role === 'SALES_MARKETING' || params.session.role === 'PENJUALAN'
    const baseMarketingUsername = params.session.username
    const baseMarketingName = params.session.displayName
    const userMap = new Map(marketingOptions.map((item) => [item.fullName.trim().toLowerCase(), { username: item.username, fullName: item.fullName }]))
    const allUniqueAreaIds = Array.from(
      new Set(
        validPayloads.flatMap((payload) =>
          [payload.areaId, payload.areaId2, payload.areaId3, payload.areaId4]
            .filter((value): value is number => typeof value === 'number' && value > 0),
        ),
      ),
    )
    if (allUniqueAreaIds.length) {
      await validateAreaIds([...allUniqueAreaIds])
    }
    const insertPlaceholders: string[] = []
    const insertValues: unknown[] = []
    for (const payload of validPayloads) {
      const date = normalizeText(payload.date)
      let marketingUsername = baseMarketingUsername
      let marketingName = baseMarketingName
      if (!isSelfScopedRole) {
        const resolved = userMap.get(normalizeText(payload.marketingName).toLowerCase())
        if (resolved) {
          marketingUsername = resolved.username
          marketingName = resolved.fullName
        }
      }
      const areaIds = dedupeAreaIds([
        normalizeOptionalInt(payload.areaId),
        normalizeOptionalInt(payload.areaId2),
        normalizeOptionalInt(payload.areaId3),
        normalizeOptionalInt(payload.areaId4),
      ])
      const activity = normalizeText(payload.activity) || '-'
      const notes = normalizeOptionalText(payload.notes)
      insertPlaceholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      insertValues.push(
        date,
        marketingUsername,
        marketingName,
        areaIds[0],
        areaIds[1],
        areaIds[2],
        areaIds[3],
        activity,
        notes,
        params.session.username,
        params.session.username,
      )
    }

    if (insertPlaceholders.length) {
      const result = await runReviewDbExecute<ExecuteResult>(
        `
          INSERT INTO sales_marketing_activities (
            activity_date,
            marketing_username,
            marketing_name,
            area_id,
            area_id_2,
            area_id_3,
            area_id_4,
            activity_text,
            notes,
            created_by_username,
            updated_by_username
          )
          VALUES ${insertPlaceholders.join(', ')}
        `,
        insertValues,
      )
      successCount = Number(result.affectedRows ?? 0)
    }
  }

  return {
    successCount,
    errorCount: rowErrors.length,
    totalCount: params.rows.length,
    rowErrors,
  }
}
