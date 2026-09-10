import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  getCanonicalSeedRows,
  getMigrationId,
  getTableName,
  getUniqueKeyName,
  parseInformationSchemaColumnRow,
  parseMode,
  validateExistingTableContract,
} from '../scripts/migrate-master-mapping-status-values'

function readText(filePath: string) {
  return fs.readFileSync(filePath, 'utf8')
}

async function main() {
  assert.equal(getMigrationId(), 'master-mapping-status-values-2026-09-10')

  assert.equal(parseMode(['--mode=precheck']), 'precheck')
  assert.equal(parseMode(['--mode=apply']), 'apply')
  assert.equal(parseMode(['--mode=postcheck']), 'postcheck')
  assert.equal(parseMode(['--mode=unknown']), null)
  assert.equal(parseMode([]), null)

  assert.equal(getTableName(), 'mapping_legacy_status_values')
  assert.equal(getUniqueKeyName(), 'uq_mapping_legacy_status_values')

  const scriptPath = path.resolve(__dirname, '..', 'scripts', 'migrate-master-mapping-status-values.ts')
  const scriptText = readText(scriptPath)

  assert.ok(scriptText.includes('SELECT DATABASE()'), 'migration must explicitly run SELECT DATABASE()')
  assert.ok(scriptText.includes("currentDatabase !== 'default'"), 'migration must guard database=default')
  assert.equal(/USE\s+erp_isp_review/i.test(scriptText), false, 'migration must not contain USE erp_isp_review')

  assert.ok(scriptText.includes('mapping_legacy_status_values'), 'table name must appear in migration')
  assert.ok(scriptText.includes('uq_mapping_legacy_status_values'), 'unique key name must appear in migration')

  assert.equal(scriptText.includes('runReviewDbQuery'), false, 'migration must not use runtime review-db helpers')
  assert.equal(scriptText.includes('runReviewDbExecute'), false, 'migration must not use runtime review-db helpers')

  const seed = getCanonicalSeedRows()
  assert.equal(seed.length, 18, 'canonical seed row count must be 18')

  const sourceSystems = new Set(seed.map((r) => r.source_system))
  assert.deepEqual([...sourceSystems].sort(), ['FINANCE', 'GA', 'WEB_PSB'])

  const domains = new Set(seed.map((r) => r.domain_name))
  assert.deepEqual([...domains].sort(), ['ATTENDANCE', 'EMPLOYEE', 'INVENTORY', 'MOVEMENT', 'ORDER', 'SUPPORT'])

  const keySet = new Set(seed.map((r) => `${r.source_system}|${r.domain_name}|${r.legacy_status_value}`))
  assert.equal(keySet.size, 18, 'canonical seed keys must be unique')

  assert.deepEqual(
    parseInformationSchemaColumnRow({
      COLUMN_NAME: 'updated_at',
      COLUMN_TYPE: 'datetime',
      IS_NULLABLE: 'NO',
      COLUMN_DEFAULT: 'CURRENT_TIMESTAMP',
      EXTRA: 'on update CURRENT_TIMESTAMP',
    }),
    {
      column_name: 'updated_at',
      column_type: 'datetime',
      is_nullable: 'NO',
      column_default: 'CURRENT_TIMESTAMP',
      extra: 'on update CURRENT_TIMESTAMP',
    },
  )

  const mismatch = validateExistingTableContract({
    columns: [
      {
        column_name: 'id',
        column_type: 'bigint unsigned',
        is_nullable: 'NO',
        column_default: null,
        extra: 'auto_increment',
      },
    ],
    indexes: [{ index_name: 'PRIMARY', non_unique: 0, columns: ['id'] }],
    outgoingFk: false,
  })
  assert.equal(mismatch.outcome, 'FAIL')

  const workflowPath = path.resolve(__dirname, '..', '..', '..', '.github', 'workflows', 'migrate-master-mapping-status-values.yml')
  const workflowText = readText(workflowPath)
  assert.equal(
    /\/api\/import\/batches/i.test(workflowText),
    false,
    'workflow must not invoke import transform API',
  )

  assert.ok(
    workflowText.includes('information_schema.columns'),
    'workflow inline runner must reference information_schema.columns (schema validation)',
  )
  assert.ok(
    workflowText.includes('information_schema.statistics'),
    'workflow inline runner must reference information_schema.statistics (index validation)',
  )
  assert.ok(
    workflowText.includes('information_schema.key_column_usage'),
    'workflow inline runner must reference information_schema.key_column_usage (FK validation)',
  )

  const idxColumns = workflowText.indexOf('information_schema.columns')
  const idxSeed = workflowText.indexOf('INSERT INTO ')
  assert.ok(idxColumns >= 0 && idxSeed >= 0 && idxColumns < idxSeed, 'workflow must validate schema before seeding')

  assert.equal(
    /echo\s+["']?\$ERP_DATABASE_URL/i.test(workflowText),
    false,
    'workflow must not echo ERP_DATABASE_URL value',
  )
  assert.equal(
    /console\.log\([^)]*DATABASE_URL/i.test(workflowText),
    false,
    'workflow must not log DATABASE_URL value',
  )
}

main()
