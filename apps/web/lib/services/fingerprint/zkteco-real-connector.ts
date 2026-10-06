import ZKLib from 'node-zklib'
import type {
  FingerprintDeviceInfo,
  FingerprintMachineConnector,
  RawFingerprintEvent,
} from './types'

type ZKErrorLike = {
  code?: unknown
  message?: unknown
  inner?: unknown
  command?: unknown
  ip?: unknown
  name?: unknown
}

const CONNECT_TIMEOUT_MS = 30000
const DEFAULT_VERIFY_SCORE = 88
const SOURCE_MARKER = 'zkteco-zklib-sdk'

function stringifyAny(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  try {
    const s = JSON.stringify(v)
    if (s && s !== '{}') return s
  } catch {
    // ignore
  }
  try {
    return String(v)
  } catch {
    return ''
  }
}

function flattenStrings(err: unknown): string[] {
  const haystack: string[] = []
  const seen = new WeakSet<object>()
  const walk = (node: unknown, depth: number) => {
    if (depth > 6) return
    if (node === null || node === undefined) return
    if (typeof node === 'object') {
      if (seen.has(node as object)) return
      seen.add(node as object)
    }
    haystack.push(stringifyAny(node).toUpperCase())
    if (typeof node !== 'object') return
    for (const k of ['code', 'message', 'inner', 'name', 'command', 'ip', 'stack', 'syscall', 'errno']) {
      try {
        walk((node as Record<string, unknown>)[k as keyof typeof node], depth + 1)
      } catch {
        // ignore proxy traps
      }
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
    }
  }
  walk(err, 0)
  return haystack
}

function mapErrorToStandardCode(err: unknown): string {
  const hay = flattenStrings(err).join('\n')

  if (
    hay.includes('TIMEOUT') ||
    hay.includes('ETIMEDOUT') ||
    hay.includes('ECONNREFUSED') ||
    hay.includes('EHOSTUNREACH') ||
    hay.includes('ENOTFOUND') ||
    hay.includes('EADDRINUSE') ||
    hay.includes('NETWORK') ||
    hay.includes('SOCKET HANG UP') ||
    hay.includes('DESTINATION HOST UNREACHABLE')
  ) {
    return 'TIMEOUT_MESIN_OFFLINE'
  }

  if (
    hay.includes('AUTH') ||
    hay.includes('UNAUTH') ||
    hay.includes('PASSWORD') ||
    hay.includes('DENIED') ||
    hay.includes('FORBIDDEN') ||
    hay.includes('COMM_KEY') ||
    hay.includes('COMMKEY') ||
    hay.includes('WRONG KEY')
  ) {
    return 'AUTH_FAILED_COMM_KEY_SALAH'
  }

  if (hay) {
    // fallback non-empty hay, try last 60 chars as hint
    return `KONEKSI_GAGAL_${hay.replace(/[^A-Z0-9_]/g, ' ').trim().replace(/\s+/g, '_').slice(0, 60) || 'GENERIC'}`
  }
  return 'CONNECTION_FAILED'
}

function deviceInfoToHumanLine(info: FingerprintDeviceInfo, ip: string, port: number): string {
  const parts: string[] = []
  parts.push(`Model=${info.model}`)
  parts.push(`IP=${ip}:${port}`)
  if (info.firmwareVersion) parts.push(`Firmware=${info.firmwareVersion}`)
  if (info.serialNumber) parts.push(`Serial=${info.serialNumber}`)
  parts.push(`Tz=${info.timezone}`)
  return parts.join(' | ')
}

export class ZktecoRealFingerprintConnector implements FingerprintMachineConnector {
  readonly machineConfig: FingerprintMachineConnector['machineConfig']
  private zkInstance: InstanceType<typeof ZKLib> | null = null

  constructor(machineConfig: FingerprintMachineConnector['machineConfig']) {
    this.machineConfig = machineConfig
  }

  private getInstance(): InstanceType<typeof ZKLib> {
    if (!this.zkInstance) {
      const port = Number(this.machineConfig.port ?? 4370)
      this.zkInstance = new ZKLib(
        this.machineConfig.ip,
        Number.isFinite(port) && port > 0 ? port : 4370,
        CONNECT_TIMEOUT_MS,
      )
    }
    return this.zkInstance
  }

  async connect(): Promise<void> {
    const zk = this.getInstance()
    try {
      await zk.createSocket()
    } catch (err) {
      const code = mapErrorToStandardCode(err)
      await this.disconnect().catch(() => null)
      this.zkInstance = null
      throw new Error(code)
    }

    try {
      await zk.enableDevice()
    } catch (err) {
      const code = mapErrorToStandardCode(err)
      await this.disconnect().catch(() => null)
      this.zkInstance = null
      throw new Error(code)
    }
  }

  async disconnect(): Promise<void> {
    const zk = this.zkInstance
    this.zkInstance = null
    if (!zk) return
    try {
      await zk.disableDevice().catch(() => null)
    } finally {
      try {
        await zk.disconnect()
      } catch {
        // ignore disconnect errors (socket may already closed by device)
      }
    }
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
    } catch (err) {
      return {
        ok: false,
        errorMessage: err instanceof Error ? err.message : mapErrorToStandardCode(err),
      }
    } finally {
      await this.disconnect().catch(() => null)
    }
  }

  async getDeviceInfo(): Promise<FingerprintDeviceInfo> {
    const zk = this.getInstance()
    const info = await zk.getInfo()
    const serialId = `ZK-${String(this.machineConfig.id).padStart(4, '0')}-${this.machineConfig.ip.replace(/[^0-9a-zA-Z]/g, '-')}`
    return {
      model: this.machineConfig.model || 'ZKTeco',
      firmwareVersion: `cap:${String(info.logCapacity ?? 0)}-users:${String(info.userCounts ?? 0)}`,
      serialNumber: serialId,
      timezone: this.machineConfig.deviceTimezone || 'Asia/Jakarta',
    }
  }

  async pullAttendanceEvents(
    sinceTimestamp?: Date | null,
  ): Promise<RawFingerprintEvent[]> {
    const zk = this.getInstance()
    const result = await zk.getAttendances()
    const records = Array.isArray(result?.data) ? result.data : []

    const sinceMs =
      sinceTimestamp instanceof Date && Number.isFinite(sinceTimestamp.getTime())
        ? sinceTimestamp.getTime()
        : null

    const events: RawFingerprintEvent[] = []
    for (const rec of records) {
      try {
        const ts = rec.recordTime instanceof Date ? rec.recordTime : new Date(String(rec.recordTime ?? ''))
        if (!Number.isFinite(ts.getTime())) continue
        if (sinceMs !== null && ts.getTime() < sinceMs) continue

        const uid = String(rec.deviceUserId ?? '').trim()
        if (!uid) continue

        events.push({
          machineUserId: uid,
          eventTimestampLocal: ts,
          eventTypeRaw: 'FINGERPRINT_VERIFY',
          verifyScore: DEFAULT_VERIFY_SCORE,
          rawPayload: {
            source: SOURCE_MARKER,
            userSn: Number(rec.userSn ?? 0),
            deviceIp: String(rec.ip ?? this.machineConfig.ip),
            originalRecord: {
              userSn: rec.userSn,
              deviceUserId: rec.deviceUserId,
              recordTimeIso: ts.toISOString(),
            },
          },
        })
      } catch {
        // skip malformed individual record; keep processing remaining
        continue
      }
    }

    events.sort((a, b) => a.eventTimestampLocal.getTime() - b.eventTimestampLocal.getTime())
    return events
  }
}
