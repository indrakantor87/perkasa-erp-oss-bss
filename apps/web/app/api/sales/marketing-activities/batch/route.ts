import { getSession } from '@/lib/auth'
import {
  batchCreateMarketingActivities,
  getMarketingActivityErrorMessage,
} from '@/lib/services/marketing-activity-service'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const rows = Array.isArray(payload?.rows) ? payload.rows : []
    if (!rows.length) {
      return Response.json(
        {
          message: 'Tidak ada baris data yang dikirim untuk import.',
          successCount: 0,
          errorCount: 0,
          totalCount: 0,
          rowErrors: [],
        },
        { status: 400 },
      )
    }

    const result = await batchCreateMarketingActivities({ session, rows })
    if (result.errorCount > 0 && result.successCount === 0) {
      return Response.json(
        {
          message: `Import gagal: ${result.errorCount} dari ${result.totalCount} baris tidak valid. Lihat rowErrors untuk detail per baris.`,
          ...result,
        },
        { status: 400 },
      )
    }
    if (result.errorCount > 0) {
      return Response.json(
        {
          message: `Import sebagian berhasil: ${result.successCount} baris tersimpan, ${result.errorCount} baris memiliki error.`,
          ...result,
        },
        { status: 207 },
      )
    }
    return Response.json({
      message: `Berhasil import ${result.successCount.toLocaleString('id-ID')} baris Aktivitas Marketing.`,
      ...result,
    })
  } catch (error) {
    const message = getMarketingActivityErrorMessage(error)
    const status =
      message.includes('diizinkan') || message.includes('hanya bisa')
        ? 403
        : message.includes('wajib') || message.includes('valid') || message.includes('tidak ditemukan')
          ? 400
          : 500
    return Response.json({ message }, { status })
  }
}
