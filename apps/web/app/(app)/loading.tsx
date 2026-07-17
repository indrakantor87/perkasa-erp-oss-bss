function LoadingCard({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl border border-line bg-[var(--color-card-subtle)] ${className}`} />
}

export default function AppLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-40 animate-pulse rounded-full bg-[var(--color-card-subtle)]" />
        <div className="h-10 w-96 max-w-full animate-pulse rounded-2xl bg-[var(--color-card-subtle)]" />
        <div className="h-4 w-full max-w-3xl animate-pulse rounded-full bg-[var(--color-card-subtle)]" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <LoadingCard className="h-36" />
        <LoadingCard className="h-36" />
        <LoadingCard className="h-36" />
      </div>

      <LoadingCard className="h-52" />
      <div className="grid gap-4 lg:grid-cols-2">
        <LoadingCard className="h-64" />
        <LoadingCard className="h-64" />
      </div>
    </div>
  )
}
