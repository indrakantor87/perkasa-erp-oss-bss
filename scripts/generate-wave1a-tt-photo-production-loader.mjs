#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const options = {
    inputDir: '',
    outputFile: '',
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
      default:
        throw new Error(`Argumen tidak dikenal: ${token}`);
    }

    index += 1;
  }

  if (!options.inputDir) {
    throw new Error('Gunakan --input-dir untuk menunjuk folder JSON hasil extraction production TT photo.');
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

  const text = String(value)
    .replace(/`/g, '')
    .trim();

  return text === '' ? null : text;
}

function firstNonEmpty(record, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const value = cleanText(record[key]);
      if (value !== null) {
        return value;
      }
    }
  }

  return null;
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

function buildAuditPayload(row) {
  const payload = {};
  for (const key of ['id', 'ticketId', 'filePath', 'mimeType', 'sizeBytes', 'createdAt']) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      payload[key] = row[key];
    }
  }

  return JSON.stringify(payload);
}

function buildPhotoRows(data) {
  return data.map((row) => {
    const ticketId = firstNonEmpty(row, ['ticketId']);
    const filePath = firstNonEmpty(row, ['filePath', 'photoPath', 'path']);
    const importStatus = ticketId && filePath ? 'MAPPED' : 'INVALID';
    const validationNotes = [];

    if (!ticketId) {
      validationNotes.push('ticketId kosong pada source TroubleTicketPhoto production.');
    }

    if (!filePath) {
      validationNotes.push('filePath kosong pada source TroubleTicketPhoto production.');
    }

    return [
      '@support_batch_id',
      sqlString('WEB_PSB'),
      sqlString('TROUBLE_TICKET_PHOTO'),
      sqlString(`PROD-TTPH-${row.id}`),
      sqlString(null),
      sqlString(ticketId ? `PROD-TT-${ticketId}` : null),
      sqlString(ticketId),
      sqlString(ticketId),
      sqlString(null),
      sqlString(null),
      sqlString(null),
      sqlString(null),
      sqlString(null),
      sqlString(null),
      sqlString(null),
      sqlString(null),
      sqlString(null),
      'NULL',
      'NULL',
      sqlString(null),
      sqlString(null),
      sqlString(null),
      sqlString(null),
      sqlString(null),
      sqlString(filePath ? JSON.stringify([filePath]) : null),
      sqlString(buildAuditPayload(row)),
      sqlString([ticketId, filePath].filter(Boolean).join('|').toUpperCase()),
      sqlString(importStatus),
      sqlString(validationNotes.length > 0 ? validationNotes.join(' | ') : null),
    ];
  });
}

function main() {
  const options = parseArgs(process.argv);
  const inputDir = path.resolve(options.inputDir);
  const outputFile = path.resolve(options.outputFile);

  const photos = ensureArray(
    readJson(path.join(inputDir, 'trouble-ticket-photo.production.json')),
    'trouble-ticket-photo.production.json',
  );

  const rows = buildPhotoRows(photos);
  const validRows = rows.filter((row) => row[27] === "'MAPPED'").length;
  const invalidRows = rows.length - validRows;
  const batchCode = 'PROD-WEBPSB-TTPHOTO-001';

  const sqlLines = [
    '-- Auto-generated loader untuk Wave 1A TroubleTicketPhoto production Web PSB.',
    'USE erp_isp_review;',
    '',
    `DELETE FROM staging_legacy_support_records WHERE batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlString(batchCode)});`,
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
    `  ${sqlString('PSB_SUPPORT_TT_PHOTO')},`,
    `  ${sqlString('trouble-ticket-photo.production.json')},`,
    `  ${sqlString('MAPPED')},`,
    `  ${String(rows.length)},`,
    `  ${String(validRows)},`,
    `  ${String(invalidRows)},`,
    '  0,',
    `  ${sqlString('Loader production TroubleTicketPhoto Web PSB')}`,
    ');',
    '',
    `SET @support_batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlString(batchCode)} ORDER BY id DESC LIMIT 1);`,
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
        'legacy_reference_code',
        'ticket_code',
        'customer_name',
        'customer_address',
        'customer_phone',
        'customer_user',
        'marketing_name',
        'radbox_name',
        'category',
        'trouble_type',
        'support_status',
        'opened_at',
        'closed_at',
        'reason_text',
        'note_text',
        'actor_name',
        'problem_category',
        'resolution_action',
        'photo_list_text',
        'raw_payload',
        'normalized_key',
        'import_status',
        'validation_notes',
      ],
      rows,
      25,
    ),
  ];

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${sqlLines.join('\n')}\n`, 'utf8');

  console.log(JSON.stringify({
    inputDir,
    outputFile,
    counts: {
      total: rows.length,
      valid: validRows,
      invalid: invalidRows,
    },
    batchCode,
  }, null, 2));
}

main();
