import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getReviewDbErrorDetail } from '@/lib/review-db'
import { ensureTechnicianSchemaFoundation } from '@/lib/services/technician-schema-ensure'
import {
  startOnProgressWorkOrder,
  type FieldTechSession,
} from '@/lib/services/field-tech-transitions'
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

    let notes: string | null = null
    try {
      const contentType = request.headers.get('content-type') ?? ''
      if (contentType.toLowerCase().includes('application/json')) {
        const body = await request.json().catch(() => null)
        if (body && typeof body === 'object') {
          const rawNotes = (body as { notes?: unknown }).notes
          if (typeof rawNotes === 'string' && rawNotes.trim()) {
            notes = rawNotes.trim()
          }
        }
      }
    } catch {
      notes = null
    }

    const branchIdsArr = Array.isArray(session.branchIds)
      ? (session.branchIds as number[]).filter((n) => Number.isInteger(n) && n > 0)
      : []

    const techSession: FieldTechSession = {
      userId,
      role: sessionRole,
      branchId:
        session.branchId != null && Number.isInteger(Number(session.branchId)) && Number(session.branchId) > 0
          ? Number(session.branchId)
          : null,
      branchIds: branchIdsArr,
    }

    const result = await startOnProgressWorkOrder({
      workOrderId,
      session: techSession,
      notes,
    })

    if (!result.success) {
      return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
    }

    return NextResponse.json({
      message: result.idempotent
        ? 'Work order sudah dalam status ON_PROGRESS.'
        : 'Work order berhasil dimulai (ON_PROGRESS).',
      idempotent: result.idempotent,
      fromStatus: result.fromStatus,
      toStatus: result.toStatus,
      workOrderId: result.workOrderId,
    })
  } catch (error) {
    return NextResponse.json({ error: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
