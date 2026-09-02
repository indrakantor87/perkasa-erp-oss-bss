'use client'

import Link from 'next/link'
import { useUiLanguage, dispatchLanguageChange } from '@/components/layout/ui-language'

export function SettingsPreferencesPage({
  canOpenImport,
}: {
  canOpenImport: boolean
}) {
  const { language, setLanguage } = useUiLanguage()

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <p className="section-title">Pengaturan</p>
        <h1 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
          Preferensi Aplikasi
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
          Atur bahasa, akses cepat import, dan keluar akun.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="panel p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Bahasa</p>
          <div className="mt-4 flex items-center gap-2 rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-1">
            {([
              ['id', 'ID'],
              ['en', 'EN'],
            ] as const).map(([value, label]) => {
              const active = language === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => dispatchLanguageChange(value)}
                  className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                    active ? 'text-[var(--color-accent-ink)]' : 'text-mute hover:text-[var(--color-ink-strong)]'
                  }`}
                  style={active ? { backgroundColor: 'var(--color-accent)' } : undefined}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </article>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-title">Aksi</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-[var(--color-ink-strong)]">
              Akses cepat
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {canOpenImport ? (
              <Link
                href="/import"
                prefetch={false}
                className="rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-5 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-soft)]"
              >
                Buka Import
              </Link>
            ) : null}
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-full border border-rose-600 bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  )
}

