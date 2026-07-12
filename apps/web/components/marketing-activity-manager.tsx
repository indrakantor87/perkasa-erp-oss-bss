'use client'

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  Users,
} from 'lucide-react'
import type { AppRole } from '@/lib/types'
import type {
  MarketingActivityRecord,
  MarketingCoveredAreaOption,
} from '@/lib/services/marketing-activity-service'

type MarketingActivityManagerProps = {
  role: AppRole
  username: string
  displayName: string
  marketingOptions: Array<{ username: string; fullName: string }>
  coveredAreas: MarketingCoveredAreaOption[]
}

type FormState = {
  date: string
  marketingName: string
  areaId: string
  areaId2: string
  areaId3: string
  areaId4: string
  activity: string
  notes: string
}

type ViewMode = 'marketing' | 'area'

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function formatDateLabel(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function buildDefaultForm(marketingName: string): FormState {
  return {
    date: getTodayIsoDate(),
    marketingName,
    areaId: '',
    areaId2: '',
    areaId3: '',
    areaId4: '',
    activity: '',
    notes: '',
  }
}

export function MarketingActivityManager({
  role,
  username,
  displayName,
  marketingOptions,
  coveredAreas,
}: MarketingActivityManagerProps) {
  const canMutate = role === 'SUPER_ADMIN' || role === 'SALES_MARKETING'
  const isMarketingRole = role === 'SALES_MARKETING'
  const initialMarketingName = isMarketingRole ? displayName : marketingOptions[0]?.fullName ?? ''

  const [activities, setActivities] = useState<MarketingActivityRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MarketingActivityRecord | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('marketing')
  const [expandedMarketing, setExpandedMarketing] = useState<string | null>(null)
  const [marketingSearch, setMarketingSearch] = useState('')
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(new Date().getFullYear())
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [formData, setFormData] = useState<FormState>(buildDefaultForm(initialMarketingName))

  const areaFields = ['areaId', 'areaId2', 'areaId3', 'areaId4'] as const
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ]
  const years = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - 2 + index)

  const marketingNameMap = useMemo(() => {
    return new Map(
      marketingOptions.map((item) => [item.fullName.trim().toLowerCase(), item.fullName]),
    )
  }, [marketingOptions])

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
      })
      if (!isMarketingRole && marketingSearch.trim()) {
        params.set('marketing', marketingSearch.trim())
      }
      const response = await fetch(`/api/sales/marketing-activities?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = (await response.json().catch(() => [])) as MarketingActivityRecord[] | { message?: string }
      if (!response.ok) {
        throw new Error(
          typeof payload === 'object' && !Array.isArray(payload) ? payload.message || 'Gagal memuat aktivitas marketing.' : 'Gagal memuat aktivitas marketing.',
        )
      }
      setActivities(Array.isArray(payload) ? payload : [])
    } catch (error) {
      setActivities([])
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Aktivitas marketing gagal dimuat.',
      })
    } finally {
      setLoading(false)
    }
  }, [isMarketingRole, marketingSearch, month, year])

  useEffect(() => {
    void fetchActivities()
  }, [fetchActivities])

  useEffect(() => {
    const handler = () => {
      void fetchActivities()
    }
    window.addEventListener('app:refresh', handler)
    return () => window.removeEventListener('app:refresh', handler)
  }, [fetchActivities])

  const groupedActivities = useMemo(() => {
    return activities.reduce<Record<string, { name: string; items: MarketingActivityRecord[]; activeDays: number; emptyDays: number }>>((accumulator, item) => {
      const name = item.marketingName || 'Belum Diisi'
      accumulator[name] ??= {
        name,
        items: [],
        activeDays: 0,
        emptyDays: 0,
      }
      accumulator[name].items.push(item)
      if (item.activity.trim() && item.activity.trim() !== '-') {
        accumulator[name].activeDays += 1
      } else {
        accumulator[name].emptyDays += 1
      }
      return accumulator
    }, {})
  }, [activities])

  const sortedMarketingNames = useMemo(() => Object.keys(groupedActivities).sort(), [groupedActivities])

  const areaStats = useMemo(() => {
    const visitCounts = new Map<number, number>()
    const marketerSets = new Map<number, Set<string>>()
    activities.forEach((item) => {
      const uniqueIds = Array.from(
        new Set([item.areaId, item.areaId2, item.areaId3, item.areaId4].filter((value): value is number => typeof value === 'number' && value > 0)),
      )
      uniqueIds.forEach((id) => {
        visitCounts.set(id, (visitCounts.get(id) ?? 0) + 1)
        const marketerName = item.marketingName.trim() || 'Belum Diisi'
        const nextSet = marketerSets.get(id) ?? new Set<string>()
        nextSet.add(marketerName)
        marketerSets.set(id, nextSet)
      })
    })
    const totalVisits = Array.from(visitCounts.values()).reduce((sum, value) => sum + value, 0)
    return coveredAreas
      .map((area) => {
        const visits = visitCounts.get(area.id) ?? 0
        const marketers = Array.from(marketerSets.get(area.id) ?? [])
        return {
          ...area,
          visits,
          marketers,
          percentage: totalVisits > 0 ? (visits / totalVisits) * 100 : 0,
        }
      })
      .sort((left, right) => right.visits - left.visits)
  }, [activities, coveredAreas])

  const summaryStats = useMemo(() => {
    const totalMarketing = sortedMarketingNames.length
    const activeDays = Object.values(groupedActivities).reduce((sum, item) => sum + item.activeDays, 0)
    const emptyDays = Object.values(groupedActivities).reduce((sum, item) => sum + item.emptyDays, 0)
    const totalVisits = areaStats.reduce((sum, item) => sum + item.visits, 0)
    return {
      totalMarketing,
      activeDays,
      emptyDays,
      totalVisits,
    }
  }, [areaStats, groupedActivities, sortedMarketingNames])

  const selectedAreaValues = useMemo(
    () => areaFields.map((field) => formData[field]).filter(Boolean),
    [formData],
  )

  const getAvailableAreas = useCallback(
    (currentValue: string) =>
      coveredAreas.filter(
        (area) => !selectedAreaValues.includes(String(area.id)) || String(area.id) === currentValue,
      ),
    [coveredAreas, selectedAreaValues],
  )

  function resetForm(nextMarketingName = initialMarketingName) {
    setFormData(buildDefaultForm(nextMarketingName))
    setEditingItem(null)
  }

  function openCreateModal() {
    resetForm(initialMarketingName)
    setIsModalOpen(true)
  }

  function openEditModal(item: MarketingActivityRecord) {
    setEditingItem(item)
    setFormData({
      date: item.date,
      marketingName: isMarketingRole
        ? displayName
        : marketingNameMap.get(item.marketingName.trim().toLowerCase()) ?? item.marketingName,
      areaId: item.areaId ? String(item.areaId) : '',
      areaId2: item.areaId2 ? String(item.areaId2) : '',
      areaId3: item.areaId3 ? String(item.areaId3) : '',
      areaId4: item.areaId4 ? String(item.areaId4) : '',
      activity: item.activity === '-' ? '' : item.activity,
      notes: item.notes ?? '',
    })
    setIsModalOpen(true)
  }

  function updateAreaField(field: (typeof areaFields)[number], value: string) {
    setFormData((previous) => {
      const next = { ...previous, [field]: value }
      if (value) {
        areaFields.forEach((candidate) => {
          if (candidate !== field && next[candidate] === value) {
            next[candidate] = ''
          }
        })
      }
      return next
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canMutate) return

    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch(
        editingItem ? `/api/sales/marketing-activities/${editingItem.id}` : '/api/sales/marketing-activities',
        {
          method: editingItem ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        },
      )
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null
      if (!response.ok) {
        throw new Error(payload?.message || 'Aktivitas marketing gagal disimpan.')
      }
      setIsModalOpen(false)
      resetForm(initialMarketingName)
      setFeedback({
        tone: 'success',
        message: payload?.message || 'Aktivitas marketing berhasil disimpan.',
      })
      await fetchActivities()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Aktivitas marketing gagal disimpan.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!canMutate) return
    if (!window.confirm('Hapus aktivitas marketing ini?')) return

    try {
      const response = await fetch(`/api/sales/marketing-activities/${id}`, {
        method: 'DELETE',
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        throw new Error(payload?.message || 'Aktivitas marketing gagal dihapus.')
      }
      setFeedback({
        tone: 'success',
        message: payload?.message || 'Aktivitas marketing berhasil dihapus.',
      })
      await fetchActivities()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Aktivitas marketing gagal dihapus.',
      })
    }
  }

  async function handleExport() {
    setIsExporting(true)
    try {
      const XLSX = await import('xlsx')
      const dataToExport = activities.map((item) => ({
        Tanggal: formatDateLabel(item.date),
        Marketing: item.marketingName,
        'Area 1': item.area?.name || '-',
        'Area 2': item.area2?.name || '-',
        'Area 3': item.area3?.name || '-',
        'Area 4': item.area4?.name || '-',
        Aktivitas: item.activity || '-',
        Keterangan: item.notes || '-',
      }))
      const worksheet = XLSX.utils.json_to_sheet(dataToExport)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Aktivitas Marketing')
      XLSX.writeFile(workbook, `aktivitas-marketing-${year}-${String(month).padStart(2, '0')}.xlsx`)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-title">Penjualan</p>
            <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
              Aktivitas Marketing
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">
              Modul ini menyalin pola web-psb-perkasa untuk mencatat aktivitas harian marketing
              per area, membaca produktivitas per marketing, dan menganalisis distribusi kunjungan area.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="badge border-slate-200 bg-white text-slate-600">
              User aktif: {displayName}
            </span>
            <span className="badge border-slate-200 bg-white text-slate-600">
              Owner data: {isMarketingRole ? username : 'lintas marketing'}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm font-medium text-emerald-700">Ada Aktivitas</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-emerald-900">{summaryStats.activeDays}</p>
          <p className="mt-2 text-sm text-emerald-700">Hari kerja marketing dengan aktivitas tercatat.</p>
        </article>
        <article className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-medium text-amber-700">Tidak Ada</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-amber-900">{summaryStats.emptyDays}</p>
          <p className="mt-2 text-sm text-amber-700">Hari yang tercatat tanpa aktivitas lapangan tertulis.</p>
        </article>
        <article className="rounded-3xl border border-sky-200 bg-sky-50 p-6">
          <p className="text-sm font-medium text-sky-700">Marketing Aktif</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-sky-900">{summaryStats.totalMarketing}</p>
          <p className="mt-2 text-sm text-sky-700">Nama marketing yang muncul pada periode terpilih.</p>
        </article>
        <article className="rounded-3xl border border-violet-200 bg-violet-50 p-6">
          <p className="text-sm font-medium text-violet-700">Total Kunjungan Area</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight text-violet-900">{summaryStats.totalVisits}</p>
          <p className="mt-2 text-sm text-violet-700">Akumulasi coverage area yang benar-benar disentuh marketing.</p>
        </article>
      </section>

      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex w-fit rounded-2xl border border-line bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('marketing')}
                className={classNames(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                  viewMode === 'marketing'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <Users className="h-4 w-4" />
                Per Marketing
              </button>
              <button
                type="button"
                onClick={() => setViewMode('area')}
                className={classNames(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                  viewMode === 'area'
                    ? 'bg-white text-slate-950 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
                )}
              >
                <span className="text-base leading-none">+</span>
                Analisis Area
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-950">Bulan</span>
                <select
                  value={month}
                  onChange={(event) => setMonth(Number(event.target.value))}
                  className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                >
                  {months.map((item, index) => (
                    <option key={item} value={index + 1}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-950">Tahun</span>
                <select
                  value={year}
                  onChange={(event) => setYear(Number(event.target.value))}
                  className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                >
                  {years.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              {!isMarketingRole ? (
                <label className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Cari Marketing</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      value={marketingSearch}
                      onChange={(event) => setMarketingSearch(event.target.value)}
                      placeholder="Nama marketing atau username"
                      className="w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-4 outline-none transition focus:border-slate-400"
                    />
                  </div>
                </label>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={isExporting || activities.length === 0}
              className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="inline-flex items-center gap-2">
                {isExporting ? 'Menyiapkan Export...' : 'Export Excel'}
              </span>
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!canMutate}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <span className="inline-flex items-center gap-2">
                Tambah Aktivitas
              </span>
            </button>
          </div>
        </div>

        {!canMutate ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
            Role aktif saat ini hanya membaca modul Aktivitas Marketing tanpa tambah, edit, atau hapus.
          </div>
        ) : null}

        {feedback ? (
          <div
            className={classNames(
              'mt-4 rounded-2xl border px-4 py-3 text-sm',
              feedback.tone === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-rose-200 bg-rose-50 text-rose-700',
            )}
          >
            {feedback.message}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {viewMode === 'marketing'
            ? 'Menampilkan pembacaan aktivitas asli tim Penjualan/Marketing per marketing pada periode terpilih.'
            : 'Menampilkan distribusi area coverage agar ERP tetap bisa membaca jalur aktivitas lapangan per wilayah.'}
        </div>
      </section>

      {viewMode === 'marketing' ? (
        <section className="panel overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-14 px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500" />
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Marketing</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Ada Aktivitas</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Tidak Ada</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Total Hari</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                      Memuat aktivitas marketing...
                    </td>
                  </tr>
                ) : sortedMarketingNames.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                      Belum ada aktivitas marketing pada periode terpilih.
                    </td>
                  </tr>
                ) : (
                  sortedMarketingNames.map((name) => {
                    const group = groupedActivities[name]
                    const isExpanded = expandedMarketing === name
                    return (
                      <Fragment key={name}>
                        <tr
                          className="cursor-pointer transition hover:bg-slate-50"
                          onClick={() => setExpandedMarketing(isExpanded ? null : name)}
                        >
                          <td className="px-6 py-4 text-slate-500">
                            <span className="text-xs font-semibold">{isExpanded ? '▼' : '▶'}</span>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-950">{name}</td>
                          <td className="px-6 py-4 text-center text-sm text-slate-700">{group.activeDays}</td>
                          <td className="px-6 py-4 text-center text-sm text-slate-700">{group.emptyDays}</td>
                          <td className="px-6 py-4 text-center text-sm text-slate-700">{group.items.length}</td>
                        </tr>
                        {isExpanded ? (
                          <tr>
                            <td colSpan={5} className="bg-slate-50 px-4 py-4">
                              <div className="overflow-hidden rounded-2xl border border-line bg-white">
                                <table className="min-w-full divide-y divide-slate-200">
                                  <thead className="bg-slate-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Area</th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aktivitas</th>
                                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Keterangan</th>
                                      <th className="w-28 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-200">
                                    {group.items.map((item) => (
                                      <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-xs text-slate-600">{formatDateLabel(item.date)}</td>
                                        <td className="px-4 py-3 text-xs text-slate-700">
                                          {[item.area?.name, item.area2?.name, item.area3?.name, item.area4?.name]
                                            .filter(Boolean)
                                            .join(', ') || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-950">
                                          {item.activity.trim() === '-' ? (
                                            <span className="font-medium italic text-rose-600">Tidak ada aktivitas</span>
                                          ) : (
                                            item.activity
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-xs italic text-slate-500">{item.notes || '-'}</td>
                                        <td className="px-4 py-3">
                                          <div className="flex items-center justify-center gap-1">
                                            {canMutate ? (
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  openEditModal(item)
                                                }}
                                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                                                title="Edit aktivitas"
                                              >
                                                <span className="text-xs font-semibold">Edit</span>
                                              </button>
                                            ) : null}
                                            {canMutate ? (
                                              <button
                                                type="button"
                                                onClick={(event) => {
                                                  event.stopPropagation()
                                                  void handleDelete(item.id)
                                                }}
                                                className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
                                                title="Hapus aktivitas"
                                              >
                                                <span className="text-xs font-semibold">Hapus</span>
                                              </button>
                                            ) : null}
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="grid gap-6">
          <div className="panel overflow-hidden p-0">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-title">Analisis Area</p>
                  <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                    Distribusi kunjungan area pada periode aktif
                  </h3>
                </div>
                <span className="badge border-slate-200 bg-white text-slate-600">
                  {summaryStats.totalVisits} kunjungan
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Area</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Kunjungan</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Marketing Aktif</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Persentase</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">PIC Area</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {areaStats.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-500">
                        Belum ada area coverage atau aktivitas marketing yang terbaca.
                      </td>
                    </tr>
                  ) : (
                    areaStats.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-950">{item.name}</td>
                        <td className="px-6 py-4 text-center text-sm text-slate-700">{item.visits}</td>
                        <td className="px-6 py-4 text-center text-sm text-slate-700">{item.marketers.length}</td>
                        <td className="px-6 py-4 text-center text-sm text-slate-700">{item.percentage.toFixed(1)}%</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {item.marketers.length ? item.marketers.join(', ') : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel p-6">
            <p className="section-title">Catatan Operasional</p>
            <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              Pembacaan parity dari baseline
            </h3>
            <ul className="mt-6 space-y-4 text-sm leading-6 text-mute">
              <li>Aktivitas disimpan per tanggal dan per marketing agar ringkasan hari aktif dan hari kosong tetap terbaca seperti di sistem lama.</li>
              <li>Satu aktivitas bisa mengaitkan sampai empat area coverage agar kunjungan gabungan tetap tercatat dalam satu entri kerja.</li>
              <li>Analisis area menghitung kunjungan unik per aktivitas sehingga distribusi coverage tidak bias karena duplikasi area yang sama.</li>
            </ul>
          </div>
        </section>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-line bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div>
                <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
                  {editingItem ? 'Edit Aktivitas Marketing' : 'Tambah Aktivitas Marketing'}
                </h3>
                <p className="mt-2 text-sm leading-6 text-mute">
                  Catat aktivitas lapangan marketing dengan area coverage yang benar-benar dikunjungi pada hari tersebut.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-line bg-white p-2 text-slate-500 transition hover:text-slate-950"
              >
                <span className="text-sm font-semibold">Tutup</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 px-6 py-5 lg:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-950">Tanggal</span>
                <input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(event) => setFormData((previous) => ({ ...previous, date: event.target.value }))}
                  className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-950">Marketing</span>
                {isMarketingRole ? (
                  <input
                    value={displayName}
                    readOnly
                    className="rounded-2xl border border-line bg-slate-50 px-4 py-3 text-slate-600 outline-none"
                  />
                ) : (
                  <select
                    required
                    value={formData.marketingName}
                    onChange={(event) =>
                      setFormData((previous) => ({ ...previous, marketingName: event.target.value }))
                    }
                    className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                  >
                    {marketingOptions.map((item) => (
                      <option key={item.username} value={item.fullName}>
                        {item.fullName}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              {areaFields.map((field, index) => (
                <label key={field} className="flex flex-col gap-2 text-sm text-slate-700">
                  <span className="font-semibold text-slate-950">Area {index + 1}</span>
                  <select
                    value={formData[field]}
                    onChange={(event) => updateAreaField(field, event.target.value)}
                    className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                  >
                    <option value="">- Pilih Area -</option>
                    {getAvailableAreas(formData[field]).map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}

              <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
                <span className="font-semibold text-slate-950">Aktivitas</span>
                <textarea
                  rows={3}
                  value={formData.activity}
                  onChange={(event) => setFormData((previous) => ({ ...previous, activity: event.target.value }))}
                  placeholder="Contoh: canvassing area, follow up prospek, survey awal, koordinasi lapangan"
                  className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
                <span className="font-semibold text-slate-950">Keterangan</span>
                <input
                  value={formData.notes}
                  onChange={(event) => setFormData((previous) => ({ ...previous, notes: event.target.value }))}
                  placeholder="Catatan tambahan hasil kunjungan"
                  className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                />
              </label>

              <div className="flex flex-wrap justify-end gap-3 lg:col-span-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Aktivitas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
