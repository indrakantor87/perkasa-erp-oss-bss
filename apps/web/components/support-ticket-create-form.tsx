'use client'

import type { FormEvent } from 'react'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TechnicianUserPicker } from '@/components/technician-user-picker'
import { SupportFormContextNote } from '@/components/support-form-context-note'

type SupportTicketCreateFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  typeSuggestions: string[]
  serviceSuggestions: string[]
}

const categoryOptions = ['TT', 'PV'] as const
const statusOptions = ['OPEN', 'ON_PROGRESS'] as const
const fieldWorkTypeOptions = ['INSTALLATION', 'REPAIR', 'DISMANTLE', 'RELOCATION'] as const
const fieldWorkOrderStatusOptions = ['OPEN', 'SCHEDULED', 'ON_PROGRESS'] as const
const fieldJobCategoryOptions = ['TROUBLE', 'JOINTER', 'JALUR', 'EXPAN'] as const
const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

const parentTicketTypeOptions = [
  'KONEKSI',
  'LATENCY',
  'PREVENTIVE',
  'HARDWARE',
  'BILLING',
  'DISMANTLE',
  'JALUR',
  'PSB',
  'LAINNYA',
] as const

const jenisGangguanMap: Record<(typeof parentTicketTypeOptions)[number] | string, string[]> = {
  KONEKSI: ['TOTAL DOWN', 'INTERMITTENT', 'PACKET LOSS', 'SLOW SPEED', 'NO SYNC', 'SPLICE / KABEL', 'LAINNYA'],
  LATENCY: ['HIGH LATENCY', 'JITTER', 'LATENCY SPIKE', 'LAINNYA'],
  PREVENTIVE: ['PEMERIKSAAN RUTIN', 'CLEANING ODP', 'REKABET KABEL', 'LAINNYA'],
  HARDWARE: ['ONT MATI', 'ONT RUSAK', 'PORT ODP RUSAK', 'SFP RUSAK', 'ROUTER CPE', 'LAINNYA'],
  BILLING: ['TAGIHAN BELUM LUNAS', 'SUSPEND BILLING', 'KOMPLAIN TAGIHAN', 'LAINNYA'],
  DISMANTLE: ['PEMUTUSAN LAYANAN', 'PEMBONGKARAN ONT', 'PENGEMBALIAN PERANGKAT', 'LAINNYA'],
  JALUR: ['KABEL PUTUS', 'SPLICE RUSAK', 'ODP PENUH', 'REKABET JALUR', 'LAINNYA'],
  PSB: ['INSTALASI BARU', 'AKTIVASI LAYANAN', 'UJI COBA KUALITAS', 'LAINNYA'],
  LAINNYA: ['KOMPLAIN UMUM', 'REQUEST INFORMASI', 'LAINNYA'],
}

export function SupportTicketCreateForm({
  canCreate,
  reviewDbReady,
  typeSuggestions,
  serviceSuggestions,
}: SupportTicketCreateFormProps) {
  const router = useRouter()
  const [serviceReference, setServiceReference] = useState(serviceSuggestions[0] ?? '')
  const [customerName, setCustomerName] = useState('')
  const [customerUser, setCustomerUser] = useState('')
  const [category, setCategory] = useState<(typeof categoryOptions)[number]>('TT')
  const [status, setStatus] = useState<(typeof statusOptions)[number]>('OPEN')

  const [noWa, setNoWa] = useState('')
  const [linkMaps, setLinkMaps] = useState('')
  const [typeParent, setTypeParent] = useState<(typeof parentTicketTypeOptions)[number] | ''>('')
  const [paket, setPaket] = useState('')
  const [ont, setOnt] = useState('')
  const [jenisGangguan, setJenisGangguan] = useState('')

  const [createFieldWorkOrder, setCreateFieldWorkOrder] = useState(false)
  const [fieldWorkType, setFieldWorkType] = useState<(typeof fieldWorkTypeOptions)[number]>('REPAIR')
  const [workOrderStatus, setWorkOrderStatus] = useState<(typeof fieldWorkOrderStatusOptions)[number]>('OPEN')
  const [jobCategory, setJobCategory] = useState<(typeof fieldJobCategoryOptions)[number]>('TROUBLE')
  const [priority, setPriority] = useState<(typeof priorityOptions)[number]>('MEDIUM')
  const [currentPicRaw, setCurrentPicRaw] = useState('')
  const [currentPicUserId, setCurrentPicUserId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [address, setAddress] = useState('')
  const [keterangan, setKeterangan] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  const availableJenisGangguan = useMemo(() => {
    if (!typeParent) return [] as string[]
    return jenisGangguanMap[typeParent] ?? jenisGangguanMap.LAINNYA
  }, [typeParent])

  const ticketPreviewId = useMemo(() => {
    const seq = Math.floor(10 + Math.random() * 89)
    return `TT/PKN/${seq}`
  }, [])

  function handleTypeParentChange(next: string) {
    setTypeParent(next as (typeof parentTicketTypeOptions)[number] | '')
    setJenisGangguan('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    setSubmitting(true)
    setFeedback(null)

    try {
      const resolvedType = typeParent || typeSuggestions[0] || 'KONEKSI'
      const submitPayload: Record<string, unknown> = {
        serviceReference,
        customerName,
        customerUser,
        category,
        type: resolvedType,
        status,
        customerWhatsapp: noWa,
        linkMaps,
        packagePlan: paket,
        ontSerial: ont,
        typeParent,
        jenisGangguan,
        ticketSource: 'NOC_OPERATOR_MANUAL',
        notes: keterangan,
      }

      if (createFieldWorkOrder) {
        submitPayload.createFieldWorkOrder = true
        submitPayload.fieldWorkType = fieldWorkType
        submitPayload.workOrderStatus = workOrderStatus
        submitPayload.jobCategory = jobCategory
        submitPayload.priority = priority
        submitPayload.currentPicUserId = currentPicUserId
        submitPayload.scheduledAt = scheduledAt || null
        submitPayload.address = address
      }

      const response = await fetch('/api/support/trouble-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitPayload),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Trouble ticket review gagal disimpan ke review DB.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Trouble ticket review berhasil disimpan.',
      })
      setServiceReference(serviceSuggestions[0] ?? '')
      setCustomerName('')
      setCustomerUser('')
      setCategory('TT')
      setStatus('OPEN')
      setNoWa('')
      setLinkMaps('')
      setTypeParent('')
      setPaket('')
      setOnt('')
      setJenisGangguan('')
      setCreateFieldWorkOrder(false)
      setFieldWorkType('REPAIR')
      setWorkOrderStatus('OPEN')
      setJobCategory('TROUBLE')
      setPriority('MEDIUM')
      setCurrentPicRaw('')
      setCurrentPicUserId('')
      setScheduledAt('')
      setAddress('')
      setKeterangan('')
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="panel p-6">
      <p className="section-title">Form Action Support</p>
      <h3 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-slate-950">
        Buat Trouble Ticket
      </h3>
      <p className="mt-3 text-sm leading-6 text-mute">
        Isi data gangguan atau preventive secara singkat dan jelas.
        {!canCreate
          ? ' Role aktif belum memiliki izin create pada domain Support.'
          : !reviewDbReady
            ? ' Mode review database belum aktif, jadi write action support dinonaktifkan agar tidak menulis ke mock.'
            : ''}
      </p>
      <SupportFormContextNote
        items={[
          {
            label: 'Tujuan',
            value: 'Mencatat ticket baru agar masuk ke lane TT sebagai titik awal penanganan operasional NOC.',
          },
          {
            label: 'Sumber',
            value: 'Anchor layanan memakai Service No atau Customer Code, data pelanggan dilengkapi No WA / Link Maps lokasi.',
          },
          {
            label: 'Hasil',
            value: 'Ticket baru siap diteruskan ke progress, eskalasi, atau close setelah owner terpetakan.',
          },
        ]}
      />

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2 rounded-2xl border-2 border-slate-700 bg-slate-50 px-4 py-3 font-mono font-bold text-slate-800">
          ID Ticket otomatis: {ticketPreviewId}
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Service No / Customer Code</span>
          <input
            list="support-service-suggestions"
            value={serviceReference}
            onChange={(event) => setServiceReference(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="SVC-000123 / CUST-00045"
            required
            disabled={isDisabled}
          />
          <datalist id="support-service-suggestions">
            {serviceSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">KATEGORI</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as (typeof categoryOptions)[number])}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            <option value="TT">Trouble Ticket (TT)</option>
            <option value="PV">Preventive Visit (PV)</option>
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">NAMA PELANGGAN</span>
          <input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Nama pelanggan"
            required
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">USER</span>
          <input
            value={customerUser}
            onChange={(event) => setCustomerUser(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="user / email pelanggan"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">NO WA</span>
          <input
            type="tel"
            value={noWa}
            onChange={(event) => setNoWa(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="+62 812-3456-7890"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">LINK MAPS</span>
          <input
            type="url"
            value={linkMaps}
            onChange={(event) => setLinkMaps(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="https://maps.google.com/..."
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">TYPE</span>
          <select
            value={typeParent}
            onChange={(event) => handleTypeParentChange(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            <option value="">Pilih type...</option>
            {parentTicketTypeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">PAKET</span>
          <input
            value={paket}
            onChange={(event) => setPaket(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: HOME LITE / HOME MINI / GAMING"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">ONT</span>
          <input
            value={ont}
            onChange={(event) => setOnt(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Pilih ONT / Serial Number ONT"
            disabled={isDisabled}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">JENIS GANGGUAN</span>
          <select
            value={jenisGangguan}
            onChange={(event) => setJenisGangguan(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            disabled={isDisabled || !typeParent}
          >
            <option value="">{typeParent ? 'Pilih...' : 'Pilih type terlebih dahulu'}</option>
            {availableJenisGangguan.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">KETERANGAN</span>
          <textarea
            rows={6}
            value={keterangan}
            onChange={(event) => setKeterangan(event.target.value)}
            className="min-h-[160px] rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Deskripsikan gangguan secara singkat dan jelas: kronologi, gejala, waktu terjadi, tindakan sementara yang dilakukan..."
            disabled={isDisabled}
          />
        </label>

        <div className="lg:col-span-2 rounded-2xl border border-line bg-slate-50 px-4 py-3">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-950">Perlu kunjungan lapangan (buat WO)</span>
            <input
              type="checkbox"
              checked={createFieldWorkOrder}
              onChange={(event) => setCreateFieldWorkOrder(event.target.checked)}
              disabled={isDisabled}
              className="h-4 w-4"
            />
          </label>
          <p className="mt-2 text-sm leading-6 text-mute">
            Aktifkan bila ticket harus ditindak teknisi lapangan dan perlu tracking pekerjaan serta material.
          </p>
        </div>

        {createFieldWorkOrder ? (
          <>
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Tipe Work Order</span>
              <select
                value={fieldWorkType}
                onChange={(event) => setFieldWorkType(event.target.value as (typeof fieldWorkTypeOptions)[number])}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                disabled={isDisabled}
              >
                {fieldWorkTypeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Status WO</span>
              <select
                value={workOrderStatus}
                onChange={(event) => setWorkOrderStatus(event.target.value as (typeof fieldWorkOrderStatusOptions)[number])}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                disabled={isDisabled}
              >
                {fieldWorkOrderStatusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Kategori Kerja Lapangan</span>
              <select
                value={jobCategory}
                onChange={(event) => setJobCategory(event.target.value as (typeof fieldJobCategoryOptions)[number])}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                disabled={isDisabled}
              >
                {fieldJobCategoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Prioritas</span>
              <select
                value={priority}
                onChange={(event) => setPriority(event.target.value as (typeof priorityOptions)[number])}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                disabled={isDisabled}
              >
                {priorityOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <TechnicianUserPicker
              label="PIC Teknisi (Opsional)"
              value={currentPicRaw}
              onChange={({ raw, userId }) => {
                setCurrentPicRaw(raw)
                setCurrentPicUserId(userId)
              }}
              disabled={isDisabled}
            />

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Jadwal Lapangan (Opsional)</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                disabled={isDisabled}
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
              <span className="font-semibold text-slate-950">Alamat Lapangan (Opsional)</span>
              <textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="Alamat lokasi gangguan / lokasi kerja teknisi"
                disabled={isDisabled}
              />
            </label>
          </>
        ) : null}

        <div className="lg:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-mute">
            Anchor wajib memakai `Service No` / `Customer Code` untuk link subscription. Field V2 (No WA, Link Maps, Paket, ONT, Jenis Gangguan) disimpan aman ke notes dengan prefix `[TT V2 FIELDS]`.
          </div>
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </form>

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
    </section>
  )
}
