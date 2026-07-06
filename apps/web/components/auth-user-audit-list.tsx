import type { AuthUserAuditItem } from '@/lib/types'

type AuthUserAuditListProps = {
  items: AuthUserAuditItem[]
}

const actionTone: Record<AuthUserAuditItem['actionType'], string> = {
  CREATE: 'bg-emerald-50 text-emerald-700',
  UPDATE: 'bg-blue-50 text-blue-700',
  RESET_PASSWORD: 'bg-amber-50 text-amber-700',
}

export function AuthUserAuditList({ items }: AuthUserAuditListProps) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-6 py-5">
        <p className="section-title">Audit User</p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Jejak perubahan user internal
        </h3>
      </div>

      <div className="space-y-4 p-4 md:p-6">
        {items.length ? (
          items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-line bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge border-transparent ${actionTone[item.actionType]}`}>
                      {item.actionType}
                    </span>
                    <span className="text-sm font-semibold text-slate-950">{item.targetUser}</span>
                  </div>
                  <p className="text-sm leading-6 text-slate-700">{item.detail}</p>
                </div>
                <div className="text-sm text-mute md:text-right">
                  <p className="font-semibold text-slate-950">{item.actor}</p>
                  <p className="mt-1">{item.happenedAt}</p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <article className="rounded-2xl border border-dashed border-line bg-slate-50 p-5 text-sm text-mute">
            Audit perubahan user internal belum tersedia.
          </article>
        )}
      </div>
    </section>
  )
}
