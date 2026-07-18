'use client'

import type { FormEvent } from 'react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { InventoryItemScanAssist } from '@/components/inventory-item-scan-assist'
import { extractInventoryItemCodeFromScan, findInventorySuggestionByCode } from '@/lib/inventory-barcode-utils'
import type {
  DeviceLifecycleHandoverProofType,
  DeviceLifecycleStatus,
} from '@/lib/services/device-lifecycle-service'

type DeviceLifecycleActionFormProps = {
  canCreate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  workOrderId?: number | null
  troubleTicketId?: number | null
  defaultLifecycleStatus?: DeviceLifecycleStatus
  defaultTargetTeam?: string
  defaultNotes?: string
  title?: string
  description?: string
  embedded?: boolean
}

const lifecycleStatusOptions: DeviceLifecycleStatus[] = [
  'INVENTORY',
  'NOC',
  'TEAM_PSB',
  'TEAM_TROUBLESHOOTS',
  'TEAM_JALUR',
  'TEAM_DISMANTLE',
  'REPLACE_OLD',
  'REPLACE_NEW',
  'PENDING_NOC_VALIDATION',
  'INSTALLED',
  'DAMAGED',
  'RETURNED',
]

function needsTargetTeam(status: DeviceLifecycleStatus) {
  return (
    status === 'TEAM_PSB' ||
    status === 'TEAM_TROUBLESHOOTS' ||
    status === 'TEAM_JALUR' ||
    status === 'TEAM_DISMANTLE'
  )
}

function needsRelatedReplaceItem(status: DeviceLifecycleStatus) {
  return status === 'REPLACE_OLD' || status === 'REPLACE_NEW'
}

function needsHandoverProof(status: DeviceLifecycleStatus) {
  return status === 'NOC' || status === 'RETURNED' || needsTargetTeam(status)
}

function getSuggestedHandover(params: { status: DeviceLifecycleStatus; targetTeam: string }) {
  const { status, targetTeam } = params
  switch (status) {
    case 'NOC':
      return {
        fromLabel: 'Inventory / GA',
        toLabel: 'NOC',
        proofType: 'BARCODE_SCAN' as DeviceLifecycleHandoverProofType,
      }
    case 'TEAM_PSB':
      return {
        fromLabel: 'NOC',
        toLabel: targetTeam || 'Team Teknisi PSB',
        proofType: 'BARCODE_SCAN' as DeviceLifecycleHandoverProofType,
      }
    case 'TEAM_TROUBLESHOOTS':
      return {
        fromLabel: 'NOC',
        toLabel: targetTeam || 'Team Troubleshoots',
        proofType: 'BARCODE_SCAN' as DeviceLifecycleHandoverProofType,
      }
    case 'TEAM_JALUR':
      return {
        fromLabel: 'NOC',
        toLabel: targetTeam || 'Team Jalur',
        proofType: 'BARCODE_SCAN' as DeviceLifecycleHandoverProofType,
      }
    case 'TEAM_DISMANTLE':
      return {
        fromLabel: 'NOC',
        toLabel: targetTeam || 'Team Dismantle',
        proofType: 'BARCODE_SCAN' as DeviceLifecycleHandoverProofType,
      }
    case 'RETURNED':
      return {
        fromLabel: targetTeam || 'Team Teknisi',
        toLabel: 'NOC / Inventory',
        proofType: 'MANUAL_CONFIRMATION' as DeviceLifecycleHandoverProofType,
      }
    default:
      return {
        fromLabel: '',
        toLabel: '',
        proofType: 'BARCODE_SCAN' as DeviceLifecycleHandoverProofType,
      }
  }
}

const handoverProofTypeOptions: DeviceLifecycleHandoverProofType[] = [
  'BARCODE_SCAN',
  'SERIAL_CHECK',
  'MANUAL_CONFIRMATION',
]

export function DeviceLifecycleActionForm({
  canCreate,
  reviewDbReady,
  itemSuggestions,
  workOrderId = null,
  troubleTicketId = null,
  defaultLifecycleStatus = 'NOC',
  defaultTargetTeam = '',
  defaultNotes = '',
  title = 'Scan & validasi device',
  description = 'Catat perpindahan lifecycle ONT/modem dari Inventory, NOC, delegasi teknisi, replace device lama/baru, sampai validasi akhir.',
  embedded = false,
}: DeviceLifecycleActionFormProps) {
  const router = useRouter()
  const datalistId = useId().replace(/:/g, '-')
  const [itemValue, setItemValue] = useState('')
  const [relatedItemValue, setRelatedItemValue] = useState('')
  const [lifecycleStatus, setLifecycleStatus] = useState<DeviceLifecycleStatus>(defaultLifecycleStatus)
  const [targetTeam, setTargetTeam] = useState(defaultTargetTeam)
  const [handoverFromLabel, setHandoverFromLabel] = useState('')
  const [handoverToLabel, setHandoverToLabel] = useState('')
  const [handoverProofType, setHandoverProofType] = useState<DeviceLifecycleHandoverProofType>('BARCODE_SCAN')
  const [handoverProofRef, setHandoverProofRef] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)

  const isDisabled = !canCreate || !reviewDbReady || submitting

  const resolvedItemCode = useMemo(() => extractInventoryItemCodeFromScan(itemValue), [itemValue])
  const resolvedRelatedItemCode = useMemo(() => extractInventoryItemCodeFromScan(relatedItemValue), [relatedItemValue])

  useEffect(() => {
    setLifecycleStatus(defaultLifecycleStatus)
  }, [defaultLifecycleStatus])

  useEffect(() => {
    setTargetTeam(defaultTargetTeam)
  }, [defaultTargetTeam])

  useEffect(() => {
    const suggestion = getSuggestedHandover({ status: lifecycleStatus, targetTeam })
    setHandoverFromLabel((current) => (current ? current : suggestion.fromLabel))
    setHandoverToLabel((current) => (current ? current : suggestion.toLabel))
    setHandoverProofType((current) => current || suggestion.proofType)
  }, [lifecycleStatus, targetTeam])

  useEffect(() => {
    setNotes(defaultNotes)
  }, [defaultNotes])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isDisabled) return

    const resolvedSuggestion = findInventorySuggestionByCode(itemSuggestions, resolvedItemCode)
    const finalItemValue = resolvedSuggestion || itemValue

    if (!resolvedItemCode) {
      setFeedback({
        tone: 'error',
        message: 'Scan atau pilih item inventory yang valid terlebih dahulu.',
      })
      return
    }

    if (needsTargetTeam(lifecycleStatus) && !targetTeam.trim()) {
      setFeedback({
        tone: 'error',
        message: 'Target tim / teknisi wajib diisi untuk status delegasi.',
      })
      return
    }
    if (needsRelatedReplaceItem(lifecycleStatus) && !resolvedRelatedItemCode) {
      setFeedback({
        tone: 'error',
        message: 'Scan atau pilih device pasangan replace terlebih dahulu.',
      })
      return
    }
    if (needsHandoverProof(lifecycleStatus) && (!handoverFromLabel.trim() || !handoverToLabel.trim() || !handoverProofType)) {
      setFeedback({
        tone: 'error',
        message: 'Lengkapi proof serah-terima: pihak penyerah, penerima, dan jenis bukti.',
      })
      return
    }

    setSubmitting(true)
    setFeedback(null)

    try {
      const response = await fetch('/api/inventory/device-lifecycle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemValue: finalItemValue,
          relatedItemValue,
          lifecycleStatus,
          workOrderId,
          troubleTicketId,
          targetTeam,
          handoverFromLabel,
          handoverToLabel,
          handoverProofType,
          handoverProofRef,
          notes,
          scanSource: 'BARCODE',
        }),
      })

      const payload = (await response.json().catch(() => null)) as { message?: string } | null
      if (!response.ok) {
        setFeedback({
          tone: 'error',
          message: payload?.message || 'Lifecycle device gagal dicatat.',
        })
        return
      }

      setFeedback({
        tone: 'success',
        message: payload?.message || 'Lifecycle device berhasil dicatat.',
      })
      setItemValue('')
      setRelatedItemValue('')
      setLifecycleStatus(defaultLifecycleStatus)
      setTargetTeam(defaultTargetTeam)
      setHandoverFromLabel('')
      setHandoverToLabel('')
      setHandoverProofType('BARCODE_SCAN')
      setHandoverProofRef('')
      setNotes(defaultNotes)
      router.refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className={embedded ? 'space-y-4' : 'panel p-6'}>
      <p className="section-title">Lifecycle Device</p>
      <h3 className={`font-[family-name:var(--font-heading)] font-semibold tracking-tight text-slate-950 ${embedded ? 'text-xl' : 'mt-2 text-2xl'}`}>
        {title}
      </h3>
      <p className={`${embedded ? '' : 'mt-3'} text-sm leading-6 text-mute`}>
        {!canCreate
          ? 'Role aktif belum memiliki izin update/create pada flow inventory-support.'
          : !reviewDbReady
            ? 'Mode review database belum aktif, jadi log lifecycle device dinonaktifkan agar tidak menulis ke mock.'
            : description}
      </p>

      <form onSubmit={handleSubmit} className={`${embedded ? '' : 'mt-6'} grid gap-4 lg:grid-cols-2`}>
        <div className="lg:col-span-2">
          <InventoryItemScanAssist
            itemSuggestions={itemSuggestions}
            disabled={isDisabled}
            onResolved={(value) => {
              setItemValue(value)
            }}
          />
        </div>

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Item hasil scan</span>
          <input
            list={datalistId}
            value={itemValue}
            onChange={(event) => setItemValue(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="INV-202607-0001 | ONU ZTE F660"
            required
            disabled={isDisabled}
          />
          <datalist id={datalistId}>
            {itemSuggestions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <span className="text-xs text-mute">
            Kode terdeteksi: {resolvedItemCode || '-'}
          </span>
        </label>

        {needsRelatedReplaceItem(lifecycleStatus) ? (
          <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
            <span className="font-semibold text-slate-950">
              {lifecycleStatus === 'REPLACE_OLD' ? 'Device pengganti' : 'Device lama yang diganti'}
            </span>
            <input
              list={datalistId}
              value={relatedItemValue}
              onChange={(event) => setRelatedItemValue(event.target.value)}
              className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
              placeholder="INV-202607-0002 | ONU Pengganti"
              required
              disabled={isDisabled}
            />
            <span className="text-xs text-mute">
              Kode pasangan terdeteksi: {resolvedRelatedItemCode || '-'}
            </span>
          </label>
        ) : null}

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Status lifecycle</span>
          <select
            value={lifecycleStatus}
            onChange={(event) => setLifecycleStatus(event.target.value as DeviceLifecycleStatus)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            disabled={isDisabled}
          >
            {lifecycleStatusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">Target tim / teknisi</span>
          <input
            value={targetTeam}
            onChange={(event) => setTargetTeam(event.target.value)}
            className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Team Teknisi PSB / Team Troubleshoots / NOC"
            disabled={isDisabled}
          />
        </label>

        {needsHandoverProof(lifecycleStatus) ? (
          <>
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Diserahterimakan dari</span>
              <input
                value={handoverFromLabel}
                onChange={(event) => setHandoverFromLabel(event.target.value)}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder={getSuggestedHandover({ status: lifecycleStatus, targetTeam }).fromLabel || 'Inventory / GA / NOC / Teknisi'}
                disabled={isDisabled}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Diterima oleh</span>
              <input
                value={handoverToLabel}
                onChange={(event) => setHandoverToLabel(event.target.value)}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder={getSuggestedHandover({ status: lifecycleStatus, targetTeam }).toLabel || 'NOC / Teknisi / Inventory'}
                disabled={isDisabled}
                required
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Jenis bukti serah-terima</span>
              <select
                value={handoverProofType}
                onChange={(event) => setHandoverProofType(event.target.value as DeviceLifecycleHandoverProofType)}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                disabled={isDisabled}
              >
                {handoverProofTypeOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-slate-700">
              <span className="font-semibold text-slate-950">Referensi bukti</span>
              <input
                value={handoverProofRef}
                onChange={(event) => setHandoverProofRef(event.target.value)}
                className="rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
                placeholder="Contoh: BAST-NOC-001 / scan serial / catatan serah-terima"
                disabled={isDisabled}
              />
            </label>
          </>
        ) : null}

        <label className="flex flex-col gap-2 text-sm text-slate-700 lg:col-span-2">
          <span className="font-semibold text-slate-950">Catatan</span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 rounded-2xl border border-line bg-white px-4 py-3 outline-none transition focus:border-slate-400"
            placeholder="Contoh: NOC sudah cek serial, didelegasikan ke tim PSB Fadil, replace modem lama, atau validasi sukses terpasang."
            disabled={isDisabled}
          />
        </label>

        <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] px-4 py-3 text-sm text-mute lg:col-span-2">
          Konteks aktif:
          {workOrderId ? ` WO #${workOrderId}` : ''}
          {troubleTicketId ? ` TT #${troubleTicketId}` : ''}
          {!workOrderId && !troubleTicketId ? ' belum terhubung ke WO/TT.' : ''}
        </div>

        <div className="flex items-center justify-end lg:col-span-2">
          <button
            type="submit"
            disabled={isDisabled}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {submitting ? 'Menyimpan...' : 'Simpan Lifecycle Device'}
          </button>
        </div>
      </form>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
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
