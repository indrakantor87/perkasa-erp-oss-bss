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
          <h3 className="mt-2 text-xl font-semibold text-[var(--color-ink-strong)]">Perspektif kerja mengikuti role aktif</h3>
        </div>
        <span className="solid-chip">{queueOptions.length} queue</span>
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
                  ? 'text-[var(--color-accent-ink)]'
                  : 'surface-soft text-[var(--color-mute-strong)] hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]'
              }`}
              style={active ? { borderColor: 'var(--color-accent)', backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' } : undefined}
            >
              {queue}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
