import { getSession } from '@/lib/auth'
import { handleSpvReactivateMembership } from '@/lib/services/spv-sales-team-api-handlers'
import type { SpvHandlerResult } from '@/lib/services/spv-sales-team-api-handlers'

function toNextResponse(result: SpvHandlerResult): Response {
  if (result.httpStatus === 204 && result.body === null) {
    return new Response(null, { status: 204 })
  }
  return Response.json(result.body ?? {}, { status: result.httpStatus })
}

export async function POST(req: Request): Promise<Response> {
  try {
    const session = await getSession()
    let body: unknown = undefined
    const ct = req.headers.get('content-type') ?? ''
    if (ct.toLowerCase().includes('application/json')) {
      try { body = await req.json() } catch { body = undefined }
    }
    const r = await handleSpvReactivateMembership(session, body)
    return toNextResponse(r)
  } catch {
    return Response.json({ message: 'Internal error' }, { status: 500 })
  }
}
