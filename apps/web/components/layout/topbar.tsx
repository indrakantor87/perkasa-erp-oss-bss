'use client'

import Link from 'next/link'
import { findNavigationItem } from '@/lib/navigation'
import type { AppSession } from '@/lib/auth-session'
import { useUiLanguage } from '@/components/layout/ui-language'
import { useUiTheme } from '@/components/layout/ui-theme'
import { getRoleMeta } from '@/lib/role-meta'
import { translateUiText } from '@/lib/ui-language'

type TopbarProps = {
  pathname: string
  session: AppSession | null
  allowedPrefixes: string[]
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function Topbar({ pathname, session, allowedPrefixes }: TopbarProps) {
  const activeItem = findNavigationItem(pathname)
  const { language, setLanguage } = useUiLanguage()
  const { theme, setTheme } = useUiTheme()
  const canReviewImport =
    session ? allowedPrefixes.some((prefix) => matchesPrefix('/import', prefix)) : false
  const hideQuickControls = session?.role === 'SUPER_ADMIN'
  const roleMeta = session ? getRoleMeta(session.role, language) : null
  const activeTitle = translateUiText(activeItem.title, language)
  const activeDescription = translateUiText(activeItem.description, language)
  const importLabel = translateUiText('Buka Import', language)
  const logoutLabel = translateUiText('Keluar', language)
  const themeLabel = translateUiText('Tema', language)
  const workspaceDescription =
    session && roleMeta
      ? language === 'en'
        ? `Workspace for ${roleMeta.label} focused on ${roleMeta.scope.toLowerCase()}. Open the relevant queues, work tables, and modules from here.`
        : `Area kerja ${roleMeta.label} untuk ${roleMeta.scope.toLowerCase()}. Buka antrean, tabel kerja, dan modul yang relevan dari sini.`
      : language === 'en'
        ? 'Open the main workspace, priority queues, and operational modules from one compact shell.'
        : 'Buka area kerja utama, antrean prioritas, dan modul operasional dari satu shell yang lebih ringkas.'

  return (
    <header className="flex flex-col gap-5 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between" suppressHydrationWarning>
      <div className="space-y-2.5">
        <span className="section-title">{activeDescription}</span>
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-[28px] font-bold tracking-tight text-[var(--color-ink-strong)] lg:text-3xl">
            {activeTitle}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">{workspaceDescription}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          {!hideQuickControls ? (
            <div className="surface-soft inline-flex items-center rounded-full border p-1">
              <span className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-mute">
                {themeLabel}
              </span>
              {([
                ['light', 'Light'],
                ['dark', 'Dark'],
              ] as const).map(([value, label]) => {
                const active = theme === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTheme(value)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? 'text-[var(--color-accent-ink)]'
                        : 'text-mute hover:text-[var(--color-ink-strong)]'
                    }`}
                    style={active ? { backgroundColor: 'var(--color-accent)' } : undefined}
                    aria-label={label}
                    title={label}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          ) : null}
          {!hideQuickControls ? (
            <div className="surface-soft inline-flex items-center rounded-full border p-1">
              {([
                ['id', 'ID'],
                ['en', 'EN'],
              ] as const).map(([value, label]) => {
                const active = language === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLanguage(value)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                      active
                        ? 'text-[var(--color-accent-ink)]'
                        : 'text-mute hover:text-[var(--color-ink-strong)]'
                    }`}
                    style={active ? { backgroundColor: 'var(--color-accent)' } : undefined}
                    aria-label={value === 'id' ? 'Gunakan Bahasa Indonesia' : 'Use English'}
                    title={value === 'id' ? 'Bahasa Indonesia' : 'English'}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          ) : null}
          {session ? (
            <div className="surface-soft hidden items-center gap-3 rounded-full border px-4 py-2.5 sm:flex">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
              >
                {session.displayName
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0] ?? '')
                  .join('')}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{session.displayName}</p>
                <p className="truncate text-xs text-mute">
                  {roleMeta ? `${roleMeta.division} / ${roleMeta.subdivision}` : null}
                </p>
              </div>
            </div>
          ) : null}

          {!hideQuickControls && canReviewImport ? (
            <Link
              href="/import"
              prefetch={false}
              className="surface-soft rounded-full border px-4 py-3 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)]"
            >
              {importLabel}
            </Link>
          ) : null}
          {!hideQuickControls ? (
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="surface-soft rounded-full border px-4 py-3 text-sm font-semibold text-ink transition hover:[border-color:var(--color-line-strong)]"
              >
                {logoutLabel}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </header>
  )
}
