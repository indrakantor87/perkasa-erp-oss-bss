'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type HrAttendanceGeofenceFormProps = {
  canUpdate: boolean
  reviewDbReady: boolean
  initialConfig?: {
    locationName: string
    latitude: string
    longitude: string
    radiusMeters: string
    isRequired: boolean
    notes: string
  } | null
}

export function HrAttendanceGeofenceForm({
  canUpdate,
  reviewDbReady,
  initialConfig,
}: HrAttendanceGeofenceFormProps) {
  const router = useRouter()
  const [locationName, setLocationName] = useState(initialConfig?.locationName ?? '')
  const [latitude, setLatitude] = useState(initialConfig?.latitude ?? '')
  const [longitude, setLongitude] = useState(initialConfig?.longitude ?? '')
  const [radiusMeters, setRadiusMeters] = useState(initialConfig?.radiusMeters ?? '100')
  const [isRequired, setIsRequired] = useState(initialConfig?.isRequired ?? false)
  const [notes, setNotes] = useState(initialConfig?.notes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canUpdate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/hr/attendance/geofence', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationName,
          latitude,
          longitude,
          radiusMeters,
          isRequired,
          notes,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Konfigurasi geofence attendance gagal disimpan.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Konfigurasi geofence attendance berhasil diperbarui.',
      })
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Attendance Geofence</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Atur titik kerja dan radius attendance
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canUpdate
          ? 'Role aktif belum memiliki izin update pada domain HR.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi konfigurasi geofence attendance dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menyiapkan titik kerja attendance agar check-in web bisa divalidasi dengan radius lokasi secara non-intrusive sebelum fase face recognition dimulai.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Nama titik kerja</span>
          <input
            value={locationName}
            onChange={(event) => setLocationName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Kantor Pusat Pati"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Latitude</span>
          <input
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="-6.7482000"
            required
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
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Radius meter</span>
          <input
            value={radiusMeters}
            onChange={(event) => setRadiusMeters(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="100"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Wajib validasi lokasi</span>
          <select
            value={isRequired ? '1' : '0'}
            onChange={(event) => setIsRequired(event.target.value === '1')}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            <option value="0">Opsional dulu</option>
            <option value="1">Wajib saat check-in</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: geofence kantor utama untuk check-in staff backoffice."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Konfigurasi ini menjadi fondasi validasi radius attendance web. Face recognition tetap berada di fase berikutnya.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan Geofence...' : 'Simpan Geofence Attendance'}
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
