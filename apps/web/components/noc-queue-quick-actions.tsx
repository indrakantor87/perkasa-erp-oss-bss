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
  const defaultLifecycleStatus = useMemo(
    () => resolveDefaultLifecycleStatus(ticketType, deviceState),
    [deviceState, ticketType],
  )
  const defaultTargetTeam = useMemo(
    () => resolveDefaultTargetTeam(ticketType, defaultLifecycleStatus),
    [defaultLifecycleStatus, ticketType],
  )

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
          <DeviceLifecycleActionForm
            canCreate={canCreate}
            reviewDbReady={reviewDbReady}
            itemSuggestions={itemSuggestions}
            workOrderId={workOrderId}
            troubleTicketId={troubleTicketId}
            defaultLifecycleStatus={defaultLifecycleStatus}
            defaultTargetTeam={defaultTargetTeam}
            embedded
            title="Validasi cepat NOC"
            description="Gunakan dari tabel NOC untuk scan, delegasi, pending validasi, terpasang, rusak, atau kembali."
          />
        </div>
      ) : null}
    </div>
  )
}
