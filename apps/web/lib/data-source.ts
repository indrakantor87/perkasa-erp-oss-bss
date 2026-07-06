import type { AppDataMode, DataSourceSnapshot } from '@/lib/types'

const DEFAULT_DATA_MODE: AppDataMode = 'mock'

function normalizeMode(value: string | undefined): AppDataMode {
  return value === 'review-db' ? 'review-db' : DEFAULT_DATA_MODE
}

export function getConfiguredDataMode(): AppDataMode {
  return normalizeMode(process.env.APP_DATA_MODE)
}

export function getFallbackDataSourceSnapshot(detail: string): DataSourceSnapshot {
  const configuredMode = getConfiguredDataMode()

  return {
    configuredMode,
    effectiveMode: 'mock',
    isFallback: configuredMode === 'review-db',
    label: configuredMode === 'review-db' ? 'Mock Fallback' : 'Mock Source',
    detail,
  }
}

export function getDataSourceSnapshot(): DataSourceSnapshot {
  const configuredMode = getConfiguredDataMode()

  if (configuredMode === 'review-db') {
    const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim())

    if (hasDatabaseUrl) {
      return {
        configuredMode,
        effectiveMode: 'review-db',
        isFallback: false,
        label: 'Review DB',
        detail: 'Mode review database aktif. Service layer siap diarahkan ke MySQL review.',
      }
    }

    return {
      configuredMode,
      effectiveMode: 'mock',
      isFallback: true,
      label: 'Mock Fallback',
      detail: 'APP_DATA_MODE=review-db terdeteksi, tetapi DATABASE_URL belum tersedia. Data masih memakai mock.',
    }
  }

  return {
    configuredMode,
    effectiveMode: 'mock',
    isFallback: false,
    label: 'Mock Source',
    detail: 'Data masih dibaca dari mock bootstrap sampai koneksi review database diaktifkan.',
  }
}
