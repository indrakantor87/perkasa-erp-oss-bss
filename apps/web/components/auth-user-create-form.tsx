'use client'

import type { FormEvent } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AuthUserLookupOption } from '@/lib/services/auth-user-service'

type AuthUserCreateFormProps = {
  canManage: boolean
  reviewDbReady: boolean
  roleOptions: AuthUserLookupOption[]
  divisionOptions: AuthUserLookupOption[]
  branchOptions: AuthUserLookupOption[]
}

const statusOptions = ['ACTIVE', 'INACTIVE'] as const

const roleDivisionMap: Record<string, string> = {
  PENJUALAN: 'PEMASARAN_PELAYANAN',
  CS: 'PEMASARAN_PELAYANAN',
  CREATOR_DIGITAL: 'PEMASARAN_PELAYANAN',
  NOC: 'PEMASARAN_PELAYANAN',
  TROUBLESHOOTS: 'PEMASARAN_PELAYANAN',
  FINANCE: 'FINANCE_HR',
  HR: 'FINANCE_HR',
  GA: 'GENERAL_AFFAIR',
  TEKNISI_PSB: 'TEKNIS_EKSPAN',
  DISMANTLE: 'TEKNIS_EKSPAN',
  OWNER: 'OPERASIONAL',
  SUPER_ADMIN: 'OPERASIONAL',
  ADMIN: 'OPERASIONAL',
}

function getDefaultDivisionId(
  roleRef: string,
  roleOptions: AuthUserLookupOption[],
  divisionOptions: AuthUserLookupOption[]
) {
  const roleCode =
    roleOptions.find((option) => option.id === roleRef)?.code?.trim().toUpperCase() ?? roleRef.trim().toUpperCase()
  const divisionCode = roleDivisionMap[roleCode]
  if (!divisionCode) return ''
  return divisionOptions.find((option) => option.code.trim().toUpperCase() === divisionCode)?.id ?? ''
}

export function AuthUserCreateForm({
  canManage,
  reviewDbReady,
  roleOptions,
  divisionOptions,
  branchOptions,
}: AuthUserCreateFormProps) {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const initialRoleId = roleOptions[0]?.id ?? ''
  const [roleId, setRoleId] = useState(initialRoleId)
  const [divisionId, setDivisionId] = useState(getDefaultDivisionId(initialRoleId, roleOptions, divisionOptions))
  const [branchId, setBranchId] = useState(branchOptions[0]?.id ?? '')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('ACTIVE')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled =
    !canManage || !reviewDbReady || !roleOptions.length || !branchOptions.length || submitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/settings/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName,
          username,
          email,
          password,
          roleId,
          divisionId: divisionId || null,
          branchId: branchId || null,
          status,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'User internal gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'User internal berhasil disimpan.',
      })
      setFullName('')
      setUsername('')
      setEmail('')
      setPassword('')
      setRoleId(initialRoleId)
      setDivisionId(getDefaultDivisionId(initialRoleId, roleOptions, divisionOptions))
      setStatus('ACTIVE')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Write Action Auth</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Tambah user internal ke review DB
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canManage
          ? 'Role aktif belum memiliki izin manage pada user internal.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi create user dinonaktifkan agar tidak menulis ke mock.'
            : 'Form ini menambahkan akun baru ke `auth_users` agar review auth internal bisa diuji langsung dari web.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Nama Lengkap</span>
          <input
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama user internal"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Username</span>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="username.login"
            required
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
            placeholder="email@domain.com"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Password Awal</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Minimal 6 karakter"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Role Database</span>
          <select
            value={roleId}
            onChange={(event) => {
              const nextRoleId = event.target.value
              setRoleId(nextRoleId)
              setDivisionId(getDefaultDivisionId(nextRoleId, roleOptions, divisionOptions))
            }}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
            required
          >
            {roleOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} ({item.code})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Divisi</span>
          <select
            value={divisionId}
            onChange={(event) => setDivisionId(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            <option value="">Semua Divisi / Kosong</option>
            {divisionOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} ({item.code})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Cabang</span>
          <select
            value={branchId}
            onChange={(event) => setBranchId(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            <option value="">Tanpa Cabang</option>
            {branchOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label} ({item.code})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as (typeof statusOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-3 text-sm text-mute lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            Password akan disimpan sebagai hash `sha256` agar tetap kompatibel dengan helper login transisi saat ini.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Simpan User Internal'}
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
