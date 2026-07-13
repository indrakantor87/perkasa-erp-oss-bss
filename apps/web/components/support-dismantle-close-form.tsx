'use client'

import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SupportFormContextNote } from '@/components/support-form-context-note'

type SupportDismantleCloseFormProps = {
  canProcess: boolean
  reviewDbReady: boolean
  dismantleSuggestions: string[]
  initialDismantleValue?: string
}

const deviceStatusOptions = ['DIAMBIL', 'TINGGAL DI LOKASI', 'RUSAK', 'BELUM DICEK'] as const
const pickupStatusOptions = ['DIAMBIL LENGKAP', 'DIAMBIL SEBAGIAN', 'TIDAK DIAMBIL'] as const
const closeOutcomeOptions = ['TERMINATE FINAL', 'TIDAK BISA DIRESTORE', 'SELESAI LAPANGAN'] as const
const billingDispositionOptions = ['STOP BILLING', 'TAGIHAN TERAKHIR', 'SUDAH CLEAR'] as const

function extractQueueId(value: string) {
  const [rawId] = value.split('|')
  return rawId?.trim() ?? ''
}

export function SupportDismantleCloseForm({
  canProcess,
  reviewDbReady,
  dismantleSuggestions,
  initialDismantleValue,
}: SupportDismantleCloseFormProps) {
  const router = useRouter()
  const [dismantleValue, setDismantleValue] = useState(
    initialDismantleValue?.trim() || dismantleSuggestions[0] || '',
  )
  const [closeNote, setCloseNote] = useState('')
  const [fieldPic, setFieldPic] = useState('')
  const [deviceStatus, setDeviceStatus] = useState<(typeof deviceStatusOptions)[number]>('DIAMBIL')
  const [pickupStatus, setPickupStatus] = useState<(typeof pickupStatusOptions)[number]>('DIAMBIL LENGKAP')
  const [closeOutcome, setCloseOutcome] = useState<(typeof closeOutcomeOptions)[number]>('TERMINATE FINAL')
  const [billingDisposition, setBillingDisposition] =
    useState<(typeof billingDispositionOptions)[number]>('STOP BILLING')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canProcess || !reviewDbReady || submitting

  useEffect(() => {
    if (initialDismantleValue?.trim()) {
      setDismantleValue(initialDismantleValue.trim())
    }
  }, [initialDismantleValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const queueId = extractQueueId(dismantleValue)
    if (!queueId) {
      setFeedback({
        tone: 'error',
        message: 'Pilih data queue dismantle yang valid dari daftar saran.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch(`/api/support/dismantle/${encodeURIComponent(queueId)}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          closeNote,
          fieldPic,
          deviceStatus,
          pickupStatus,
          closeOutcome,
          billingDisposition,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Close dismantle gagal diproses di review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Close dismantle berhasil diproses.',
      })
      setDismantleValue(dismantleSuggestions[0] ?? '')
      setCloseNote('')
      setFieldPic('')
      setDeviceStatus('DIAMBIL')
      setPickupStatus('DIAMBIL LENGKAP')
      setCloseOutcome('TERMINATE FINAL')
      setBillingDisposition('STOP BILLING')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Form Action Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tutup queue dismantle ke histori
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canProcess
          ? 'Role aktif belum memiliki akses operasional untuk menutup dismantle pada lane ini.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi close dismantle dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini memindahkan queue dismantle aktif ke histori close lengkap dengan metadata lapangan, kondisi perangkat, dan keputusan billing agar parity terminasi lebih dekat ke baseline.'}
      </p>
      <SupportFormContextNote
        items={[
          {
            label: 'Tujuan',
            value: 'Memfinalkan terminate dari queue aktif ke histori dengan jejak lapangan yang lengkap.',
          },
          {
            label: 'Sumber',
            value: 'Pilihan diambil dari queue dismantle aktif yang memang masih menunggu close lapangan.',
          },
          {
            label: 'Hasil',
            value: 'Kasus pindah ke histori close dengan outcome, kondisi perangkat, dan keputusan billing yang terdokumentasi.',
          },
        ]}
      />

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Queue Dismantle</span>
          <input
            list="support-dismantle-close-suggestions"
            value={dismantleValue}
            onChange={(event) => setDismantleValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="12 | Nama Customer | Radbox"
            required
            disabled={isDisabled}
          />
          <datalist id="support-dismantle-close-suggestions">
            {dismantleSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Field PIC</span>
          <input
            value={fieldPic}
            onChange={(event) => setFieldPic(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama teknisi atau PIC lapangan yang menutup kasus"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Device Status</span>
          <select
            value={deviceStatus}
            onChange={(event) => setDeviceStatus(event.target.value as (typeof deviceStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {deviceStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Pickup Status</span>
          <select
            value={pickupStatus}
            onChange={(event) => setPickupStatus(event.target.value as (typeof pickupStatusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {pickupStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Close Outcome</span>
          <select
            value={closeOutcome}
            onChange={(event) => setCloseOutcome(event.target.value as (typeof closeOutcomeOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {closeOutcomeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Billing Disposition</span>
          <select
            value={billingDisposition}
            onChange={(event) =>
              setBillingDisposition(event.target.value as (typeof billingDispositionOptions)[number])
            }
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {billingDispositionOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan Close</span>
          <textarea
            value={closeNote}
            onChange={(event) => setCloseNote(event.target.value)}
            className="min-h-28 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Status perangkat, hasil pembongkaran, atau keputusan terminasi akhir"
            required
            disabled={isDisabled}
          />
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:col-span-2">
          <div className="text-sm text-mute">
            Metadata ini menjadi jejak lapangan untuk `CS & Admin CS`, sedangkan keputusan restore tetap dibaca dari jalur Billing.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menutup Dismantle...' : 'Tutup Dismantle'}
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
