'use client'

import type { FormEvent, ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AppRole } from '@/lib/types'
import type {
  DigitalAnalyticsEntry,
  DigitalAnalyticsSummary,
  DigitalCampaign,
  DigitalContentItem,
  DigitalLead,
} from '@/lib/services/digital-creator-service'
import {
  CAMPAIGN_STATUSES,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  DIGITAL_LEAD_STATUSES,
  DIGITAL_PLATFORMS,
  DIGITAL_SOURCES,
} from '@/lib/services/digital-creator-constants'

type SimpleOption = {
  id: number
  name: string
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function toLocalDateTimeInput(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function toLocalDateInput(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const offsetMs = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10)
}

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="section-title">{eyebrow}</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-mute">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
    </section>
  )
}

function FiltersShell({ children }: { children: ReactNode }) {
  return <section className="panel p-6">{children}</section>
}

function FeedbackBanner({
  feedback,
}: {
  feedback: { tone: 'success' | 'error'; message: string } | null
}) {
  if (!feedback) return null
  return (
    <div
      className={classNames(
        'rounded-2xl border px-4 py-3 text-sm',
        feedback.tone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-rose-200 bg-rose-50 text-rose-700',
      )}
    >
      {feedback.message}
    </div>
  )
}

function MutateNotice({ role, allowed }: { role: AppRole; allowed: boolean }) {
  if (allowed) return null
  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
      Role aktif `{role}` hanya membaca modul ini tanpa tambah, edit, atau hapus.
    </div>
  )
}

function ModalShell({
  title,
  description,
  open,
  onClose,
  children,
}: {
  title: string
  description: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl rounded-3xl border border-line bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h3 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-mute">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
          >
            Tutup
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </div>
  )
}

export function CampaignManager({ role }: { role: AppRole }) {
  const canMutate = role === 'SUPER_ADMIN' || role === 'DIGITAL_CREATOR'
  const [campaigns, setCampaigns] = useState<DigitalCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DigitalCampaign | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: '',
    status: 'ACTIVE',
    objectives: '',
    platforms: [] as string[],
  })

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      const response = await fetch(`/api/sales/campaigns?${params.toString()}`, { cache: 'no-store' })
      const payload = (await response.json().catch(() => [])) as DigitalCampaign[] | { message?: string }
      if (!response.ok) {
        throw new Error(
          typeof payload === 'object' && !Array.isArray(payload)
            ? payload.message || 'Campaign gagal dimuat.'
            : 'Campaign gagal dimuat.',
        )
      }
      setCampaigns(Array.isArray(payload) ? payload : [])
    } catch (error) {
      setCampaigns([])
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Campaign gagal dimuat.',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void fetchCampaigns()
  }, [fetchCampaigns])

  const filteredCampaigns = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return campaigns
    return campaigns.filter((item) =>
      [item.name, item.description ?? '', item.status, item.platforms.join(' '), item.objectives.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [campaigns, search])

  function resetForm() {
    setEditingItem(null)
    setFormData({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      budget: '',
      status: 'ACTIVE',
      objectives: '',
      platforms: [],
    })
  }

  function openEdit(item: DigitalCampaign) {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description ?? '',
      startDate: toLocalDateTimeInput(item.startDate),
      endDate: toLocalDateTimeInput(item.endDate),
      budget: item.budget == null ? '' : String(item.budget),
      status: item.status,
      objectives: item.objectives.join('\n'),
      platforms: item.platforms,
    })
    setIsModalOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canMutate) return

    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch(
        editingItem ? `/api/sales/campaigns/${editingItem.id}` : '/api/sales/campaigns',
        {
          method: editingItem ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            objectives: formData.objectives.split('\n').map((item) => item.trim()).filter(Boolean),
            platforms: formData.platforms,
          }),
        },
      )
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        throw new Error(payload?.message || 'Campaign gagal disimpan.')
      }
      setFeedback({
        tone: 'success',
        message: payload?.message || 'Campaign berhasil disimpan.',
      })
      setIsModalOpen(false)
      resetForm()
      await fetchCampaigns()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Campaign gagal disimpan.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!canMutate || !window.confirm('Hapus campaign ini?')) return
    try {
      const response = await fetch(`/api/sales/campaigns/${id}`, { method: 'DELETE' })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) throw new Error(payload?.message || 'Campaign gagal dihapus.')
      setFeedback({
        tone: 'success',
        message: payload?.message || 'Campaign berhasil dihapus.',
      })
      await fetchCampaigns()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Campaign gagal dihapus.',
      })
    }
  }

  function togglePlatform(platform: string) {
    setFormData((previous) => ({
      ...previous,
      platforms: previous.platforms.includes(platform)
        ? previous.platforms.filter((item) => item !== platform)
        : [...previous.platforms, platform],
    }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Digital Creator"
        title="Campaign"
        description="Salin alur baseline untuk perencanaan campaign digital: objective, budget, status, platform, dan periode aktif."
        actions={
          canMutate ? (
            <button
              type="button"
              onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Tambah Campaign
            </button>
          ) : null
        }
      />

      <FiltersShell>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Cari Campaign</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama, objective, platform, atau deskripsi"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="ALL">Semua Status</option>
              {CAMPAIGN_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 space-y-4">
          <MutateNotice role={role} allowed={canMutate} />
          <FeedbackBanner feedback={feedback} />
        </div>
      </FiltersShell>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total Campaign" value={String(filteredCampaigns.length)} />
        <SummaryCard
          label="Active"
          value={String(filteredCampaigns.filter((item) => item.status === 'ACTIVE').length)}
        />
        <SummaryCard
          label="Budget Tercatat"
          value={`Rp ${filteredCampaigns.reduce((sum, item) => sum + Number(item.budget ?? 0), 0).toLocaleString('id-ID')}`}
        />
      </section>

      <section className="panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Campaign</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Periode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Objective</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Budget</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Memuat campaign...
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada campaign digital.
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-slate-950">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.description || '-'}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        Dibuat {item.createdBy.name} pada {formatDateTime(item.createdAt)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {formatDate(item.startDate)}
                      <br />
                      s/d {formatDate(item.endDate)}
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-700">{item.platforms.join(', ') || '-'}</td>
                    <td className="px-4 py-4 text-xs text-slate-700">{item.objectives.join('; ') || '-'}</td>
                    <td className="px-4 py-4 text-xs font-semibold text-slate-700">{item.status}</td>
                    <td className="px-4 py-4 text-right text-xs text-slate-700">
                      Rp {Number(item.budget ?? 0).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {canMutate ? (
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">read only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ModalShell
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Campaign' : 'Tambah Campaign'}
        description="Catat objective, budget, periode, dan platform campaign agar funnel digital punya sumber data yang jelas."
      >
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Nama Campaign</span>
            <input
              required
              value={formData.name}
              onChange={(event) => setFormData((previous) => ({ ...previous, name: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Deskripsi</span>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(event) => setFormData((previous) => ({ ...previous, description: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Tanggal Mulai</span>
            <input
              required
              type="datetime-local"
              value={formData.startDate}
              onChange={(event) => setFormData((previous) => ({ ...previous, startDate: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Tanggal Selesai</span>
            <input
              type="datetime-local"
              value={formData.endDate}
              onChange={(event) => setFormData((previous) => ({ ...previous, endDate: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Budget</span>
            <input
              type="number"
              value={formData.budget}
              onChange={(event) => setFormData((previous) => ({ ...previous, budget: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Status</span>
            <select
              value={formData.status}
              onChange={(event) => setFormData((previous) => ({ ...previous, status: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              {CAMPAIGN_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Tujuan Campaign</span>
            <textarea
              rows={4}
              value={formData.objectives}
              onChange={(event) => setFormData((previous) => ({ ...previous, objectives: event.target.value }))}
              placeholder={'Satu tujuan per baris\nContoh: tambah awareness\nContoh: raih 100 leads'}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Platform</span>
            <div className="flex flex-wrap gap-2">
              {DIGITAL_PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  onClick={() => togglePlatform(platform)}
                  className={classNames(
                    'rounded-full border px-4 py-2 text-sm font-semibold transition',
                    formData.platforms.includes(platform)
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-line bg-white text-slate-700',
                  )}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 lg:col-span-2">
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
              {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Campaign'}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  )
}

export function DigitalLeadManager({
  role,
  campaignOptions,
  salesLeadOptions,
}: {
  role: AppRole
  campaignOptions: SimpleOption[]
  salesLeadOptions: SimpleOption[]
}) {
  const canCreateOrUpdate = role === 'SUPER_ADMIN' || role === 'DIGITAL_CREATOR' || role === 'SALES_MARKETING'
  const canDelete = role === 'SUPER_ADMIN' || role === 'DIGITAL_CREATOR'
  const [items, setItems] = useState<DigitalLead[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DigitalLead | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sourceFilter, setSourceFilter] = useState('ALL')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    source: 'INSTAGRAM',
    campaignId: '',
    message: '',
    status: 'NEW',
    notes: '',
    convertedSalesLeadId: '',
  })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (sourceFilter !== 'ALL') params.set('source', sourceFilter)
      const response = await fetch(`/api/sales/digital-leads?${params.toString()}`, { cache: 'no-store' })
      const payload = (await response.json().catch(() => [])) as DigitalLead[] | { message?: string }
      if (!response.ok) {
        throw new Error(
          typeof payload === 'object' && !Array.isArray(payload)
            ? payload.message || 'Digital lead gagal dimuat.'
            : 'Digital lead gagal dimuat.',
        )
      }
      setItems(Array.isArray(payload) ? payload : [])
    } catch (error) {
      setItems([])
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Digital lead gagal dimuat.',
      })
    } finally {
      setLoading(false)
    }
  }, [sourceFilter, statusFilter])

  useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) =>
      [
        item.name,
        item.phone,
        item.email ?? '',
        item.source,
        item.message ?? '',
        item.notes ?? '',
        item.campaign?.name ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [items, search])

  function resetForm() {
    setEditingItem(null)
    setFormData({
      name: '',
      phone: '',
      email: '',
      source: 'INSTAGRAM',
      campaignId: '',
      message: '',
      status: 'NEW',
      notes: '',
      convertedSalesLeadId: '',
    })
  }

  function openEdit(item: DigitalLead) {
    setEditingItem(item)
    setFormData({
      name: item.name,
      phone: item.phone,
      email: item.email ?? '',
      source: item.source,
      campaignId: item.campaignId ? String(item.campaignId) : '',
      message: item.message ?? '',
      status: item.status,
      notes: item.notes ?? '',
      convertedSalesLeadId: item.convertedSalesLeadId ? String(item.convertedSalesLeadId) : '',
    })
    setIsModalOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canCreateOrUpdate) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch(
        editingItem ? `/api/sales/digital-leads/${editingItem.id}` : '/api/sales/digital-leads',
        {
          method: editingItem ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        },
      )
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) throw new Error(payload?.message || 'Digital lead gagal disimpan.')
      setFeedback({
        tone: 'success',
        message: payload?.message || 'Digital lead berhasil disimpan.',
      })
      setIsModalOpen(false)
      resetForm()
      await fetchItems()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Digital lead gagal disimpan.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!canDelete || !window.confirm('Hapus digital lead ini?')) return
    try {
      const response = await fetch(`/api/sales/digital-leads/${id}`, { method: 'DELETE' })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) throw new Error(payload?.message || 'Digital lead gagal dihapus.')
      setFeedback({
        tone: 'success',
        message: payload?.message || 'Digital lead berhasil dihapus.',
      })
      await fetchItems()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Digital lead gagal dihapus.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Digital Creator"
        title="Digital Leads"
        description="Database prospek dari channel digital yang bisa dikaitkan ke campaign dan diteruskan ke lead penjualan saat sudah qualified."
        actions={
          canCreateOrUpdate ? (
            <button
              type="button"
              onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Tambah Lead
            </button>
          ) : null
        }
      />

      <FiltersShell>
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Cari Lead</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nama, phone, email, campaign, pesan"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="ALL">Semua Status</option>
              {DIGITAL_LEAD_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Sumber</span>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="ALL">Semua Sumber</option>
              {DIGITAL_SOURCES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 space-y-4">
          <MutateNotice role={role} allowed={canCreateOrUpdate || canDelete} />
          <FeedbackBanner feedback={feedback} />
        </div>
      </FiltersShell>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Total Lead" value={String(filteredItems.length)} />
        <SummaryCard label="New" value={String(filteredItems.filter((item) => item.status === 'NEW').length)} />
        <SummaryCard
          label="Qualified"
          value={String(filteredItems.filter((item) => item.status === 'QUALIFIED').length)}
        />
        <SummaryCard
          label="Converted"
          value={String(filteredItems.filter((item) => item.status === 'CONVERTED').length)}
        />
      </section>

      <section className="grid gap-4">
        {loading ? (
          <div className="panel p-8 text-center text-sm text-slate-500">Memuat digital lead...</div>
        ) : filteredItems.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-slate-500">Belum ada digital lead.</div>
        ) : (
          filteredItems.map((item) => (
            <article key={item.id} className="panel p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight text-slate-950">{item.name}</h3>
                    <span className="badge border-slate-200 bg-white text-slate-600">{item.source}</span>
                    <span className="badge border-slate-200 bg-white text-slate-600">{item.status}</span>
                    {item.campaign ? (
                      <span className="badge border-slate-200 bg-white text-slate-600">
                        Campaign: {item.campaign.name}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-slate-700">
                    {item.phone}
                    {item.email ? ` | ${item.email}` : ''}
                  </p>
                  <p className="text-sm text-slate-600">{item.message || '-'}</p>
                  <p className="text-xs italic text-slate-500">Catatan: {item.notes || '-'}</p>
                  {item.convertedSalesLead ? (
                    <p className="text-xs font-semibold text-emerald-700">
                      Sudah dikaitkan ke lead penjualan: {item.convertedSalesLead.name}
                    </p>
                  ) : null}
                  <p className="text-xs text-slate-400">
                    Dibuat {item.createdBy.name} pada {formatDateTime(item.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {canCreateOrUpdate ? (
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      Edit
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600"
                    >
                      Hapus
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <ModalShell
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Digital Lead' : 'Tambah Digital Lead'}
        description="Prospek digital bisa dikaitkan ke campaign tertentu dan disambungkan ke lead penjualan saat masuk tahap closing."
      >
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Nama</span>
            <input
              required
              value={formData.name}
              onChange={(event) => setFormData((previous) => ({ ...previous, name: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">No. Telepon</span>
            <input
              required
              value={formData.phone}
              onChange={(event) => setFormData((previous) => ({ ...previous, phone: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Email</span>
            <input
              type="email"
              value={formData.email}
              onChange={(event) => setFormData((previous) => ({ ...previous, email: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Sumber</span>
            <select
              value={formData.source}
              onChange={(event) => setFormData((previous) => ({ ...previous, source: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              {DIGITAL_SOURCES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Campaign</span>
            <select
              value={formData.campaignId}
              onChange={(event) => setFormData((previous) => ({ ...previous, campaignId: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="">- Tanpa Campaign -</option>
              {campaignOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Status</span>
            <select
              value={formData.status}
              onChange={(event) => setFormData((previous) => ({ ...previous, status: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              {DIGITAL_LEAD_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Pesan</span>
            <textarea
              rows={3}
              value={formData.message}
              onChange={(event) => setFormData((previous) => ({ ...previous, message: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Catatan</span>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(event) => setFormData((previous) => ({ ...previous, notes: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Konversi ke Lead Penjualan</span>
            <select
              value={formData.convertedSalesLeadId}
              onChange={(event) =>
                setFormData((previous) => ({ ...previous, convertedSalesLeadId: event.target.value }))
              }
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="">- Belum dikonversi -</option>
              {salesLeadOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end gap-3 lg:col-span-2">
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
              {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Lead'}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  )
}

export function ContentCalendarManager({ role }: { role: AppRole }) {
  const canMutate = role === 'SUPER_ADMIN' || role === 'DIGITAL_CREATOR'
  const [items, setItems] = useState<DigitalContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DigitalContentItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [platformFilter, setPlatformFilter] = useState('ALL')
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    contentType: 'POST',
    platform: 'INSTAGRAM',
    status: 'DRAFT',
    publishDate: '',
    notes: '',
    tags: '',
  })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (platformFilter !== 'ALL') params.set('platform', platformFilter)
      const response = await fetch(`/api/sales/content-calendar?${params.toString()}`, { cache: 'no-store' })
      const payload = (await response.json().catch(() => [])) as DigitalContentItem[] | { message?: string }
      if (!response.ok) {
        throw new Error(
          typeof payload === 'object' && !Array.isArray(payload)
            ? payload.message || 'Content calendar gagal dimuat.'
            : 'Content calendar gagal dimuat.',
        )
      }
      setItems(Array.isArray(payload) ? payload : [])
    } catch (error) {
      setItems([])
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Content calendar gagal dimuat.',
      })
    } finally {
      setLoading(false)
    }
  }, [platformFilter, statusFilter])

  useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return items
    return items.filter((item) =>
      [item.title, item.content ?? '', item.platform, item.status, item.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [items, search])

  function resetForm() {
    setEditingItem(null)
    setFormData({
      title: '',
      content: '',
      contentType: 'POST',
      platform: 'INSTAGRAM',
      status: 'DRAFT',
      publishDate: '',
      notes: '',
      tags: '',
    })
  }

  function openEdit(item: DigitalContentItem) {
    setEditingItem(item)
    setFormData({
      title: item.title,
      content: item.content ?? '',
      contentType: item.contentType,
      platform: item.platform,
      status: item.status,
      publishDate: toLocalDateTimeInput(item.publishDate),
      notes: item.notes ?? '',
      tags: item.tags.join(', '),
    })
    setIsModalOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canMutate) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch(
        editingItem ? `/api/sales/content-calendar/${editingItem.id}` : '/api/sales/content-calendar',
        {
          method: editingItem ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            tags: formData.tags.split(',').map((item) => item.trim()).filter(Boolean),
          }),
        },
      )
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) throw new Error(payload?.message || 'Konten gagal disimpan.')
      setFeedback({
        tone: 'success',
        message: payload?.message || 'Konten berhasil disimpan.',
      })
      setIsModalOpen(false)
      resetForm()
      await fetchItems()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Konten gagal disimpan.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!canMutate || !window.confirm('Hapus konten ini?')) return
    try {
      const response = await fetch(`/api/sales/content-calendar/${id}`, { method: 'DELETE' })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) throw new Error(payload?.message || 'Konten gagal dihapus.')
      setFeedback({
        tone: 'success',
        message: payload?.message || 'Konten berhasil dihapus.',
      })
      await fetchItems()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Konten gagal dihapus.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Digital Creator"
        title="Content Calendar"
        description="Kelola ritme produksi konten, publish date, status, platform, dan tag agar alur creator digital tetap terstruktur."
        actions={
          canMutate ? (
            <button
              type="button"
              onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Tambah Konten
            </button>
          ) : null
        }
      />

      <FiltersShell>
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Cari Konten</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Judul, isi, tag, atau platform"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="ALL">Semua Status</option>
              {CONTENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Platform</span>
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value)}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="ALL">Semua Platform</option>
              {DIGITAL_PLATFORMS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 space-y-4">
          <MutateNotice role={role} allowed={canMutate} />
          <FeedbackBanner feedback={feedback} />
        </div>
      </FiltersShell>

      <section className="panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[940px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Judul</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tipe</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Publish</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Memuat content calendar...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada konten digital.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{item.content || '-'}</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-700">{item.contentType}</td>
                    <td className="px-4 py-4 text-xs text-slate-700">{item.platform}</td>
                    <td className="px-4 py-4 text-xs font-semibold text-slate-700">{item.status}</td>
                    <td className="px-4 py-4 text-xs text-slate-700">{formatDateTime(item.publishDate)}</td>
                    <td className="px-4 py-4 text-xs text-slate-700">{item.tags.join(', ') || '-'}</td>
                    <td className="px-4 py-4 text-center">
                      {canMutate ? (
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">read only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ModalShell
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Konten' : 'Tambah Konten'}
        description="Satu entri kalender mewakili satu unit produksi konten lengkap dengan platform, status, jadwal publish, dan tag distribusi."
      >
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Judul</span>
            <input
              required
              value={formData.title}
              onChange={(event) => setFormData((previous) => ({ ...previous, title: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Tipe Konten</span>
            <select
              value={formData.contentType}
              onChange={(event) => setFormData((previous) => ({ ...previous, contentType: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              {CONTENT_TYPES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Platform</span>
            <select
              value={formData.platform}
              onChange={(event) => setFormData((previous) => ({ ...previous, platform: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              {DIGITAL_PLATFORMS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Isi Konten</span>
            <textarea
              rows={4}
              value={formData.content}
              onChange={(event) => setFormData((previous) => ({ ...previous, content: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Status</span>
            <select
              value={formData.status}
              onChange={(event) => setFormData((previous) => ({ ...previous, status: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              {CONTENT_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Tanggal Publish</span>
            <input
              type="datetime-local"
              value={formData.publishDate}
              onChange={(event) => setFormData((previous) => ({ ...previous, publishDate: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Tags</span>
            <input
              value={formData.tags}
              onChange={(event) => setFormData((previous) => ({ ...previous, tags: event.target.value }))}
              placeholder="Pisahkan dengan koma, contoh: promo, psb, meta"
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">Catatan</span>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(event) => setFormData((previous) => ({ ...previous, notes: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          <div className="flex justify-end gap-3 lg:col-span-2">
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
              {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Konten'}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  )
}

export function ContentAnalyticsManager({
  role,
  campaignOptions,
  contentOptions,
}: {
  role: AppRole
  campaignOptions: SimpleOption[]
  contentOptions: SimpleOption[]
}) {
  const canMutate = role === 'SUPER_ADMIN' || role === 'DIGITAL_CREATOR'
  const [items, setItems] = useState<DigitalAnalyticsEntry[]>([])
  const [summary, setSummary] = useState<DigitalAnalyticsSummary>({
    reach: 0,
    impressions: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    clicks: 0,
    followersGain: 0,
  })
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<DigitalAnalyticsEntry | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const [platformFilter, setPlatformFilter] = useState('ALL')
  const [formData, setFormData] = useState({
    contentId: '',
    campaignId: '',
    platform: 'INSTAGRAM',
    date: '',
    reach: '',
    impressions: '',
    likes: '',
    comments: '',
    shares: '',
    saves: '',
    clicks: '',
    followersGain: '',
  })

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (platformFilter !== 'ALL') params.set('platform', platformFilter)
      const response = await fetch(`/api/sales/content-analytics?${params.toString()}`, { cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as
        | { analytics?: DigitalAnalyticsEntry[]; summary?: DigitalAnalyticsSummary; message?: string }
        | null
      if (!response.ok) {
        throw new Error(payload?.message || 'Analytics gagal dimuat.')
      }
      setItems(payload?.analytics ?? [])
      setSummary(
        payload?.summary ?? {
          reach: 0,
          impressions: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          clicks: 0,
          followersGain: 0,
        },
      )
    } catch (error) {
      setItems([])
      setSummary({
        reach: 0,
        impressions: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        clicks: 0,
        followersGain: 0,
      })
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Analytics gagal dimuat.',
      })
    } finally {
      setLoading(false)
    }
  }, [platformFilter])

  useEffect(() => {
    void fetchItems()
  }, [fetchItems])

  function resetForm() {
    setEditingItem(null)
    setFormData({
      contentId: '',
      campaignId: '',
      platform: 'INSTAGRAM',
      date: '',
      reach: '',
      impressions: '',
      likes: '',
      comments: '',
      shares: '',
      saves: '',
      clicks: '',
      followersGain: '',
    })
  }

  function openEdit(item: DigitalAnalyticsEntry) {
    setEditingItem(item)
    setFormData({
      contentId: item.contentId ? String(item.contentId) : '',
      campaignId: item.campaignId ? String(item.campaignId) : '',
      platform: item.platform,
      date: toLocalDateInput(item.date),
      reach: String(item.reach),
      impressions: String(item.impressions),
      likes: String(item.likes),
      comments: String(item.comments),
      shares: String(item.shares),
      saves: String(item.saves),
      clicks: String(item.clicks),
      followersGain: String(item.followersGain),
    })
    setIsModalOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canMutate) return
    setSubmitting(true)
    setFeedback(null)
    try {
      const response = await fetch(
        editingItem ? `/api/sales/content-analytics/${editingItem.id}` : '/api/sales/content-analytics',
        {
          method: editingItem ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        },
      )
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) throw new Error(payload?.message || 'Analytics gagal disimpan.')
      setFeedback({
        tone: 'success',
        message: payload?.message || 'Analytics berhasil disimpan.',
      })
      setIsModalOpen(false)
      resetForm()
      await fetchItems()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Analytics gagal disimpan.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    if (!canMutate || !window.confirm('Hapus data analytics ini?')) return
    try {
      const response = await fetch(`/api/sales/content-analytics/${id}`, { method: 'DELETE' })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) throw new Error(payload?.message || 'Analytics gagal dihapus.')
      setFeedback({
        tone: 'success',
        message: payload?.message || 'Analytics berhasil dihapus.',
      })
      await fetchItems()
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Analytics gagal dihapus.',
      })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Digital Creator"
        title="Content Analytics"
        description="Ringkasan metrik performa konten dan campaign untuk review harian reach, engagement, click, serta pertumbuhan follower."
        actions={
          canMutate ? (
            <button
              type="button"
              onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Tambah Analytics
            </button>
          ) : null
        }
      />

      <FiltersShell>
        <div className="grid gap-4 lg:grid-cols-[0.8fr_1fr]">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Platform</span>
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value)}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="ALL">Semua Platform</option>
              {DIGITAL_PLATFORMS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 space-y-4">
          <MutateNotice role={role} allowed={canMutate} />
          <FeedbackBanner feedback={feedback} />
        </div>
      </FiltersShell>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Reach" value={summary.reach.toLocaleString('id-ID')} />
        <SummaryCard label="Impressions" value={summary.impressions.toLocaleString('id-ID')} />
        <SummaryCard label="Likes" value={summary.likes.toLocaleString('id-ID')} />
        <SummaryCard label="Comments" value={summary.comments.toLocaleString('id-ID')} />
        <SummaryCard label="Shares" value={summary.shares.toLocaleString('id-ID')} />
        <SummaryCard label="Saves" value={summary.saves.toLocaleString('id-ID')} />
        <SummaryCard label="Clicks" value={summary.clicks.toLocaleString('id-ID')} />
        <SummaryCard label="Follower Gain" value={summary.followersGain.toLocaleString('id-ID')} />
      </section>

      <section className="panel overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Konten / Campaign</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Reach</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Impressions</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Likes</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Comments</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Shares</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Clicks</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                    Memuat analytics...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada data analytics digital.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 text-xs text-slate-700">{formatDate(item.date)}</td>
                    <td className="px-4 py-4 text-xs text-slate-700">{item.platform}</td>
                    <td className="px-4 py-4 text-xs text-slate-700">
                      {item.content?.title || '-'}
                      <br />
                      <span className="text-slate-500">{item.campaign?.name || '-'}</span>
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-700">{item.reach.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 text-right text-xs text-slate-700">{item.impressions.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 text-right text-xs text-slate-700">{item.likes.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 text-right text-xs text-slate-700">{item.comments.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 text-right text-xs text-slate-700">{item.shares.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 text-right text-xs text-slate-700">{item.clicks.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 text-center">
                      {canMutate ? (
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600"
                          >
                            Hapus
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">read only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ModalShell
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Analytics' : 'Tambah Analytics'}
        description="Simpan metrik harian konten atau campaign agar Creator Digital punya bacaan performa yang konsisten."
      >
        <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Konten</span>
            <select
              value={formData.contentId}
              onChange={(event) => setFormData((previous) => ({ ...previous, contentId: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="">- Tanpa Konten -</option>
              {contentOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Campaign</span>
            <select
              value={formData.campaignId}
              onChange={(event) => setFormData((previous) => ({ ...previous, campaignId: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              <option value="">- Tanpa Campaign -</option>
              {campaignOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Platform</span>
            <select
              value={formData.platform}
              onChange={(event) => setFormData((previous) => ({ ...previous, platform: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            >
              {DIGITAL_PLATFORMS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-950">Tanggal</span>
            <input
              required
              type="date"
              value={formData.date}
              onChange={(event) => setFormData((previous) => ({ ...previous, date: event.target.value }))}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            />
          </label>
          {(
            [
              ['reach', 'Reach'],
              ['impressions', 'Impressions'],
              ['likes', 'Likes'],
              ['comments', 'Comments'],
              ['shares', 'Shares'],
              ['saves', 'Saves'],
              ['clicks', 'Clicks'],
              ['followersGain', 'Follower Gain'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">{label}</span>
              <input
                type="number"
                value={formData[key]}
                onChange={(event) => setFormData((previous) => ({ ...previous, [key]: event.target.value }))}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              />
            </label>
          ))}
          <div className="flex justify-end gap-3 lg:col-span-2">
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
              {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Tambah Analytics'}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  )
}
