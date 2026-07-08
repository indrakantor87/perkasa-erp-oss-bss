import type { SupportLaneWorkspace } from '@/lib/types'

export function SupportLaneWorkspacePanel({
  workspace,
  laneTone,
  roleTone,
  roleLabel,
  isExplicitFocus,
}: {
  workspace: SupportLaneWorkspace
  laneTone: string
  roleTone: string
  roleLabel: string
  isExplicitFocus: boolean
}) {
  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="section-title">Workspace lane aktif</p>
          <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
            {workspace.title}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{workspace.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`badge ${laneTone}`}>{workspace.count} item</span>
          <span className={`badge border-transparent ${roleTone}`}>{roleLabel}</span>
          <span className="badge border-slate-200 bg-white text-slate-600">
            {isExplicitFocus ? 'focus manual' : 'default role'}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Checklist</p>
          <div className="mt-4 space-y-3">
            {workspace.checklist.map((item) => (
              <div key={item} className="rounded-xl border border-line bg-white px-4 py-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Area review</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {workspace.sectionTitles.length ? (
              workspace.sectionTitles.map((item) => (
                <span key={item} className="badge border-slate-200 bg-white text-slate-600">
                  {item}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">Belum ada section review yang terpetakan.</span>
            )}
          </div>
          <p className="mt-4 text-sm leading-6 text-mute">
            Workspace ini memetakan lane ke section review yang paling relevan agar operator tidak perlu menafsir ulang data support.
          </p>
        </article>

        <article className="rounded-2xl border border-line bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">Eskalasi</p>
          <p className="mt-4 text-sm leading-6 text-slate-700">{workspace.escalationNote}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {workspace.actionKeys.map((item) => (
              <span key={item} className="badge border-slate-200 bg-white text-slate-600">
                {item}
              </span>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
