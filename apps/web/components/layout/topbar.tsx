'use client'

import Link from 'next/link'
import { Bell, Search } from 'lucide-react'
import { canAccessPath } from '@/lib/access-control'
import { findNavigationItem } from '@/lib/navigation'
import type { AppSession } from '@/lib/auth-session'

type TopbarProps = {
  pathname: string
  session: AppSession | null
}

export function Topbar({ pathname, session }: TopbarProps) {
  const activeItem = findNavigationItem(pathname)
  const canReviewImport = session ? canAccessPath(session.role, '/import') : false

  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        <span className="section-title">{activeItem.description}</span>
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {activeItem.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
            App shell tunggal untuk migrasi data, monitoring operasional, dan modul bisnis ISP
            dalam satu domain aplikasi.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 rounded-full border border-line bg-white px-4 py-3 text-sm text-mute">
          <Search className="h-4 w-4" />
          <span>Pencarian modul</span>
        </label>

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
                <p className="text-xs uppercase tracking-[0.18em] text-mute">{session.role}</p>
              </div>
            </div>
          ) : null}

          {canReviewImport ? (
            <Link
              href="/import"
              className="rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Review Batch
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
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-line bg-white text-slate-700 transition hover:border-slate-300"
            aria-label="Notifikasi"
          >
            <Bell className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
