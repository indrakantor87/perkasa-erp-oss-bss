import Link from 'next/link'
import type { CaseRecommendedActionMatrix } from '@/lib/types'

const defaultTone = 'border-slate-200 bg-slate-50 text-slate-700'

export function CaseNextActionMatrixCard({
  matrix,
  title = 'Recommended Next Action',
}: {
  matrix: CaseRecommendedActionMatrix
  title?: string
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-950">Matriks aksi prioritas per kasus</h4>
          <p className="mt-2 text-sm leading-6 text-mute">
            {matrix.owner
              ? `Owner saat ini ${matrix.owner}. Jalankan aksi berikut sesuai prioritas lane dan keputusan layanan.`
              : 'Jalankan aksi berikut sesuai prioritas lane dan keputusan layanan.'}
          </p>
        </div>
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          {matrix.items.length} aksi
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {matrix.items.map((item, index) => (
          <Link
            key={`${item.label}-${index}`}
            href={item.href}
            className={`rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:border-slate-300 ${item.tone || defaultTone}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-current/70">Prioritas {index + 1}</p>
                <h5 className="mt-2 text-sm font-semibold text-slate-950">{item.label}</h5>
              </div>
              <span className="inline-flex rounded-full border border-current/15 px-2.5 py-1 text-xs font-semibold text-current">
                Go
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-700">{item.detail}</p>
          </Link>
        ))}
      </div>
    </article>
  )
}
