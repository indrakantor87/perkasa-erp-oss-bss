import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildReviewDiagnostic } from '@/lib/services/review-diagnostic-builder'

async function main() {
  const readyWithData = buildReviewDiagnostic({
    key: 'k',
    title: 'T',
    requiredTables: [{ table: 't1', exists: true }],
    requiredColumns: [{ table: 't1', column: 'c1', exists: true }],
    data: { total: 2, error: null, disabled: false },
  })
  assert.equal(readyWithData.status, 'READY_WITH_DATA')

  const readyEmpty = buildReviewDiagnostic({
    key: 'k',
    title: 'T',
    requiredTables: [{ table: 't1', exists: true }],
    requiredColumns: [{ table: 't1', column: 'c1', exists: true }],
    data: { total: 0, error: null, disabled: false },
  })
  assert.equal(readyEmpty.status, 'READY_EMPTY')

  const missingTable = buildReviewDiagnostic({
    key: 'k',
    title: 'T',
    requiredTables: [{ table: 't1', exists: false }],
    requiredColumns: [{ table: 't1', column: 'c1', exists: true }],
    data: null,
  })
  assert.equal(missingTable.status, 'TABLE_MISSING')
  assert.deepEqual(missingTable.missingTables, ['t1'])

  const missingColumn = buildReviewDiagnostic({
    key: 'k',
    title: 'T',
    requiredTables: [{ table: 't1', exists: true }],
    requiredColumns: [
      { table: 't1', column: 'c1', exists: true },
      { table: 't1', column: 'c2', exists: false },
    ],
    data: null,
    detailWhenColumnMissing: 'Schema drift.',
  })
  assert.equal(missingColumn.status, 'COLUMN_MISSING')
  assert.deepEqual(missingColumn.missingColumns, [{ table: 't1', column: 'c2' }])
  assert.equal(missingColumn.detail, 'Schema drift.')

  const queryError = buildReviewDiagnostic({
    key: 'k',
    title: 'T',
    requiredTables: [{ table: 't1', exists: true }],
    requiredColumns: [{ table: 't1', column: 'c1', exists: true }],
    data: { total: 0, error: 'boom', disabled: false },
  })
  assert.equal(queryError.status, 'QUERY_ERROR')
  assert.equal(queryError.detail, 'boom')

  const disabled = buildReviewDiagnostic({
    key: 'k',
    title: 'T',
    requiredTables: [{ table: 't1', exists: true }],
    requiredColumns: [{ table: 't1', column: 'c1', exists: true }],
    data: { total: 0, error: null, disabled: true },
  })
  assert.equal(disabled.status, 'QUERY_ERROR')

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const domainServicePath = path.resolve(__dirname, '..', 'lib', 'services', 'domain-service.ts')
  const domainServiceSource = await readFile(domainServicePath, 'utf8')
  assert.equal(
    domainServiceSource.includes('await ensureDomainInventoryReadTables()'),
    false,
    'Inventory read path tidak boleh memanggil ensureDomainInventoryReadTables() karena berpotensi DDL.',
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
