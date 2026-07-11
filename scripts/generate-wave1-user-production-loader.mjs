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
    throw new Error('Gunakan --input-dir untuk menunjuk folder JSON hasil extraction User production.');
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
  for (const key of ['id', 'name', 'username', 'role', 'division', 'createdAt']) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      payload[key] = row[key];
    }
  }

  return JSON.stringify(payload);
}

function buildUserRows(data) {
  return data.map((row) => {
    const legacyId = cleanText(row.id) ?? cleanText(row.username) ?? cleanText(row.name);
    const username = cleanText(row.username);
    const email = cleanText(row.email);
    const fullName = cleanText(row.name);

    return [
      '@user_batch_id',
      sqlString('WEB_PSB'),
      sqlString(legacyId ? `PROD-USER-${legacyId}` : null),
      sqlString(cleanText(row.role)),
      sqlString(cleanText(row.division)),
      sqlString(fullName),
      sqlString(username),
      sqlString(email),
      sqlString(cleanText(row.phone)),
      sqlString(cleanText(row.employeeId)),
      sqlString(buildAuditPayload(row)),
      sqlString(username ? username.toLowerCase() : null),
      'NULL',
      'NULL',
      sqlString('PENDING'),
      'NULL',
    ];
  });
}

function main() {
  const options = parseArgs(process.argv);
  const inputDir = path.resolve(options.inputDir);
  const outputFile = path.resolve(options.outputFile);

  const users = ensureArray(readJson(path.join(inputDir, 'users.production.json')), 'users.production.json');

  const rows = buildUserRows(users);
  const batchCode = 'PROD-WEBPSB-USER-001';

  const sqlLines = [
    '-- Auto-generated loader untuk Wave 1 User production Web PSB.',
    'USE erp_isp_review;',
    '',
    `DELETE FROM staging_legacy_user_records WHERE batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlString(batchCode)});`,
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
    `  ${sqlString('PSB_USER_AUTH')},`,
    `  ${sqlString('users.production.json')},`,
    `  ${sqlString('UPLOADED')},`,
    `  ${String(rows.length)},`,
    '  0,',
    '  0,',
    '  0,',
    `  ${sqlString('Loader production User Web PSB untuk auth_roles, org_divisions, dan auth_users')}`,
    ');',
    '',
    `SET @user_batch_id = (SELECT id FROM staging_import_batches WHERE batch_code = ${sqlString(batchCode)} ORDER BY id DESC LIMIT 1);`,
    '',
    ...buildInsertStatements(
      'staging_legacy_user_records',
      [
        'batch_id',
        'source_system',
        'legacy_id',
        'legacy_role',
        'legacy_division',
        'full_name',
        'username',
        'email',
        'phone',
        'employee_legacy_id',
        'raw_payload',
        'normalized_key',
        'mapped_role_code',
        'mapped_division_code',
        'import_status',
        'validation_notes',
      ],
      rows,
    ),
    '',
    'SELECT JSON_OBJECT(',
    `  'inputDir', ${sqlString(inputDir)},`,
    `  'outputFile', ${sqlString(outputFile)},`,
    `  'counts', JSON_OBJECT('total', ${String(rows.length)}),`,
    `  'batchCode', ${sqlString(batchCode)}`,
    ') AS generator_summary;',
  ];

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, `${sqlLines.join('\n')}\n`, 'utf8');

  console.log(
    JSON.stringify(
      {
        inputDir,
        outputFile,
        counts: {
          total: rows.length,
        },
        batchCode,
      },
      null,
      2,
    ),
  );
}

main();
