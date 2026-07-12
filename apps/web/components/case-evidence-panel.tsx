import type { CaseEvidencePanel } from '@/lib/types'

const defaultTone = 'border-slate-200 bg-slate-50 text-slate-700'

export function CaseEvidencePanelCard({
  evidence,
  title = 'Evidence Terakhir',
}: {
  evidence: CaseEvidencePanel
  title?: string
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className="mt-2 text-sm leading-6 text-mute">
            Bukti operasional terakhir yang paling relevan agar operator bisa melihat catatan, waktu, dan konteks tindakan tanpa membuka detail lane lain lebih dulu.
          </p>
        </div>
        {evidence.owner ? (
          <span className="badge border-slate-200 bg-slate-50 text-slate-700">Owner Bukti: {evidence.owner}</span>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {evidence.items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-sm font-semibold text-slate-950">{item.label}</p>
              {item.happenedAt ? <span className="text-xs font-medium text-slate-500">{item.happenedAt}</span> : null}
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{item.detail}</p>
            <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${item.tone || defaultTone}`}>
              Evidence {index + 1}
            </span>
          </div>
        ))}
      </div>
    </article>
  )
}
