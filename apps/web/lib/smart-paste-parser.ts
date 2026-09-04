export type DailyActivityUiStatus = 'OPEN' | 'PENDING' | 'CLOSE' | 'CANCEL'

export type SmartPastePreviewItem = {
  order: number
  activityText: string
  status: DailyActivityUiStatus
}

export type SmartPasteParseResult = {
  activityDate: string
  items: SmartPastePreviewItem[]
  dateSource: 'detected' | 'fallback-today'
}

export const UI_STATUSES: DailyActivityUiStatus[] = ['OPEN', 'PENDING', 'CLOSE', 'CANCEL']

export const UI_STATUS_LABELS: Record<DailyActivityUiStatus, string> = {
  OPEN: 'OPEN',
  PENDING: 'PENDING',
  CLOSE: 'CLOSE',
  CANCEL: 'CANCEL',
}

export const UI_STATUS_COLORS: Record<DailyActivityUiStatus, string> = {
  OPEN: 'bg-sky-100 text-sky-700 border-sky-200',
  PENDING: 'bg-amber-100 text-amber-700 border-amber-200',
  CLOSE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CANCEL: 'bg-rose-100 text-rose-700 border-rose-200',
}

type DbExecutionStatus = 'PLANNED' | 'DONE' | 'PENDING' | 'CANCEL'

const UI_TO_DB: Record<DailyActivityUiStatus, DbExecutionStatus> = {
  OPEN: 'PLANNED',
  PENDING: 'PENDING',
  CLOSE: 'DONE',
  CANCEL: 'CANCEL',
}

const DB_TO_UI: Record<DbExecutionStatus, DailyActivityUiStatus> = {
  PLANNED: 'OPEN',
  DONE: 'CLOSE',
  PENDING: 'PENDING',
  CANCEL: 'CANCEL',
}

export function mapUiStatusToExecutionStatus(status: DailyActivityUiStatus): DbExecutionStatus {
  return UI_TO_DB[status]
}

export function mapExecutionStatusToUiStatus(status: DbExecutionStatus): DailyActivityUiStatus {
  return DB_TO_UI[status] ?? 'OPEN'
}

const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 0,
  january: 0,
  jan: 0,
  februari: 1,
  february: 1,
  feb: 1,
  maret: 2,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  may: 4,
  juni: 5,
  june: 5,
  jun: 5,
  juli: 6,
  july: 6,
  jul: 6,
  agustus: 7,
  august: 7,
  agu: 7,
  aug: 7,
  september: 8,
  sept: 8,
  sep: 8,
  oktober: 9,
  october: 9,
  okt: 9,
  oct: 9,
  november: 10,
  nov: 10,
  desember: 11,
  december: 11,
  des: 11,
  dec: 11,
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function toIsoDate(year: number, month0: number, day: number): string | null {
  const d = new Date(year, month0, day)
  if (
    d.getFullYear() !== year ||
    d.getMonth() !== month0 ||
    d.getDate() !== day
  ) {
    return null
  }
  return `${year}-${pad2(month0 + 1)}-${pad2(day)}`
}

export function todayIsoDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

function tryParseIndonesianDate(line: string): string | null {
  const trimmed = line.trim()
  const re = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/
  const m = trimmed.match(re)
  if (!m) return null
  const day = parseInt(m[1], 10)
  const monthName = m[2].toLowerCase()
  const year = parseInt(m[3], 10)
  const monthIdx = INDONESIAN_MONTHS[monthName]
  if (monthIdx === undefined || isNaN(day) || isNaN(year)) return null
  return toIsoDate(year, monthIdx, day)
}

function tryParseSlashDate(line: string): string | null {
  const trimmed = line.trim()
  const re = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4}|\d{2})$/
  const m = trimmed.match(re)
  if (!m) return null
  let day = parseInt(m[1], 10)
  let month = parseInt(m[2], 10) - 1
  let year = parseInt(m[3], 10)
  if (year < 100) year += 2000
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  return toIsoDate(year, month, day)
}

function tryParseIsoDate(line: string): string | null {
  const trimmed = line.trim()
  const re = /^(\d{4})\-(\d{1,2})\-(\d{1,2})$/
  const m = trimmed.match(re)
  if (!m) return null
  const year = parseInt(m[1], 10)
  const month = parseInt(m[2], 10) - 1
  const day = parseInt(m[3], 10)
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  return toIsoDate(year, month, day)
}

export function parseSmartPasteDate(text: string): {
  activityDate: string
  remainingLines: string[]
  dateSource: 'detected' | 'fallback-today'
} {
  const rawLines = text.split(/\r?\n/)
  const nonBlankLeading: number[] = []
  for (let i = 0; i < rawLines.length && nonBlankLeading.length < 2; i++) {
    if (rawLines[i].trim().length > 0) nonBlankLeading.push(i)
  }

  for (const idx of nonBlankLeading) {
    const line = rawLines[idx]
    const dIndo = tryParseIndonesianDate(line)
    if (dIndo) {
      const remaining = rawLines.slice(idx + 1)
      return { activityDate: dIndo, remainingLines: remaining, dateSource: 'detected' }
    }
    const dSlash = tryParseSlashDate(line)
    if (dSlash) {
      const remaining = rawLines.slice(idx + 1)
      return { activityDate: dSlash, remainingLines: remaining, dateSource: 'detected' }
    }
    const dIso = tryParseIsoDate(line)
    if (dIso) {
      const remaining = rawLines.slice(idx + 1)
      return { activityDate: dIso, remainingLines: remaining, dateSource: 'detected' }
    }
  }

  return {
    activityDate: todayIsoDate(),
    remainingLines: rawLines,
    dateSource: 'fallback-today',
  }
}

const BULLET_PREFIX_RE = /^\s*(?:\(?[0-9a-zA-Z]+[.)]\s*|\s*[-•*■▪▸▶]\s*)/
const TRAILING_PUNCT_RE = /[.;:,\s]+$/
const LEADING_WS_RE = /^\s+/
const CONTINUATION_CONJ_RE =
  /\b(sehingga|karena|supaya|agar|akibatnya|karenanya|maka|jadi|namun|tetapi|tapi|sedangkan|sementara|selain|bahkan|apalagi|termasuk|terutama|khususnya|yaitu|yakni|jika|kalau|bila|meskipun|walau|walaupun|padahal|sambil|misal|misalnya|contohnya|dan|atau|serta)\b/i

function cleanActivityLine(line: string): string {
  let s = line.replace(LEADING_WS_RE, '')
  for (let i = 0; i < 3; i++) {
    const before = s
    s = s.replace(BULLET_PREFIX_RE, '')
    if (s === before) break
  }
  s = s.replace(TRAILING_PUNCT_RE, '')
  return s.trim()
}

export function splitSmartPasteActivities(lines: string[]): string[] {
  const result: string[] = []
  const buffer: string[] = []

  const flushBuffer = () => {
    if (buffer.length === 0) return
    const joined = buffer.join(' ').replace(/\s+/g, ' ').trim()
    const cleaned = cleanActivityLine(joined)
    if (cleaned.length > 2) {
      result.push(cleaned)
    }
    buffer.length = 0
  }

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '')
    if (line.trim().length === 0) {
      flushBuffer()
      continue
    }
    const isContinuation = /^\s{2,}/.test(line)
    const isBullet = BULLET_PREFIX_RE.test(line)
    const trimmed = line.trim()
    const startWithLowercase = /^[a-z]/.test(trimmed)
    const hasContinuationConj = CONTINUATION_CONJ_RE.test(trimmed)
    const softContinuation = startWithLowercase || hasContinuationConj
    if (buffer.length > 0) {
      if (isBullet) {
        flushBuffer()
      } else if (!isContinuation && !softContinuation) {
        flushBuffer()
      }
    }
    buffer.push(line)
  }
  flushBuffer()
  return result
}

export function parseSmartPaste(text: string | null | undefined): SmartPasteParseResult {
  if (text == null || typeof text !== 'string' || text.trim().length === 0) {
    return { activityDate: todayIsoDate(), items: [], dateSource: 'fallback-today' }
  }
  const { activityDate, remainingLines, dateSource } = parseSmartPasteDate(text)
  const activityTexts = splitSmartPasteActivities(remainingLines)
  const items: SmartPastePreviewItem[] = activityTexts.map((txt, i) => ({
    order: i + 1,
    activityText: txt,
    status: 'OPEN',
  }))
  return { activityDate, items, dateSource }
}
