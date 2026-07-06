import Link from 'next/link'
import type { TransformStage } from '@/lib/types'

const statusTone: Record<TransformStage['status'], string> = {
  ready: 'bg-slate-100 text-slate-700',
  review: 'bg-amber-50 text-amber-700',
  done: 'bg-emerald-50 text-emerald-700',
}

export function ImportTransformStageList({ items }: { items: TransformStage[] }) {
  return (
    <div className="panel p-6">
      <div>
        <p className="section-title">Pipeline</p>
        <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
          Tahap transform review
        </h2>
      </div>

      <div className="mt-6 space-y-4">
        {items.map((item) => (
          <article key={item.stage} className="rounded-2xl border border-line bg-slate-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="badge border-slate-200 text-slate-600">Tahap {item.stage}</span>
                  <span className={`badge border-transparent ${statusTone[item.status]}`}>
                    {item.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-mute">{item.summary}</p>
              </div>

              <Link href={item.href} className="text-sm font-semibold text-blue-700">
                Lihat batch terkait
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
