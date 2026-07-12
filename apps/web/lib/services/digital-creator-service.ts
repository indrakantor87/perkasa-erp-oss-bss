import type { AppRole } from '@/lib/types'
import { getDataSourceSnapshot } from '@/lib/data-source'
import type { AppSession } from '@/lib/auth-session'
import { getReviewDbErrorDetail, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

type CampaignRow = {
  id: number
  name: string
  description: string | null
  startDate: string | Date
  endDate: string | Date | null
  budget: number | null
  status: string
  objectivesText: string | null
  platformsText: string | null
  createdByUsername: string
  createdByName: string
  createdAt: string | Date
  updatedAt: string | Date
}

type DigitalLeadRow = {
  id: number
  name: string
  phone: string
  email: string | null
  source: string
  campaignId: number | null
  campaignName: string | null
  message: string | null
  status: string
  notes: string | null
  convertedSalesLeadId: number | null
  convertedSalesLeadName: string | null
  createdByUsername: string
  createdByName: string
  createdAt: string | Date
  updatedAt: string | Date
}

type ContentItemRow = {
  id: number
  title: string
  content: string | null
  contentType: string
  platform: string
  status: string
  publishDate: string | Date | null
  notes: string | null
  tagsText: string | null
  createdByUsername: string
  createdByName: string
  createdAt: string | Date
  updatedAt: string | Date
}

type AnalyticsRow = {
  id: number
  contentId: number | null
  contentTitle: string | null
  campaignId: number | null
  campaignName: string | null
  platform: string
  entryDate: string | Date
  reach: number
  impressions: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  followersGain: number
  createdByUsername: string
  createdByName: string
  createdAt: string | Date
  updatedAt: string | Date
}

type NameOptionRow = {
  id: number
  name: string
}

export type DigitalCampaign = {
  id: number
  name: string
  description: string | null
  startDate: string
  endDate: string | null
  budget: number | null
  status: string
  objectives: string[]
  platforms: string[]
  createdBy: {
    username: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

export type DigitalLead = {
  id: number
  name: string
  phone: string
  email: string | null
  source: string
  campaignId: number | null
  campaign: { id: number; name: string } | null
  message: string | null
  status: string
  notes: string | null
  convertedSalesLeadId: number | null
  convertedSalesLead: { id: number; name: string } | null
  createdBy: {
    username: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

export type DigitalContentItem = {
  id: number
  title: string
  content: string | null
  contentType: string
  platform: string
  status: string
  publishDate: string | null
  notes: string | null
  tags: string[]
  createdBy: {
    username: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

export type DigitalAnalyticsEntry = {
  id: number
  contentId: number | null
  content: { id: number; title: string } | null
  campaignId: number | null
  campaign: { id: number; name: string } | null
  platform: string
  date: string
  reach: number
  impressions: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  followersGain: number
  createdBy: {
    username: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

export type DigitalAnalyticsSummary = {
  reach: number
  impressions: number
  likes: number
  comments: number
  shares: number
  saves: number
  clicks: number
  followersGain: number
}

export type DigitalCreatorMutationInput = Record<string, unknown>

export const CAMPAIGN_STATUSES = ['ACTIVE', 'PAUSED', 'COMPLETED'] as const
export const DIGITAL_LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const
export const DIGITAL_SOURCES = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'WEBSITE', 'REFERENSI'] as const
export const CONTENT_TYPES = ['POST', 'REEL', 'VIDEO', 'STORY', 'CAROUSEL'] as const
export const CONTENT_STATUSES = ['DRAFT', 'SCHEDULED', 'PUBLISHED'] as const
export const DIGITAL_PLATFORMS = ['INSTAGRAM', 'FACEBOOK', 'TIKTOK', 'YOUTUBE', 'WEBSITE'] as const

function toIsoDateTime(value: string | Date | null | undefined) {
  if (!value) return ''
  const parsed = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(parsed.getTime())) return ''
  return parsed.toISOString()
}

function toIsoDate(value: string | Date | null | undefined) {
  if (!value) return ''
  const parsed = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
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

function normalizeOptionalDecimal(value: unknown) {
  if (value === '' || value == null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeList(value: unknown, separator = '\n') {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean)
  }
  return normalizeText(value)
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean)
}

function serializeList(values: string[], separator = '\n') {
  return values.map((item) => item.trim()).filter(Boolean).join(separator) || null
}

function assertReviewDbWritable() {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    throw new Error('Write action Digital Creator hanya aktif saat review DB benar-benar tersedia.')
  }
}

function canReadDigitalCreator(role: AppRole) {
  return ['SUPER_ADMIN', 'SALES_MARKETING', 'CS_OPERATOR', 'CS_ADMIN', 'DIGITAL_CREATOR'].includes(role)
}

function canMutateCampaigns(role: AppRole) {
  return role === 'SUPER_ADMIN' || role === 'DIGITAL_CREATOR'
}

function canMutateDigitalLeads(role: AppRole) {
  return role === 'SUPER_ADMIN' || role === 'DIGITAL_CREATOR' || role === 'SALES_MARKETING'
}

function canMutateContent(role: AppRole) {
  return role === 'SUPER_ADMIN' || role === 'DIGITAL_CREATOR'
}

function canMutateAnalytics(role: AppRole) {
  return role === 'SUPER_ADMIN' || role === 'DIGITAL_CREATOR'
}

export async function ensureDigitalCreatorTables() {
  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS sales_campaigns (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(180) NOT NULL,
        description TEXT NULL,
        start_date DATETIME NOT NULL,
        end_date DATETIME NULL,
        budget DECIMAL(15,2) NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
        objectives_text TEXT NULL,
        platforms_text TEXT NULL,
        created_by_username VARCHAR(120) NOT NULL,
        created_by_name VARCHAR(150) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_sales_campaigns_status (status, start_date),
        KEY idx_sales_campaigns_name (name)
      )
    `,
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS sales_digital_leads (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(150) NOT NULL,
        phone VARCHAR(40) NOT NULL,
        email VARCHAR(180) NULL,
        source VARCHAR(40) NOT NULL,
        campaign_id BIGINT UNSIGNED NULL,
        message TEXT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'NEW',
        notes TEXT NULL,
        converted_sales_lead_id BIGINT UNSIGNED NULL,
        created_by_username VARCHAR(120) NOT NULL,
        created_by_name VARCHAR(150) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_sales_digital_leads_status (status, source),
        KEY idx_sales_digital_leads_campaign (campaign_id),
        KEY idx_sales_digital_leads_name (name)
      )
    `,
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS sales_content_calendar (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        title VARCHAR(180) NOT NULL,
        content TEXT NULL,
        content_type VARCHAR(40) NOT NULL,
        platform VARCHAR(40) NOT NULL,
        status VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
        publish_date DATETIME NULL,
        notes TEXT NULL,
        tags_text TEXT NULL,
        created_by_username VARCHAR(120) NOT NULL,
        created_by_name VARCHAR(150) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_sales_content_calendar_status (status, platform),
        KEY idx_sales_content_calendar_publish (publish_date)
      )
    `,
  )

  await runReviewDbExecute<ExecuteResult>(
    `
      CREATE TABLE IF NOT EXISTS sales_content_analytics (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        content_id BIGINT UNSIGNED NULL,
        campaign_id BIGINT UNSIGNED NULL,
        platform VARCHAR(40) NOT NULL,
        entry_date DATE NOT NULL,
        reach INT NOT NULL DEFAULT 0,
        impressions INT NOT NULL DEFAULT 0,
        likes INT NOT NULL DEFAULT 0,
        comments INT NOT NULL DEFAULT 0,
        shares INT NOT NULL DEFAULT 0,
        saves INT NOT NULL DEFAULT 0,
        clicks INT NOT NULL DEFAULT 0,
        followers_gain INT NOT NULL DEFAULT 0,
        created_by_username VARCHAR(120) NOT NULL,
        created_by_name VARCHAR(150) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_sales_content_analytics_date (entry_date, platform),
        KEY idx_sales_content_analytics_campaign (campaign_id),
        KEY idx_sales_content_analytics_content (content_id)
      )
    `,
  )
}

function mapCampaignRow(row: CampaignRow): DigitalCampaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: toIsoDateTime(row.startDate),
    endDate: row.endDate ? toIsoDateTime(row.endDate) : null,
    budget: row.budget == null ? null : Number(row.budget),
    status: row.status,
    objectives: normalizeList(row.objectivesText, '\n'),
    platforms: normalizeList(row.platformsText, ','),
    createdBy: {
      username: row.createdByUsername,
      name: row.createdByName,
    },
    createdAt: toIsoDateTime(row.createdAt),
    updatedAt: toIsoDateTime(row.updatedAt),
  }
}

function mapLeadRow(row: DigitalLeadRow): DigitalLead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    campaignId: row.campaignId,
    campaign: row.campaignId && row.campaignName ? { id: row.campaignId, name: row.campaignName } : null,
    message: row.message,
    status: row.status,
    notes: row.notes,
    convertedSalesLeadId: row.convertedSalesLeadId,
    convertedSalesLead:
      row.convertedSalesLeadId && row.convertedSalesLeadName
        ? { id: row.convertedSalesLeadId, name: row.convertedSalesLeadName }
        : null,
    createdBy: {
      username: row.createdByUsername,
      name: row.createdByName,
    },
    createdAt: toIsoDateTime(row.createdAt),
    updatedAt: toIsoDateTime(row.updatedAt),
  }
}

function mapContentRow(row: ContentItemRow): DigitalContentItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    contentType: row.contentType,
    platform: row.platform,
    status: row.status,
    publishDate: row.publishDate ? toIsoDateTime(row.publishDate) : null,
    notes: row.notes,
    tags: normalizeList(row.tagsText, ','),
    createdBy: {
      username: row.createdByUsername,
      name: row.createdByName,
    },
    createdAt: toIsoDateTime(row.createdAt),
    updatedAt: toIsoDateTime(row.updatedAt),
  }
}

function mapAnalyticsRow(row: AnalyticsRow): DigitalAnalyticsEntry {
  return {
    id: row.id,
    contentId: row.contentId,
    content: row.contentId && row.contentTitle ? { id: row.contentId, title: row.contentTitle } : null,
    campaignId: row.campaignId,
    campaign: row.campaignId && row.campaignName ? { id: row.campaignId, name: row.campaignName } : null,
    platform: row.platform,
    date: toIsoDate(row.entryDate),
    reach: Number(row.reach ?? 0),
    impressions: Number(row.impressions ?? 0),
    likes: Number(row.likes ?? 0),
    comments: Number(row.comments ?? 0),
    shares: Number(row.shares ?? 0),
    saves: Number(row.saves ?? 0),
    clicks: Number(row.clicks ?? 0),
    followersGain: Number(row.followersGain ?? 0),
    createdBy: {
      username: row.createdByUsername,
      name: row.createdByName,
    },
    createdAt: toIsoDateTime(row.createdAt),
    updatedAt: toIsoDateTime(row.updatedAt),
  }
}

async function getSingleNameOption(
  table: string,
  id: number | null,
  field = 'name',
) {
  if (!id) return null
  const rows = await runReviewDbQuery<NameOptionRow>(
    `
      SELECT
        id,
        ${field} AS name
      FROM ${table}
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )
  return rows[0] ?? null
}

async function assertCampaignExists(id: number | null) {
  if (!id) return
  const campaign = await getSingleNameOption('sales_campaigns', id)
  if (!campaign) {
    throw new Error('Campaign yang dipilih tidak ditemukan.')
  }
}

async function assertContentExists(id: number | null) {
  if (!id) return
  const content = await getSingleNameOption('sales_content_calendar', id, 'title')
  if (!content) {
    throw new Error('Konten yang dipilih tidak ditemukan.')
  }
}

async function assertSalesLeadExists(id: number | null) {
  if (!id) return
  const lead = await getSingleNameOption('sales_leads', id, 'customer_name')
  if (!lead) {
    throw new Error('Lead penjualan yang dipilih tidak ditemukan.')
  }
}

export async function getDigitalCreatorOptions() {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return {
      campaigns: [] as NameOptionRow[],
      contentItems: [] as NameOptionRow[],
      salesLeads: [] as NameOptionRow[],
    }
  }

  await ensureDigitalCreatorTables()

  const [campaigns, contentItems, salesLeads] = await Promise.all([
    runReviewDbQuery<NameOptionRow>(
      `
        SELECT id, name
        FROM sales_campaigns
        ORDER BY start_date DESC, id DESC
      `,
    ),
    runReviewDbQuery<NameOptionRow>(
      `
        SELECT id, title AS name
        FROM sales_content_calendar
        ORDER BY COALESCE(publish_date, created_at) DESC, id DESC
      `,
    ),
    runReviewDbQuery<NameOptionRow>(
      `
        SELECT id, customer_name AS name
        FROM sales_leads
        ORDER BY created_at DESC, id DESC
        LIMIT 200
      `,
    ),
  ])

  return { campaigns, contentItems, salesLeads }
}

export async function getCampaigns(params: { session: AppSession; status?: string | null }) {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return [] as DigitalCampaign[]
  }
  if (!canReadDigitalCreator(params.session.role)) {
    return [] as DigitalCampaign[]
  }

  await ensureDigitalCreatorTables()

  const filters: string[] = []
  const values: unknown[] = []
  const status = normalizeText(params.status).toUpperCase()
  if (status && status !== 'ALL') {
    filters.push('status = ?')
    values.push(status)
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const rows = await runReviewDbQuery<CampaignRow>(
    `
      SELECT
        id,
        name,
        description,
        start_date AS startDate,
        end_date AS endDate,
        budget,
        status,
        objectives_text AS objectivesText,
        platforms_text AS platformsText,
        created_by_username AS createdByUsername,
        created_by_name AS createdByName,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM sales_campaigns
      ${whereClause}
      ORDER BY start_date DESC, id DESC
    `,
    values,
  )
  return rows.map(mapCampaignRow)
}

async function getCampaignById(id: number) {
  const rows = await runReviewDbQuery<CampaignRow>(
    `
      SELECT
        id,
        name,
        description,
        start_date AS startDate,
        end_date AS endDate,
        budget,
        status,
        objectives_text AS objectivesText,
        platforms_text AS platformsText,
        created_by_username AS createdByUsername,
        created_by_name AS createdByName,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM sales_campaigns
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )
  return rows[0] ? mapCampaignRow(rows[0]) : null
}

export async function createCampaign(params: { session: AppSession; payload: DigitalCreatorMutationInput }) {
  assertReviewDbWritable()
  if (!canMutateCampaigns(params.session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah campaign digital.')
  }
  await ensureDigitalCreatorTables()

  const name = normalizeText(params.payload.name)
  if (!name) throw new Error('Nama campaign wajib diisi.')

  const startDate = normalizeText(params.payload.startDate)
  if (!startDate) throw new Error('Tanggal mulai campaign wajib diisi.')

  const status = normalizeText(params.payload.status).toUpperCase()
  if (!CAMPAIGN_STATUSES.includes(status as (typeof CAMPAIGN_STATUSES)[number])) {
    throw new Error('Status campaign tidak valid.')
  }

  const objectives = normalizeList(params.payload.objectives, '\n')
  const platforms = normalizeList(params.payload.platforms, ',').map((item) => item.toUpperCase())
  if (platforms.some((item) => !DIGITAL_PLATFORMS.includes(item as (typeof DIGITAL_PLATFORMS)[number]))) {
    throw new Error('Platform campaign tidak valid.')
  }

  const result = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO sales_campaigns (
        name,
        description,
        start_date,
        end_date,
        budget,
        status,
        objectives_text,
        platforms_text,
        created_by_username,
        created_by_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      name,
      normalizeOptionalText(params.payload.description),
      startDate,
      normalizeOptionalText(params.payload.endDate),
      normalizeOptionalDecimal(params.payload.budget),
      status,
      serializeList(objectives, '\n'),
      serializeList(platforms, ','),
      params.session.username,
      params.session.displayName,
    ],
  )

  return getCampaignById(Number(result.insertId ?? 0))
}

export async function updateCampaign(params: {
  id: number
  session: AppSession
  payload: DigitalCreatorMutationInput
}) {
  assertReviewDbWritable()
  if (!canMutateCampaigns(params.session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah campaign digital.')
  }
  await ensureDigitalCreatorTables()

  const current = await getCampaignById(params.id)
  if (!current) throw new Error('Campaign tidak ditemukan.')

  const name = normalizeText(params.payload.name)
  if (!name) throw new Error('Nama campaign wajib diisi.')

  const startDate = normalizeText(params.payload.startDate)
  if (!startDate) throw new Error('Tanggal mulai campaign wajib diisi.')

  const status = normalizeText(params.payload.status).toUpperCase()
  if (!CAMPAIGN_STATUSES.includes(status as (typeof CAMPAIGN_STATUSES)[number])) {
    throw new Error('Status campaign tidak valid.')
  }

  const objectives = normalizeList(params.payload.objectives, '\n')
  const platforms = normalizeList(params.payload.platforms, ',').map((item) => item.toUpperCase())

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE sales_campaigns
      SET
        name = ?,
        description = ?,
        start_date = ?,
        end_date = ?,
        budget = ?,
        status = ?,
        objectives_text = ?,
        platforms_text = ?
      WHERE id = ?
    `,
    [
      name,
      normalizeOptionalText(params.payload.description),
      startDate,
      normalizeOptionalText(params.payload.endDate),
      normalizeOptionalDecimal(params.payload.budget),
      status,
      serializeList(objectives, '\n'),
      serializeList(platforms, ','),
      params.id,
    ],
  )

  return getCampaignById(params.id)
}

export async function deleteCampaign(params: { id: number; session: AppSession }) {
  assertReviewDbWritable()
  if (!canMutateCampaigns(params.session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah campaign digital.')
  }
  await ensureDigitalCreatorTables()
  await runReviewDbExecute<ExecuteResult>(`DELETE FROM sales_campaigns WHERE id = ? LIMIT 1`, [params.id])
}

export async function getDigitalLeads(params: {
  session: AppSession
  status?: string | null
  source?: string | null
}) {
  const sourceState = getDataSourceSnapshot()
  if (sourceState.effectiveMode !== 'review-db' || sourceState.isFallback) {
    return [] as DigitalLead[]
  }
  if (!canReadDigitalCreator(params.session.role)) {
    return [] as DigitalLead[]
  }

  await ensureDigitalCreatorTables()

  const filters: string[] = []
  const values: unknown[] = []
  const status = normalizeText(params.status).toUpperCase()
  const source = normalizeText(params.source).toUpperCase()
  if (status && status !== 'ALL') {
    filters.push('dl.status = ?')
    values.push(status)
  }
  if (source && source !== 'ALL') {
    filters.push('dl.source = ?')
    values.push(source)
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const rows = await runReviewDbQuery<DigitalLeadRow>(
    `
      SELECT
        dl.id AS id,
        dl.name AS name,
        dl.phone AS phone,
        dl.email AS email,
        dl.source AS source,
        dl.campaign_id AS campaignId,
        sc.name AS campaignName,
        dl.message AS message,
        dl.status AS status,
        dl.notes AS notes,
        dl.converted_sales_lead_id AS convertedSalesLeadId,
        sl.customer_name AS convertedSalesLeadName,
        dl.created_by_username AS createdByUsername,
        dl.created_by_name AS createdByName,
        dl.created_at AS createdAt,
        dl.updated_at AS updatedAt
      FROM sales_digital_leads dl
      LEFT JOIN sales_campaigns sc
        ON sc.id = dl.campaign_id
      LEFT JOIN sales_leads sl
        ON sl.id = dl.converted_sales_lead_id
      ${whereClause}
      ORDER BY dl.created_at DESC, dl.id DESC
    `,
    values,
  )
  return rows.map(mapLeadRow)
}

async function getDigitalLeadById(id: number) {
  const rows = await runReviewDbQuery<DigitalLeadRow>(
    `
      SELECT
        dl.id AS id,
        dl.name AS name,
        dl.phone AS phone,
        dl.email AS email,
        dl.source AS source,
        dl.campaign_id AS campaignId,
        sc.name AS campaignName,
        dl.message AS message,
        dl.status AS status,
        dl.notes AS notes,
        dl.converted_sales_lead_id AS convertedSalesLeadId,
        sl.customer_name AS convertedSalesLeadName,
        dl.created_by_username AS createdByUsername,
        dl.created_by_name AS createdByName,
        dl.created_at AS createdAt,
        dl.updated_at AS updatedAt
      FROM sales_digital_leads dl
      LEFT JOIN sales_campaigns sc
        ON sc.id = dl.campaign_id
      LEFT JOIN sales_leads sl
        ON sl.id = dl.converted_sales_lead_id
      WHERE dl.id = ?
      LIMIT 1
    `,
    [id],
  )
  return rows[0] ? mapLeadRow(rows[0]) : null
}

export async function createDigitalLead(params: { session: AppSession; payload: DigitalCreatorMutationInput }) {
  assertReviewDbWritable()
  if (!canMutateDigitalLeads(params.session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah digital lead.')
  }
  await ensureDigitalCreatorTables()

  const name = normalizeText(params.payload.name)
  const phone = normalizeText(params.payload.phone)
  const source = normalizeText(params.payload.source).toUpperCase()
  const status = normalizeText(params.payload.status).toUpperCase()

  if (!name) throw new Error('Nama lead wajib diisi.')
  if (!phone) throw new Error('Nomor telepon lead wajib diisi.')
  if (!DIGITAL_SOURCES.includes(source as (typeof DIGITAL_SOURCES)[number])) {
    throw new Error('Sumber lead tidak valid.')
  }
  if (!DIGITAL_LEAD_STATUSES.includes(status as (typeof DIGITAL_LEAD_STATUSES)[number])) {
    throw new Error('Status lead tidak valid.')
  }

  const campaignId = normalizeOptionalInt(params.payload.campaignId)
  const convertedSalesLeadId = normalizeOptionalInt(params.payload.convertedSalesLeadId)
  await assertCampaignExists(campaignId)
  await assertSalesLeadExists(convertedSalesLeadId)

  const result = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO sales_digital_leads (
        name,
        phone,
        email,
        source,
        campaign_id,
        message,
        status,
        notes,
        converted_sales_lead_id,
        created_by_username,
        created_by_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      name,
      phone,
      normalizeOptionalText(params.payload.email),
      source,
      campaignId,
      normalizeOptionalText(params.payload.message),
      status,
      normalizeOptionalText(params.payload.notes),
      convertedSalesLeadId,
      params.session.username,
      params.session.displayName,
    ],
  )

  return getDigitalLeadById(Number(result.insertId ?? 0))
}

export async function updateDigitalLead(params: {
  id: number
  session: AppSession
  payload: DigitalCreatorMutationInput
}) {
  assertReviewDbWritable()
  if (!canMutateDigitalLeads(params.session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah digital lead.')
  }
  await ensureDigitalCreatorTables()

  const current = await getDigitalLeadById(params.id)
  if (!current) throw new Error('Digital lead tidak ditemukan.')

  const name = normalizeText(params.payload.name)
  const phone = normalizeText(params.payload.phone)
  const source = normalizeText(params.payload.source).toUpperCase()
  const status = normalizeText(params.payload.status).toUpperCase()

  if (!name) throw new Error('Nama lead wajib diisi.')
  if (!phone) throw new Error('Nomor telepon lead wajib diisi.')
  if (!DIGITAL_SOURCES.includes(source as (typeof DIGITAL_SOURCES)[number])) {
    throw new Error('Sumber lead tidak valid.')
  }
  if (!DIGITAL_LEAD_STATUSES.includes(status as (typeof DIGITAL_LEAD_STATUSES)[number])) {
    throw new Error('Status lead tidak valid.')
  }

  const campaignId = normalizeOptionalInt(params.payload.campaignId)
  const convertedSalesLeadId = normalizeOptionalInt(params.payload.convertedSalesLeadId)
  await assertCampaignExists(campaignId)
  await assertSalesLeadExists(convertedSalesLeadId)

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE sales_digital_leads
      SET
        name = ?,
        phone = ?,
        email = ?,
        source = ?,
        campaign_id = ?,
        message = ?,
        status = ?,
        notes = ?,
        converted_sales_lead_id = ?
      WHERE id = ?
    `,
    [
      name,
      phone,
      normalizeOptionalText(params.payload.email),
      source,
      campaignId,
      normalizeOptionalText(params.payload.message),
      status,
      normalizeOptionalText(params.payload.notes),
      convertedSalesLeadId,
      params.id,
    ],
  )

  return getDigitalLeadById(params.id)
}

export async function deleteDigitalLead(params: { id: number; session: AppSession }) {
  assertReviewDbWritable()
  if (!(params.session.role === 'SUPER_ADMIN' || params.session.role === 'DIGITAL_CREATOR')) {
    throw new Error('Role aktif belum diizinkan menghapus digital lead.')
  }
  await ensureDigitalCreatorTables()
  await runReviewDbExecute<ExecuteResult>(`DELETE FROM sales_digital_leads WHERE id = ? LIMIT 1`, [params.id])
}

export async function getContentCalendar(params: {
  session: AppSession
  status?: string | null
  platform?: string | null
}) {
  const sourceState = getDataSourceSnapshot()
  if (sourceState.effectiveMode !== 'review-db' || sourceState.isFallback) {
    return [] as DigitalContentItem[]
  }
  if (!canReadDigitalCreator(params.session.role)) {
    return [] as DigitalContentItem[]
  }

  await ensureDigitalCreatorTables()

  const filters: string[] = []
  const values: unknown[] = []
  const status = normalizeText(params.status).toUpperCase()
  const platform = normalizeText(params.platform).toUpperCase()
  if (status && status !== 'ALL') {
    filters.push('status = ?')
    values.push(status)
  }
  if (platform && platform !== 'ALL') {
    filters.push('platform = ?')
    values.push(platform)
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''
  const rows = await runReviewDbQuery<ContentItemRow>(
    `
      SELECT
        id,
        title,
        content,
        content_type AS contentType,
        platform,
        status,
        publish_date AS publishDate,
        notes,
        tags_text AS tagsText,
        created_by_username AS createdByUsername,
        created_by_name AS createdByName,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM sales_content_calendar
      ${whereClause}
      ORDER BY COALESCE(publish_date, created_at) DESC, id DESC
    `,
    values,
  )
  return rows.map(mapContentRow)
}

async function getContentCalendarById(id: number) {
  const rows = await runReviewDbQuery<ContentItemRow>(
    `
      SELECT
        id,
        title,
        content,
        content_type AS contentType,
        platform,
        status,
        publish_date AS publishDate,
        notes,
        tags_text AS tagsText,
        created_by_username AS createdByUsername,
        created_by_name AS createdByName,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM sales_content_calendar
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  )
  return rows[0] ? mapContentRow(rows[0]) : null
}

export async function createContentItem(params: { session: AppSession; payload: DigitalCreatorMutationInput }) {
  assertReviewDbWritable()
  if (!canMutateContent(params.session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah content calendar.')
  }
  await ensureDigitalCreatorTables()

  const title = normalizeText(params.payload.title)
  const contentType = normalizeText(params.payload.contentType).toUpperCase()
  const platform = normalizeText(params.payload.platform).toUpperCase()
  const status = normalizeText(params.payload.status).toUpperCase()
  if (!title) throw new Error('Judul konten wajib diisi.')
  if (!CONTENT_TYPES.includes(contentType as (typeof CONTENT_TYPES)[number])) {
    throw new Error('Tipe konten tidak valid.')
  }
  if (!DIGITAL_PLATFORMS.includes(platform as (typeof DIGITAL_PLATFORMS)[number])) {
    throw new Error('Platform konten tidak valid.')
  }
  if (!CONTENT_STATUSES.includes(status as (typeof CONTENT_STATUSES)[number])) {
    throw new Error('Status konten tidak valid.')
  }

  const tags = normalizeList(params.payload.tags, ',')
  const result = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO sales_content_calendar (
        title,
        content,
        content_type,
        platform,
        status,
        publish_date,
        notes,
        tags_text,
        created_by_username,
        created_by_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      title,
      normalizeOptionalText(params.payload.content),
      contentType,
      platform,
      status,
      normalizeOptionalText(params.payload.publishDate),
      normalizeOptionalText(params.payload.notes),
      serializeList(tags, ','),
      params.session.username,
      params.session.displayName,
    ],
  )
  return getContentCalendarById(Number(result.insertId ?? 0))
}

export async function updateContentItem(params: {
  id: number
  session: AppSession
  payload: DigitalCreatorMutationInput
}) {
  assertReviewDbWritable()
  if (!canMutateContent(params.session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah content calendar.')
  }
  await ensureDigitalCreatorTables()

  const current = await getContentCalendarById(params.id)
  if (!current) throw new Error('Konten tidak ditemukan.')

  const title = normalizeText(params.payload.title)
  const contentType = normalizeText(params.payload.contentType).toUpperCase()
  const platform = normalizeText(params.payload.platform).toUpperCase()
  const status = normalizeText(params.payload.status).toUpperCase()
  if (!title) throw new Error('Judul konten wajib diisi.')
  if (!CONTENT_TYPES.includes(contentType as (typeof CONTENT_TYPES)[number])) {
    throw new Error('Tipe konten tidak valid.')
  }
  if (!DIGITAL_PLATFORMS.includes(platform as (typeof DIGITAL_PLATFORMS)[number])) {
    throw new Error('Platform konten tidak valid.')
  }
  if (!CONTENT_STATUSES.includes(status as (typeof CONTENT_STATUSES)[number])) {
    throw new Error('Status konten tidak valid.')
  }

  const tags = normalizeList(params.payload.tags, ',')
  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE sales_content_calendar
      SET
        title = ?,
        content = ?,
        content_type = ?,
        platform = ?,
        status = ?,
        publish_date = ?,
        notes = ?,
        tags_text = ?
      WHERE id = ?
    `,
    [
      title,
      normalizeOptionalText(params.payload.content),
      contentType,
      platform,
      status,
      normalizeOptionalText(params.payload.publishDate),
      normalizeOptionalText(params.payload.notes),
      serializeList(tags, ','),
      params.id,
    ],
  )
  return getContentCalendarById(params.id)
}

export async function deleteContentItem(params: { id: number; session: AppSession }) {
  assertReviewDbWritable()
  if (!canMutateContent(params.session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah content calendar.')
  }
  await ensureDigitalCreatorTables()
  await runReviewDbExecute<ExecuteResult>(`DELETE FROM sales_content_calendar WHERE id = ? LIMIT 1`, [params.id])
}

export async function getContentAnalytics(params: {
  session: AppSession
  platform?: string | null
}) {
  const sourceState = getDataSourceSnapshot()
  if (sourceState.effectiveMode !== 'review-db' || sourceState.isFallback) {
    return {
      analytics: [] as DigitalAnalyticsEntry[],
      summary: {
        reach: 0,
        impressions: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        clicks: 0,
        followersGain: 0,
      } satisfies DigitalAnalyticsSummary,
    }
  }
  if (!canReadDigitalCreator(params.session.role)) {
    return {
      analytics: [] as DigitalAnalyticsEntry[],
      summary: {
        reach: 0,
        impressions: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        clicks: 0,
        followersGain: 0,
      } satisfies DigitalAnalyticsSummary,
    }
  }

  await ensureDigitalCreatorTables()
  const filters: string[] = []
  const values: unknown[] = []
  const platform = normalizeText(params.platform).toUpperCase()
  if (platform && platform !== 'ALL') {
    filters.push('a.platform = ?')
    values.push(platform)
  }
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const rows = await runReviewDbQuery<AnalyticsRow>(
    `
      SELECT
        a.id AS id,
        a.content_id AS contentId,
        cc.title AS contentTitle,
        a.campaign_id AS campaignId,
        sc.name AS campaignName,
        a.platform AS platform,
        a.entry_date AS entryDate,
        a.reach AS reach,
        a.impressions AS impressions,
        a.likes AS likes,
        a.comments AS comments,
        a.shares AS shares,
        a.saves AS saves,
        a.clicks AS clicks,
        a.followers_gain AS followersGain,
        a.created_by_username AS createdByUsername,
        a.created_by_name AS createdByName,
        a.created_at AS createdAt,
        a.updated_at AS updatedAt
      FROM sales_content_analytics a
      LEFT JOIN sales_content_calendar cc
        ON cc.id = a.content_id
      LEFT JOIN sales_campaigns sc
        ON sc.id = a.campaign_id
      ${whereClause}
      ORDER BY a.entry_date DESC, a.id DESC
    `,
    values,
  )

  const analytics = rows.map(mapAnalyticsRow)
  const summary = analytics.reduce<DigitalAnalyticsSummary>(
    (accumulator, item) => ({
      reach: accumulator.reach + item.reach,
      impressions: accumulator.impressions + item.impressions,
      likes: accumulator.likes + item.likes,
      comments: accumulator.comments + item.comments,
      shares: accumulator.shares + item.shares,
      saves: accumulator.saves + item.saves,
      clicks: accumulator.clicks + item.clicks,
      followersGain: accumulator.followersGain + item.followersGain,
    }),
    {
      reach: 0,
      impressions: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      clicks: 0,
      followersGain: 0,
    },
  )

  return { analytics, summary }
}

async function getContentAnalyticsById(id: number) {
  const rows = await runReviewDbQuery<AnalyticsRow>(
    `
      SELECT
        a.id AS id,
        a.content_id AS contentId,
        cc.title AS contentTitle,
        a.campaign_id AS campaignId,
        sc.name AS campaignName,
        a.platform AS platform,
        a.entry_date AS entryDate,
        a.reach AS reach,
        a.impressions AS impressions,
        a.likes AS likes,
        a.comments AS comments,
        a.shares AS shares,
        a.saves AS saves,
        a.clicks AS clicks,
        a.followers_gain AS followersGain,
        a.created_by_username AS createdByUsername,
        a.created_by_name AS createdByName,
        a.created_at AS createdAt,
        a.updated_at AS updatedAt
      FROM sales_content_analytics a
      LEFT JOIN sales_content_calendar cc
        ON cc.id = a.content_id
      LEFT JOIN sales_campaigns sc
        ON sc.id = a.campaign_id
      WHERE a.id = ?
      LIMIT 1
    `,
    [id],
  )
  return rows[0] ? mapAnalyticsRow(rows[0]) : null
}

export async function createContentAnalytics(params: {
  session: AppSession
  payload: DigitalCreatorMutationInput
}) {
  assertReviewDbWritable()
  if (!canMutateAnalytics(params.session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah analytics konten.')
  }
  await ensureDigitalCreatorTables()

  const platform = normalizeText(params.payload.platform).toUpperCase()
  const date = normalizeText(params.payload.date)
  if (!DIGITAL_PLATFORMS.includes(platform as (typeof DIGITAL_PLATFORMS)[number])) {
    throw new Error('Platform analytics tidak valid.')
  }
  if (!date) {
    throw new Error('Tanggal analytics wajib diisi.')
  }

  const contentId = normalizeOptionalInt(params.payload.contentId)
  const campaignId = normalizeOptionalInt(params.payload.campaignId)
  await assertContentExists(contentId)
  await assertCampaignExists(campaignId)

  const result = await runReviewDbExecute<ExecuteResult>(
    `
      INSERT INTO sales_content_analytics (
        content_id,
        campaign_id,
        platform,
        entry_date,
        reach,
        impressions,
        likes,
        comments,
        shares,
        saves,
        clicks,
        followers_gain,
        created_by_username,
        created_by_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      contentId,
      campaignId,
      platform,
      date,
      Number(params.payload.reach ?? 0) || 0,
      Number(params.payload.impressions ?? 0) || 0,
      Number(params.payload.likes ?? 0) || 0,
      Number(params.payload.comments ?? 0) || 0,
      Number(params.payload.shares ?? 0) || 0,
      Number(params.payload.saves ?? 0) || 0,
      Number(params.payload.clicks ?? 0) || 0,
      Number(params.payload.followersGain ?? 0) || 0,
      params.session.username,
      params.session.displayName,
    ],
  )
  return getContentAnalyticsById(Number(result.insertId ?? 0))
}

export async function updateContentAnalytics(params: {
  id: number
  session: AppSession
  payload: DigitalCreatorMutationInput
}) {
  assertReviewDbWritable()
  if (!canMutateAnalytics(params.session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah analytics konten.')
  }
  await ensureDigitalCreatorTables()

  const current = await getContentAnalyticsById(params.id)
  if (!current) throw new Error('Data analytics tidak ditemukan.')

  const platform = normalizeText(params.payload.platform).toUpperCase()
  const date = normalizeText(params.payload.date)
  if (!DIGITAL_PLATFORMS.includes(platform as (typeof DIGITAL_PLATFORMS)[number])) {
    throw new Error('Platform analytics tidak valid.')
  }
  if (!date) {
    throw new Error('Tanggal analytics wajib diisi.')
  }

  const contentId = normalizeOptionalInt(params.payload.contentId)
  const campaignId = normalizeOptionalInt(params.payload.campaignId)
  await assertContentExists(contentId)
  await assertCampaignExists(campaignId)

  await runReviewDbExecute<ExecuteResult>(
    `
      UPDATE sales_content_analytics
      SET
        content_id = ?,
        campaign_id = ?,
        platform = ?,
        entry_date = ?,
        reach = ?,
        impressions = ?,
        likes = ?,
        comments = ?,
        shares = ?,
        saves = ?,
        clicks = ?,
        followers_gain = ?
      WHERE id = ?
    `,
    [
      contentId,
      campaignId,
      platform,
      date,
      Number(params.payload.reach ?? 0) || 0,
      Number(params.payload.impressions ?? 0) || 0,
      Number(params.payload.likes ?? 0) || 0,
      Number(params.payload.comments ?? 0) || 0,
      Number(params.payload.shares ?? 0) || 0,
      Number(params.payload.saves ?? 0) || 0,
      Number(params.payload.clicks ?? 0) || 0,
      Number(params.payload.followersGain ?? 0) || 0,
      params.id,
    ],
  )
  return getContentAnalyticsById(params.id)
}

export async function deleteContentAnalytics(params: { id: number; session: AppSession }) {
  assertReviewDbWritable()
  if (!canMutateAnalytics(params.session.role)) {
    throw new Error('Role aktif belum diizinkan mengubah analytics konten.')
  }
  await ensureDigitalCreatorTables()
  await runReviewDbExecute<ExecuteResult>(`DELETE FROM sales_content_analytics WHERE id = ? LIMIT 1`, [params.id])
}

export function getDigitalCreatorErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  return getReviewDbErrorDetail(error)
}
