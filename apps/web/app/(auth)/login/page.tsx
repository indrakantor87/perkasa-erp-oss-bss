import { redirect } from 'next/navigation'
import { getDefaultLandingPath } from '@/lib/access-control-server'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { isBootstrapMockAuthEnabled } from '@/lib/auth-session'

function getLoginErrorMessage(error: string | undefined) {
  switch (error) {
    case 'invalid_credentials':
      return 'Username atau password tidak cocok dengan akun yang aktif.'
    case 'auth_unavailable':
      return 'Layanan login belum bisa dijangkau. Periksa koneksi review DB atau aktifkan jalur login lokal yang memang sedang dipakai.'
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
        ? 'Login utama memakai akun review DB. Jalur mock hanya dipakai jika sengaja diaktifkan untuk review lokal.'
        : 'Login hanya menerima akun review DB yang aktif. Jalur mock sedang dimatikan agar pembacaan hasil lebih jujur.'
      : 'Aplikasi sedang memakai mode lokal / fallback. Login bisa memakai akun bootstrap mock yang sengaja diisi pada environment lokal.'

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section
          className="rounded-[28px] p-8 shadow-2xl lg:p-12"
          style={{
            backgroundColor: 'var(--color-sidebar)',
            color: 'var(--color-sidebar-ink)',
          }}
        >
          <span
            className="badge"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-sidebar-line) 130%, transparent)',
              color: 'color-mix(in srgb, var(--color-sidebar-ink) 75%, transparent)',
            }}
          >
            Satu website operasional
          </span>
          <h1 className="mt-8 font-[family-name:var(--font-heading)] text-4xl font-semibold tracking-tight sm:text-5xl">
            Perkasa ERP OSS BSS
          </h1>
          <p
            className="mt-6 max-w-2xl text-sm leading-7 sm:text-base"
            style={{ color: 'color-mix(in srgb, var(--color-sidebar-ink) 78%, transparent)' }}
          >
            Platform tunggal untuk penjualan, customer, support, inventory, HR, billing, dan
            pusat import review dalam satu domain aplikasi.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Database',
                value: '1 schema terpadu',
              },
              {
                label: 'Akses',
                value: '1 login lintas modul',
              },
              {
                label: 'Target',
                value: 'Web + Android wrapper',
              },
            ].map((feature) => (
              <article
                key={feature.label}
                className="rounded-2xl border p-5"
                style={{
                  borderColor: 'var(--color-sidebar-line)',
                  backgroundColor: 'var(--color-sidebar-soft)',
                }}
              >
                <p
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: 'color-mix(in srgb, var(--color-sidebar-ink) 50%, transparent)' }}
                >
                  {feature.label}
                </p>
                <p className="mt-3 text-lg font-semibold">{feature.value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel flex items-center p-6 sm:p-8 lg:p-10">
          <div className="w-full">
            <div>
              <p className="section-title">Autentikasi</p>
              <h2
                className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight"
                style={{ color: 'var(--color-ink-strong)' }}
              >
                Masuk ke aplikasi
              </h2>
              <p className="mt-3 text-sm leading-6 text-mute">
                Gunakan akun review DB yang aktif untuk masuk ke modul kerja. Jika sedang review lokal tanpa review DB, aktifkan jalur mock secara sadar dari environment lokal.
              </p>
            </div>

            <div
              className="mt-6 rounded-2xl border border-line px-4 py-3 text-sm"
              style={{
                backgroundColor: 'var(--color-card-subtle)',
                color: 'var(--color-mute-strong)',
              }}
            >
              {authModeDescription}
            </div>

            {errorMessage ? (
              <div
                className="mt-6 rounded-2xl border px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'var(--color-danger-soft)',
                  borderColor: 'var(--color-danger-line)',
                  color: 'var(--color-danger-ink)',
                }}
              >
                {errorMessage}
              </div>
            ) : null}

            <form action="/api/auth/login" method="post" className="mt-8 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-mute-strong)' }}>
                  Username
                </span>
                <input
                  type="text"
                  name="username"
                  placeholder="username atau email auth_users"
                  className="w-full rounded-2xl border border-line px-4 py-3 text-sm outline-none transition focus:[border-color:var(--color-line-strong)]"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-ink)',
                  }}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--color-mute-strong)' }}>
                  Password
                </span>
                <input
                  type="password"
                  name="password"
                  placeholder="********"
                  className="w-full rounded-2xl border border-line px-4 py-3 text-sm outline-none transition focus:[border-color:var(--color-line-strong)]"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-ink)',
                  }}
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl px-5 py-4 text-sm font-semibold transition"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-accent-ink)',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.opacity = '0.92'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.opacity = '1'
                }}
              >
                Masuk ke dashboard
              </button>
            </form>

            <div
              className="mt-6 rounded-2xl border border-line p-4"
              style={{ backgroundColor: 'var(--color-card-subtle)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
                Catatan Login Lokal
              </p>
              <div
                className="mt-4 rounded-2xl border border-line px-4 py-3 text-sm leading-6"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-mute-strong)',
                }}
              >
                {bootstrapMockAuthEnabled ? (
                  <>
                    Password tidak ditampilkan di UI dan tidak disimpan plaintext di repo. Untuk review lokal, isi kredensial mock lewat `ALLOW_BOOTSTRAP_MOCK_AUTH=1` dan `BOOTSTRAP_MOCK_AUTH_CREDENTIALS`, lalu restart server.
                  </>
                ) : (
                  <>Jalur mock sedang nonaktif. Login hanya menerima akun yang tersedia di `auth_users` review DB.</>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
