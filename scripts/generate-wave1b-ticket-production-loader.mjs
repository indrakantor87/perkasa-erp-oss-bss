#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const options = {
    inputDir: '',
    outputFile: '',
    branchCode: '',
    customerType: 'HOME',
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
      case '--branch-code':
        options.branchCode = next;
        break;
      case '--customer-type':
        options.customerType = next;
        break;
      default:
        throw new Error(`Argumen tidak dikenal: ${token}`);
    }

    index += 1;
  }

  if (!options.inputDir) {
    throw new Error('Gunakan --input-dir untuk menunjuk folder JSON hasil extraction Ticket production.');
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

function normalizeText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function cleanUrl(value) {
  const normalized = normalizeText(value)
    .replace(/^`+/, '')
    .replace(/`+$/, '')
    .trim();

  return normalized || null;
}

function normalizeKey(parts) {
  return parts
    .map((part) => normalizeText(part))
    .filter((part) => part !== '')
    .map((part) => part.toUpperCase())
    .join('|');
}

function firstNonEmpty(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return value;
    }
  }

  return null;
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

function derivePackageCode(packageName) {
  const normalized = normalizeText(packageName).toUpperCase();

  if (!normalized) {
    return null;
  }

  if (
    normalized === 'HOME BASIC' ||
    normalized === 'HOME-BASIC' ||
    normalized === 'HOME LITE' ||
    normalized === 'HOME LITE 1 THN' ||
    normalized === 'HOME-LITE' ||
    normalized === 'PROMO HOME LITE' ||
    normalized === 'HOME LITE ( BUNDLING 4BULAN + FREE 1BULAN)' ||
    normalized === 'HOME MINI' ||
    normalized === 'HOME_MINI (PROMO 4+1)' ||
    normalized === 'HOME-MINI' ||
    normalized === 'HOME SMALL' ||
    normalized === 'HOME-SMALL' ||
    normalized.includes('BASIC') ||
    normalized.includes('LITE') ||
    normalized.includes('MINI') ||
    normalized.includes('SMALL')
  ) {
    return 'HOME-10M';
  }

  if (
    normalized === 'HOME STREAM' ||
    normalized === 'HOME-STREAM' ||
    normalized === 'HOME ENTERTAIN' ||
    normalized === 'HOME-ENTERTAIN' ||
    normalized.includes('STREAM') ||
    normalized.includes('ENTERTAIN')
  ) {
    return 'HOME-20M';
  }

  if (normalized === 'HOME ADVAN' || normalized === 'HOME-ADVAN' || normalized.includes('ADVAN')) {
    return 'HOME-30M';
  }

  if (normalized === 'DEDICATED' || normalized.includes('DEDICATED')) {
    return 'DEDICATED-1-1';
  }

  if (normalized === 'HOME-20M' || normalized.includes('20')) {
    return 'HOME-20M';
  }

  if (normalized === 'HOME-30M' || normalized.includes('30')) {
    return 'HOME-30M';
  }

  return null;
}

function deriveOrderStatus(row) {
  const rawOrderStatus = firstNonEmpty(row, ['statusOrder', 'orderStatus']);
  const rawTicketStatus = firstNonEmpty(row, ['status', 'ticketStatus']);
  const normalizedOrderStatus = normalizeText(rawOrderStatus).toUpperCase();
  const normalizedTicketStatus = normalizeText(rawTicketStatus).toUpperCase();
  const hasInstalledDate = firstNonEmpty(row, ['installedDate']) !== null;

  if ((normalizedTicketStatus === 'CLOSE' || normalizedTicketStatus === 'CLOSED') && hasInstalledDate) {
    return 'ACTIVE';
  }

  if (normalizedTicketStatus === 'OPEN' || normalizedTicketStatus === 'ON_PROGRESS') {
    return 'REGISTERED';
  }

  if (normalizedOrderStatus === '0' || normalizedOrderStatus === '1') {
    return 'ACTIVE';
  }

  if (normalizedOrderStatus === '3') {
    return hasInstalledDate ? 'ACTIVE' : 'REGISTERED';
  }

  return rawOrderStatus ?? rawTicketStatus ?? 'REGISTERED';
}

function deriveTicketStatus(row) {
  return firstNonEmpty(row, ['status', 'serviceStatus', 'subscriptionStatus']) ?? null;
}

function deriveOrderNo(row) {
  return firstNonEmpty(row, ['orderNo', 'ticketCode', 'ticketNumber']) ?? `PSB-TICKET-${row.id}`;
}

function buildCustomerRows(data, options) {
  return data.map((row) => {
    const legacyId = `PROD-TICKET-${row.id}`;
    const customerName = firstNonEmpty(row, ['customerName', 'name']) ?? `Legacy Ticket Customer ${row.id}`;
    const phone = firstNonEmpty(row, ['phoneNumber', 'phone', 'customerPhone']);
    const email = firstNonEmpty(row, ['email', 'customerEmail']);
    const identityNo = firstNonEmpty(row, ['identityNo', 'nik', 'ktp']);
    const addressText = firstNonEmpty(row, ['addressText', 'address', 'alamat']);
    const mapsUrl = cleanUrl(firstNonEmpty(row, ['locationMap', 'mapsUrl']));
    const latitude = firstNonEmpty(row, ['latitude']);
    const longitude = firstNonEmpty(row, ['longitude']);
    const marketingName = firstNonEmpty(row, ['marketingName', 'marketing']);

    return [
      '@ticket_batch_id',
      sqlString('WEB_PSB'),
      sqlString(legacyId),
      sqlString(options.customerType || 'HOME'),
      sqlString(customerName),
      sqlString(phone),
      sqlString(email),
      sqlString(identityNo),
      sqlString(addressText),
      sqlString(mapsUrl),
      sqlDecimal(latitude, 7),
      sqlDecimal(longitude, 7),
      sqlString(marketingName),
      sqlString(options.branchCode || null),
      sqlString(JSON.stringify(row)),
      sqlString(normalizeKey([customerName, phone])),
      sqlString('MAPPED'),
      'NULL',
      'NULL',
    ];
  });
}

function buildOrderRows(data, options) {
  return data.map((row) => {
    const legacyId = `PROD-TICKET-${row.id}`;
    const packageName = firstNonEmpty(row, ['package', 'packageName']);
    const mappedPackageCode = derivePackageCode(packageName);
    const orderStatus = deriveOrderStatus(row);
    const ticketStatus = deriveTicketStatus(row);
    const notes = normalizeKey([`ticketStatus:${ticketStatus ?? ''}`, `orderStatus:${orderStatus}`]);

    return [
      '@ticket_batch_id',
      sqlString('WEB_PSB'),
      sqlString(legacyId),
      sqlString(legacyId),
      sqlString(packageName),
      sqlString(deriveOrderNo(row)),
      sqlString('NEW_INSTALL'),
      sqlString(orderStatus),
      sqlDateTime(firstNonEmpty(row, ['requestDate', 'createdAt'])),
      sqlDateTime(firstNonEmpty(row, ['scheduledInstallationAt', 'scheduleDate', 'installationDate'])),
      sqlDateTime(firstNonEmpty(row, ['installedDate'])),
      sqlString(firstNonEmpty(row, ['marketingName', 'marketing'])),
      sqlString(firstNonEmpty(row, ['teknisi', 'technicianName'])),
      sqlString(firstNonEmpty(row, ['locationMap', 'mapsUrl'])),
      sqlString(notes || null),
      sqlString(JSON.stringify(row)),
      sqlString(normalizeKey([deriveOrderNo(row), packageName, orderStatus])),
      sqlString(mappedPackageCode),
      sqlString(mappedPackageCode ? 'MAPPED' : 'INVALID'),
      sqlString(mappedPackageCode ? null : `Package legacy belum punya mapping otomatis: ${packageName ?? '(kosong)'}`),
      'NULL',
    ];
  });
}

function main() {
  const options = parseArgs(process.argv);
  const inputDir = path.resolve(options.inputDir);
  const outputFile = path.resolve(options.outputFile);
  const tickets = ensureArray(
    readJson(path.join(inputDir, 'ticket.production.json')),
    'ticket.production.json',
  );

  const customerRows = buildCustomerRows(tickets, options);
  const orderRows = buildOrderRows(tickets, options);
  const batchCode = 'PROD-WEBPSB-TICKET-001';
  const totalRows = customerRows.length + orderRows.length;
  const validRows = customerRows.length + orderRows.filter((row) => row[18] === sqlString('MAPPED')).length;

  const lines = [
    '-- Generated by scripts/generate-wave1b-ticket-production-loader.mjs',
    '-- Sumber file JSON production jangan di-commit ke repository.',
    'USE erp_isp_review;',
    '',
    `INSERT INTO staging_import_batches (batch_code, source_system, import_scope, import_status, total_rows, valid_rows, invalid_rows, notes) VALUES (${sqlUnicodeLiteral(batchCode)}, 'WEB_PSB', 'PSB_TICKET_SPLIT_PRODUCTION', 'MAPPED', ${totalRows}, ${validRows}, ${totalRows - validRows}, 'Generated dari JSON production Ticket Web PSB') ON DUPLICATE KEY UPDATE import_scope = VALUES(import_scope), import_status = VALUES(import_status), total_rows = VALUES(total_rows), valid_rows = VALUES(valid_rows), invalid_rows = VALUES(invalid_rows), notes = VALUES(notes), updated_at = CURRENT_TIMESTAMP;`,
    '',
    `SET @ticket_batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlUnicodeLiteral(batchCode)} ORDER BY id DESC LIMIT 1);`,
    '',
    'DELETE FROM staging_legacy_order_records WHERE batch_id = @ticket_batch_id;',
    'DELETE FROM staging_legacy_customer_records WHERE batch_id = @ticket_batch_id;',
    '',
    ...buildInsertStatements(
      'staging_legacy_customer_records',
      [
        'batch_id',
        'source_system',
        'legacy_id',
        'customer_type',
        'customer_name',
        'phone',
        'email',
        'identity_no',
        'address_text',
        'maps_url',
        'latitude',
        'longitude',
        'marketing_name',
        'branch_code',
        'raw_payload',
        'normalized_key',
        'import_status',
        'validation_notes',
        'imported_at',
      ],
      customerRows,
    ),
    '',
    ...buildInsertStatements(
      'staging_legacy_order_records',
      [
        'batch_id',
        'source_system',
        'legacy_id',
        'legacy_customer_id',
        'legacy_package_name',
        'order_no',
        'order_type',
        'order_status',
        'request_date',
        'scheduled_installation_at',
        'installed_date',
        'marketing_name',
        'teknisi_name',
        'location_map',
        'notes',
        'raw_payload',
        'normalized_key',
        'mapped_package_code',
        'import_status',
        'validation_notes',
        'imported_at',
      ],
      orderRows,
    ),
    '',
    'SELECT',
    `  ${sqlString(batchCode)} AS ticket_batch_code,`,
    `  ${tickets.length} AS source_ticket_rows,`,
    `  ${customerRows.length} AS customer_rows,`,
    `  ${orderRows.length} AS order_rows,`,
    `  ${validRows} AS valid_rows,`,
    `  ${totalRows - validRows} AS invalid_rows;`,
    '',
  ];

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, lines.join('\n'));

  console.log(JSON.stringify({
    inputDir,
    outputFile,
    counts: {
      sourceTickets: tickets.length,
      customerRows: customerRows.length,
      orderRows: orderRows.length,
      validRows,
      invalidRows: totalRows - validRows,
    },
    batchCode,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
