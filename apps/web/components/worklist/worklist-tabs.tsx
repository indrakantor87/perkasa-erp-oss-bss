import Link from 'next/link'
import { buildWorklistQueryHref, type WorklistQueryState } from '@/components/worklist/worklist-query'

type WorklistTabsProps = {
  queueOptions: string[]
  state: WorklistQueryState
}

export function WorklistTabs({ queueOptions, state }: WorklistTabsProps) {
  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="section-title">Tab Queue</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">Perspektif kerja mengikuti role aktif</h3>
        </div>
        <span className="badge border-slate-200 bg-white text-slate-600">{queueOptions.length} queue</span>
      </div>

      <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
        {queueOptions.map((queue) => {
          const active = queue === state.queue
          return (
            <Link
              key={queue}
              href={buildWorklistQueryHref({
                ...state,
                queue,
                selected: undefined,
              })}
              className={`whitespace-nowrap rounded-2xl border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? 'border-slate-950 bg-slate-950 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:text-slate-950'
              }`}
            >
              {queue}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
