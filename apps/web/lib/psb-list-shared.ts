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
  transferredWorkOrderId: number | null
  createdAt: string | null
  updatedAt: string | null
  areaLabel: string | null
  googleMapsLink: string | null
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
  renderLimit: number
  state: {
    status: string | null
    owner: string | null
    q: string | null
    selected: string | null
  }
}

export type PsbListTransitionAction =
  | 'SUBMIT_REVIEW'
  | 'REQUEST_CORRECTION'
  | 'APPROVE'
  | 'REJECT'
  | 'TRANSFER'

export function resolvePsbListAvailableActions(params: {
  status: PsbListStatus
  canUpdate: boolean
  canApprove: boolean
}) {
  const actions: PsbListTransitionAction[] = []

  if (params.canUpdate && (params.status === 'BARU' || params.status === 'PERLU_KOREKSI')) {
    actions.push('SUBMIT_REVIEW')
  }
  if (params.canUpdate && params.status === 'REVIEW_CS') {
    actions.push('REQUEST_CORRECTION')
  }
  if (params.canApprove && params.status === 'REVIEW_CS') {
    actions.push('APPROVE', 'REJECT')
  }
  if (params.canApprove && params.status === 'DISETUJUI') {
    actions.push('TRANSFER')
  }

  return actions
}

export function getPsbListActionLabel(action: PsbListTransitionAction) {
  switch (action) {
    case 'SUBMIT_REVIEW':
      return 'Masuk Review CS'
    case 'REQUEST_CORRECTION':
      return 'Minta Koreksi'
    case 'APPROVE':
      return 'Setujui'
    case 'REJECT':
      return 'Tolak'
    case 'TRANSFER':
      return 'Transfer Ticketing'
    default:
      return action
  }
}
