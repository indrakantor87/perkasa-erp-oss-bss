import Link from 'next/link'
import { StatusBadge } from '@/components/ui-status-badge'
import { buildWorklistQueryHref, type WorklistQueryState } from '@/components/worklist/worklist-query'

type WorklistTabsProps = {
  queueOptions: string[]
  state: WorklistQueryState
}

export function WorklistTabs({ queueOptions, state }: WorklistTabsProps) {
  return (
    <section aria-label="Worklist queue tabs" className="card-tier-2 border border-line p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="section-title">Tab Queue</p>
          <h3 className="mt-1 text-lg font-semibold text-inkStrong">Perspektif kerja mengikuti role aktif</h3>
        </div>
        <StatusBadge tone="neutral" label={`${queueOptions.length} queue`} size="sm" ariaLabel={`Jumlah queue tersedia: ${queueOptions.length}`} />
      </div>

      <nav
        aria-label="Pilihan antrean"
        className="mt-5 flex gap-2 overflow-x-auto pb-1"
      >
        <ol className="flex items-center gap-2">
          {queueOptions.map((queue) => {
            const active = queue === state.queue
            return (
              <li key={queue}>
                <Link
                  href={buildWorklistQueryHref({
                    ...state,
                    queue,
                    selected: undefined,
                  })}
                  aria-current={active ? 'page' : undefined}
                  aria-pressed={active}
                  className={`whitespace-nowrap rounded-control border px-3.5 py-2 text-xs font-semibold transition ${
                    active
                      ? 'btn-primary bg-accent border-accent text-accentInk'
                      : 'btn-ghost bg-surfaceSoft border-line text-muteStrong hover:border-lineStrong hover:text-inkStrong'
                  } focus-visible:shadow-focus tap-44 inline-flex min-h-[2.75rem] items-center justify-center`}
                >
                  {queue}
                </Link>
              </li>
            )
          })}
        </ol>
      </nav>
    </section>
  )
}
