function DomainLoadingPanel({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl border border-line bg-[var(--color-card-subtle)] ${className}`} />
}

export default function DomainLoading() {
  return (
    <div className="space-y-5">
      <DomainLoadingPanel className="h-44" />
      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <DomainLoadingPanel className="h-[32rem]" />
        <div className="space-y-4">
          <DomainLoadingPanel className="h-64" />
          <DomainLoadingPanel className="h-64" />
        </div>
      </div>
    </div>
  )
}
