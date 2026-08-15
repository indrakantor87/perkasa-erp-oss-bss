'use client'
/// <reference path="../shims.d.ts" />

import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

export type ActivationBAInputProps = {
  workOrderId: string | number
  subscriptionId?: string | number
  invoiceNumber?: string
  customerName: string
  packageName: string
  packageSpeedLabel: string
  addressLabel: string
  technicianName: string
  technicianUsername: string
  installationDate?: string | Date
  onCompleted?: (result: {
    baId?: string
    signedAt: string
    pdfBase64?: string
    photoUrls: { rumah?: string; ont?: string; speedtest?: string }
    signatureDataUrl?: string
    speedtest?: { downloadMbps: number; uploadMbps: number; pingMs: number; jitterMs?: number }
  }) => void
  onCancel?: () => void
}

type UploadErrors = {
  rumah?: string
  ont?: string
  speedtest?: string
}

type SpeedtestState = {
  downloadMbps: number | null
  uploadMbps: number | null
  pingMs: number | null
  jitterMs: number | null
}

type ChecklistKey =
  | 'dropcoreRapi'
  | 'ontAman'
  | 'kabelLan'
  | 'passwordWifi'
  | 'loginBerhasil'
  | 'speedtestSla'
  | 'pelangganAjarkan'
  | 'nomorCs'
  | 'stbNormal'
  | 'kardusDibawa'

const CHECKLIST_ITEMS: Array<{ key: ChecklistKey; label: string }> = [
  { key: 'dropcoreRapi', label: 'Kabel dropcore terpasang rapi & tidak menjuntai' },
  { key: 'ontAman', label: 'ONT / STB terpasang di lokasi aman & ventilasi baik' },
  { key: 'kabelLan', label: 'Kabel LAN / Patchcord ke router tersedia' },
  { key: 'passwordWifi', label: 'Password WiFi default diubah (tulis label stiker di ONT)' },
  { key: 'loginBerhasil', label: 'Login PPPoE / DHCP berhasil (status internet ON)' },
  { key: 'speedtestSla', label: 'Speedtest sesuai minimal SLA paket (Download >= komitmen 80%)' },
  { key: 'pelangganAjarkan', label: 'Pelanggan sudah diajarkan cara login router & restart ONT' },
  { key: 'nomorCs', label: 'Pelanggan mengetahui nomor WhatsApp CS 24jam' },
  { key: 'stbNormal', label: 'STB / Remote (jika include TV) diuji normal' },
  { key: 'kardusDibawa', label: 'Semua kardus & plastik packaging dibawa teknisi (tidak ditinggal di rumah pelanggan)' },
]

const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024
const CANVAS_WIDTH = 480
const CANVAS_HEIGHT = 180

function formatInstallationDate(date: string | Date | undefined): string {
  if (!date) {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}

export function SalesActivationBaForm(props: ActivationBAInputProps) {
  const [fotoRumahDataUrl, setFotoRumahDataUrl] = useState<string | undefined>(undefined)
  const [fotoOntTerpasangDataUrl, setFotoOntTerpasangDataUrl] = useState<string | undefined>(undefined)
  const [fotoSpeedtestDataUrl, setFotoSpeedtestDataUrl] = useState<string | undefined>(undefined)
  const [uploadErrors, setUploadErrors] = useState<UploadErrors>({})

  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const hasDrawnRef = useRef(false)

  const [speedtest, setSpeedtest] = useState<SpeedtestState>({
    downloadMbps: null,
    uploadMbps: null,
    pingMs: null,
    jitterMs: null,
  })

  const [checklist, setChecklist] = useState<Record<ChecklistKey, boolean>>({
    dropcoreRapi: false,
    ontAman: false,
    kabelLan: false,
    passwordWifi: false,
    loginBerhasil: false,
    speedtestSla: false,
    pelangganAjarkan: false,
    nomorCs: false,
    stbNormal: false,
    kardusDibawa: false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [])

  async function handlePhotoUpload(
    slot: 'rumah' | 'ont' | 'speedtest',
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadErrors((prev) => ({ ...prev, [slot]: undefined }))

    if (!file.type.startsWith('image/')) {
      setUploadErrors((prev) => ({ ...prev, [slot]: 'File harus berupa gambar (JPG/PNG).' }))
      return
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setUploadErrors((prev) => ({ ...prev, [slot]: 'Ukuran file maksimal 5MB.' }))
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      if (slot === 'rumah') setFotoRumahDataUrl(dataUrl)
      if (slot === 'ont') setFotoOntTerpasangDataUrl(dataUrl)
      if (slot === 'speedtest') setFotoSpeedtestDataUrl(dataUrl)
    } catch {
      setUploadErrors((prev) => ({ ...prev, [slot]: 'Gagal memuat gambar.' }))
    }
  }

  function getCanvasPoint(event: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  function handleCanvasPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(event.pointerId)
    setIsDrawing(true)
    lastPointRef.current = getCanvasPoint(event)
  }

  function handleCanvasPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const current = getCanvasPoint(event)
    const last = lastPointRef.current
    if (!last) {
      lastPointRef.current = current
      return
    }
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(current.x, current.y)
    ctx.stroke()
    lastPointRef.current = current
    hasDrawnRef.current = true
  }

  function handleCanvasPointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      canvas.releasePointerCapture(event.pointerId)
    } catch {
      // noop
    }
    setIsDrawing(false)
    lastPointRef.current = null
    if (hasDrawnRef.current) {
      setSignatureDataUrl(canvas.toDataURL('image/png'))
    }
  }

  function handleClearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setSignatureDataUrl(null)
    hasDrawnRef.current = false
  }

  function handleSpeedtestChange<K extends keyof SpeedtestState>(key: K, rawValue: string) {
    const trimmed = rawValue.trim()
    if (trimmed === '') {
      setSpeedtest((prev) => ({ ...prev, [key]: null }))
      return
    }
    const num = Number(trimmed)
    if (Number.isFinite(num)) {
      setSpeedtest((prev) => ({ ...prev, [key]: num }))
    }
  }

  function toggleChecklistItem(key: ChecklistKey) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const allPhotosReady = Boolean(fotoRumahDataUrl && fotoOntTerpasangDataUrl && fotoSpeedtestDataUrl)
  const signatureReady = signatureDataUrl !== null && signatureDataUrl.length > 0
  const checklistAllDone = CHECKLIST_ITEMS.every((item) => checklist[item.key])
  const speedtestReady =
    speedtest.downloadMbps !== null &&
    speedtest.downloadMbps >= 0.1 &&
    speedtest.uploadMbps !== null &&
    speedtest.pingMs !== null
  const canSubmit = allPhotosReady && signatureReady && checklistAllDone && speedtestReady && !isSubmitting

  async function generatePdfBase64(): Promise<string | undefined> {
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const marginLeft = 40
      const marginTop = 40
      let y = marginTop

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('[PERKASA NETWORKS]', marginLeft, y)
      y += 30

      doc.setFontSize(16)
      doc.text('BERITA ACARA AKTIVASI PELANGGAN', marginLeft, y)
      y += 20

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Work Order ID: ${String(props.workOrderId)}`, marginLeft, y)
      y += 14
      doc.text(`Tanggal: ${formatInstallationDate(props.installationDate)}`, marginLeft, y)
      y += 20

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('IDENTITAS PELANGGAN', marginLeft, y)
      y += 16
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`No. Invoice: ${props.invoiceNumber ?? '-'}`, marginLeft, y)
      y += 14
      doc.text(`Nama Pelanggan: ${props.customerName}`, marginLeft, y)
      y += 14
      doc.text(`Paket: ${props.packageName} (${props.packageSpeedLabel})`, marginLeft, y)
      y += 14
      const splitAddress = doc.splitTextToSize(`Alamat: ${props.addressLabel}`, pageWidth - marginLeft * 2)
      doc.text(splitAddress, marginLeft, y)
      y += splitAddress.length * 14
      doc.text(`Teknisi: ${props.technicianName} (${props.technicianUsername})`, marginLeft, y)
      y += 20

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('CHECKLIST PEMASANGAN', marginLeft, y)
      y += 16
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      for (const item of CHECKLIST_ITEMS) {
        doc.text(`[✓] ${item.label}`, marginLeft, y)
        y += 14
        if (y > 720) {
          doc.addPage()
          y = 40
        }
      }
      y += 10

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('HASIL SPEEDTEST', marginLeft, y)
      y += 16
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Download: ${speedtest.downloadMbps ?? '-'} Mbps`, marginLeft, y)
      y += 14
      doc.text(`Upload: ${speedtest.uploadMbps ?? '-'} Mbps`, marginLeft, y)
      y += 14
      doc.text(`Ping: ${speedtest.pingMs ?? '-'} ms`, marginLeft, y)
      y += 14
      doc.text(`Jitter: ${speedtest.jitterMs ?? '-'} ms`, marginLeft, y)
      y += 20

      doc.addPage()
      y = 40
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('FOTO BUKTI PEMASANGAN', marginLeft, y)
      y += 20

      const maxPhotoWidth = 400
      const photoYGap = 20

      if (fotoRumahDataUrl) {
        try {
          const imgH = 200
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.text('Foto Rumah (Tampak Depan)', marginLeft, y)
          y += 14
          doc.addImage(fotoRumahDataUrl, 'PNG', marginLeft, y, maxPhotoWidth, imgH, undefined, 'FAST')
          y += imgH + photoYGap
        } catch {
          y += 50
        }
      }

      if (y > 700) {
        doc.addPage()
        y = 40
      }

      if (fotoOntTerpasangDataUrl) {
        try {
          const imgH = 200
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.text('Foto ONT / STB Terpasang', marginLeft, y)
          y += 14
          doc.addImage(fotoOntTerpasangDataUrl, 'PNG', marginLeft, y, maxPhotoWidth, imgH, undefined, 'FAST')
          y += imgH + photoYGap
        } catch {
          y += 50
        }
      }

      if (y > 700) {
        doc.addPage()
        y = 40
      }

      if (fotoSpeedtestDataUrl) {
        try {
          const imgH = 200
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.text('Screenshot Speedtest', marginLeft, y)
          y += 14
          doc.addImage(fotoSpeedtestDataUrl, 'PNG', marginLeft, y, maxPhotoWidth, imgH, undefined, 'FAST')
          y += imgH + photoYGap
        } catch {
          y += 50
        }
      }

      doc.addPage()
      y = 40

      if (signatureDataUrl) {
        try {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.text('Tanda Tangan Pelanggan', marginLeft, y)
          y += 14
          doc.addImage(signatureDataUrl, 'PNG', marginLeft, y, 200, 80, undefined, 'FAST')
          y += 100
          doc.line(marginLeft, y, marginLeft + 200, y)
          y += 14
          doc.text(props.customerName, marginLeft, y)
          y += 14
          doc.text('Pelanggan', marginLeft, y)
        } catch {
          y += 140
        }
      }

      const techX = pageWidth - marginLeft - 200
      const techYTop = 40
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Tanda Tangan Teknisi', techX, techYTop)
      let techY = techYTop + 114
      doc.line(techX, techY, techX + 200, techY)
      techY += 14
      doc.text(props.technicianName, techX, techY)
      techY += 14
      doc.text('Teknisi Perkasa Networks', techX, techY)

      doc.setPage(doc.internal.pages.length)
      const footerY = doc.internal.pageSize.getHeight() - 40
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      doc.text(
        'Dokumen ini ditandatangani secara digital, berlaku sebagai bukti otentik aktivasi.',
        marginLeft,
        footerY - 14,
      )
      doc.text(
        'Support WhatsApp CS 24jam: +62 xxx-xxxx-xxxx',
        marginLeft,
        footerY,
      )

      const pdfBase64 = doc.output('datauristring')
      return typeof pdfBase64 === 'string' ? pdfBase64 : undefined
    } catch {
      return undefined
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return
    setIsSubmitting(true)

    try {
      const signedAt = new Date().toISOString()
      const pdfBase64 = await generatePdfBase64()

      const resultPayload = {
        baId: `BA-${String(props.workOrderId)}-${Date.now()}`,
        signedAt,
        pdfBase64,
        photoUrls: {
          rumah: fotoRumahDataUrl,
          ont: fotoOntTerpasangDataUrl,
          speedtest: fotoSpeedtestDataUrl,
        },
        signatureDataUrl: signatureDataUrl ?? undefined,
        speedtest: {
          downloadMbps: speedtest.downloadMbps as number,
          uploadMbps: speedtest.uploadMbps as number,
          pingMs: speedtest.pingMs as number,
          jitterMs: speedtest.jitterMs ?? undefined,
        },
      }

      props.onCompleted?.(resultPayload)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <section className="panel p-5 mb-5">
        <p className="section-title">S1. Data Dasar Aktivasi</p>
        <h2 className="mt-2 text-lg font-semibold text-ink">Informasi Pekerjaan (Readonly)</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="form-field-label">Work Order ID</span>
            <div className="form-field flex items-center bg-surface-soft">{String(props.workOrderId)}</div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="form-field-label">No. Invoice</span>
            <div className="form-field flex items-center bg-surface-soft">{props.invoiceNumber ?? '-'}</div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="form-field-label">Nama Pelanggan</span>
            <div className="form-field flex items-center bg-surface-soft">{props.customerName}</div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="form-field-label">Paket Layanan</span>
            <div className="form-field flex items-center bg-surface-soft">
              {props.packageName} — {props.packageSpeedLabel}
            </div>
          </div>
          <div className="flex flex-col gap-1 md:col-span-2">
            <span className="form-field-label">Alamat Instalasi</span>
            <div className="form-field flex items-start py-3 h-auto bg-surface-soft">{props.addressLabel}</div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="form-field-label">Teknisi</span>
            <div className="form-field flex items-center bg-surface-soft">
              {props.technicianName} ({props.technicianUsername})
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="form-field-label">Tanggal Instalasi</span>
            <div className="form-field flex items-center bg-surface-soft">{formatInstallationDate(props.installationDate)}</div>
          </div>
        </div>
      </section>

      <section className="panel p-5 mb-5">
        <p className="section-title">S2. Upload 3 Foto Bukti (Wajib Semua)</p>
        <h2 className="mt-2 text-lg font-semibold text-ink">Dokumentasi Lapangan</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {([
            {
              slot: 'rumah' as const,
              label: 'Foto Rumah (Tampak Depan + Tiang/Kabel Dropcore)',
              dataUrl: fotoRumahDataUrl,
              setter: setFotoRumahDataUrl,
              error: uploadErrors.rumah,
            },
            {
              slot: 'ont' as const,
              label: 'Foto ONT / STB Terpasang (Lampu Hijau Normal)',
              dataUrl: fotoOntTerpasangDataUrl,
              setter: setFotoOntTerpasangDataUrl,
              error: uploadErrors.ont,
            },
            {
              slot: 'speedtest' as const,
              label: 'Screenshot Speedtest',
              dataUrl: fotoSpeedtestDataUrl,
              setter: setFotoSpeedtestDataUrl,
              error: uploadErrors.speedtest,
            },
          ]).map((slot) => (
            <div key={slot.slot} className="flex flex-col gap-2">
              <span className="form-field-label">{slot.label}</span>
              <div className="rounded-lg border-2 border-dashed border-line overflow-hidden flex items-center justify-center h-48 bg-surface-soft">
                {slot.dataUrl ? (
                  <img src={slot.dataUrl} alt={slot.label} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-mute px-4 text-center">Belum ada foto (Max 5MB, JPG/PNG)</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhotoUpload(slot.slot, e)}
                className="block w-full text-xs text-mute file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-surface-strong file:text-ink hover:file:bg-accent-soft cursor-pointer"
              />
              {slot.error && <span className="text-xs text-danger-ink">{slot.error}</span>}
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5 mb-5">
        <p className="section-title">S3. Tanda Tangan Digital Pelanggan</p>
        <h2 className="mt-2 text-lg font-semibold text-ink">Paraf Asli Pelanggan</h2>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={handleClearSignature}
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface-soft px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-strong"
            >
              🖊️ {signatureDataUrl ? 'Bersihkan TTD' : 'Mulai Tanda Tangan'}
            </button>
            <span className={`text-xs ${signatureReady ? 'text-success-ink' : 'text-mute'}`}>
              {signatureReady ? '✓ Tanda tangan sudah tersimpan' : 'Silakan gambar tanda tangan pada area kanvas'}
            </span>
          </div>
          <div className="inline-block border-2 border-dashed border-line rounded-lg bg-surface-soft overflow-hidden">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerLeave={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
              className="touch-none cursor-crosshair block"
              style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, maxWidth: '100%' }}
            />
          </div>
        </div>
      </section>

      <section className="panel p-5 mb-5">
        <p className="section-title">S4. Hasil Speedtest</p>
        <h2 className="mt-2 text-lg font-semibold text-ink">Pengukuran Kualitas Jaringan</h2>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <span className="form-field-label">Download (Mbps)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={speedtest.downloadMbps ?? ''}
              onChange={(e) => handleSpeedtestChange('downloadMbps', e.target.value)}
              className="form-field"
              placeholder="Min 0.1"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="form-field-label">Upload (Mbps)</span>
            <input
              type="number"
              step="0.1"
              min="0"
              value={speedtest.uploadMbps ?? ''}
              onChange={(e) => handleSpeedtestChange('uploadMbps', e.target.value)}
              className="form-field"
              placeholder="wajib"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="form-field-label">Ping (ms)</span>
            <input
              type="number"
              step="1"
              min="0"
              value={speedtest.pingMs ?? ''}
              onChange={(e) => handleSpeedtestChange('pingMs', e.target.value)}
              className="form-field"
              placeholder="wajib"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="form-field-label">Jitter (ms)</span>
            <input
              type="number"
              step="1"
              min="0"
              value={speedtest.jitterMs ?? ''}
              onChange={(e) => handleSpeedtestChange('jitterMs', e.target.value)}
              className="form-field"
              placeholder="opsional"
            />
          </div>
        </div>
        <div className="mt-4">
          <a
            href="https://www.speedtest.net/id"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-accent bg-accent-soft px-4 py-2 text-sm font-semibold text-accent-ink hover:bg-accent hover:text-white"
          >
            ⚡ Jalankan Ookla / Speedtest Custom (Tab Baru)
          </a>
        </div>
      </section>

      <section className="panel p-5 mb-5">
        <p className="section-title">S5. Ringkasan Checklist Pemasangan</p>
        <h2 className="mt-2 text-lg font-semibold text-ink">
          Validasi Semua Item Wajib Dicentang ({CHECKLIST_ITEMS.filter((i) => checklist[i.key]).length}/
          {CHECKLIST_ITEMS.length})
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          {CHECKLIST_ITEMS.map((item) => (
            <label
              key={item.key}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                checklist[item.key]
                  ? 'bg-success-soft border-success-line'
                  : 'bg-surface border-line hover:bg-surface-soft'
              }`}
            >
              <input
                type="checkbox"
                checked={checklist[item.key]}
                onChange={() => toggleChecklistItem(item.key)}
                className="mt-1 h-4 w-4 rounded border-line text-accent focus:ring-accent"
              />
              <span className={`text-sm ${checklist[item.key] ? 'text-success-ink font-medium' : 'text-ink'}`}>
                {item.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="panel p-5 mb-5">
        <p className="section-title">S6. Finalisasi & Cetak BA</p>
        <h2 className="mt-2 text-lg font-semibold text-ink">Simpan & Generate PDF Berita Acara</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className={`flex items-center gap-2 ${allPhotosReady ? 'text-success-ink' : 'text-danger-ink'}`}>
            <span>{allPhotosReady ? '✓' : '□'}</span>
            <span>3 foto bukti sudah terupload</span>
          </div>
          <div className={`flex items-center gap-2 ${signatureReady ? 'text-success-ink' : 'text-danger-ink'}`}>
            <span>{signatureReady ? '✓' : '□'}</span>
            <span>Tanda tangan pelanggan sudah ada</span>
          </div>
          <div className={`flex items-center gap-2 ${checklistAllDone ? 'text-success-ink' : 'text-danger-ink'}`}>
            <span>{checklistAllDone ? '✓' : '□'}</span>
            <span>Checklist pemasangan 100% selesai</span>
          </div>
          <div className={`flex items-center gap-2 ${speedtestReady ? 'text-success-ink' : 'text-danger-ink'}`}>
            <span>{speedtestReady ? '✓' : '□'}</span>
            <span>Speedtest valid (Down/Up/Ping terisi)</span>
          </div>
        </div>
        <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="text-xs text-mute">
            Catatan: jsPDF akan di-load secara dinamis. Jika package belum terinstall, PDF akan dilewati namun form tetap bisa submit.
          </div>
          <div className="flex flex-wrap gap-3">
            {props.onCancel && (
              <button
                type="button"
                onClick={props.onCancel}
                disabled={isSubmitting}
                className="rounded-lg border border-line bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface-soft disabled:opacity-50"
              >
                Batal
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-lg bg-panel text-surface px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-line disabled:text-mute transition"
            >
              {isSubmitting ? 'Memproses...' : '✅ Simpan & Cetak BA Aktivasi'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default SalesActivationBaForm
