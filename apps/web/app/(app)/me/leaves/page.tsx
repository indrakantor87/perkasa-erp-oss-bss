import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireSession } from '@/lib/auth'

export const metadata = {
  title: 'Cuti, Izin & Sakit - Self-Service Karyawan',
  description: 'Ajukan dan pantau status cuti, izin pribadi, dan sakit.',
}

export default async function MeLeavesPage() {
  const session = await requireSession()
  if (!session) redirect('/login')

  return (
    <div className="mx-auto w-full max-w-6xl space-y-3 px-3 py-3 sm:px-5 sm:py-4 lg:px-7 lg:py-5">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
        <p className="text-sm font-semibold tracking-tight text-emerald-900">
          📌 Self-Service Cuti, Izin &amp; Sakit telah tersedia
        </p>
        <p className="mt-1 text-xs leading-5 text-emerald-900/90 sm:text-sm">
          Menu ini nantinya digunakan untuk melihat saldo cuti, mengajukan cuti/izin/sakit secara
          mandiri, dan memantau status approval real-time. Fitur CRUD formal segera hadir.
          Sementara hubungi Supervisor atau HR cabang setempat.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/hr/permissions"
            className="inline-flex h-9 items-center rounded-full border border-emerald-300 bg-white px-3.5 text-xs font-semibold text-emerald-900 shadow-sm hover:bg-emerald-50/40"
          >
            Lihat histori perizinan 30 hari terakhir (HR Workspace)
          </Link>
        </div>
      </section>
    </div>
  )
}
