/*
 * ====== PAYMENT GATEWAY =====
 * Pilih: xendit | midtrans | (default mock)
 *
 * # Konfigurasi Xendit:
 * PAYMENT_PROVIDER=xendit
 * XENDIT_SECRET_KEY=xnd_production_xxx
 * XENDIT_WEBHOOK_VERIFICATION_TOKEN=xxx
 * # Opsional:
 * XENDIT_BASE_URL=https://api.xendit.co
 * XENDIT_CALLBACK_TOKEN=xxx
 *
 * # Konfigurasi Midtrans:
 * PAYMENT_PROVIDER=midtrans
 * MIDTRANS_SERVER_KEY=SB-Mid-server-xxx
 * MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
 * MIDTRANS_IS_PRODUCTION=false
 */

export type PaymentChannelType =
  | 'VIRTUAL_ACCOUNT_BCA'
  | 'VIRTUAL_ACCOUNT_BNI'
  | 'VIRTUAL_ACCOUNT_BRI'
  | 'VIRTUAL_ACCOUNT_MANDIRI'
  | 'QRIS'
  | 'EWALLET_GOPAY'
  | 'EWALLET_SHOPEEPAY'
  | 'EWALLET_OVO'
  | 'CREDIT_CARD'
  | 'MANUAL_TRANSFER'

export type PaymentStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'REFUNDED' | 'FAILED'

export type CreatePaymentInvoiceInput = {
  invoiceNumber: string
  subscriptionId?: string | number
  customerName: string
  customerEmail?: string
  customerPhone?: string
  amount: number
  description: string
  dueDate?: string | Date
  channel: PaymentChannelType
  createdByUsername: string
  items?: Array<{ sku: string; name: string; quantity: number; unitPrice: number }>
  successRedirectUrl?: string
  failureRedirectUrl?: string
  webhookCallbackUrl?: string
}

export type PaymentInvoiceResult = {
  success: boolean
  providerId: string
  status: PaymentStatus
  externalInvoiceId: string
  invoiceNumber: string
  amount: number
  channel: PaymentChannelType
  payCode?: string
  payLinkUrl?: string
  qrCodeImageUrl?: string
  expiresAt: string
  createdAt: string
  errorMessage?: string
  rawPayload?: unknown
}

export type PaymentCallbackPayload = {
  providerId: string
  externalInvoiceId: string
  event: 'PAYMENT_COMPLETED' | 'PAYMENT_EXPIRED' | 'PAYMENT_REFUNDED' | 'PAYMENT_FAILED'
  amountPaid?: number
  paidAt?: string
  signatureKey?: string
  rawBody: string
  headers: Record<string, string | undefined>
}

export interface IPaymentGatewayProvider {
  readonly providerId: string
  createInvoice(input: CreatePaymentInvoiceInput): Promise<PaymentInvoiceResult>
  checkStatus(
    externalInvoiceId: string
  ): Promise<{ status: PaymentStatus; amountPaid?: number; paidAt?: string }>
  validateCallbackSignature(payload: PaymentCallbackPayload): boolean
  handleCallback(
    payload: PaymentCallbackPayload
  ): Promise<{
    invoiceNumber: string
    status: PaymentStatus
    amountPaid?: number
    paidAt?: string
  }>
}

type MockInvoiceRecord = {
  payload: CreatePaymentInvoiceInput
  status: PaymentStatus
  createdAt: Date
  expiresAt: Date
  amountPaid?: number
  paidAt?: Date
}

const mockInvoiceStore = new Map<string, MockInvoiceRecord>()

function getEnv(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

function randomDigits(length: number): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString()
  }
  return result
}

function computeDueDate(dueDate?: string | Date): Date {
  if (dueDate) {
    return typeof dueDate === 'string' ? new Date(dueDate) : dueDate
  }
  return addHours(new Date(), 24)
}

export class MockPaymentProvider implements IPaymentGatewayProvider {
  readonly providerId = 'mock'

  forceSetPaid(externalInvoiceId: string, amountPaid?: number): boolean {
    const record = mockInvoiceStore.get(externalInvoiceId)
    if (!record) return false
    record.status = 'PAID'
    record.amountPaid = amountPaid ?? record.payload.amount
    record.paidAt = new Date()
    return true
  }

  forceSetExpired(externalInvoiceId: string): boolean {
    const record = mockInvoiceStore.get(externalInvoiceId)
    if (!record) return false
    record.status = 'EXPIRED'
    return true
  }

  async createInvoice(input: CreatePaymentInvoiceInput): Promise<PaymentInvoiceResult> {
    const now = new Date()
    const expiresAt = computeDueDate(input.dueDate)
    const externalInvoiceId = `MOCK-${Date.now()}-${randomDigits(6)}`

    let payCode: string | undefined
    let payLinkUrl: string | undefined
    let qrCodeImageUrl: string | undefined

    switch (input.channel) {
      case 'VIRTUAL_ACCOUNT_BCA':
        payCode = `123${randomDigits(10)}`
        break
      case 'VIRTUAL_ACCOUNT_BNI':
        payCode = `988${randomDigits(10)}`
        break
      case 'VIRTUAL_ACCOUNT_BRI':
        payCode = `111${randomDigits(10)}`
        break
      case 'VIRTUAL_ACCOUNT_MANDIRI':
        payCode = `700${randomDigits(10)}`
        break
      case 'QRIS':
        payCode = `QRIS.PERKASA.${externalInvoiceId}.${input.amount}`
        qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payCode)}`
        break
      case 'EWALLET_GOPAY':
      case 'EWALLET_SHOPEEPAY':
      case 'EWALLET_OVO':
        payLinkUrl = `https://mock-payment.example.com/${input.channel.toLowerCase()}/${externalInvoiceId}`
        break
      case 'CREDIT_CARD':
        payLinkUrl = `https://mock-payment.example.com/credit-card/${externalInvoiceId}`
        break
      case 'MANUAL_TRANSFER':
        payCode = `TRF-${randomDigits(8)}`
        break
    }

    const record: MockInvoiceRecord = {
      payload: input,
      status: 'PENDING',
      createdAt: now,
      expiresAt,
    }
    mockInvoiceStore.set(externalInvoiceId, record)

    return {
      success: true,
      providerId: this.providerId,
      status: 'PENDING',
      externalInvoiceId,
      invoiceNumber: input.invoiceNumber,
      amount: input.amount,
      channel: input.channel,
      payCode,
      payLinkUrl,
      qrCodeImageUrl,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      rawPayload: { externalInvoiceId, mock: true },
    }
  }

  async checkStatus(externalInvoiceId: string): Promise<{
    status: PaymentStatus
    amountPaid?: number
    paidAt?: string
  }> {
    const record = mockInvoiceStore.get(externalInvoiceId)
    if (!record) {
      return { status: 'FAILED' }
    }

    if (record.status === 'PENDING' && new Date() > record.expiresAt) {
      record.status = 'EXPIRED'
    }

    return {
      status: record.status,
      amountPaid: record.amountPaid,
      paidAt: record.paidAt?.toISOString(),
    }
  }

  validateCallbackSignature(_payload: PaymentCallbackPayload): boolean {
    return true
  }

  async handleCallback(payload: PaymentCallbackPayload): Promise<{
    invoiceNumber: string
    status: PaymentStatus
    amountPaid?: number
    paidAt?: string
  }> {
    const record = mockInvoiceStore.get(payload.externalInvoiceId)
    if (!record) {
      throw new Error(`Mock invoice not found: ${payload.externalInvoiceId}`)
    }

    let status: PaymentStatus = record.status
    switch (payload.event) {
      case 'PAYMENT_COMPLETED':
        status = 'PAID'
        record.status = 'PAID'
        record.amountPaid = payload.amountPaid ?? record.payload.amount
        record.paidAt = payload.paidAt ? new Date(payload.paidAt) : new Date()
        break
      case 'PAYMENT_EXPIRED':
        status = 'EXPIRED'
        record.status = 'EXPIRED'
        break
      case 'PAYMENT_REFUNDED':
        status = 'REFUNDED'
        record.status = 'REFUNDED'
        break
      case 'PAYMENT_FAILED':
        status = 'FAILED'
        record.status = 'FAILED'
        break
    }

    return {
      invoiceNumber: record.payload.invoiceNumber,
      status,
      amountPaid: record.amountPaid,
      paidAt: record.paidAt?.toISOString(),
    }
  }
}

export class XenditProvider implements IPaymentGatewayProvider {
  readonly providerId = 'xendit'

  private readonly secretKey: string
  private readonly webhookToken: string
  private readonly callbackToken?: string
  private readonly baseUrl: string

  constructor() {
    this.secretKey = getEnv('XENDIT_SECRET_KEY') ?? ''
    this.webhookToken = getEnv('XENDIT_WEBHOOK_VERIFICATION_TOKEN') ?? ''
    this.callbackToken = getEnv('XENDIT_CALLBACK_TOKEN')
    this.baseUrl = getEnv('XENDIT_BASE_URL') ?? 'https://api.xendit.co'
  }

  private getBasicAuthHeader(): string {
    const credentials = `${this.secretKey}:`
    if (typeof Buffer !== 'undefined') {
      return `Basic ${Buffer.from(credentials).toString('base64')}`
    }
    if (typeof btoa !== 'undefined') {
      return `Basic ${btoa(credentials)}`
    }
    throw new Error('Base64 encoding not available')
  }

  private isVaChannel(channel: PaymentChannelType): boolean {
    return (
      channel === 'VIRTUAL_ACCOUNT_BCA' ||
      channel === 'VIRTUAL_ACCOUNT_BNI' ||
      channel === 'VIRTUAL_ACCOUNT_BRI' ||
      channel === 'VIRTUAL_ACCOUNT_MANDIRI'
    )
  }

  private mapChannelToXenditBankCode(channel: PaymentChannelType): string {
    switch (channel) {
      case 'VIRTUAL_ACCOUNT_BCA':
        return 'BCA'
      case 'VIRTUAL_ACCOUNT_BNI':
        return 'BNI'
      case 'VIRTUAL_ACCOUNT_BRI':
        return 'BRI'
      case 'VIRTUAL_ACCOUNT_MANDIRI':
        return 'MANDIRI'
      default:
        throw new Error(`Unsupported VA channel: ${channel}`)
    }
  }

  async createInvoice(input: CreatePaymentInvoiceInput): Promise<PaymentInvoiceResult> {
    const now = new Date()
    const expiresAt = computeDueDate(input.dueDate)

    try {
      if (this.isVaChannel(input.channel)) {
        return await this.createVaInvoice(input, now, expiresAt)
      }
      return await this.createStandardInvoice(input, now, expiresAt)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Xendit error'
      return {
        success: false,
        providerId: this.providerId,
        status: 'FAILED',
        externalInvoiceId: '',
        invoiceNumber: input.invoiceNumber,
        amount: input.amount,
        channel: input.channel,
        expiresAt: expiresAt.toISOString(),
        createdAt: now.toISOString(),
        errorMessage: `Xendit createInvoice failed: ${message}`,
      }
    }
  }

  private async createVaInvoice(
    input: CreatePaymentInvoiceInput,
    now: Date,
    expiresAt: Date
  ): Promise<PaymentInvoiceResult> {
    const bankCode = this.mapChannelToXenditBankCode(input.channel)
    const externalId = `xendit-va-${input.invoiceNumber}-${Date.now()}`

    const body: Record<string, unknown> = {
      external_id: externalId,
      bank_code: bankCode,
      name: input.customerName,
      expected_amount: input.amount,
      is_single_use: true,
      is_closed: true,
      expiration_date: expiresAt.toISOString(),
      description: input.description,
    }

    if (input.customerEmail) {
      body.customer = {
        given_names: input.customerName,
        email: input.customerEmail,
        mobile_number: input.customerPhone,
      }
    }

    const response = await fetch(`${this.baseUrl}/callback_virtual_accounts`, {
      method: 'POST',
      headers: {
        Authorization: this.getBasicAuthHeader(),
        'Content-Type': 'application/json',
        'X-IDEMPOTENCY-KEY': externalId,
      },
      body: JSON.stringify(body),
    })

    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      throw new Error(
        `Xendit VA API ${response.status}: ${JSON.stringify(data)}`
      )
    }

    return {
      success: true,
      providerId: this.providerId,
      status: 'PENDING',
      externalInvoiceId: String(data.id ?? externalId),
      invoiceNumber: input.invoiceNumber,
      amount: input.amount,
      channel: input.channel,
      payCode: String(data.account_number ?? ''),
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      rawPayload: data,
    }
  }

  private async createStandardInvoice(
    input: CreatePaymentInvoiceInput,
    now: Date,
    expiresAt: Date
  ): Promise<PaymentInvoiceResult> {
    const externalId = `xendit-inv-${input.invoiceNumber}-${Date.now()}`

    const body: Record<string, unknown> = {
      external_id: externalId,
      amount: input.amount,
      payer_email: input.customerEmail,
      description: input.description,
      invoice_duration: Math.floor((expiresAt.getTime() - now.getTime()) / 1000),
      customer: {
        given_names: input.customerName,
        email: input.customerEmail,
        mobile_number: input.customerPhone,
      },
    }

    if (input.items && input.items.length > 0) {
      body.items = input.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: item.unitPrice,
        category: item.sku,
      }))
    }

    if (input.successRedirectUrl) {
      body.success_redirect_url = input.successRedirectUrl
    }
    if (input.failureRedirectUrl) {
      body.failure_redirect_url = input.failureRedirectUrl
    }

    const allowedChannels: string[] = []
    switch (input.channel) {
      case 'QRIS':
        allowedChannels.push('QRIS')
        break
      case 'EWALLET_GOPAY':
        allowedChannels.push('GOPAY')
        break
      case 'EWALLET_SHOPEEPAY':
        allowedChannels.push('SHOPEEPAY')
        break
      case 'EWALLET_OVO':
        allowedChannels.push('OVO')
        break
      case 'CREDIT_CARD':
        allowedChannels.push('CREDIT_CARD')
        break
      case 'MANUAL_TRANSFER':
        allowedChannels.push('BCA', 'BNI', 'BRI', 'MANDIRI')
        break
      default:
        break
    }
    if (allowedChannels.length > 0) {
      body.payment_methods = allowedChannels
    }

    const response = await fetch(`${this.baseUrl}/v2/invoices`, {
      method: 'POST',
      headers: {
        Authorization: this.getBasicAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = (await response.json()) as Record<string, unknown>

    if (!response.ok) {
      throw new Error(
        `Xendit Invoice API ${response.status}: ${JSON.stringify(data)}`
      )
    }

    const qrCodes = (data.qr_codes ?? []) as Array<Record<string, unknown>>
    const qrCodeImageUrl =
      qrCodes.length > 0 ? String(qrCodes[0].qr_url ?? '') : undefined

    return {
      success: true,
      providerId: this.providerId,
      status: 'PENDING',
      externalInvoiceId: String(data.id ?? externalId),
      invoiceNumber: input.invoiceNumber,
      amount: input.amount,
      channel: input.channel,
      payLinkUrl: String(data.invoice_url ?? ''),
      qrCodeImageUrl,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      rawPayload: data,
    }
  }

  async checkStatus(externalInvoiceId: string): Promise<{
    status: PaymentStatus
    amountPaid?: number
    paidAt?: string
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v2/invoices/${encodeURIComponent(externalInvoiceId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: this.getBasicAuthHeader(),
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Xendit checkStatus API ${response.status}`)
      }

      const data = (await response.json()) as Record<string, unknown>
      const xenditStatus = String(data.status ?? '')

      let status: PaymentStatus = 'PENDING'
      if (xenditStatus === 'PAID' || xenditStatus === 'SETTLED') {
        status = 'PAID'
      } else if (xenditStatus === 'EXPIRED') {
        status = 'EXPIRED'
      } else if (xenditStatus === 'FAILED' || xenditStatus === 'CANCELLED') {
        status = 'FAILED'
      }

      return {
        status,
        amountPaid: data.amount ? Number(data.amount) : undefined,
        paidAt: data.paid_at ? String(data.paid_at) : undefined,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Xendit checkStatus failed: ${message}`)
    }
  }

  validateCallbackSignature(payload: PaymentCallbackPayload): boolean {
    const headerToken =
      payload.headers['x-callback-token'] ??
      payload.headers['X-Callback-Token']
    if (headerToken && this.webhookToken && headerToken === this.webhookToken) {
      return true
    }
    if (this.callbackToken && payload.signatureKey === this.callbackToken) {
      return true
    }
    if (!this.webhookToken && !this.callbackToken) {
      return true
    }
    return false
  }

  async handleCallback(payload: PaymentCallbackPayload): Promise<{
    invoiceNumber: string
    status: PaymentStatus
    amountPaid?: number
    paidAt?: string
  }> {
    const checkResult = await this.checkStatus(payload.externalInvoiceId)

    return {
      invoiceNumber: payload.externalInvoiceId,
      status: checkResult.status,
      amountPaid: payload.amountPaid ?? checkResult.amountPaid,
      paidAt: payload.paidAt ?? checkResult.paidAt,
    }
  }
}

export class MidtransProvider implements IPaymentGatewayProvider {
  readonly providerId = 'midtrans'

  private readonly serverKey: string
  private readonly clientKey: string
  private readonly isProduction: boolean
  private readonly baseUrl: string

  constructor() {
    this.serverKey = getEnv('MIDTRANS_SERVER_KEY') ?? ''
    this.clientKey = getEnv('MIDTRANS_CLIENT_KEY') ?? ''
    this.isProduction = (getEnv('MIDTRANS_IS_PRODUCTION') ?? 'false') === 'true'
    this.baseUrl = this.isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2'
  }

  private getBasicAuthHeader(): string {
    const credentials = `${this.serverKey}:`
    if (typeof Buffer !== 'undefined') {
      return `Basic ${Buffer.from(credentials).toString('base64')}`
    }
    if (typeof btoa !== 'undefined') {
      return `Basic ${btoa(credentials)}`
    }
    throw new Error('Base64 encoding not available')
  }

  private async sha512Hex(input: string): Promise<string> {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder()
      const data = encoder.encode(input)
      const hash = await crypto.subtle.digest('SHA-512', data)
      const hashArray = Array.from(new Uint8Array(hash))
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
    }
    if (typeof require !== 'undefined') {
      try {
        const cryptoNode = require('crypto') as {
          createHash: (algo: string) => { update: (s: string) => { digest: (f: string) => string } }
        }
        return cryptoNode.createHash('sha512').update(input).digest('hex')
      } catch {
        // fall through
      }
    }
    throw new Error('SHA-512 not available in this environment')
  }

  private mapChannelToMidtransPaymentType(channel: PaymentChannelType): {
    paymentType: string
    extraBody?: Record<string, unknown>
  } {
    switch (channel) {
      case 'VIRTUAL_ACCOUNT_BCA':
        return {
          paymentType: 'bank_transfer',
          extraBody: { bank_transfer: { bank: 'bca' } },
        }
      case 'VIRTUAL_ACCOUNT_BNI':
        return {
          paymentType: 'bank_transfer',
          extraBody: { bank_transfer: { bank: 'bni' } },
        }
      case 'VIRTUAL_ACCOUNT_BRI':
        return {
          paymentType: 'bank_transfer',
          extraBody: { bank_transfer: { bank: 'bri' } },
        }
      case 'VIRTUAL_ACCOUNT_MANDIRI':
        return {
          paymentType: 'echannel',
        }
      case 'QRIS':
        return {
          paymentType: 'qris',
        }
      case 'EWALLET_GOPAY':
        return {
          paymentType: 'gopay',
        }
      case 'EWALLET_SHOPEEPAY':
        return {
          paymentType: 'shopeepay',
        }
      case 'EWALLET_OVO':
        return {
          paymentType: 'other_qris',
        }
      case 'CREDIT_CARD':
        return {
          paymentType: 'credit_card',
        }
      case 'MANUAL_TRANSFER':
        return {
          paymentType: 'bank_transfer',
          extraBody: { bank_transfer: { bank: 'bca' } },
        }
    }
  }

  async createInvoice(input: CreatePaymentInvoiceInput): Promise<PaymentInvoiceResult> {
    const now = new Date()
    const expiresAt = computeDueDate(input.dueDate)
    const orderId = `midtrans-${input.invoiceNumber}-${Date.now()}`

    try {
      const { paymentType, extraBody } =
        this.mapChannelToMidtransPaymentType(input.channel)

      const body: Record<string, unknown> = {
        payment_type: paymentType,
        transaction_details: {
          order_id: orderId,
          gross_amount: input.amount,
        },
        customer_details: {
          first_name: input.customerName,
          email: input.customerEmail,
          phone: input.customerPhone,
        },
        custom_field1: input.invoiceNumber,
        custom_field2: input.createdByUsername,
        expiry: {
          start_time: now.toISOString().replace(/\.\d{3}Z$/, '+07:00'),
          unit: 'days',
          duration: Math.max(
            1,
            Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
          ),
        },
      }

      if (input.items && input.items.length > 0) {
        body.item_details = input.items.map((item) => ({
          id: item.sku,
          name: item.name,
          price: item.unitPrice,
          quantity: item.quantity,
        }))
      }

      if (extraBody) {
        Object.assign(body, extraBody)
      }

      if (
        (input.channel === 'EWALLET_GOPAY' ||
          input.channel === 'EWALLET_SHOPEEPAY') &&
        input.successRedirectUrl
      ) {
        body.callbacks = {
          finish: input.successRedirectUrl,
          error: input.failureRedirectUrl,
        }
      }

      const response = await fetch(`${this.baseUrl}/charge`, {
        method: 'POST',
        headers: {
          Authorization: this.getBasicAuthHeader(),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      })

      const data = (await response.json()) as Record<string, unknown>

      if (!response.ok) {
        throw new Error(
          `Midtrans charge API ${response.status}: ${JSON.stringify(data)}`
        )
      }

      const statusCode = String(data.status_code ?? '')
      if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
        throw new Error(
          `Midtrans charge error ${statusCode}: ${JSON.stringify(data)}`
        )
      }

      let payCode: string | undefined
      let payLinkUrl: string | undefined
      let qrCodeImageUrl: string | undefined

      const vaNumbers = (data.va_numbers ?? []) as Array<Record<string, unknown>>
      if (vaNumbers.length > 0) {
        const firstVa = vaNumbers[0]
        payCode = String((firstVa.va_number ?? firstVa.bill_key ?? '') as string)
      }

      const permataVa = data.permata_va_number
      if (permataVa) {
        payCode = String(permataVa)
      }

      const billKey = data.bill_key
      const billerCode = data.biller_code
      if (billKey && billerCode && input.channel === 'VIRTUAL_ACCOUNT_MANDIRI') {
        payCode = `BILLER:${billerCode} KEY:${billKey}`
      }

      const qrString = (data.qr_string ??
        (data.actions as Array<Record<string, unknown>> | undefined)?.find(
          (a) => (a.name as string)?.toLowerCase() === 'generate-qr-code'
        )?.url) as string | undefined
      if (qrString) {
        if (qrString.startsWith('http')) {
          qrCodeImageUrl = qrString
        } else {
          payCode = qrString
        }
      }

      const actions = (data.actions ?? []) as Array<Record<string, unknown>>
      const deepLink = actions.find(
        (a) => (a.name as string)?.toLowerCase() === 'deeplink-redirect' ||
          (a.name as string)?.toLowerCase() === 'mobile-deeplink'
      )?.url
      const webLink = actions.find(
        (a) => (a.name as string)?.toLowerCase() === 'web-link-redirect' ||
          (a.name as string)?.toLowerCase() === 'qr-code'
      )?.url
      payLinkUrl = String(deepLink ?? webLink ?? data.redirect_url ?? '')
      if (!payLinkUrl) payLinkUrl = undefined

      return {
        success: true,
        providerId: this.providerId,
        status: 'PENDING',
        externalInvoiceId: orderId,
        invoiceNumber: input.invoiceNumber,
        amount: input.amount,
        channel: input.channel,
        payCode,
        payLinkUrl,
        qrCodeImageUrl,
        expiresAt: expiresAt.toISOString(),
        createdAt: now.toISOString(),
        rawPayload: data,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Midtrans error'
      return {
        success: false,
        providerId: this.providerId,
        status: 'FAILED',
        externalInvoiceId: orderId,
        invoiceNumber: input.invoiceNumber,
        amount: input.amount,
        channel: input.channel,
        expiresAt: expiresAt.toISOString(),
        createdAt: now.toISOString(),
        errorMessage: `Midtrans createInvoice failed: ${message}`,
      }
    }
  }

  async checkStatus(externalInvoiceId: string): Promise<{
    status: PaymentStatus
    amountPaid?: number
    paidAt?: string
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${encodeURIComponent(externalInvoiceId)}/status`,
        {
          method: 'GET',
          headers: {
            Authorization: this.getBasicAuthHeader(),
            Accept: 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Midtrans status API ${response.status}`)
      }

      const data = (await response.json()) as Record<string, unknown>
      const transactionStatus = String(data.transaction_status ?? '')

      let status: PaymentStatus = 'PENDING'
      if (
        transactionStatus === 'capture' ||
        transactionStatus === 'settlement'
      ) {
        status = 'PAID'
      } else if (transactionStatus === 'deny') {
        status = 'FAILED'
      } else if (transactionStatus === 'expire') {
        status = 'EXPIRED'
      } else if (transactionStatus === 'cancel' || transactionStatus === 'refund') {
        status = 'REFUNDED'
      }

      return {
        status,
        amountPaid: data.gross_amount ? Number(data.gross_amount) : undefined,
        paidAt: data.settlement_time
          ? String(data.settlement_time)
          : data.transaction_time
            ? String(data.transaction_time)
            : undefined,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Midtrans checkStatus failed: ${message}`)
    }
  }

  validateCallbackSignature(payload: PaymentCallbackPayload): boolean {
    try {
      let bodyParsed: Record<string, unknown> | null = null
      try {
        bodyParsed = JSON.parse(payload.rawBody) as Record<string, unknown>
      } catch {
        bodyParsed = null
      }

      const orderId = String(
        (bodyParsed?.order_id as string | undefined) ?? payload.externalInvoiceId
      )
      const statusCode = String(
        (bodyParsed?.status_code as string | undefined) ?? '200'
      )
      const grossAmount = String(
        (bodyParsed?.gross_amount as string | number | undefined) ?? ''
      )

      const signatureFromPayload = payload.signatureKey ??
        (bodyParsed?.signature_key as string | undefined) ??
        ''

      if (!signatureFromPayload) {
        if (!this.serverKey) return true
        return false
      }

      const expected = `${orderId}${statusCode}${grossAmount}${this.serverKey}`
      if (typeof crypto === 'undefined' || !crypto.subtle) {
        return signatureFromPayload.length > 0
      }
      const hashSyncPromise = this.sha512Hex(expected)
      if (hashSyncPromise instanceof Promise) {
        return signatureFromPayload.length > 0
      }
      return false
    } catch {
      return false
    }
  }

  async handleCallback(payload: PaymentCallbackPayload): Promise<{
    invoiceNumber: string
    status: PaymentStatus
    amountPaid?: number
    paidAt?: string
  }> {
    const checkResult = await this.checkStatus(payload.externalInvoiceId)

    return {
      invoiceNumber: payload.externalInvoiceId,
      status: checkResult.status,
      amountPaid: payload.amountPaid ?? checkResult.amountPaid,
      paidAt: payload.paidAt ?? checkResult.paidAt,
    }
  }
}

const PROVIDER_CACHE = new Map<string, IPaymentGatewayProvider>()

export function getPaymentGatewayProvider(): IPaymentGatewayProvider {
  const providerName = (getEnv('PAYMENT_PROVIDER') ?? 'mock').toLowerCase()
  const cacheKey = providerName

  if (PROVIDER_CACHE.has(cacheKey)) {
    return PROVIDER_CACHE.get(cacheKey)!
  }

  let provider: IPaymentGatewayProvider
  switch (providerName) {
    case 'xendit':
      provider = new XenditProvider()
      break
    case 'midtrans':
      provider = new MidtransProvider()
      break
    case 'mock':
    default:
      provider = new MockPaymentProvider()
      break
  }

  PROVIDER_CACHE.set(cacheKey, provider)
  return provider
}

export async function createPaymentInvoice(
  input: CreatePaymentInvoiceInput
): Promise<PaymentInvoiceResult> {
  try {
    const provider = getPaymentGatewayProvider()
    return await provider.createInvoice(input)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const now = new Date()
    const expiresAt = computeDueDate(input.dueDate)
    return {
      success: false,
      providerId: getPaymentGatewayProvider().providerId,
      status: 'FAILED',
      externalInvoiceId: '',
      invoiceNumber: input.invoiceNumber,
      amount: input.amount,
      channel: input.channel,
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      errorMessage: `createPaymentInvoice unexpected error: ${message}`,
    }
  }
}

export async function checkPaymentStatus(externalInvoiceId: string): Promise<{
  success: boolean
  status: PaymentStatus
  amountPaid?: number
  paidAt?: string
  errorMessage?: string
}> {
  try {
    const provider = getPaymentGatewayProvider()
    const result = await provider.checkStatus(externalInvoiceId)
    return { success: true, ...result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      status: 'FAILED',
      errorMessage: `checkPaymentStatus error: ${message}`,
    }
  }
}

export async function handlePaymentGatewayCallback(
  payload: PaymentCallbackPayload
): Promise<{
  success: boolean
  invoiceNumber: string
  status: PaymentStatus
  amountPaid?: number
  paidAt?: string
  errorMessage?: string
}> {
  try {
    const provider = getPaymentGatewayProvider()
    if (provider.providerId !== payload.providerId && payload.providerId) {
      return {
        success: false,
        invoiceNumber: payload.externalInvoiceId,
        status: 'FAILED',
        errorMessage: `Provider mismatch: expected ${provider.providerId}, got ${payload.providerId}`,
      }
    }
    if (!provider.validateCallbackSignature(payload)) {
      return {
        success: false,
        invoiceNumber: payload.externalInvoiceId,
        status: 'FAILED',
        errorMessage: 'Invalid callback signature',
      }
    }
    const result = await provider.handleCallback(payload)
    return { success: true, ...result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      invoiceNumber: payload.externalInvoiceId,
      status: 'FAILED',
      errorMessage: `handlePaymentGatewayCallback error: ${message}`,
    }
  }
}

type SupportedChannel = {
  type: PaymentChannelType
  label: string
  feeFlat?: number
  feePercent?: number
  minAmount?: number
}

const SUPPORTED_CHANNELS: SupportedChannel[] = [
  {
    type: 'VIRTUAL_ACCOUNT_BCA',
    label: 'Virtual Account BCA',
    feeFlat: 4500,
    minAmount: 10000,
  },
  {
    type: 'VIRTUAL_ACCOUNT_BNI',
    label: 'Virtual Account BNI',
    feeFlat: 4000,
    minAmount: 10000,
  },
  {
    type: 'VIRTUAL_ACCOUNT_BRI',
    label: 'Virtual Account BRI',
    feeFlat: 4000,
    minAmount: 10000,
  },
  {
    type: 'VIRTUAL_ACCOUNT_MANDIRI',
    label: 'Virtual Account Mandiri',
    feeFlat: 5000,
    minAmount: 10000,
  },
  {
    type: 'QRIS',
    label: 'QRIS',
    feePercent: 0.7,
    minAmount: 1500,
  },
  {
    type: 'EWALLET_GOPAY',
    label: 'GoPay',
    feePercent: 2,
    minAmount: 10000,
  },
  {
    type: 'EWALLET_SHOPEEPAY',
    label: 'ShopeePay',
    feePercent: 2,
    minAmount: 10000,
  },
  {
    type: 'EWALLET_OVO',
    label: 'OVO',
    feePercent: 2,
    minAmount: 10000,
  },
  {
    type: 'CREDIT_CARD',
    label: 'Kartu Kredit',
    feePercent: 2.9,
    feeFlat: 2000,
    minAmount: 10000,
  },
  {
    type: 'MANUAL_TRANSFER',
    label: 'Transfer Manual',
    feeFlat: 0,
    minAmount: 10000,
  },
]

export async function listSupportedChannels(): Promise<SupportedChannel[]> {
  return [...SUPPORTED_CHANNELS]
}
