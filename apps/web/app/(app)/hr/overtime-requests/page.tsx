import { redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'

export const metadata = {
  title: 'Pengajuan Lembur - HR Perkasa',
  description: 'Kelola pengajuan lembur karyawan dan approval HR beserta kalkulasi jam lembur.',
}

export default async function HrOvertimeRequestsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/hr')) redirect('/dashboard')

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
          HR Workspace
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-950 sm:text-3xl">
          Pengajuan Lembur
        </h1>
        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-slate-600">
          Fitur kelola pengajuan lembur karyawan, kalkulasi otomatis jam lembur sesuai ketentuan
          perusahaan dan approval berjenjang (Supervisor → HR) sedang dalam tahap pengembangan.
          Data approval akan otomatis terintegrasi dengan slip gaji periode berjalan.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Daftar Lembur</h3>
            <p className="text-sm text-slate-600">
              List pengajuan lembur berdasarkan periode, cabang, divisi, dan status approval.
            </p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Dalam Pengembangan
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Form Lembur Baru</h3>
            <p className="text-sm text-slate-600">
              Form pengajuan lembur atas nama karyawan, input jam mulai-selesai dan keterangan.
            </p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Dalam Pengembangan
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Kalkulasi &amp; Integrasi</h3>
            <p className="text-sm text-slate-600">
              Kalkulasi jam lembur otomatis dan integrasi ke slip gaji periode berjalan.
            </p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Dalam Pengembangan
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
