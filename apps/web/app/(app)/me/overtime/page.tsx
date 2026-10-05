import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireSession } from '@/lib/auth'

export const metadata = {
  title: 'Pengajuan Lembur - Self-Service Karyawan',
  description: 'Ajukan dan pantau status pengajuan lembur pribadi.',
}

export default async function MeOvertimePage() {
  const session = await requireSession()
  if (!session) redirect('/login')

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 px-3 py-3 sm:px-5 sm:py-4 lg:px-7 lg:py-5">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
        <p className="text-sm font-semibold tracking-tight text-emerald-900">
          📌 Self-Service Pengajuan Lembur telah tersedia
        </p>
        <p className="mt-1 text-xs leading-5 text-emerald-900/90 sm:text-sm">
          Menu ini nantinya digunakan untuk mengajukan lembur secara mandiri, melihat kalkulasi
          jam lembur real-time, dan memantau status approval Supervisor → HR (hingga masuk ke slip
          gaji). Fitur CRUD formal segera hadir. Sementara hubungi Supervisor atau HR cabang.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/hr/salary"
            className="inline-flex h-9 items-center rounded-full border border-emerald-300 bg-white px-3.5 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50/40"
          >
            Buka slip gaji periode berjalan (HR Workspace)
          </Link>
        </div>
      </section>
    </div>
  )
}
