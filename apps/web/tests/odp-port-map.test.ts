import assert from 'node:assert/strict'
import type {
  CanonicalPortStatus,
  OdpPortMapClientRow,
  OdpPortMapClientOverview,
} from '@/components/inventory-odp-port-map'
import {
  toCanonicalPortStatus,
  getPortStatusBadgeTone,
  PORT_STATUS_LABELS,
  formatPortNumber,
  buildCustomerDetailHref,
} from '@/components/inventory-odp-port-map'

type StaticStatus =
  | 'AVAILABLE'
  | 'USED'
  | 'BLOCKED'
  | 'RESERVED'
  | 'FAULTY'
  | 'DISABLED'
  | 'UNKNOWN'

const KNOWN_STATUSES: readonly StaticStatus[] = [
  'AVAILABLE',
  'USED',
  'BLOCKED',
  'RESERVED',
  'FAULTY',
  'DISABLED',
  'UNKNOWN',
] as const

function buildPortRow(overrides: Partial<OdpPortMapClientRow> = {}): OdpPortMapClientRow {
  return {
    portId: overrides.portId ?? 1,
    odpCode: overrides.odpCode ?? 'ODP/TEST/001',
    odpName: overrides.odpName ?? 'ODP Test',
    portNo: overrides.portNo ?? 1,
    portStatus: (overrides.portStatus ?? 'AVAILABLE') as CanonicalPortStatus,
    serviceNo: overrides.serviceNo ?? null,
    customerCode: overrides.customerCode ?? null,
    customerName: overrides.customerName ?? null,
    installedAt: overrides.installedAt ?? null,
  }
}

function buildOverviewRow(overrides: Partial<OdpPortMapClientOverview> = {}): OdpPortMapClientOverview {
  return {
    odpId: overrides.odpId ?? 1,
    odpCode: overrides.odpCode ?? 'ODP/TEST/001',
    odpName: overrides.odpName ?? 'ODP Test',
    totalPorts: overrides.totalPorts ?? 8,
    activePorts: overrides.activePorts ?? 3,
    locationText: overrides.locationText ?? null,
    latitude: overrides.latitude ?? null,
    longitude: overrides.longitude ?? null,
  }
}

async function main() {
  // T1 — toCanonicalPortStatus mapping tetap stabil untuk semua canonical status + alias existing
  // Schema B evidence (port_status ENUM): AVAILABLE / USED / RESERVED / FAULTY / DISABLED
  // Schema A evidence (status ENUM): AVAILABLE / USED / BLOCKED
  assert.equal(toCanonicalPortStatus('AVAILABLE'), 'AVAILABLE', 'Schema A/B AVAILABLE harus AVAILABLE.')
  assert.equal(toCanonicalPortStatus('UNUSED'), 'AVAILABLE')
  assert.equal(toCanonicalPortStatus('FREE'), 'AVAILABLE')
  assert.equal(toCanonicalPortStatus('USED'), 'USED', 'Schema A/B USED harus USED.')
  assert.equal(toCanonicalPortStatus('ACTIVE'), 'USED')
  assert.equal(toCanonicalPortStatus('OCCUPIED'), 'USED')
  assert.equal(toCanonicalPortStatus('BLOCKED'), 'BLOCKED', 'BLOCKED (Schema A native enum) TIDAK BOLEH disamarkan sebagai USED — tetap BLOCKED secara contract.')
  assert.notEqual(toCanonicalPortStatus('BLOCKED'), 'USED', 'CONTRACT PROOF: BLOCKED != USED.')
  assert.equal(toCanonicalPortStatus('LOCKED'), 'BLOCKED')
  assert.equal(toCanonicalPortStatus('RESERVED'), 'RESERVED', 'Schema B RESERVED.')
  assert.equal(toCanonicalPortStatus('PENDING'), 'RESERVED')
  assert.equal(toCanonicalPortStatus('HOLD'), 'RESERVED')
  assert.equal(toCanonicalPortStatus('FAULTY'), 'FAULTY', 'Schema B FAULTY.')
  assert.equal(toCanonicalPortStatus('FAULT'), 'FAULTY')
  assert.equal(toCanonicalPortStatus('BROKEN'), 'FAULTY')
  assert.equal(toCanonicalPortStatus('DAMAGED'), 'FAULTY')
  assert.equal(toCanonicalPortStatus('DISABLED'), 'DISABLED', 'Schema B DISABLED.')
  assert.equal(toCanonicalPortStatus('INACTIVE'), 'DISABLED')
  assert.equal(toCanonicalPortStatus('OFFLINE'), 'DISABLED')
  assert.equal(toCanonicalPortStatus(''), 'UNKNOWN')
  assert.equal(toCanonicalPortStatus('RANDOM-NOT-LISTED'), 'UNKNOWN', 'Unknown status aman di-UNKNOWNN, tidak dipaksa jadi status lain.')
  assert.equal(toCanonicalPortStatus(null), 'UNKNOWN')
  assert.equal(toCanonicalPortStatus(undefined), 'UNKNOWN')

  // T2 — semua 7 status canonical punya label & tone (7 canonical = AVAILABLE/USED/BLOCKED/RESERVED/FAULTY/DISABLED + UNKNOWN)
  for (const status of KNOWN_STATUSES) {
    const label = PORT_STATUS_LABELS[status]
    assert.ok(label?.length, `Label harus ada untuk status ${status}`)
    const tone = getPortStatusBadgeTone(status)
    assert.ok(tone.chip?.length, `chip tone harus ada untuk ${status}`)
    assert.ok(typeof tone.dot === 'string' && tone.dot.length > 0, `dot tone harus ada untuk ${status}`)
    assert.ok(tone.panel?.length, `panel tone harus ada untuk ${status}`)
    assert.ok(tone.ring?.length, `ring tone harus ada untuk ${status}`)
  }

  // T3 — formatPortNumber tetap stabil
  assert.equal(formatPortNumber(0), '#')
  assert.equal(formatPortNumber(-5), '#')
  assert.equal(formatPortNumber(1), '01')
  assert.equal(formatPortNumber(8), '08')
  assert.equal(formatPortNumber(12), '12')
  assert.equal(formatPortNumber(128), '128')

  // T4 — buildCustomerDetailHref tidak pernah crash pada NULL relation USED
  assert.equal(
    buildCustomerDetailHref({ customerCode: null, serviceNo: null }),
    null,
    'Jika USED customer/service relation NULL, href ke detail customer = null (aman).',
  )
  assert.ok(
    buildCustomerDetailHref({ customerCode: 'PELANGGAN/001', serviceNo: null })?.includes(
      encodeURIComponent('PELANGGAN/001'),
    ),
    'Hanya customerCode → cs-admin focus customer.',
  )
  assert.ok(
    buildCustomerDetailHref({ customerCode: null, serviceNo: 'SRV/007' })?.includes(encodeURIComponent('SRV/007')),
    'Hanya serviceNo → cs-admin focus serviceNo.',
  )
  assert.ok(
    buildCustomerDetailHref({ customerCode: 'PELANGGAN/001', serviceNo: 'SRV/007' })?.includes(
      encodeURIComponent('SRV/007'),
    ),
    'Keduanya ada → serviceNo diprioritaskan.',
  )

  // T5 — empty port list tetap dapat dibentuk tanpa throw; unknown status tidak merusak tone
  const empty: OdpPortMapClientRow[] = []
  assert.equal(empty.length, 0)
  const rowUnknown = buildPortRow({ portNo: 1, portStatus: 'RANDOM-STATUS' as unknown as CanonicalPortStatus })
  const canonicalUnknown = toCanonicalPortStatus(rowUnknown.portStatus)
  assert.equal(canonicalUnknown, 'UNKNOWN')
  const toneUnknown = getPortStatusBadgeTone(canonicalUnknown)
  assert.ok(toneUnknown.chip?.length, 'UNKNOWN harus tetap punya tone aman (tidak crash).')

  // T6 — overview metric tidak menyimpulkan angka ketika overview null
  const nullOverview: OdpPortMapClientOverview | null = null
  assert.equal(nullOverview?.totalPorts, undefined)
  const overview = buildOverviewRow({ totalPorts: 8, activePorts: 5 })
  assert.equal(Math.max(0, overview.totalPorts - overview.activePorts), 3)

  // T7 — USED dengan relation NULL (service & customer) tidak menyebabkan runtime assertion
  const usedEmptyRelation = buildPortRow({
    portNo: 4,
    portStatus: 'USED',
    serviceNo: null,
    customerCode: null,
    customerName: null,
  })
  assert.equal(usedEmptyRelation.serviceNo, null)
  assert.equal(usedEmptyRelation.customerCode, null)
  assert.equal(usedEmptyRelation.customerName, null)
  assert.equal(buildCustomerDetailHref({ customerCode: null, serviceNo: null }), null)

  // T8 — BLOCKED tone sendiri (bukan USED), label "BLOCKED · Diblokir"
  assert.equal(PORT_STATUS_LABELS.BLOCKED, 'BLOCKED · Diblokir', 'BLOCKED label sendiri.')
  const blockedTone = getPortStatusBadgeTone('BLOCKED')
  const usedTone = getPortStatusBadgeTone('USED')
  assert.notEqual(
    blockedTone.dot,
    usedTone.dot,
    'Visual tone BLOCKED dan USED harus jelas berbeda (bukan palette yang sama).',
  )

  // T9 — fallback schema A/B handling: dual source evidence BLOCKED tetap BLOCKED di toCanonical
  assert.equal(toCanonicalPortStatus('BLOCKED'), 'BLOCKED')
  assert.equal(toCanonicalPortStatus('DISABLED'), 'DISABLED')
  assert.equal(toCanonicalPortStatus('FAULTY'), 'FAULTY')
  assert.equal(toCanonicalPortStatus('RESERVED'), 'RESERVED')

  console.log('odp-port-map.test.ts passed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
