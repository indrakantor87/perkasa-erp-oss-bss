'use client'

import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  error: Error | null
  digest: string | null
}

function RootErrorFallback({
  error,
  digest,
  onReset,
}: {
  error: Error | null
  digest: string | null
  onReset: () => void
}) {
  const safeMessage = (() => {
    const msg = String(error?.message || '').trim()
    if (!msg) {
      return 'Terjadi kendala saat merender konten halaman.'
    }
    if (/AUTH_SESSION_SECRET/i.test(msg) || /DATABASE_URL/i.test(msg)) {
      return 'Layanan autentikasi atau basis data belum bisa dijangkau. Aplikasi otomatis kembali memuat halaman login.'
    }
    if (msg.length > 220) {
      return `${msg.slice(0, 217)}...`
    }
    return msg
  })()

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-3xl border border-line p-8 shadow-xl" style={{ backgroundColor: 'var(--color-card)' }}>
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-2xl"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-warning) 18%, transparent)',
                color: 'var(--color-warning)',
              }}
            >
              <span className="text-xl font-bold">⚠</span>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-mute">Render tertahan</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Konten tidak bisa ditampilkan otomatis</h1>
            </div>
          </div>

          <p className="mt-6 text-sm leading-7 text-mute-strong">{safeMessage}</p>
          <p className="mt-3 text-sm leading-7 text-mute">
            Ini adalah error boundary client-level di dalam root layout. Error tertangkap meskipun terjadi di luar segment children utama (contoh: import module SSR, root layout async, atau server fetch).
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onReset}
              className="rounded-2xl px-5 py-3 text-sm font-semibold transition hover:opacity-90"
              style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-accent-ink)',
              }}
            >
              Muat ulang halaman
            </button>
            <a
              href="/login"
              className="rounded-2xl border border-line px-5 py-3 text-sm font-semibold transition hover:opacity-90"
              style={{ color: 'var(--color-ink-strong)' }}
            >
              Buka halaman login
            </a>
            <button
              type="button"
              onClick={() => {
                try {
                  if (typeof window !== 'undefined') {
                    window.sessionStorage.clear()
                    window.localStorage.removeItem('perkasa.ui-theme')
                  }
                } catch {
                  // ignore
                }
                if (typeof window !== 'undefined') {
                  window.location.href = '/login'
                }
              }}
              className="rounded-2xl border border-dashed border-line px-5 py-3 text-xs font-semibold transition hover:opacity-90"
              style={{ color: 'var(--color-mute-strong)' }}
            >
              Reset storage & pergi login
            </button>
          </div>

          {digest ? (
            <div className="mt-8 rounded-2xl border border-dashed border-line px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">ID kejadian</p>
              <p className="mt-2 font-mono text-xs text-mute-strong">{digest}</p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}

export class RootSafeErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null, digest: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      error,
      digest: typeof (error as Error & { digest?: string }).digest === 'string'
        ? (error as Error & { digest: string }).digest.trim()
        : null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    try {
      // eslint-disable-next-line no-console
      console.error('[perkasa-erp] RootSafeErrorBoundary caught:', error?.message || String(error), errorInfo?.componentStack || '')
    } catch {
      // ignore logging errors
    }
  }

  handleReset = () => {
    this.setState({ error: null, digest: null })
    try {
      if (typeof window !== 'undefined') {
        window.location.reload()
      }
    } catch {
      // ignore
    }
  }

  render() {
    if (this.state.error != null) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <RootErrorFallback
          error={this.state.error}
          digest={this.state.digest}
          onReset={this.handleReset}
        />
      )
    }

    return this.props.children
  }
}

export default RootSafeErrorBoundary
