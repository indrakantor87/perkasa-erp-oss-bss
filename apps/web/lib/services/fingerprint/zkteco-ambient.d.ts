declare module 'node-zklib' {
  type ZKErrorCode =
    | 'ETIMEDOUT'
    | 'ECONNREFUSED'
    | 'EHOSTUNREACH'
    | 'ENOTFOUND'
    | 'EADDRINUSE'
    | string

  class ZKError<T = unknown> extends Error {
    readonly message: string
    readonly code?: ZKErrorCode
    readonly inner?: T
    readonly command?: string
    readonly ip?: string
    constructor(inner: T, command?: string, ip?: string)
  }

  interface ZKDeviceInfo {
    userCounts: number
    logCounts: number
    logCapacity: number
  }

  interface ZKAttendanceRecord {
    userSn: number
    deviceUserId: string
    recordTime: Date
    ip: string
  }

  interface ZKAttendanceResult {
    data: ZKAttendanceRecord[]
    err: unknown
  }

  type AttendanceCallback = (percent: number, total: number) => void

  class ZKLib {
    readonly ip: string
    connectionType: 'tcp' | 'udp' | null
    isBusy: boolean

    constructor(ip: string, port: number, timeoutMs: number, inport?: number)

    createSocket(cbErr?: (err: unknown) => void, cbClose?: () => void): Promise<void>

    disconnect(): Promise<void>

    enableDevice(): Promise<void>

    disableDevice(): Promise<void>

    freeData(): Promise<void>

    getInfo(): Promise<ZKDeviceInfo>

    getUsers(): Promise<unknown>

    getAttendances(callback?: AttendanceCallback): Promise<ZKAttendanceResult>

    getRealTimeLogs(cb: (record: unknown) => void): Promise<void>

    clearAttendanceLog(): Promise<void>

    executeCmd(command: number, data?: string): Promise<Buffer>
  }

  export = ZKLib
}
