import { notFound, redirect } from 'next/navigation'
import { HrWorkspacePage } from '@/components/hr-workspace-page'
import { canAccessPath } from '@/lib/access-control-server'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'

export const metadata = {
  title: 'Pengajuan Lembur - HR Perkasa',
  description: 'Kelola pengajuan lembur karyawan dan approval HR.',
}

export default async function HrOvertimeRequestsPage() {
  const session = await requireSession()
  if (!canAccessPath(session.role, '/hr')) redirect('/dashboard')

  const payload = await getDomainPageData('hr', session)
  if (!payload) notFound()

  return (
    <>
      <HrWorkspacePage
        content={payload.content}
        source={payload.source}
        capabilities={payload.capabilities}
        role={session.role}
        activeWorkspace="overview"
      />
      <section className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm sm:mt-5 sm:p-5">
        <p className="text-sm font-semibold tracking-tight text-sky-900">
          📌 Pengajuan Lembur — Workspace Khusus
        </p>
        <p className="mt-1 text-xs leading-5 text-sky-900/90 sm:text-sm">
          Shell kerja untuk kelola pengajuan lembur karyawan, kalkulasi jam lembur otomatis, dan
          approval berjenjang Supervisor → HR yang nantinya terintegrasi ke slip gaji. Fitur CRUD
          formal segera hadir.
        </p>
      </section>
    </>
  )
}
