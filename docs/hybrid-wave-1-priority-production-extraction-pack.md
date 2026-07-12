# Hybrid Wave 1 Priority Production Extraction Pack

Paket ini dipakai untuk menarik source production `Priority` dari app `Web PSB` di Coolify ke file JSON yang siap dimuat ke review DB lokal.

## Tujuan

- mengambil master prioritas legacy yang dipakai sebagai badge/filter ticket
- mempertahankan field source:
  - `name`
  - `color`
- menghasilkan file:

```text
/tmp/psb-wave1-priority-production/priorities.production.json
```

## Guardrail

- jalankan hanya query read-only
- jangan mengubah tabel production
- bila model Prisma `priority` gagal dipakai, hentikan dulu dan laporkan error sebelum lanjut ke transfer file

## Snippet Extraction

Jalankan di terminal app `Web PSB` pada Coolify:

```bash
node <<'EOF'
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const outputDir = '/tmp/psb-wave1-priority-production';
  fs.mkdirSync(outputDir, { recursive: true });

  const rows = await prisma.priority.findMany({
    select: {
      id: true,
      name: true,
      color: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { id: 'asc' },
  });

  const outputFile = path.join(outputDir, 'priorities.production.json');
  fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));

  const colorCounts = rows.reduce((accumulator, row) => {
    const key = String(row?.color ?? '').trim() || '(blank)';
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  console.log(JSON.stringify({
    outputDir,
    outputFile,
    totalRows: rows.length,
    colorCounts,
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
- distribusi `colorCounts`
- path file output final

## Langkah Setelah Extraction

1. pindahkan `priorities.production.json` ke lokal
2. simpan di folder:

```text
production-data\web-psb-wave1-priority
```

3. jalankan runner lokal:

```bat
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1-priority-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1-priority"
```
