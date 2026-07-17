function DashboardLoadingCard({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl border border-line bg-[var(--color-card-subtle)] ${className}`} />
}

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <DashboardLoadingCard className="h-56" />
      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardLoadingCard className="h-80" />
        <DashboardLoadingCard className="h-80" />
      </div>
      <DashboardLoadingCard className="h-72" />
      <div className="grid gap-4 lg:grid-cols-3">
        <DashboardLoadingCard className="h-48" />
        <DashboardLoadingCard className="h-48" />
        <DashboardLoadingCard className="h-48" />
      </div>
    </div>
  )
}
