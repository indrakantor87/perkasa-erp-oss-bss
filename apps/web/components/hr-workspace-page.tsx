import Link from 'next/link'
import { DataSourceStatus } from '@/components/data-source-status'
import { HrAttendanceFaceConfigForm } from '@/components/hr-attendance-face-config-form'
import { HrAttendanceFaceReviewForm } from '@/components/hr-attendance-face-review-form'
import { HrAttendanceForm } from '@/components/hr-attendance-form'
import { HrAttendanceGeofenceForm } from '@/components/hr-attendance-geofence-form'
import { HrAttendanceUpdateForm } from '@/components/hr-attendance-update-form'
import { HrEmployeeArchiveForm } from '@/components/hr-employee-archive-form'
import { HrEmployeeCreateForm } from '@/components/hr-employee-create-form'
import { HrEmployeeFaceReferenceForm } from '@/components/hr-employee-face-reference-form'
import { HrEmployeeKpiForm } from '@/components/hr-employee-kpi-form'
import { HrEmployeeReactivateForm } from '@/components/hr-employee-reactivate-form'
import { HrLoanCreateForm } from '@/components/hr-loan-create-form'
import { HrLoanStatusForm } from '@/components/hr-loan-status-form'
import { HrLoanVoidForm } from '@/components/hr-loan-void-form'
import { HrSalarySlipForm } from '@/components/hr-salary-slip-form'
import { HrSalarySlipReleaseForm } from '@/components/hr-salary-slip-release-form'
import { HrSalarySlipVoidForm } from '@/components/hr-salary-slip-void-form'
import { getHrWorkspaceInsightSections } from '@/lib/services/hr-workspace-insight-service'
import type { AppRole, DataSourceSnapshot, DomainCapability, DomainPageContent, DomainReviewRow, DomainReviewSection } from '@/lib/types'

export type HrWorkspaceKey = 'overview' | 'employees' | 'attendance' | 'salary' | 'loans' | 'permissions' | 'disciplinary'

type HrWorkspacePageProps = {
  content: DomainPageContent
  source: DataSourceSnapshot
  capabilities: DomainCapability[]
  role: AppRole
  activeWorkspace: HrWorkspaceKey
}

type HrWorkspaceTab = {
  key: HrWorkspaceKey
  title: string
  description: string
  href: string
}

const hrWorkspaceTabs: HrWorkspaceTab[] = [
  {
    key: 'overview',
    title: 'HR Overview',
    description: 'Ringkasan jalur kerja HR dan shortcut ke workspace utama.',
    href: '/hr',
  },
  {
    key: 'employees',
    title: 'Data Karyawan',
    description: 'Master employee, arsip, reaktivasi, face reference, dan KPI.',
    href: '/hr/employees',
  },
  {
    key: 'attendance',
    title: 'Absensi',
    description: 'Input attendance, koreksi absensi, geofence, dan face attendance.',
    href: '/hr/attendance',
  },
  {
    key: 'salary',
    title: 'Gaji',
    description: 'Buat payroll, rilis slip gaji, dan void slip yang salah.',
    href: '/hr/salary',
  },
  {
    key: 'loans',
    title: 'Pinjaman',
    description: 'Buat loan, update status, dan void pinjaman yang batal.',
    href: '/hr/loans',
  },
  {
    key: 'permissions',
    title: 'Perizinan',
    description: 'Kelola cuti, izin, sakit, dan approval pengajuan karyawan.',
    href: '/hr/permissions',
  },
  {
    key: 'disciplinary',
    title: 'Sanksi',
    description: 'Kelola SP, catatan disiplin, dan tindak lanjut pelanggaran kerja.',
    href: '/hr/disciplinary',
  },
]

function extractMeta(row: DomainReviewRow, prefix: string) {
  return row.meta.find((item) => item.startsWith(prefix))?.replace(prefix, '').trim() || ''
}

function buildEmployeeSuggestions(sections: DomainReviewSection[]) {
  const employeeRows = sections.filter((section) => section.title.toUpperCase().includes('EMPLOYEE TERBARU')).flatMap((section) => section.rows)
  const faceReferenceRows = sections
    .filter((section) => section.title.toUpperCase().includes('EMPLOYEE FACE REFERENCES'))
    .flatMap((section) => section.rows)

  const faceReferenceMap = new Map(
    faceReferenceRows
      .map((row) => {
        const employeeId = extractMeta(row, 'Employee ID: ')
        if (!employeeId || employeeId === '-') {
          return null
        }

        return [
          employeeId,
          {
            referenceRef: extractMeta(row, 'Reference Ref: ') || '-',
            verificationMode: extractMeta(row, 'Mode: ') || 'CAMERA_CAPTURE',
          },
        ] as const
      })
      .filter((item): item is readonly [string, { referenceRef: string; verificationMode: string }] => Boolean(item)),
  )

  return {
    employeeSuggestions: employeeRows.map((row) => `${row.primary} | ${row.secondary}`).filter(Boolean),
    employeeArchiveSuggestions: employeeRows
      .filter((row) => row.status.toUpperCase() !== 'ARCHIVED')
      .map((row) => `${row.id.replace(/^EMP-/, '').trim()} | ${row.primary} | ${row.secondary} | ${row.status}`)
      .filter(Boolean),
    employeeReactivateSuggestions: employeeRows
      .filter((row) => row.status.toUpperCase() === 'ARCHIVED')
      .map((row) => `${row.id.replace(/^EMP-/, '').trim()} | ${row.primary} | ${row.secondary} | ${row.status}`)
      .filter(Boolean),
    employeeFaceReferenceSuggestions: employeeRows
      .filter((row) => row.status.toUpperCase() !== 'ARCHIVED')
      .map((row) => {
        const employeeId = row.id.replace(/^EMP-/, '').trim()
        const reference = faceReferenceMap.get(employeeId)
        return employeeId
          ? `${employeeId} | ${row.primary} | ${row.secondary} | ${row.status} | ${reference?.referenceRef || '-'} | ${reference?.verificationMode || 'CAMERA_CAPTURE'}`
          : ''
      })
      .filter(Boolean),
  }
}

function buildEmployeeFaceTrendSuggestions(sections: DomainReviewSection[]) {
  return sections
    .filter((section) => section.title.toUpperCase().includes('FACE REFERENCE TRENDS'))
    .flatMap((section) => section.rows)
    .map((row) => {
      const employeeId = row.id.replace(/^FACE-TREND-/, '').trim()
      return employeeId
        ? [
            employeeId,
            extractMeta(row, 'History Count: ') || '0',
            extractMeta(row, 'Average Score: ') || '0.0',
            extractMeta(row, 'Latest Score: ') || '0',
            extractMeta(row, 'Best Score: ') || '0',
            extractMeta(row, 'Latest Source: ') || '-',
            extractMeta(row, 'Drift Status: ') || 'INSUFFICIENT_DATA',
            extractMeta(row, 'Gap From Average: ') || '0.0',
            extractMeta(row, 'Gap From Best: ') || '0',
          ].join(' | ')
        : ''
    })
    .filter(Boolean)
}

function buildVerifiedFaceCandidateSuggestions(sections: DomainReviewSection[]) {
  return sections
    .filter((section) => section.title.toUpperCase().includes('VERIFIED FACE CANDIDATES'))
    .flatMap((section) => section.rows)
    .map((row) => {
      const employeeId = extractMeta(row, 'Employee ID: ')
      const captureRef = extractMeta(row, 'Capture Ref: ')
      const verificationMode = extractMeta(row, 'Mode: ') || 'CAMERA_CAPTURE'
      const reviewedAt = extractMeta(row, 'Reviewed At: ') || '-'
      return employeeId && captureRef ? `${employeeId} | ${captureRef} | ${verificationMode} | ${reviewedAt}` : ''
    })
    .filter(Boolean)
}

function buildAttendanceSuggestions(sections: DomainReviewSection[]) {
  const attendanceSuggestions = sections
    .filter((section) => section.title.toUpperCase().includes('ATTENDANCE'))
    .flatMap((section) => section.rows)
    .map((row) => {
      const attendanceId = row.id.replace(/^ATT-/, '').trim()
      return attendanceId
        ? [
            attendanceId,
            row.primary,
            row.status,
            extractMeta(row, 'Date: ') || '-',
            extractMeta(row, 'Check In Raw: ') || '-',
            extractMeta(row, 'Check Out Raw: ') || '-',
            extractMeta(row, 'Overtime Raw: ') || '0.00',
            extractMeta(row, 'Lock Raw: ') || '0',
          ].join(' | ')
        : ''
    })
    .filter(Boolean)

  const geofenceRow = sections
    .filter((section) => section.title.toUpperCase().includes('GEOFENCE ATTENDANCE'))
    .flatMap((section) => section.rows)[0]
  const faceConfigRow = sections.filter((section) => section.title.toUpperCase().includes('FACE ATTENDANCE')).flatMap((section) => section.rows)[0]

  return {
    attendanceSuggestions,
    geofenceConfig:
      geofenceRow && geofenceRow.status.toUpperCase() !== 'NOT_SET'
        ? {
            locationName: geofenceRow.primary,
            latitude: extractMeta(geofenceRow, 'Latitude: '),
            longitude: extractMeta(geofenceRow, 'Longitude: '),
            radiusMeters: extractMeta(geofenceRow, 'Radius: ').replace(' meter', '').trim() || '100',
            isRequired: (extractMeta(geofenceRow, 'Required: ') || '').toUpperCase() === 'YA',
            notes: extractMeta(geofenceRow, 'Notes: '),
          }
        : null,
    faceConfig:
      faceConfigRow && faceConfigRow.status.toUpperCase() !== 'NOT_SET'
        ? {
            isRequired: (extractMeta(faceConfigRow, 'Required: ') || '').toUpperCase() === 'YA',
            verificationMode: extractMeta(faceConfigRow, 'Mode: ') || 'MANUAL_REVIEW',
            autoVerifyHighConfidence: (extractMeta(faceConfigRow, 'Auto Verify: ') || '').toUpperCase() === 'YA',
            autoVerifyMinScore: Number.parseInt(extractMeta(faceConfigRow, 'Auto Verify Min Score: ') || '85', 10),
            notes: extractMeta(faceConfigRow, 'Notes: '),
          }
        : null,
    faceReviewSuggestions: sections
      .filter((section) => section.title.toUpperCase().includes('REVIEW FACE ATTENDANCE'))
      .flatMap((section) => section.rows)
      .map((row) => {
        const faceLogId = row.id.replace(/^FACE-/, '').trim()
        return faceLogId
          ? [
              faceLogId,
              row.primary,
              row.status,
              extractMeta(row, 'Capture Ref: ') || '-',
              extractMeta(row, 'Mode: ') || row.secondary || '-',
              extractMeta(row, 'Match Score: ') || '0',
              extractMeta(row, 'Confidence Band: ') || 'LOW',
              extractMeta(row, 'Recommendation: ') || 'PENDING_REVIEW',
              extractMeta(row, 'Auto Review Eligible: ') || 'Tidak',
              extractMeta(row, 'Baseline Reference Ref: ') || '-',
              extractMeta(row, 'Baseline Match Score: ') || '0',
              extractMeta(row, 'Baseline Match Band: ') || 'NO_BASELINE',
              extractMeta(row, 'Baseline Match Outcome: ') || 'NO_BASELINE',
              extractMeta(row, 'Recommendation Reason: ') || '-',
            ].join(' | ')
          : ''
      })
      .filter(Boolean),
  }
}

function buildLoanSuggestions(sections: DomainReviewSection[]) {
  const loanRows = sections
    .filter((section) => section.title.toUpperCase().includes('LOAN'))
    .flatMap((section) => section.rows)
    .filter(
      (row) =>
        !row.status.toUpperCase().includes('PAID') &&
        !row.status.toUpperCase().includes('REJECTED') &&
        !row.status.toUpperCase().includes('CANCELLED'),
    )

  const loanSuggestions = loanRows
    .map((row) => {
      const loanId = row.id.replace(/^LOAN-/, '').trim()
      return loanId
        ? `${loanId} | ${row.primary} | ${row.status} | ${row.secondary} | ${extractMeta(row, 'Amount: ') || '-'} | ${extractMeta(row, 'Installment: ') || '-'}`
        : ''
    })
    .filter(Boolean)

  return {
    loanSuggestions,
    loanVoidSuggestions: loanSuggestions,
  }
}

function buildSalarySuggestions(sections: DomainReviewSection[]) {
  const salaryRows = sections.filter((section) => section.title.toUpperCase().includes('SLIP GAJI')).flatMap((section) => section.rows)

  return {
    salarySlipSuggestions: salaryRows
      .filter((row) => row.status.toUpperCase() === 'DRAFT')
      .map((row) => {
        const salarySlipId = row.id.replace(/^PAYROLL-/, '').trim()
        return salarySlipId
          ? `${salarySlipId} | ${row.primary} | ${row.secondary} | ${row.status} | ${extractMeta(row, 'Income: ') || '-'} | ${extractMeta(row, 'Deduction: ') || '-'}`
          : ''
      })
      .filter(Boolean),
    salarySlipVoidSuggestions: salaryRows
      .filter((row) => row.status.toUpperCase() !== 'VOIDED')
      .map((row) => {
        const salarySlipId = row.id.replace(/^PAYROLL-/, '').trim()
        return salarySlipId
          ? `${salarySlipId} | ${row.primary} | ${row.secondary} | ${row.status} | ${extractMeta(row, 'Income: ') || '-'} | ${extractMeta(row, 'Deduction: ') || '-'}`
          : ''
      })
      .filter(Boolean),
  }
}

function getVisibleSections(workspace: HrWorkspaceKey, sections: DomainReviewSection[]) {
  switch (workspace) {
    case 'employees':
      return sections.filter((section) => section.title.toUpperCase().includes('EMPLOYEE'))
    case 'attendance':
      return sections.filter((section) => {
        const title = section.title.toUpperCase()
        return title.includes('ATTENDANCE') || title.includes('GEOFENCE') || title.includes('FACE')
      })
    case 'salary':
      return sections.filter((section) => {
        const title = section.title.toUpperCase()
        return title.includes('SLIP GAJI') || title.includes('KPI')
      })
    case 'loans':
      return sections.filter((section) => section.title.toUpperCase().includes('LOAN'))
    case 'permissions':
      return sections.filter((section) => {
        const title = section.title.toUpperCase()
        return title.includes('EMPLOYEE') || title.includes('ATTENDANCE')
      })
    case 'disciplinary':
      return sections.filter((section) => {
        const title = section.title.toUpperCase()
        return title.includes('EMPLOYEE') || title.includes('KPI') || title.includes('FACE')
      })
    case 'overview':
    default:
      return sections.filter((section) => {
        const title = section.title.toUpperCase()
        return (
          title.includes('EMPLOYEE TERBARU') ||
          title.includes('ATTENDANCE HARI INI') ||
          title.includes('LOAN') ||
          title.includes('SLIP GAJI')
        )
      })
  }
}

function renderReviewSection(section: DomainReviewSection) {
  return (
    <article key={section.title} className="panel p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="section-title">{section.title}</p>
          <p className="mt-2 text-sm leading-6 text-mute">{section.description}</p>
        </div>
        <span className="badge border-slate-200 bg-white text-slate-600">{section.rows.length} data</span>
      </div>
      {section.summary?.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {section.summary.map((item) => (
            <article key={`${section.title}-${item.label}`} className="rounded-2xl border border-line bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{item.label}</p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{item.value}</p>
            </article>
          ))}
        </div>
      ) : null}
      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        {section.rows.slice(0, 8).map((row) => (
          <article key={row.id} className="rounded-2xl border border-line bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">
                  {row.primary}
                  {row.secondary ? <span className="font-normal text-mute"> · {row.secondary}</span> : null}
                </h3>
                <p className="mt-2 text-sm leading-6 text-mute">{row.detail}</p>
              </div>
              <span className="badge border-slate-200 bg-white text-slate-600">{row.status}</span>
            </div>
            {row.meta.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {row.meta.slice(0, 4).map((meta) => (
                  <span key={`${row.id}-${meta}`} className="badge border-slate-200 bg-white text-slate-600">
                    {meta}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </article>
  )
}

function renderWorkspaceForms(params: {
  workspace: HrWorkspaceKey
  canCreate: boolean
  canUpdate: boolean
  reviewDbReady: boolean
  sections: DomainReviewSection[]
}) {
  const { workspace, canCreate, canUpdate, reviewDbReady, sections } = params
  const employeeData = buildEmployeeSuggestions(sections)
  const faceTrendSuggestions = buildEmployeeFaceTrendSuggestions(sections)
  const verifiedFaceCandidateSuggestions = buildVerifiedFaceCandidateSuggestions(sections)
  const attendanceData = buildAttendanceSuggestions(sections)
  const loanData = buildLoanSuggestions(sections)
  const salaryData = buildSalarySuggestions(sections)

  switch (workspace) {
    case 'employees':
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <HrEmployeeCreateForm canCreate={canCreate} reviewDbReady={reviewDbReady} />
          <HrEmployeeArchiveForm
            canUpdate={canUpdate}
            reviewDbReady={reviewDbReady}
            employeeSuggestions={employeeData.employeeArchiveSuggestions}
          />
          <HrEmployeeReactivateForm
            canUpdate={canUpdate}
            reviewDbReady={reviewDbReady}
            employeeSuggestions={employeeData.employeeReactivateSuggestions}
          />
          <HrEmployeeKpiForm canUpdate={canUpdate} reviewDbReady={reviewDbReady} employeeSuggestions={employeeData.employeeSuggestions} />
          <HrEmployeeFaceReferenceForm
            canUpdate={canUpdate}
            reviewDbReady={reviewDbReady}
            employeeSuggestions={employeeData.employeeFaceReferenceSuggestions}
            trendSuggestions={faceTrendSuggestions}
            verifiedCaptureSuggestions={verifiedFaceCandidateSuggestions}
          />
        </div>
      )
    case 'attendance':
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <HrAttendanceForm
            canCreate={canCreate}
            reviewDbReady={reviewDbReady}
            employeeSuggestions={employeeData.employeeSuggestions}
            geofenceConfig={attendanceData.geofenceConfig}
            faceConfig={attendanceData.faceConfig}
          />
          <HrAttendanceUpdateForm
            canUpdate={canUpdate}
            reviewDbReady={reviewDbReady}
            attendanceSuggestions={attendanceData.attendanceSuggestions}
          />
          <HrAttendanceGeofenceForm canUpdate={canUpdate} reviewDbReady={reviewDbReady} initialConfig={attendanceData.geofenceConfig} />
          <HrAttendanceFaceConfigForm canUpdate={canUpdate} reviewDbReady={reviewDbReady} initialConfig={attendanceData.faceConfig} />
          <HrAttendanceFaceReviewForm
            canUpdate={canUpdate}
            reviewDbReady={reviewDbReady}
            reviewSuggestions={attendanceData.faceReviewSuggestions}
          />
        </div>
      )
    case 'salary':
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <HrSalarySlipForm canCreate={canCreate} reviewDbReady={reviewDbReady} employeeSuggestions={employeeData.employeeSuggestions} />
          <HrSalarySlipReleaseForm
            canUpdate={canUpdate}
            reviewDbReady={reviewDbReady}
            salarySlipSuggestions={salaryData.salarySlipSuggestions}
          />
          <HrSalarySlipVoidForm
            canUpdate={canUpdate}
            reviewDbReady={reviewDbReady}
            salarySlipSuggestions={salaryData.salarySlipVoidSuggestions}
          />
        </div>
      )
    case 'loans':
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <HrLoanCreateForm canCreate={canCreate} reviewDbReady={reviewDbReady} employeeSuggestions={employeeData.employeeSuggestions} />
          <HrLoanStatusForm canUpdate={canUpdate} reviewDbReady={reviewDbReady} loanSuggestions={loanData.loanSuggestions} />
          <HrLoanVoidForm canUpdate={canUpdate} reviewDbReady={reviewDbReady} loanSuggestions={loanData.loanVoidSuggestions} />
        </div>
      )
    case 'permissions':
      return null
    case 'disciplinary':
      return null
    case 'overview':
    default:
      return null
  }
}

export async function HrWorkspacePage({ content, source, capabilities, role, activeWorkspace }: HrWorkspacePageProps) {
  const enabledCapabilities = capabilities.filter((item) => item.enabled)
  const canCreate = enabledCapabilities.some((item) => item.action === 'create')
  const canUpdate = enabledCapabilities.some((item) => item.action === 'update')
  const reviewDbReady = source.effectiveMode === 'review-db' && !source.isFallback
  const workspaceInsightSections =
    activeWorkspace === 'permissions' || activeWorkspace === 'disciplinary'
      ? await getHrWorkspaceInsightSections(activeWorkspace)
      : []
  const visibleSections = [...workspaceInsightSections, ...getVisibleSections(activeWorkspace, content.reviewSections ?? [])]

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      <section className="panel p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-title">{content.eyebrow}</p>
            <h1 className="mt-3 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              {activeWorkspace === 'overview'
                ? content.title
                : `${hrWorkspaceTabs.find((item) => item.key === activeWorkspace)?.title || content.title}`}
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-mute">
              {activeWorkspace === 'overview'
                ? content.description
                : hrWorkspaceTabs.find((item) => item.key === activeWorkspace)?.description || content.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge border-slate-200 bg-white text-slate-600">{role}</span>
            <span className="badge border-slate-200 bg-white text-slate-600">{enabledCapabilities.length} capability</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {content.summaries.map((item) => (
          <article key={item.label} className="panel p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">{item.label}</p>
            <p className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">{item.value}</p>
          </article>
        ))}
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
          <div>
            <p className="section-title">Workspace HR</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Masuk ke jalur kerja HR yang lebih spesifik
            </h2>
            <p className="mt-2 text-sm leading-6 text-mute">
              Struktur ini memecah halaman HR menjadi workspace yang lebih dekat ke pola repo referensi tanpa membuang form dan data operasional yang sudah aktif.
            </p>
          </div>
          <span className="badge border-slate-200 bg-white text-slate-600">{hrWorkspaceTabs.length} workspace</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {hrWorkspaceTabs.map((item) => {
            const isActive = item.key === activeWorkspace
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`rounded-3xl border p-4 transition ${
                  isActive
                    ? 'border-slate-950 bg-slate-950 text-white shadow-lg'
                    : 'border-line bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-950 shadow-sm hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`badge ${isActive ? 'border-white/20 bg-white/10 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
                    {item.key === 'overview' ? 'landing' : 'sub menu'}
                  </span>
                  <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                    {isActive ? 'aktif' : 'buka'}
                  </span>
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight">{item.title}</h3>
                <p className={`mt-2 text-sm leading-6 ${isActive ? 'text-white/80' : 'text-mute'}`}>{item.description}</p>
              </Link>
            )
          })}
        </div>
      </section>

      {activeWorkspace === 'overview' && content.highlights.length > 0 ? (
        <section className="panel p-6">
          <p className="section-title">Arah Operasional</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {content.highlights.map((item) => (
              <article key={item.title} className="rounded-2xl border border-line bg-slate-50 p-5">
                <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-mute">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {renderWorkspaceForms({
        workspace: activeWorkspace,
        canCreate,
        canUpdate,
        reviewDbReady,
        sections: content.reviewSections ?? [],
      }) ? (
        <section className="space-y-4">
          <div>
            <p className="section-title">Form Operasional</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Aksi utama untuk workspace ini
            </h2>
          </div>
          {renderWorkspaceForms({
            workspace: activeWorkspace,
            canCreate,
            canUpdate,
            reviewDbReady,
            sections: content.reviewSections ?? [],
          })}
        </section>
      ) : null}

      {visibleSections.length > 0 ? (
        <section className="space-y-4">
          <div>
            <p className="section-title">Review Data</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
              Section yang relevan dengan workspace aktif
            </h2>
          </div>
          <div className="grid gap-4">{visibleSections.map((section) => renderReviewSection(section))}</div>
        </section>
      ) : null}
    </div>
  )
}
