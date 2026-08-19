import type { DataSourceSnapshot } from '@/lib/types'

export function DataSourceStatus({ source }: { source: DataSourceSnapshot }) {
  let toneStyle: React.CSSProperties
  if (source.isFallback) {
    toneStyle = {
      borderColor: 'var(--color-warning-line)',
      backgroundColor: 'var(--color-warning-soft)',
      color: 'var(--color-warning-ink)',
    }
  } else if (source.effectiveMode === 'review-db') {
    toneStyle = {
      borderColor: 'var(--color-success-line)',
      backgroundColor: 'var(--color-success-soft)',
      color: 'var(--color-success-ink)',
    }
  } else {
    toneStyle = {
      borderColor: 'var(--color-line)',
      backgroundColor: 'var(--color-card-subtle)',
      color: 'var(--color-mute-strong)',
    }
  }

  return (
    <section
      className="rounded-3xl border px-5 py-4"
      style={toneStyle}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">Sumber Data</p>
          <p className="mt-2 text-lg font-semibold">{source.label}</p>
          <p className="mt-2 text-sm leading-6">{source.detail}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
          <span className="badge border-current/20 text-current">Configured: {source.configuredMode}</span>
          <span className="badge border-current/20 text-current">Effective: {source.effectiveMode}</span>
        </div>
      </div>
    </section>
  )
}
