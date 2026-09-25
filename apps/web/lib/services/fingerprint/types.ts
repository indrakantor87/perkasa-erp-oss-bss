export interface RawFingerprintEvent {
  machineUserId: string
  eventTimestampLocal: Date
  eventTypeRaw?: string
  verifyScore?: number
  rawPayload?: Record<string, unknown>
}

export interface FingerprintDeviceInfo {
  model?: string
  firmwareVersion?: string
  serialNumber?: string
  timezone?: string
}

export interface FingerprintMachineConnector {
  machineConfig: {
    id: number
    ip: string
    port?: number
    model: string
    authConfig?: unknown
    deviceTimezone: string
  }
  connect(): Promise<void>
  disconnect(): Promise<void>
  testConnection(): Promise<{
    ok: boolean
    info?: FingerprintDeviceInfo
    errorMessage?: string
  }>
  getDeviceInfo(): Promise<FingerprintDeviceInfo>
  pullAttendanceEvents(sinceTimestamp?: Date | null): Promise<RawFingerprintEvent[]>
}

export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'AUTH_FAILED' | 'SYNC_ERROR'

export type SyncRunFinalStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED'

export type SyncMode = 'MANUAL' | 'SCHEDULED' | 'RETRY'

export type EnrollmentStatus = 'ENROLLED' | 'PENDING' | 'REVOKED'

export interface FpMachineRow {
  id: number
  ip: string
  port: number | null
  model: string
  deviceTimezone: string
  authConfigEncrypted: string
  displayName: string
  lastSyncAt: string | null
  lastConnectionStatus: ConnectionStatus
  createdAt: string
  updatedAt: string
}

export interface FpMachineCreateInput {
  ip: string
  port?: number
  model: string
  deviceTimezone?: string
  authConfig?: unknown
  displayName?: string
}

export interface FpMachineUpdateInput {
  ip?: string
  port?: number | null
  model?: string
  deviceTimezone?: string
  authConfig?: unknown
  displayName?: string
}

export interface FpMappingRow {
  id: number
  machineId: number
  machineUserId: string
  employeeId: number
  employeeCode: string | null
  fullName: string | null
  enrollmentStatus: EnrollmentStatus
  enrolledAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface FpMappingCreateInput {
  machineId: number
  machineUserId: string
  employeeId: number
  enrollmentStatus?: EnrollmentStatus
}

export interface FpSyncRunRow {
  id: number
  machineId: number
  actorUserId: number | null
  syncMode: SyncMode
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  totalRecordsFetched: number
  totalNewValid: number
  totalDuplicatesSkipped: number
  totalUnmapped: number
  totalFailedParse: number
  finalStatus: SyncRunFinalStatus
  errorSummary: string | null
}

export interface SyncRunSummary {
  id: number
  machineId: number
  actorUserId: number | null
  syncMode: SyncMode
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  totalRecordsFetched: number
  totalNewValid: number
  totalDuplicatesSkipped: number
  totalUnmapped: number
  totalFailedParse: number
  finalStatus: SyncRunFinalStatus
  errorSummary: string | null
  cursorAdvanced: boolean
}
