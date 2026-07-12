# Hybrid Wave 1 WhatsappTemplate Production Extraction Pack

Paket ini dipakai untuk menarik source production `WhatsappTemplate` dari app `Web PSB` di Coolify ke file JSON yang siap dimuat ke review DB lokal.

## Tujuan

- mengambil helper template WhatsApp legacy yang dipakai pada `Ticket List` dan area CS
- mempertahankan field source:
  - `name`
  - `content`
  - `isDefault`
- menghasilkan file:

```text
/tmp/psb-wave1-whatsapp-template-production/whatsapp-templates.production.json
```

## Guardrail

- jalankan hanya query read-only
- jangan mengubah tabel production
- bila model Prisma `whatsappTemplate` gagal dipakai, hentikan dulu dan laporkan error sebelum lanjut ke transfer file

## Snippet Extraction

Jalankan di terminal app `Web PSB` pada Coolify:

```bash
node <<'EOF'
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const outputDir = '/tmp/psb-wave1-whatsapp-template-production';
  fs.mkdirSync(outputDir, { recursive: true });

  const rows = await prisma.whatsappTemplate.findMany({
    select: {
      id: true,
      name: true,
      content: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { id: 'asc' },
  });

  const outputFile = path.join(outputDir, 'whatsapp-templates.production.json');
  fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));

  console.log(JSON.stringify({
    outputDir,
    outputFile,
    totalRows: rows.length,
    defaultRows: rows.filter((row) => Boolean(row?.isDefault)).length,
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
- `defaultRows`
- path file output final

## Langkah Setelah Extraction

1. pindahkan `whatsapp-templates.production.json` ke lokal
2. simpan di folder:

```text
production-data\web-psb-wave1-whatsapp-template
```

3. jalankan runner lokal:

```bat
powershell -ExecutionPolicy Bypass -File .\scripts\run-review-wave1-whatsapp-template-production.ps1 -MysqlPath "D:\xampp\mysql\bin\mysql.exe" -JsonDir ".\production-data\web-psb-wave1-whatsapp-template"
```
