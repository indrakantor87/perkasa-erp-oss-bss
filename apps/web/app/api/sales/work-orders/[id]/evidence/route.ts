import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { ensureTechnicianSchemaFoundation } from '@/lib/services/technician-schema-ensure'
import { attachTicketEvidence } from '@/lib/services/ticket-evidence-service'
import { resolveTicketIdByWorkOrderId } from '@/lib/services/field-tech-transitions'
import type { AppRole } from '@/lib/types'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionRole = (session.role ?? 'PUBLIC') as AppRole
  if (sessionRole !== 'FIELD_TECHNICIAN') {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  const userId = Number(session.userId ?? 0)
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
  }

  try {
    await ensureTechnicianSchemaFoundation().catch(() => null)

    const resolvedParams = await params
    const idRaw = String(resolvedParams.id ?? '').trim()
    const workOrderId = Number.parseInt(idRaw, 10)
    if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
      return NextResponse.json({ error: 'ID work order tidak valid.' }, { status: 400 })
    }

    let evidenceType: string | null = null
    let storageReference: string | null = null
    let notes: string | null = null
    let branchId: number | null = null

    try {
      const contentType = request.headers.get('content-type') ?? ''
      if (contentType.toLowerCase().includes('application/json')) {
        const body = await request.json().catch(() => null)
        if (body && typeof body === 'object') {
          const rawEvType = (body as { evidenceType?: unknown }).evidenceType
          if (typeof rawEvType === 'string' && rawEvType.trim()) {
            evidenceType = rawEvType.trim()
          }
          const rawStorage = (body as { storageReference?: unknown }).storageReference
          if (typeof rawStorage === 'string' && rawStorage.trim()) {
            storageReference = rawStorage.trim()
          }
          const rawNotes = (body as { notes?: unknown }).notes
          if (typeof rawNotes === 'string' && rawNotes.trim()) {
            notes = rawNotes.trim()
          }
          const rawBranch = (body as { branchId?: unknown }).branchId
          const rawBranchNum = Number(rawBranch ?? 0)
          if (Number.isInteger(rawBranchNum) && rawBranchNum > 0) {
            branchId = rawBranchNum
          }
        }
      }
    } catch {
      evidenceType = null
      storageReference = null
      notes = null
      branchId = null
    }

    if (!storageReference) {
      return NextResponse.json(
        { error: 'storageReference wajib diisi.' },
        { status: 400 },
      )
    }

    const ticketId = await resolveTicketIdByWorkOrderId(workOrderId)
    if (!ticketId) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    const branchIdsArr = Array.isArray(session.branchIds)
      ? (session.branchIds as number[]).filter((n) => Number.isInteger(n) && n > 0)
      : []

    const result = await attachTicketEvidence({
      ticketId,
      sessionUserId: userId,
      sessionBranchIds: branchIdsArr,
      evidenceType,
      storageReference,
      notes,
      branchId,
    })

    if (result.branchDenied || result.ownershipDenied) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }
    if (!result.success) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    return NextResponse.json({
      message: 'Evidence work order berhasil di-attach.',
      evidenceId: result.evidenceId,
      ticketId,
      workOrderId,
    })
  } catch (error) {
    return NextResponse.json({ error: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
