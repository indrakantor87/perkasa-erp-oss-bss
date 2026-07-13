type SupportWorkspaceHelperBadge = {
  label: string
  tone?: 'neutral' | 'info' | 'warning' | 'danger' | 'success'
}

function getBadgeClassName(tone: SupportWorkspaceHelperBadge['tone']) {
  if (tone === 'info') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (tone === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (tone === 'danger') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  return 'border-slate-200 bg-white text-slate-600'
}

export function SupportWorkspaceHelperNote({
  title,
  detail,
  badges,
}: {
  title: string
  detail: string
  badges: SupportWorkspaceHelperBadge[]
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Ringkasan Operasional</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{detail}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span key={`${badge.label}-${badge.tone ?? 'neutral'}`} className={`badge ${getBadgeClassName(badge.tone)}`}>
              {badge.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
