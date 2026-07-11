#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const options = {
    inputDir: '',
    outputFile: '',
    coverageStatus: '',
    branchCode: '',
    city: '',
    province: '',
  };

  for (let index = 2; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (!token.startsWith('--')) {
      continue;
    }

    if (next === undefined || next.startsWith('--')) {
      throw new Error(`Argumen ${token} membutuhkan nilai.`);
    }

    switch (token) {
      case '--input-dir':
        options.inputDir = next;
        break;
      case '--output-file':
        options.outputFile = next;
        break;
      case '--coverage-status':
        options.coverageStatus = next;
        break;
      case '--branch-code':
        options.branchCode = next;
        break;
      case '--city':
        options.city = next;
        break;
      case '--province':
        options.province = next;
        break;
      default:
        throw new Error(`Argumen tidak dikenal: ${token}`);
    }

    index += 1;
  }

  if (!options.inputDir) {
    throw new Error('Gunakan --input-dir untuk menunjuk folder JSON hasil extraction production.');
  }

  if (!options.outputFile) {
    throw new Error('Gunakan --output-file untuk menentukan file SQL hasil generator.');
  }

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} harus berupa array JSON.`);
  }

  return value;
}

function sqlString(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  const text = String(value)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\u0000/g, '');

  return `'${text}'`;
}

function sqlNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : 'NULL';
}

function sqlDecimal(value, scale) {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 'NULL';
  }

  return parsed.toFixed(scale);
}

function sqlBoolean(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  return value ? '1' : '0';
}

function sqlDateTime(value) {
  if (!value) {
    return 'NULL';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'NULL';
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  const hours = String(parsed.getUTCHours()).padStart(2, '0');
  const minutes = String(parsed.getUTCMinutes()).padStart(2, '0');
  const seconds = String(parsed.getUTCSeconds()).padStart(2, '0');

  return sqlString(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
}

function normalizeKey(parts) {
  return parts
    .filter((part) => part !== null && part !== undefined && String(part).trim() !== '')
    .map((part) => String(part).trim().toUpperCase())
    .join('|');
}

function sanitizeToken(value, maxLength = 36) {
  if (value === null || value === undefined) {
    return 'ROW';
  }

  const normalized = String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!normalized) {
    return 'ROW';
  }

  return normalized.slice(0, maxLength);
}

function chunk(array, size) {
  const result = [];

  for (let start = 0; start < array.length; start += size) {
    result.push(array.slice(start, start + size));
  }

  return result;
}

function buildInsertStatements(tableName, columns, rows, chunkSize = 250) {
  if (rows.length === 0) {
    return [`-- ${tableName}: tidak ada row untuk diinsert.`];
  }

  return chunk(rows, chunkSize).map((group) => {
    const values = group
      .map((row) => `  (${row.join(', ')})`)
      .join(',\n');

    return [
      `INSERT INTO ${tableName} (`,
      `  ${columns.join(',\n  ')}`,
      `) VALUES`,
      `${values};`,
    ].join('\n');
  });
}

function sqlUnicodeLiteral(value) {
  return `_utf8mb4${sqlString(value)} COLLATE utf8mb4_unicode_ci`;
}

function buildCoverageRows(data, options) {
  return data.map((row) => {
    const legacyId = `PROD-AREA-${row.id}`;
    const areaCode = `PSB-PROD-AREA-${String(row.id).padStart(6, '0')}`;
    const payload = JSON.stringify(row);
    const notes = row.description ?? null;

    return [
      '@coverage_batch_id',
      sqlString('WEB_PSB'),
      sqlString(legacyId),
      sqlString(options.branchCode || null),
      sqlString(areaCode),
      sqlString(row.name ?? null),
      sqlString(options.coverageStatus || null),
      'NULL',
      'NULL',
      sqlString(options.city || null),
      sqlString(options.province || null),
      'NULL',
      'NULL',
      sqlString(notes),
      sqlString(payload),
      sqlString(normalizeKey([row.name, row.description])),
      sqlString('MAPPED'),
      'NULL',
      'NULL',
    ];
  });
}

function buildMarketingRows(data, options) {
  return data.map((row) => {
    const legacyId = `PROD-MA-${row.id}`;
    const payload = JSON.stringify(row);

    return [
      '@marketing_batch_id',
      sqlString('WEB_PSB'),
      sqlString(legacyId),
      sqlString(options.branchCode || null),
      sqlDateTime(row.date),
      sqlString(row.marketingName ?? null),
      sqlString(row.activity ?? null),
      sqlString(row.notes ?? null),
      sqlString(payload),
      sqlString(normalizeKey([row.date, row.marketingName, row.activity, row.notes])),
      sqlString('MAPPED'),
      'NULL',
      'NULL',
    ];
  });
}

function buildMarketingAreaRows(data) {
  const rows = [];

  for (const item of data) {
    const areaIds = [item.areaId, item.areaId2, item.areaId3, item.areaId4];
    let sortOrder = 1;

    for (const areaId of areaIds) {
      if (areaId === null || areaId === undefined || areaId === '') {
        continue;
      }

      rows.push([
        '@marketing_batch_id',
        sqlString('WEB_PSB'),
        sqlString(`PROD-MA-${item.id}`),
        sqlString(`PROD-AREA-${areaId}`),
        sqlNumber(sortOrder),
        sqlString(JSON.stringify({
          marketingActivityId: item.id,
          areaId,
          sortOrder,
        })),
        sqlString(normalizeKey([item.id, areaId, sortOrder])),
        sqlString('MAPPED'),
        'NULL',
        'NULL',
      ]);

      sortOrder += 1;
    }
  }

  return rows;
}

function buildOdpRows(data) {
  return data.map((row) => {
    const payload = JSON.stringify(row);
    const legacyId = `PROD-ODP-${row.id}-${sanitizeToken(row.nama_odp)}`;

    return [
      '@odp_batch_id',
      sqlString('WEB_PSB'),
      sqlString(legacyId),
      sqlString(row.nama_odp ?? null),
      sqlString(row.nama_odp ?? null),
      sqlString(row.wilayah ?? null),
      sqlString(row.lokasi ?? null),
      sqlDecimal(row.latitude, 7),
      sqlDecimal(row.longitude, 7),
      sqlNumber(row.kapasitas),
      sqlNumber(row.terpakai),
      sqlString(row.status_tiang ?? null),
      sqlBoolean(row.is_active),
      sqlString(payload),
      sqlString(normalizeKey([row.nama_odp, row.wilayah, row.lokasi])),
      sqlString('MAPPED'),
      'NULL',
      'NULL',
    ];
  });
}

function buildTtSlaRows(data) {
  return data.map((row) => {
    const payload = JSON.stringify(row);

    return [
      '@ttsla_batch_id',
      sqlString('WEB_PSB'),
      sqlString('TROUBLE_TICKET_SLA'),
      sqlString(`PROD-SLA-${row.id}`),
      'NULL',
      'NULL',
      'NULL',
      sqlString(row.type ?? null),
      'NULL',
      'NULL',
      'NULL',
      'NULL',
      sqlString(payload),
      sqlString(normalizeKey([row.type])),
      sqlString('MAPPED'),
      'NULL',
      'NULL',
    ];
  });
}

function main() {
  const options = parseArgs(process.argv);
  const inputDir = path.resolve(options.inputDir);
  const outputFile = path.resolve(options.outputFile);

  const coveredArea = ensureArray(
    readJson(path.join(inputDir, 'covered-area.production.json')),
    'covered-area.production.json',
  );
  const marketingActivity = ensureArray(
    readJson(path.join(inputDir, 'marketing-activity.production.json')),
    'marketing-activity.production.json',
  );
  const odp = ensureArray(
    readJson(path.join(inputDir, 'psb-odp.production.json')),
    'psb-odp.production.json',
  );
  const ttSla = ensureArray(
    readJson(path.join(inputDir, 'trouble-ticket-sla.production.json')),
    'trouble-ticket-sla.production.json',
  );

  const coverageRows = buildCoverageRows(coveredArea, options);
  const marketingRows = buildMarketingRows(marketingActivity, options);
  const marketingAreaRows = buildMarketingAreaRows(marketingActivity);
  const odpRows = buildOdpRows(odp);
  const ttSlaRows = buildTtSlaRows(ttSla);
  const coverageBatchCode = 'PROD-WEBPSB-COVERAGE-001';
  const marketingBatchCode = 'PROD-WEBPSB-MARKETING-001';
  const odpBatchCode = 'PROD-WEBPSB-ODP-001';
  const ttSlaBatchCode = 'PROD-WEBPSB-TTSLA-001';

  const lines = [
    '-- Generated by scripts/generate-wave2-production-loader.mjs',
    '-- Sumber file JSON production jangan di-commit ke repository.',
    'USE erp_isp_review;',
    '',
    `INSERT INTO staging_import_batches (batch_code, source_system, import_scope, import_status, total_rows, valid_rows, notes) VALUES (${sqlUnicodeLiteral(coverageBatchCode)}, 'WEB_PSB', 'PSB_COVERAGE_PRODUCTION', 'MAPPED', ${coverageRows.length}, ${coverageRows.length}, 'Generated dari JSON production CoveredArea Web PSB') ON DUPLICATE KEY UPDATE import_scope = VALUES(import_scope), import_status = VALUES(import_status), total_rows = VALUES(total_rows), valid_rows = VALUES(valid_rows), notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP;`,
    `INSERT INTO staging_import_batches (batch_code, source_system, import_scope, import_status, total_rows, valid_rows, notes) VALUES (${sqlUnicodeLiteral(marketingBatchCode)}, 'WEB_PSB', 'PSB_MARKETING_ACTIVITY_PRODUCTION', 'MAPPED', ${marketingRows.length}, ${marketingRows.length}, 'Generated dari JSON production MarketingActivity Web PSB') ON DUPLICATE KEY UPDATE import_scope = VALUES(import_scope), import_status = VALUES(import_status), total_rows = VALUES(total_rows), valid_rows = VALUES(valid_rows), notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP;`,
    `INSERT INTO staging_import_batches (batch_code, source_system, import_scope, import_status, total_rows, valid_rows, notes) VALUES (${sqlUnicodeLiteral(odpBatchCode)}, 'WEB_PSB', 'PSB_ODP_HEADER_PRODUCTION', 'MAPPED', ${odpRows.length}, ${odpRows.length}, 'Generated dari JSON production psb_odp Web PSB') ON DUPLICATE KEY UPDATE import_scope = VALUES(import_scope), import_status = VALUES(import_status), total_rows = VALUES(total_rows), valid_rows = VALUES(valid_rows), notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP;`,
    `INSERT INTO staging_import_batches (batch_code, source_system, import_scope, import_status, total_rows, valid_rows, notes) VALUES (${sqlUnicodeLiteral(ttSlaBatchCode)}, 'WEB_PSB', 'PSB_TROUBLE_TICKET_SLA_PRODUCTION', 'MAPPED', ${ttSlaRows.length}, ${ttSlaRows.length}, 'Generated dari JSON production TroubleTicketSla Web PSB') ON DUPLICATE KEY UPDATE import_scope = VALUES(import_scope), import_status = VALUES(import_status), total_rows = VALUES(total_rows), valid_rows = VALUES(valid_rows), notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP;`,
    '',
    `SET @coverage_batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlUnicodeLiteral(coverageBatchCode)} ORDER BY id DESC LIMIT 1);`,
    `SET @marketing_batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlUnicodeLiteral(marketingBatchCode)} ORDER BY id DESC LIMIT 1);`,
    `SET @odp_batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlUnicodeLiteral(odpBatchCode)} ORDER BY id DESC LIMIT 1);`,
    `SET @ttsla_batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlUnicodeLiteral(ttSlaBatchCode)} ORDER BY id DESC LIMIT 1);`,
    '',
    'DELETE FROM staging_legacy_sales_coverage_records WHERE batch_id = @coverage_batch_id;',
    'DELETE FROM staging_legacy_marketing_activity_area_records WHERE batch_id = @marketing_batch_id;',
    'DELETE FROM staging_legacy_marketing_activity_records WHERE batch_id = @marketing_batch_id;',
    'DELETE FROM staging_legacy_network_odp_records WHERE batch_id = @odp_batch_id;',
    'DELETE FROM staging_legacy_support_records WHERE batch_id = @ttsla_batch_id;',
    '',
    ...buildInsertStatements(
      'staging_legacy_sales_coverage_records',
      [
        'batch_id',
        'source_system',
        'legacy_id',
        'branch_code',
        'area_code',
        'area_name',
        'coverage_status',
        'village',
        'district',
        'city',
        'province',
        'latitude',
        'longitude',
        'notes',
        'raw_payload',
        'normalized_key',
        'import_status',
        'validation_notes',
        'imported_at',
      ],
      coverageRows,
    ),
    '',
    ...buildInsertStatements(
      'staging_legacy_marketing_activity_records',
      [
        'batch_id',
        'source_system',
        'legacy_id',
        'branch_code',
        'activity_date',
        'marketing_name',
        'activity_type',
        'notes',
        'raw_payload',
        'normalized_key',
        'import_status',
        'validation_notes',
        'imported_at',
      ],
      marketingRows,
    ),
    '',
    ...buildInsertStatements(
      'staging_legacy_marketing_activity_area_records',
      [
        'batch_id',
        'source_system',
        'legacy_activity_id',
        'legacy_area_id',
        'sort_order',
        'raw_payload',
        'normalized_key',
        'import_status',
        'validation_notes',
        'imported_at',
      ],
      marketingAreaRows,
    ),
    '',
    ...buildInsertStatements(
      'staging_legacy_network_odp_records',
      [
        'batch_id',
        'source_system',
        'legacy_id',
        'odp_code',
        'odp_name',
        'region_name',
        'location_text',
        'latitude',
        'longitude',
        'total_ports',
        'active_ports',
        'pole_status',
        'is_active',
        'raw_payload',
        'normalized_key',
        'import_status',
        'validation_notes',
        'imported_at',
      ],
      odpRows,
      150,
    ),
    '',
    ...buildInsertStatements(
      'staging_legacy_support_records',
      [
        'batch_id',
        'source_system',
        'support_type',
        'legacy_id',
        'legacy_customer_id',
        'legacy_parent_id',
        'ticket_code',
        'trouble_type',
        'support_status',
        'opened_at',
        'closed_at',
        'reason_text',
        'raw_payload',
        'normalized_key',
        'import_status',
        'validation_notes',
        'imported_at',
      ],
      ttSlaRows,
    ),
    '',
    'SELECT',
    `  ${sqlString(coverageBatchCode)} AS coverage_batch_code,`,
    `  ${sqlString(marketingBatchCode)} AS marketing_batch_code,`,
    `  ${sqlString(odpBatchCode)} AS odp_batch_code,`,
    `  ${sqlString(ttSlaBatchCode)} AS ttsla_batch_code,`,
    `  ${coverageRows.length} AS coverage_rows,`,
    `  ${marketingRows.length} AS marketing_rows,`,
    `  ${marketingAreaRows.length} AS marketing_area_rows,`,
    `  ${odpRows.length} AS odp_rows,`,
    `  ${ttSlaRows.length} AS ttsla_rows;`,
    '',
  ];

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, lines.join('\n'));

  console.log(JSON.stringify({
    inputDir,
    outputFile,
    counts: {
      coverage: coverageRows.length,
      marketing: marketingRows.length,
      marketingAreas: marketingAreaRows.length,
      odp: odpRows.length,
      troubleTicketSla: ttSlaRows.length,
    },
    batchCodes: {
      coverage: coverageBatchCode,
      marketing: marketingBatchCode,
      odp: odpBatchCode,
      troubleTicketSla: ttSlaBatchCode,
    },
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
