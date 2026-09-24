'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { DataSourceStatus } from '@/components/data-source-status'
import { UiButton } from '@/components/ui-button'
import { StatusBadge } from '@/components/ui-status-badge'
import type { AppRole, DataSourceSnapshot, DomainCapability, DomainPageContent, DomainReviewRow, DomainReviewSection } from '@/lib/types'

type SourceType = 'SOURCE_BROWSER' | 'SOURCE_FINGERPRINT_MACHINE' | 'SOURCE_MANUAL_CORRECTION' | string

type RawEventItem = {
  id: number
  event_timestamp: string
  event_mode: string
  machine_id: number
  verify_score: number | null
}

type AttendanceDailyRow = {
  id: string
  employee_id: number
  employee_code: string
  employee_name: string
  division: string
  team: string
  position: string
  attendance_date: string
  check_in: string | null
  check_out: string | null
  worked_hours: string
  status: string
  source_type: SourceType
  fingerprint_device_id: number | null
  tap_count: number
  overtime_hours: number
  locked_by_admin: boolean
}

type MonthlyRecapRow = {
  employee_id: number
  employee_code: string
  employee_name: string
  division: string
  team: string
  position: string
  total_work_days: number
  present_count: number
  alpha_count: number
  sick_count: number
  leave_count: number
  partial_morning_count: number
  total_ot_hours: number
  avg_check_in: string
  avg_check_out: string
}

type FpDeviceSummary = {
  total_active: number
  online_count: number
  offline_count: number
  unknown_count: number
}


function extractTimeOnly(datetimeStr: string | null): string {
  if (!datetimeStr) return '-'
  const t = datetimeStr.split('T')
  const time = t.length > 1 ? t[1] : datetimeStr.split(' ')[1]
  return (time || '-').split('.')[0].substring(0, 8) || '-'
}

function sourceBadgeIconAndLabel(source: SourceType): { icon: string; label: string; tone: 'success' | 'info' | 'warning'; note?: string } {
  const s = String(source || '').toUpperCase()
  const isCorrection = s === 'SOURCE_MANUAL_CORRECTION'
  return {
    icon: '👆',
    label: 'Mesin Fingerprint',
    tone: isCorrection ? 'warning' : 'success',
    note: isCorrection ? 'Dikoreksi HR' : undefined,
  }
}

function statusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'PRESENT': return 'Hadir'
    case 'ALPHA': return 'Alpha'
    case 'SICK': return 'Sakit'
    case 'LEAVE': return 'Izin'
    case 'PERMISSION': return 'Izin'
    default: return status || '-'
  }
}

function statusTone(status: string): 'success' | 'danger' | 'warning' | 'info' | 'neutral' {
  switch (status.toUpperCase()) {
    case 'PRESENT': return 'success'
    case 'ALPHA': return 'danger'
    case 'SICK': return 'warning'
    case 'LEAVE':
    case 'PERMISSION': return 'info'
    default: return 'neutral'
  }
}

function FormModalSkeleton() {
  return (
    <div className="w-full animate-pulse rounded-2xl border border-slate-200/70 bg-white/60 p-6 dark:border-slate-700/70 dark:bg-slate-900/60">
      <div className="mb-4 h-8 w-1/3 rounded-xl bg-slate-200/70 dark:bg-slate-700/70" />
      <div className="space-y-3">
        <div className="h-12 w-full rounded-lg bg-slate-200/60 dark:bg-slate-700/60" />
        <div className="h-12 w-2/3 rounded-lg bg-slate-200/60 dark:bg-slate-700/60" />
        <div className="h-32 w-full rounded-lg bg-slate-200/50 dark:bg-slate-700/50" />
        <div className="flex justify-end gap-3">
          <div className="h-11 w-24 rounded-lg bg-slate-200/60 dark:bg-slate-700/60" />
          <div className="h-11 w-36 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
        </div>
      </div>
    </div>
  )
}

const HrAttendanceForm = dynamic(
  () => import('@/components/hr-attendance-form').then((mod) => mod.HrAttendanceForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrAttendanceFaceConfigForm = dynamic(
  () => import('@/components/hr-attendance-face-config-form').then((mod) => mod.HrAttendanceFaceConfigForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrAttendanceFaceReviewForm = dynamic(
  () => import('@/components/hr-attendance-face-review-form').then((mod) => mod.HrAttendanceFaceReviewForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrAttendanceGeofenceForm = dynamic(
  () => import('@/components/hr-attendance-geofence-form').then((mod) => mod.HrAttendanceGeofenceForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrAttendanceUpdateForm = dynamic(
  () => import('@/components/hr-attendance-update-form').then((mod) => mod.HrAttendanceUpdateForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrEmployeeArchiveForm = dynamic(
  () => import('@/components/hr-employee-archive-form').then((mod) => mod.HrEmployeeArchiveForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrEmployeeCreateForm = dynamic(
  () => import('@/components/hr-employee-create-form').then((mod) => mod.HrEmployeeCreateForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrEmployeeFaceReferenceForm = dynamic(
  () => import('@/components/hr-employee-face-reference-form').then((mod) => mod.HrEmployeeFaceReferenceForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrEmployeeKpiForm = dynamic(
  () => import('@/components/hr-employee-kpi-form').then((mod) => mod.HrEmployeeKpiForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrEmployeeReactivateForm = dynamic(
  () => import('@/components/hr-employee-reactivate-form').then((mod) => mod.HrEmployeeReactivateForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrLoanCreateForm = dynamic(
  () => import('@/components/hr-loan-create-form').then((mod) => mod.HrLoanCreateForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrLoanStatusForm = dynamic(
  () => import('@/components/hr-loan-status-form').then((mod) => mod.HrLoanStatusForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrLoanVoidForm = dynamic(
  () => import('@/components/hr-loan-void-form').then((mod) => mod.HrLoanVoidForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrSalarySlipForm = dynamic(
  () => import('@/components/hr-salary-slip-form').then((mod) => mod.HrSalarySlipForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrSalarySlipReleaseForm = dynamic(
  () => import('@/components/hr-salary-slip-release-form').then((mod) => mod.HrSalarySlipReleaseForm),
  { ssr: false, loading: FormModalSkeleton },
)
const HrSalarySlipVoidForm = dynamic(
  () => import('@/components/hr-salary-slip-void-form').then((mod) => mod.HrSalarySlipVoidForm),
  { ssr: false, loading: FormModalSkeleton },
)

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
    description: 'Rekap absensi karyawan dari mesin fingerprint dan koreksi administratif.',
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

export type HrWorkspaceInsightLoader = (workspace: HrWorkspaceKey) => Promise<DomainReviewSection[]>

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
          <Suspense fallback={<FormModalSkeleton />}>
            <HrEmployeeCreateForm canCreate={canCreate} reviewDbReady={reviewDbReady} />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrEmployeeArchiveForm
              canUpdate={canUpdate}
              reviewDbReady={reviewDbReady}
              employeeSuggestions={employeeData.employeeArchiveSuggestions}
            />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrEmployeeReactivateForm
              canUpdate={canUpdate}
              reviewDbReady={reviewDbReady}
              employeeSuggestions={employeeData.employeeReactivateSuggestions}
            />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrEmployeeKpiForm canUpdate={canUpdate} reviewDbReady={reviewDbReady} employeeSuggestions={employeeData.employeeSuggestions} />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrEmployeeFaceReferenceForm
              canUpdate={canUpdate}
              reviewDbReady={reviewDbReady}
              employeeSuggestions={employeeData.employeeFaceReferenceSuggestions}
              trendSuggestions={faceTrendSuggestions}
              verifiedCaptureSuggestions={verifiedFaceCandidateSuggestions}
            />
          </Suspense>
        </div>
      )
    case 'attendance':
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <Suspense fallback={<FormModalSkeleton />}>
            <HrAttendanceForm
              canCreate={canCreate}
              reviewDbReady={reviewDbReady}
              employeeSuggestions={employeeData.employeeSuggestions}
              geofenceConfig={attendanceData.geofenceConfig}
              faceConfig={attendanceData.faceConfig}
            />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrAttendanceUpdateForm
              canUpdate={canUpdate}
              reviewDbReady={reviewDbReady}
              attendanceSuggestions={attendanceData.attendanceSuggestions}
            />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrAttendanceGeofenceForm canUpdate={canUpdate} reviewDbReady={reviewDbReady} initialConfig={attendanceData.geofenceConfig} />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrAttendanceFaceConfigForm canUpdate={canUpdate} reviewDbReady={reviewDbReady} initialConfig={attendanceData.faceConfig} />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrAttendanceFaceReviewForm
              canUpdate={canUpdate}
              reviewDbReady={reviewDbReady}
              reviewSuggestions={attendanceData.faceReviewSuggestions}
            />
          </Suspense>
        </div>
      )
    case 'salary':
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <Suspense fallback={<FormModalSkeleton />}>
            <HrSalarySlipForm canCreate={canCreate} reviewDbReady={reviewDbReady} employeeSuggestions={employeeData.employeeSuggestions} />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrSalarySlipReleaseForm
              canUpdate={canUpdate}
              reviewDbReady={reviewDbReady}
              salarySlipSuggestions={salaryData.salarySlipSuggestions}
            />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrSalarySlipVoidForm
              canUpdate={canUpdate}
              reviewDbReady={reviewDbReady}
              salarySlipSuggestions={salaryData.salarySlipVoidSuggestions}
            />
          </Suspense>
        </div>
      )
    case 'loans':
      return (
        <div className="grid gap-4 xl:grid-cols-2">
          <Suspense fallback={<FormModalSkeleton />}>
            <HrLoanCreateForm canCreate={canCreate} reviewDbReady={reviewDbReady} employeeSuggestions={employeeData.employeeSuggestions} />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrLoanStatusForm canUpdate={canUpdate} reviewDbReady={reviewDbReady} loanSuggestions={loanData.loanSuggestions} />
          </Suspense>
          <Suspense fallback={<FormModalSkeleton />}>
            <HrLoanVoidForm canUpdate={canUpdate} reviewDbReady={reviewDbReady} loanSuggestions={loanData.loanVoidSuggestions} />
          </Suspense>
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

function UnmappedWarningPanel({ count = null, status = 'loaded', error = null }: { count?: number | null; status?: 'idle' | 'loading' | 'loaded' | 'error'; error?: string | null }) {
  if (status === 'loading' || count === null) {
    return (
      <section className="rounded-2xl border border-slate-200/70 bg-white/60 p-5 shadow-sm animate-pulse dark:border-slate-700/70 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-200/70 dark:bg-slate-700/70" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-2/5 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
            <div className="h-4 w-4/5 rounded bg-slate-200/60 dark:bg-slate-700/60" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
        </div>
        <p className="mt-2 text-xs text-mute">Memuat...</p>
      </section>
    )
  }
  if (status === 'error' && error) {
    return (
      <section role="alert" aria-live="polite" className="rounded-2xl border border-red-300 bg-red-50 p-5 shadow-sm dark:border-red-700/50 dark:bg-red-950/40">
        <p className="text-sm font-semibold text-red-900 dark:text-red-200">Gagal memuat data unmapped</p>
        <p className="mt-1 text-xs leading-6 text-red-800 dark:text-red-300 opacity-90">{error}</p>
      </section>
    )
  }
  if (count <= 0) return null
  const severity = count >= 10 ? 'danger' : 'warning'
  const bgClass =
    severity === 'danger'
      ? 'border-red-300 bg-red-50 dark:border-red-700/50 dark:bg-red-950/40'
      : 'border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/40'
  const textClass =
    severity === 'danger' ? 'text-red-900 dark:text-red-200' : 'text-amber-900 dark:text-amber-200'
  return (
    <section
      role="alert"
      aria-live="polite"
      className={`rounded-2xl border p-5 shadow-sm ${bgClass}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span
            className={`text-2xl ${severity === 'danger' ? 'text-red-500' : 'text-amber-500'}`}
            aria-hidden="true"
          >
            ⚠️
          </span>
          <div>
            <h3 className={`font-semibold ${textClass}`}>
              Ada {count} event sidik jari yang belum ter-mapping
            </h3>
            <p className={`mt-1 text-sm leading-6 ${textClass} opacity-90`}>
              Ada <strong className="font-semibold">{count}</strong> event sidik jari yang tidak
              dapat dicocokkan ke data pegawai. Mohon buka halaman{' '}
              <Link
                href="/hr/attendance"
                className="underline decoration-current underline-offset-2 font-semibold"
              >
                Perangkat Fingerprint → tab Mapping
              </Link>{' '}
              untuk melakukan pendaftaran ID mesin ke data karyawan.
            </p>
          </div>
        </div>
        <UiButton variant="secondary" size="sm">
          Buka Mapping
        </UiButton>
      </div>
    </section>
  )
}

function FpDevicesSummaryCard({ summary = null, status = 'loaded', error = null }: { summary?: FpDeviceSummary | null; status?: 'idle' | 'loading' | 'loaded' | 'error'; error?: string | null }) {
  if (status === 'loading' || summary === null) {
    return (
      <section className="panel p-5 animate-pulse">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-36 rounded bg-slate-200/70 dark:bg-slate-700/70" />
            <div className="h-6 w-3/5 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
            <div className="h-4 w-4/5 rounded bg-slate-200/60 dark:bg-slate-700/60" />
          </div>
          <div className="h-7 w-28 rounded-full bg-slate-200/70 dark:bg-slate-700/70" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-line bg-slate-50 p-4">
            <div className="h-4 w-28 rounded bg-slate-200/70 dark:bg-slate-700/70" />
            <div className="mt-3 h-8 w-16 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
          </article>
          <article className="rounded-2xl border border-line bg-slate-50 p-4">
            <div className="h-4 w-20 rounded bg-slate-200/70 dark:bg-slate-700/70" />
            <div className="mt-3 h-8 w-16 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
          </article>
          <article className="rounded-2xl border border-line bg-slate-50 p-4">
            <div className="h-4 w-20 rounded bg-slate-200/70 dark:bg-slate-700/70" />
            <div className="mt-3 h-8 w-16 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
          </article>
        </div>
        <p className="mt-3 text-xs text-mute">Memuat...</p>
      </section>
    )
  }
  if (status === 'error' && error) {
    return (
      <section className="panel p-5">
        <div>
          <p className="section-title">Perangkat Fingerprint</p>
          <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-rose-800 dark:text-rose-200">
            Gagal memuat ringkasan perangkat
          </h2>
          <p className="mt-2 text-sm leading-6 text-rose-700 dark:text-rose-300">{error}</p>
        </div>
      </section>
    )
  }
  return (
    <section className="panel p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="section-title">Perangkat Fingerprint</p>
          <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Ringkasan Status Mesin Absensi
          </h2>
          <p className="mt-2 text-sm leading-6 text-mute">
            Jumlah total perangkat fingerprint aktif beserta status koneksi terakhirnya.
          </p>
        </div>
        <span className="badge border-slate-200 bg-white text-slate-600">
          {summary.total_active} mesin aktif
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <article className="rounded-2xl border border-line bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mute">
            Total Mesin Aktif
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {summary.total_active}
          </p>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-700/40 dark:bg-emerald-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
            ONLINE
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-emerald-800 dark:text-emerald-200">
            {summary.online_count}
          </p>
        </article>
        <article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-700/40 dark:bg-rose-950/30">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">
            OFFLINE
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-rose-800 dark:text-rose-200">
            {summary.offline_count}
          </p>
        </article>
      </div>
    </section>
  )
}

function RawEventsModal({
  open,
  onClose,
  employeeName,
  attendanceDate,
  events,
  status = 'loaded',
  error = null,
}: {
  open: boolean
  onClose: () => void
  employeeName: string
  attendanceDate: string
  events: RawEventItem[]
  status?: 'idle' | 'loading' | 'loaded' | 'error'
  error?: string | null
}) {
  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="raw-events-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 md:flex-row md:items-start md:justify-between dark:border-slate-700">
          <div>
            <h3
              id="raw-events-title"
              className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-tight text-slate-950 dark:text-white"
            >
              Lihat Raw Events
            </h3>
            <p className="mt-1 text-sm text-mute">
              {employeeName} · Tanggal {attendanceDate} · {events.length} tap terakhir
            </p>
          </div>
          <UiButton variant="icon" size="sm" onClick={onClose} ariaLabel="Tutup modal">
            ✕
          </UiButton>
        </div>
        <div className="max-h-[60vh] overflow-auto p-5">
          {status === 'loading' ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse flex flex-col gap-2 rounded-2xl border border-line bg-slate-50 p-4 md:flex-row md:items-center md:justify-between dark:bg-slate-800/50">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-2/5 rounded-lg bg-slate-200/70 dark:bg-slate-700/70" />
                    <div className="h-4 w-2/5 rounded bg-slate-200/60 dark:bg-slate-700/60" />
                  </div>
                  <div className="h-6 w-24 rounded-full bg-slate-200/70 dark:bg-slate-700/70" />
                </div>
              ))}
              <p className="text-xs text-mute">Memuat...</p>
            </div>
          ) : status === 'error' ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-700/40 dark:bg-rose-950/30">
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Gagal memuat raw events</p>
              {error ? <p className="mt-1 text-xs leading-6 text-rose-700 dark:text-rose-300">{error}</p> : null}
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <p className="text-sm text-mute">Belum ada raw event tersimpan untuk tanggal ini.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="flex flex-col gap-2 rounded-2xl border border-line bg-slate-50 p-4 md:flex-row md:items-center md:justify-between dark:bg-slate-800/50"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">
                      {evt.event_timestamp}
                    </p>
                    <p className="mt-1 text-xs text-mute">
                      Mode: {evt.event_mode.toUpperCase()} · Machine #{evt.machine_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      tone={evt.event_mode.toUpperCase() === 'IN' ? 'info' : evt.event_mode.toUpperCase() === 'OUT' ? 'success' : 'neutral'}
                      label={evt.event_mode.toUpperCase()}
                      size="sm"
                    />
                    {evt.verify_score != null ? (
                      <span className="badge border-slate-200 bg-white text-slate-600">
                        Score {evt.verify_score}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-700">
          <UiButton variant="secondary" size="md" onClick={onClose}>
            Tutup
          </UiButton>
        </div>
      </div>
    </div>
  )
}

function AttendanceDailyView({
  rows,
  onViewRawEvents,
  filterFrom,
  filterTo,
  onFilterFromChange,
  onFilterToChange,
  status = 'loaded',
  error = null,
}: {
  rows: AttendanceDailyRow[]
  onViewRawEvents: (row: AttendanceDailyRow) => void
  filterFrom: string
  filterTo: string
  onFilterFromChange: (v: string) => void
  onFilterToChange: (v: string) => void
  status?: 'idle' | 'loading' | 'loaded' | 'error'
  error?: string | null
}) {
  return (
    <section className="panel p-0 overflow-hidden space-y-0">
      <div className="flex flex-col gap-3 border-b border-line p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="section-title">Daily Attendance</p>
          <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Data Absensi Harian
          </h2>
          <p className="mt-2 text-sm leading-6 text-mute">
            Rekap kehadiran per karyawan per tanggal. Sumber data dan jumlah tap tersedia.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs uppercase tracking-[0.14em] text-mute">Dari:</label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => onFilterFromChange(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <label className="text-xs uppercase tracking-[0.14em] text-mute">Sampai:</label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => onFilterToChange(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <UiButton variant="primary" size="sm">
            Export Excel
          </UiButton>
        </div>
      </div>
      {status === 'loading' ? (
        <div className="p-5 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-14 w-full rounded-xl border border-line bg-slate-50 dark:bg-slate-800/50" />
          ))}
          <p className="text-xs text-mute">Memuat data absensi harian...</p>
        </div>
      ) : status === 'error' ? (
        <div className="p-5">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-700/40 dark:bg-rose-950/30">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Gagal memuat data absensi harian</p>
            {error ? <p className="mt-1 text-xs leading-6 text-rose-700 dark:text-rose-300">{error}</p> : null}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-mute dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Kode</th>
                <th className="px-4 py-3 text-left font-semibold">Nama Karyawan</th>
                <th className="px-4 py-3 text-left font-semibold">Divisi</th>
                <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                <th className="px-4 py-3 text-left font-semibold">Clock IN</th>
                <th className="px-4 py-3 text-left font-semibold">Clock OUT</th>
                <th className="px-4 py-3 text-left font-semibold">Jam Kerja</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Sumber Data</th>
                <th className="px-4 py-3 text-left font-semibold">Jumlah Tap</th>
                <th className="px-4 py-3 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {status === 'loaded' && rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-mute">
                    Data absensi tidak tersedia untuk periode ini.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const src = sourceBadgeIconAndLabel(row.source_type)
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                        {row.employee_code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-950 dark:text-white">
                          {row.employee_name}
                        </div>
                        <div className="text-xs text-mute">
                          {row.team} · {row.position}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-mute">{row.division}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        {row.attendance_date}
                      </td>
                      <td className="px-4 py-3 font-mono text-emerald-700 dark:text-emerald-300">
                        {extractTimeOnly(row.check_in)}
                      </td>
                      <td className="px-4 py-3 font-mono text-rose-700 dark:text-rose-300">
                        {extractTimeOnly(row.check_out)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                        {row.worked_hours}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          tone={statusTone(row.status)}
                          label={statusLabel(row.status)}
                          size="sm"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <StatusBadge tone={src.tone} label={`${src.icon} ${src.label}`} size="sm" uppercase={false} />
                          {src.note ? (
                            <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
                              {src.note}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge border-slate-200 bg-white text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {row.tap_count} tap
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UiButton variant="ghost" size="sm" onClick={() => onViewRawEvents(row)}>
                          Lihat Raw Events ({row.tap_count})
                        </UiButton>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function AttendanceMonthlyRecapView({
  rows,
  monthFilter,
  onMonthFilterChange,
  status = 'loaded',
  error = null,
}: {
  rows: MonthlyRecapRow[]
  monthFilter: string
  onMonthFilterChange: (v: string) => void
  status?: 'idle' | 'loading' | 'loaded' | 'error'
  error?: string | null
}) {
  return (
    <section className="panel p-0 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="section-title">Recap Bulanan</p>
          <h2 className="mt-1 font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-slate-950">
            Ringkasan Absensi Bulanan
          </h2>
          <p className="mt-2 text-sm leading-6 text-mute">
            Rekap kehadiran, rata-rata clock in/out, dan total overtime per karyawan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs uppercase tracking-[0.14em] text-mute">Bulan:</label>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => onMonthFilterChange(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <UiButton variant="secondary" size="sm">
            Filter Divisi/Team
          </UiButton>
          <UiButton variant="primary" size="sm">
            Export Recap
          </UiButton>
        </div>
      </div>
      {status === 'loading' ? (
        <div className="p-5 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse h-14 w-full rounded-xl border border-line bg-slate-50 dark:bg-slate-800/50" />
          ))}
          <p className="text-xs text-mute">Memuat rekap bulanan...</p>
        </div>
      ) : status === 'error' ? (
        <div className="p-5">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-700/40 dark:bg-rose-950/30">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Gagal memuat rekap bulanan</p>
            {error ? <p className="mt-1 text-xs leading-6 text-rose-700 dark:text-rose-300">{error}</p> : null}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.14em] text-mute dark:bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Kode</th>
                <th className="px-4 py-3 text-left font-semibold">Nama Karyawan</th>
                <th className="px-4 py-3 text-left font-semibold">Divisi</th>
                <th className="px-4 py-3 text-left font-semibold">Team</th>
                <th className="px-4 py-3 text-left font-semibold">Jabatan</th>
                <th className="px-4 py-3 text-center font-semibold">Total Hari</th>
                <th className="px-4 py-3 text-center font-semibold">Hadir</th>
                <th className="px-4 py-3 text-center font-semibold">Alpha</th>
                <th className="px-4 py-3 text-center font-semibold">Sakit</th>
                <th className="px-4 py-3 text-center font-semibold">Izin</th>
                <th className="px-4 py-3 text-center font-semibold">Partial Pagi</th>
                <th className="px-4 py-3 text-right font-semibold">Total OT (jam)</th>
                <th className="px-4 py-3 text-center font-semibold">Rata Clock IN</th>
                <th className="px-4 py-3 text-center font-semibold">Rata Clock OUT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {status === 'loaded' && rows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-mute">
                    Belum ada rekap bulanan untuk periode ini.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`month-${row.employee_id}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {row.employee_code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-950 dark:text-white">
                        {row.employee_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-mute">{row.division}</td>
                    <td className="px-4 py-3 text-mute">{row.team}</td>
                    <td className="px-4 py-3 text-mute">{row.position}</td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-100">
                      {row.total_work_days}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge tone="success" label={String(row.present_count)} size="sm" uppercase={false} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge tone="danger" label={String(row.alpha_count)} size="sm" uppercase={false} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge tone="warning" label={String(row.sick_count)} size="sm" uppercase={false} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge tone="info" label={String(row.leave_count)} size="sm" uppercase={false} />
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-700 dark:text-slate-300">
                      {row.partial_morning_count}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {row.total_ot_hours.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-emerald-700 dark:text-emerald-300">
                      {row.avg_check_in}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-rose-700 dark:text-rose-300">
                      {row.avg_check_out}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

type AttendanceSubTab = 'daily' | 'monthly'

export function HrWorkspacePage({ content, source, capabilities, role, activeWorkspace, workspaceInsightSections = [] }: HrWorkspacePageProps & { workspaceInsightSections?: DomainReviewSection[] }) {
  const enabledCapabilities = capabilities.filter((item) => item.enabled)
  const canCreate = enabledCapabilities.some((item) => item.action === 'create')
  const canUpdate = enabledCapabilities.some((item) => item.action === 'update')
  const reviewDbReady = source.effectiveMode === 'review-db' && !source.isFallback

  type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error'

  const [dailyStatus, setDailyStatus] = useState<LoadStatus>('idle')
  const [dailyRows, setDailyRows] = useState<AttendanceDailyRow[]>([])
  const [dailyError, setDailyError] = useState<string | null>(null)
  const [dailyFilterFrom, setDailyFilterFrom] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })
  const [dailyFilterTo, setDailyFilterTo] = useState<string>(() => new Date().toISOString().split('T')[0])

  const [monthlyStatus, setMonthlyStatus] = useState<LoadStatus>('idle')
  const [monthlyRows, setMonthlyRows] = useState<MonthlyRecapRow[]>([])
  const [monthlyError, setMonthlyError] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<string>(() => new Date().toISOString().substring(0, 7))

  const [unmappedStatus, setUnmappedStatus] = useState<LoadStatus>('idle')
  const [unmappedCount, setUnmappedCount] = useState<number | null>(null)
  const [unmappedError, setUnmappedError] = useState<string | null>(null)

  const [deviceStatus, setDeviceStatus] = useState<LoadStatus>('idle')
  const [deviceSummary, setDeviceSummary] = useState<FpDeviceSummary | null>(null)
  const [deviceError, setDeviceError] = useState<string | null>(null)

  const [rawEventsStatus, setRawEventsStatus] = useState<LoadStatus>('idle')
  const [rawEvents, setRawEvents] = useState<RawEventItem[]>([])
  const [rawEventsError, setRawEventsError] = useState<string | null>(null)

  const [attendanceSubTab, setAttendanceSubTab] = useState<AttendanceSubTab>('daily')
  const [rawModalOpen, setRawModalOpen] = useState(false)
  const [rawModalRow, setRawModalRow] = useState<AttendanceDailyRow | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchDaily() {
      setDailyStatus('loading')
      setDailyError(null)
      try {
        const url = `/api/hr/attendance/summary?from_date=${encodeURIComponent(dailyFilterFrom)}&to_date=${encodeURIComponent(dailyFilterTo)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setDailyRows(Array.isArray(json?.daily) ? json.daily : [])
          setDailyStatus('loaded')
        }
      } catch (err: any) {
        if (!cancelled) {
          setDailyError(err?.message || 'Gagal memuat data harian')
          setDailyStatus('error')
        }
      }
    }
    void fetchDaily()
    return () => { cancelled = true }
  }, [dailyFilterFrom, dailyFilterTo, source?.effectiveMode])

  useEffect(() => {
    let cancelled = false
    async function fetchMonthly() {
      setMonthlyStatus('loading')
      setMonthlyError(null)
      try {
        const url = `/api/hr/attendance/monthly?month=${encodeURIComponent(monthFilter)}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setMonthlyRows(Array.isArray(json) ? json : [])
          setMonthlyStatus('loaded')
        }
      } catch (err: any) {
        if (!cancelled) {
          setMonthlyError(err?.message || 'Gagal memuat rekap bulanan')
          setMonthlyStatus('error')
        }
      }
    }
    void fetchMonthly()
    return () => { cancelled = true }
  }, [monthFilter])

  useEffect(() => {
    let cancelled = false
    async function fetchUnmapped() {
      setUnmappedStatus('loading')
      setUnmappedError(null)
      try {
        const url = '/api/hr/attendance/unmapped-count'
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          const countNum = Number(json?.count)
          setUnmappedCount(Number.isFinite(countNum) ? countNum : 0)
          setUnmappedStatus('loaded')
        }
      } catch (err: any) {
        if (!cancelled) {
          setUnmappedError(err?.message || 'Gagal memuat data unmapped')
          setUnmappedStatus('error')
        }
      }
    }
    void fetchUnmapped()
    return () => { cancelled = true }
  }, [attendanceSubTab])

  useEffect(() => {
    let cancelled = false
    async function fetchDevice() {
      setDeviceStatus('loading')
      setDeviceError(null)
      try {
        const url = '/api/hr/fingerprint/devices/summary'
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setDeviceSummary(json ?? null)
          setDeviceStatus('loaded')
        }
      } catch (err: any) {
        if (!cancelled) {
          setDeviceError(err?.message || 'Gagal memuat ringkasan perangkat')
          setDeviceStatus('error')
        }
      }
    }
    void fetchDevice()
    return () => { cancelled = true }
  }, [attendanceSubTab])

  useEffect(() => {
    let cancelled = false
    if (!rawModalRow) {
      setRawEvents([])
      setRawEventsStatus('idle')
      return
    }
    const targetRow = rawModalRow
    async function fetchRawEvents() {
      setRawEventsStatus('loading')
      setRawEventsError(null)
      try {
        const url = `/api/hr/attendance/${targetRow.employee_id}/${encodeURIComponent(targetRow.attendance_date)}/raw-events`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setRawEvents(Array.isArray(json?.events) ? json.events : [])
          setRawEventsStatus('loaded')
        }
      } catch (err: any) {
        if (!cancelled) {
          setRawEventsError(err?.message || 'Gagal memuat raw events')
          setRawEventsStatus('error')
        }
      }
    }
    void fetchRawEvents()
    return () => { cancelled = true }
  }, [rawModalRow])

  const modalEvents = rawEvents

  function handleViewRawEvents(row: AttendanceDailyRow) {
    setRawModalRow(row)
    setRawModalOpen(true)
  }

  const visibleSections = [...workspaceInsightSections, ...getVisibleSections(activeWorkspace, content.reviewSections ?? [])]

  return (
    <div className="space-y-6">
      <DataSourceStatus source={source} />

      {activeWorkspace === 'attendance' ? (
        <>
          <UnmappedWarningPanel count={unmappedCount} status={unmappedStatus} error={unmappedError} />
          <FpDevicesSummaryCard summary={deviceSummary} status={deviceStatus} error={deviceError} />
        </>
      ) : null}

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

      {activeWorkspace === 'attendance' ? (
        <section className="space-y-4">
          <div className="panel p-2 inline-flex flex-wrap items-center gap-2 rounded-full">
            <UiButton
              variant={attendanceSubTab === 'daily' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setAttendanceSubTab('daily')}
            >
              Harian / Daily
            </UiButton>
            <UiButton
              variant={attendanceSubTab === 'monthly' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setAttendanceSubTab('monthly')}
            >
              Recap Bulanan
            </UiButton>
          </div>
          {attendanceSubTab === 'daily' ? (
            <AttendanceDailyView
              rows={dailyRows}
              onViewRawEvents={handleViewRawEvents}
              filterFrom={dailyFilterFrom}
              filterTo={dailyFilterTo}
              onFilterFromChange={setDailyFilterFrom}
              onFilterToChange={setDailyFilterTo}
              status={dailyStatus}
              error={dailyError}
            />
          ) : (
            <AttendanceMonthlyRecapView
              rows={monthlyRows}
              monthFilter={monthFilter}
              onMonthFilterChange={setMonthFilter}
              status={monthlyStatus}
              error={monthlyError}
            />
          )}
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

      <RawEventsModal
        open={rawModalOpen}
        onClose={() => setRawModalOpen(false)}
        employeeName={rawModalRow?.employee_name ?? ''}
        attendanceDate={rawModalRow?.attendance_date ?? ''}
        events={modalEvents}
        status={rawEventsStatus}
        error={rawEventsError}
      />
    </div>
  )
}
