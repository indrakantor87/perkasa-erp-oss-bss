'use client'

import Link from 'next/link'
import { findNavigationItem } from '@/lib/navigation'
import type { AppSession } from '@/lib/auth-session'
import { getRoleMeta } from '@/lib/role-meta'

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
  const canReviewImport =
    session ? allowedPrefixes.some((prefix) => matchesPrefix('/import', prefix)) : false
  const roleMeta = session ? getRoleMeta(session.role) : null

  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <span className="section-title">{activeItem.description}</span>
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {activeItem.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
            {session && roleMeta
              ? `Area kerja ${roleMeta.label} untuk ${roleMeta.scope.toLowerCase()}. Buka queue, tabel kerja, dan modul yang relevan dari sini.`
              : 'Buka area kerja utama, queue prioritas, dan modul operasional dari satu shell yang lebih ringkas.'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {session && roleMeta ? (
          <div className="rounded-2xl border border-line bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Fokus Kerja</p>
            <p className="mt-1 font-medium text-slate-900">
              {roleMeta.division} / {roleMeta.subdivision}
            </p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-600">{roleMeta.scope}</p>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          {session ? (
            <div className="hidden items-center gap-3 rounded-full border border-line bg-white px-4 py-3 sm:flex">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white">
                {session.displayName
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0] ?? '')
                  .join('')}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{session.displayName}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-mute">{roleMeta?.label}</p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {roleMeta ? `${roleMeta.division} / ${roleMeta.subdivision}` : null}
                </p>
              </div>
            </div>
          ) : null}

          {canReviewImport ? (
            <Link
              href="/import"
              className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Buka Import
            </Link>
          ) : null}
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
