import Link from 'next/link'
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

export function OrganizationWorkspacePage({
  role,
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  steps,
  sections,
}: {
  role: AppRole
  eyebrow: string
  title: string
  description: string
  primaryAction: OrganizationWorkspaceLink
  secondaryAction?: OrganizationWorkspaceLink
  steps: OrganizationWorkspaceStep[]
  sections: OrganizationWorkspaceSection[]
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

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-title">{eyebrow}</p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`badge border-transparent ${roleMeta.tone}`}>{roleMeta.shortLabel}</span>
            <span className="badge border-slate-200 bg-white text-slate-600">
              {roleMeta.division} / {roleMeta.subdivision}
            </span>
          </div>
        </div>

        {visiblePrimaryAction || visibleSecondaryAction ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {visiblePrimaryAction ? (
              <Link
                href={visiblePrimaryAction.href}
                className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                {visiblePrimaryAction.label}
              </Link>
            ) : null}
            {visibleSecondaryAction ? (
              <Link
                href={visibleSecondaryAction.href}
                className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                {visibleSecondaryAction.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="panel p-6">
        <p className="section-title">Alur kerja utama</p>
        <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
          Landing organisasi ini mengarahkan user ke workspace ERP yang benar-benar sudah hidup
        </h3>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <article key={step.title} className="rounded-2xl border border-line bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-950">{step.title}</p>
              <p className="mt-3 text-sm leading-6 text-mute">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {visibleSections.length ? (
        <section className="grid gap-6 xl:grid-cols-2">
          {visibleSections.map((section) => (
            <div key={section.title} className="panel p-6">
              <p className="section-title">{section.title}</p>
              <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                Workspace dan pintu tindak lanjut untuk role aktif
              </h3>
              <p className="mt-3 text-sm leading-6 text-mute">{section.description}</p>
              <div className="mt-6 space-y-3">
                {section.links.map((link) => (
                  <Link
                    key={`${section.title}-${link.href}-${link.label}`}
                    href={link.href}
                    className="block rounded-2xl border border-line bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-950">{link.label}</p>
                      {link.badge ? (
                        <span className="badge border-slate-200 bg-white text-slate-600">{link.badge}</span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-mute">{link.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  )
}
