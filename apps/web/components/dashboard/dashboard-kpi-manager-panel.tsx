'use client'

import type { FormEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DASHBOARD_KPI_KEY_LABELS,
  DASHBOARD_KPI_KEYS,
  DASHBOARD_KPI_METRIC_TYPES,
  DASHBOARD_KPI_TEMPLATE_OPTIONS,
  getDashboardKpiDivisionOptions,
  getDashboardKpiSubdivisionOptions,
  resolveDashboardKpiTemplateDrilldown,
  resolveDashboardKpiTemplateMetricType,
} from '@/lib/dashboard-kpi-config'

type DashboardKpiDefinition = {
  id: string
  scopeType: 'SYSTEM' | 'DIVISION'
  divisionName: string
  subdivisionName: string
  dashboardKey: string
  metricKey: string
  metricLabel: string
  metricType: 'COUNT' | 'SUM' | 'PERCENTAGE'
  templateKey: string
  displayOrder: number
  isActive: boolean
  isDefault: boolean
  drilldownHref: string
  createdBy: string
  updatedBy: string
  updatedAt: string
}

type DashboardKpiManagerScope = {
  divisionName: string
  subdivisionName: string
  planningLevel: string
  canManage: boolean
}

type Feedback = {
  tone: 'success' | 'error'
  message: string
}

function buildMetricKey(dashboardKey: string, templateKey: string, metricLabel: string) {
  const normalizedLabel = metricLabel
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  const labelPart = normalizedLabel || 'CUSTOM'
  return `${dashboardKey}_${templateKey}_${labelPart}`.slice(0, 80)
}

export function DashboardKpiManagerPanel({
  reviewDbReady,
  managerScope,
  initialDefinitions,
}: {
  reviewDbReady: boolean
  managerScope: DashboardKpiManagerScope
  initialDefinitions: DashboardKpiDefinition[]
}) {
  const router = useRouter()
  const divisionOptions = useMemo(() => getDashboardKpiDivisionOptions(), [])
  const initialDivision = initialDefinitions[0]?.divisionName || managerScope.divisionName || divisionOptions[0] || 'Pemasaran dan Pelayanan'
  const initialSubdivision =
    initialDefinitions[0]?.subdivisionName ||
    managerScope.subdivisionName ||
    getDashboardKpiSubdivisionOptions(initialDivision)[0] ||
    'Penjualan'

  const [selectedDivision, setSelectedDivision] = useState(initialDivision)
  const [selectedSubdivision, setSelectedSubdivision] = useState(initialSubdivision)
  const [definitions, setDefinitions] = useState(initialDefinitions)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [metricLabel, setMetricLabel] = useState('')
  const [metricType, setMetricType] = useState<'COUNT' | 'SUM' | 'PERCENTAGE'>('COUNT')
  const [dashboardKey, setDashboardKey] = useState<string>('SALES')
  const [templateKey, setTemplateKey] = useState<string>(DASHBOARD_KPI_TEMPLATE_OPTIONS[0]?.key ?? 'SALES_ACTIVE_LEADS')
  const [displayOrder, setDisplayOrder] = useState('0')
  const [drilldownHref, setDrilldownHref] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [editOrder, setEditOrder] = useState('0')
  const [editHref, setEditHref] = useState('')
  const [editActive, setEditActive] = useState(true)

  const subdivisionOptions = useMemo(
    () => getDashboardKpiSubdivisionOptions(selectedDivision),
    [selectedDivision],
  )

  const isSuperAdmin = managerScope.planningLevel === 'SUPER_ADMIN'
  const canManage = managerScope.canManage && reviewDbReady
  const scopeLocked = !isSuperAdmin

  useEffect(() => {
    if (!subdivisionOptions.includes(selectedSubdivision)) {
      setSelectedSubdivision(subdivisionOptions[0] ?? '')
    }
  }, [selectedSubdivision, subdivisionOptions])

  useEffect(() => {
    const suggestedHref = resolveDashboardKpiTemplateDrilldown(templateKey)
    setDrilldownHref((current) => {
      if (!current.trim()) {
        return suggestedHref
      }
      return current
    })
    setMetricType((current) => {
      const suggestedType = resolveDashboardKpiTemplateMetricType(templateKey)
      if (current === 'COUNT' || current === 'SUM' || current === 'PERCENTAGE') {
        return suggestedType
      }
      return current
    })
  }, [templateKey])

  async function loadDefinitions(nextDivision: string, nextSubdivision: string) {
    if (!reviewDbReady) return

    setLoading(true)
    try {
      const search = new URLSearchParams({
        divisionName: nextDivision,
        subdivisionName: nextSubdivision,
      })
      const response = await fetch(`/api/dashboard/kpi-definitions?${search.toString()}`)
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; definitions?: DashboardKpiDefinition[] }
        | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Daftar KPI custom gagal dimuat.',
        })
        return
      }

      setDefinitions(payload?.definitions ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function handleScopeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await loadDefinitions(selectedDivision, selectedSubdivision)
    if (isSuperAdmin) {
      const params = new URLSearchParams(window.location.search)
      params.set('kpiDivisionName', selectedDivision)
      params.set('kpiSubdivisionName', selectedSubdivision)
      router.push(`?${params.toString()}`)
      router.refresh()
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canManage) return

    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch('/api/dashboard/kpi-definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          divisionName: selectedDivision,
          subdivisionName: selectedSubdivision,
          dashboardKey,
          metricKey: buildMetricKey(dashboardKey, templateKey, metricLabel),
          metricLabel,
          metricType,
          templateKey,
          displayOrder: Number(displayOrder || '0'),
          drilldownHref,
        }),
      })

      const payload = (await response.json().catch(() => null)) as
        | { message?: string; definition?: DashboardKpiDefinition }
        | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'KPI custom gagal dibuat.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'KPI custom berhasil dibuat.',
      })
      setMetricLabel('')
      setDisplayOrder('0')
      setDrilldownHref(resolveDashboardKpiTemplateDrilldown(templateKey))
      setMetricType(resolveDashboardKpiTemplateMetricType(templateKey))
      await loadDefinitions(selectedDivision, selectedSubdivision)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(definition: DashboardKpiDefinition) {
    setEditingId(definition.id)
    setEditLabel(definition.metricLabel)
    setEditOrder(String(definition.displayOrder))
    setEditHref(definition.drilldownHref)
    setEditActive(definition.isActive)
  }

  async function handleUpdate(id: string) {
    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch(`/api/dashboard/kpi-definitions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          divisionName: selectedDivision,
          subdivisionName: selectedSubdivision,
          metricLabel: editLabel,
          displayOrder: Number(editOrder || '0'),
          isActive: editActive,
          drilldownHref: editHref,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'KPI custom gagal diperbarui.',
        })
        return
      }

      setEditingId(null)
      setFeedback({
        tone: 'success',
        message: payload?.message || 'KPI custom berhasil diperbarui.',
      })
      await loadDefinitions(selectedDivision, selectedSubdivision)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Hapus KPI custom ini?')) {
      return
    }

    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch(`/api/dashboard/kpi-definitions/${id}`, { method: 'DELETE' })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'KPI custom gagal dihapus.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'KPI custom berhasil dihapus.',
      })
      await loadDefinitions(selectedDivision, selectedSubdivision)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">Kelola KPI</p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">KPI custom per divisi dan sub-divisi</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">
            Manager divisi dapat menambah, mengubah, menonaktifkan, dan menghapus definisi KPI custom untuk scope
            organisasinya masing-masing.
          </p>
        </div>
        <span className={`badge ${canManage ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
          {canManage ? 'Manager KPI Aktif' : 'Read Only'}
        </span>
      </div>

      <form onSubmit={handleScopeSubmit} className="mt-5 grid gap-3 rounded-2xl border border-line bg-slate-50 p-4 lg:grid-cols-4">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Divisi</span>
          <select
            value={selectedDivision}
            onChange={(event) => setSelectedDivision(event.target.value)}
            disabled={scopeLocked || loading || submitting}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          >
            {divisionOptions.map((division) => (
              <option key={division} value={division}>
                {division}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Sub-divisi</span>
          <select
            value={selectedSubdivision}
            onChange={(event) => setSelectedSubdivision(event.target.value)}
            disabled={scopeLocked || loading || submitting}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          >
            {subdivisionOptions.map((subdivision) => (
              <option key={subdivision} value={subdivision}>
                {subdivision}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-950">Hak akses</p>
          <p className="mt-1">{managerScope.planningLevel || 'VIEWER'}</p>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!reviewDbReady || loading || submitting}
            className="w-full rounded-2xl border border-slate-950 bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-300"
          >
            {loading ? 'Memuat...' : 'Muat KPI Scope'}
          </button>
        </div>
      </form>

      {!reviewDbReady ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Mode review database belum aktif, jadi kelola KPI custom belum bisa dipakai.
        </div>
      ) : null}

      {feedback ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      <form onSubmit={handleCreate} className="mt-6 grid gap-3 rounded-2xl border border-line bg-slate-50 p-4 lg:grid-cols-3">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Label KPI</span>
          <input
            value={metricLabel}
            onChange={(event) => setMetricLabel(event.target.value)}
            disabled={!canManage || submitting}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: Promise to Pay Hari Ini"
            required
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Sub-divisi KPI</span>
          <select
            value={dashboardKey}
            onChange={(event) => setDashboardKey(event.target.value)}
            disabled={!canManage || submitting}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          >
            {DASHBOARD_KPI_KEYS.map((item) => (
              <option key={item} value={item}>
                {DASHBOARD_KPI_KEY_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Template KPI</span>
          <select
            value={templateKey}
            onChange={(event) => setTemplateKey(event.target.value)}
            disabled={!canManage || submitting}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          >
            {DASHBOARD_KPI_TEMPLATE_OPTIONS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Tipe</span>
          <select
            value={metricType}
            onChange={(event) => setMetricType(event.target.value as 'COUNT' | 'SUM' | 'PERCENTAGE')}
            disabled={!canManage || submitting}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          >
            {DASHBOARD_KPI_METRIC_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Urutan</span>
          <input
            type="number"
            min="0"
            value={displayOrder}
            onChange={(event) => setDisplayOrder(event.target.value)}
            disabled={!canManage || submitting}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Drilldown</span>
          <input
            value={drilldownHref}
            onChange={(event) => setDrilldownHref(event.target.value)}
            disabled={!canManage || submitting}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="/billing?focus=OVERDUE_INVOICES"
          />
        </label>
        <div className="lg:col-span-3 flex items-center justify-between gap-3">
          <p className="text-sm text-mute">
            KPI custom disimpan per scope `{selectedDivision} / {selectedSubdivision}`.
          </p>
          <button
            type="submit"
            disabled={!canManage || submitting}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Tambah KPI'}
          </button>
        </div>
      </form>

      <div className="mt-6 space-y-3">
        {definitions.length ? (
          definitions.map((definition) => (
            <article key={definition.id} className="rounded-2xl border border-line bg-slate-50 p-4">
              {editingId === definition.id ? (
                <div className="grid gap-3 lg:grid-cols-4">
                  <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
                    <span className="font-semibold text-slate-950">Label KPI</span>
                    <input
                      value={editLabel}
                      onChange={(event) => setEditLabel(event.target.value)}
                      className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-700">
                    <span className="font-semibold text-slate-950">Urutan</span>
                    <input
                      type="number"
                      min="0"
                      value={editOrder}
                      onChange={(event) => setEditOrder(event.target.value)}
                      className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-700">
                    <span className="font-semibold text-slate-950">Aktif</span>
                    <select
                      value={editActive ? '1' : '0'}
                      onChange={(event) => setEditActive(event.target.value === '1')}
                      className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                    >
                      <option value="1">Aktif</option>
                      <option value="0">Nonaktif</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-3">
                    <span className="font-semibold text-slate-950">Drilldown</span>
                    <input
                      value={editHref}
                      onChange={(event) => setEditHref(event.target.value)}
                      className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                    />
                  </label>
                  <div className="flex items-end justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate(definition.id)}
                      disabled={submitting}
                      className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
                    >
                      Simpan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold text-slate-950">{definition.metricLabel}</span>
                      <span className="badge border-slate-200 bg-white text-slate-600">
                        {DASHBOARD_KPI_KEY_LABELS[definition.dashboardKey as keyof typeof DASHBOARD_KPI_KEY_LABELS] ??
                          definition.dashboardKey}
                      </span>
                      <span className={`badge ${definition.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                        {definition.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-mute">
                      Template: {definition.templateKey} | Tipe: {definition.metricType} | Urutan: {definition.displayOrder}
                    </p>
                    <p className="mt-1 text-sm text-mute">
                      Scope: {definition.divisionName} / {definition.subdivisionName}
                    </p>
                    {definition.drilldownHref ? (
                      <p className="mt-1 text-sm text-mute">Drilldown: {definition.drilldownHref}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(definition)}
                      disabled={!canManage || submitting}
                      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      Edit
                    </button>
                    {!definition.isDefault ? (
                      <button
                        type="button"
                        onClick={() => handleDelete(definition.id)}
                        disabled={!canManage || submitting}
                        className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Hapus
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-950">Belum ada KPI custom pada scope ini</p>
            <p className="mt-2 text-sm leading-6 text-mute">
              Tambahkan KPI custom pertama untuk {selectedDivision} / {selectedSubdivision} dari form di atas.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
