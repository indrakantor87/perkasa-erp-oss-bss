import { redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'

export const metadata = {
  title: 'Pengajuan Cuti & Izin - HR Perkasa',
  description: 'Kelola pengajuan cuti, izin, dan sakit karyawan beserta alur approval HR.',
}

export default async function HrLeaveRequestsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/hr')) redirect('/dashboard')

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700">
          HR Workspace
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-950 sm:text-3xl">
          Pengajuan Cuti &amp; Izin
        </h1>
        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-slate-600">
          Fitur kelola pengajuan cuti tahunan, izin pribadi, sakit, dan approval berjenjang
          (Supervisor → HR) sedang dalam tahap pengembangan. Sementara, gunakan menu{' '}
          <span className="font-semibold text-slate-800">Perizinan</span> untuk melihat ringkasan
          histori izin 30 hari terakhir pada tab HR Workspace.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Daftar Pengajuan</h3>
            <p className="text-sm text-slate-600">
              List semua cuti/izin/sakit berdasarkan filter periode, status, dan cabang.
            </p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Dalam Pengembangan
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Form Pengajuan Baru</h3>
            <p className="text-sm text-slate-600">
              Formulir pembuatan pengajuan oleh HR atas nama karyawan dengan lampiran dokumen.
            </p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Dalam Pengembangan
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Approval Berjenjang</h3>
            <p className="text-sm text-slate-600">
              Approval 2 tahap: Supervisor kemudian HR. Riwayat reviewer dan catatan terlacak audit.
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
