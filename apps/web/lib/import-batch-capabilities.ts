import type { BatchCapabilityDefinition, BatchScopeName, RowDomain } from '@/lib/types'

export const BATCH_SCOPE_NAMES: readonly BatchScopeName[] = [
  'USER_AND_ORDER',
  'BILLING',
  'INVENTORY',
  'HR',
  'CUSTOMER_REVIEW',
  'SUPPORT_REVIEW',
] as const

export const REQUIRED_BATCH_CAPABILITIES: readonly BatchCapabilityDefinition[] = [
  {
    scope: 'USER_AND_ORDER',
    displayName: 'User, Customer & Order (termasuk Coverage & Marketing)',
    domainPrimer: 'SALES',
    domainTercover: ['ALL', 'USER', 'CUSTOMER', 'SALES', 'SUPPORT'],
    description:
      'Import user auth, customer CRM, sales order/subscription/work order, coverage area, marketing activity, dan support ticket.',
    targetEntities: [
      'auth_users',
      'crm_customers',
      'crm_customer_addresses',
      'sales_orders',
      'service_subscriptions',
      'service_work_orders',
      'sales_covered_areas',
      'sales_marketing_activities',
      'support_*',
    ],
    sheetCount: 7,
    transformStageCoverage: { min: '01', max: '03' },
    requiredForOperator: true,
    supported: true,
  },
  {
    scope: 'BILLING',
    displayName: 'Billing Invoice, Item, Payment, Collection',
    domainPrimer: 'BILLING',
    domainTercover: ['ALL', 'BILLING', 'CUSTOMER'],
    description: 'Import invoice/tagihan, item tagihan, payment, dan collection action chain.',
    targetEntities: ['billing_invoices', 'billing_items', 'billing_payments', 'billing_collections'],
    sheetCount: 4,
    transformStageCoverage: { min: '04', max: '04' },
    requiredForOperator: true,
    supported: true,
  },
  {
    scope: 'INVENTORY',
    displayName: 'Inventory Items, Stock Movement, Network ODP',
    domainPrimer: 'INVENTORY',
    domainTercover: ['ALL', 'INVENTORY', 'HR'],
    description: 'Import master item inventory, stock movement, dan network ODP.',
    targetEntities: ['inventory_items', 'inventory_stock_movements', 'network_odp'],
    sheetCount: 3,
    transformStageCoverage: { min: '01', max: '01' },
    requiredForOperator: true,
    supported: true,
  },
  {
    scope: 'HR',
    displayName: 'HR Employee, Attendance, Salary, Loan',
    domainPrimer: 'HR',
    domainTercover: ['ALL', 'HR'],
    description: 'Import data karyawan, attendance, salary slip, dan pinjaman karyawan.',
    targetEntities: [
      'hr_employees',
      'hr_attendance_records',
      'hr_salary_records',
      'hr_loan_records',
    ],
    sheetCount: 4,
    transformStageCoverage: { min: '01', max: '01' },
    requiredForOperator: true,
    supported: true,
  },
  {
    scope: 'CUSTOMER_REVIEW',
    displayName: 'Customer Saja (Audit Review)',
    domainPrimer: 'CUSTOMER',
    domainTercover: ['CUSTOMER'],
    description: 'Scope khusus review customer saja tanpa order/support.',
    targetEntities: ['crm_customers', 'crm_customer_addresses'],
    sheetCount: 1,
    transformStageCoverage: { min: '02', max: '02' },
    requiredForOperator: true,
    supported: true,
  },
  {
    scope: 'SUPPORT_REVIEW',
    displayName: 'Support Ticket Saja (Audit Review)',
    domainPrimer: 'SUPPORT',
    domainTercover: ['SUPPORT'],
    description: 'Scope khusus review support ticket isolation/dismantle saja.',
    targetEntities: ['support_*'],
    sheetCount: 1,
    transformStageCoverage: { min: '03', max: '03' },
    requiredForOperator: true,
    supported: true,
  },
] as const

export function isBatchScopeSupported(scope: string): scope is BatchScopeName {
  const raw = (scope ?? '').trim()
  const normalized = raw.endsWith('_SAMPLE') ? raw.slice(0, -('_SAMPLE'.length)) : raw
  return (BATCH_SCOPE_NAMES as readonly string[]).includes(normalized)
}

export function getBatchScopeCapability(
  scope: string
): BatchCapabilityDefinition | undefined {
  const raw = (scope ?? '').trim()
  const normalized = raw.endsWith('_SAMPLE') ? raw.slice(0, -('_SAMPLE'.length)) : raw
  return REQUIRED_BATCH_CAPABILITIES.find((cap) => cap.scope === normalized)
}
