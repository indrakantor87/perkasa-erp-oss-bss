import { redirect } from 'next/navigation'
import { getDefaultLandingPath } from '@/lib/access-control-server'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { isBootstrapMockAuthEnabled } from '@/lib/auth-session'

type EnvCheckItem = {
  key: string
  filled: boolean
  description: string
  example: string
  category: 'wajib' | 'opsional' | 'mock'
}

function collectEnvChecklist(): EnvCheckItem[] {
  const items: EnvCheckItem[] = [
    {
      key: 'AUTH_SESSION_SECRET',
      filled: Boolean(process.env.AUTH_SESSION_SECRET?.trim()),
      description: 'Secret key untuk enkripsi session cookie login. Wajib diisi agar session bisa dibuat di production.',
      example: 'openssl rand -hex 32  →  contoh: 4f7c2e9a1b3d5f7a9c1e2b4d6f8a0c2e1b3d5f7a9c1e2b4d6f8a0c2e1b3d5f7a',
      category: 'wajib',
    },
    {
      key: 'DATABASE_URL',
      filled: Boolean(process.env.DATABASE_URL?.trim()),
      description: 'Koneksi MySQL review database (schema ERP yang menyimpan akun auth_users). Kalau kosong, mode otomatis fallback / mock.',
      example: 'mysql://username_erp:PasswordRahasia@host-db:3306/nama_database_erp',
      category: 'wajib',
    },
    {
      key: 'ALLOW_BOOTSTRAP_MOCK_AUTH',
      filled: Boolean(String(process.env.ALLOW_BOOTSTRAP_MOCK_AUTH ?? '').trim()),
      description: 'Isi dengan nilai 1 atau true untuk mengaktifkan login akun bootstrap mock (jika review DB belum siap diisi).',
      example: '1',
      category: 'opsional',
    },
    {
      key: 'BOOTSTRAP_MOCK_AUTH_CREDENTIALS',
      filled: Boolean(process.env.BOOTSTRAP_MOCK_AUTH_CREDENTIALS?.trim()),
      description: 'Alternatif jika BOOTSTRAP_MOCK_AUTH_PASSWORD_* terlalu banyak. Format JSON: [{"username":"...","password":"...","role":"ADMIN","displayName":"..."}]',
      example: '[{"username":"admin","password":"admin123","role":"ADMIN","displayName":"Admin Review"}]',
      category: 'mock',
    },
    {
      key: 'APP_DATA_MODE',
      filled: Boolean(String(process.env.APP_DATA_MODE ?? '').trim()),
      description: 'Isi "review-db" jika ingin pakai database asli, atau "mock" jika ingin mock penuh. Default review-db dengan fallback mock bila DB tidak tersedia.',
      example: 'review-db',
      category: 'opsional',
    },
  ]

  const passwordKeys: Array<{ key: string; label: string }> = [
    { key: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_ADMIN_PERKASA', label: 'ADMIN' },
    { key: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_MARKETING_REVIEW', label: 'MARKETING_REVIEW' },
    { key: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_CS_OPERATOR', label: 'CS_OPERATOR' },
    { key: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_CS_REVIEW', label: 'CS_REVIEW' },
    { key: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_SUPPORT_OPS', label: 'SUPPORT_OPS' },
    { key: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_TT_REVIEW', label: 'TT_REVIEW' },
    { key: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_DISMANTLE_REVIEW', label: 'DISMANTLE_REVIEW' },
    { key: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_CREATOR_REVIEW', label: 'CREATOR_REVIEW' },
    { key: 'BOOTSTRAP_MOCK_AUTH_PASSWORD_FIELD_REVIEW', label: 'FIELD_REVIEW' },
  ]

  passwordKeys.forEach((entry) => {
    const filled = Boolean(process.env[entry.key]?.trim())
    items.push({
      key: entry.key,
      filled,
      description: `Password akun bootstrap mock role ${entry.label}. Diabaikan jika DATABASE_URL terisi atau ALLOW_BOOTSTRAP_MOCK_AUTH != 1.`,
      example: `${entry.label.toLowerCase()}_123`,
      category: 'mock',
    })
  })

  return items
}

function getLoginErrorMessage(error: string | undefined) {
  switch (error) {
    case 'invalid_credentials':
      return 'Username atau password tidak cocok dengan akun yang aktif.'
    case 'auth_unavailable':
      return 'Layanan login belum bisa dijangkau. Periksa koneksi review DB atau aktifkan jalur login lokal yang memang sedang dipakai.'
    case 'auth_required':
      return 'Silakan login terlebih dulu untuk membuka modul aplikasi.'
    case 'auth_config_missing':
      return 'Konfigurasi environment production belum lengkap. Session atau koneksi review DB tidak bisa dijalankan. Silakan isi daftar variabel di bawah ini (copy paste untuk dikirim ke tim IT pengelola Coolify).'
    default:
      return null
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>
}) {
  let forcedErrorCode: string | undefined

  try {
    const session = await getSession()
    if (session) {
      redirect(getDefaultLandingPath(session.role))
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error ?? '')
    if (/AUTH_SESSION_SECRET|DATABASE_URL/i.test(msg)) {
      forcedErrorCode = 'auth_unavailable'
    } else if (forcedErrorCode === undefined) {
      forcedErrorCode = 'auth_unavailable'
    }
  }

  let resolvedSearchParams: { error?: string | string[] } = {}
  try {
    resolvedSearchParams = await searchParams
  } catch {
    resolvedSearchParams = {}
  }

  const errorValue = forcedErrorCode ?? resolvedSearchParams.error
  const errorCode = Array.isArray(errorValue) ? errorValue[0] : errorValue
  const errorMessage = getLoginErrorMessage(errorCode)

  let dataSource
  let bootstrapMockAuthEnabled
  let envChecklist: EnvCheckItem[]
  try {
    dataSource = getDataSourceSnapshot()
    bootstrapMockAuthEnabled = isBootstrapMockAuthEnabled()
    envChecklist = collectEnvChecklist()
  } catch {
    dataSource = {
      configuredMode: 'review-db' as const,
      effectiveMode: 'mock' as const,
      isFallback: true,
      label: 'Mock Fallback',
      detail: 'Terdeteksi kendala saat membaca sumber data. Aplikasi otomatis memakai mode fallback lokal.',
    }
    bootstrapMockAuthEnabled = true
    envChecklist = collectEnvChecklist()
  }

  const requiredMissing = envChecklist.filter((x) => x.category === 'wajib' && !x.filled)
  const optionalMissing = envChecklist.filter((x) => x.category === 'opsional' && !x.filled)
  const mockMissing = envChecklist.filter((x) => x.category === 'mock' && !x.filled)
  const allEnvMissing = [...requiredMissing, ...optionalMissing, ...mockMissing]
  const envIssuePresent = requiredMissing.length > 0 || errorCode === 'auth_config_missing' || errorCode === 'auth_unavailable'

  const envIssuePayloadJson = JSON.stringify(
    {
      app: 'perkasa-erp-oss-bss',
      url: process.env.NEXT_PUBLIC_APP_URL ?? '',
      requiredEnv: requiredMissing.map((x) => ({ KEY: x.key, CONTOH: x.example, KETERANGAN: x.description })),
      optionalEnv: optionalMissing.map((x) => ({ KEY: x.key, CONTOH: x.example, KETERANGAN: x.description })),
      mockEnvHint: mockMissing.length
        ? ([
            ...mockMissing.slice(0, 3).map((x) => ({ KEY: x.key, CONTOH: x.example })),
            { CATATAN: `Sisa ${Math.max(mockMissing.length - 3, 0)} mock password key lain format sama per role.` },
          ] as unknown[])
        : [],
      dataSource,
      bootstrapMockAuthEnabled,
    },
    null,
    2,
  )

  const authModeDescription =
    dataSource.effectiveMode === 'review-db' && !dataSource.isFallback
      ? bootstrapMockAuthEnabled
        ? 'Login utama memakai akun review DB. Jalur mock hanya dipakai jika sengaja diaktifkan untuk review lokal.'
        : 'Login hanya menerima akun review DB yang aktif. Jalur mock sedang dimatikan agar pembacaan hasil lebih jujur.'
      : 'Aplikasi sedang memakai mode lokal / fallback. Login bisa memakai akun bootstrap mock yang sengaja diisi pada environment lokal.'

  return (
    <main className="min-h-screen min-w-0 max-w-[100vw] overflow-x-hidden px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] min-w-0 max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section
          className="min-w-0 overflow-hidden rounded-[28px] p-8 shadow-2xl lg:p-12"
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

        <section className="min-w-0 overflow-hidden panel flex items-center p-6 sm:p-8 lg:p-10">
          <div className="w-full min-w-0">
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

            {envIssuePresent ? (
              <div
                className="mt-6 rounded-2xl border p-4 text-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-warning) 14%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--color-warning) 35%, transparent)',
                  color: 'var(--color-ink-strong)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
                      Environment perlu dilengkapi
                    </p>
                    <p className="mt-2 text-sm leading-6">
                      {requiredMissing.length > 0
                        ? `Terdeteksi ${requiredMissing.length} variabel WAJIB yang masih kosong. Tim IT pengelola Coolify perlu mengisi variabel ini agar layanan login dan koneksi database ERP berjalan normal.`
                        : 'Beberapa variabel pendukung belum diisi. Layanan utama sudah bisa berjalan dengan mode fallback.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <details className="group">
                      <summary
                        className="cursor-pointer select-none rounded-2xl border border-line px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                        style={{ color: 'var(--color-mute-strong)' }}
                      >
                        Lihat daftar kunci env
                      </summary>
                      <div className="mt-4 space-y-4">
                        {requiredMissing.length > 0 ? (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-danger)' }}>
                              🔴 Wajib
                            </p>
                            <ul className="mt-2 space-y-2">
                              {requiredMissing.map((item) => (
                                <li key={item.key} className="rounded-xl border border-line px-3 py-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-mono text-xs font-semibold" style={{ color: 'var(--color-ink-strong)' }}>
                                        {item.key}
                                      </p>
                                      <p className="mt-1 text-xs leading-5 text-mute">{item.description}</p>
                                    </div>
                                  </div>
                                  <p className="mt-2 font-mono text-[11px] leading-4 text-mute">
                                    Contoh: {item.example}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {optionalMissing.length > 0 ? (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-warning)' }}>
                              🟡 Opsional
                            </p>
                            <ul className="mt-2 space-y-2">
                              {optionalMissing.map((item) => (
                                <li key={item.key} className="rounded-xl border border-line px-3 py-2">
                                  <p className="font-mono text-xs font-semibold" style={{ color: 'var(--color-ink-strong)' }}>
                                    {item.key}
                                  </p>
                                  <p className="mt-1 text-xs leading-5 text-mute">{item.description}</p>
                                  <p className="mt-2 font-mono text-[11px] leading-4 text-mute">
                                    Contoh: {item.example}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                        {mockMissing.length > 0 && bootstrapMockAuthEnabled ? (
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-accent)' }}>
                              🔵 Mock Auth ({mockMissing.length} kunci)
                            </p>
                            <ul className="mt-2 space-y-2 max-h-60 overflow-auto pr-1">
                              {mockMissing.map((item) => (
                                <li key={item.key} className="rounded-xl border border-line px-3 py-2">
                                  <p className="font-mono text-[11px] font-semibold" style={{ color: 'var(--color-ink-strong)' }}>
                                    {item.key}
                                  </p>
                                  <p className="mt-1 text-[11px] leading-4 text-mute">{item.description}</p>
                                  <p className="mt-1 font-mono text-[11px] leading-4 text-mute">
                                    Contoh: {item.example}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </details>
                    <details className="group">
                      <summary
                        className="cursor-pointer select-none rounded-2xl px-4 py-2 text-xs font-semibold transition hover:opacity-90"
                        style={{
                          backgroundColor: 'var(--color-accent)',
                          color: 'var(--color-accent-ink)',
                        }}
                      >
                        Copy JSON daftar env (untuk tim IT)
                      </summary>
                      <div className="mt-4">
                        <p className="text-[11px] leading-4 text-mute mb-2">
                          Tempel isi di bawah ini ke chat tim IT yang mengelola Coolify. Semua nama kunci environment, contoh nilai, dan keterangan sudah diringkas otomatis dari state server saat ini.
                        </p>
                        <pre
                          className="min-w-0 max-w-full break-all max-h-80 overflow-auto overflow-x-auto whitespace-pre-wrap rounded-xl border border-line p-3 text-[11px] leading-5"
                          style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-mute-strong)' }}
                        >
                          {envIssuePayloadJson}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            ) : null}

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
                className="w-full rounded-2xl px-5 py-4 text-sm font-semibold transition hover:opacity-92"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-accent-ink)',
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
