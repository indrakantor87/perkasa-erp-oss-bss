import assert from 'node:assert/strict'
import {
  getMigrationId,
  getPortStatusEnumValues,
  isPortStatusEnumType,
  parseInformationSchemaColumnRow,
  parseMode,
  validateBackupEvidence,
} from '../scripts/migrate-phase-1-1-odp'

async function main() {
  assert.equal(getMigrationId(), 'phase-1.1-odp-2026-09-08')

  assert.deepEqual(getPortStatusEnumValues(), ['AVAILABLE', 'USED', 'RESERVED', 'FAULTY', 'DISABLED'])

  assert.equal(parseMode(['--mode=precheck']), 'precheck')
  assert.equal(parseMode(['--mode=apply']), 'apply')
  assert.equal(parseMode(['--mode=postcheck']), 'postcheck')
  assert.equal(parseMode(['--mode=unknown']), null)
  assert.equal(parseMode([]), null)

  assert.deepEqual(
    parseInformationSchemaColumnRow({
      COLUMN_NAME: 'port_no',
      COLUMN_TYPE: 'varchar(30)',
      IS_NULLABLE: 'NO',
      COLUMN_DEFAULT: null,
    }),
    { column_name: 'port_no', column_type: 'varchar(30)', is_nullable: 'NO', column_default: null },
  )

  assert.equal(
    parseInformationSchemaColumnRow({
      COLUMN_NAME: 'port_no',
      IS_NULLABLE: 'NO',
    }),
    null,
  )

  assert.equal(
    isPortStatusEnumType("enum('AVAILABLE','USED','RESERVED','FAULTY','DISABLED')"),
    true,
  )

  assert.equal(
    isPortStatusEnumType("enum('AVAILABLE','USED','BLOCKED')"),
    false,
  )

  assert.deepEqual(
    validateBackupEvidence({
      backupIdentifier: 'bk-001',
      backupTimestampUtc: '2026-09-08T12:00:00Z',
      backupLocation: 's3://example-bucket/backups/production-default-20260908-final.sql.gz',
      backupChecksumSha256: 'e6742fa75e6ef1e40c6cab1b1950a57c317ba59632e5af3712906041da361d1c',
      confirmBackupDurable: 'YES_DURABLE_OFFHOST_CONFIRMED',
    }),
    { ok: true },
  )

  assert.equal(
    validateBackupEvidence({
      backupIdentifier: 'bk-001',
      backupTimestampUtc: 'invalid',
      backupLocation: 's3://bucket/file.sql.gz',
      backupChecksumSha256: 'e6742fa75e6ef1e40c6cab1b1950a57c317ba59632e5af3712906041da361d1c',
      confirmBackupDurable: 'YES_DURABLE_OFFHOST_CONFIRMED',
    }).ok,
    false,
  )

  assert.equal(
    validateBackupEvidence({
      backupIdentifier: 'bk-001',
      backupTimestampUtc: '2026-09-08T12:00:00Z',
      backupLocation: '/tmp/production-default-20260908-final.sql.gz',
      backupChecksumSha256: 'e6742fa75e6ef1e40c6cab1b1950a57c317ba59632e5af3712906041da361d1c',
      confirmBackupDurable: 'YES_DURABLE_OFFHOST_CONFIRMED',
    }).ok,
    false,
  )
}

main()
