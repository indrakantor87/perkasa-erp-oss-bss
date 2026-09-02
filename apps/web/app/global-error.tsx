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
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-surface text-ink font-[family-name:var(--font-body)]">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
  var keyLs='perkasa.ui-theme';
  var keyCk='perkasa-ui-theme';
  var keyCkResolved='perkasa-ui-theme-system-resolved';
  var pref='';
  try{pref=window.localStorage.getItem(keyLs)||'';}catch(e){pref='';}
  if(!pref){try{var cks=('; '+document.cookie).split('; '+keyCk+'=');if(cks.length===2){pref=cks.pop().split(';').shift()||'';}}catch(e){pref='';}}
  pref=(pref||'').trim().toLowerCase();
  if(pref!=='light'&&pref!=='dark'&&pref!=='system'){pref='system';}
  var resolved=pref;
  if(resolved==='system'){try{if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches){resolved='dark';}else{resolved='light';}}catch(e){resolved='light';}}
  try{document.cookie=keyCkResolved+'='+resolved+'; path=/; max-age=31536000; samesite=lax';}catch(e){}
  var el=document.documentElement;if(el.getAttribute('data-theme')!==resolved){el.setAttribute('data-theme',resolved);}
  el.style.colorScheme=resolved;
}catch(e){try{document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}catch(e2){}}})();`
          }}
        />
        <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-2xl">
            <div className="panel p-8 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/15 text-danger">
                  <span className="text-xl font-bold">!</span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Root Layout Error</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight text-inkStrong">Aplikasi tertahan di server</h1>
                </div>
              </div>

              <p className="mt-6 text-sm leading-7 text-muteStrong">{safeMessage}</p>
              <p className="mt-3 text-sm leading-7 text-mute">
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
                  className="rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-accentInk transition hover:bg-accent/90 ui-standard focus-visible:shadow-focus"
                >
                  Muat ulang aplikasi
                </button>
                <a
                  href="/login"
                  className="rounded-2xl border border-line bg-surface px-5 py-3 text-sm font-semibold text-inkStrong transition hover:bg-surfaceSoft ui-standard focus-visible:shadow-focus"
                >
                  Ke halaman login
                </a>
              </div>

              {typeof error?.digest === 'string' && error.digest.trim() ? (
                <div className="mt-8 rounded-2xl border border-dashed border-line px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">ID kejadian</p>
                  <p className="mt-2 font-mono text-xs text-muteStrong">{error.digest.trim()}</p>
                </div>
              ) : null}

              <div className="mt-6 rounded-2xl border border-line bg-surfaceSoft px-4 py-3 text-xs leading-6 text-mute">
                Keterangan teknis untuk tim IT: File <code className="font-mono">app/global-error.tsx</code> menangkap error yang tidak tercakup <code className="font-mono">app/error.tsx</code> (yaitu error yang terjadi saat render Root Layout server-side sebelum segment children di-mount).
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  )
}
