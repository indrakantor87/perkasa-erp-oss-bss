import { canPerformAction } from '@/lib/access-control'
import { getSession } from '@/lib/auth'
import { getDataSourceSnapshot } from '@/lib/data-source'
import { getReviewDbErrorDetail, runReviewDbQuery } from '@/lib/review-db'

type PsbListExportRow = {
  id: number
  psb_list_code: string | null
  customer_name: string | null
  customer_phone: string | null
  address_text: string | null
  area_label: string | null
  google_maps_link: string | null
  package_label: string | null
  odp_code: string | null
  sales_owner_name: string | null
  requested_install_date: string | null
  status: string | null
  review_notes: string | null
  correction_notes: string | null
  transferred_ticket_ref: string | null
  transferred_work_order_id: string | null
  cs_pic_name: string | null
  next_action_label: string | null
  created_at: string | null
  updated_at: string | null
  escort_notes: string | null
  activity_notes: string | null
}

function normalizeStatus(value: string | null | undefined): string {
  switch (String(value ?? '').toUpperCase()) {
    case 'BARU':
      return 'Baru'
    case 'REVIEW_CS':
      return 'Review CS'
    case 'PERLU_KOREKSI':
      return 'Perlu Koreksi'
    case 'DISETUJUI':
      return 'Disetujui'
    case 'DITOLAK':
      return 'Ditolak'
    case 'DITRANSFER_KE_TICKETING':
      return 'Sudah ke Ticketing'
    default:
      return String(value ?? '')
  }
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }
  if (!canPerformAction(session.role, 'sales', 'export')) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const source = getDataSourceSnapshot()
  if (source.effectiveMode !== 'review-db' || source.isFallback) {
    return Response.json(
      { message: 'Export PSB hanya aktif saat review DB benar-benar tersedia.' },
      { status: 503 },
    )
  }

  try {
    const url = new URL(request.url)
    const status = String(url.searchParams.get('status') ?? '').trim()
    const owner = String(url.searchParams.get('owner') ?? '').trim()
    const q = String(url.searchParams.get('q') ?? '').trim()

    const filters: string[] = ['1 = 1']
    const values: unknown[] = []

    if (status) {
      filters.push('UPPER(COALESCE(psb.status, \'\')) = UPPER(?)')
      values.push(status)
    }
    if (owner) {
      const ownerLike = `%${owner}%`
      filters.push(
        '(UPPER(COALESCE(psb.sales_owner_name, \'\')) LIKE UPPER(?) OR UPPER(COALESCE(psb.cs_pic_name, \'\')) LIKE UPPER(?))',
      )
      values.push(ownerLike, ownerLike)
    }
    if (q) {
      const like = `%${q}%`
      filters.push(
        `(
          UPPER(COALESCE(psb.psb_list_code, '')) LIKE UPPER(?) OR
          UPPER(COALESCE(psb.customer_name, '')) LIKE UPPER(?) OR
          UPPER(COALESCE(psb.customer_phone, '')) LIKE UPPER(?) OR
          UPPER(COALESCE(psb.address_text, '')) LIKE UPPER(?) OR
          UPPER(COALESCE(psb.area_label, '')) LIKE UPPER(?) OR
          UPPER(COALESCE(psb.package_label, '')) LIKE UPPER(?) OR
          UPPER(COALESCE(psb.odp_code, '')) LIKE UPPER(?) OR
          UPPER(COALESCE(psb.transferred_ticket_ref, '')) LIKE UPPER(?)
        )`,
      )
      values.push(like, like, like, like, like, like, like, like)
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

    const rows = await runReviewDbQuery<PsbListExportRow>(
      `
        SELECT
          psb.id,
          psb.psb_list_code,
          psb.customer_name,
          psb.customer_phone,
          psb.address_text,
          psb.area_label,
          psb.google_maps_link,
          psb.package_label,
          psb.odp_code,
          psb.sales_owner_name,
          CAST(psb.requested_install_date AS CHAR) AS requested_install_date,
          psb.status,
          psb.review_notes,
          psb.correction_notes,
          psb.transferred_ticket_ref,
          psb.transferred_work_order_id,
          psb.cs_pic_name,
          psb.next_action_label,
          CAST(psb.created_at AS CHAR) AS created_at,
          CAST(psb.updated_at AS CHAR) AS updated_at,
          psb.escort_notes,
          psb.activity_notes
        FROM psb_list_items psb
        ${whereClause}
        ORDER BY psb.created_at DESC, psb.id DESC
        LIMIT 10000
      `,
      values,
    )

    const xlsxModule = await import('xlsx')
    const XLSX = (xlsxModule as unknown as { default?: typeof import('xlsx') }).default ?? xlsxModule

    const payloadRows = rows.slice(0, 10000).map((row) => ({
      'Kode Data PSB': row.psb_list_code ?? '',
      'Nama Customer': row.customer_name ?? '',
      'No. HP Customer': row.customer_phone ?? '',
      'Alamat': row.address_text ?? '',
      'Area / Kelurahan': row.area_label ?? '',
      'Link Google Maps': row.google_maps_link ?? '',
      'Paket Berlangganan': row.package_label ?? '',
      'Kode ODP': row.odp_code ?? '',
      'Marketing / Sales PIC': row.sales_owner_name ?? '',
      'Tanggal Target Pasang': row.requested_install_date ?? '',
      Status: normalizeStatus(row.status),
      'Catatan Review CS': row.review_notes ?? '',
      'Catatan Koreksi': row.correction_notes ?? '',
      'No. Ticket Operasional': row.transferred_ticket_ref ?? '',
      'ID Work Order': row.transferred_work_order_id ?? '',
      'PIC CS Saat Ini': row.cs_pic_name ?? '',
      'Tindak Lanjut Saat Ini': row.next_action_label ?? '',
      'Dibuat Pada': row.created_at ?? '',
      'Terakhir Diperbarui': row.updated_at ?? '',
      'Catatan Escort / Lokasi': row.escort_notes ?? '',
      'Catatan Aktivitas Sales': row.activity_notes ?? '',
    }))

    const sheet = XLSX.utils.json_to_sheet(payloadRows, {
      header: [
        'Kode Data PSB',
        'Nama Customer',
        'No. HP Customer',
        'Alamat',
        'Area / Kelurahan',
        'Link Google Maps',
        'Paket Berlangganan',
        'Kode ODP',
        'Marketing / Sales PIC',
        'Tanggal Target Pasang',
        'Status',
        'Catatan Review CS',
        'Catatan Koreksi',
        'No. Ticket Operasional',
        'ID Work Order',
        'PIC CS Saat Ini',
        'Tindak Lanjut Saat Ini',
        'Dibuat Pada',
        'Terakhir Diperbarui',
        'Catatan Escort / Lokasi',
        'Catatan Aktivitas Sales',
      ],
    })
    sheet['!cols'] = [
      { wch: 18 },
      { wch: 28 },
      { wch: 18 },
      { wch: 48 },
      { wch: 22 },
      { wch: 42 },
      { wch: 28 },
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
      { wch: 20 },
      { wch: 40 },
      { wch: 40 },
      { wch: 22 },
      { wch: 14 },
      { wch: 22 },
      { wch: 36 },
      { wch: 22 },
      { wch: 22 },
      { wch: 40 },
      { wch: 40 },
    ]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, 'Data PSB')

    const stamp = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const filename = `psb-list-${stamp.getFullYear()}-${pad(stamp.getMonth() + 1)}-${pad(stamp.getDate())}.xlsx`
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array', compression: true })

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return Response.json({ message: getReviewDbErrorDetail(error) }, { status: 500 })
  }
}
