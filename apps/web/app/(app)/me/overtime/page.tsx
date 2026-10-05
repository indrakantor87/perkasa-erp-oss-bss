import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'

export const metadata = {
  title: 'Pengajuan Lembur - Self-Service Karyawan',
  description: 'Ajukan dan pantau status pengajuan lembur pribadi.',
}

export default async function MeOvertimePage() {
  const session = await requireSession()
  if (!session) redirect('/login')

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
          Self-Service Karyawan
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-950 sm:text-3xl">
          Pengajuan Lembur
        </h1>
        <p className="mb-8 max-w-2xl text-sm leading-relaxed text-slate-600">
          Fitur self-service untuk mengajukan lembur, melihat kalkulasi jam lembur real-time, dan
          memantau status approval Supervisor → HR sedang dalam tahap pengembangan. Sementara,
          hubungi Supervisor atau HR cabang setempat untuk proses pengajuan manual.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Ajukan Lembur</h3>
            <p className="text-sm text-slate-600">
              Form pengajuan lembur dengan input tanggal, jam mulai-selesai, dan keterangan.
            </p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Dalam Pengembangan
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Status Approval</h3>
            <p className="text-sm text-slate-600">
              Pantau status approval real-time PENDING → Supervisor APPROVED → HR APPROVED.
            </p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Dalam Pengembangan
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Integrasi Slip Gaji</h3>
            <p className="text-sm text-slate-600">
              Pengajuan lembur yang ter-approval otomatis masuk ke komponen slip gaji periode.
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
