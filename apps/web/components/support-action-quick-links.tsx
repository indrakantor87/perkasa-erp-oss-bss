import Link from 'next/link'
import type { SupportActionLink } from '@/lib/types'

export function SupportActionQuickLinks({
  title = 'Aksi cepat lane',
  description = 'Lompat ke form support yang paling relevan untuk lane ini tanpa membuka halaman lain.',
  links,
}: {
  title?: string
  description?: string
  links: SupportActionLink[]
}) {
  if (!links.length) {
    return null
  }

  return (
    <div className="mt-5 rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{title}</p>
      <p className="mt-2 text-sm leading-6 text-mute">{description}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className="rounded-2xl border border-line bg-slate-50 px-4 py-3 transition hover:border-slate-300 hover:bg-white"
          >
            <p className="text-sm font-semibold text-slate-950">{link.label}</p>
            <p className="mt-1 text-sm leading-6 text-mute">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
