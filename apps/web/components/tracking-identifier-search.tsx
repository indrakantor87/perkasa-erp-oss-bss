'use client'

import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { UiButton, IconClose } from '@/components/ui-button'
import { UiInput } from '@/components/ui-input'
import { StatusBadge } from '@/components/ui-status-badge'

export type TrackingIdentifierKind =
  | 'WORK_ORDER'
  | 'TROUBLE_TICKET'
  | 'PSB'
  | 'DISMANTLE'
  | 'ASSET'
  | 'CUSTOMER'
  | 'PHONE'
  | 'STOCK_MOVEMENT'
  | 'INVENTORY_REQUEST'
  | 'UNKNOWN'

export type TrackingIdentifierResolveResult =
  | { kind: 'WORK_ORDER'; id: string; href: string; human: string }
  | { kind: 'TROUBLE_TICKET'; id: string; href: string; human: string }
  | { kind: 'PSB'; id: string; href: string; human: string }
  | { kind: 'DISMANTLE'; id: string; href: string; human: string }
  | { kind: 'ASSET'; id: string; href: string; human: string }
  | { kind: 'CUSTOMER'; id: string; href: string; human: string }
  | { kind: 'PHONE'; id: string; href: string; human: string }
  | { kind: 'STOCK_MOVEMENT'; id: string; href: string; human: string }
  | { kind: 'INVENTORY_REQUEST'; id: string; href: string; human: string }
  | { kind: 'UNKNOWN'; id: string; href: null; human: string }

const KNOWN_PREFIXES: Array<{ key: TrackingIdentifierKind; prefixes: Array<string | RegExp>; label: string }> = [
  { key: 'WORK_ORDER', prefixes: ['WO-', 'WO/', 'WO ', /^WO\d/i], label: 'Work Order' },
  { key: 'TROUBLE_TICKET', prefixes: ['TT-', 'TT/', 'TT ', /^TT\d/i, 'TRK-', 'TRK/'], label: 'Trouble Ticket' },
  { key: 'PSB', prefixes: ['PSB-', 'PSB/', 'PSB '], label: 'Data PSB' },
  { key: 'DISMANTLE', prefixes: ['DIS-', 'DIS/', 'DIS ', 'DISMANTLE-'], label: 'Dismantle' },
  { key: 'STOCK_MOVEMENT', prefixes: ['MOV-', 'MOV/', 'MVT-', 'MVT/'], label: 'Stock Movement' },
  { key: 'INVENTORY_REQUEST', prefixes: ['REQ-', 'REQ/', 'IR-', 'IR/'], label: 'Inventory Request' },
  { key: 'ASSET', prefixes: ['ASSET-', 'SN-', 'SERIAL-'], label: 'Asset / Perangkat' },
  { key: 'CUSTOMER', prefixes: ['CUST-', 'CUST/', 'CUS-', 'CUS/'], label: 'Customer' },
  { key: 'PHONE', prefixes: [/^\+?62\d{8,}$/, /^08\d{8,}$/, /^0[2-9]\d{7,}$/], label: 'Nomor Telepon Pelanggan' },
]

function normalizeIdentifier(raw: string): string {
  return String(raw ?? '').trim()
}

function matchesPrefix(value: string, prefix: string | RegExp): boolean {
  if (typeof prefix === 'string') {
    return value.toUpperCase().startsWith(prefix.toUpperCase())
  }
  return prefix.test(value)
}

function extractId(value: string, kind: TrackingIdentifierKind): string {
  const upper = value.toUpperCase()
  for (const def of KNOWN_PREFIXES) {
    if (def.key !== kind) continue
    for (const prefix of def.prefixes) {
      if (typeof prefix === 'string' && upper.startsWith(prefix.toUpperCase())) {
        return value.slice(prefix.length).trim() || value
      }
    }
  }
  return value
}

function buildDetailListHref(kind: TrackingIdentifierKind, identifier: string): string {
  const q = encodeURIComponent(identifier)
  switch (kind) {
    case 'WORK_ORDER':
      return `/dashboard/tracking/work-orders?q=${q}`
    case 'TROUBLE_TICKET':
      return `/dashboard/tracking/trouble-tickets?q=${q}`
    case 'PSB':
      return `/list-psb?q=${q}`
    case 'DISMANTLE':
      return `/list-dismantle?q=${q}`
    case 'STOCK_MOVEMENT':
      return `/dashboard/tracking/stock-movements?q=${q}`
    case 'INVENTORY_REQUEST':
      return `/dashboard/tracking/inventory-requests?q=${q}`
    case 'ASSET':
      return `/inventory/assets?q=${q}`
    case 'CUSTOMER':
      return `/customers?q=${q}`
    case 'PHONE':
      return `/customers?q=${q}`
    case 'UNKNOWN':
    default:
      return `/dashboard/tracking/work-orders?q=${q}`
  }
}

export function resolveTrackingIdentifier(raw: string): TrackingIdentifierResolveResult {
  const value = normalizeIdentifier(raw)
  if (!value) {
    return {
      kind: 'UNKNOWN',
      id: '',
      href: null,
      human: 'Silakan masukkan identifier: WO-, TT-, PSB-, DIS-, ASSET-, CUST-, REQ-, MOV-, atau nomor telepon.',
    }
  }

  for (const def of KNOWN_PREFIXES) {
    for (const prefix of def.prefixes) {
      if (matchesPrefix(value, prefix)) {
        const id = extractId(value, def.key)
        const kindNonUnknown = def.key as Exclude<TrackingIdentifierKind, 'UNKNOWN'>
        return {
          kind: kindNonUnknown,
          id,
          href: buildDetailListHref(def.key, value),
          human: `${def.label} dikenali · arahkan ke halaman terkait.`,
        }
      }
    }
  }

  return {
    kind: 'UNKNOWN',
    id: value,
    href: null,
    human:
      'Tidak dapat mengenali format identifier. Format yang didukung: WO-, TT-, TRK-, PSB-, DIS-, MOV/MVT-, REQ/IR-, ASSET/SN-, CUST-, atau nomor telepon (08xx / +62xxx).',
  }
}

const badgeToneForKind: Record<TrackingIdentifierKind, 'info' | 'pending' | 'success' | 'warning' | 'danger' | 'neutral' | 'closed' | 'in_progress' | 'assigned'> = {
  WORK_ORDER: 'info',
  TROUBLE_TICKET: 'warning',
  PSB: 'success',
  DISMANTLE: 'danger',
  ASSET: 'info',
  CUSTOMER: 'success',
  PHONE: 'success',
  STOCK_MOVEMENT: 'pending',
  INVENTORY_REQUEST: 'pending',
  UNKNOWN: 'neutral',
}

export function TrackingIdentifierSearch({ className }: { className?: string }) {
  const router = useRouter()
  const [raw, setRaw] = useState('')
  const [submitTouched, setSubmitTouched] = useState(false)
  const resolved = resolveTrackingIdentifier(raw)
  const error = submitTouched && resolved.kind === 'UNKNOWN' ? resolved.human : undefined
  const hint = submitTouched && resolved.kind !== 'UNKNOWN' ? resolved.human : 'Cepat cari: WO-xxx · TT-xxx · PSB-xxx · DIS-xxx · REQ-xxx · MOV-xxx · ASSET-xxx · CUST-xxx · 08xxxxxxxxxx'
  const inputId = useId()

  const submit = (ev?: { preventDefault?: () => void }) => {
    ev?.preventDefault?.()
    setSubmitTouched(true)
    if (resolved.kind === 'UNKNOWN' || !resolved.href) return
    router.push(resolved.href)
  }

  return (
    <form
      onSubmit={submit as React.FormEventHandler<HTMLFormElement>}
      aria-label="Pencarian cepat identifier tracking"
      className={['card-tier-2 p-5 space-y-4', className ?? ''].filter(Boolean).join(' ')}
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-mute">
            Pencarian Cepat Identifier
          </p>
          <h3 className="text-lg font-semibold text-inkStrong">
            Masukkan kode pekerjaan, barang, atau pelanggan
          </h3>
          <p className="text-sm leading-6 text-mute max-w-2xl">
            Sistem mendeteksi prefix otomatis dan mengarahkan ke halaman detail list yang paling sesuai.
          </p>
        </div>
        {resolved.kind !== 'UNKNOWN' ? (
          <StatusBadge tone={badgeToneForKind[resolved.kind]} label={resolved.kind.replace(/_/g, ' ')} />
        ) : (
          <StatusBadge tone="neutral" label="Siap mencari" />
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <UiInput
          id={inputId}
          name="tracking-identifier"
          type="search"
          autoComplete="off"
          label="Identifier"
          hideLabel
          placeholder="Contoh: WO-202607-0321 / TT-9901 / PSB-JKT2607-0143 / CUST-20455 / 081234567890"
          value={raw}
          onChange={(ev) => {
            setRaw(ev.target.value)
            if (submitTouched) setSubmitTouched(false)
          }}
          hint={hint}
          error={error}
          aria-label="Masukkan tracking identifier"
        />
        <div className="flex gap-2">
          {raw ? (
            <UiButton
              variant="ghost"
              type="button"
              ariaLabel="Bersihkan pencarian"
              onClick={() => {
                setRaw('')
                setSubmitTouched(false)
              }}
              trailingIcon={<IconClose />}
            >
              Bersihkan
            </UiButton>
          ) : null}
          <UiButton
            variant="primary"
            type="submit"
            loading={false}
            size="md"
            ariaLabel="Cari identifier tracking dan arahkan ke halaman detail"
            disabled={!raw || resolved.kind === 'UNKNOWN'}
          >
            Cari & Buka
          </UiButton>
        </div>
      </div>
      <ul className="grid gap-2 text-xs text-mute sm:grid-cols-2 md:grid-cols-3">
        <li className="flex items-start gap-2">
          <StatusBadge tone="info" size="sm" label="WO / TT" />
          <span>Pekerjaan lapangan · tracking pekerjaan &amp; giliran teknisi</span>
        </li>
        <li className="flex items-start gap-2">
          <StatusBadge tone="success" size="sm" label="PSB / CUST" />
          <span>Pelanggan baru, data pelanggan, dan nomor telepon</span>
        </li>
        <li className="flex items-start gap-2">
          <StatusBadge tone="pending" size="sm" label="MOV / REQ" />
          <span>Jejak barang keluar dan request material lapangan</span>
        </li>
      </ul>
    </form>
  )
}
