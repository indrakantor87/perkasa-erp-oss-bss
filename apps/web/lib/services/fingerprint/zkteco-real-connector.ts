import ZKLib from 'node-zklib'
import type {
  FingerprintDeviceInfo,
  FingerprintMachineConnector,
  RawFingerprintEvent,
} from './types'

type ZKErrorLike = {
  code?: string
  message?: string
  inner?: { code?: string; message?: string }
}

const CONNECT_TIMEOUT_MS = 10000
const DEFAULT_VERIFY_SCORE = 88
const SOURCE_MARKER = 'zkteco-zklib-sdk'

function mapErrorToStandardCode(err: unknown): string {
  const e = err as ZKErrorLike
  const code = String(e?.code ?? e?.inner?.code ?? '').toUpperCase()
  const message = String(e?.message ?? e?.inner?.message ?? '').toUpperCase()

  if (code.includes('TIMEOUT') || message.includes('TIMEOUT')) return 'TIMEOUT'
  if (
    code.includes('ECONNREFUSED') ||
    code.includes('EHOSTUNREACH') ||
    code.includes('ENOTFOUND') ||
    code.includes('EADDRINUSE')
  ) {
    return 'TIMEOUT'
  }
  if (
    message.includes('AUTH') ||
    message.includes('UNAUTHORIZED') ||
    message.includes('DENIED')
  ) {
    return 'AUTH_FAILED'
  }
  if (code) return code
  return 'CONNECTION_FAILED'
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
