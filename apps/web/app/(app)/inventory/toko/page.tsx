import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { canAccessOrganizationWorkspace } from '@/lib/organization-workspace-access'

export default async function TokoWorkspacePage() {
  const session = await requireSession()
  if (!canAccessOrganizationWorkspace(session.role, 'toko')) {
    redirect('/dashboard')
  }

  return (
    <section className="space-y-6">
      <div className="panel p-6">
        <p className="section-title">Operasional</p>
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
          Workspace Toko belum tersedia
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
          Menu Toko diposisikan sebagai business yang berbeda dan berada di luar scope bisnis ISP pada fase ini.
          Implementasi tabel kerja akan diaktifkan setelah ada gambaran proses yang sudah valid.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
            Kembali ke Dashboard
          </Link>
          <Link
            href="/inventory"
            className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
          >
            Buka Inventory (ISP)
          </Link>
        </div>
      </div>

      <div className="panel p-6">
        <p className="section-title">Tabel kerja</p>
        <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
          Worklist Toko
        </h3>
        <p className="mt-3 text-sm leading-6 text-mute">Placeholder sampai definisi proses Toko sudah final.</p>
        <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-[1080px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ringkasan</th>
                <th className="px-4 py-3">Metadata</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  Belum ada tabel kerja untuk Toko.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
