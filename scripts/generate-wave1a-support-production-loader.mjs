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
    throw new Error('Gunakan --input-dir untuk menunjuk folder JSON hasil extraction production support.');
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

function sqlUnicodeLiteral(value) {
  return `_utf8mb4${sqlString(value)} COLLATE utf8mb4_unicode_ci`;
}

function sqlNumber(value) {
  if (value === null || value === undefined || value === '') {
    return 'NULL';
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

function normalizeSupportStatus(value) {
  const text = cleanText(value);
  return text ? text.toUpperCase() : null;
}

function buildInsertStatements(tableName, columns, rows, chunkSize = 250) {
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

function supportRecordRow(values) {
  return [
    '@support_batch_id',
    sqlString('WEB_PSB'),
    sqlString(values.supportType),
    sqlString(values.legacyId),
    sqlString(values.legacyCustomerId),
    sqlString(values.legacyParentId),
    sqlString(values.legacyReferenceCode),
    sqlString(values.ticketCode),
    sqlString(values.customerName),
    sqlString(values.customerAddress),
    sqlString(values.customerPhone),
    sqlString(values.customerUser),
    sqlString(values.marketingName),
    sqlString(values.radboxName),
    sqlString(values.category),
    sqlString(values.troubleType),
    sqlString(values.supportStatus),
    sqlDateTime(values.openedAt),
    sqlDateTime(values.closedAt),
    sqlString(values.reasonText),
    sqlString(values.noteText),
    sqlString(values.actorName),
    sqlString(values.problemCategory),
    sqlString(values.resolutionAction),
    sqlString(values.photoListText),
    sqlString(values.rawPayload),
    sqlString(values.normalizedKey),
    sqlString(values.importStatus ?? 'MAPPED'),
    sqlString(values.validationNotes),
  ];
}

function buildIsolationRows(data) {
  return data.map((row) => {
    const payload = JSON.stringify(row);
    const isolationDate = firstNonEmpty(row, ['isolationDate']);
    const restorationDate = firstNonEmpty(row, ['restorationDate']);
    const archivedAt = firstNonEmpty(row, ['archivedAt']);
    const reason = firstNonEmpty(row, ['reason']);
    const closeNote = firstNonEmpty(row, ['closeNote']);

    return supportRecordRow({
      supportType: 'ISOLATION',
      legacyId: `PROD-ISO-${row.id}`,
      legacyCustomerId: firstNonEmpty(row, ['customerId', 'customerRef', 'legacyCustomerId']),
      legacyParentId: firstNonEmpty(row, ['ticketId']) ? `PROD-TICKET-${firstNonEmpty(row, ['ticketId'])}` : null,
      legacyReferenceCode: firstNonEmpty(row, ['ticketDismantle']),
      ticketCode: firstNonEmpty(row, ['ticketId']),
      customerName: firstNonEmpty(row, ['customerName']),
      customerAddress: firstNonEmpty(row, ['customerAddress', 'addressText', 'address']),
      customerPhone: firstNonEmpty(row, ['customerPhone', 'phoneNumber', 'phone']),
      customerUser: firstNonEmpty(row, ['user', 'customerUser']),
      marketingName: firstNonEmpty(row, ['marketingName', 'marketing']),
      radboxName: firstNonEmpty(row, ['radboox', 'radbox', 'radboxName']),
      category: null,
      troubleType: null,
      supportStatus: normalizeSupportStatus(firstNonEmpty(row, ['status'])),
      openedAt: isolationDate,
      closedAt: restorationDate ?? archivedAt,
      reasonText: reason,
      noteText: closeNote,
      actorName: null,
      problemCategory: null,
      resolutionAction: null,
      photoListText: null,
      rawPayload: payload,
      normalizedKey: normalizeKey([row.id, row.customerName, isolationDate, row.ticketDismantle]),
      validationNotes: null,
    });
  });
}

function buildDismantleQueueRows(data) {
  return data.map((row) => {
    const payload = JSON.stringify(row);

    return supportRecordRow({
      supportType: 'DISMANTLE_QUEUE',
      legacyId: `PROD-DQ-${row.id}`,
      legacyCustomerId: firstNonEmpty(row, ['customerId', 'customerRef', 'legacyCustomerId']),
      legacyParentId: firstNonEmpty(row, ['sourceIsolationId']) ? `PROD-ISO-${firstNonEmpty(row, ['sourceIsolationId'])}` : null,
      legacyReferenceCode: firstNonEmpty(row, ['ticketNumber', 'ticketDismantle']),
      ticketCode: firstNonEmpty(row, ['ticketNumber']),
      customerName: firstNonEmpty(row, ['customerName']),
      customerAddress: firstNonEmpty(row, ['customerAddress', 'addressText', 'address']),
      customerPhone: firstNonEmpty(row, ['customerPhone', 'phoneNumber', 'phone']),
      customerUser: null,
      marketingName: firstNonEmpty(row, ['marketingName', 'marketing']),
      radboxName: firstNonEmpty(row, ['radboox', 'radbox', 'radboxName']),
      category: null,
      troubleType: null,
      supportStatus: normalizeSupportStatus(firstNonEmpty(row, ['status'])),
      openedAt: firstNonEmpty(row, ['isolationDate', 'openedAt', 'createdAt']),
      closedAt: null,
      reasonText: firstNonEmpty(row, ['reason']),
      noteText: firstNonEmpty(row, ['fieldNote', 'note', 'closeNote']),
      actorName: firstNonEmpty(row, ['actorName', 'assignedBy']),
      problemCategory: null,
      resolutionAction: null,
      photoListText: null,
      rawPayload: payload,
      normalizedKey: normalizeKey([row.id, row.sourceIsolationId, row.ticketNumber, row.customerName]),
      validationNotes: null,
    });
  });
}

function buildDismantleHistoryRows(data) {
  return data.map((row) => {
    const payload = JSON.stringify(row);

    return supportRecordRow({
      supportType: 'DISMANTLE_HISTORY',
      legacyId: `PROD-DH-${row.id}`,
      legacyCustomerId: firstNonEmpty(row, ['customerId', 'customerRef', 'legacyCustomerId']),
      legacyParentId: firstNonEmpty(row, ['sourceIsolationId']) ? `PROD-ISO-${firstNonEmpty(row, ['sourceIsolationId'])}` : null,
      legacyReferenceCode: firstNonEmpty(row, ['ticketDismantle', 'ticketNumber']),
      ticketCode: firstNonEmpty(row, ['ticketDismantle', 'ticketNumber']),
      customerName: firstNonEmpty(row, ['customerName']),
      customerAddress: firstNonEmpty(row, ['customerAddress', 'addressText', 'address']),
      customerPhone: firstNonEmpty(row, ['customerPhone', 'phoneNumber', 'phone']),
      customerUser: null,
      marketingName: firstNonEmpty(row, ['marketingName', 'marketing']),
      radboxName: firstNonEmpty(row, ['radboox', 'radbox', 'radboxName']),
      category: null,
      troubleType: null,
      supportStatus: normalizeSupportStatus(firstNonEmpty(row, ['status'])),
      openedAt: firstNonEmpty(row, ['isolationDate', 'openedAt']),
      closedAt: firstNonEmpty(row, ['closedAt']),
      reasonText: firstNonEmpty(row, ['closeNote']),
      noteText: firstNonEmpty(row, ['closeNote']),
      actorName: firstNonEmpty(row, ['closedBy', 'actorName']),
      problemCategory: null,
      resolutionAction: null,
      photoListText: null,
      rawPayload: payload,
      normalizedKey: normalizeKey([row.id, row.sourceIsolationId, row.ticketDismantle, row.customerName, row.closedAt]),
      validationNotes: null,
    });
  });
}

function buildTroubleTicketRows(data) {
  return data.map((row) => {
    const payload = JSON.stringify(row);
    const closePhotos = Array.isArray(row.closePhotos) ? row.closePhotos : [];

    return supportRecordRow({
      supportType: 'TROUBLE_TICKET',
      legacyId: `PROD-TT-${row.id}`,
      legacyCustomerId: firstNonEmpty(row, ['customerId', 'customerRef', 'legacyCustomerId']),
      legacyParentId: null,
      legacyReferenceCode: firstNonEmpty(row, ['ticketCode']),
      ticketCode: firstNonEmpty(row, ['ticketCode']),
      customerName: firstNonEmpty(row, ['customerName']),
      customerAddress: firstNonEmpty(row, ['customerAddress', 'addressText', 'address']),
      customerPhone: firstNonEmpty(row, ['customerPhone', 'phoneNumber', 'phone']),
      customerUser: firstNonEmpty(row, ['user', 'customerUser']),
      marketingName: firstNonEmpty(row, ['marketingName', 'marketing']),
      radboxName: firstNonEmpty(row, ['radboox', 'radbox', 'radboxName']),
      category: firstNonEmpty(row, ['category']),
      troubleType: firstNonEmpty(row, ['type']),
      supportStatus: normalizeSupportStatus(firstNonEmpty(row, ['status'])),
      openedAt: firstNonEmpty(row, ['openedAt']),
      closedAt: firstNonEmpty(row, ['closedAt']),
      reasonText: firstNonEmpty(row, ['notes', 'description']),
      noteText: firstNonEmpty(row, ['closeNotes', 'notes']),
      actorName: firstNonEmpty(row, ['closedBy', 'actorName']),
      problemCategory: firstNonEmpty(row, ['problemCategory']),
      resolutionAction: firstNonEmpty(row, ['resolutionAction']),
      photoListText: closePhotos.length > 0 ? JSON.stringify(closePhotos) : null,
      rawPayload: payload,
      normalizedKey: normalizeKey([row.id, row.ticketCode, row.customerName, row.openedAt]),
      validationNotes: null,
    });
  });
}

function main() {
  const options = parseArgs(process.argv);
  const inputDir = path.resolve(options.inputDir);
  const outputFile = path.resolve(options.outputFile);

  const isolation = ensureArray(
    readJson(path.join(inputDir, 'isolation.production.json')),
    'isolation.production.json',
  );
  const dismantleTickets = ensureArray(
    readJson(path.join(inputDir, 'dismantle-tickets.production.json')),
    'dismantle-tickets.production.json',
  );
  const dismantleHistory = ensureArray(
    readJson(path.join(inputDir, 'dismantle-history.production.json')),
    'dismantle-history.production.json',
  );
  const troubleTicket = ensureArray(
    readJson(path.join(inputDir, 'trouble-ticket.production.json')),
    'trouble-ticket.production.json',
  );

  const isolationRows = buildIsolationRows(isolation);
  const dismantleQueueRows = buildDismantleQueueRows(dismantleTickets);
  const dismantleHistoryRows = buildDismantleHistoryRows(dismantleHistory);
  const troubleTicketRows = buildTroubleTicketRows(troubleTicket);
  const allRows = [
    ...isolationRows,
    ...dismantleQueueRows,
    ...dismantleHistoryRows,
    ...troubleTicketRows,
  ];

  const batchCode = 'PROD-WEBPSB-SUPPORT-CORE-001';
  const totalRows = allRows.length;

  const lines = [
    '-- Generated by scripts/generate-wave1a-support-production-loader.mjs',
    'USE erp_isp_review;',
    '',
    `SET @support_batch_code = ${sqlUnicodeLiteral(batchCode)};`,
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
    `  ${sqlString('PSB_SUPPORT_CORE')},`,
    `  ${sqlString('web-psb-support-core.production.json')},`,
    `  ${sqlString('UPLOADED')},`,
    `  ${totalRows},`,
    '  0,',
    '  0,',
    '  0,',
    `  ${sqlString('batch production support inti Web PSB untuk isolation, dismantle queue, dismantle history, dan trouble ticket')}`,
    ')',
    'ON DUPLICATE KEY UPDATE',
    '  source_file_name = VALUES(source_file_name),',
    '  import_status = VALUES(import_status),',
    '  total_rows = VALUES(total_rows),',
    '  valid_rows = VALUES(valid_rows),',
    '  invalid_rows = VALUES(invalid_rows),',
    '  duplicate_rows = VALUES(duplicate_rows),',
    '  notes = VALUES(notes),',
    '  updated_at = CURRENT_TIMESTAMP;',
    '',
    `SET @support_batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlUnicodeLiteral(batchCode)} ORDER BY id DESC LIMIT 1);`,
    '',
    'DELETE FROM staging_legacy_support_records WHERE batch_id = @support_batch_id;',
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
      allRows,
      200,
    ),
    '',
    'UPDATE staging_import_batches',
    `SET import_status = ${sqlString('MAPPED')},`,
    `    valid_rows = ${totalRows},`,
    '    invalid_rows = 0,',
    '    duplicate_rows = 0,',
    '    updated_at = CURRENT_TIMESTAMP',
    'WHERE id = @support_batch_id;',
    '',
    'SELECT',
    `  ${sqlString(batchCode)} AS support_batch_code,`,
    `  ${isolationRows.length} AS isolation_rows,`,
    `  ${dismantleQueueRows.length} AS dismantle_queue_rows,`,
    `  ${dismantleHistoryRows.length} AS dismantle_history_rows,`,
    `  ${troubleTicketRows.length} AS trouble_ticket_rows,`,
    `  ${totalRows} AS total_rows;`,
  ];

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${lines.join('\n')}\n`);

  console.log(JSON.stringify({
    inputDir,
    outputFile,
    counts: {
      isolation: isolationRows.length,
      dismantleQueue: dismantleQueueRows.length,
      dismantleHistory: dismantleHistoryRows.length,
      troubleTicket: troubleTicketRows.length,
      total: totalRows,
    },
    batchCode,
  }, null, 2));
}

main();
