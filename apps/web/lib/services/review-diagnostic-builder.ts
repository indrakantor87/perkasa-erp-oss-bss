import type { DomainReviewDiagnostic } from '@/lib/types'

export type ReviewDiagnosticCountResult = {
  total: number
  error: string | null
  disabled: boolean
} | null

export type ReviewDiagnosticRequirement = {
  table: string
  column?: string
  exists: boolean
}

export function buildReviewDiagnostic(params: {
  key: string
  title: string
  requiredTables: ReviewDiagnosticRequirement[]
  requiredColumns: ReviewDiagnosticRequirement[]
  data: ReviewDiagnosticCountResult
  detailWhenMissing?: string
  detailWhenColumnMissing?: string
}) {
  const missingTables = params.requiredTables.filter((item) => !item.exists).map((item) => item.table)
  const missingColumns = params.requiredColumns
    .filter((item) => !item.exists)
    .map((item) => ({ table: item.table, column: String(item.column ?? '') }))
    .filter((item) => item.column.length > 0) as Array<{ table: string; column: string }>

  if (params.data?.disabled) {
    const diagnostic: DomainReviewDiagnostic = {
      key: params.key,
      title: params.title,
      status: 'QUERY_ERROR',
      detail: 'Review DB belum terkonfigurasi pada runtime aplikasi.',
    }
    return diagnostic
  }

  if (missingTables.length > 0) {
    const diagnostic: DomainReviewDiagnostic = {
      key: params.key,
      title: params.title,
      status: 'TABLE_MISSING',
      detail: params.detailWhenMissing || 'Schema inventory belum lengkap pada review DB.',
      missingTables,
    }
    return diagnostic
  }

  if (missingColumns.length > 0) {
    const diagnostic: DomainReviewDiagnostic = {
      key: params.key,
      title: params.title,
      status: 'COLUMN_MISSING',
      detail: params.detailWhenColumnMissing || 'Schema inventory belum sesuai kontrak Phase 1.1 pada review DB.',
      missingColumns,
    }
    return diagnostic
  }

  if (params.data?.error) {
    const diagnostic: DomainReviewDiagnostic = {
      key: params.key,
      title: params.title,
      status: 'QUERY_ERROR',
      detail: params.data.error,
    }
    return diagnostic
  }

  const total = params.data?.total ?? 0
  const diagnostic: DomainReviewDiagnostic = {
    key: params.key,
    title: params.title,
    status: total > 0 ? 'READY_WITH_DATA' : 'READY_EMPTY',
    detail: total > 0 ? 'Schema siap dan data tersedia pada review DB.' : 'Schema siap, tetapi data masih kosong pada review DB.',
  }
  return diagnostic
}
