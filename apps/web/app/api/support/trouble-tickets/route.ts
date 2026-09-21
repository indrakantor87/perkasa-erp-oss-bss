import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, hasReviewDbColumn, runReviewDbExecute, runReviewDbQuery } from '@/lib/review-db'
import {
  buildServiceWorkOrderInsertPayload,
  ensureSupportTroubleTicketBranchColumn,
  generateServiceWorkOrderNo,
  insertServiceWorkOrderAssignment,
  insertServiceWorkOrderStatusLog,
  isBranchIdInScope,
  resolveReviewAuthUserIdByUsername,
  validateTargetTechnicianUser,
} from '@/lib/services/field-ops-service'
import { createUnifiedTicketAndSyncLegacy, ensureTicketsUnifiedTable } from '../../../../lib/services/unified-ticket-service'

const allowedCategories = new Set(['TT', 'PV'])
const allowedStatuses = new Set(['OPEN', 'ON_PROGRESS'])
const allowedPriorities = new Set(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
const allowedFieldStatuses = new Set(['OPEN', 'SCHEDULED', 'ON_PROGRESS'])
const allowedFieldWorkTypes = new Set(['INSTALLATION', 'REPAIR', 'DISMANTLE', 'RELOCATION'])
const allowedJobCategories = new Set(['TROUBLE', 'JOINTER', 'JALUR', 'EXPAN'])
const allowedParentTicketTypes = new Set([
  'KONEKSI',
  'LATENCY',
  'PREVENTIVE',
  'HARDWARE',
  'BILLING',
  'DISMANTLE',
  'JALUR',
  'PSB',
  'LAINNYA',
])

const TT_V2_SECTION_MARKER = '[TT V2 FIELDS]'
const TT_V2_FIELD_SEP = ' | '
type TroubleTicketV2Meta = Partial<{
  'NO WA': string
  'LINK MAPS': string
  PAKET: string
  ONT: string
  'JENIS GANGGUAN': string
  CATEGORY: string
  SOURCE: string
  'CREATED BY': string
}>

function buildTroubleTicketV2MetaBlock(meta: TroubleTicketV2Meta) {
  const entries = Object.entries(meta).filter(([, value]) => value != null && String(value).trim() !== '')
  if (!entries.length) return ''
  const inline = entries
    .map(([key, value]) => `${key}: ${String(value).replace(/\s+/g, ' ').trim()}`)
    .join(TT_V2_FIELD_SEP)
  return `${TT_V2_SECTION_MARKER} ${inline}`
}

function extractTroubleTicketV2Meta(notes: string | null | undefined): TroubleTicketV2Meta & { rawNotesClean: string } {
  const raw = String(notes ?? '')
  const markerIndex = raw.indexOf(TT_V2_SECTION_MARKER)
  const rawNotesClean = (markerIndex >= 0 ? raw.slice(0, markerIndex) : raw).replace(/\s{2,}/g, ' ').trim()
  const inlineBlock = markerIndex >= 0 ? raw.slice(markerIndex + TT_V2_SECTION_MARKER.length).trim() : ''
  const meta: TroubleTicketV2Meta = {}
  if (inlineBlock) {
    for (const chunk of inlineBlock.split(TT_V2_FIELD_SEP)) {
      const trimmed = chunk.trim()
      if (!trimmed) continue
      const firstColon = trimmed.indexOf(':')
      if (firstColon < 0) continue
      const key = trimmed.slice(0, firstColon).trim() as keyof TroubleTicketV2Meta
      const value = trimmed.slice(firstColon + 1).trim()
      meta[key] = value
    }
  }
  return { ...meta, rawNotesClean }
}

type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

type TicketCodeRow = {
  ticketCode: string
}

type LinkedSubscriptionRow = {
  subscriptionId: number
  customerId: number
  serviceNo: string | null
  customerCode: string | null
  customerName: string
  branchId: number | null
}

type TroubleTypeRow = {
  troubleType: string
}

type ExecuteResult = {
  insertId?: number
  affectedRows?: number
}

function padSequence(value: number) {
  return String(value).padStart(4, '0')
}

function resolveOptionalPositiveInt(value: unknown) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function resolveOptionalDate(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) {
    return null
  }

  const parsed = new Date(raw)
  return Number.isFinite(parsed.getTime()) ? parsed : null
}

async function generateTicketCode(category: string) {
  const prefix = category === 'PV' ? 'PV' : 'TT'
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const likePrefix = `${prefix}-${year}${month}-%`
  const rows = await runReviewDbQuery<TicketCodeRow>(
    `
      SELECT ticket_code AS ticketCode
      FROM support_trouble_tickets
      WHERE ticket_code LIKE ?
      ORDER BY id DESC
      LIMIT 1
    `,
    [likePrefix],
  )
  const currentCode = rows[0]?.ticketCode ?? ''
  const lastSequence = Number.parseInt(currentCode.split('-').pop() ?? '0', 10)
  return `${prefix}-${year}${month}-${padSequence(Number.isFinite(lastSequence) ? lastSequence + 1 : 1)}`
}

async function resolveLinkedSubscription(serviceReference: string) {
  const [linkedSubscription] = await runReviewDbQuery<LinkedSubscriptionRow>(
    `
      SELECT
        ss.id AS subscriptionId,
        ss.customer_id AS customerId,
        ss.service_no AS serviceNo,
        c.customer_code AS customerCode,
        c.full_name AS customerName,
        c.branch_id AS branchId
      FROM service_subscriptions ss
      INNER JOIN crm_customers c
        ON c.id = ss.customer_id
      WHERE ss.status IN ('ACTIVE', 'PENDING')
        AND (
          UPPER(ss.service_no) = UPPER(?)
          OR UPPER(c.customer_code) = UPPER(?)
        )
      ORDER BY
        CASE
          WHEN UPPER(ss.service_no) = UPPER(?) THEN 0
          ELSE 1
        END ASC,
        ss.id DESC
      LIMIT 1
    `,
    [serviceReference, serviceReference, serviceReference],
  )

  return linkedSubscription ?? null
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'support', 'create')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Write action support hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const payload = (await request.json()) as {
      serviceReference?: unknown
      customerName?: unknown
      customerUser?: unknown
      category?: unknown
      type?: unknown
      typeParent?: unknown
      status?: unknown
      problemCategory?: unknown
      jenisGangguan?: unknown
      customerWhatsapp?: unknown
      noWa?: unknown
      linkMaps?: unknown
      packagePlan?: unknown
      paket?: unknown
      ontSerial?: unknown
      ont?: unknown
      ticketSource?: unknown
      createFieldWorkOrder?: unknown
      workOrderStatus?: unknown
      fieldWorkType?: unknown
      jobCategory?: unknown
      priority?: unknown
      currentPicUserId?: unknown
      scheduledAt?: unknown
      address?: unknown
      notes?: unknown
    }

    const serviceReference = String(payload.serviceReference ?? '').trim()
    const customerName = String(payload.customerName ?? '').trim()
    const customerUser = String(payload.customerUser ?? '').trim()
    const category = String(payload.category ?? '').trim().toUpperCase()
    const typeRaw = String(payload.type ?? '').trim().toUpperCase()
    const typeParentRaw = String(payload.typeParent ?? payload.type ?? '').trim().toUpperCase()
    const parentTicketType = allowedParentTicketTypes.has(typeParentRaw) ? typeParentRaw : typeRaw
    const legacyType = allowedParentTicketTypes.has(typeRaw) ? typeRaw : 'KONEKSI'
    const type = typeRaw || legacyType
    const status = String(payload.status ?? '').trim().toUpperCase()
    const problemCategoryOld = String(payload.problemCategory ?? '').trim()
    const jenisGangguan = String(payload.jenisGangguan ?? '').trim()
    const customerWhatsapp = String(payload.customerWhatsapp ?? payload.noWa ?? '').trim()
    const linkMaps = String(payload.linkMaps ?? '').trim()
    const packagePlan = String(payload.packagePlan ?? payload.paket ?? '').trim()
    const ontSerial = String(payload.ontSerial ?? payload.ont ?? '').trim()
    const ticketSource = String(payload.ticketSource ?? '').trim() || 'NOC_OPERATOR_MANUAL'
    const resolvedProblemCategory = jenisGangguan || problemCategoryOld || null
    const createFieldWorkOrder = ['1', 'true', 'yes', 'on'].includes(
      String(payload.createFieldWorkOrder ?? '')
        .trim()
        .toLowerCase(),
    )
    const workOrderStatus = String(payload.workOrderStatus ?? 'OPEN').trim().toUpperCase()
    const fieldWorkType = String(payload.fieldWorkType ?? 'REPAIR').trim().toUpperCase()
    const jobCategoryRaw = String(payload.jobCategory ?? 'TROUBLE').trim().toUpperCase()
    const priorityRaw = String(payload.priority ?? 'MEDIUM').trim().toUpperCase()
    const currentPicUserId = resolveOptionalPositiveInt(payload.currentPicUserId)
    const scheduledAt = resolveOptionalDate(payload.scheduledAt)
    const address = String(payload.address ?? '').trim()
    const notesRaw = String(payload.notes ?? '').trim()
    const priority: WorkOrderPriority = allowedPriorities.has(priorityRaw) ? (priorityRaw as WorkOrderPriority) : 'MEDIUM'
    const jobCategory = allowedJobCategories.has(jobCategoryRaw) ? jobCategoryRaw : 'TROUBLE'

    if (!serviceReference) {
      return Response.json({ message: 'Service No atau Customer Code wajib diisi.' }, { status: 400 })
    }
    if (!allowedCategories.has(category)) {
      return Response.json({ message: 'Kategori ticket tidak valid.' }, { status: 400 })
    }
    if (!type) {
      return Response.json({ message: 'Tipe ticket wajib diisi.' }, { status: 400 })
    }
    if (!allowedStatuses.has(status)) {
      return Response.json({ message: 'Status ticket tidak valid.' }, { status: 400 })
    }
    if (createFieldWorkOrder && !allowedFieldStatuses.has(workOrderStatus)) {
      return Response.json({ message: 'Status awal work order lapangan tidak valid.' }, { status: 400 })
    }
    if (createFieldWorkOrder && !allowedFieldWorkTypes.has(fieldWorkType)) {
      return Response.json({ message: 'Tipe work order lapangan tidak valid.' }, { status: 400 })
    }
    if (String(payload.scheduledAt ?? '').trim() && !scheduledAt) {
      return Response.json({ message: 'Jadwal work order lapangan tidak valid.' }, { status: 400 })
    }
    if (linkMaps && !/^https?:\/\//i.test(linkMaps)) {
      return Response.json({ message: 'Link Maps harus diawali http:// atau https://.' }, { status: 400 })
    }
    if (customerWhatsapp && !/^[0-9+\-\s()]{6,}$/.test(customerWhatsapp)) {
      return Response.json({ message: 'No WA harus berupa nomor telepon yang valid (min 6 digit angka).' }, { status: 400 })
    }

    const linkedSubscription = await resolveLinkedSubscription(serviceReference)
    if (!linkedSubscription) {
      return Response.json(
        { message: 'Service No atau Customer Code tidak ditemukan pada subscription aktif review DB.' },
        { status: 404 },
      )
    }

    if (linkedSubscription.branchId == null) {
      return Response.json(
        { message: 'Cabang untuk service subscription tidak dapat ditentukan (branch_id missing). Create TT ditolak.' },
        { status: 403 },
      )
    }
    if (!isBranchIdInScope(session, linkedSubscription.branchId)) {
      return Response.json(
        { message: 'Target customer/service berada di luar scope cabang user (cross-branch create TT ditolak).' },
        { status: 403 },
      )
    }

    const hasSupportSlaTroubleType = await hasReviewDbColumn('support_trouble_ticket_sla', 'trouble_type')
    if (hasSupportSlaTroubleType) {
      const knownTroubleTypes = await runReviewDbQuery<TroubleTypeRow>(
        `
          SELECT trouble_type AS troubleType
          FROM support_trouble_ticket_sla
          WHERE UPPER(TRIM(trouble_type)) = UPPER(TRIM(?))
          LIMIT 1
        `,
        [type],
      )
      if (!knownTroubleTypes.length) {
        return Response.json(
          { message: 'Tipe ticket belum terdaftar pada master SLA trouble ticket.' },
          { status: 400 },
        )
      }
    }

    const ticketCode = await generateTicketCode(category)
    const actorUserId = await resolveReviewAuthUserIdByUsername(session.username)
    const metaV2: TroubleTicketV2Meta = {
      'NO WA': customerWhatsapp || undefined,
      'LINK MAPS': linkMaps || undefined,
      PAKET: packagePlan || undefined,
      ONT: ontSerial || undefined,
      'JENIS GANGGUAN': jenisGangguan || undefined,
      CATEGORY: category || undefined,
      SOURCE: ticketSource || undefined,
      'CREATED BY': `${session.role ?? 'UNKNOWN'} | ${session.displayName ?? ''} (${session.username ?? ''})` || undefined,
    }
    const metaBlockV2 = buildTroubleTicketV2MetaBlock(metaV2)
    const humanReviewPrefix = `[Review Ticket] ${session.displayName} (${session.username})${notesRaw ? ` - ${notesRaw}` : ''}`
    const notes = [humanReviewPrefix, metaBlockV2].filter(Boolean).join('  ')
    const resolvedCustomerName = customerName || linkedSubscription.customerName
    const resolvedCustomerUser = customerUser || linkedSubscription.serviceNo || linkedSubscription.customerCode || null

    await ensureSupportTroubleTicketBranchColumn()
    const hasTtBranchId = await hasReviewDbColumn('support_trouble_tickets', 'branch_id')
    const ticketInsertColumns = [
      'subscription_id',
      'ticket_code',
      'customer_name',
      'customer_user',
      'category',
      'type',
      'status',
      'problem_category',
      'notes',
    ]
    const ticketInsertValues: unknown[] = [
      linkedSubscription.subscriptionId,
      ticketCode,
      resolvedCustomerName,
      resolvedCustomerUser,
      category,
      type,
      status,
      resolvedProblemCategory,
      notes,
    ]
    if (hasTtBranchId) {
      ticketInsertColumns.push('branch_id')
      ticketInsertValues.push(linkedSubscription.branchId)
    }

    const ticketInsertResult = await runReviewDbExecute<ExecuteResult>(
      `
        INSERT INTO support_trouble_tickets (
          ${ticketInsertColumns.join(',\n          ')}
        )
        VALUES (${ticketInsertColumns.map(() => '?').join(', ')})
      `,
      ticketInsertValues,
    )
    const troubleTicketId = Number(ticketInsertResult.insertId ?? 0)
    const ticketCodeForMessage = ticketCode

    if (createFieldWorkOrder) {
      const workOrderNo = await generateServiceWorkOrderNo()
      const workOrderNotes = `${notes} [AUTO_WO:${ticketCodeForMessage}]`
      const workOrderInsertPayload = await buildServiceWorkOrderInsertPayload({
        salesOrderId: null,
        subscriptionId: linkedSubscription.subscriptionId,
        troubleTicketId: Number.isInteger(troubleTicketId) && troubleTicketId > 0 ? troubleTicketId : null,
        workOrderNo,
        workType: fieldWorkType,
        status: workOrderStatus,
        technicianName: null,
        scheduledAt,
        notes: workOrderNotes,
        branchId: linkedSubscription.branchId,
        jobCategory,
        priority,
        sourceType: 'TROUBLE_TICKET',
        currentPicUserId,
        scheduledByUserId: actorUserId,
        address: address || null,
      })

      const workOrderInsertResult = await runReviewDbExecute<ExecuteResult>(
        `
          INSERT INTO service_work_orders (
            ${workOrderInsertPayload.columns.join(',\n            ')}
          )
          VALUES (${workOrderInsertPayload.placeholders.join(', ')})
        `,
        workOrderInsertPayload.values,
      )

      const workOrderId = Number(workOrderInsertResult.insertId ?? 0)
      if (Number.isInteger(workOrderId) && workOrderId > 0) {
        if (currentPicUserId) {
          const validatedPic = await validateTargetTechnicianUser({ targetUserId: currentPicUserId })
          if (!validatedPic) {
            return Response.json(
              { message: 'currentPicUserId (PIC awal WO) tidak valid: user tidak ditemukan / tidak aktif / bukan teknisi.' },
              { status: 403 },
            )
          }
          const woBranch = linkedSubscription.branchId
          const targetBranch = validatedPic.userBranchId ?? woBranch
          if (woBranch != null && targetBranch != null && !isBranchIdInScope(session, targetBranch)) {
            return Response.json(
              { message: 'Target teknisi currentPicUserId untuk WO linked berada di luar scope cabang user.' },
              { status: 403 },
            )
          }
          if (woBranch != null && targetBranch != null && targetBranch !== woBranch) {
            return Response.json(
              { message: 'Target teknisi currentPicUserId untuk WO linked harus berasal dari cabang yang sama dengan WO (subscription branch).' },
              { status: 403 },
            )
          }
          await insertServiceWorkOrderAssignment({
            workOrderId,
            assignedUserId: currentPicUserId,
            assignedByUserId: actorUserId,
            assignmentRole: 'FIELD_TECHNICIAN',
            assignmentStatus: 'ASSIGNED',
            isPrimary: true,
            notes: `WO lapangan dibuat dari ticket ${ticketCodeForMessage}.`,
          })
        }
        await insertServiceWorkOrderStatusLog({
          workOrderId,
          fromStatus: null,
          toStatus: workOrderStatus,
          changedByUserId: actorUserId,
          reasonCode: 'AUTO_CREATED',
          reasonNotes: `WO lapangan dibuat dari trouble ticket ${ticketCodeForMessage}.`,
        })
      }
    }

    try {
      await ensureTicketsUnifiedTable()
      const tCode = String(ticketCode ?? `TT-${Date.now()}`).slice(0, 64)
      let type: 'TROUBLE' = 'TROUBLE'
      const statusRaw = String(status ?? 'OPEN').toUpperCase() as any
      const priorityRaw = String(priority ?? 'MEDIUM').toUpperCase() as any
      await createUnifiedTicketAndSyncLegacy({
        ticketCode: tCode,
        ticketType: type,
        title: String(resolvedProblemCategory ?? `Trouble Ticket ${tCode}`).slice(0, 255),
        description: String(notes ?? '').slice(0, 4000),
        customerName: String(resolvedCustomerName ?? '').slice(0, 255) || null,
        customerId: null,
        branchId: Number(linkedSubscription.branchId ?? 0) > 0 ? Number(linkedSubscription.branchId) : null,
        status: statusRaw,
        priority: priorityRaw,
        openedAt: new Date(),
        assignedUserId: Number(currentPicUserId ?? 0) > 0 ? Number(currentPicUserId) : null,
        slaDueAt: null,
        troubleTicketId: Number(troubleTicketId),
        sourceLegacy: 'TROUBLE_TICKET'
      } as any)
    } catch (err) { console.error('[WRITE-THROUGH] unified TT creation failed (ignored backward compat):', err) }

    return Response.json({
      message: `Trouble ticket ${ticketCode} untuk ${resolvedCustomerName} berhasil disimpan dan terhubung ke ${linkedSubscription.serviceNo || linkedSubscription.customerCode || serviceReference}${createFieldWorkOrder ? ' beserta work order lapangan.' : '.'}`,
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
