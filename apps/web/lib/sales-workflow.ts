export type SalesServiceType = 'HOME' | 'CORPORATE' | 'RESELLER'

export const SALES_SERVICE_TYPES: SalesServiceType[] = ['HOME', 'CORPORATE', 'RESELLER']

export function normalizeSalesServiceType(value: unknown): SalesServiceType | null {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (normalized === 'HOME' || normalized === 'CORPORATE' || normalized === 'RESELLER') {
    return normalized
  }
  if (normalized === 'DEDICATED') {
    return 'CORPORATE'
  }
  return null
}

export const SALES_LEAD_STATUSES_BY_TYPE: Record<SalesServiceType, readonly string[]> = {
  HOME: ['NEW', 'FOLLOW_UP', 'COVERAGE_CHECK', 'SURVEY_REQUEST', 'QUALIFIED', 'LOST'],
  CORPORATE: [
    'NEW',
    'QUALIFIED',
    'SURVEY_REQUEST',
    'FEASIBILITY_REVIEW',
    'QUOTATION_PREPARED',
    'INTERNAL_APPROVAL',
    'QUOTED',
    'NEGOTIATION',
    'CONTRACT_SIGNED',
    'WON',
    'LOST',
  ],
  RESELLER: ['NEW', 'FOLLOW_UP', 'QUALIFIED', 'ONBOARDING', 'ACTIVE', 'LOST'],
}

export const SALES_ORDER_STATUSES_BY_TYPE: Record<SalesServiceType, readonly string[]> = {
  HOME: ['REGISTERED', 'SURVEY_PENDING', 'READY_INSTALL', 'ON_PROCESS', 'INSTALLED', 'ACTIVATED', 'CANCELLED'],
  CORPORATE: [
    'QUALIFIED',
    'FEASIBILITY_REVIEW',
    'QUOTATION_PREPARED',
    'INTERNAL_APPROVAL',
    'CONTRACT_SIGNED',
    'DELIVERY_IN_PROGRESS',
    'TESTING',
    'ACCEPTED',
    'READY_ACTIVATION',
    'ACTIVATED',
    'CANCELLED',
  ],
  RESELLER: ['REGISTERED', 'READY_INSTALL', 'ON_PROCESS', 'ACTIVATED', 'CANCELLED'],
}

export function getLeadStatusOptions(leadType: SalesServiceType) {
  return [...(SALES_LEAD_STATUSES_BY_TYPE[leadType] ?? [])]
}

export function getOrderStatusOptions(leadType: SalesServiceType) {
  return [...(SALES_ORDER_STATUSES_BY_TYPE[leadType] ?? [])]
}

export function resolveLeadTypeGuardrailForOrder(leadType: SalesServiceType, leadStatus: string) {
  const normalizedStatus = String(leadStatus ?? '').trim().toUpperCase()
  if (leadType === 'HOME') {
    if (normalizedStatus !== 'QUALIFIED') {
      return {
        ok: false,
        message: 'Guardrail HOME: lead harus QUALIFIED dulu sebelum boleh dibuat order (no coverage/no survey/no order).',
      }
    }
  }

  if (leadType === 'CORPORATE') {
    if (!['CONTRACT_SIGNED', 'WON'].includes(normalizedStatus)) {
      return {
        ok: false,
        message: 'Guardrail CORPORATE: order delivery hanya boleh dibuat setelah kontrak signed (no contract/no delivery).',
      }
    }
  }

  if (leadType === 'RESELLER') {
    if (!['QUALIFIED', 'ACTIVE'].includes(normalizedStatus)) {
      return {
        ok: false,
        message: 'Guardrail RESELLER: lead harus QUALIFIED/ACTIVE sebelum boleh dibuat order.',
      }
    }
  }

  return { ok: true as const }
}

export function extractLeadTypeFromSuggestion(value: string): SalesServiceType | null {
  const parts = String(value ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
  const candidate = parts[1]
  return normalizeSalesServiceType(candidate)
}
