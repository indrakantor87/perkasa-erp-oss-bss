import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PermissionAdmin } from '@/components/access/permission-admin'
import { PermissionMatrix } from '@/components/access/permission-matrix'
import { canAccessPath, canPerformAction, getPermissionMatrix, getPermissionSummary } from '@/lib/access-control'
import { requireSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getRoleMeta } from '@/lib/role-meta'
import { translateUiText } from '@/lib/ui-language'
import { getServerUiLanguage } from '@/lib/ui-language-server'

export default async function AccessSettingsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/settings/access')) {
    redirect('/dashboard')
  }

  const matrix = getPermissionMatrix(session.role)
  const summary = getPermissionSummary(session.role)
  const source = getDataSourceSnapshot()
  const reviewDbReady = source.effectiveMode === 'review-db' && !source.isFallback
  const canManage = canPerformAction(session.role, 'access_settings', 'manage')
  const language = await getServerUiLanguage()
  const roleMeta = getRoleMeta(session.role, language)

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <p className="section-title">{translateUiText('Access Control', language)}</p>
        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              {translateUiText('Role, permission, dan matrix akses', language)}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              {translateUiText(
                'Halaman ini merangkum jalur akses per role agar fondasi satu website tetap bisa dibatasi secara tegas tanpa memecah aplikasi per divisi.',
                language,
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <span className={`badge border-transparent ${roleMeta.tone}`}>{roleMeta.label}</span>
            <Link
              href="/dashboard"
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              {translateUiText('Kembali ke dashboard', language)}
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
            {translateUiText('Resource aktif', language)}
          </p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {summary.resourceCount}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
            {translateUiText('Akses approval', language)}
          </p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {summary.approvalCount}
          </p>
        </article>
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Akses manage</p>
          <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {summary.manageCount}
          </p>
        </article>
      </section>

      <PermissionMatrix role={session.role} entries={matrix} />
      <PermissionAdmin canManage={canManage} reviewDbReady={reviewDbReady} />

      <section className="panel p-6">
        <p className="section-title">Catatan</p>
        <div className="mt-4 space-y-4">
          <article className="rounded-2xl border border-line bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-950">Shared auth, shared shell</h3>
            <p className="mt-3 text-sm leading-6 text-mute">
              Seluruh role tetap memakai login dan shell aplikasi yang sama, tetapi permission
              dibedakan di level route, shortcut, dan aksi domain.
            </p>
          </article>
          <article className="rounded-2xl border border-line bg-slate-50 p-5">
            <h3 className="text-sm font-semibold text-slate-950">Arah tahap berikutnya</h3>
            <p className="mt-3 text-sm leading-6 text-mute">
              Setelah matrix awal ini stabil, langkah berikutnya adalah memecah izin ke level data
              domain dan resource instance, misalnya approval ticket, export billing, atau edit
              customer tertentu.
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}
