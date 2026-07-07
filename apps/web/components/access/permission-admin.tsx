'use client'

import { useEffect, useMemo, useState } from 'react'

type RoleItem = {
  id: number
  code: string
  name: string
}

type PermissionItem = {
  id: number
  code: string
  name: string
}

type AuditItem = {
  id: string
  actionType: string
  actor: string
  target: string
  detail: string
  happenedAt: string
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}

export function PermissionAdmin({
  canManage,
  reviewDbReady,
}: {
  canManage: boolean
  reviewDbReady: boolean
}) {
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [permissions, setPermissions] = useState<PermissionItem[]>([])
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [selectedRoleCodes, setSelectedRoleCodes] = useState<Set<string>>(new Set())
  const [roleLoading, setRoleLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [permissionCode, setPermissionCode] = useState('')
  const [permissionName, setPermissionName] = useState('')
  const [permissionAudits, setPermissionAudits] = useState<AuditItem[]>([])
  const [rolePermissionAudits, setRolePermissionAudits] = useState<AuditItem[]>([])

  const filteredPermissions = useMemo(() => {
    const needle = normalizeText(search)
    if (!needle) {
      return permissions
    }
    return permissions.filter((perm) => {
      const haystack = normalizeText(`${perm.code} ${perm.name}`)
      return haystack.includes(needle)
    })
  }, [permissions, search])

  async function refreshRoles() {
    const response = await fetch('/api/settings/access/roles', { cache: 'no-store' })
    const payload = (await response.json()) as { roles?: RoleItem[]; message?: string }
    if (!response.ok) {
      throw new Error(payload.message || 'Gagal memuat role.')
    }
    setRoles(payload.roles ?? [])
    if (!selectedRoleId && payload.roles && payload.roles.length > 0) {
      setSelectedRoleId(payload.roles[0].id)
    }
  }

  async function refreshPermissions() {
    const response = await fetch('/api/settings/access/permissions', { cache: 'no-store' })
    const payload = (await response.json()) as { permissions?: PermissionItem[]; message?: string }
    if (!response.ok) {
      throw new Error(payload.message || 'Gagal memuat permission.')
    }
    setPermissions(payload.permissions ?? [])
  }

  async function refreshAudits() {
    const response = await fetch('/api/settings/access/audits', { cache: 'no-store' })
    const payload = (await response.json()) as {
      permissionAudits?: AuditItem[]
      rolePermissionAudits?: AuditItem[]
    }
    if (response.ok) {
      setPermissionAudits(payload.permissionAudits ?? [])
      setRolePermissionAudits(payload.rolePermissionAudits ?? [])
    }
  }

  async function refreshRolePermissions(roleId: number) {
    setRoleLoading(true)
    try {
      const response = await fetch(`/api/settings/access/role-permissions/${roleId}`, { cache: 'no-store' })
      const payload = (await response.json()) as { permissionCodes?: string[]; message?: string }
      if (!response.ok) {
        throw new Error(payload.message || 'Gagal memuat role permission.')
      }
      setSelectedRoleCodes(new Set((payload.permissionCodes ?? []).map((code) => String(code))))
    } finally {
      setRoleLoading(false)
    }
  }

  useEffect(() => {
    if (!reviewDbReady) {
      return
    }
    Promise.all([refreshRoles(), refreshPermissions(), refreshAudits()]).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Gagal memuat data settings access.')
    })
  }, [reviewDbReady])

  useEffect(() => {
    if (!reviewDbReady || !selectedRoleId) {
      return
    }
    refreshRolePermissions(selectedRoleId).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Gagal memuat role permission.')
    })
  }, [reviewDbReady, selectedRoleId])

  async function handleBootstrap() {
    setMessage(null)
    setError(null)
    const response = await fetch('/api/settings/access/bootstrap', { method: 'POST' })
    const payload = (await response.json()) as { message?: string }
    if (!response.ok) {
      setError(payload.message || 'Bootstrap permission gagal.')
      return
    }
    setMessage(payload.message || 'Bootstrap permission selesai.')
    await Promise.all([refreshRoles(), refreshPermissions(), refreshAudits()])
    if (selectedRoleId) {
      await refreshRolePermissions(selectedRoleId)
    }
  }

  async function handleSaveRolePermissions() {
    if (!selectedRoleId) {
      return
    }
    setMessage(null)
    setError(null)
    const response = await fetch(`/api/settings/access/role-permissions/${selectedRoleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissionCodes: Array.from(selectedRoleCodes) }),
    })
    const payload = (await response.json()) as { message?: string }
    if (!response.ok) {
      setError(payload.message || 'Simpan role permission gagal.')
      return
    }
    setMessage(payload.message || 'Role permission berhasil disimpan.')
    await refreshAudits()
    await refreshRolePermissions(selectedRoleId)
  }

  async function handleCreatePermission() {
    setMessage(null)
    setError(null)
    const response = await fetch('/api/settings/access/permissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: permissionCode, name: permissionName }),
    })
    const payload = (await response.json()) as { message?: string }
    if (!response.ok) {
      setError(payload.message || 'Simpan permission gagal.')
      return
    }
    setMessage(payload.message || 'Permission tersimpan.')
    setPermissionCode('')
    setPermissionName('')
    await Promise.all([refreshPermissions(), refreshAudits()])
  }

  function togglePermission(code: string) {
    setSelectedRoleCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  if (!reviewDbReady) {
    return (
      <section className="panel p-6">
        <p className="section-title">Permission Master</p>
        <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
          DB permission belum siap
        </h3>
        <p className="mt-4 text-sm leading-6 text-mute">
          Kelola permission hanya aktif saat mode review DB benar-benar tersedia.
        </p>
      </section>
    )
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-6 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="section-title">Permission Master</p>
            <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              Permission dinamis dari review DB
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Permission bisa di-seed dari baseline web, lalu disesuaikan per role. Setelah disimpan, menu dan guard
              aplikasi akan mengikuti permission database saat tersedia.
            </p>
          </div>

          {canManage ? (
            <button
              type="button"
              onClick={handleBootstrap}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Seed dari baseline
            </button>
          ) : (
            <span className="badge border-slate-200 text-slate-700">Read-only</span>
          )}
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-6">
        {message ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {canManage ? (
          <div className="grid gap-3 md:grid-cols-12">
            <label className="md:col-span-5 flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Kode permission</span>
              <input
                value={permissionCode}
                onChange={(event) => setPermissionCode(event.target.value)}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="res:billing:update atau route_prefix:/settings"
              />
            </label>
            <label className="md:col-span-5 flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Nama permission</span>
              <input
                value={permissionName}
                onChange={(event) => setPermissionName(event.target.value)}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="Billing : update"
              />
            </label>
            <div className="md:col-span-2 flex items-end">
              <button
                type="button"
                onClick={handleCreatePermission}
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Simpan
              </button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <article className="rounded-2xl border border-line bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Role</p>
            <select
              value={selectedRoleId ?? ''}
              onChange={(event) => setSelectedRoleId(event.target.value ? Number(event.target.value) : null)}
              className="mt-3 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.code} - {role.name}
                </option>
              ))}
            </select>

            <p className="mt-6 text-sm font-semibold text-slate-950">Cari permission</p>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mt-3 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              placeholder="billing, route_prefix, approve..."
            />

            <div className="mt-4 text-sm text-mute">
              {selectedRoleId ? (
                <span>
                  Terpilih {selectedRoleCodes.size} permission
                </span>
              ) : (
                <span>Pilih role untuk melihat permission.</span>
              )}
            </div>

            {canManage ? (
              <button
                type="button"
                disabled={!selectedRoleId || roleLoading}
                onClick={handleSaveRolePermissions}
                className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {roleLoading ? 'Memuat...' : 'Simpan role permission'}
              </button>
            ) : null}
          </article>

          <article className="rounded-2xl border border-line bg-white">
            <div className="border-b border-line px-5 py-4">
              <p className="text-sm font-semibold text-slate-950">Daftar permission</p>
              <p className="mt-2 text-sm text-mute">
                {filteredPermissions.length} dari {permissions.length} permission
              </p>
            </div>
            <div className="max-h-[520px] overflow-auto p-4">
              <div className="grid gap-2">
                {filteredPermissions.map((perm) => (
                  <label
                    key={perm.id}
                    className="flex items-start gap-3 rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      disabled={!canManage || !selectedRoleId}
                      checked={selectedRoleCodes.has(perm.code)}
                      onChange={() => togglePermission(perm.code)}
                      className="mt-1 h-4 w-4"
                    />
                    <span className="flex-1">
                      <span className="block font-semibold text-slate-950">{perm.code}</span>
                      <span className="mt-1 block text-xs text-mute">{perm.name}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </article>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-line bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-950">Audit permission master</p>
            <div className="mt-4 space-y-3">
              {permissionAudits.length > 0 ? (
                permissionAudits.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">
                    <p className="font-semibold text-slate-950">
                      {item.actionType} • {item.target}
                    </p>
                    <p className="mt-2 text-sm text-mute">{item.detail}</p>
                    <p className="mt-2 text-xs text-mute">
                      {item.happenedAt} • {item.actor}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-mute">Belum ada audit permission.</p>
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-line bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-950">Audit role permission</p>
            <div className="mt-4 space-y-3">
              {rolePermissionAudits.length > 0 ? (
                rolePermissionAudits.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-line bg-white px-4 py-3 text-sm">
                    <p className="font-semibold text-slate-950">
                      {item.actionType} • {item.target}
                    </p>
                    <p className="mt-2 text-sm text-mute">{item.detail}</p>
                    <p className="mt-2 text-xs text-mute">
                      {item.happenedAt} • {item.actor}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-mute">Belum ada audit role permission.</p>
              )}
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

