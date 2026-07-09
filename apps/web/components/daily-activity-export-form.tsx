'use client'

import { useMemo, useState } from 'react'

type DailyActivityExportFormProps = {
  canExport: boolean
  reviewDbReady: boolean
  isSuperAdmin: boolean
  divisionOptions: string[]
  subdivisionMap: Record<string, string[]>
  defaultDivision: string
  defaultSubdivision: string
}

function getTodayIsoDate() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function getMonthStartIsoDate(value: string) {
  return `${value.slice(0, 7)}-01`
}

export function DailyActivityExportForm({
  canExport,
  reviewDbReady,
  isSuperAdmin,
  divisionOptions,
  subdivisionMap,
  defaultDivision,
  defaultSubdivision,
}: DailyActivityExportFormProps) {
  const today = useMemo(() => getTodayIsoDate(), [])
  const [fromDate, setFromDate] = useState(getMonthStartIsoDate(today))
  const [toDate, setToDate] = useState(today)
  const [divisionName, setDivisionName] = useState(defaultDivision)
  const [subdivisionName, setSubdivisionName] = useState(defaultSubdivision)

  const subdivisionOptions = useMemo(() => subdivisionMap[divisionName] ?? [], [divisionName, subdivisionMap])
  const canDownload = canExport && reviewDbReady && fromDate && toDate && fromDate <= toDate
  const href = useMemo(() => {
    const params = new URLSearchParams()
    params.set('from', fromDate)
    params.set('to', toDate)
    if (isSuperAdmin) {
      if (divisionName) params.set('divisionName', divisionName)
      if (subdivisionName) params.set('subdivisionName', subdivisionName)
    }
    return `/api/daily-activities/export?${params.toString()}`
  }, [divisionName, fromDate, isSuperAdmin, subdivisionName, toDate])

  return (
    <section className="panel p-6">
      <p className="section-title">Export CSV</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Unduh laporan daily activity (CSV)
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        {!canExport
          ? 'Role aktif belum memiliki izin export untuk daily activity.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi export dinonaktifkan.'
            : 'Gunakan export CSV untuk rekap performa harian, mingguan, atau bulanan sesuai rentang tanggal yang dipilih.'}
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Dari tanggal</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={!canExport || !reviewDbReady}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Sampai tanggal</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={!canExport || !reviewDbReady}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Divisi</span>
          <select
            value={divisionName}
            onChange={(event) => setDivisionName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={!canExport || !reviewDbReady || !isSuperAdmin}
          >
            {divisionOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Sub-divisi</span>
          <select
            value={subdivisionName}
            onChange={(event) => setSubdivisionName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={!canExport || !reviewDbReady || !isSuperAdmin}
          >
            {subdivisionOptions.length ? (
              subdivisionOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))
            ) : (
              <option value="">Tanpa sub-divisi</option>
            )}
          </select>
        </label>

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Format CSV ringan dan aman untuk performa web. File bisa dibuka langsung di Excel.
          </div>
          <a
            href={href}
            className={`rounded-full px-5 py-3 text-sm font-semibold ${
              canDownload ? 'bg-slate-950 text-white' : 'cursor-not-allowed bg-slate-200 text-slate-500'
            }`}
            aria-disabled={!canDownload}
            onClick={(event) => {
              if (!canDownload) event.preventDefault()
            }}
          >
            Download CSV
          </a>
        </div>
      </div>
    </section>
  )
}

