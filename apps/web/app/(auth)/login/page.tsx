import { redirect } from 'next/navigation'
import { getDefaultLandingPath } from '@/lib/access-control-server'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { isBootstrapMockAuthEnabled } from '@/lib/auth-session'

function getLoginErrorMessage(error: string | undefined) {
  switch (error) {
    case 'invalid_credentials':
      return 'Username atau password tidak cocok dengan akun review.'
    case 'auth_unavailable':
      return 'Layanan autentikasi review sedang tidak tersedia. Periksa koneksi review DB atau aktifkan jalur review lokal yang sesuai.'
    case 'auth_required':
      return 'Silakan login terlebih dulu untuk membuka modul aplikasi.'
    default:
      return null
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>
}) {
  const session = await getSession()
  if (session) {
    redirect(getDefaultLandingPath(session.role))
  }

  const resolvedSearchParams = await searchParams
  const errorValue = resolvedSearchParams.error
  const errorCode = Array.isArray(errorValue) ? errorValue[0] : errorValue
  const errorMessage = getLoginErrorMessage(errorCode)
  const dataSource = getDataSourceSnapshot()
  const bootstrapMockAuthEnabled = isBootstrapMockAuthEnabled()
  const authModeDescription =
    dataSource.effectiveMode === 'review-db' && !dataSource.isFallback
      ? bootstrapMockAuthEnabled
        ? 'Login memakai auth_users dari review DB. Mock auth hanya aktif bila dipaksa eksplisit untuk kebutuhan review lokal.'
        : 'Login sekarang hanya menerima akun auth_users dari review DB. Bootstrap mock auth dinonaktifkan untuk mencegah fallback diam-diam.'
      : 'Login masih bisa memakai bootstrap mock auth karena aplikasi sedang berjalan pada mode mock / fallback lokal.'

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] bg-slate-950 p-8 text-slate-100 shadow-2xl lg:p-12">
          <span className="badge border-slate-700 text-slate-300">Satu website operasional</span>
          <h1 className="mt-8 font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Perkasa ERP OSS BSS
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
            Platform tunggal untuk penjualan, customer, support, inventory, HR, billing, dan
            pusat import review dalam satu domain aplikasi.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Database
              </p>
              <p className="mt-3 text-lg font-semibold text-white">1 schema terpadu</p>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Akses
              </p>
              <p className="mt-3 text-lg font-semibold text-white">1 login lintas modul</p>
            </article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Target
              </p>
              <p className="mt-3 text-lg font-semibold text-white">Web + Android wrapper</p>
            </article>
          </div>
        </section>

        <section className="panel flex items-center p-6 sm:p-8 lg:p-10">
          <div className="w-full">
            <div>
              <p className="section-title">Autentikasi</p>
              <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
                Masuk ke shell aplikasi
              </h2>
              <p className="mt-3 text-sm leading-6 text-mute">
                Form ini sekarang memakai mode auth hybrid agar login, cookie session, guard
                halaman, dan transisi auth internal bisa direview tanpa memutus akses bootstrap.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {authModeDescription}
            </div>

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            <form action="/api/auth/login" method="post" className="mt-8 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Username</span>
                <input
                  type="text"
                  name="username"
                  placeholder="username atau email auth_users"
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Password</span>
                <input
                  type="password"
                  name="password"
                  placeholder="********"
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Masuk ke dashboard
              </button>
            </form>

            <div className="mt-6 rounded-2xl border border-line bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
                Bootstrap Mock Auth
              </p>
              <div className="mt-4 rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6 text-slate-700">
                {bootstrapMockAuthEnabled ? (
                  <>
                    Kredensial bootstrap tidak lagi ditampilkan di UI. Gunakan akun review DB yang
                    aktif, atau aktifkan `ALLOW_BOOTSTRAP_MOCK_AUTH=1` hanya untuk kebutuhan review
                    lokal yang terkontrol.
                  </>
                ) : (
                  <>Bootstrap mock auth sedang nonaktif. Login hanya menerima akun yang tersedia di `auth_users`.</>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
