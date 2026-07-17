'use client'

import { useMemo, useState } from 'react'
import { DeviceLifecycleActionForm } from '@/components/device-lifecycle-action-form'
import type { DeviceLifecycleStatus } from '@/lib/services/device-lifecycle-service'
import type { NocTicketType } from '@/lib/services/noc-queue-service'

type NocQueueQuickActionsProps = {
  canCreate: boolean
  reviewDbReady: boolean
  itemSuggestions: string[]
  workOrderId?: number | null
  troubleTicketId?: number | null
  ticketType: NocTicketType
  deviceState?: string | null
}

function resolveDefaultLifecycleStatus(ticketType: NocTicketType, deviceState: string | null | undefined): DeviceLifecycleStatus {
  const normalized = String(deviceState ?? '').trim().toUpperCase()
  if (!normalized || normalized === 'INVENTORY') {
    return 'NOC'
  }
  if (normalized === 'NOC') {
    return ticketType === 'PSB' ? 'TEAM_PSB' : 'TEAM_TROUBLESHOOTS'
  }
  if (
    normalized === 'TEAM TEKNISI PSB' ||
    normalized === 'TEAM TEKNISI TROUBLESHOOTS' ||
    normalized === 'TEAM_PSB' ||
    normalized === 'TEAM_TROUBLESHOOTS'
  ) {
    return 'PENDING_NOC_VALIDATION'
  }
  if (normalized === 'PENDING VALIDASI NOC' || normalized === 'PENDING_NOC_VALIDATION') {
    return 'INSTALLED'
  }
  if (normalized === 'REPLACE') {
    return 'PENDING_NOC_VALIDATION'
  }

  return ticketType === 'PSB' ? 'TEAM_PSB' : 'TEAM_TROUBLESHOOTS'
}

function resolveDefaultTargetTeam(ticketType: NocTicketType, lifecycleStatus: DeviceLifecycleStatus) {
  if (lifecycleStatus === 'TEAM_PSB') {
    return 'Team Teknisi PSB'
  }
  if (lifecycleStatus === 'TEAM_TROUBLESHOOTS') {
    return ticketType === 'PSB' ? 'Team Teknisi PSB' : 'Team Troubleshoots'
  }

  return ''
}

type QuickPreset = {
  key: string
  label: string
  lifecycleStatus: DeviceLifecycleStatus
  targetTeam?: string
  notes: string
}

function normalizeDeviceState(deviceState: string | null | undefined) {
  return String(deviceState ?? '').trim().toUpperCase()
}

function buildQuickPresets(ticketType: NocTicketType): QuickPreset[] {
  const delegationStatus = ticketType === 'PSB' ? 'TEAM_PSB' : 'TEAM_TROUBLESHOOTS'
  const delegationTarget = ticketType === 'PSB' ? 'Team Teknisi PSB' : 'Team Troubleshoots'

  const presets: QuickPreset[] = [
    {
      key: 'delegasi',
      label: 'Delegasi',
      lifecycleStatus: delegationStatus,
      targetTeam: delegationTarget,
      notes: `Delegasi device dari NOC ke ${delegationTarget}.`,
    },
    {
      key: 'pending',
      label: 'Pending Validasi',
      lifecycleStatus: 'PENDING_NOC_VALIDATION',
      notes: 'Teknisi sudah scan hasil pekerjaan, menunggu validasi NOC.',
    },
    {
      key: 'installed',
      label: 'Terpasang',
      lifecycleStatus: 'INSTALLED',
      notes: 'Validasi NOC: device terpasang normal dan layanan aktif.',
    },
    {
      key: 'damaged',
      label: 'Rusak',
      lifecycleStatus: 'DAMAGED',
      notes: 'Validasi NOC: device dinyatakan rusak atau gagal dipasang.',
    },
    {
      key: 'returned',
      label: 'Kembali',
      lifecycleStatus: 'RETURNED',
      notes: 'Device dikembalikan ke NOC / inventory untuk pemeriksaan lanjutan.',
    },
    {
      key: 'noc',
      label: 'Ke NOC',
      lifecycleStatus: 'NOC',
      targetTeam: 'NOC',
      notes: 'Device diterima NOC untuk pengecekan awal.',
    },
    {
      key: 'inventory',
      label: 'Ke Inventory',
      lifecycleStatus: 'INVENTORY',
      targetTeam: 'Inventory',
      notes: 'Device tercatat kembali di inventory / gudang.',
    },
  ]

  if (ticketType === 'TROUBLESHOOTS') {
    presets.splice(1, 0, {
      key: 'replace',
      label: 'Replace',
      lifecycleStatus: 'REPLACE',
      notes: 'Teknisi trouble melakukan replace device lama di lokasi.',
    })
  }

  return presets
}

function filterQuickPresets(presets: QuickPreset[], deviceState: string | null | undefined) {
  const state = normalizeDeviceState(deviceState)
  if (!state || state === 'REQUEST BARANG' || state === 'MENUNGGU MATERIAL') {
    return presets.filter((item) => ['inventory', 'noc', 'delegasi'].includes(item.key))
  }
  if (state === 'INVENTORY' || state === 'DIPROSES INVENTORY' || state === 'SIAP DIPASANG') {
    return presets.filter((item) => ['noc', 'delegasi', 'inventory'].includes(item.key))
  }
  if (state === 'NOC') {
    return presets.filter((item) => ['delegasi', 'inventory', 'returned'].includes(item.key))
  }
  if (
    state === 'TEAM TEKNISI PSB' ||
    state === 'TEAM TEKNISI TROUBLESHOOTS' ||
    state === 'TEAM_PSB' ||
    state === 'TEAM_TROUBLESHOOTS'
  ) {
    return presets.filter((item) => ['pending', 'replace', 'returned', 'delegasi'].includes(item.key))
  }
  if (state === 'PENDING VALIDASI NOC' || state === 'PENDING_NOC_VALIDATION' || state === 'REPLACE') {
    return presets.filter((item) => ['installed', 'damaged', 'returned', 'pending'].includes(item.key))
  }
  if (state === 'TERPASANG' || state === 'INSTALLED') {
    return presets.filter((item) => ['damaged', 'returned', 'installed'].includes(item.key))
  }
  if (state === 'RUSAK' || state === 'DAMAGED' || state === 'KEMBALI' || state === 'RETURNED') {
    return presets.filter((item) => ['inventory', 'noc', 'delegasi'].includes(item.key))
  }

  return presets.filter((item) => item.key !== 'inventory')
}

export function NocQueueQuickActions({
  canCreate,
  reviewDbReady,
  itemSuggestions,
  workOrderId = null,
  troubleTicketId = null,
  ticketType,
  deviceState,
}: NocQueueQuickActionsProps) {
  const [open, setOpen] = useState(false)
  const presets = useMemo(
    () => filterQuickPresets(buildQuickPresets(ticketType), deviceState),
    [deviceState, ticketType],
  )
  const fallbackLifecycleStatus = useMemo(
    () => resolveDefaultLifecycleStatus(ticketType, deviceState),
    [deviceState, ticketType],
  )
  const initialPreset =
    presets.find((item) => item.lifecycleStatus === fallbackLifecycleStatus) ??
    presets[0] ?? {
      key: 'default',
      label: 'Delegasi',
      lifecycleStatus: fallbackLifecycleStatus,
      targetTeam: resolveDefaultTargetTeam(ticketType, fallbackLifecycleStatus),
      notes: 'Update lifecycle device dari queue NOC.',
    }
  const [selectedPresetKey, setSelectedPresetKey] = useState(initialPreset.key)

  const selectedPreset = useMemo(() => {
    const matched = presets.find((item) => item.key === selectedPresetKey)
    if (matched) {
      return matched
    }

    return initialPreset
  }, [initialPreset, presets, selectedPresetKey])

  const defaultTargetTeam = selectedPreset.targetTeam ?? resolveDefaultTargetTeam(ticketType, selectedPreset.lifecycleStatus)
  const defaultNotes = selectedPreset.notes

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="surface-soft inline-flex items-center justify-center rounded-2xl border px-3 py-2 text-xs font-semibold text-ink transition hover:[border-color:var(--color-line-strong)] hover:text-[var(--color-ink-strong)]"
      >
        {open ? 'Tutup Aksi' : 'Aksi Cepat'}
      </button>

      {open ? (
        <div className="rounded-2xl border border-line bg-[var(--color-surface-soft)] p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => setSelectedPresetKey(preset.key)}
                className={`rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
                  selectedPreset.key === preset.key
                    ? 'bg-slate-950 text-white'
                    : 'border border-line bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <DeviceLifecycleActionForm
            key={selectedPreset.key}
            canCreate={canCreate}
            reviewDbReady={reviewDbReady}
            itemSuggestions={itemSuggestions}
            workOrderId={workOrderId}
            troubleTicketId={troubleTicketId}
            defaultLifecycleStatus={selectedPreset.lifecycleStatus}
            defaultTargetTeam={defaultTargetTeam}
            defaultNotes={defaultNotes}
            embedded
            title="Validasi cepat NOC"
            description={`Preset aktif: ${selectedPreset.label}. Gunakan dari tabel NOC untuk scan, delegasi, pending validasi, terpasang, rusak, atau kembali.`}
          />
        </div>
      ) : null}
    </div>
  )
}
