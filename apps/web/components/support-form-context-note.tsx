type SupportFormContextItem = {
  label: string
  value: string
}

export function SupportFormContextNote({
  items,
}: {
  items: SupportFormContextItem[]
}) {
  if (!items.length) {
    return null
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <div key={`${item.label}-${item.value}`} className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {item.label}
            </p>
            <p className="text-sm leading-6 text-slate-700">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
