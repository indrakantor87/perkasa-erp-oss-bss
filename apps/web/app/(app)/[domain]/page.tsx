import { notFound, redirect } from 'next/navigation'
import { canAccessPath } from '@/lib/access-control-server'
import { BillingDomainWorkspace } from '@/components/billing-domain-workspace'
import { DomainShell } from '@/components/domain-shell'
import { SalesDomainWorkspace } from '@/components/sales-domain-workspace'
import { requireSession } from '@/lib/auth'
import { getDomainPageData } from '@/lib/services/domain-service'
import { normalizeSupportLane } from '@/lib/support-lanes'
import type { DomainFormPrefill, DomainKey, SupportDrilldownContext, SupportLaneKey } from '@/lib/types'

const enabledDomains: DomainKey[] = ['sales', 'customers', 'support', 'inventory', 'hr', 'billing']

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function resolveSupportDrilldown(
  lane: SupportLaneKey | null | undefined,
  focus: string | undefined,
): SupportDrilldownContext | undefined {
  const normalized = String(focus ?? '')
    .trim()
    .toUpperCase()

  if (!lane || !normalized) {
    return undefined
  }

  if (lane === 'sla' && normalized === 'SLA_OVERDUE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Ticket Overdue',
      detail: 'Lane ini difokuskan ke ticket dengan SLA yang sudah overdue agar operator bisa langsung mengamankan backlog kritis.',
      clearHref: '/support?lane=sla',
    }
  }

  if (lane === 'sla' && normalized === 'OVERDUE_RATE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Rasio Overdue',
      detail:
        'Lane ini dibuka dari KPI rasio overdue, sehingga operator membaca ticket overdue sebagai pembilang utama terhadap ticket open yang masih aktif.',
      clearHref: '/support?lane=sla',
    }
  }

  if (lane === 'tt' && normalized === 'OPEN_TICKETS') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Trouble Ticket Open',
      detail: 'Lane ini difokuskan ke ticket aktif yang masih membutuhkan progress, follow-up, atau eskalasi operasional.',
      clearHref: '/support?lane=tt',
    }
  }

  if (lane === 'tt' && normalized === 'MONTHLY_OPENED') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Ticket Periode Ini',
      detail: 'Lane ini dibuka dari KPI periode berjalan agar operator cepat membaca antrean trouble ticket terbaru pada bulan aktif.',
      clearHref: '/support?lane=tt',
    }
  }

  if (lane === 'tt' && normalized === 'READY_CLOSE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Ticket Siap Close',
      detail: 'Lane ini dipersempit ke ticket yang sudah punya progress valid dan siap masuk ke jalur close formal.',
      clearHref: '/support?lane=tt',
    }
  }

  if (lane === 'isolations' && normalized === 'ACTIVE_ISOLATIONS') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Isolir Aktif',
      detail: 'Lane ini difokuskan ke kasus isolir aktif yang perlu sinkron billing, restore, atau keputusan lanjut lapangan.',
      clearHref: '/support?lane=isolations',
    }
  }

  if (lane === 'dismantle' && normalized === 'RECENT_DISMANTLE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Dismantle Periode Ini',
      detail: 'Lane ini dibuka untuk meninjau kebutuhan persetujuan dan penutupan dismantle terbaru pada periode aktif.',
      clearHref: '/support?lane=dismantle',
    }
  }

  if (lane === 'dismantle' && normalized === 'OPEN_QUEUE') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Queue Dismantle Open',
      detail: 'Lane ini dipersempit ke kandidat terminate yang masih aktif di queue dismantle dan belum masuk histori close.',
      clearHref: '/support?lane=dismantle',
    }
  }

  if (lane === 'dismantle' && normalized === 'FIELD_FOLLOW_UP') {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Follow Up Lapangan',
      detail: 'Lane ini menyorot antrean dismantle open yang masih menunggu tindak lanjut lapangan sebelum bisa ditutup permanen.',
      clearHref: '/support?lane=dismantle',
    }
  }

  if (lane === 'dismantle' && (normalized === 'CLOSED_THIS_PERIOD' || normalized === 'MONTHLY_DISMANTLES')) {
    return {
      key: normalized,
      label: 'Fokus KPI Proses: Dismantle Close Periode Ini',
      detail: 'Lane ini dipersempit ke histori dismantle yang benar-benar ditutup pada periode aktif agar sinkron dengan KPI dashboard.',
      clearHref: '/support?lane=dismantle',
    }
  }

  return undefined
}

function resolveDomainDrilldown(domain: DomainKey, focus: string | undefined) {
  const normalized = String(focus ?? '')
    .trim()
    .toUpperCase()

  if (!normalized || domain === 'support') {
    return undefined
  }

  if (domain === 'sales') {
    if (normalized === 'ACTIVE_LEADS' || normalized === 'DIGITAL_LEADS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Lead Aktif',
        detail: 'Daftar sales dipersempit ke lead terbaru agar tim bisa langsung membaca funnel awal sesuai KPI yang dipilih.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'MONTHLY_ORDERS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Order Periode Ini',
        detail: 'Daftar sales dipersempit ke order yang benar-benar tercatat pada periode dashboard agar angka PSB mengikuti rule KPI yang sama.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'DIGITAL_ORDERS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Order Digital Periode Ini',
        detail: 'Daftar sales dipersempit ke order digital pada periode dashboard agar KPI digital tidak bercampur dengan source lain.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'ACTIVE_WORK_ORDERS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Work Order Aktif',
        detail: 'Daftar sales dipersempit ke work order aktif agar backlog lapangan tidak lagi diarahkan ke lane support yang salah.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'DIGITAL_SURVEYS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Survey Digital Periode Ini',
        detail: 'Daftar sales dipersempit ke survey digital pada periode dashboard agar basis query tetap 1:1 dengan KPI kartu.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'MONTHLY_ACTIVATIONS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Aktivasi Periode Ini',
        detail: 'Daftar sales dipersempit ke subscription aktivasi terbaru agar progres PSB yang sudah aktif cepat terlihat.',
        clearHref: '/sales',
      }
    }
    if (normalized === 'ACTIVATION_RATE') {
      return {
        key: normalized,
        label: 'Fokus KPI: Rasio Aktivasi',
        detail:
          'Daftar sales menampilkan order periode aktif dan subscription yang sudah teraktivasi agar pembilang serta penyebut rasio bisa dibaca pada konteks yang sama.',
        clearHref: '/sales',
      }
    }
  }

  if (domain === 'billing') {
    if (normalized === 'OVERDUE_INVOICES') {
      return {
        key: normalized,
        label: 'Fokus KPI: Invoice Overdue',
        detail: 'Daftar billing dipersempit ke invoice overdue agar follow up, suspend, dan reconnect lebih cepat diprioritaskan.',
        clearHref: '/billing',
      }
    }
    if (normalized === 'BILLING_OVERDUE_AMOUNT') {
      return {
        key: normalized,
        label: 'Fokus KPI: Nominal Overdue',
        detail:
          'Daftar billing dipersempit ke invoice overdue dengan outstanding terbesar agar prioritas collection mengikuti nominal tagihan yang paling berat.',
        clearHref: '/billing',
      }
    }
    if (normalized === 'PARTIAL_INVOICES' || normalized === 'PARTIAL_PAYMENTS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Payment Parsial',
        detail: 'Daftar billing dipersempit ke invoice parsial agar tim bisa mengamankan pembayaran yang masih menggantung.',
        clearHref: '/billing',
      }
    }
    if (normalized === 'SUSPEND_CANDIDATES') {
      return {
        key: normalized,
        label: 'Fokus KPI: Suspend Candidates',
        detail: 'Daftar billing dipersempit ke antrean suspend-ready agar eksekusi suspend dan kontrol dampaknya lebih fokus.',
        clearHref: '/billing',
      }
    }
  }

  if (domain === 'hr') {
    if (normalized === 'TODAY_ATTENDANCE') {
      return {
        key: normalized,
        label: 'Fokus KPI: Absensi Hari Ini',
        detail: 'Daftar HR dipersempit ke rekap attendance hari ini agar monitoring disiplin kerja lebih cepat.',
        clearHref: '/hr',
      }
    }
    if (normalized === 'ATTENDANCE_RATE') {
      return {
        key: normalized,
        label: 'Fokus KPI: Rasio Kehadiran',
        detail:
          'Daftar HR menampilkan employee aktif dan attendance hari ini agar rasio kehadiran dibaca dari pembilang dan penyebut yang sama dengan kartu dashboard.',
        clearHref: '/hr',
      }
    }
    if (normalized === 'ACTIVE_LOANS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Pinjaman Aktif',
        detail: 'Daftar HR dipersempit ke loan terbaru agar kontrol pinjaman karyawan tidak tertinggal.',
        clearHref: '/hr',
      }
    }
    if (normalized === 'ACTIVE_EMPLOYEES') {
      return {
        key: normalized,
        label: 'Fokus KPI: Employee Aktif',
        detail: 'Daftar HR dipersempit ke employee terbaru agar master HR mudah diaudit sebelum payroll dan attendance diperluas.',
        clearHref: '/hr',
      }
    }
  }

  if (domain === 'inventory') {
    if (normalized === 'PENDING_REQUESTS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Request Pending',
        detail: 'Daftar inventory dipersempit ke request yang masih pending agar gudang bisa segera memproses antrean teknisi.',
        clearHref: '/inventory',
      }
    }
    if (normalized === 'MONTHLY_MOVEMENTS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Mutasi Bulan Ini',
        detail: 'Daftar inventory dipersempit ke stock movement terbaru agar audit keluar/masuk barang lebih fokus.',
        clearHref: '/inventory',
      }
    }
    if (normalized === 'ACTIVE_ITEMS') {
      return {
        key: normalized,
        label: 'Fokus KPI: Item Aktif',
        detail: 'Daftar inventory dipersempit ke item master terbaru agar stok aktif dan minimum stock mudah dipantau.',
        clearHref: '/inventory',
      }
    }
  }

  return undefined
}

function resolvePositiveIntegerParam(value: string | string[] | undefined) {
  const resolved = resolveSearchParam(value)
  const parsed = Number(resolved)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export function generateStaticParams() {
  return enabledDomains.map((domain) => ({ domain }))
}

export default async function DomainPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>
  searchParams: Promise<{
    lane?: string | string[]
    month?: string | string[]
    year?: string | string[]
    ticket?: string | string[]
    isolation?: string | string[]
    type?: string | string[]
    focus?: string | string[]
    lead?: string | string[]
    order?: string | string[]
    invoice?: string | string[]
    service?: string | string[]
    request?: string | string[]
    employee?: string | string[]
    attendance?: string | string[]
    loan?: string | string[]
    payroll?: string | string[]
  }>
}) {
  const session = await requireSession()

  const { domain } = await params
  const resolvedSearchParams = await searchParams
  if (!canAccessPath(session.role, `/${domain}`)) {
    redirect('/dashboard')
  }

  const payload = await getDomainPageData(domain as DomainKey, session.role, {
    supportLane: normalizeSupportLane(resolvedSearchParams.lane),
    focus: resolveSearchParam(resolvedSearchParams.focus),
    month: resolvePositiveIntegerParam(resolvedSearchParams.month),
    year: resolvePositiveIntegerParam(resolvedSearchParams.year),
  })

  if (!payload) {
    notFound()
  }

  const domainPrefill: DomainFormPrefill = {
    lead: resolveSearchParam(resolvedSearchParams.lead),
    order: resolveSearchParam(resolvedSearchParams.order),
    invoice: resolveSearchParam(resolvedSearchParams.invoice),
    service: resolveSearchParam(resolvedSearchParams.service),
    request: resolveSearchParam(resolvedSearchParams.request),
    employee: resolveSearchParam(resolvedSearchParams.employee),
    attendance: resolveSearchParam(resolvedSearchParams.attendance),
    loan: resolveSearchParam(resolvedSearchParams.loan),
    payroll: resolveSearchParam(resolvedSearchParams.payroll),
  }
  const resolvedDomainDrilldown = resolveDomainDrilldown(domain as DomainKey, resolveSearchParam(resolvedSearchParams.focus))

  if ((domain as DomainKey) === 'sales') {
    return (
      <SalesDomainWorkspace
        content={payload.content}
        source={payload.source}
        capabilities={payload.capabilities}
        role={session.role}
        domainPrefill={domainPrefill}
        domainDrilldown={
          resolvedDomainDrilldown
            ? {
                ...resolvedDomainDrilldown,
                month: resolvePositiveIntegerParam(resolvedSearchParams.month),
                year: resolvePositiveIntegerParam(resolvedSearchParams.year),
              }
            : undefined
        }
      />
    )
  }

  if ((domain as DomainKey) === 'billing') {
    return (
      <BillingDomainWorkspace
        content={payload.content}
        source={payload.source}
        capabilities={payload.capabilities}
        role={session.role}
        domainPrefill={domainPrefill}
        domainDrilldown={
          resolvedDomainDrilldown
            ? {
                ...resolvedDomainDrilldown,
                month: resolvePositiveIntegerParam(resolvedSearchParams.month),
                year: resolvePositiveIntegerParam(resolvedSearchParams.year),
              }
            : undefined
        }
      />
    )
  }

  return (
    <DomainShell
      content={payload.content}
      source={payload.source}
      capabilities={payload.capabilities}
      role={session.role}
      supportFocus={payload.supportFocus}
      supportPrefill={{
        ticket: resolveSearchParam(resolvedSearchParams.ticket),
        isolation: resolveSearchParam(resolvedSearchParams.isolation),
        type: resolveSearchParam(resolvedSearchParams.type),
      }}
      domainPrefill={domainPrefill}
      domainDrilldown={
        resolvedDomainDrilldown
          ? {
              ...resolvedDomainDrilldown,
              month: resolvePositiveIntegerParam(resolvedSearchParams.month),
              year: resolvePositiveIntegerParam(resolvedSearchParams.year),
            }
          : undefined
      }
      supportDrilldown={resolveSupportDrilldown(
        normalizeSupportLane(resolvedSearchParams.lane),
        resolveSearchParam(resolvedSearchParams.focus),
      )}
    />
  )
}
