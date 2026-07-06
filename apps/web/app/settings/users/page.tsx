import Link from 'next/link'
import { redirect } from 'next/navigation'
import { DataSourceStatus } from '@/components/data-source-status'
import { canAccessPath } from '@/lib/access-control'
import { requireSession } from '@/lib/auth'
import { getAuthUsersPageData } from '@/lib/services/auth-user-service'

export default async function UserSettingsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/settings/users')) {
    redirect('/dashboard')
  }

  const { source, users, summary } = await getAuthUsersPageData()

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
        <p className="section-title">User Internal</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              Review akun auth internal
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Halaman ini menampilkan daftar akun yang akan menjadi fondasi auth internal lintas
              modul. Saat review DB belum siap, tabel akan fallback ke akun bootstrap mock agar
              jalur review tetap hidup.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className="badge border-transparent bg-slate-950 text-white">{session.role}</span>
            <Link
              href="/settings/access"
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Lihat matrix akses
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Total user</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {summary.totalUsers}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">User aktif</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {summary.activeUsers}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Admin</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {summary.adminUsers}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Operator</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {summary.operatorUsers}
          </p>
        </article>
      </section>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {users.length ? (
                users.map((user) => (
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-mute">
                    Belum ada user review di `auth_users`. Jalankan seed auth internal untuk mulai
                    menguji login review DB.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel p-6">
        <p className="section-title">Arah Berikutnya</p>
        <div className="mt-4 space-y-4">
          <article className="rounded-2xl border border-line bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-950">Seed dulu, CRUD menyusul</h3>
            <p className="mt-3 text-sm leading-6 text-mute">
              Dengan seed `auth_users` yang sudah disiapkan, halaman ini bisa langsung dipakai
              untuk review user internal sebelum ditambah create, reset password, atau deactivate.
            </p>
          </article>
          <article className="rounded-2xl border border-line bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-950">Tetap satu login</h3>
            <p className="mt-3 text-sm leading-6 text-mute">
              Tujuan akhirnya tetap satu autentikasi lintas modul, tetapi sekarang fondasinya mulai
              terlihat di UI dan tidak lagi tersembunyi hanya di service layer auth.
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}
