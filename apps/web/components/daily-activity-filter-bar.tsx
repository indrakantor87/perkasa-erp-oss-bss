'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type DailyActivityFilterBarProps = {
  isSuperAdmin: boolean
  calendarMonth: string
  divisionOptions: string[]
  subdivisionMap: Record<string, string[]>
  selectedDivision: string
  selectedSubdivision: string
  selectedPlanningLevel: string
  selectedApprovalStatus: string
}

const planningLevelFilterOptions = [
  { value: 'ALL', label: 'Semua level' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'SPV', label: 'SPV' },
  { value: 'LEADER', label: 'Leader' },
] as const

const approvalStatusFilterOptions = [
  { value: 'ALL', label: 'Semua approval' },
  { value: 'PENDING', label: 'Menunggu approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'NONE', label: 'Belum di-close' },
] as const

export function DailyActivityFilterBar({
  isSuperAdmin,
  calendarMonth,
  divisionOptions,
  subdivisionMap,
  selectedDivision,
  selectedSubdivision,
  selectedPlanningLevel,
  selectedApprovalStatus,
}: DailyActivityFilterBarProps) {
  const router = useRouter()
  const [divisionName, setDivisionName] = useState(selectedDivision)
  const [subdivisionName, setSubdivisionName] = useState(selectedSubdivision)
  const [planningLevel, setPlanningLevel] = useState(selectedPlanningLevel)
  const [approvalStatus, setApprovalStatus] = useState(selectedApprovalStatus)

  const subdivisionOptions = useMemo(
    () => subdivisionMap[divisionName] ?? [],
    [divisionName, subdivisionMap],
  )

  useEffect(() => {
    if (subdivisionOptions.length === 0) {
      setSubdivisionName('')
      return
    }
    if (!subdivisionOptions.includes(subdivisionName)) {
      setSubdivisionName(subdivisionOptions[0] ?? '')
    }
  }, [subdivisionName, subdivisionOptions])

  function pushNext(next: {
    divisionName: string
    subdivisionName: string
    planningLevel: string
    approvalStatus: string
  }) {
    const params = new URLSearchParams()
    if (calendarMonth) params.set('month', calendarMonth)

    if (isSuperAdmin) {
      params.set('divisionName', next.divisionName)
      if (next.subdivisionName) {
        params.set('subdivisionName', next.subdivisionName)
      } else {
        params.delete('subdivisionName')
      }
    } else {
      params.delete('divisionName')
      params.delete('subdivisionName')
    }

    if (next.planningLevel && next.planningLevel !== 'ALL') {
      params.set('planningLevel', next.planningLevel)
    } else {
      params.delete('planningLevel')
    }

    if (next.approvalStatus && next.approvalStatus !== 'ALL') {
      params.set('approvalStatus', next.approvalStatus)
    } else {
      params.delete('approvalStatus')
    }

    router.replace(`?${params.toString()}`)
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Filter Tampilan</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Drill-down divisi, sub-divisi, dan level
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        Filter ini mengubah tampilan kalender dan performa agar manager bisa mengecek capaian secara spesifik.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Divisi</span>
          <select
            value={divisionName}
            onChange={(event) => {
              const nextDivision = event.target.value
              setDivisionName(nextDivision)
              const nextSubdivision = (subdivisionMap[nextDivision] ?? [])[0] ?? ''
              setSubdivisionName(nextSubdivision)
              pushNext({
                divisionName: nextDivision,
                subdivisionName: nextSubdivision,
                planningLevel,
                approvalStatus,
              })
            }}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400 disabled:bg-slate-50"
            disabled={!isSuperAdmin}
          >
            {divisionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Sub-divisi</span>
          <select
            value={subdivisionName}
            onChange={(event) => {
              const nextSubdivision = event.target.value
              setSubdivisionName(nextSubdivision)
              pushNext({
                divisionName,
                subdivisionName: nextSubdivision,
                planningLevel,
                approvalStatus,
              })
            }}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400 disabled:bg-slate-50"
            disabled={!isSuperAdmin}
          >
            {subdivisionOptions.length ? (
              subdivisionOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))
            ) : (
              <option value="">Tanpa sub-divisi</option>
            )}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Level plan</span>
          <select
            value={planningLevel}
            onChange={(event) => {
              const nextLevel = event.target.value
              setPlanningLevel(nextLevel)
              pushNext({
                divisionName,
                subdivisionName,
                planningLevel: nextLevel,
                approvalStatus,
              })
            }}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          >
            {planningLevelFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Approval</span>
          <select
            value={approvalStatus}
            onChange={(event) => {
              const nextApproval = event.target.value
              setApprovalStatus(nextApproval)
              pushNext({
                divisionName,
                subdivisionName,
                planningLevel,
                approvalStatus: nextApproval,
              })
            }}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          >
            {approvalStatusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
