#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const options = { inputDir: '', outputFile: '' };

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
      default:
        throw new Error(`Argumen tidak dikenal: ${token}`);
    }

    index += 1;
  }

  if (!options.inputDir) {
    throw new Error('Gunakan --input-dir untuk menunjuk folder JSON hasil extraction WhatsappTemplate production.');
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

function cleanText(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).replace(/`/g, '').trim();
  return text === '' ? null : text;
}

function normalizeName(value) {
  const text = cleanText(value);
  if (text === null) {
    return null;
  }

  return text.replace(/\s+/g, ' ');
}

function normalizeContent(value) {
  const text = cleanText(value);
  if (text === null) {
    return null;
  }

  return text.replace(/\r\n/g, '\n').replace(/\u0000/g, '');
}

function normalizeBoolean(value) {
  if (value === true || value === 1 || value === '1') {
    return 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === 'yes') {
      return 1;
    }
  }

  return 0;
}

function buildNormalizedKey(name) {
  if (name === null) {
    return null;
  }

  return name.toUpperCase();
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

function buildInsertStatements(tableName, columns, rows, chunkSize = 25) {
  if (rows.length === 0) {
    return [`-- ${tableName}: tidak ada row untuk diinsert.`];
  }

  const groups = [];
  for (let start = 0; start < rows.length; start += chunkSize) {
    groups.push(rows.slice(start, start + chunkSize));
  }

  return groups.map((group) => {
    const values = group.map((row) => `  (${row.join(', ')})`).join(',\n');
    return [
      `INSERT INTO ${tableName} (`,
      `  ${columns.join(',\n  ')}`,
      ') VALUES',
      `${values};`,
    ].join('\n');
  });
}

function buildAuditPayload(row) {
  const payload = {};
  for (const key of ['id', 'name', 'content', 'isDefault', 'createdAt', 'updatedAt']) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      payload[key] = row[key];
    }
  }

  return JSON.stringify(payload);
}

function buildRecords(data) {
  return data.map((row) => {
    const legacyId = cleanText(row.id);
    const templateName = normalizeName(row.name);
    const templateContent = normalizeContent(row.content);
    const isDefault = normalizeBoolean(row.isDefault);
    const validationNotes = [];

    if (templateName === null) {
      validationNotes.push('name kosong pada source WhatsappTemplate production.');
    }

    if (templateContent === null) {
      validationNotes.push('content kosong pada source WhatsappTemplate production.');
    }

    return {
      legacyId: legacyId ? `PROD-WATPL-${legacyId}` : null,
      templateName,
      templateContent,
      isDefault,
      rawPayload: buildAuditPayload(row),
      normalizedKey: buildNormalizedKey(templateName),
      importStatus: validationNotes.length === 0 ? 'MAPPED' : 'INVALID',
      validationNotes: validationNotes.length > 0 ? validationNotes.join(' | ') : null,
    };
  });
}

function countDuplicateRows(records) {
  const counts = new Map();
  for (const record of records) {
    if (record.importStatus !== 'MAPPED' || record.normalizedKey === null) {
      continue;
    }
    counts.set(record.normalizedKey, (counts.get(record.normalizedKey) ?? 0) + 1);
  }

  let duplicateRows = 0;
  for (const value of counts.values()) {
    if (value > 1) {
      duplicateRows += value - 1;
    }
  }
  return duplicateRows;
}

function buildSqlRows(records) {
  return records.map((record) => [
    '@whatsapp_template_batch_id',
    sqlString('WEB_PSB'),
    sqlString(record.legacyId),
    sqlString(record.templateName),
    sqlString(record.templateContent),
    String(record.isDefault),
    sqlString(record.rawPayload),
    sqlString(record.normalizedKey),
    sqlString(record.importStatus),
    sqlString(record.validationNotes),
  ]);
}

function main() {
  const options = parseArgs(process.argv);
  const inputDir = path.resolve(options.inputDir);
  const outputFile = path.resolve(options.outputFile);

  const rows = ensureArray(
    readJson(path.join(inputDir, 'whatsapp-templates.production.json')),
    'whatsapp-templates.production.json',
  );

  const records = buildRecords(rows);
  const validRows = records.filter((record) => record.importStatus === 'MAPPED').length;
  const invalidRows = records.length - validRows;
  const duplicateRows = countDuplicateRows(records);
  const batchCode = 'PROD-WEBPSB-WATPL-001';

  const sqlLines = [
    '-- Auto-generated loader untuk Wave 1 WhatsappTemplate production Web PSB.',
    'USE erp_isp_review;',
    '',
    `DELETE FROM staging_legacy_whatsapp_template_records WHERE batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlString(batchCode)});`,
    `DELETE FROM staging_import_batches WHERE batch_code = ${sqlString(batchCode)};`,
    '',
    'INSERT INTO staging_import_batches (',
    '  batch_code,',
    '  source_system,',
    '  import_scope,',
    '  source_file_name,',
    '  import_status,',
    '  total_rows,',
    '  valid_rows,',
    '  invalid_rows,',
    '  duplicate_rows,',
    '  notes',
    ') VALUES (',
    `  ${sqlString(batchCode)},`,
    `  ${sqlString('WEB_PSB')},`,
    `  ${sqlString('PSB_WHATSAPP_TEMPLATE')},`,
    `  ${sqlString('whatsapp-templates.production.json')},`,
    `  ${sqlString('MAPPED')},`,
    `  ${String(records.length)},`,
    `  ${String(validRows)},`,
    `  ${String(invalidRows)},`,
    `  ${String(duplicateRows)},`,
    `  ${sqlString('Loader production WhatsappTemplate Web PSB untuk helper_whatsapp_templates')}`,
    ');',
    '',
    `SET @whatsapp_template_batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlString(batchCode)} ORDER BY id DESC LIMIT 1);`,
    '',
    ...buildInsertStatements(
      'staging_legacy_whatsapp_template_records',
      [
        'batch_id',
        'source_system',
        'legacy_id',
        'template_name',
        'template_content',
        'is_default',
        'raw_payload',
        'normalized_key',
        'import_status',
        'validation_notes',
      ],
      buildSqlRows(records),
      25,
    ),
  ];

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${sqlLines.join('\n')}\n`, 'utf8');

  console.log(JSON.stringify({
    inputDir,
    outputFile,
    counts: {
      total: records.length,
      valid: validRows,
      invalid: invalidRows,
      duplicates: duplicateRows,
      defaultRows: records.filter((record) => record.isDefault === 1).length,
    },
    batchCode,
  }, null, 2));
}

main();
