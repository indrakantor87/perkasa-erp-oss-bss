import { getConfiguredDataMode, getFallbackDataSourceSnapshot, getDataSourceSnapshot } from '@/lib/data-source'
import type { DataSourceSnapshot } from '@/lib/types'

export type PsbListStatus =
  | 'BARU'
  | 'REVIEW_CS'
  | 'PERLU_KOREKSI'
  | 'DISETUJUI'
  | 'DITOLAK'
  | 'DITRANSFER_KE_TICKETING'

export type PsbListItem = {
  id: number
  psbListCode: string
  customerName: string
  customerPhone: string | null
  addressText: string
  odpCode: string | null
  packageLabel: string | null
  salesOwnerName: string | null
  requestedInstallDate: string | null
  status: PsbListStatus
  reviewNotes: string | null
  correctionNotes: string | null
  transferredTicketRef: string | null
  createdAt: string | null
  updatedAt: string | null
  areaLabel: string | null
  escortNotes: string | null
  activityNotes: string | null
  csPicName: string | null
  nextActionLabel: string
  auditSummary: string[]
}

export type PsbListQuery = {
  status?: string | string[]
  owner?: string | string[]
  q?: string | string[]
  selected?: string | string[]
}

export type PsbListPagePayload = {
  source: DataSourceSnapshot
  items: PsbListItem[]
  selectedItem: PsbListItem | null
  summary: {
    totalCount: number
    baruCount: number
    reviewCount: number
    correctionCount: number
    approvedCount: number
    rejectedCount: number
    transferredCount: number
  }
  ownerOptions: string[]
  state: {
    status: string | null
    owner: string | null
    q: string | null
    selected: string | null
  }
}

const mockPsbListItems: PsbListItem[] = [
  {
    id: 101,
    psbListCode: 'PSBL-202607-0001',
    customerName: 'Ahmad Hidayat',
    customerPhone: '628523110022',
    addressText: 'Perum Griya Pati Indah Blok C2 No. 8, Pati Kidul',
    odpCode: 'ODP-PTI-02',
    packageLabel: 'Home 20 Mbps',
    salesOwnerName: 'Dhimas',
    requestedInstallDate: '2026-07-20T09:00:00+07:00',
    status: 'BARU',
    reviewNotes: null,
    correctionNotes: null,
    transferredTicketRef: null,
    createdAt: '2026-07-19T08:12:00+07:00',
    updatedAt: '2026-07-19T08:12:00+07:00',
    areaLabel: 'Pati Kota',
    escortNotes: 'Marketing meminta pemasangan pagi karena customer standby di rumah.',
    activityNotes: 'Lead sudah lolos coverage dan menunggu review awal CS.',
    csPicName: null,
    nextActionLabel: 'Masuk review CS',
    auditSummary: ['Input Penjualan', 'Coverage siap', 'Menunggu validasi CS'],
  },
  {
    id: 102,
    psbListCode: 'PSBL-202607-0002',
    customerName: 'Rina Setyawati',
    customerPhone: '628133445566',
    addressText: 'Ds. Sukoharjo RT 03 RW 01, Margorejo',
    odpCode: 'ODP-MRG-11',
    packageLabel: 'Home 30 Mbps',
    salesOwnerName: 'Kantor',
    requestedInstallDate: '2026-07-20T13:30:00+07:00',
    status: 'REVIEW_CS',
    reviewNotes: 'Alamat dan titik rumah sudah cocok, tinggal cek slot ODP dan kesiapan jadwal teknisi.',
    correctionNotes: null,
    transferredTicketRef: null,
    createdAt: '2026-07-18T14:10:00+07:00',
    updatedAt: '2026-07-19T09:45:00+07:00',
    areaLabel: 'Margorejo',
    escortNotes: 'Sudah dikawal oleh penjualan, customer responsif via WhatsApp.',
    activityNotes: 'Perlu cek ulang ketersediaan port sebelum transfer ke ticketing.',
    csPicName: 'Admin CS Pagi',
    nextActionLabel: 'Validasi slot ODP',
    auditSummary: ['Input Penjualan', 'Masuk review CS', 'Butuh cek ODP'],
  },
  {
    id: 103,
    psbListCode: 'PSBL-202607-0003',
    customerName: 'PT Maju Lancar Abadi',
    customerPhone: '62295214567',
    addressText: 'Kawasan Industri Margorejo Blok C2',
    odpCode: 'ODP-KIM-03',
    packageLabel: 'Dedicated 50 Mbps',
    salesOwnerName: 'Chalis',
    requestedInstallDate: '2026-07-21T10:00:00+07:00',
    status: 'PERLU_KOREKSI',
    reviewNotes: 'Jadwal bisa lanjut setelah penjualan melengkapi PIC onsite dan akses gerbang.',
    correctionNotes: 'Lengkapi nama PIC onsite, jam akses pabrik, dan nomor penanggung jawab lapangan.',
    transferredTicketRef: null,
    createdAt: '2026-07-18T11:20:00+07:00',
    updatedAt: '2026-07-19T10:20:00+07:00',
    areaLabel: 'Margorejo Industri',
    escortNotes: 'Customer corporate minta teknisi datang setelah jam 10 pagi.',
    activityNotes: 'Dokumen akses site belum lengkap.',
    csPicName: 'CS Operator 02',
    nextActionLabel: 'Tunggu koreksi penjualan',
    auditSummary: ['Input Penjualan', 'Masuk review CS', 'Dikembalikan untuk koreksi'],
  },
  {
    id: 104,
    psbListCode: 'PSBL-202607-0004',
    customerName: 'Budi Santoso',
    customerPhone: '628987654321',
    addressText: 'Jl. Melati No. 12, Pati Lor',
    odpCode: 'ODP-PTL-04',
    packageLabel: 'Home 20 Mbps',
    salesOwnerName: 'Dhimas',
    requestedInstallDate: '2026-07-19T15:00:00+07:00',
    status: 'DISETUJUI',
    reviewNotes: 'Semua data valid, slot ODP tersedia, siap dibuatkan ticket PSB.',
    correctionNotes: null,
    transferredTicketRef: null,
    createdAt: '2026-07-18T16:35:00+07:00',
    updatedAt: '2026-07-19T11:05:00+07:00',
    areaLabel: 'Pati Lor',
    escortNotes: 'Rumah mudah ditemukan, titik maps sudah dibagikan.',
    activityNotes: 'Menunggu transfer ke ticketing PSB.',
    csPicName: 'Admin CS Pagi',
    nextActionLabel: 'Transfer ke ticketing',
    auditSummary: ['Input Penjualan', 'Review selesai', 'Disetujui CS'],
  },
  {
    id: 105,
    psbListCode: 'PSBL-202607-0005',
    customerName: 'Lina Maharani',
    customerPhone: '628111000222',
    addressText: 'Perumahan Graha Asri Blok B7, Tlogowungu',
    odpCode: 'ODP-TLG-07',
    packageLabel: 'Home 20 Mbps',
    salesOwnerName: 'Kantor',
    requestedInstallDate: '2026-07-22T08:30:00+07:00',
    status: 'DITRANSFER_KE_TICKETING',
    reviewNotes: 'Data lengkap dan sudah diteruskan ke ticketing.',
    correctionNotes: null,
    transferredTicketRef: 'PSB-202607-0188',
    createdAt: '2026-07-17T09:00:00+07:00',
    updatedAt: '2026-07-19T07:40:00+07:00',
    areaLabel: 'Tlogowungu',
    escortNotes: 'Customer sudah konfirmasi pemasangan minggu ini.',
    activityNotes: 'Ticket PSB sudah dibuat dan siap diteruskan ke teknisi.',
    csPicName: 'CS Operator 01',
    nextActionLabel: 'Monitor ticket',
    auditSummary: ['Input Penjualan', 'Disetujui CS', 'Ditrasfer ke ticketing'],
  },
  {
    id: 106,
    psbListCode: 'PSBL-202607-0006',
    customerName: 'Toko Berkah Jaya',
    customerPhone: '628123456789',
    addressText: 'Jl. Raya Tayu Km. 3, Tayu',
    odpCode: null,
    packageLabel: 'Home 10 Mbps',
    salesOwnerName: 'Dhimas',
    requestedInstallDate: '2026-07-23T14:00:00+07:00',
    status: 'DITOLAK',
    reviewNotes: 'Coverage tidak siap dan customer meminta pindah alamat setelah submit.',
    correctionNotes: 'Perlu input ulang setelah alamat final dan hasil coverage baru tersedia.',
    transferredTicketRef: null,
    createdAt: '2026-07-17T13:15:00+07:00',
    updatedAt: '2026-07-18T10:10:00+07:00',
    areaLabel: 'Tayu',
    escortNotes: 'Masih menunggu alamat final dari penjualan.',
    activityNotes: 'Jalur instalasi belum layak.',
    csPicName: 'Admin CS Sore',
    nextActionLabel: 'Tunggu submit ulang',
    auditSummary: ['Input Penjualan', 'Review CS', 'Ditolak karena data belum layak'],
  },
]

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolvePositiveInt(value: string | null) {
  const parsed = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizeText(value: string | null | undefined) {
  return String(value ?? '').trim().toUpperCase()
}

function buildSourceSnapshot() {
  const source = getDataSourceSnapshot()
  if (source.effectiveMode === 'review-db' && !source.isFallback) {
    return getFallbackDataSourceSnapshot(
      'List PSB fase 1 masih memakai mock operasional. Jalur review DB akan disambungkan pada batch write-side berikutnya tanpa mengganggu flow yang sudah stabil.',
    )
  }

  if (getConfiguredDataMode() === 'mock') {
    return source
  }

  return getFallbackDataSourceSnapshot(
    'List PSB fase 1 sementara memakai mock operasional karena sumber review DB khusus untuk domain ini belum dibuka.',
  )
}

export async function getPsbListPageData(query: PsbListQuery): Promise<PsbListPagePayload> {
  const state = {
    status: resolveSearchParam(query.status)?.trim().toUpperCase() || null,
    owner: resolveSearchParam(query.owner)?.trim() || null,
    q: resolveSearchParam(query.q)?.trim() || null,
    selected: resolveSearchParam(query.selected)?.trim() || null,
  }

  const searchNeedle = normalizeText(state.q)
  const filteredItems = mockPsbListItems
    .filter((item) => !state.status || item.status === state.status)
    .filter((item) => !state.owner || item.salesOwnerName === state.owner)
    .filter((item) => {
      if (!searchNeedle) {
        return true
      }

      return [
        item.psbListCode,
        item.customerName,
        item.customerPhone,
        item.addressText,
        item.odpCode,
        item.packageLabel,
        item.salesOwnerName,
        item.transferredTicketRef,
        item.areaLabel,
      ].some((value) => normalizeText(value).includes(searchNeedle))
    })

  const selectedId = resolvePositiveInt(state.selected)
  const selectedItem =
    filteredItems.find((item) => item.id === selectedId) ??
    filteredItems[0] ??
    null

  return {
    source: buildSourceSnapshot(),
    items: filteredItems,
    selectedItem,
    summary: {
      totalCount: filteredItems.length,
      baruCount: filteredItems.filter((item) => item.status === 'BARU').length,
      reviewCount: filteredItems.filter((item) => item.status === 'REVIEW_CS').length,
      correctionCount: filteredItems.filter((item) => item.status === 'PERLU_KOREKSI').length,
      approvedCount: filteredItems.filter((item) => item.status === 'DISETUJUI').length,
      rejectedCount: filteredItems.filter((item) => item.status === 'DITOLAK').length,
      transferredCount: filteredItems.filter((item) => item.status === 'DITRANSFER_KE_TICKETING').length,
    },
    ownerOptions: Array.from(new Set(mockPsbListItems.map((item) => item.salesOwnerName).filter(Boolean) as string[])).sort((a, b) =>
      a.localeCompare(b),
    ),
    state,
  }
}
