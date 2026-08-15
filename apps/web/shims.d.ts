declare var process: any

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}

declare module 'mysql2/promise' {
  const mod: any
  export = mod
}

declare module 'node:assert/strict' {
  const mod: any
  export = mod
}

declare module 'next/link' {
  const Link: any
  export default Link
}

declare module 'next/navigation' {
  export function useRouter(): any
  export function usePathname(): string
  export function redirect(url: string): never
  export function notFound(): never
}

declare module 'next/server' {
  export const NextResponse: any
  export type NextRequest = any
  export type NextProxy = any
  export type ProxyConfig = any
  export type NextFetchEvent = any
}

declare module 'lucide-react' {
  export const Bell: any
  export const Camera: any
  export const Search: any
  export const Download: any
  export const Link2: any
  export const Upload: any
  export const Pencil: any
  export const Plus: any
  export const ScanLine: any
  export const Trash2: any
  export const Map: any
  export const BadgeDollarSign: any
  export const BriefcaseBusiness: any
  export const ClipboardList: any
  export const LayoutDashboard: any
  export const ShieldCheck: any
  export const SquareKanban: any
  export const Users: any
  export const Warehouse: any
  export const Wrench: any
  export type LucideIcon = any
}

declare module 'qrcode' {
  const QRCode: any
  export default QRCode
}

declare module 'jspdf' {
  export type JsPDFOrientation = 'portrait' | 'landscape'
  export type JsPDFUnit = 'pt' | 'mm' | 'cm' | 'in' | 'px' | 'pc' | 'em' | 'ex'
  export type JsPDFFormat =
    | 'a0' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6'
    | 'b0' | 'b1' | 'b2' | 'b3' | 'b4' | 'b5'
    | 'c0' | 'c1' | 'c2' | 'c3' | 'c4' | 'c5'
    | 'letter' | 'government-letter' | 'legal' | 'junior-legal' | 'ledger' | 'tabloid' | 'credit-card'
    | readonly [number, number]
    | [number, number]

  export interface JsPDFOptions {
    orientation?: JsPDFOrientation
    unit?: JsPDFUnit
    format?: JsPDFFormat
    compress?: boolean
    precision?: number
    filters?: unknown[]
    userUnit?: number
    encryption?: unknown
    putOnlyUsedFonts?: boolean
    hotfixes?: string[] | readonly string[]
    floatPrecision?: number
  }

  export interface JsPDFInternalPageSize {
    getWidth(): number
    getHeight(): number
  }

  export class jsPDF {
    constructor(options?: JsPDFOptions)

    readonly internal: {
      pageSize: JsPDFInternalPageSize
      pages: unknown[]
    }

    setFontSize(size: number): this
    setFont(fontName: string, fontStyle?: string): this
    setTextColor(r: number, g: number, b: number): this
    setTextColor(gray: number): this
    setDrawColor(r: number, g: number, b: number): this
    setDrawColor(gray: number): this
    setFillColor(r: number, g: number, b: number): this
    setFillColor(gray: number): this
    setLineWidth(width: number): this

    text(text: string | string[], x: number, y: number, options?: unknown): this
    line(x1: number, y1: number, x2: number, y2: number): this
    rect(x: number, y: number, w: number, h: number, style?: 'S' | 'F' | 'DF' | 'FD'): this

    addImage(
      imageData: string | HTMLImageElement | HTMLCanvasElement | Uint8Array | unknown,
      format: string,
      x: number,
      y: number,
      w?: number,
      h?: number,
      alias?: string,
      compression?: 'NONE' | 'FAST' | 'MEDIUM' | 'SLOW',
      rotation?: number,
    ): this

    addPage(
      format?: JsPDFFormat,
      orientation?: JsPDFOrientation,
    ): this

    output(type: 'arraybuffer'): ArrayBuffer
    output(type: 'blob'): Blob
    output(type: 'bloburinary'): Blob
    output(type: 'dataurlnewwindow', options?: unknown): string | null
    output(type: 'dataurlstring', options?: unknown): string
    output(type: 'datauristring', options?: unknown): string
    output(type: 'dataurl', options?: unknown): string | null
    output(type: string, options?: unknown): unknown

    save(filename?: string, options?: unknown): unknown
  }
}

declare module 'ssh2' {
  export interface ConnectConfig {
    host?: string
    port?: number
    username?: string
    password?: string
    privateKey?: string | Buffer
    passphrase?: string
    readyTimeout?: number
    keepaliveInterval?: number
    keepaliveCountMax?: number
    algorithms?: Record<string, unknown>
    strictVendor?: boolean
    compress?: boolean | 'force'
    debug?: (info: string) => void
  }

  export interface ClientChannel {
    write(data: string | Buffer): boolean
    end(data?: string | Buffer): void
    on(event: 'close', listener: (hadError: boolean) => void): this
    on(event: 'data', listener: (data: Buffer | string) => void): this
    on(event: 'exit', listener: (code: number | null, signalName: string | null, didCoreDump: boolean, description: string | null) => void): this
    on(event: 'end', listener: () => void): this
    on(event: string, listener: (...args: unknown[]) => void): this
    stderr?: {
      on(event: 'data', listener: (data: Buffer | string) => void): this
    }
  }

  export class Client {
    connect(config: ConnectConfig): this
    on(event: 'ready', listener: () => void): this
    on(event: 'error', listener: (err: Error) => void): this
    on(event: 'end', listener: () => void): this
    on(event: 'close', listener: (hadError: boolean) => void): this
    on(event: string, listener: (...args: unknown[]) => void): this
    exec(command: string, options: unknown, callback: (err: Error | undefined, channel: ClientChannel) => void): void
    shell(options: unknown, callback: (err: Error | undefined, channel: ClientChannel) => void): void
    sftp(callback: (err: Error | undefined, sftp: unknown) => void): void
    end(): void
    destroy(): void
  }
}

declare module 'nodemailer' {
  export interface TransportOptions {
    host?: string
    port?: number
    secure?: boolean
    auth?: {
      user: string
      pass: string
    }
    tls?: Record<string, unknown>
    requireTLS?: boolean
    ignoreTLS?: boolean
    name?: string
    localAddress?: string
    connectionTimeout?: number
    greetingTimeout?: number
    socketTimeout?: number
    priority?: string
  }

  export interface SendMailOptions {
    from?: string
    to?: string | string[]
    cc?: string | string[]
    bcc?: string | string[]
    subject?: string
    text?: string
    html?: string
    attachments?: unknown[]
    alternatives?: unknown[]
    headers?: Record<string, unknown>
    messageId?: string
    date?: Date | string
    encoding?: string
    raw?: string | Buffer
  }

  export interface SentMessageInfo {
    accepted: string[]
    rejected: string[]
    pending: string[]
    response: string
    envelope: Record<string, unknown>
    messageId: string
  }

  export interface Transporter {
    sendMail(mailOptions: SendMailOptions, callback?: (err: Error | null, info: SentMessageInfo) => void): Promise<SentMessageInfo>
    verify(callback?: (err: Error | null, success: boolean) => void): Promise<boolean>
    close(): void
  }

  export function createTransport(options: TransportOptions, defaults?: unknown): Transporter
  export function createTransport(transport?: unknown, defaults?: unknown): Transporter
  export function getTestMessageUrl(info: SentMessageInfo): string | false
}

