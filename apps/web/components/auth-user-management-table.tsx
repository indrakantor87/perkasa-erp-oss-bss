'use client'

import { Fragment } from 'react'
import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type {
  AuthUserListItem,
  AuthUserLookupOption,
} from '@/lib/services/auth-user-service'

type AuthUserManagementTableProps = {
  users: AuthUserListItem[]
  canManage: boolean
  reviewDbReady: boolean
  roleOptions: AuthUserLookupOption[]
  divisionOptions: AuthUserLookupOption[]
  branchOptions: AuthUserLookupOption[]
}

type EditableUserState = {
  fullName: string
  email: string
  roleId: string
  divisionId: string
  branchId: string
  status: string
  newPassword: string
}

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

function createInitialState(user: AuthUserListItem): EditableUserState {
  return {
    fullName: user.fullName,
    email: user.email === '-' ? '' : user.email,
    roleId: user.roleId ?? '',
    divisionId: user.divisionId ?? '',
    branchId: user.branchId ?? '',
    status: user.status,
    newPassword: '',
  }
}

export function AuthUserManagementTable({
  users,
  canManage,
  reviewDbReady,
  roleOptions,
  divisionOptions,
  branchOptions,
}: AuthUserManagementTableProps) {
  const router = useRouter()
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, EditableUserState>>({})
  const [submittingUserId, setSubmittingUserId] = useState<string | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Record<string, { tone: 'success' | 'error'; message: string }>>(
    {}
  )

  const manageableUsers = useMemo(
    () => users.filter((user) => user.source === 'review-db'),
    [users]
  )

  function getDraft(user: AuthUserListItem) {
    return drafts[user.id] ?? createInitialState(user)
  }

  function updateDraft(user: AuthUserListItem, patch: Partial<EditableUserState>) {
    setDrafts((current) => ({
      ...current,
      [user.id]: {
        ...getDraft(user),
        ...patch,
      },
    }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>, user: AuthUserListItem) {
    event.preventDefault()
    if (!canManage || !reviewDbReady || user.source !== 'review-db') {
      return
    }

    const draft = getDraft(user)
    setSubmittingUserId(user.id)
    setFeedback((current) => {
      const next = { ...current }
      delete next[user.id]
      return next
    })

    try {
      const response = await fetch(`/api/settings/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: draft.fullName,
          email: draft.email,
          roleId: draft.roleId,
          divisionId: draft.divisionId,
          branchId: draft.branchId,
          status: draft.status,
          newPassword: draft.newPassword,
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        setFeedback((current) => ({
          ...current,
          [user.id]: {
            tone: 'error',
            message: payload?.message || 'Perubahan user internal gagal disimpan.',
          },
        }))
        return
      }

      setFeedback((current) => ({
        ...current,
        [user.id]: {
          tone: 'success',
          message: payload?.message || 'User internal berhasil diperbarui.',
        },
      }))
      setDrafts((current) => ({
        ...current,
        [user.id]: {
          ...draft,
          newPassword: '',
        },
      }))
      router.refresh()
    } finally {
      setSubmittingUserId(null)
    }
  }

  async function handleDelete(user: AuthUserListItem) {
    if (!canManage || !reviewDbReady || user.source !== 'review-db') {
      return
    }
    if (!window.confirm(`Hapus user ${user.fullName} (${user.username}) dari auth internal?`)) {
      return
    }

    setDeletingUserId(user.id)
    setFeedback((current) => {
      const next = { ...current }
      delete next[user.id]
      return next
    })

    try {
      const response = await fetch(`/api/settings/users/${user.id}`, {
        method: 'DELETE',
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        setFeedback((current) => ({
          ...current,
          [user.id]: {
            tone: 'error',
            message: payload?.message || 'User internal gagal dihapus.',
          },
        }))
        return
      }

      setOpenUserId((current) => (current === user.id ? null : current))
      setDrafts((current) => {
        const next = { ...current }
        delete next[user.id]
        return next
      })
      router.refresh()
    } finally {
      setDeletingUserId(null)
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-6 py-5">
        <p className="section-title">Auth Directory</p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Daftar akun review
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.16em] text-mute">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Divisi</th>
              <th className="px-6 py-4">Cabang</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Sumber</th>
              <th className="px-6 py-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {users.length ? (
              users.map((user) => {
                const isManageable = canManage && reviewDbReady && user.source === 'review-db'
                const isOpen = openUserId === user.id
                const draft = getDraft(user)
                const message = feedback[user.id]
                const isBusy = submittingUserId === user.id || deletingUserId === user.id

                return (
                  <Fragment key={user.id}>
                    <tr key={user.id}>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-950">{user.fullName}</div>
                        <div className="mt-1 text-xs text-mute">
                          {user.username} • {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{user.roleLabel}</td>
                      <td className="px-6 py-4 text-slate-700">{user.divisionLabel}</td>
                      <td className="px-6 py-4 text-slate-700">{user.branchLabel}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`badge ${
                            user.status === 'ACTIVE'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-100 text-slate-600'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="badge border-line bg-slate-50 text-slate-700">
                          {user.source}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isManageable ? (
                          <button
                            type="button"
                            onClick={() => setOpenUserId((current) => (current === user.id ? null : user.id))}
                            className="rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-slate-700"
                          >
                            {isOpen ? 'Tutup' : 'Kelola'}
                          </button>
                        ) : (
                          <span className="text-xs text-mute">
                            {user.source === 'mock' ? 'Mock only' : 'Read only'}
                          </span>
                        )}
                      </td>
                    </tr>

                    {isOpen ? (
                      <tr>
                        <td colSpan={7} className="bg-slate-50 px-6 py-5">
                          <form onSubmit={(event) => handleSubmit(event, user)} className="space-y-4">
                            <div className="grid gap-4 lg:grid-cols-3">
                              <label className="flex flex-col gap-2 text-sm text-slate-700">
                                <span className="font-semibold text-slate-950">Nama lengkap</span>
                                <input
                                  value={draft.fullName}
                                  onChange={(event) =>
                                    updateDraft(user, { fullName: event.target.value })
                                  }
                                  className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                                  disabled={isBusy}
                                />
                              </label>

                              <label className="flex flex-col gap-2 text-sm text-slate-700">
                                <span className="font-semibold text-slate-950">Email</span>
                                <input
                                  value={draft.email}
                                  onChange={(event) => updateDraft(user, { email: event.target.value })}
                                  className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                                  disabled={isBusy}
                                />
                              </label>

                              <label className="flex flex-col gap-2 text-sm text-slate-700">
                                <span className="font-semibold text-slate-950">Status</span>
                                <select
                                  value={draft.status}
                                  onChange={(event) => updateDraft(user, { status: event.target.value })}
                                  className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                                  disabled={isBusy}
                                >
                                  <option value="ACTIVE">ACTIVE</option>
                                  <option value="INACTIVE">INACTIVE</option>
                                </select>
                              </label>

                              <label className="flex flex-col gap-2 text-sm text-slate-700">
                                <span className="font-semibold text-slate-950">Role</span>
                                <select
                                  value={draft.roleId}
                                  onChange={(event) => {
                                    const nextRoleId = event.target.value
                                    updateDraft(user, {
                                      roleId: nextRoleId,
                                      divisionId: getDefaultDivisionId(nextRoleId, roleOptions, divisionOptions),
                                    })
                                  }}
                                  className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                                  disabled={isBusy}
                                >
                                  <option value="">Pilih role</option>
                                  {roleOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="flex flex-col gap-2 text-sm text-slate-700">
                                <span className="font-semibold text-slate-950">Divisi</span>
                                <select
                                  value={draft.divisionId}
                                  onChange={(event) => updateDraft(user, { divisionId: event.target.value })}
                                  className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                                  disabled={isBusy}
                                >
                                  <option value="">Semua Divisi</option>
                                  {divisionOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="flex flex-col gap-2 text-sm text-slate-700">
                                <span className="font-semibold text-slate-950">Cabang</span>
                                <select
                                  value={draft.branchId}
                                  onChange={(event) => updateDraft(user, { branchId: event.target.value })}
                                  className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                                  disabled={isBusy}
                                >
                                  <option value="">Tanpa Cabang</option>
                                  {branchOptions.map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                            </div>

                            <label className="flex flex-col gap-2 text-sm text-slate-700">
                              <span className="font-semibold text-slate-950">Reset password</span>
                              <input
                                type="password"
                                value={draft.newPassword}
                                onChange={(event) =>
                                  updateDraft(user, { newPassword: event.target.value })
                                }
                                placeholder="Kosongkan jika tidak diubah"
                                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                                disabled={isBusy}
                              />
                            </label>

                            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-mute">
                              <span className="min-w-0 flex-1">
                                Username tetap dikunci agar identitas login tidak berubah sembarangan. Jika akun tidak dipakai lagi, hapus user langsung dari sini.
                              </span>
                              <div className="flex shrink-0 items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDelete(user)}
                                  disabled={isBusy}
                                  className="whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                                >
                                  {deletingUserId === user.id ? 'Menghapus...' : 'Hapus User'}
                                </button>
                                <button
                                  type="submit"
                                  disabled={isBusy}
                                  className="whitespace-nowrap rounded-full bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  {submittingUserId === user.id ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                              </div>
                            </div>

                            {message ? (
                              <div
                                className={`rounded-2xl border px-4 py-3 text-sm ${
                                  message.tone === 'success'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-rose-200 bg-rose-50 text-rose-700'
                                }`}
                              >
                                {message.message}
                              </div>
                            ) : null}
                          </form>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-mute">
                  Belum ada user review di `auth_users`. Jalankan seed auth internal untuk mulai
                  menguji login review DB.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {manageableUsers.length === 0 ? (
        <div className="border-t border-line bg-slate-50 px-6 py-4 text-sm text-mute">
          Mode manage hanya aktif untuk user yang benar-benar berasal dari review DB.
        </div>
      ) : null}
    </section>
  )
}
