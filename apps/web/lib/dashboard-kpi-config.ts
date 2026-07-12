export const DASHBOARD_KPI_DIVISION_STRUCTURE = [
  {
    division: 'Pemasaran dan Pelayanan',
    subdivisions: ['Penjualan', 'CS', 'Admin CS', 'NOC', 'Troubleshoots', 'Dismantle', 'Creator Digital'],
  },
  {
    division: 'Teknis dan Expan',
    subdivisions: ['Teknisi PSB', 'Teknisi Jalur & Expan', 'Teknisi Jointer'],
  },
  {
    division: 'Finance dan HR',
    subdivisions: ['Billing', 'HR'],
  },
  {
    division: 'General Affair',
    subdivisions: ['Inventory', 'Legal'],
  },
  {
    division: 'Operasional',
    subdivisions: ['Kantor', 'Toko'],
  },
] as const

export const DASHBOARD_KPI_KEYS = [
  'SALES',
  'CS',
  'NOC',
  'TT',
  'DISMANTLE',
  'DIGITAL',
  'BILLING',
  'HR',
  'INVENTORY',
] as const

export const DASHBOARD_KPI_KEY_LABELS: Record<(typeof DASHBOARD_KPI_KEYS)[number], string> = {
  SALES: 'Penjualan',
  CS: 'CS',
  NOC: 'NOC',
  TT: 'Troubleshoots',
  DISMANTLE: 'Dismantle',
  DIGITAL: 'Creator Digital',
  BILLING: 'Billing',
  HR: 'HR',
  INVENTORY: 'Inventory',
}

export const DASHBOARD_KPI_TEMPLATE_OPTIONS = [
  { key: 'SALES_ACTIVE_LEADS', label: 'Lead Aktif' },
  { key: 'SALES_MONTHLY_ORDERS', label: 'Order Bulan Ini' },
  { key: 'SALES_MONTHLY_ACTIVATIONS', label: 'Aktivasi Bulan Ini' },
  { key: 'SALES_ACTIVATION_RATE', label: 'Rasio Aktivasi (%)' },
  { key: 'CS_ACTIVE_WORK_ORDERS', label: 'Work Order Aktif' },
  { key: 'CS_ACTIVE_ISOLATIONS', label: 'Isolasi Aktif' },
  { key: 'CS_MONTHLY_DISMANTLES', label: 'Dismantle Bulan Ini' },
  { key: 'SUPPORT_OPEN_TICKETS', label: 'Ticket Open' },
  { key: 'SUPPORT_SLA_OVERDUE', label: 'SLA Overdue' },
  { key: 'SUPPORT_MONTHLY_OPENED_TICKETS', label: 'Ticket Bulan Ini' },
  { key: 'SUPPORT_OVERDUE_RATE', label: 'Rasio Overdue (%)' },
  { key: 'TT_OPEN_TICKETS', label: 'TT Open' },
  { key: 'TT_NEED_ESCALATION', label: 'Perlu Eskalasi' },
  { key: 'TT_READY_CLOSE', label: 'Siap Close' },
  { key: 'DISMANTLE_OPEN_QUEUE', label: 'Queue Dismantle' },
  { key: 'DISMANTLE_FIELD_FOLLOW_UP', label: 'Follow Up Lapangan' },
  { key: 'DISMANTLE_CLOSED_THIS_PERIOD', label: 'Close Periode Ini' },
  { key: 'DIGITAL_LEADS', label: 'Lead Digital' },
  { key: 'DIGITAL_ORDERS', label: 'Order Digital' },
  { key: 'DIGITAL_SURVEYS', label: 'Survey Digital' },
  { key: 'BILLING_OVERDUE', label: 'Invoice Overdue' },
  { key: 'BILLING_PARTIAL', label: 'Payment Parsial' },
  { key: 'BILLING_SUSPEND_CANDIDATE', label: 'Suspend Candidate' },
  { key: 'BILLING_OVERDUE_AMOUNT', label: 'Nominal Overdue' },
  { key: 'HR_ACTIVE_EMPLOYEES', label: 'Employee Aktif' },
  { key: 'HR_TODAY_ATTENDANCE', label: 'Absensi Hari Ini' },
  { key: 'HR_ACTIVE_LOANS', label: 'Pinjaman Aktif' },
  { key: 'HR_ATTENDANCE_RATE', label: 'Rasio Kehadiran (%)' },
  { key: 'INVENTORY_ACTIVE_ITEMS', label: 'Item Aktif' },
  { key: 'INVENTORY_MONTHLY_MOVEMENTS', label: 'Mutasi Bulan Ini' },
  { key: 'INVENTORY_PENDING_REQUESTS', label: 'Request Pending' },
] as const

export const DASHBOARD_KPI_METRIC_TYPES = ['COUNT', 'SUM', 'PERCENTAGE'] as const

const DASHBOARD_KPI_TEMPLATE_DRILLDOWN_MAP: Record<string, string> = {
  SALES_ACTIVE_LEADS: '/sales?focus=ACTIVE_LEADS',
  SALES_MONTHLY_ORDERS: '/sales?focus=MONTHLY_ORDERS',
  SALES_MONTHLY_ACTIVATIONS: '/sales?focus=MONTHLY_ACTIVATIONS',
  SALES_ACTIVATION_RATE: '/sales?focus=ACTIVATION_RATE',
  CS_ACTIVE_WORK_ORDERS: '/sales?focus=ACTIVE_WORK_ORDERS',
  CS_ACTIVE_ISOLATIONS: '/support/isolations?focus=ACTIVE_ISOLATIONS',
  CS_MONTHLY_DISMANTLES: '/support/dismantle?focus=MONTHLY_DISMANTLES',
  SUPPORT_OPEN_TICKETS: '/support/tt?focus=OPEN_TICKETS',
  SUPPORT_SLA_OVERDUE: '/support/sla?focus=SLA_OVERDUE',
  SUPPORT_MONTHLY_OPENED_TICKETS: '/support/tt?focus=MONTHLY_OPENED',
  SUPPORT_OVERDUE_RATE: '/support/sla?focus=OVERDUE_RATE',
  TT_OPEN_TICKETS: '/support/tt?focus=OPEN_TICKETS',
  TT_NEED_ESCALATION: '/support/tt?focus=SLA_OVERDUE',
  TT_READY_CLOSE: '/support/tt?focus=READY_CLOSE',
  DISMANTLE_OPEN_QUEUE: '/support/dismantle?focus=OPEN_QUEUE',
  DISMANTLE_FIELD_FOLLOW_UP: '/support/dismantle?focus=FIELD_FOLLOW_UP',
  DISMANTLE_CLOSED_THIS_PERIOD: '/support/dismantle?focus=CLOSED_THIS_PERIOD',
  DIGITAL_LEADS: '/sales?focus=DIGITAL_LEADS',
  DIGITAL_ORDERS: '/sales?focus=DIGITAL_ORDERS',
  DIGITAL_SURVEYS: '/sales?focus=DIGITAL_SURVEYS',
  BILLING_OVERDUE: '/billing?focus=OVERDUE_INVOICES',
  BILLING_PARTIAL: '/billing?focus=PARTIAL_INVOICES',
  BILLING_SUSPEND_CANDIDATE: '/billing?focus=SUSPEND_CANDIDATES',
  BILLING_OVERDUE_AMOUNT: '/billing?focus=BILLING_OVERDUE_AMOUNT',
  HR_ACTIVE_EMPLOYEES: '/hr?focus=ACTIVE_EMPLOYEES',
  HR_TODAY_ATTENDANCE: '/hr?focus=TODAY_ATTENDANCE',
  HR_ACTIVE_LOANS: '/hr?focus=ACTIVE_LOANS',
  HR_ATTENDANCE_RATE: '/hr?focus=ATTENDANCE_RATE',
  INVENTORY_ACTIVE_ITEMS: '/inventory?focus=ACTIVE_ITEMS',
  INVENTORY_MONTHLY_MOVEMENTS: '/inventory?focus=MONTHLY_MOVEMENTS',
  INVENTORY_PENDING_REQUESTS: '/inventory?focus=PENDING_REQUESTS',
}

const DASHBOARD_KPI_TEMPLATE_METRIC_TYPE_MAP: Record<string, (typeof DASHBOARD_KPI_METRIC_TYPES)[number]> = {
  SALES_ACTIVATION_RATE: 'PERCENTAGE',
  SUPPORT_OVERDUE_RATE: 'PERCENTAGE',
  BILLING_OVERDUE_AMOUNT: 'SUM',
  HR_ATTENDANCE_RATE: 'PERCENTAGE',
}

export function getDashboardKpiDivisionOptions() {
  return DASHBOARD_KPI_DIVISION_STRUCTURE.map((item) => String(item.division))
}

export function getDashboardKpiSubdivisionOptions(division: string) {
  const found = DASHBOARD_KPI_DIVISION_STRUCTURE.find((item) => item.division === division)
  return found ? Array.from(found.subdivisions, (item) => String(item)) : []
}

export function isValidDashboardKpiDivision(value: string) {
  return DASHBOARD_KPI_DIVISION_STRUCTURE.some((item) => item.division === value)
}

export function isValidDashboardKpiSubdivision(division: string, subdivision: string) {
  const options = getDashboardKpiSubdivisionOptions(division)
  return options.includes(subdivision)
}

export function isValidDashboardKpiKey(value: string): value is (typeof DASHBOARD_KPI_KEYS)[number] {
  return DASHBOARD_KPI_KEYS.includes(value as (typeof DASHBOARD_KPI_KEYS)[number])
}

export function isValidDashboardKpiTemplate(value: string) {
  return DASHBOARD_KPI_TEMPLATE_OPTIONS.some((item) => item.key === value)
}

export function isValidDashboardKpiMetricType(value: string): value is (typeof DASHBOARD_KPI_METRIC_TYPES)[number] {
  return DASHBOARD_KPI_METRIC_TYPES.includes(value as (typeof DASHBOARD_KPI_METRIC_TYPES)[number])
}

export function resolveDashboardKpiTemplateDrilldown(templateKey: string) {
  const key = String(templateKey ?? '')
    .trim()
    .toUpperCase()
  return DASHBOARD_KPI_TEMPLATE_DRILLDOWN_MAP[key] ?? ''
}

export function resolveDashboardKpiTemplateMetricType(templateKey: string) {
  const key = String(templateKey ?? '')
    .trim()
    .toUpperCase()
  return DASHBOARD_KPI_TEMPLATE_METRIC_TYPE_MAP[key] ?? 'COUNT'
}
