'use client'

import Link from 'next/link'
import { findNavigationItem } from '@/lib/navigation'
import type { AppSession } from '@/lib/auth-session'
import { useUiLanguage, dispatchLanguageChange } from '@/components/layout/ui-language'
import { useUiTheme, dispatchThemeChange } from '@/components/layout/ui-theme'
import { getRoleMeta } from '@/lib/role-meta'
import { translateUiText } from '@/lib/ui-language'
import { PageHeader } from '@/components/page-header'
import {
  ShellIconButton,
  IconSearch,
  IconSun,
  IconMoon,
  IconMonitor,
  IconLogout,
} from '@/components/shell-icon-button'

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
  const { language } = useUiLanguage()
  const { theme } = useUiTheme()
  const canReviewImport =
    session ? allowedPrefixes.some((prefix) => matchesPrefix('/import', prefix)) : false
  const hideQuickControls = session?.role === 'SUPER_ADMIN'
  const roleMeta = session ? getRoleMeta(session.role, language) : null
  const activeTitle = translateUiText(activeItem.title, language)
  const activeDescription = translateUiText(activeItem.description, language)
  const importLabel = translateUiText('Buka Import', language)
  const logoutLabel = translateUiText('Keluar', language)
  const themeLabel = translateUiText('Tema', language)
  const searchLabel = translateUiText('Cari (Ctrl+K)', language)
  const langLabelId = translateUiText('Gunakan Bahasa Indonesia', language)
  const langLabelEn = translateUiText('Use English', language)
  const themeLightLabel = translateUiText('Tema Terang', language)
  const themeDarkLabel = translateUiText('Tema Gelap', language)
  const themeSystemLabel = translateUiText('Tema Sistem', language)

  const workspaceDescription =
    session && roleMeta
      ? language === 'en'
        ? `Workspace for ${roleMeta.label} focused on ${roleMeta.scope.toLowerCase()}. Open the relevant queues, work tables, and modules from here.`
        : `Area kerja ${roleMeta.label} untuk ${roleMeta.scope.toLowerCase()}. Buka antrean, tabel kerja, dan modul yang relevan dari sini.`
      : language === 'en'
        ? 'Open the main workspace, priority queues, and operational modules from one compact shell.'
        : 'Buka area kerja utama, antrean prioritas, dan modul operasional dari satu shell yang lebih ringkas.'

  const breadcrumbs = [
    { label: translateUiText('Beranda', language), href: '/dashboard' },
    { label: activeTitle },
  ]

  const actions = (
    <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3">
      <ShellIconButton
        variant="soft"
        label={searchLabel}
        icon={<IconSearch className="h-5 w-5" />}
        onClick={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('perkasa:open-command'))
          }
        }}
      />
      <div
        className="inline-flex items-center gap-1 rounded-full border border-line bg-surfaceSoft p-1"
        role="group"
        aria-label={themeLabel}
      >
        {([
          ['light', themeLightLabel, IconSun] as const,
          ['system', themeSystemLabel, IconMonitor] as const,
          ['dark', themeDarkLabel, IconMoon] as const,
        ]).map(([value, label, Ico]) => {
          const active = theme === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => { dispatchThemeChange(value) }}
              aria-label={label}
              title={label}
              aria-pressed={active ? 'true' : undefined}
              className={`tap-44 h-11 w-11 inline-flex items-center justify-center rounded-full transition duration-fast ui-standard focus-visible:shadow-focus ${
                active
                  ? 'bg-accent text-accentInk shadow-soft'
                  : 'text-mute hover:text-inkStrong hover:bg-surface'
              }`}
            >
              <Ico className="h-5 w-5" aria-hidden="true" />
            </button>
          )
        })}
      </div>
      <div
        className="inline-flex items-center gap-1 rounded-full border border-line bg-surfaceSoft p-1"
        role="group"
        aria-label={translateUiText('Bahasa', language)}
      >
        {([
          ['id', langLabelId, 'ID'] as const,
          ['en', langLabelEn, 'EN'] as const,
        ]).map(([value, label, short]) => {
          const active = language === value
          return (
            <button
              key={value}
              type="button"
              onClick={() => { dispatchLanguageChange(value) }}
              aria-label={label}
              title={label}
              aria-pressed={active ? 'true' : undefined}
              className={`tap-44 h-11 min-w-[52px] inline-flex items-center justify-center rounded-full px-2 text-[11px] font-bold tracking-wide transition duration-fast ui-standard focus-visible:shadow-focus ${
                active
                  ? 'bg-accent text-accentInk shadow-soft'
                  : 'text-mute hover:text-inkStrong hover:bg-surface'
              }`}
            >
              {short}
            </button>
          )
        })}
      </div>
      {session ? (
        <div
          className="surface-soft flex items-center gap-2 rounded-full border border-line bg-surfaceSoft px-1.5 py-1.5 sm:gap-3 sm:px-2.5"
          title={session.displayName}
        >
          <div
            className="tap-44 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}
          >
            {session.displayName
              .split(' ')
              .slice(0, 2)
              .map((part) => part[0] ?? '')
              .join('')}
          </div>
          <div className="hidden min-w-0 pr-1 sm:block">
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
          className="inline-flex h-11 items-center rounded-full border border-line bg-surfaceSoft px-4 text-sm font-semibold text-ink transition duration-fast ui-standard hover:[border-color:var(--color-line-strong)] hover:bg-surface cursor-pointer select-none focus-visible:shadow-focus"
        >
          {importLabel}
        </Link>
      ) : null}

      <form action="/api/auth/logout" method="post">
        <ShellIconButton
          variant="soft"
          label={logoutLabel}
          icon={<IconLogout className="h-5 w-5" />}
          type="submit"
        />
      </form>
    </div>
  )

  return (
    <header className="pb-6 lg:pb-8" suppressHydrationWarning>
      <PageHeader
        eyebrow={activeDescription}
        title={activeTitle}
        description={workspaceDescription}
        breadcrumbs={breadcrumbs}
        actions={actions}
      />
    </header>
  )
}
