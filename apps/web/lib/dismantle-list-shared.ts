import type { DataSourceSnapshot } from '@/lib/types'

export type DismantleListStatus =
  | 'BARU'
  | 'REVIEW_CS'
  | 'PERLU_KOREKSI'
  | 'DITRANSFER_KE_TICKETING'
  | 'BATAL'

export type DismantleListItem = {
  id: number
  dismantleListCode: string
  sourceIsolationRef: string | null
  customerName: string
  customerPhone: string | null
  serviceRef: string | null
  addressText: string
  odpCode: string | null
  isolationStartedAt: string | null
  eligibleAt: string | null
  status: DismantleListStatus
  reviewNotes: string | null
  correctionNotes: string | null
  transferredTicketRef: string | null
  transferredWorkOrderId: number | null
  createdAt: string | null
  updatedAt: string | null
  areaLabel: string | null
  csPicName: string | null
  terminationReason: string | null
  nextActionLabel: string
  supportHistoryId: number | null
  supportClosedAt: string | null
  inventoryItemCodes: string[]
  auditSummary: string[]
}

export type DismantleListQuery = {
  status?: string | string[]
  owner?: string | string[]
  q?: string | string[]
  selected?: string | string[]
}

export type DismantleListPagePayload = {
  source: DataSourceSnapshot
  items: DismantleListItem[]
  selectedItem: DismantleListItem | null
  summary: {
    totalCount: number
    baruCount: number
    reviewCount: number
    correctionCount: number
    transferredCount: number
    canceledCount: number
  }
  ownerOptions: string[]
  state: {
    status: string | null
    owner: string | null
    q: string | null
    selected: string | null
  }
}

export type DismantleListTransitionAction =
  | 'SUBMIT_REVIEW'
  | 'REQUEST_CORRECTION'
  | 'TRANSFER'
  | 'CANCEL'
  | 'REOPEN'

export function resolveDismantleListAvailableActions(params: {
  status: DismantleListStatus
  canUpdate: boolean
  canApprove: boolean
}) {
  const actions: DismantleListTransitionAction[] = []

  if (params.canUpdate && (params.status === 'BARU' || params.status === 'PERLU_KOREKSI')) {
    actions.push('SUBMIT_REVIEW')
  }
  if (params.canUpdate && params.status === 'REVIEW_CS') {
    actions.push('REQUEST_CORRECTION')
  }
  if (params.canApprove && params.status === 'REVIEW_CS') {
    actions.push('TRANSFER', 'CANCEL')
  }
  if (params.canApprove && params.status === 'BATAL') {
    actions.push('REOPEN')
  }

  return actions
}

export function getDismantleListActionLabel(action: DismantleListTransitionAction) {
  switch (action) {
    case 'SUBMIT_REVIEW':
      return 'Masuk Review CS'
    case 'REQUEST_CORRECTION':
      return 'Minta Koreksi'
    case 'TRANSFER':
      return 'Transfer Ticketing'
    case 'CANCEL':
      return 'Batalkan'
    case 'REOPEN':
      return 'Buka Ulang'
    default:
      return action
  }
}
