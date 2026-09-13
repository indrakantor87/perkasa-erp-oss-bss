'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { canAccessPath } from '@/lib/access-control-server'
import { getRoleMeta } from '@/lib/role-meta'
import type { AppRole } from '@/lib/types'

export type OrganizationWorkspaceLink = {
  label: string
  href: string
  description: string
  badge?: string
}

export type OrganizationWorkspaceSection = {
  title: string
  description: string
  links: OrganizationWorkspaceLink[]
}

export type OrganizationWorkspaceStep = {
  title: string
  detail: string
}

export type OrganizationWorkspaceVerticalTab = {
  key: string
  shortLabel: string
  label: string
}

export function OrganizationWorkspacePage({
  role,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  steps,
  sections,
  verticalTabs,
  verticalTabContents,
}: {
  role: AppRole
  eyebrow: string
  title: string
  description: string
  primaryAction: OrganizationWorkspaceLink
  secondaryAction?: OrganizationWorkspaceLink
  steps: OrganizationWorkspaceStep[]
  sections: OrganizationWorkspaceSection[]
  verticalTabs?: OrganizationWorkspaceVerticalTab[]
  verticalTabContents?: Record<string, ReactNode>
}) {
  const roleMeta = getRoleMeta(role)
  const visiblePrimaryAction = canAccessPath(role, primaryAction.href.split('?')[0] ?? primaryAction.href)
    ? primaryAction
    : null
  const visibleSecondaryAction =
    secondaryAction && canAccessPath(role, secondaryAction.href.split('?')[0] ?? secondaryAction.href)
      ? secondaryAction
      : null
  const visibleSections = sections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => canAccessPath(role, link.href.split('?')[0] ?? link.href)),
    }))
    .filter((section) => section.links.length > 0)
  const totalLinks = visibleSections.reduce((count, section) => count + section.links.length, 0)

  const defaultTabKey = verticalTabs?.[0]?.key ?? 'DEFAULT'
  const [activeTabKey, setActiveTabKey] = useState<string>(defaultTabKey)

  const useVerticalLayout =
    Array.isArray(verticalTabs) && verticalTabs.length > 0 && Object.keys(verticalTabContents ?? {}).length > 0

  function renderDefaultContent() {
    return (
      <>
        <section className="rounded-xl border border-line bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Alur kerja utama</p>
              <p className="mt-1 text-sm text-mute">Urutan kerja ringkas untuk role aktif.</p>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.title} className="rounded-md border border-line bg-white px-3 py-2">
                <p className="text-sm font-semibold text-slate-950">{step.title}</p>
                <p className="mt-1 text-sm leading-5 text-mute">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        {visibleSections.length ? (
          <section className="grid gap-4 xl:grid-cols-2">
            {visibleSections.map((section) => (
              <div key={section.title} className="rounded-xl border border-line bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="section-title">{section.title}</p>
                  <h3 className="mt-1 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-slate-950">
                    Menu kerja untuk role aktif
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-mute">{section.description}</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {section.links.map((link) => (
                    <Link
                      key={`${section.title}-${link.href}-${link.label}`}
                      href={link.href}
                      className="block px-4 py-3 transition hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-950">{link.label}</p>
                        {link.badge ? (
                          <span className="badge border-slate-200 bg-white text-slate-600">{link.badge}</span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-5 text-mute">{link.description}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ) : null}
      </>
    )
  }

  function renderActiveTabContent() {
    if (!useVerticalLayout) return renderDefaultContent()
    const custom = verticalTabContents?.[activeTabKey]
    if (custom != null) return <>{custom}</>
    return renderDefaultContent()
  }

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="section-title">{eyebrow}</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-5 text-mute">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`badge border-transparent ${roleMeta.tone}`}>{roleMeta.shortLabel}</span>
            <span className="badge border-slate-200 bg-white text-slate-600">
              {roleMeta.division} / {roleMeta.subdivision}
            </span>
            <span className="badge border-slate-200 bg-white text-slate-600">{totalLinks} menu kerja</span>
          </div>
        </div>

        {visiblePrimaryAction || visibleSecondaryAction ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {visiblePrimaryAction ? (
              <Link
                href={visiblePrimaryAction.href}
                className="rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-white"
              >
                {visiblePrimaryAction.label}
              </Link>
            ) : null}
            {visibleSecondaryAction ? (
              <Link
                href={visibleSecondaryAction.href}
                className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700"
              >
                {visibleSecondaryAction.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      {useVerticalLayout ? (
        <div className="grid gap-3 lg:grid-cols-[120px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-line bg-white p-2 lg:sticky lg:top-4 lg:self-start">
            <nav className="flex flex-row gap-1 overflow-x-auto lg:flex-col" aria-label="Tabs">
              {verticalTabs!.map((tab) => {
                const active = tab.key === activeTabKey
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTabKey(tab.key)}
                    title={tab.label}
                    className={
                      active
                        ? 'flex min-w-[96px] flex-col items-start gap-0.5 rounded-xl bg-slate-950 px-3 py-2 text-left text-xs font-semibold text-white shadow-sm lg:min-w-0 lg:w-full'
                        : 'flex min-w-[96px] flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-mute transition hover:bg-slate-50 hover:text-slate-700 lg:min-w-0 lg:w-full'
                    }
                  >
                    <span className="uppercase tracking-[0.14em]">{tab.shortLabel}</span>
                    <span className={active ? 'text-[11px] font-normal text-slate-200' : 'text-[11px] font-normal'}>
                      {tab.label}
                    </span>
                  </button>
                )
              })}
            </nav>
          </aside>
          <div className="space-y-4 min-w-0">{renderActiveTabContent()}</div>
        </div>
      ) : (
        renderActiveTabContent()
      )}
    </div>
  )
}
