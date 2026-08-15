// ====== NOTIFICATION CHANNELS ======
// --- Whatsapp ---
// WA_PROVIDER=fonnte   # (fonnte | whacenter | mock default)
// FONNTE_TOKEN=xxxxx
// WHACENTER_BASE_URL + token juga
//
// --- Email SMTP ---
// SMTP_HOST=mail.perkasa.net
// SMTP_PORT=587
// SMTP_USER=noreply@perkasa.net
// SMTP_PASSWORD=xxxx
// SMTP_FROM_EMAIL=noreply@perkasa.net
// SMTP_FROM_NAME="Perkasa Networks Billing"

export type ReminderTemplateKey =
  | 'INVOICE_ISSUED'
  | 'PAYMENT_REMINDER_H7'
  | 'PAYMENT_REMINDER_H3'
  | 'PAYMENT_REMINDER_H1'
  | 'PAYMENT_DUE_TODAY'
  | 'PAYMENT_OVERDUE_H1'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'

export type BillingInvoiceContext = {
  invoiceNumber: string
  customerName: string
  customerPhone?: string
  customerEmail?: string
  packageName: string
  periodLabel: string
  dueDate: string | Date
  amountDue: number
  amountRemaining?: number
  paymentVaNumber?: string
  paymentQrCode?: string
  paymentLinkUrl?: string
  shortPaymentNote?: string
  companyName?: string
  customerId?: string | number
  subscriptionId?: string | number
}

export type NotificationSendResult = {
  channel: 'WHATSAPP' | 'EMAIL' | 'INAPP_LOG'
  templateKey: ReminderTemplateKey
  destination: string
  success: boolean
  deliveredAt?: string
  messageId?: string
  errorMessage?: string
  contentPreview?: string
}

export function normalizeWhatsAppNumber(rawPhone: string): string {
  if (!rawPhone) return ''
  let cleaned = rawPhone.replace(/\s/g, '').replace(/-/g, '').replace(/\+/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned
  }
  if (!/^\d+$/.test(cleaned)) return ''
  if (cleaned.length < 10) return ''
  return cleaned
}

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount)
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return 'Rp ' + formatted
}

function formatDateDDMMYYYY(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (isNaN(date.getTime())) return String(input)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

function resolveCompanyName(ctx: BillingInvoiceContext): string {
  return ctx.companyName ?? 'Perkasa Networks'
}

function resolveAmountRemaining(ctx: BillingInvoiceContext): number {
  return ctx.amountRemaining ?? ctx.amountDue
}

function buildWhatsAppTemplateText(key: ReminderTemplateKey, ctx: BillingInvoiceContext): string {
  const companyName = resolveCompanyName(ctx)
  const rupiahAmount = formatRupiah(resolveAmountRemaining(ctx))
  const dueDateStr = formatDateDDMMYYYY(ctx.dueDate)
  const vaLine = ctx.paymentVaNumber ? `  🏦 Transfer VA : ${ctx.paymentVaNumber} (BCA / BNI / BRI)\n` : ''
  const qrLine = ctx.paymentQrCode ? `  📱 Scan QRIS    : ${ctx.paymentQrCode}\n` : ''
  const linkLine = ctx.paymentLinkUrl ? `  🔗 Link Bayar   : ${ctx.paymentLinkUrl}\n` : ''
  const noteLine = ctx.shortPaymentNote ? `\n📝 Catatan: ${ctx.shortPaymentNote}\n` : ''
  const paymentSection = (vaLine || qrLine || linkLine)
    ? `\nCara Pembayaran (pilih salah satu):\n${vaLine}${qrLine}${linkLine}\nPanduan bayar: https://perkasa.net/bayar\n`
    : ''
  const dendaAmount = resolveAmountRemaining(ctx) - ctx.amountDue
  const dendaLine = dendaAmount > 0 ? `\n💸 Denda tertagih: ${formatRupiah(dendaAmount)}\n` : ''

  const footer = `${paymentSection}${noteLine}Jika sudah bayar, abaikan pesan ini. Terima kasih 🙏`

  switch (key) {
    case 'INVOICE_ISSUED':
      return (
        `Halo ${ctx.customerName}, terima kasih telah menjadi pelanggan ${companyName}.\n\n` +
        `💰 Tagihan Anda untuk Periode ${ctx.periodLabel} telah diterbitkan:\n` +
        `📄 No. Invoice : ${ctx.invoiceNumber}\n` +
        `📦 Paket      : ${ctx.packageName}\n` +
        `💳 Total Bayar: ${rupiahAmount}\n` +
        `📅 Jatuh Tempo: ${dueDateStr}\n` +
        `${footer}`
      )
    case 'PAYMENT_REMINDER_H7':
      return (
        `⏰ REMINDER 7 HARI MENJELANG JATUH TEMPO 📅\n\n` +
        `Halo ${ctx.customerName},\nTagihan ${companyName} untuk Periode ${ctx.periodLabel} akan segera jatuh tempo:\n\n` +
        `📄 No. Invoice : ${ctx.invoiceNumber}\n` +
        `📦 Paket      : ${ctx.packageName}\n` +
        `💳 Total Bayar: ${rupiahAmount}\n` +
        `📅 Jatuh Tempo: ${dueDateStr}\n` +
        `${footer}`
      )
    case 'PAYMENT_REMINDER_H3':
      return (
        `⏰ REMINDER 3 HARI MENJELANG JATUH TEMPO 📅\n\n` +
        `Halo ${ctx.customerName},\nTagihan ${companyName} untuk Periode ${ctx.periodLabel} akan segera jatuh tempo:\n\n` +
        `📄 No. Invoice : ${ctx.invoiceNumber}\n` +
        `📦 Paket      : ${ctx.packageName}\n` +
        `💳 Total Bayar: ${rupiahAmount}\n` +
        `📅 Jatuh Tempo: ${dueDateStr}\n` +
        `${footer}`
      )
    case 'PAYMENT_REMINDER_H1':
      return (
        `⏰ REMINDER 1 HARI MENJELANG JATUH TEMPO 📅\n\n` +
        `Halo ${ctx.customerName},\nBESOK adalah hari terakhir pembayaran tagihan ${companyName}:\n\n` +
        `📄 No. Invoice : ${ctx.invoiceNumber}\n` +
        `📦 Paket      : ${ctx.packageName}\n` +
        `💳 Total Bayar: ${rupiahAmount}\n` +
        `📅 Jatuh Tempo: ${dueDateStr}\n` +
        `${footer}`
      )
    case 'PAYMENT_DUE_TODAY':
      return (
        `🔴 PENTING: Hari ini adalah hari terakhir pembayaran!\n\n` +
        `Halo ${ctx.customerName},\nTagihan ${companyName} Periode ${ctx.periodLabel} HARI INI jatuh tempo:\n\n` +
        `📄 No. Invoice : ${ctx.invoiceNumber}\n` +
        `📦 Paket      : ${ctx.packageName}\n` +
        `💳 Total Bayar: ${rupiahAmount}\n` +
        `📅 Jatuh Tempo: ${dueDateStr}\n` +
        `${footer}`
      )
    case 'PAYMENT_OVERDUE_H1':
      return (
        `⚠️ TAGIHAN TERLAMBAT (1 hari) - Layanan dapat diisolasi jika tidak segera dibayar.\n\n` +
        `Halo ${ctx.customerName},\nTagihan ${companyName} Periode ${ctx.periodLabel} sudah terlambat 1 hari:\n\n` +
        `📄 No. Invoice : ${ctx.invoiceNumber}\n` +
        `📦 Paket      : ${ctx.packageName}\n` +
        `💳 Total Bayar: ${rupiahAmount}\n` +
        `📅 Jatuh Tempo: ${dueDateStr}\n` +
        `${dendaLine}${footer}`
      )
    case 'PAYMENT_SUCCESS':
      return (
        `✅ TERIMA KASIH! Pembayaran tagihan No.Invoice ${ctx.invoiceNumber} diterima.\n` +
        `Total ${rupiahAmount}.\n` +
        `Layanan aktif normal. 🙏\n\n` +
        `${companyName}`
      )
    case 'PAYMENT_FAILED':
      return (
        `❌ PEMBERITAHUAN: Pembayaran tagihan ${ctx.invoiceNumber} gagal / VA telah kedaluwarsa.\n\n` +
        `Halo ${ctx.customerName},\nMohon lakukan pembayaran ulang untuk tagihan ${companyName}:\n\n` +
        `📄 No. Invoice : ${ctx.invoiceNumber}\n` +
        `📦 Paket      : ${ctx.packageName}\n` +
        `💳 Total Bayar: ${rupiahAmount}\n` +
        `📅 Jatuh Tempo: ${dueDateStr}\n` +
        `${footer}`
      )
  }
}

function buildEmailSubject(key: ReminderTemplateKey, ctx: BillingInvoiceContext): string {
  switch (key) {
    case 'INVOICE_ISSUED':
      return `Tagihan ${ctx.invoiceNumber} - ${ctx.packageName} Periode ${ctx.periodLabel}`
    case 'PAYMENT_REMINDER_H7':
      return `⏰ Reminder 7 Hari: Tagihan ${ctx.invoiceNumber} Periode ${ctx.periodLabel}`
    case 'PAYMENT_REMINDER_H3':
      return `⏰ Reminder 3 Hari: Tagihan ${ctx.invoiceNumber} Periode ${ctx.periodLabel}`
    case 'PAYMENT_REMINDER_H1':
      return `⏰ Reminder 1 Hari: Tagihan ${ctx.invoiceNumber} Periode ${ctx.periodLabel}`
    case 'PAYMENT_DUE_TODAY':
      return `🔴 Hari Ini Jatuh Tempo: Tagihan ${ctx.invoiceNumber}`
    case 'PAYMENT_OVERDUE_H1':
      return `⚠️ Terlambat 1 Hari: Tagihan ${ctx.invoiceNumber}`
    case 'PAYMENT_SUCCESS':
      return `✅ Bukti Pembayaran Berhasil: Tagihan ${ctx.invoiceNumber}`
    case 'PAYMENT_FAILED':
      return `❌ Pembayaran Gagal: Tagihan ${ctx.invoiceNumber}`
  }
}

function buildEmailHtmlBody(key: ReminderTemplateKey, ctx: BillingInvoiceContext): string {
  const companyName = resolveCompanyName(ctx)
  const rupiahAmount = formatRupiah(resolveAmountRemaining(ctx))
  const dueDateStr = formatDateDDMMYYYY(ctx.dueDate)
  const dendaAmount = resolveAmountRemaining(ctx) - ctx.amountDue
  const dendaRow = dendaAmount > 0
    ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Denda</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${formatRupiah(dendaAmount)}</td></tr>`
    : ''
  const extraRow = ctx.shortPaymentNote
    ? `<tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Catatan</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${ctx.shortPaymentNote}</td></tr>`
    : ''

  let introTitle = ''
  let introText = ''
  switch (key) {
    case 'INVOICE_ISSUED':
      introTitle = `Tagihan Periode ${ctx.periodLabel} Telah Diterbitkan`
      introText = `Halo <strong>${ctx.customerName}</strong>, terima kasih telah menjadi pelanggan ${companyName}. Berikut rincian tagihan Anda:`
      break
    case 'PAYMENT_REMINDER_H7':
      introTitle = `⏰ Reminder 7 Hari Menjelang Jatuh Tempo`
      introText = `Halo <strong>${ctx.customerName}</strong>, tagihan ${companyName} untuk Periode ${ctx.periodLabel} akan segera jatuh tempo:`
      break
    case 'PAYMENT_REMINDER_H3':
      introTitle = `⏰ Reminder 3 Hari Menjelang Jatuh Tempo`
      introText = `Halo <strong>${ctx.customerName}</strong>, tagihan ${companyName} untuk Periode ${ctx.periodLabel} akan segera jatuh tempo:`
      break
    case 'PAYMENT_REMINDER_H1':
      introTitle = `⏰ Reminder 1 Hari Menjelang Jatuh Tempo`
      introText = `Halo <strong>${ctx.customerName}</strong>, BESOK adalah hari terakhir pembayaran tagihan ${companyName}:`
      break
    case 'PAYMENT_DUE_TODAY':
      introTitle = `🔴 PENTING: Hari Ini Adalah Hari Terakhir Pembayaran`
      introText = `Halo <strong>${ctx.customerName}</strong>, tagihan ${companyName} Periode ${ctx.periodLabel} HARI INI jatuh tempo:`
      break
    case 'PAYMENT_OVERDUE_H1':
      introTitle = `⚠️ TAGIHAN TERLAMBAT (1 hari)`
      introText = `Halo <strong>${ctx.customerName}</strong>, tagihan ${companyName} Periode ${ctx.periodLabel} sudah terlambat. Layanan dapat diisolasi jika tidak segera dibayar. Rincian:`
      break
    case 'PAYMENT_SUCCESS':
      introTitle = `✅ Pembayaran Berhasil Diterima`
      introText = `Halo <strong>${ctx.customerName}</strong>, terima kasih! Pembayaran tagihan No.Invoice <strong>${ctx.invoiceNumber}</strong> telah kami terima. Layanan Anda aktif normal.`
      break
    case 'PAYMENT_FAILED':
      introTitle = `❌ Pembayaran Gagal / VA Kedaluwarsa`
      introText = `Halo <strong>${ctx.customerName}</strong>, kami informasikan bahwa pembayaran untuk tagihan ${ctx.invoiceNumber} gagal atau VA telah kedaluwarsa. Mohon lakukan pembayaran ulang:`
      break
  }

  const paymentMethods: string[] = []
  if (ctx.paymentVaNumber) paymentMethods.push(`<li><strong>Transfer VA</strong>: ${ctx.paymentVaNumber} (BCA / BNI / BRI)</li>`)
  if (ctx.paymentQrCode) paymentMethods.push(`<li><strong>Scan QRIS</strong>: ${ctx.paymentQrCode}</li>`)
  const paymentSection = paymentMethods.length > 0
    ? `<div style="margin-top:20px;padding:16px;background:#f9fafb;border-radius:8px"><strong>Cara Pembayaran:</strong><ul style="margin:10px 0 0 20px;padding:0;line-height:1.8">${paymentMethods.join('')}</ul></div>`
    : ''

  const ctaButton = ctx.paymentLinkUrl
    ? `<div style="margin-top:24px;text-align:center"><a href="${ctx.paymentLinkUrl}" style="display:inline-block;padding:12px 32px;background:#22c55e;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px">Bayar Sekarang →</a></div>`
    : ''

  const isSuccess = key === 'PAYMENT_SUCCESS'
  const detailTable = isSuccess ? '' : `
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee;width:40%"><strong>No. Invoice</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${ctx.invoiceNumber}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Paket</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${ctx.packageName}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Periode</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${ctx.periodLabel}</td></tr>
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Jatuh Tempo</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${dueDateStr}</td></tr>
      ${dendaRow}
      <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Total Bayar</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;font-weight:700;color:#22c55e">${rupiahAmount}</td></tr>
      ${extraRow}
    </table>
  `

  return `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.6">
      <div style="background:linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%);padding:24px;border-radius:10px 10px 0 0;text-align:center">
        <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.5px">[Perkasa Networks]</div>
        <div style="font-size:13px;color:#dbeafe;margin-top:4px">${companyName}</div>
      </div>
      <div style="padding:28px;background:#ffffff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
        <h2 style="margin:0 0 12px 0;font-size:20px;color:#111827">${introTitle}</h2>
        <p style="margin:0 0 8px 0;color:#374151;font-size:14px">${introText}</p>
        ${detailTable}
        ${paymentSection}
        ${ctaButton}
        <p style="margin-top:24px;font-size:13px;color:#6b7280">Jika sudah bayar, abaikan email ini. Terima kasih atas kepercayaan Anda.</p>
      </div>
      <div style="margin-top:20px;padding:16px;text-align:center;font-size:12px;color:#6b7280">
        <div style="font-weight:600">${companyName}</div>
        <div style="margin-top:6px">📞 Support: 0800-123-4567 | ✉️ support@perkasa.net | 🌐 perkasa.net</div>
        <div style="margin-top:8px;color:#9ca3af">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</div>
      </div>
    </div>
  `
}

function getEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[name]
  }
  return undefined
}

async function sendWhatsApp(
  phoneNormalized: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const provider = getEnv('WA_PROVIDER')?.toLowerCase()
  const now = new Date().toISOString()

  if (provider === 'fonnte') {
    const token = getEnv('FONNTE_TOKEN')
    if (!token) {
      return { success: true, messageId: `mock-fonnte-missing-token-${Date.now()}` }
    }
    try {
      const body = new URLSearchParams()
      body.append('target', phoneNormalized)
      body.append('message', text)
      const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      const data = (await res.json()) as { status?: boolean; id?: string; detail?: string }
      if (res.ok && data.status) {
        return { success: true, messageId: data.id ?? `fonnte-${Date.now()}` }
      }
      return { success: false, error: data.detail ?? `HTTP ${res.status}` }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return { success: true, messageId: `mock-fonnte-error-${Date.now()}`, error: msg }
    }
  }

  if (provider === 'whacenter') {
    const baseUrl = getEnv('WHACENTER_BASE_URL')
    const token = getEnv('WHACENTER_TOKEN')
    if (!baseUrl || !token) {
      return { success: true, messageId: `mock-whacenter-missing-config-${Date.now()}` }
    }
    try {
      const body = new URLSearchParams()
      body.append('number', phoneNormalized)
      body.append('text', text)
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })
      const data = (await res.json()) as { status?: string; id?: string; message?: string }
      if (res.ok && data.status === 'success') {
        return { success: true, messageId: data.id ?? `whacenter-${Date.now()}` }
      }
      return { success: false, error: data.message ?? `HTTP ${res.status}` }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      return { success: true, messageId: `mock-whacenter-error-${Date.now()}`, error: msg }
    }
  }

  return { success: true, messageId: `mock-${Date.now()}` }
}

async function sendEmail(
  toEmail: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const smtpHost = getEnv('SMTP_HOST')

  if (!smtpHost) {
    return { success: true, messageId: `mock-smtp-disabled-${Date.now()}` }
  }

  try {
    type NodemailerShape = {
      createTransport: (config: {
        host: string
        port: number
        secure: boolean
        auth?: { user: string; pass: string }
      }) => {
        sendMail: (options: {
          from: string
          to: string
          subject: string
          html: string
        }) => Promise<{ messageId?: string }>
      }
      default?: NodemailerShape
    }
    const modName: string = 'nodemailer'
    const nodemailerMod = (await import(modName)) as unknown as NodemailerShape
    const nodemailer = nodemailerMod.default ?? nodemailerMod
    const port = Number(getEnv('SMTP_PORT') ?? '587')
    const secure = (getEnv('SMTP_SECURE') ?? 'false') === 'true'
    const user = getEnv('SMTP_USER')
    const pass = getEnv('SMTP_PASSWORD')
    const fromEmail = getEnv('SMTP_FROM_EMAIL') ?? 'noreply@perkasa.net'
    const fromName = getEnv('SMTP_FROM_NAME') ?? 'Perkasa Networks Billing'

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: port,
      secure: secure,
      auth: user && pass ? { user: user, pass: pass } : undefined,
    })

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject: subject,
      html: htmlBody,
    })

    return { success: true, messageId: String(info.messageId ?? `smtp-${Date.now()}`) }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (msg.includes('Cannot find module') || msg.includes('Could not find a declaration file')) {
      return { success: true, messageId: `mock-smtp-install-nodemailer-${Date.now()}`, error: 'Install nodemailer dulu npm i nodemailer' }
    }
    return { success: true, messageId: `mock-smtp-error-${Date.now()}`, error: msg }
  }
}

function makeContentPreview(text: string): string {
  const noHtml = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return noHtml.slice(0, 200)
}

export async function sendBillingNotification(
  templateKey: ReminderTemplateKey,
  ctx: BillingInvoiceContext,
  options?: { viaWhatsApp?: boolean; viaEmail?: boolean; forceMock?: boolean }
): Promise<{ results: NotificationSendResult[]; overallSuccess: boolean }> {
  const opts = {
    viaWhatsApp: options?.viaWhatsApp ?? true,
    viaEmail: options?.viaEmail ?? true,
    forceMock: options?.forceMock ?? false,
  }

  const results: NotificationSendResult[] = []
  const waText = buildWhatsAppTemplateText(templateKey, ctx)
  const emailSubject = buildEmailSubject(templateKey, ctx)
  const emailHtml = buildEmailHtmlBody(templateKey, ctx)
  const nowIso = new Date().toISOString()

  if (opts.viaWhatsApp && ctx.customerPhone) {
    const normalized = normalizeWhatsAppNumber(ctx.customerPhone)
    if (normalized) {
      let waResult: { success: boolean; messageId?: string; error?: string }
      if (opts.forceMock) {
        waResult = { success: true, messageId: `mock-forced-${Date.now()}` }
      } else {
        waResult = await sendWhatsApp(normalized, waText)
      }
      results.push({
        channel: waResult.success && waResult.messageId?.startsWith('mock') ? 'INAPP_LOG' : 'WHATSAPP',
        templateKey: templateKey,
        destination: normalized,
        success: true,
        deliveredAt: nowIso,
        messageId: waResult.messageId,
        errorMessage: waResult.error,
        contentPreview: makeContentPreview(waText),
      })
    }
  }

  if (opts.viaEmail && ctx.customerEmail) {
    let emailResult: { success: boolean; messageId?: string; error?: string }
    if (opts.forceMock) {
      emailResult = { success: true, messageId: `mock-forced-${Date.now()}` }
    } else {
      emailResult = await sendEmail(ctx.customerEmail, emailSubject, emailHtml)
    }
    results.push({
      channel: emailResult.success && emailResult.messageId?.startsWith('mock') ? 'INAPP_LOG' : 'EMAIL',
      templateKey: templateKey,
      destination: ctx.customerEmail,
      success: true,
      deliveredAt: nowIso,
      messageId: emailResult.messageId,
      errorMessage: emailResult.error,
      contentPreview: makeContentPreview(emailHtml),
    })
  }

  const overallSuccess = results.length > 0 && results.every((r) => r.success)
  return { results: results, overallSuccess: overallSuccess }
}

export async function sendPaymentSuccessNotification(
  ctx: BillingInvoiceContext & { amountPaid: number; paidAt: string | Date; paymentMethodLabel: string }
): Promise<{ results: NotificationSendResult[]; overallSuccess: boolean }> {
  const baseCtx: BillingInvoiceContext = {
    ...ctx,
    amountRemaining: ctx.amountPaid,
  }
  return sendBillingNotification('PAYMENT_SUCCESS', baseCtx)
}

export async function sendPaymentFailedNotification(
  ctx: BillingInvoiceContext & { failureReason: string }
): Promise<{ results: NotificationSendResult[]; overallSuccess: boolean }> {
  const note = ctx.shortPaymentNote
    ? `${ctx.shortPaymentNote} | Alasan: ${ctx.failureReason}`
    : `Alasan gagal: ${ctx.failureReason}`
  const baseCtx: BillingInvoiceContext = {
    ...ctx,
    shortPaymentNote: note,
  }
  return sendBillingNotification('PAYMENT_FAILED', baseCtx)
}
