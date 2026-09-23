import type {
  FingerprintDeviceInfo,
  FingerprintMachineConnector,
  RawFingerprintEvent,
} from './types'

type ThrowOnConnectMode = 'timeout' | 'auth_fail' | 'malformed_30pct' | null

type MockConnectorOptions = {
  fakeTotalEvents?: number
  duplicateCount?: number
  unmappedCount?: number
  throwOnConnect?: ThrowOnConnectMode
}

const ASIA_JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000

function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 0xffffffff
  }
}

function isWorkday(date: Date) {
  const day = date.getDay()
  return day >= 1 && day <= 5
}

function buildJakartaLocalDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date {
  const utcMs = Date.UTC(year, month, day, hour, minute, second) - ASIA_JAKARTA_OFFSET_MS
  return new Date(utcMs)
}

function generateWorkdayTapTimestamp(random: () => number, baseYear: number, baseMonth: number): Date {
  let dayOffset = Math.floor(random() * 20) + 1
  let candidate = new Date(baseYear, baseMonth - 1, dayOffset)
  let safety = 0
  while (!isWorkday(candidate) && safety < 60) {
    dayOffset += 1
    candidate = new Date(baseYear, baseMonth - 1, dayOffset)
    safety += 1
  }
  const year = candidate.getFullYear()
  const month = candidate.getMonth()
  const day = candidate.getDate()

  const morningRoll = random()
  if (morningRoll < 0.52) {
    const hour = 7 + Math.floor(random() * 2)
    const minute = Math.floor(random() * 60)
    return buildJakartaLocalDate(year, month, day, hour, minute, Math.floor(random() * 60))
  }
  if (morningRoll < 0.82) {
    const hour = 11 + Math.floor(random() * 2)
    const minute = Math.floor(random() * 60)
    return buildJakartaLocalDate(year, month, day, hour, minute, Math.floor(random() * 60))
  }
  const hour = 15 + Math.floor(random() * 3)
  const minute = Math.floor(random() * 60)
  return buildJakartaLocalDate(year, month, day, hour, minute, Math.floor(random() * 60))
}

export class MockFingerprintConnector implements FingerprintMachineConnector {
  readonly machineConfig: FingerprintMachineConnector['machineConfig']
  private readonly fakeTotalEvents: number
  private readonly duplicateCount: number
  private readonly unmappedCount: number
  private readonly throwOnConnect: ThrowOnConnectMode
  private connected: boolean

  constructor(
    machineConfig: FingerprintMachineConnector['machineConfig'],
    options: MockConnectorOptions = {},
  ) {
    this.machineConfig = machineConfig
    this.fakeTotalEvents = options.fakeTotalEvents ?? 150
    this.duplicateCount = options.duplicateCount ?? 1
    this.unmappedCount = options.unmappedCount ?? 1
    this.throwOnConnect = options.throwOnConnect ?? null
    this.connected = false
  }

  async connect(): Promise<void> {
    if (this.throwOnConnect === 'timeout') {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      throw new Error('TIMEOUT')
    }
    if (this.throwOnConnect === 'auth_fail') {
      throw new Error('AUTH_FAILED')
    }
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async testConnection(): Promise<{
    ok: boolean
    info?: FingerprintDeviceInfo
    errorMessage?: string
  }> {
    try {
      await this.connect()
      const info = await this.getDeviceInfo()
      return { ok: true, info }
    } catch (error) {
      return {
        ok: false,
        errorMessage: error instanceof Error ? error.message : 'CONNECTION_FAILED',
      }
    } finally {
      await this.disconnect().catch(() => null)
    }
  }

  async getDeviceInfo(): Promise<FingerprintDeviceInfo> {
    return {
      model: this.machineConfig.model || 'MOCK-BIOMETRIC-100',
      firmwareVersion: 'v3.14.1-mock',
      serialNumber: `MOCK-${String(this.machineConfig.id).padStart(6, '0')}-SN`,
      timezone: this.machineConfig.deviceTimezone || 'Asia/Jakarta',
    }
  }

  async pullAttendanceEvents(sinceTimestamp?: Date | null): Promise<RawFingerprintEvent[]> {
    if (this.throwOnConnect === 'malformed_30pct') {
      return this.pullWithMalformed(sinceTimestamp)
    }
    return this.pullClean(sinceTimestamp)
  }

  private pullClean(sinceTimestamp?: Date | null): RawFingerprintEvent[] {
    const seedBase =
      this.machineConfig.id * 1315423911 +
      Math.floor((sinceTimestamp?.getTime() ?? 0) / 1000) * 2654435761
    const random = seededRandom(seedBase)

    const now = new Date()
    const baseYear = now.getFullYear()
    const baseMonth = sinceTimestamp
      ? sinceTimestamp.getMonth() + 1
      : Math.max(1, now.getMonth() + 1)

    const uniqueCount = Math.max(1, this.fakeTotalEvents - this.duplicateCount - this.unmappedCount)

    const events: RawFingerprintEvent[] = []

    for (let i = 0; i < uniqueCount; i += 1) {
      const empId = (i % 20) + 1
      const ts = generateWorkdayTapTimestamp(random, baseYear, baseMonth)
      events.push({
        machineUserId: String(empId),
        eventTimestampLocal: ts,
        eventTypeRaw: random() > 0.1 ? 'FINGERPRINT_VERIFY' : 'CARD_PASS',
        verifyScore: 65 + Math.floor(random() * 35),
        rawPayload: {
          source: 'mock-fp-device',
          sequence: i + 1,
          deviceId: this.machineConfig.id,
        },
      })
    }

    for (let d = 0; d < this.duplicateCount && events.length > 0; d += 1) {
      const srcIndex = Math.floor(random() * events.length)
      const src = events[srcIndex]
      events.push({
        machineUserId: src.machineUserId,
        eventTimestampLocal: new Date(src.eventTimestampLocal.getTime()),
        eventTypeRaw: src.eventTypeRaw,
        verifyScore: src.verifyScore,
        rawPayload: { ...(src.rawPayload ?? {}), duplicateOf: srcIndex, source: 'mock-fp-device' },
      })
    }

    for (let u = 0; u < this.unmappedCount; u += 1) {
      const ts = generateWorkdayTapTimestamp(random, baseYear, baseMonth)
      events.push({
        machineUserId: '999',
        eventTimestampLocal: ts,
        eventTypeRaw: 'FINGERPRINT_VERIFY',
        verifyScore: 72 + Math.floor(random() * 25),
        rawPayload: {
          source: 'mock-fp-device',
          unmapped: true,
          deviceId: this.machineConfig.id,
        },
      })
    }

    if (sinceTimestamp) {
      const sinceMs = sinceTimestamp.getTime()
      return events.filter((ev) => ev.eventTimestampLocal.getTime() >= sinceMs)
    }

    return events
  }

  private pullWithMalformed(sinceTimestamp?: Date | null): RawFingerprintEvent[] {
    const clean = this.pullClean(sinceTimestamp)
    const malformedThreshold = Math.ceil(clean.length * 0.3)
    const payload: RawFingerprintEvent[] = []
    let malformedCount = 0

    for (let i = 0; i < clean.length; i += 1) {
      const event = clean[i]
      if (i < malformedThreshold) {
        payload.push({
          machineUserId: '',
          eventTimestampLocal: new Date(NaN),
          eventTypeRaw: '__MALFORMED__',
          rawPayload: {
            error: 'MALFORMED_RECORD',
            originalIndex: i,
          },
        })
        malformedCount += 1
      } else {
        payload.push(event)
      }
    }

    const error = new Error('PARTIAL_MALFORMED_DATA') as Error & {
      malformedCount?: number
      validCount?: number
      events?: RawFingerprintEvent[]
    }
    error.malformedCount = malformedCount
    error.validCount = payload.length - malformedCount
    error.events = payload
    throw error
  }
}
