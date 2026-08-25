'use client'

import { useEffect } from 'react'

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        // eslint-disable-next-line no-console
        console.error('[perkasa-erp] Unhandled app error:', error?.message || String(error))
      } catch {
        // ignore logging errors
      }
    }
  }, [error])

  const safeMessage = (() => {
    const msg = String(error?.message || '').trim()
    if (!msg) {
      return 'Terjadi kendala internal yang tidak terduga saat memuat laman.'
    }
    if (/AUTH_SESSION_SECRET/i.test(msg) || /DATABASE_URL/i.test(msg)) {
      return 'Layanan autentikasi atau basis data belum bisa dijangkau. Silakan tunggu beberapa saat lalu coba lagi.'
    }
    if (msg.length > 220) {
      return `${msg.slice(0, 217)}...`
    }
    return msg
  })()

  return (
    <html lang="id">
      <body className="font-[family-name:var(--font-body)] antialiased min-h-screen bg-surface text-ink selection:bg-accent/20">
        <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-line p-8 shadow-xl" style={{ backgroundColor: 'var(--color-card)' }}>
              <div className="flex items-center gap-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-danger) 18%, transparent)',
                    color: 'var(--color-danger)',
                  }}
                >
                  <span className="text-xl font-bold">!</span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Terdeteksi kendala</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                    Laman tidak bisa dimuat otomatis
                  </h1>
                </div>
              </div>

              <p className="mt-6 text-sm leading-7 text-mute-strong">{safeMessage}</p>
              <p className="mt-3 text-sm leading-7 text-mute">
                Aplikasi tetap dapat menampilkan halaman login dan dashboard setelah kendala selesai. Silakan coba
                tombol di bawah ini untuk memuat ulang data halaman.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      reset()
                    } catch {
                      if (typeof window !== 'undefined') {
                        window.location.reload()
                      }
                    }
                  }}
                  className="rounded-2xl px-5 py-3 text-sm font-semibold transition hover:opacity-90"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-accent-ink)',
                  }}
                >
                  Muat ulang laman
                </button>
                <a
                  href="/login"
                  className="rounded-2xl border border-line px-5 py-3 text-sm font-semibold transition hover:opacity-90"
                  style={{ color: 'var(--color-ink-strong)' }}
                >
                  Ke halaman login
                </a>
              </div>

              {typeof error?.digest === 'string' && error.digest.trim() ? (
                <div className="mt-8 rounded-2xl border border-dashed border-line px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">ID kejadian</p>
                  <p className="mt-2 font-mono text-xs text-mute-strong">{error.digest.trim()}</p>
                </div>
              ) : null}
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
