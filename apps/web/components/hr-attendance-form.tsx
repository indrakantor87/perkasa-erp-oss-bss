'use client'

import type { FormEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type HrAttendanceFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  employeeSuggestions: string[]
  geofenceConfig?: {
    locationName: string
    latitude: string
    longitude: string
    radiusMeters: string
    isRequired: boolean
    notes: string
  } | null
  faceConfig?: {
    isRequired: boolean
    verificationMode: string
    notes: string
  } | null
}

const attendanceStatusOptions = ['PRESENT', 'SICK', 'PERMIT', 'ALPHA'] as const

function extractEmployeeCode(value: string) {
  return value.split('|')[0]?.trim() ?? ''
}

function buildFaceCaptureRef(employeeCode: string) {
  const base = employeeCode || 'employee'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `face-${base}-${timestamp}`
}

export function HrAttendanceForm({
  canCreate,
  reviewDbReady,
  employeeSuggestions,
  geofenceConfig,
  faceConfig,
}: HrAttendanceFormProps) {
  const router = useRouter()
  const [employeeValue, setEmployeeValue] = useState(employeeSuggestions[0] ?? '')
  const [attendanceDate, setAttendanceDate] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [capturingLocation, setCapturingLocation] = useState(false)
  const [locationFeedback, setLocationFeedback] = useState<string | null>(null)
  const [faceVerificationMode, setFaceVerificationMode] = useState(faceConfig?.verificationMode ?? 'MANUAL_REVIEW')
  const [faceCaptureRef, setFaceCaptureRef] = useState('')
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [facePreviewUrl, setFacePreviewUrl] = useState('')
  const [cameraFeedback, setCameraFeedback] = useState<string | null>(null)
  const [status, setStatus] = useState<(typeof attendanceStatusOptions)[number]>('PRESENT')
  const [overtimeHours, setOvertimeHours] = useState('0')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  function stopCamera() {
    const stream = streamRef.current
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsCameraOpen(false)
  }

  useEffect(() => {
    if (faceVerificationMode !== 'CAMERA_CAPTURE') {
      stopCamera()
    }
  }, [faceVerificationMode])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  async function handleStartCamera() {
    if (isDisabled || isStartingCamera) return
    if (!globalThis.navigator?.mediaDevices?.getUserMedia) {
      setCameraFeedback('Browser ini belum mendukung akses kamera.')
      return
    }

    setIsStartingCamera(true)
    setCameraFeedback(null)

    try {
      stopCamera()

      const stream = await globalThis.navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => null)
      }

      setIsCameraOpen(true)
      setCameraFeedback('Kamera browser aktif. Ambil snapshot wajah untuk mengisi referensi verifikasi.')
    } catch {
      setCameraFeedback('Kamera browser gagal dibuka. Anda masih bisa memakai referensi manual.')
    } finally {
      setIsStartingCamera(false)
    }
  }

  function handleCaptureFace() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) {
      setCameraFeedback('Canvas atau video kamera belum siap.')
      return
    }

    const width = video.videoWidth || 640
    const height = video.videoHeight || 480
    if (!width || !height) {
      setCameraFeedback('Video kamera belum siap untuk di-capture.')
      return
    }

    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) {
      setCameraFeedback('Context canvas tidak tersedia untuk capture wajah.')
      return
    }

    context.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    const employeeCode = extractEmployeeCode(employeeValue)
    const captureRef = buildFaceCaptureRef(employeeCode)

    setFacePreviewUrl(dataUrl)
    setFaceCaptureRef(captureRef)
    setCameraFeedback(`Snapshot wajah berhasil diambil dengan referensi ${captureRef}.`)
  }

  async function handleGetCurrentLocation() {
    if (isDisabled || capturingLocation) return
    if (!globalThis.navigator?.geolocation) {
      setLocationFeedback('Browser ini belum mendukung geolocation.')
      return
    }

    setCapturingLocation(true)
    setLocationFeedback(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        globalThis.navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10_000,
          maximumAge: 0,
        })
      })

      setLatitude(position.coords.latitude.toFixed(7))
      setLongitude(position.coords.longitude.toFixed(7))
      setLocationFeedback('Lokasi saat ini berhasil diambil dari browser.')
    } catch {
      setLocationFeedback('Lokasi browser gagal diambil. Anda masih bisa mengisi latitude/longitude manual.')
    } finally {
      setCapturingLocation(false)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const employeeCode = extractEmployeeCode(employeeValue)
    if (!employeeCode) {
      setFeedback({
        tone: 'error',
        message: 'Pilih employee yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employeeCode,
          attendanceDate: attendanceDate || null,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          latitude: latitude || null,
          longitude: longitude || null,
          faceVerificationMode,
          faceCaptureRef: faceCaptureRef || null,
          status,
          overtimeHours,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Attendance HR gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Attendance HR berhasil disimpan.',
      })
      setAttendanceDate('')
      setCheckIn('')
      setCheckOut('')
      setLatitude('')
      setLongitude('')
      setFaceVerificationMode(faceConfig?.verificationMode ?? 'MANUAL_REVIEW')
      setFaceCaptureRef('')
      setFacePreviewUrl('')
      setCameraFeedback(null)
      stopCamera()
      setLocationFeedback(null)
      setStatus('PRESENT')
      setOvertimeHours('0')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action HR</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Catat attendance
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action attendance dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini mencatat attendance harian dari employee yang sudah ada agar kehadiran mulai langsung bisa direview di domain HR.'}
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Roadmap Attendance</p>
        <h4 className="mt-2 text-base font-semibold text-slate-950">Tahap berikutnya: kamera wajah dan radius lokasi</h4>
        <p className="mt-3 text-sm leading-6 text-mute">
          Fondasi form saat ini sudah mulai mendukung capture lokasi browser untuk validasi radius check-in.
          Requirement ERP berikutnya tetap akan menambahkan verifikasi kamera dengan pengenalan wajah.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Face attendance: foundation ready</span>
          <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Radius attendance: foundation ready</span>
          <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">Geofence titik kerja: foundation ready</span>
        </div>
        {faceConfig ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">Face attendance aktif: {faceConfig.verificationMode}</p>
            <p className="mt-1">{faceConfig.isRequired ? 'Wajib saat check-in' : 'Masih opsional'}</p>
            <p className="mt-1 text-mute">{faceConfig.notes || 'Belum ada catatan tambahan.'}</p>
          </div>
        ) : null}
        {geofenceConfig ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">Geofence aktif: {geofenceConfig.locationName}</p>
            <p className="mt-1">
              Radius {geofenceConfig.radiusMeters} meter • {geofenceConfig.isRequired ? 'Wajib saat check-in' : 'Masih opsional'}
            </p>
            <p className="mt-1 text-mute">
              Titik: {geofenceConfig.latitude}, {geofenceConfig.longitude}
            </p>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Employee</span>
          <input
            list="hr-attendance-employee-suggestions"
            value={employeeValue}
            onChange={(event) => setEmployeeValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="EMP-202607-0001 | Nama Karyawan"
            required
            disabled={isDisabled}
          />
          <datalist id="hr-attendance-employee-suggestions">
            {employeeSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tanggal Attendance</span>
          <input
            type="date"
            value={attendanceDate}
            onChange={(event) => setAttendanceDate(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof attendanceStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {attendanceStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Check In</span>
          <input
            type="datetime-local"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Check Out</span>
          <input
            type="datetime-local"
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Overtime Hours</span>
          <input
            value={overtimeHours}
            onChange={(event) => setOvertimeHours(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="0 atau 1.5"
            disabled={isDisabled}
          />
        </label>

        <div className="rounded-2xl border border-line bg-slate-50 p-4 lg:col-span-2">
          <p className="text-sm font-semibold text-slate-950">Verifikasi wajah</p>
          <p className="mt-1 text-sm text-mute">
            Fondasi saat ini menyimpan referensi capture/manual review wajah. Recognition engine penuh akan menyusul di fase berikutnya.
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Mode verifikasi</span>
              <select
                value={faceVerificationMode}
                onChange={(event) => setFaceVerificationMode(event.target.value)}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                disabled={isDisabled}
              >
                <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
                <option value="CAMERA_CAPTURE">CAMERA_CAPTURE</option>
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Referensi verifikasi wajah</span>
              <input
                value={faceCaptureRef}
                onChange={(event) => setFaceCaptureRef(event.target.value)}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="Contoh: selfie-browser-2026-07-09-0801 atau manual-review-admin"
                disabled={isDisabled}
              />
            </label>
          </div>

          {faceVerificationMode === 'CAMERA_CAPTURE' ? (
            <div className="mt-4 rounded-2xl border border-line bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Kamera browser</p>
                  <p className="mt-1 text-sm text-mute">
                    Capture ini masih tahap fondasi. Snapshot digunakan untuk membuat referensi verifikasi sebelum matching wajah penuh diaktifkan.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    disabled={isDisabled || isStartingCamera}
                    className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    {isStartingCamera ? 'Membuka Kamera...' : isCameraOpen ? 'Restart Kamera' : 'Buka Kamera'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCaptureFace}
                    disabled={isDisabled || !isCameraOpen}
                    className="rounded-full border border-line bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Capture Wajah
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    disabled={isDisabled || !isCameraOpen}
                    className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                  >
                    Tutup Kamera
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <div className="overflow-hidden rounded-2xl border border-line bg-slate-950">
                  <video ref={videoRef} className="aspect-video w-full object-cover" autoPlay playsInline muted />
                </div>
                <div className="overflow-hidden rounded-2xl border border-line bg-slate-50">
                  {facePreviewUrl ? (
                    <img src={facePreviewUrl} alt="Preview capture wajah" className="aspect-video w-full object-cover" />
                  ) : (
                    <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-mute">
                      Preview snapshot wajah akan muncul di sini setelah tombol `Capture Wajah` ditekan.
                    </div>
                  )}
                </div>
              </div>

              {cameraFeedback ? <div className="mt-3 text-sm text-mute">{cameraFeedback}</div> : null}
              <canvas ref={canvasRef} className="hidden" />
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-line bg-slate-50 p-4 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">Lokasi check-in browser</p>
              <p className="mt-1 text-sm text-mute">
                Ambil lokasi jika attendance perlu divalidasi dengan radius kerja. Latitude/longitude juga bisa diisi manual.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isDisabled || capturingLocation}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {capturingLocation ? 'Mengambil Lokasi...' : 'Ambil Lokasi Saat Ini'}
            </button>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Latitude</span>
              <input
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="-6.7482000"
                disabled={isDisabled}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Longitude</span>
              <input
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="111.0385000"
                disabled={isDisabled}
              />
            </label>
          </div>

          {locationFeedback ? <div className="mt-3 text-sm text-mute">{locationFeedback}</div> : null}
        </div>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Attendance akan menolak duplikasi employee pada tanggal yang sama agar data harian tetap konsisten.
            {geofenceConfig?.isRequired ? ' Jika geofence aktif wajib, check-in tanpa lokasi valid akan ditolak.' : ''}
            {faceConfig?.isRequired ? ' Jika face attendance wajib, referensi verifikasi wajah harus diisi.' : ''}
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Attendance...' : 'Simpan Attendance'}
          </button>
        </div>
      </form>

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}
    </section>
  )
}
