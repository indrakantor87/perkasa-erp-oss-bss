import type { AppRole, PermissionMatrixEntry } from '@/lib/types'
import { getRoleMeta } from '@/lib/role-meta'

export function PermissionMatrix({
  role,
  entries,
}: {
  role: AppRole
  entries: PermissionMatrixEntry[]
}) {
  const roleMeta = getRoleMeta(role)
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-6 py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-title">Permission Matrix</p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              Cakupan izin per role
            </h2>
          </div>
          <span className={`badge border-transparent ${roleMeta.tone}`}>{roleMeta.label}</span>
        </div>
      </div>

      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-slate-50 text-mute">
            <tr>
              <th className="px-6 py-4 font-semibold">Resource</th>
              <th className="px-6 py-4 font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-white">
            {entries.map((entry) => (
              <tr key={entry.resource}>
                <td className="px-6 py-5">
                  <p className="font-semibold text-slate-950">{entry.label}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mute">
                    {entry.resource}
                  </p>
                </td>
                <td className="px-6 py-5">
                  <div className="flex flex-wrap gap-2">
                    {entry.actions.map((action) => (
                      <span key={`${entry.resource}-${action}`} className="badge border-slate-200 text-slate-700">
                        {action}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 p-4 md:hidden">
        {entries.map((entry) => (
          <article key={entry.resource} className="rounded-2xl border border-line bg-slate-50 p-4">
            <p className="font-semibold text-slate-950">{entry.label}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-mute">{entry.resource}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {entry.actions.map((action) => (
                <span key={`${entry.resource}-${action}`} className="badge border-slate-200 text-slate-700">
                  {action}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
