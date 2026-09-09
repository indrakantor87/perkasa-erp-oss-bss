import { describe, it, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { loadImportFileToStaging } from '../lib/services/import-file-loader'
import type { ReviewDbPool } from '../lib/review-db'

type InsertedOdpRow = {
  legacyId: string | null
  odpCode: string | null
  odpName: string | null
  regionName: string | null
  locationText: string | null
  latitude: number | null
  longitude: number | null
  totalPorts: number | null
  activePorts: number | null
  poleStatus: string | null
  isActive: number | null
  rawPayload: string | null
  normalizedKey: string | null
}

function createWorkbookBuffer(params: { sheets: Array<{ name: string; aoa: unknown[][] }> }) {
  const wb = XLSX.utils.book_new()
  for (const sheet of params.sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.aoa)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

function createMockPool(capture: { inserted: InsertedOdpRow[] }): ReviewDbPool {
  return {
    query: async (sql: string, values?: unknown[]) => {
      const normalized = String(sql).replace(/\s+/g, ' ').trim()

      if (normalized.startsWith('SELECT COUNT(*) AS total FROM')) {
        return [[{ total: 0 }], {}]
      }

      if (normalized.includes('INSERT INTO staging_legacy_network_odp_records')) {
        const v = Array.isArray(values) ? values : []
        capture.inserted.push({
          legacyId: (v[1] as string | null) ?? null,
          odpCode: (v[2] as string | null) ?? null,
          odpName: (v[3] as string | null) ?? null,
          regionName: (v[4] as string | null) ?? null,
          locationText: (v[5] as string | null) ?? null,
          latitude: (v[6] as number | null) ?? null,
          longitude: (v[7] as number | null) ?? null,
          totalPorts: (v[8] as number | null) ?? null,
          activePorts: (v[9] as number | null) ?? null,
          poleStatus: (v[10] as string | null) ?? null,
          isActive: (v[11] as number | null) ?? null,
          rawPayload: (v[12] as string | null) ?? null,
          normalizedKey: (v[13] as string | null) ?? null,
        })
        return [[{ affectedRows: 1, insertId: 0, changedRows: 0 }], {}]
      }

      return [[{ affectedRows: 0, insertId: 0, changedRows: 0 }], {}]
    },
    getConnection: async () => {
      throw new Error('NOT_USED')
    },
  }
}

describe('Legacy ODP import compatibility', () => {
  afterEach(() => {
    // @ts-expect-error test cleanup
    delete globalThis.__perkasaReviewDbPool
  })

  it('legacy headers map correctly and coordinate dot-decimal is parsed', async () => {
    const capture = { inserted: [] as InsertedOdpRow[] }
    globalThis.__perkasaReviewDbPool = Promise.resolve(createMockPool(capture))

    const buffer = createWorkbookBuffer({
      sheets: [
        {
          name: 'Sheet1',
          aoa: [
            ['Nama ODP', 'POP', 'Lokasi', 'Kapasitas', 'Terpakai', 'Tersedia', 'Status Tiang'],
            ['PTI/01 - 01', 'Pati', '-6.73011526440181, 111.021615897086', 8, 5, 3, 'Perkasa'],
          ],
        },
      ],
    })

    const result = await loadImportFileToStaging(
      { id: 1, batchCode: 'BATCH-LEGACY', sourceSystem: 'WEB_PSB', scope: 'INVENTORY' },
      buffer,
      '.xlsx'
    )
    assert.equal(result.insertedRows, 1)
    assert.deepEqual(result.sectionsLoaded, ['odp'])

    assert.equal(capture.inserted.length, 1)
    const row = capture.inserted[0]
    assert.equal(row.odpCode, 'PTI/01 - 01')
    assert.equal(row.regionName, 'Pati')
    assert.equal(row.totalPorts, 8)
    assert.equal(row.activePorts, 5)
    assert.equal(row.poleStatus, 'Perkasa')
    assert.equal(row.latitude, -6.73011526440181)
    assert.equal(row.longitude, 111.021615897086)
    assert.ok(row.normalizedKey && row.normalizedKey.includes('pti'))

    const payload = row.rawPayload ? (JSON.parse(row.rawPayload) as Record<string, unknown>) : {}
    assert.ok(!('__legacy_parse_warnings' in payload))
  })

  it('decimal-comma coordinate parses deterministically for 4-part form with sufficient precision', async () => {
    const capture = { inserted: [] as InsertedOdpRow[] }
    globalThis.__perkasaReviewDbPool = Promise.resolve(createMockPool(capture))

    const buffer = createWorkbookBuffer({
      sheets: [
        {
          name: 'Data',
          aoa: [
            ['Nama ODP', 'POP', 'Lokasi', 'Kapasitas', 'Terpakai', 'Status Tiang'],
            ['PTI/01 - 02', 'Pati', '-6,6865368, 111,0694663', 8, 9, 'Perkasa'],
          ],
        },
      ],
    })

    await loadImportFileToStaging(
      { id: 1, batchCode: 'BATCH-LEGACY', sourceSystem: 'WEB_PSB', scope: 'INVENTORY' },
      buffer,
      '.xlsx'
    )

    const row = capture.inserted[0]
    assert.equal(row.latitude, -6.6865368)
    assert.equal(row.longitude, 111.0694663)
  })

  it('ambiguous coordinate is rejected and stored as warning without corruption', async () => {
    const capture = { inserted: [] as InsertedOdpRow[] }
    globalThis.__perkasaReviewDbPool = Promise.resolve(createMockPool(capture))

    const buffer = createWorkbookBuffer({
      sheets: [
        {
          name: 'POP Pati',
          aoa: [
            ['Nama ODP', 'POP', 'Lokasi', 'Kapasitas', 'Terpakai'],
            ['PTI/01 - 03', 'Pati', '-6,7, 111,0', 8, 5],
          ],
        },
      ],
    })

    await loadImportFileToStaging(
      { id: 1, batchCode: 'BATCH-LEGACY', sourceSystem: 'WEB_PSB', scope: 'INVENTORY' },
      buffer,
      '.xlsx'
    )

    const row = capture.inserted[0]
    assert.equal(row.latitude, null)
    assert.equal(row.longitude, null)

    const payload = row.rawPayload ? (JSON.parse(row.rawPayload) as Record<string, unknown>) : {}
    assert.ok(Array.isArray(payload.__legacy_parse_warnings))
    assert.ok((payload.__legacy_parse_warnings as unknown[]).includes('LEGACY_ODP_COORDINATE_PARSE_REJECTED'))
  })

  it('invalid numeric text does not become 0 and produces warning', async () => {
    const capture = { inserted: [] as InsertedOdpRow[] }
    globalThis.__perkasaReviewDbPool = Promise.resolve(createMockPool(capture))

    const buffer = createWorkbookBuffer({
      sheets: [
        {
          name: 'Sheet1',
          aoa: [
            ['Nama ODP', 'POP', 'Lokasi', 'Kapasitas', 'Terpakai'],
            ['PTI/01 - 04', 'Pati', '-6.7, 111.0', 'kosong', 'kosong'],
          ],
        },
      ],
    })

    await loadImportFileToStaging(
      { id: 1, batchCode: 'BATCH-LEGACY', sourceSystem: 'WEB_PSB', scope: 'INVENTORY' },
      buffer,
      '.xlsx'
    )

    const row = capture.inserted[0]
    assert.equal(row.totalPorts, null)
    assert.equal(row.activePorts, null)

    const payload = row.rawPayload ? (JSON.parse(row.rawPayload) as Record<string, unknown>) : {}
    assert.ok(Array.isArray(payload.__legacy_parse_warnings))
    const warnings = payload.__legacy_parse_warnings as unknown[]
    assert.ok(warnings.includes('LEGACY_ODP_TOTAL_PORTS_INVALID'))
    assert.ok(warnings.includes('LEGACY_ODP_ACTIVE_PORTS_INVALID'))
  })

  it('canonical ODP sheet still works without legacy signature detection', async () => {
    const capture = { inserted: [] as InsertedOdpRow[] }
    globalThis.__perkasaReviewDbPool = Promise.resolve(createMockPool(capture))

    const buffer = createWorkbookBuffer({
      sheets: [
        {
          name: 'odp',
          aoa: [
            ['odp_code', 'region_name', 'latitude', 'longitude', 'total_ports', 'active_ports', 'pole_status'],
            ['ODP-TEST-001', 'REGION 1', -6.1855, 106.832, 16, 12, 'SEHAT'],
          ],
        },
      ],
    })

    const result = await loadImportFileToStaging(
      { id: 1, batchCode: 'BATCH-CANON', sourceSystem: 'WEB_PSB', scope: 'INVENTORY' },
      buffer,
      '.xlsx'
    )
    assert.equal(result.insertedRows, 1)
    assert.deepEqual(result.sectionsLoaded, ['odp'])

    const row = capture.inserted[0]
    assert.equal(row.odpCode, 'ODP-TEST-001')
    assert.equal(row.regionName, 'REGION 1')
    assert.equal(row.latitude, -6.1855)
    assert.equal(row.longitude, 106.832)
    assert.equal(row.totalPorts, 16)
    assert.equal(row.activePorts, 12)
  })

  it('safety: does not auto-detect when multiple sheets match legacy ODP signature', async () => {
    const capture = { inserted: [] as InsertedOdpRow[] }
    globalThis.__perkasaReviewDbPool = Promise.resolve(createMockPool(capture))

    const buffer = createWorkbookBuffer({
      sheets: [
        {
          name: 'Sheet1',
          aoa: [
            ['Nama ODP', 'POP', 'Lokasi', 'Kapasitas'],
            ['PTI/01 - 01', 'Pati', '-6.7, 111.0', 8],
          ],
        },
        {
          name: 'Data',
          aoa: [
            ['Nama ODP', 'POP', 'Lokasi', 'Kapasitas'],
            ['PTI/01 - 02', 'Pati', '-6.7, 111.0', 8],
          ],
        },
      ],
    })

    await assert.rejects(
      () =>
        loadImportFileToStaging(
          { id: 1, batchCode: 'BATCH-LEGACY', sourceSystem: 'WEB_PSB', scope: 'INVENTORY' },
          buffer,
          '.xlsx'
        ),
      /Tidak ada section yang cocok untuk scope INVENTORY/i
    )
  })
})
