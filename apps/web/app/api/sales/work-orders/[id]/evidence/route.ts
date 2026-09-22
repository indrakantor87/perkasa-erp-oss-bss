import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'
import { ensureTechnicianSchemaFoundation } from '@/lib/services/technician-schema-ensure'
import { attachTicketEvidence } from '@/lib/services/ticket-evidence-service'
import { resolveTicketIdByWorkOrderId } from '@/lib/services/field-tech-transitions'
import type { AppRole } from '@/lib/types'

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_EVIDENCE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.heic', '.mp4', '.mov', '.webp', '.txt']

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

    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.toLowerCase().includes('multipart/form-data')) {
      let form: FormData | null = null
      try { form = await request.formData() } catch { form = null }
      if (form) {
        const fileEntry = form.get('file')
        if (!fileEntry || !(fileEntry instanceof File)) {
          return NextResponse.json({ error: 'Field "file" wajib diisi sebagai File binary multipart.' }, { status: 400 })
        }
        const file = fileEntry as File
        if (file.size <= 0) return NextResponse.json({ error: 'File evidence kosong.' }, { status: 400 })
        if (file.size > MAX_UPLOAD_SIZE_BYTES) return NextResponse.json({ error: `File terlalu besar, maks ${Math.round(MAX_UPLOAD_SIZE_BYTES / 1024 / 1024)} MB.` }, { status: 400 })
        const ext = path.extname(file.name || '').toLowerCase() || '.bin'
        if (!ALLOWED_EVIDENCE_EXTENSIONS.includes(ext)) {
          return NextResponse.json({ error: `Tipe file tidak diizinkan. Pilih salah satu: ${ALLOWED_EVIDENCE_EXTENSIONS.join(', ')}.` }, { status: 400 })
        }
        let storageDir = process.env.UPLOAD_DIR || './tmp/uploads/evidence'
        if (!path.isAbsolute(storageDir)) storageDir = path.resolve(process.cwd(), storageDir)
        try { if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true }) }
        catch (mkdirErr) { return NextResponse.json({ error: 'Gagal menyiapkan folder storage evidence server: ' + String((mkdirErr as Error)?.message || '') }, { status: 500 }) }
        const stamp = Date.now()
        const safeOrig = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'evidence'
        const storageFilename = `wo_${workOrderId}_${stamp}_${Math.random().toString(36).slice(2, 8)}${ext}`
        const fullPath = path.join(storageDir, storageFilename)
        try {
          const bytes = new Uint8Array(await file.arrayBuffer())
          fs.writeFileSync(fullPath, bytes)
        } catch (writeErr) {
          return NextResponse.json({ error: 'Gagal menulis file evidence ke storage server: ' + String((writeErr as Error)?.message || '') }, { status: 500 })
        }
        const evType = (form.get('evidenceType') as string | null) || null
        const evNotes = (form.get('notes') as string | null) || null
        const evBranchIdRaw = form.get('branchId')
        const evBranchId = evBranchIdRaw != null ? Number(String(evBranchIdRaw)) : null

        const relReference = `evidence/${storageFilename}`

        const mTicketId = await resolveTicketIdByWorkOrderId(workOrderId)
        if (!mTicketId) {
          return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
        }

        try {
          const statusRes = await runReviewDbQuery<any>(`SELECT status FROM service_work_orders WHERE id = ?`, [workOrderId])
          if (statusRes.length > 0) {
            const st = String(statusRes[0].status ?? '').trim().toUpperCase()
            if (['COMPLETED', 'CLOSED', 'CANCELLED', 'DONE', 'FINISHED'].includes(st)) {
              return NextResponse.json({ error: 'Tidak bisa menambahkan evidence ke ticket yang sudah selesai/ditutup.' }, { status: 409 })
            }
          }
        } catch (_) { }

        const mBranchIdsArr = Array.isArray(session.branchIds)
          ? (session.branchIds as number[]).filter((n) => Number.isInteger(n) && n > 0)
          : []

        const mResult = await attachTicketEvidence({
          ticketId: mTicketId,
          sessionUserId: userId,
          sessionBranchIds: mBranchIdsArr,
          evidenceType: evType,
          storageReference: relReference,
          notes: evNotes,
          branchId: evBranchId,
        })

        if (mResult.branchDenied || mResult.ownershipDenied) {
          return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
        }
        if (!mResult.success) {
          return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 })
        }

        return NextResponse.json({
          success: true,
          storageReference: relReference,
          evidenceId: mResult.evidenceId,
          evidenceType: evType,
          notes: evNotes,
          branchId: evBranchId,
          ticketId: mTicketId,
          workOrderId,
        }, { status: 201 })
      }
    }

    let evidenceType: string | null = null
    let storageReference: string | null = null
    let notes: string | null = null
    let branchId: number | null = null

    try {
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

    try {
      const statusRes = await runReviewDbQuery<any>(`SELECT status FROM service_work_orders WHERE id = ?`, [workOrderId])
      if (statusRes.length > 0) {
        const st = String(statusRes[0].status ?? '').trim().toUpperCase()
        if (['COMPLETED', 'CLOSED', 'CANCELLED', 'DONE', 'FINISHED'].includes(st)) {
          return NextResponse.json({ error: 'Tidak bisa menambahkan evidence ke ticket yang sudah selesai/ditutup.' }, { status: 409 })
        }
      }
    } catch (_) { }

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
