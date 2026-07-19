'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, ScanLine } from 'lucide-react'
import {
  extractInventoryItemCodeFromScan,
  findInventorySuggestionByCode,
} from '@/lib/inventory-barcode-utils'

type InventoryItemScanAssistProps = {
  itemSuggestions: string[]
  disabled?: boolean
  onResolved: (value: string) => void
  guidancePreset?: 'inventory_handover' | 'noc_lifecycle' | 'request_completion' | 'loan_handover'
}

type ScanFeedback = {
  tone: 'success' | 'error' | 'warning'
  message: string
}

type CameraPreference = 'environment' | 'user'

type VideoInputOption = {
  deviceId: string
  label: string
}

type CameraOverlayFeedback = {
  tone: 'idle' | 'detecting' | 'success' | 'warning'
  message: string
}

type BarcodeDetectorResult = {
  rawValue?: string
}

type BrowserBarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>
}

type BrowserBarcodeDetector = new (options?: { formats?: string[] }) => BrowserBarcodeDetectorInstance

type AudioContextLike = {
  createOscillator: () => {
    type: string
    frequency: { value: number }
    connect: (node: unknown) => void
    start: () => void
    stop: (when?: number) => void
  }
  createGain: () => {
    gain: {
      value: number
      setValueAtTime: (value: number, time: number) => void
      exponentialRampToValueAtTime: (value: number, time: number) => void
    }
    connect: (node: unknown) => void
  }
  destination: unknown
  currentTime: number
}

function getFeedbackToneClass(tone: ScanFeedback['tone']) {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

function getGuidanceContent(preset: InventoryItemScanAssistProps['guidancePreset']) {
  switch (preset) {
    case 'inventory_handover':
      return {
        badge: 'GA / Inventory',
        title: 'Pastikan barcode barang atau rak dipindai saat serah terima stok.',
        points: [
          'Pakai scan ini saat barang keluar dari gudang atau dipindahkan antar lokasi.',
          'Cocokkan barcode dengan item fisik sebelum stok dinyatakan keluar.',
        ],
      }
    case 'noc_lifecycle':
      return {
        badge: 'NOC & Teknisi',
        title: 'Gunakan scan untuk check-in NOC, delegasi ke teknisi, dan validasi balik dari lapangan.',
        points: [
          'NOC memindai barcode saat menerima perangkat dari inventory dan saat menyerahkan ke teknisi.',
          'Teknisi memindai barcode yang sama saat pemasangan, replace, atau pengembalian ke NOC.',
        ],
      }
    case 'request_completion':
      return {
        badge: 'Request Barang',
        title: 'Scan dipakai untuk memastikan item yang diserahkan benar sebelum request ditandai selesai.',
        points: [
          'Gunakan barcode rak atau item yang benar-benar keluar untuk menutup request.',
          'Pastikan kode hasil scan sama dengan item yang diminta teknisi atau unit kerja.',
        ],
      }
    case 'loan_handover':
      return {
        badge: 'Pinjaman',
        title: 'Scan dipakai saat barang pinjaman keluar dari GA dan saat pengembalian diproses.',
        points: [
          'Pindai barcode sebelum barang pinjaman diserahkan ke peminjam.',
          'Gunakan barcode yang sama saat barang kembali agar histori pinjaman tetap utuh.',
        ],
      }
    default:
      return null
  }
}

function triggerDeviceSuccessFeedback() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(60)
    }
  } catch {
  }

  try {
    const AudioContextCtor = (
      window as unknown as {
        AudioContext?: new () => AudioContextLike
        webkitAudioContext?: new () => AudioContextLike
      }
    ).AudioContext
      ?? (
        window as unknown as {
          webkitAudioContext?: new () => AudioContextLike
        }
      ).webkitAudioContext

    if (!AudioContextCtor) {
      return
    }

    const audioContext = new AudioContextCtor()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gainNode.gain.setValueAtTime(0.001, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.05, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12)

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.12)
  } catch {
  }
}

export function InventoryItemScanAssist({
  itemSuggestions,
  disabled,
  onResolved,
  guidancePreset,
}: InventoryItemScanAssistProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)
  const closeCameraTimeoutRef = useRef<number | null>(null)
  const [scanValue, setScanValue] = useState('')
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraBusy, setCameraBusy] = useState(false)
  const [barcodeDetectorSupported, setBarcodeDetectorSupported] = useState(false)
  const [cameraPreference, setCameraPreference] = useState<CameraPreference>('environment')
  const [videoInputOptions, setVideoInputOptions] = useState<VideoInputOption[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [cameraOverlayFeedback, setCameraOverlayFeedback] = useState<CameraOverlayFeedback>({
    tone: 'idle',
    message: 'Arahkan barcode ke dalam bingkai hijau agar kamera mulai membaca.',
  })
  const guidanceContent = getGuidanceContent(guidancePreset)

  function stopCamera() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (closeCameraTimeoutRef.current !== null) {
      window.clearTimeout(closeCameraTimeoutRef.current)
      closeCameraTimeoutRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraReady(false)
    setCameraBusy(false)
    setCameraOverlayFeedback({
      tone: 'idle',
      message: 'Arahkan barcode ke dalam bingkai hijau agar kamera mulai membaca.',
    })
  }

  async function loadVideoInputs() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const nextOptions = devices
        .filter((device) => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label?.trim() || `Kamera ${index + 1}`,
        }))

      setVideoInputOptions(nextOptions)
    } catch {
    }
  }

  function applyScanValue(rawValue: string, source: 'scanner' | 'camera') {
    const itemCode = extractInventoryItemCodeFromScan(rawValue)
    if (!itemCode) {
      setFeedback({
        tone: 'error',
        message: 'Hasil scan tidak dikenali. Gunakan barcode inventory yang dipindai lewat kamera atau tempel URL/kode item hasil scan.',
      })
      return false
    }

    const matchedSuggestion = findInventorySuggestionByCode(itemSuggestions, itemCode)
    if (!matchedSuggestion) {
      onResolved(itemCode)
      triggerDeviceSuccessFeedback()
      setFeedback({
        tone: 'warning',
        message: `Kode ${itemCode} terbaca. Item akan dipakai berdasarkan kode, meski tidak muncul di daftar saran.`,
      })
      return true
    }

    onResolved(matchedSuggestion)
    triggerDeviceSuccessFeedback()
    setScanValue('')
    setFeedback({
      tone: 'success',
      message:
        source === 'camera'
          ? `Scan kamera berhasil. Item ${itemCode} langsung dipilih.`
          : `Hasil scan barcode diterima. Item ${itemCode} langsung dipilih.`,
    })
    return true
  }

  useEffect(() => {
    setBarcodeDetectorSupported(typeof window !== 'undefined' && 'BarcodeDetector' in window)
  }, [])

  useEffect(() => {
    if (!cameraOpen || !barcodeDetectorSupported) {
      return
    }

    let canceled = false
    const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: BrowserBarcodeDetector }).BarcodeDetector
    if (!BarcodeDetectorCtor) {
      setFeedback({
        tone: 'warning',
        message: 'Browser ini belum mendukung pembacaan barcode langsung dari kamera. Buka dari Chrome/Edge modern di HP atau PC/laptop.',
      })
      return
    }

    async function startCamera() {
      try {
        stopCamera()
        setCameraBusy(true)
        setCameraReady(false)
        setCameraOverlayFeedback({
          tone: 'idle',
          message: 'Mengaktifkan kamera dan menunggu barcode masuk ke bingkai.',
        })
        const videoConstraints = selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : { facingMode: cameraPreference }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false,
        })
        if (canceled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        await loadVideoInputs()
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setCameraReady(true)

        const BarcodeDetectorClass = BarcodeDetectorCtor as BrowserBarcodeDetector
        const detector = new BarcodeDetectorClass({ formats: ['qr_code', 'code_128'] })
        intervalRef.current = window.setInterval(async () => {
          if (!videoRef.current) return
          try {
            const results = await detector.detect(videoRef.current)
            const nextValue = results[0]?.rawValue?.trim()
            if (!nextValue) return
            const detectedItemCode = extractInventoryItemCodeFromScan(nextValue)
            const matchedSuggestion = detectedItemCode
              ? findInventorySuggestionByCode(itemSuggestions, detectedItemCode)
              : null
            setCameraOverlayFeedback({
              tone: 'detecting',
              message: detectedItemCode
                ? `Barcode terdeteksi: ${detectedItemCode}`
                : 'Barcode terdeteksi. Sedang mencocokkan item inventory.',
            })
            const resolved = applyScanValue(nextValue, 'camera')
            if (!resolved) return
            if (intervalRef.current !== null) {
              window.clearInterval(intervalRef.current)
              intervalRef.current = null
            }
            setCameraOverlayFeedback({
              tone: matchedSuggestion || !detectedItemCode ? 'success' : 'warning',
              message: matchedSuggestion
                ? `Scan berhasil: ${detectedItemCode}`
                : detectedItemCode
                  ? `Barcode terbaca: ${detectedItemCode}. Item dipakai berdasarkan kode.`
                  : 'Scan berhasil. Item inventory langsung dipilih.',
            })
            closeCameraTimeoutRef.current = window.setTimeout(() => {
              stopCamera()
              setCameraOpen(false)
            }, 850)
          } catch {
          }
        }, 650)
      } catch (error) {
        setFeedback({
          tone: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Kamera tidak bisa diakses dari browser ini. Coba izinkan kamera HP/webcam atau pakai browser lain.',
        })
        setCameraOpen(false)
      } finally {
        setCameraBusy(false)
      }
    }

    void startCamera()

    return () => {
      canceled = true
      stopCamera()
    }
  }, [barcodeDetectorSupported, cameraOpen, cameraPreference, itemSuggestions, selectedDeviceId])

  useEffect(() => () => stopCamera(), [])

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Scan barang</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Barcode dipakai sebagai media scan pengganti infrared, jadi cukup gunakan kamera HP, webcam
            laptop, atau kamera eksternal di PC. Jika perlu, tempel juga hasil scan berupa URL internal atau
            kode item, misalnya ` /inventory?itemCode=INV-202607-0001 `.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setFeedback(null)
              setCameraPreference('environment')
              setSelectedDeviceId('')
              setCameraOpen(true)
            }}
            disabled={disabled || !barcodeDetectorSupported}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Camera className="h-4 w-4" />
            Buka Kamera
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
        Scan barcode bisa dilakukan langsung dari kamera HP atau kamera eksternal pada PC/laptop. Infrared
        tidak dibutuhkan untuk flow ini.
      </div>

      {guidanceContent ? (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
              {guidanceContent.badge}
            </span>
            <span className="font-semibold text-violet-950">{guidanceContent.title}</span>
          </div>
          <div className="mt-2 space-y-1 text-sm leading-6">
            {guidanceContent.points.map((item) => (
              <p key={item}>- {item}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={scanValue}
          onChange={(event) => setScanValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            applyScanValue(scanValue, 'scanner')
          }}
          disabled={disabled}
          placeholder="Tempel hasil scan barcode, URL internal, atau kode item inventory"
          className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
        />
        <button
          type="button"
          onClick={() => applyScanValue(scanValue, 'scanner')}
          disabled={disabled || !scanValue.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <ScanLine className="h-4 w-4" />
          Pakai Hasil Scan
        </button>
      </div>

      {!barcodeDetectorSupported ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Browser ini belum mendukung scan kamera otomatis. Buka halaman ini dari Chrome/Edge modern di HP
          atau PC/laptop, atau tempel hasil scan barcode secara manual.
        </div>
      ) : null}

      {feedback ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${getFeedbackToneClass(feedback.tone)}`}>
          {feedback.message}
        </div>
      ) : null}

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Tutup scan kamera"
            className="absolute inset-0"
            onClick={() => {
              stopCamera()
              setCameraOpen(false)
            }}
          />
          <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Scan Kamera</p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">Arahkan kamera ke barcode item</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Gunakan kamera HP, webcam laptop, atau kamera eksternal PC untuk membaca barcode. Format yang
                  didukung: QR Code dan Code128. Infrared tidak dibutuhkan untuk flow ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopCamera()
                  setCameraOpen(false)
                }}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Tutup
              </button>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
              <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
              <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-4">
                <div
                  className={
                    cameraOverlayFeedback.tone === 'success'
                      ? 'rounded-full border border-emerald-300/80 bg-emerald-500/85 px-4 py-2 text-center text-xs font-semibold tracking-[0.08em] text-white shadow-lg shadow-emerald-950/30'
                      : cameraOverlayFeedback.tone === 'warning'
                        ? 'rounded-full border border-amber-300/80 bg-amber-500/90 px-4 py-2 text-center text-xs font-semibold tracking-[0.08em] text-white shadow-lg shadow-amber-950/30'
                      : cameraOverlayFeedback.tone === 'detecting'
                        ? 'rounded-full border border-sky-300/80 bg-sky-500/85 px-4 py-2 text-center text-xs font-semibold tracking-[0.08em] text-white shadow-lg shadow-sky-950/30'
                        : 'rounded-full border border-white/20 bg-slate-950/65 px-4 py-2 text-center text-xs font-medium tracking-[0.08em] text-white'
                  }
                >
                  {cameraOverlayFeedback.message}
                </div>
              </div>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.05)_0%,rgba(15,23,42,0.38)_100%)]" />
                <div className="relative w-[68%] max-w-[420px] rounded-[28px] border border-white/70 shadow-[0_0_0_9999px_rgba(2,6,23,0.18)]">
                  <div className="absolute -left-1.5 -top-1.5 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-emerald-300" />
                  <div className="absolute -right-1.5 -top-1.5 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-emerald-300" />
                  <div className="absolute -bottom-1.5 -left-1.5 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-emerald-300" />
                  <div className="absolute -bottom-1.5 -right-1.5 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-emerald-300" />
                  <div className="aspect-[1.9/1] w-full rounded-[24px] bg-white/[0.03]" />
                  <div className="absolute left-1/2 top-1/2 h-[2px] w-[72%] -translate-x-1/2 -translate-y-1/2 bg-emerald-300/80 shadow-[0_0_18px_rgba(110,231,183,0.75)]" />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
                <div className="rounded-full border border-white/20 bg-slate-950/65 px-4 py-2 text-center text-xs font-medium tracking-[0.08em] text-white">
                  Posisikan barcode di dalam bingkai hijau agar kamera lebih cepat membaca
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">Arah Kamera</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDeviceId('')
                      setCameraPreference('environment')
                    }}
                    className={
                      cameraPreference === 'environment' && !selectedDeviceId
                        ? 'rounded-full border border-slate-950 bg-slate-950 px-3 py-2 text-xs font-semibold text-white'
                        : 'rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700'
                    }
                  >
                    Kamera Belakang
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDeviceId('')
                      setCameraPreference('user')
                    }}
                    className={
                      cameraPreference === 'user' && !selectedDeviceId
                        ? 'rounded-full border border-slate-950 bg-slate-950 px-3 py-2 text-xs font-semibold text-white'
                        : 'rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700'
                    }
                  >
                    Kamera Depan
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">
                    Webcam / Kamera Eksternal
                  </span>
                  <select
                    value={selectedDeviceId}
                    onChange={(event) => setSelectedDeviceId(event.target.value)}
                    className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                  >
                    <option value="">Gunakan kamera default perangkat</option>
                    {videoInputOptions.map((item) => (
                      <option key={item.deviceId} value={item.deviceId}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {cameraBusy
                ? 'Mengaktifkan kamera...'
                : cameraReady
                  ? 'Kamera aktif. Arahkan barcode ke tengah frame sampai item terbaca otomatis.'
                  : 'Menunggu izin kamera HP/webcam...'}
            </div>

            <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Prioritaskan kamera belakang di HP untuk barcode fisik. Jika memakai PC/laptop, pilih webcam
              atau kamera eksternal yang paling dekat dengan barcode agar fokus lebih cepat terkunci.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
