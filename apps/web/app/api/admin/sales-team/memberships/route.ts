import { getSession } from '@/lib/auth'
import {
  handleAdminListMemberships,
  handleAdminCreateMembership,
  handleAdminHardDeleteMembership,
} from '@/lib/services/admin-sales-team-api-handlers'
import type { AdminHandlerResult } from '@/lib/services/admin-sales-team-api-handlers'

function toNextResponse(result: AdminHandlerResult): Response {
  if (result.httpStatus === 204 && result.body === null) {
    return new Response(null, { status: 204 })
  }
  return Response.json(result.body ?? {}, { status: result.httpStatus })
}

export async function GET(): Promise<Response> {
  try {
    const session = await getSession()
    const r = await handleAdminListMemberships(session)
    return toNextResponse(r)
  } catch {
    return Response.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const session = await getSession()
    let body: unknown = undefined
    const ct = req.headers.get('content-type') ?? ''
    if (ct.toLowerCase().includes('application/json')) {
      try { body = await req.json() } catch { body = undefined }
    }
    const r = await handleAdminCreateMembership(session, body)
    return toNextResponse(r)
  } catch {
    return Response.json({ message: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(req: Request): Promise<Response> {
  try {
    const session = await getSession()
    let body: unknown = undefined
    const ct = req.headers.get('content-type') ?? ''
    if (ct.toLowerCase().includes('application/json')) {
      try { body = await req.json() } catch { body = undefined }
    }
    const r = await handleAdminHardDeleteMembership(session, body)
    return toNextResponse(r)
  } catch {
    return Response.json({ message: 'Internal error' }, { status: 500 })
  }
}
