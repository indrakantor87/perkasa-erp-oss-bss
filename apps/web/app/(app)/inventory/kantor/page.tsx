import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'
import { canAccessPath } from '@/lib/access-control-server'
import type { AppRole } from '@/lib/types'
import { kantorWorkspace } from '@/lib/organization-workspaces'
import type {
  OrganizationWorkspaceLink,
  OrganizationWorkspaceSection,
} from '@/components/organization-workspace-page'
import { OrganizationWorkspacePage } from '@/components/organization-workspace-page'
import { KantorKendaraanTabContent } from '@/components/kantor-kendaraan-tab'

function resolveVisibleLink(
  role: AppRole,
  link: OrganizationWorkspaceLink,
): OrganizationWorkspaceLink | null {
  return canAccessPath(role, link.href.split('?')[0] ?? link.href) ? link : null
}

function resolveVisiblePrimary(
  role: AppRole,
  primary: OrganizationWorkspaceLink,
): OrganizationWorkspaceLink | null {
  return resolveVisibleLink(role, primary)
}

function resolveVisibleSecondary(
  role: AppRole,
  secondary?: OrganizationWorkspaceLink,
): OrganizationWorkspaceLink | null {
  if (!secondary) return null
  return resolveVisibleLink(role, secondary)
}

function resolveVisibleSections(
  role: AppRole,
  sections: OrganizationWorkspaceSection[],
): OrganizationWorkspaceSection[] {
  return sections
    .map((section) => ({
      ...section,
      links: section.links
        .map((link) => resolveVisibleLink(role, link))
        .filter((l): l is OrganizationWorkspaceLink => Boolean(l)),
    }))
    .filter((section) => section.links.length > 0)
}

export default async function KantorWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'kantor')) {
    redirect('/dashboard')
  }

  const verticalTabContents = {
    KENDARAAN: <KantorKendaraanTabContent />,
    KASBON: (
      <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
        <p className="section-title">Fitur Tahap Selanjutnya</p>
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
          Kasbon &amp; Utilitas
        </h2>
        <p className="mt-3 max-w-xl mx-auto text-sm leading-6 text-mute">
          Modul ini akan menampung pencatatan kasbon karyawan, pembayaran utilitas (listrik, internet, telepon),
          dan laporan pengeluaran rutin kantor. Fitur akan tersedia pada update berikutnya.
        </p>
      </section>
    ),
  }

  return (
    <OrganizationWorkspacePage
      role={session.role}
      eyebrow={kantorWorkspace.eyebrow}
      title={kantorWorkspace.title}
      description={kantorWorkspace.description}
      primaryAction={kantorWorkspace.primaryAction}
      secondaryAction={kantorWorkspace.secondaryAction}
      steps={kantorWorkspace.steps}
      sections={kantorWorkspace.sections}
      visiblePrimaryAction={resolveVisiblePrimary(session.role, kantorWorkspace.primaryAction)}
      visibleSecondaryAction={resolveVisibleSecondary(session.role, kantorWorkspace.secondaryAction)}
      visibleSections={resolveVisibleSections(session.role, kantorWorkspace.sections)}
      verticalTabs={kantorWorkspace.verticalTabs}
      verticalTabContents={verticalTabContents}
    />
  )
}
