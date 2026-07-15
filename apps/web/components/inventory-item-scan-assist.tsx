'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, ScanLine } from 'lucide-react'
import {
  extractInventoryItemCodeFromScan,
  findInventorySuggestionByCode,
} from '@/lib/inventory-barcode-utils'

type InventoryItemScanAssistProps = {
  itemSuggestions: string[]
  disabled?: boolean
  onResolved: (value: string) => void
}

type ScanFeedback = {
  tone: 'success' | 'error' | 'warning'
  message: string
}

type BarcodeDetectorResult = {
  rawValue?: string
}

type BrowserBarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>
}

type BrowserBarcodeDetector = new (options?: { formats?: string[] }) => BrowserBarcodeDetectorInstance

function getFeedbackToneClass(tone: ScanFeedback['tone']) {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-rose-200 bg-rose-50 text-rose-700'
}

export function InventoryItemScanAssist({
  itemSuggestions,
  disabled,
  onResolved,
}: InventoryItemScanAssistProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)
  const [scanValue, setScanValue] = useState('')
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraBusy, setCameraBusy] = useState(false)

  const barcodeDetectorSupported = useMemo(
    () => typeof window !== 'undefined' && 'BarcodeDetector' in window,
    [],
  )

  function stopCamera() {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setCameraReady(false)
    setCameraBusy(false)
  }

  function applyScanValue(rawValue: string, source: 'scanner' | 'camera') {
    const itemCode = extractInventoryItemCodeFromScan(rawValue)
    if (!itemCode) {
      setFeedback({
        tone: 'error',
        message: 'Hasil scan tidak dikenali. Gunakan barcode item inventory berbentuk URL internal atau kode item.',
      })
      return false
    }

    const matchedSuggestion = findInventorySuggestionByCode(itemSuggestions, itemCode)
    if (!matchedSuggestion) {
      onResolved(itemCode)
      setFeedback({
        tone: 'warning',
        message: `Kode ${itemCode} terbaca. Item akan dipakai berdasarkan kode, meski tidak muncul di daftar saran.`,
      })
      return true
    }

    onResolved(matchedSuggestion)
    setScanValue('')
    setFeedback({
      tone: 'success',
      message:
        source === 'camera'
          ? `Scan kamera berhasil. Item ${itemCode} langsung dipilih.`
          : `Scan scanner berhasil. Item ${itemCode} langsung dipilih.`,
    })
    return true
  }

  useEffect(() => {
    if (!cameraOpen || !barcodeDetectorSupported) {
      return
    }

    let canceled = false
    const BarcodeDetectorCtor = (window as unknown as { BarcodeDetector?: BrowserBarcodeDetector }).BarcodeDetector
    if (!BarcodeDetectorCtor) {
      setFeedback({
        tone: 'warning',
        message: 'Browser ini belum mendukung BarcodeDetector untuk scan kamera.',
      })
      return
    }

    async function startCamera() {
      try {
        setCameraBusy(true)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (canceled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
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
            const resolved = applyScanValue(nextValue, 'camera')
            if (!resolved) return
            stopCamera()
            setCameraOpen(false)
          } catch {
          }
        }, 650)
      } catch (error) {
        setFeedback({
          tone: 'error',
          message: error instanceof Error ? error.message : 'Kamera tidak bisa diakses dari browser ini.',
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
  }, [barcodeDetectorSupported, cameraOpen, itemSuggestions])

  useEffect(() => () => stopCamera(), [])

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Scan barang</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            Tempel hasil scan dari scanner USB atau relative URL item inventory, misalnya
            ` /inventory?itemCode=INV-202607-0001 `.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setFeedback(null)
              setCameraOpen(true)
            }}
            disabled={disabled || !barcodeDetectorSupported}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Camera className="h-4 w-4" />
            Scan Kamera
          </button>
        </div>
      </div>

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
          placeholder="Paste / scan URL relative atau kode item"
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
          Browser ini belum mendukung scan kamera otomatis. Scanner USB tetap bisa dipakai, atau buka halaman ini dari Chrome/Edge modern.
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
                  Format yang didukung: QR Code dan Code128. Hasil scan akan langsung memilih item di form.
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

            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
              <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {cameraBusy
                ? 'Mengaktifkan kamera...'
                : cameraReady
                  ? 'Kamera aktif. Arahkan barcode ke tengah frame.'
                  : 'Menunggu izin kamera...'}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
