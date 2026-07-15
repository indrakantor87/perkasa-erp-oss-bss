import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AuthUserAuditList } from '@/components/auth-user-audit-list'
import { AuthUserCreateForm } from '@/components/auth-user-create-form'
import { AuthUserManagementTable } from '@/components/auth-user-management-table'
import { DailyActivityUserProfilePanel } from '@/components/daily-activity-user-profile-panel'
import { DataSourceStatus } from '@/components/data-source-status'
import { canAccessPath, canPerformAction } from '@/lib/access-control'
import { requireSession } from '@/lib/auth'
import { getDailyActivityDivisionOptions } from '@/lib/daily-activity-org'
import { getRoleMeta } from '@/lib/role-meta'
import { getAuthUsersPageData } from '@/lib/services/auth-user-service'
import { translateUiText } from '@/lib/ui-language'
import { getServerUiLanguage } from '@/lib/ui-language-server'

export default async function UserSettingsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/settings/users')) {
    redirect('/dashboard')
  }

  const { source, users, summary, auditItems, roleOptions, divisionOptions, branchOptions, dailyActivityProfiles } =
    await getAuthUsersPageData()
  const canManage = canPerformAction(session.role, 'user_settings', 'manage')
  const language = await getServerUiLanguage()
  const roleMeta = getRoleMeta(session.role, language)
  const dailyActivityDivisionOptions = getDailyActivityDivisionOptions()

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
        <p className="section-title">{translateUiText('User Internal', language)}</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              {translateUiText('Review akun auth internal', language)}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              {translateUiText(
                'Halaman ini menampilkan daftar akun yang akan menjadi fondasi auth internal lintas modul. Saat review DB belum siap atau mode fallback lokal masih aktif, tabel dapat menampilkan akun bootstrap mock agar jalur review tetap hidup tanpa mengekspos kredensial di UI.',
                language,
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className={`badge border-transparent ${roleMeta.tone}`}>{roleMeta.label}</span>
            <Link
              href="/settings/access"
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              {translateUiText('Lihat matrix akses', language)}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
            {translateUiText('Total user', language)}
          </p>
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

      <AuthUserCreateForm
        canManage={canManage}
        reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
        roleOptions={roleOptions}
        divisionOptions={divisionOptions}
        branchOptions={branchOptions}
      />

      <AuthUserManagementTable
        users={users}
        canManage={canManage}
        reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
        roleOptions={roleOptions}
        divisionOptions={divisionOptions}
        branchOptions={branchOptions}
      />

      <DailyActivityUserProfilePanel
        canManage={canManage}
        reviewDbReady={source.effectiveMode === 'review-db' && !source.isFallback}
        users={users}
        profiles={dailyActivityProfiles}
        divisionOptions={dailyActivityDivisionOptions}
      />

      <AuthUserAuditList items={auditItems} />

      <section className="panel p-6">
        <p className="section-title">Arah Berikutnya</p>
        <div className="mt-4 space-y-4">
          <article className="rounded-2xl border border-line bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-950">Create, edit, reset, lalu hapus</h3>
            <p className="mt-3 text-sm leading-6 text-mute">
              Halaman ini sekarang sudah bisa dipakai untuk menambah akun internal baru ke
              `auth_users`, mengubah profil inti, menghapus akun yang sudah tidak dipakai, dan
              reset password dari web review.
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
