# Hybrid Wave 1A PSB TroubleTicketMaster Production Extraction Pack

Paket ini dipakai untuk menarik source production `TroubleTicketMaster` dari app `Web PSB` di Coolify ke file JSON yang siap dimuat ke review DB lokal.

## Tujuan

- mengambil katalog dropdown support legacy yang dipakai `Trouble Ticket`
- mempertahankan namespace `kind` asli dari source:
  - `PROBLEM_CATEGORY`
  - `RESOLUTION_ACTION`
  - `ONT`
- menghasilkan file:

```text
/tmp/psb-wave1a-tt-master-production/trouble-ticket-master.production.json
```

## Guardrail

- jalankan hanya query read-only
- jangan mengubah tabel production
- jika tabel `TroubleTicketMaster` belum ada, output akan tetap kosong dan itu harus dicatat sebelum lanjut ke loader lokal

## Snippet Extraction

Jalankan di terminal app `Web PSB` pada Coolify:

```bash
node <<'EOF'
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function tableExists(tableName) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS "exists"
    `,
    tableName,
  );

  return Boolean(rows?.[0]?.exists);
}

async function main() {
  const outputDir = '/tmp/psb-wave1a-tt-master-production';
  fs.mkdirSync(outputDir, { recursive: true });

  let rows = [];
  if (await tableExists('TroubleTicketMaster')) {
    rows = await prisma.$queryRawUnsafe(`
      SELECT
        "id",
        "kind",
        "value",
        "createdAt"
      FROM "TroubleTicketMaster"
      ORDER BY "kind" ASC, "value" ASC, "id" ASC
    `);
  }

  const outputFile = path.join(outputDir, 'trouble-ticket-master.production.json');
  fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));

  const kindCounts = rows.reduce((accumulator, row) => {
    const key = String(row?.kind ?? '').trim() || '(blank)';
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  console.log(JSON.stringify({
    outputDir,
    outputFile,
    totalRows: rows.length,
    kindCounts,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF
```

## Output Minimum yang Perlu Dicatat

- `totalRows`
- distribusi `kindCounts`
- path file output final

## Langkah Setelah Extraction

1. pindahkan `trouble-ticket-master.production.json` ke lokal
2. simpan di folder:

```text
production-data\web-psb-wave1a-tt-master
```

3. jalankan runner lokal:

```bat
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1a-tt-master-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1a-tt-master"
```
