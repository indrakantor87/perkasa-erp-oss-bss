/*
 * ====== RADIUS PROVIDER SETUP =====
 * Pilih salah satu: mikrotik-rest | mikrotik-ssh | (default: mock)
 * RADIUS_PROVIDER=mikrotik-rest
 *
 * --- Provider: Mikrotik REST API ---
 * MIKROTIK_REST_BASE_URL=https://10.10.10.1/rest
 * MIKROTIK_REST_USERNAME=admin
 * MIKROTIK_REST_PASSWORD=password-rahasia
 *
 * --- Provider: Mikrotik SSH ---
 * MIKROTIK_SSH_HOST=10.10.10.1
 * MIKROTIK_SSH_PORT=22
 * MIKROTIK_SSH_USERNAME=admin
 * MIKROTIK_SSH_PASSWORD=password-rahasia
 */

export type SubscriptionActivationStatus =
  | 'PENDING'
  | 'ACTIVATED'
  | 'FAILED'
  | 'SUSPENDED'
  | 'REACTIVATED'
  | 'TERMINATED'

export type RadiusPackageProfile = {
  profileName: string
  downloadMbps: number
  uploadMbps: number
  burstLimit?: string
  burstThreshold?: string
  burstTime?: string
  rateLimit?: string
}

export type RadiusActivationInput = {
  subscriptionId: string | number
  customerName: string
  customerPhone?: string
  usernameRadius: string
  passwordRadius: string
  packageProfile: RadiusPackageProfile
  ipAddress?: string
  macAddress?: string
  vlanId?: number | string
  oltPort?: string
  onuSn?: string
  activatedByUsername: string
  remarks?: string
}

export type RadiusActivationResult = {
  success: boolean
  providerId: string
  status: SubscriptionActivationStatus
  externalReferenceId?: string
  executedAt: string
  commandLogs?: string[]
  errorMessage?: string
}

export interface IRadiusActivationProvider {
  readonly providerId: string
  activate(payload: RadiusActivationInput): Promise<RadiusActivationResult>
  suspend(usernameRadius: string, reason?: string): Promise<RadiusActivationResult>
  reactivate(usernameRadius: string): Promise<RadiusActivationResult>
  terminate(usernameRadius: string): Promise<RadiusActivationResult>
  checkOnlineStatus(usernameRadius: string): Promise<{
    online: boolean
    lastSeenAt?: string
    sessionUptimeSeconds?: number
  }>
}

type MockRadiusEntry = {
  status: SubscriptionActivationStatus
  profile: RadiusPackageProfile
  activatedAt: string
  logs: string[]
}

class LocalMockRadiusProvider implements IRadiusActivationProvider {
  readonly providerId = 'local-mock'
  private readonly state = new Map<string, MockRadiusEntry>()

  async activate(payload: RadiusActivationInput): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()

    logs.push(`[MOCK] activate subscriptionId=${payload.subscriptionId}`)
    logs.push(`[MOCK] username=${payload.usernameRadius} profile=${payload.packageProfile.profileName}`)
    logs.push(
      `[MOCK] bandwidth ${payload.packageProfile.downloadMbps}M/${payload.packageProfile.uploadMbps}M`
    )
    if (payload.ipAddress) logs.push(`[MOCK] remote-address=${payload.ipAddress}`)
    if (payload.macAddress) logs.push(`[MOCK] mac-address=${payload.macAddress}`)
    if (payload.vlanId) logs.push(`[MOCK] vlan-id=${payload.vlanId}`)
    if (payload.onuSn) logs.push(`[MOCK] onu-sn=${payload.onuSn}`)
    logs.push(`[MOCK] activated-by=${payload.activatedByUsername}`)
    logs.push(`[MOCK] status=ACTIVATED`)

    this.state.set(payload.usernameRadius, {
      status: 'ACTIVATED',
      profile: payload.packageProfile,
      activatedAt: executedAt,
      logs,
    })

    return {
      success: true,
      providerId: this.providerId,
      status: 'ACTIVATED',
      externalReferenceId: `MOCK-${payload.subscriptionId}-${Date.now()}`,
      executedAt,
      commandLogs: logs,
    }
  }

  async suspend(usernameRadius: string, reason?: string): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()
    const existing = this.state.get(usernameRadius)

    logs.push(`[MOCK] suspend username=${usernameRadius}`)
    if (reason) logs.push(`[MOCK] reason=${reason}`)
    logs.push(`[MOCK] status=SUSPENDED`)

    const newEntry: MockRadiusEntry = existing
      ? { ...existing, status: 'SUSPENDED', logs: [...existing.logs, ...logs] }
      : {
          status: 'SUSPENDED',
          profile: { profileName: 'unknown', downloadMbps: 0, uploadMbps: 0 },
          activatedAt: executedAt,
          logs,
        }
    this.state.set(usernameRadius, newEntry)

    return {
      success: true,
      providerId: this.providerId,
      status: 'SUSPENDED',
      executedAt,
      commandLogs: logs,
    }
  }

  async reactivate(usernameRadius: string): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()
    const existing = this.state.get(usernameRadius)

    logs.push(`[MOCK] reactivate username=${usernameRadius}`)
    logs.push(`[MOCK] status=REACTIVATED`)

    const newEntry: MockRadiusEntry = existing
      ? { ...existing, status: 'REACTIVATED', logs: [...existing.logs, ...logs] }
      : {
          status: 'REACTIVATED',
          profile: { profileName: 'unknown', downloadMbps: 0, uploadMbps: 0 },
          activatedAt: executedAt,
          logs,
        }
    this.state.set(usernameRadius, newEntry)

    return {
      success: true,
      providerId: this.providerId,
      status: 'REACTIVATED',
      executedAt,
      commandLogs: logs,
    }
  }

  async terminate(usernameRadius: string): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()
    const existing = this.state.get(usernameRadius)

    logs.push(`[MOCK] terminate username=${usernameRadius}`)
    logs.push(`[MOCK] status=TERMINATED`)

    const newEntry: MockRadiusEntry = existing
      ? { ...existing, status: 'TERMINATED', logs: [...existing.logs, ...logs] }
      : {
          status: 'TERMINATED',
          profile: { profileName: 'unknown', downloadMbps: 0, uploadMbps: 0 },
          activatedAt: executedAt,
          logs,
        }
    this.state.set(usernameRadius, newEntry)

    return {
      success: true,
      providerId: this.providerId,
      status: 'TERMINATED',
      executedAt,
      commandLogs: logs,
    }
  }

  async checkOnlineStatus(usernameRadius: string): Promise<{
    online: boolean
    lastSeenAt?: string
    sessionUptimeSeconds?: number
  }> {
    const entry = this.state.get(usernameRadius)
    const isActivated = entry?.status === 'ACTIVATED' || entry?.status === 'REACTIVATED'

    return {
      online: isActivated,
      lastSeenAt: isActivated ? new Date().toISOString() : undefined,
      sessionUptimeSeconds: isActivated ? Math.floor(Date.now() / 1000) % 86400 : undefined,
    }
  }
}

class MikrotikRestApiProvider implements IRadiusActivationProvider {
  readonly providerId = 'mikrotik-rest'
  private readonly baseUrl: string
  private readonly authHeader: string

  constructor() {
    const baseUrl = process.env.MIKROTIK_REST_BASE_URL
    const username = process.env.MIKROTIK_REST_USERNAME
    const password = process.env.MIKROTIK_REST_PASSWORD

    if (!baseUrl || !username || !password) {
      throw new Error(
        'Mikrotik REST API config tidak lengkap. Set MIKROTIK_REST_BASE_URL, MIKROTIK_REST_USERNAME, MIKROTIK_REST_PASSWORD'
      )
    }

    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
  }

  private async request<T = unknown>(
    method: 'GET' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<{ status: number; data: T | null }> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`
    const headers: Record<string, string> = {
      Authorization: this.authHeader,
      'Content-Type': 'application/json',
    }

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)

    const text = await res.text()
    let data: T | null = null
    try {
      data = text ? (JSON.parse(text) as T) : null
    } catch {
      data = null
    }

    return { status: res.status, data }
  }

  async activate(payload: RadiusActivationInput): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()

    try {
      logs.push(`[REST] PUT /ip/ppp/secret name=${payload.usernameRadius}`)
      const body: Record<string, unknown> = {
        name: payload.usernameRadius,
        password: payload.passwordRadius,
        profile: payload.packageProfile.profileName,
        comment: String(payload.subscriptionId),
        service: 'pppoe',
      }
      if (payload.ipAddress) body['remote-address'] = payload.ipAddress
      if (payload.packageProfile.rateLimit) body['rate-limit'] = payload.packageProfile.rateLimit

      const { status, data } = await this.request('PUT', '/ip/ppp/secret', body)
      logs.push(`[REST] HTTP ${status} response=${JSON.stringify(data ?? 'empty')}`)

      if (status >= 400) {
        return {
          success: false,
          providerId: this.providerId,
          status: 'FAILED',
          executedAt,
          commandLogs: logs,
          errorMessage: `Mikrotik REST error: HTTP ${status}`,
        }
      }

      const externalRef =
        data && typeof data === 'object' && '.id' in data ? String((data as Record<string, unknown>)['.id']) : undefined

      return {
        success: true,
        providerId: this.providerId,
        status: 'ACTIVATED',
        externalReferenceId: externalRef,
        executedAt,
        commandLogs: logs,
      }
    } catch (err) {
      logs.push(`[REST] ERROR: ${err instanceof Error ? err.message : String(err)}`)
      return {
        success: false,
        providerId: this.providerId,
        status: 'FAILED',
        executedAt,
        commandLogs: logs,
        errorMessage: err instanceof Error ? err.message : String(err),
      }
    }
  }

  private async findSecretId(username: string): Promise<string | null> {
    const { data } = await this.request<Array<Record<string, unknown>>>('GET', '/ip/ppp/secret')
    if (!Array.isArray(data)) return null
    const found = data.find((item) => item.name === username || item['.id'] === username)
    if (!found) return null
    return String(found['.id'] ?? username)
  }

  async suspend(usernameRadius: string, reason?: string): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()

    try {
      const secretId = await this.findSecretId(usernameRadius)
      if (!secretId) {
        return {
          success: false,
          providerId: this.providerId,
          status: 'FAILED',
          executedAt,
          commandLogs: [...logs, `[REST] secret tidak ditemukan untuk username=${usernameRadius}`],
          errorMessage: `Secret tidak ditemukan: ${usernameRadius}`,
        }
      }

      logs.push(`[REST] PATCH /ip/ppp/secret/${secretId} disabled=true`)
      if (reason) logs.push(`[REST] reason=${reason}`)
      const { status, data } = await this.request('PATCH', `/ip/ppp/secret/${secretId}`, { disabled: true })
      logs.push(`[REST] HTTP ${status} response=${JSON.stringify(data ?? 'empty')}`)

      if (status >= 400) {
        return {
          success: false,
          providerId: this.providerId,
          status: 'FAILED',
          executedAt,
          commandLogs: logs,
          errorMessage: `Mikrotik REST error: HTTP ${status}`,
        }
      }

      return {
        success: true,
        providerId: this.providerId,
        status: 'SUSPENDED',
        externalReferenceId: secretId,
        executedAt,
        commandLogs: logs,
      }
    } catch (err) {
      logs.push(`[REST] ERROR: ${err instanceof Error ? err.message : String(err)}`)
      return {
        success: false,
        providerId: this.providerId,
        status: 'FAILED',
        executedAt,
        commandLogs: logs,
        errorMessage: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async reactivate(usernameRadius: string): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()

    try {
      const secretId = await this.findSecretId(usernameRadius)
      if (!secretId) {
        return {
          success: false,
          providerId: this.providerId,
          status: 'FAILED',
          executedAt,
          commandLogs: [...logs, `[REST] secret tidak ditemukan untuk username=${usernameRadius}`],
          errorMessage: `Secret tidak ditemukan: ${usernameRadius}`,
        }
      }

      logs.push(`[REST] PATCH /ip/ppp/secret/${secretId} disabled=false`)
      const { status, data } = await this.request('PATCH', `/ip/ppp/secret/${secretId}`, { disabled: false })
      logs.push(`[REST] HTTP ${status} response=${JSON.stringify(data ?? 'empty')}`)

      if (status >= 400) {
        return {
          success: false,
          providerId: this.providerId,
          status: 'FAILED',
          executedAt,
          commandLogs: logs,
          errorMessage: `Mikrotik REST error: HTTP ${status}`,
        }
      }

      return {
        success: true,
        providerId: this.providerId,
        status: 'REACTIVATED',
        externalReferenceId: secretId,
        executedAt,
        commandLogs: logs,
      }
    } catch (err) {
      logs.push(`[REST] ERROR: ${err instanceof Error ? err.message : String(err)}`)
      return {
        success: false,
        providerId: this.providerId,
        status: 'FAILED',
        executedAt,
        commandLogs: logs,
        errorMessage: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async terminate(usernameRadius: string): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()

    try {
      const secretId = await this.findSecretId(usernameRadius)
      if (!secretId) {
        return {
          success: false,
          providerId: this.providerId,
          status: 'FAILED',
          executedAt,
          commandLogs: [...logs, `[REST] secret tidak ditemukan untuk username=${usernameRadius}`],
          errorMessage: `Secret tidak ditemukan: ${usernameRadius}`,
        }
      }

      logs.push(`[REST] DELETE /ip/ppp/secret/${secretId}`)
      const { status, data } = await this.request('DELETE', `/ip/ppp/secret/${secretId}`)
      logs.push(`[REST] HTTP ${status} response=${JSON.stringify(data ?? 'empty')}`)

      if (status >= 400) {
        return {
          success: false,
          providerId: this.providerId,
          status: 'FAILED',
          executedAt,
          commandLogs: logs,
          errorMessage: `Mikrotik REST error: HTTP ${status}`,
        }
      }

      return {
        success: true,
        providerId: this.providerId,
        status: 'TERMINATED',
        externalReferenceId: secretId,
        executedAt,
        commandLogs: logs,
      }
    } catch (err) {
      logs.push(`[REST] ERROR: ${err instanceof Error ? err.message : String(err)}`)
      return {
        success: false,
        providerId: this.providerId,
        status: 'FAILED',
        executedAt,
        commandLogs: logs,
        errorMessage: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async checkOnlineStatus(usernameRadius: string): Promise<{
    online: boolean
    lastSeenAt?: string
    sessionUptimeSeconds?: number
  }> {
    try {
      const { data } = await this.request<Array<Record<string, unknown>>>(
        'GET',
        `/ip/ppp/active?username=${encodeURIComponent(usernameRadius)}`
      )
      const activeSession = Array.isArray(data) ? data.find((s) => s.name === usernameRadius) : null

      if (!activeSession) {
        return { online: false }
      }

      const uptimeStr = activeSession['uptime'] as string | undefined
      let uptimeSecs: number | undefined
      if (uptimeStr) {
        const parts = uptimeStr.split(':')
        if (parts.length === 3) {
          const [h, m, s] = parts
          uptimeSecs = parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10)
        }
      }

      return {
        online: true,
        lastSeenAt: new Date().toISOString(),
        sessionUptimeSeconds: uptimeSecs,
      }
    } catch {
      return { online: false }
    }
  }
}

interface Ssh2ClientModule {
  Client: new () => Ssh2Client
}

interface Ssh2Client {
  on(event: 'ready', listener: () => void): this
  on(event: 'error', listener: (err: Error) => void): this
  connect(config: Ssh2ConnectConfig): void
  end(): void
  exec(command: string, callback: (err: Error | undefined, stream: Ssh2Stream) => void): void
}

interface Ssh2ConnectConfig {
  host: string
  port: number
  username: string
  password?: string
  readyTimeout?: number
  algorithms?: {
    serverHostKey?: string[]
    kex?: string[]
    cipher?: string[]
    hmac?: string[]
  }
}

interface Ssh2Stream {
  on(event: 'close', listener: (code: number | null) => void): this
  on(event: 'data', listener: (data: Buffer) => void): this
  readonly stderr: {
    on(event: 'data', listener: (data: Buffer) => void): void
  }
}

class MikrotikSshProvider implements IRadiusActivationProvider {
  readonly providerId = 'mikrotik-ssh'
  private readonly host: string
  private readonly port: number
  private readonly username: string
  private readonly password: string
  private ssh2Module: Ssh2ClientModule | null = null
  private ssh2Promise: Promise<Ssh2ClientModule> | null = null

  constructor() {
    const host = process.env.MIKROTIK_SSH_HOST
    const username = process.env.MIKROTIK_SSH_USERNAME
    const password = process.env.MIKROTIK_SSH_PASSWORD
    const portStr = process.env.MIKROTIK_SSH_PORT

    if (!host || !username || !password) {
      throw new Error(
        'Mikrotik SSH config tidak lengkap. Set MIKROTIK_SSH_HOST, MIKROTIK_SSH_USERNAME, MIKROTIK_SSH_PASSWORD'
      )
    }

    this.host = host
    this.port = portStr ? parseInt(portStr, 10) || 22 : 22
    this.username = username
    this.password = password
  }

  private async loadSsh2(): Promise<Ssh2ClientModule> {
    if (this.ssh2Module) return this.ssh2Module
    if (this.ssh2Promise) return this.ssh2Promise

    this.ssh2Promise = (async () => {
      try {
        const mod = (await import('ssh2')) as unknown as Ssh2ClientModule
        this.ssh2Module = mod
        return mod
      } catch {
        throw new Error(
          'Dependency ssh2 belum terinstall. Jalankan `npm i ssh2` atau pakai provider mikrotik-rest.'
        )
      }
    })()

    return this.ssh2Promise
  }

  private async executeCommands(commands: string[]): Promise<{ output: string; exitCode: number }> {
    const ssh2 = await this.loadSsh2()
    const { Client } = ssh2

    return new Promise((resolve, reject) => {
      const conn = new Client()
      let output = ''

      conn
        .on('ready', () => {
          const script = commands.join('\n')
          conn.exec(script, (err, stream) => {
            if (err) {
              conn.end()
              return reject(err)
            }
            stream
              .on('close', (code: number | null) => {
                conn.end()
                resolve({ output, exitCode: code ?? 0 })
              })
              .on('data', (data: Buffer) => {
                output += data.toString()
              })
              .stderr.on('data', (data: Buffer) => {
                output += data.toString()
              })
          })
        })
        .on('error', (err) => {
          reject(err)
        })
        .connect({
          host: this.host,
          port: this.port,
          username: this.username,
          password: this.password,
          readyTimeout: 15000,
          algorithms: {
            serverHostKey: ['ssh-rsa', 'ssh-dss', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521'],
            kex: [
              'diffie-hellman-group1-sha1',
              'diffie-hellman-group14-sha1',
              'diffie-hellman-group-exchange-sha1',
              'diffie-hellman-group-exchange-sha256',
              'ecdh-sha2-nistp256',
              'ecdh-sha2-nistp384',
              'ecdh-sha2-nistp521',
            ],
            cipher: [
              'aes128-cbc',
              'aes192-cbc',
              'aes256-cbc',
              'aes128-ctr',
              'aes192-ctr',
              'aes256-ctr',
              '3des-cbc',
              'blowfish-cbc',
            ],
            hmac: ['hmac-sha1', 'hmac-sha2-256', 'hmac-sha2-512', 'hmac-md5'],
          },
        })
    })
  }

  private escapeCli(value: string | number): string {
    return String(value).replace(/"/g, '\\"').replace(/\$/g, '\\$')
  }

  async activate(payload: RadiusActivationInput): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()

    try {
      const profile = this.escapeCli(payload.packageProfile.profileName)
      const user = this.escapeCli(payload.usernameRadius)
      const pass = this.escapeCli(payload.passwordRadius)
      const subId = this.escapeCli(payload.subscriptionId)

      let cmd = `/ppp secret add name="${user}" password="${pass}" profile="${profile}" comment="${subId}" service=pppoe`
      if (payload.ipAddress) cmd += ` remote-address="${this.escapeCli(payload.ipAddress)}"`
      if (payload.packageProfile.rateLimit) cmd += ` rate-limit="${this.escapeCli(payload.packageProfile.rateLimit)}"`

      logs.push(`[SSH] ${cmd}`)

      const { output, exitCode } = await this.executeCommands([cmd])
      logs.push(`[SSH] exit-code=${exitCode}`)
      if (output.trim()) logs.push(`[SSH] output=${output.trim()}`)

      if (exitCode !== 0) {
        return {
          success: false,
          providerId: this.providerId,
          status: 'FAILED',
          executedAt,
          commandLogs: logs,
          errorMessage: output.trim() || `SSH command exited with code ${exitCode}`,
        }
      }

      return {
        success: true,
        providerId: this.providerId,
        status: 'ACTIVATED',
        externalReferenceId: `SSH-${payload.subscriptionId}-${Date.now()}`,
        executedAt,
        commandLogs: logs,
      }
    } catch (err) {
      logs.push(`[SSH] ERROR: ${err instanceof Error ? err.message : String(err)}`)
      return {
        success: false,
        providerId: this.providerId,
        status: 'FAILED',
        executedAt,
        commandLogs: logs,
        errorMessage: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async suspend(usernameRadius: string, reason?: string): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()

    try {
      const user = this.escapeCli(usernameRadius)
      const cmd = `/ppp secret disable [find name="${user}"]`
      logs.push(`[SSH] ${cmd}`)
      if (reason) logs.push(`[SSH] reason=${reason}`)

      const { output, exitCode } = await this.executeCommands([cmd])
      logs.push(`[SSH] exit-code=${exitCode}`)
      if (output.trim()) logs.push(`[SSH] output=${output.trim()}`)

      if (exitCode !== 0) {
        return {
          success: false,
          providerId: this.providerId,
          status: 'FAILED',
          executedAt,
          commandLogs: logs,
          errorMessage: output.trim() || `SSH command exited with code ${exitCode}`,
        }
      }

      return {
        success: true,
        providerId: this.providerId,
        status: 'SUSPENDED',
        executedAt,
        commandLogs: logs,
      }
    } catch (err) {
      logs.push(`[SSH] ERROR: ${err instanceof Error ? err.message : String(err)}`)
      return {
        success: false,
        providerId: this.providerId,
        status: 'FAILED',
        executedAt,
        commandLogs: logs,
        errorMessage: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async reactivate(usernameRadius: string): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()

    try {
      const user = this.escapeCli(usernameRadius)
      const cmd = `/ppp secret enable [find name="${user}"]`
      logs.push(`[SSH] ${cmd}`)

      const { output, exitCode } = await this.executeCommands([cmd])
      logs.push(`[SSH] exit-code=${exitCode}`)
      if (output.trim()) logs.push(`[SSH] output=${output.trim()}`)

      if (exitCode !== 0) {
        return {
          success: false,
          providerId: this.providerId,
          status: 'FAILED',
          executedAt,
          commandLogs: logs,
          errorMessage: output.trim() || `SSH command exited with code ${exitCode}`,
        }
      }

      return {
        success: true,
        providerId: this.providerId,
        status: 'REACTIVATED',
        executedAt,
        commandLogs: logs,
      }
    } catch (err) {
      logs.push(`[SSH] ERROR: ${err instanceof Error ? err.message : String(err)}`)
      return {
        success: false,
        providerId: this.providerId,
        status: 'FAILED',
        executedAt,
        commandLogs: logs,
        errorMessage: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async terminate(usernameRadius: string): Promise<RadiusActivationResult> {
    const logs: string[] = []
    const executedAt = new Date().toISOString()

    try {
      const user = this.escapeCli(usernameRadius)
      const cmd = `/ppp secret remove [find name="${user}"]`
      logs.push(`[SSH] ${cmd}`)

      const { output, exitCode } = await this.executeCommands([cmd])
      logs.push(`[SSH] exit-code=${exitCode}`)
      if (output.trim()) logs.push(`[SSH] output=${output.trim()}`)

      if (exitCode !== 0) {
        return {
          success: false,
          providerId: this.providerId,
          status: 'FAILED',
          executedAt,
          commandLogs: logs,
          errorMessage: output.trim() || `SSH command exited with code ${exitCode}`,
        }
      }

      return {
        success: true,
        providerId: this.providerId,
        status: 'TERMINATED',
        executedAt,
        commandLogs: logs,
      }
    } catch (err) {
      logs.push(`[SSH] ERROR: ${err instanceof Error ? err.message : String(err)}`)
      return {
        success: false,
        providerId: this.providerId,
        status: 'FAILED',
        executedAt,
        commandLogs: logs,
        errorMessage: err instanceof Error ? err.message : String(err),
      }
    }
  }

  async checkOnlineStatus(usernameRadius: string): Promise<{
    online: boolean
    lastSeenAt?: string
    sessionUptimeSeconds?: number
  }> {
    try {
      const user = this.escapeCli(usernameRadius)
      const cmd = `/ppp active print detail where name="${user}"`
      const { output, exitCode } = await this.executeCommands([cmd])

      if (exitCode !== 0 || !output.includes(usernameRadius)) {
        return { online: false }
      }

      const uptimeMatch = output.match(/uptime=(\d+):(\d+):(\d+)/)
      let uptimeSecs: number | undefined
      if (uptimeMatch) {
        const [, h, m, s] = uptimeMatch
        uptimeSecs = parseInt(h, 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10)
      }

      return {
        online: true,
        lastSeenAt: new Date().toISOString(),
        sessionUptimeSeconds: uptimeSecs,
      }
    } catch {
      return { online: false }
    }
  }
}

let cachedProvider: IRadiusActivationProvider | null = null

export function getRadiusActivationProvider(): IRadiusActivationProvider {
  if (cachedProvider) return cachedProvider

  const providerType = process.env.RADIUS_PROVIDER?.toLowerCase()

  if (providerType === 'mikrotik-rest') {
    cachedProvider = new MikrotikRestApiProvider()
    return cachedProvider
  }

  if (providerType === 'mikrotik-ssh') {
    cachedProvider = new MikrotikSshProvider()
    return cachedProvider
  }

  cachedProvider = new LocalMockRadiusProvider()
  return cachedProvider
}

export async function activateSubscriptionRadius(
  input: RadiusActivationInput
): Promise<RadiusActivationResult> {
  try {
    const provider = getRadiusActivationProvider()
    return await provider.activate(input)
  } catch (err) {
    return {
      success: false,
      providerId: 'unknown',
      status: 'FAILED',
      executedAt: new Date().toISOString(),
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function suspendSubscriptionRadius(
  username: string,
  reason?: string
): Promise<RadiusActivationResult> {
  try {
    const provider = getRadiusActivationProvider()
    return await provider.suspend(username, reason)
  } catch (err) {
    return {
      success: false,
      providerId: 'unknown',
      status: 'FAILED',
      executedAt: new Date().toISOString(),
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function reactivateSubscriptionRadius(
  username: string
): Promise<RadiusActivationResult> {
  try {
    const provider = getRadiusActivationProvider()
    return await provider.reactivate(username)
  } catch (err) {
    return {
      success: false,
      providerId: 'unknown',
      status: 'FAILED',
      executedAt: new Date().toISOString(),
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function terminateSubscriptionRadius(
  username: string
): Promise<RadiusActivationResult> {
  try {
    const provider = getRadiusActivationProvider()
    return await provider.terminate(username)
  } catch (err) {
    return {
      success: false,
      providerId: 'unknown',
      status: 'FAILED',
      executedAt: new Date().toISOString(),
      errorMessage: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function checkRadiusOnlineStatus(username: string): Promise<{
  online: boolean
  lastSeenAt?: string
  sessionUptimeSeconds?: number
}> {
  try {
    const provider = getRadiusActivationProvider()
    return await provider.checkOnlineStatus(username)
  } catch {
    return { online: false }
  }
}
