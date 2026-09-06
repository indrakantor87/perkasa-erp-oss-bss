import { NextResponse, type NextRequest } from 'next/server'
import { canAccessPath } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { BATCH_SCOPE_NAMES } from '@/lib/import-batch-capabilities'
import { getScopeContract, type BatchScopeName } from '@/lib/import-column-contract'

export const dynamic = 'force-dynamic'

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canAccessPath(session.role, '/import')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
  }

  const rawScope = request.nextUrl.searchParams.get('scope') ?? ''
  const normalizedScope = String(rawScope)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '')

  if (normalizedScope.endsWith('_SAMPLE')) {
    return NextResponse.json(
      {
        message:
          "Scope dengan suffix '_SAMPLE' adalah internal legacy alias parser. Gunakan scope canonical 6 pilihan tanpa suffix untuk template.",
      },
      { status: 400 }
    )
  }

  if (!(BATCH_SCOPE_NAMES as readonly string[]).includes(normalizedScope)) {
    return NextResponse.json(
      {
        message: `Scope tidak valid untuk template. Scope valid: ${BATCH_SCOPE_NAMES.join(', ')}.`,
      },
      { status: 400 }
    )
  }

  const validScope = normalizedScope as BatchScopeName
  const contract = getScopeContract(validScope)
  if (!contract) {
    return NextResponse.json(
      {
        message: `Kontrak kolom untuk scope ${validScope} tidak tersedia.`,
      },
      { status: 500 }
    )
  }

  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  for (const sheet of contract.sheets) {
    const headers = sheet.columns.filter((c) => c.templateHeader).map((c) => c.parserField)
    const aoa: unknown[][] = [headers]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    XLSX.utils.book_append_sheet(wb, ws, sheet.key)
  }

  const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  const now = new Date()
  const yyyymmdd = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`
  const filename = `template-${validScope.toLowerCase()}-${yyyymmdd}.xlsx`

  return new NextResponse(buf as unknown as ReadableStream<Uint8Array>, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buf.byteLength),
      'Cache-Control': 'no-store',
    },
  })
}
