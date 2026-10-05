import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'

export const metadata = {
  title: 'Cuti, Izin & Sakit - Self-Service Karyawan',
  description: 'Ajukan dan pantau status pengajuan cuti, izin pribadi, dan sakit.',
}

export default async function MeLeavesPage() {
  const session = await requireSession()
  if (!session) redirect('/login')

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:px-5 sm:py-4 lg:px-7 lg:py-5">
      <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-relaxed text-emerald-900 shadow-sm">
        <p className="font-semibold tracking-tight">
          📌 Self-Service Cuti, Izin &amp; Sakit telah tersedia.
        </p>
        <p className="mt-1">
          Nantinya saldo cuti, pengajuan mandiri cuti/izin/sakit, dan status approval real-time
          tersedia di sini. Sementara hubungi Supervisor atau HR cabang.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-700">
          Self-Service Karyawan
        </div>
        <h1 className="mb-2 text-xl font-bold text-slate-950 sm:text-2xl">
          Cuti, Izin &amp; Sakit
        </h1>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-slate-600">
          Fitur self-service pengajuan dan status approval cuti/izin/sakit sedang tahap
          pengembangan.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Saldo Cuti</h3>
            <p className="text-sm text-slate-600">
              Informasi sisa saldo cuti tahunan, cuti bersama, dan cuti panjang karyawan.
            </p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Dalam Pengembangan
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Ajukan Baru</h3>
            <p className="text-sm text-slate-600">
              Formulir pengajuan cuti/izin/sakit dengan upload lampiran dokumen pendukung.
            </p>
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              Dalam Pengembangan
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold text-slate-900">Riwayat &amp; Status</h3>
            <p className="text-sm text-slate-600">
              Histori semua pengajuan dan status approval berjenjang (PENDING / APPROVED / REJECTED).
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
