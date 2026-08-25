'use client'

import { useEffect } from 'react'

export default function GlobalError({
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
        console.error('[perkasa-erp] GLOBAL root error (global-error):', error?.message || String(error))
      } catch {
        // ignore logging errors
      }
    }
  }, [error])

  const safeMessage = (() => {
    const msg = String(error?.message || '').trim()
    if (!msg) {
      return 'Terjadi kendala internal yang tidak terduga saat memuat aplikasi.'
    }
    if (/AUTH_SESSION_SECRET/i.test(msg) || /DATABASE_URL/i.test(msg)) {
      return 'Layanan autentikasi atau basis data belum bisa dijangkau. Tim IT sedang memastikan environment server.'
    }
    if (msg.length > 220) {
      return `${msg.slice(0, 217)}...`
    }
    return msg
  })()

  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-[#0f172a] text-white">
        <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-2xl">
            <div className="rounded-3xl border border-slate-700 bg-slate-900/80 p-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
                  <span className="text-xl font-bold">!</span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Root Layout Error</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Aplikasi tertahan di server</h1>
                </div>
              </div>

              <p className="mt-6 text-sm leading-7 text-slate-300">{safeMessage}</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Error ini muncul dari lapisan root layout. Silakan tekan tombol muat ulang, atau buka kembali halaman login secara eksplisit.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      reset()
                    } catch {
                      if (typeof window !== 'undefined') {
                        window.location.href = '/login'
                      }
                    }
                  }}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  Muat ulang aplikasi
                </button>
                <a
                  href="/login"
                  className="rounded-2xl border border-slate-600 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
                >
                  Ke halaman login
                </a>
              </div>

              {typeof error?.digest === 'string' && error.digest.trim() ? (
                <div className="mt-8 rounded-2xl border border-dashed border-slate-600 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">ID kejadian</p>
                  <p className="mt-2 font-mono text-xs text-slate-300">{error.digest.trim()}</p>
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-slate-700/70 bg-slate-800/60 px-4 py-3 text-xs leading-6 text-slate-400">
                Keterangan teknis untuk tim IT: File `app/global-error.tsx` menangkap error yang tidak tercakup `app/error.tsx` (yaitu error yang terjadi saat render Root Layout server-side sebelum segment children di-mount).
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
