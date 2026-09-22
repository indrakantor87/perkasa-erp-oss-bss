import { redirect } from 'next/navigation'
import TechnicianLanePageClient from '@/components/technician/TechnicianLanePageClient'
import { getSession, requireSession } from '@/lib/auth'
import {
  getTechnicianLaneTickets,
  getTechnicianLaneTicketDetail,
  type TechnicianLaneQuery,
} from '@/lib/services/technician-lane-service'

const LANE_KEY = 'EXPAN'
const LANE_TITLE = 'Lane Expan (Perluasan Jaringan)'
const LANE_EYEBROW = 'Lapangan • Support'
const LANE_DESCRIPTION =
  'Daftar tiket Expan / Perluasan Jaringan yang ditugaskan kepada Anda. Koordinasikan dengan team jalur untuk penarikan kabel FO baru, update status pengerjaan, dan lampirkan evidence coverage area.'
const TICKET_TYPE_LABEL = 'EXPAN'

function resolveSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function TeknisiExpanLanePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireSession()
  const roleUp = String(session?.role ?? '').trim().toUpperCase()
  const isFieldTech = roleUp === 'FIELD_TECHNICIAN'
  const canAccess =
    isFieldTech ||
    roleUp === 'TT_OPERATOR' ||
    roleUp === 'NOC_OPERATOR' ||
    roleUp === 'SUPER_ADMIN' ||
    roleUp === 'ADMIN'

  if (!canAccess) {
    redirect('/login?error=forbidden')
  }

  const qParam = resolveSearchParam((await searchParams)?.q) ?? ''
  const statusParam = resolveSearchParam((await searchParams)?.status) ?? ''
  const priorityParam = resolveSearchParam((await searchParams)?.priority) ?? ''
  const query: TechnicianLaneQuery = {
    q: qParam || undefined,
    status: statusParam || undefined,
    priority: priorityParam || undefined,
  }

  const payload = await getTechnicianLaneTickets(LANE_KEY, query, session)
  const sessionUserId = Number(session?.userId ?? 0)
  const detailsById: Record<number, Awaited<ReturnType<typeof getTechnicianLaneTicketDetail>>> = {}

  for (const row of payload.items.slice(0, 20)) {
    detailsById[row.id] = await getTechnicianLaneTicketDetail(row.id, session)
  }

  return (
    <TechnicianLanePageClient
      laneTitle={LANE_TITLE}
      laneKey={LANE_KEY}
      eyebrow={LANE_EYEBROW}
      description={LANE_DESCRIPTION}
      ticketTypeLabel={TICKET_TYPE_LABEL}
      sessionUserId={sessionUserId}
      items={payload.items}
      counters={payload.counters}
      countersError={payload.error}
      error={payload.error}
      q={qParam}
      status={statusParam}
      priority={priorityParam}
      detailsById={detailsById}
    />
  )
}

