'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

type CustomerCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
}

const customerTypeOptions = ['HOME', 'CORPORATE', 'RESELLER'] as const

export function CustomerCreateForm({ canCreate, reviewDbReady }: CustomerCreateFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [customerType, setCustomerType] = useState<(typeof customerTypeOptions)[number]>('HOME')
  const [identityNo, setIdentityNo] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [addressLabel, setAddressLabel] = useState('Alamat Utama')
  const [address, setAddress] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          customerType,
          identityNo,
          phone,
          email,
          addressLabel,
          address,
          mapsUrl,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Customer review gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Customer review berhasil disimpan.',
      })
      setFullName('')
      setCustomerType('HOME')
      setIdentityNo('')
      setPhone('')
      setEmail('')
      setAddressLabel('Alamat Utama')
      setAddress('')
      setMapsUrl('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action Customers</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tambah customer review
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canCreate
          ? 'Role aktif belum memiliki izin create pada domain Customers.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi write action customer dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menambah customer master baru beserta alamat utama ke review DB agar lifecycle customer bisa diuji dari sisi input.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nama Customer</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama customer / perusahaan"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Customer Type</span>
          <select
            value={customerType}
            onChange={(event) => setCustomerType(event.target.value as (typeof customerTypeOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {customerTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">No. Identitas</span>
          <input
            value={identityNo}
            onChange={(event) => setIdentityNo(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="NIK / NPWP / nomor identitas"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">No. HP</span>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="08xxxxxxxxxx"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="email@customer.com"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Label Alamat</span>
          <input
            value={addressLabel}
            onChange={(event) => setAddressLabel(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alamat Utama / Kantor / Rumah"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Alamat Utama</span>
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Alamat customer"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Maps URL</span>
          <input
            value={mapsUrl}
            onChange={(event) => setMapsUrl(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="https://maps.app.goo.gl/..."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Form ini membuat customer master dan alamat utama sekaligus untuk review lifecycle customer.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Customer Review'}
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
