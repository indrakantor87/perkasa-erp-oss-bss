# Hybrid Wave 1A PSB TT Photo Production Extraction Pack

Paket ini dipakai untuk menarik source production `TroubleTicketPhoto` dari terminal app `Web PSB` di Coolify ke file JSON lokal yang siap dimuat ke review DB.

## Target Output

```text
/tmp/psb-wave1a-tt-photo-production/trouble-ticket-photo.production.json
```

## Snippet Extraction

Paste snippet ini di terminal app `Web PSB` pada Coolify. Jangan paste seluruh markdown.

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
  const outputDir = '/tmp/psb-wave1a-tt-photo-production';
  fs.mkdirSync(outputDir, { recursive: true });

  let rows = [];
  if (await tableExists('TroubleTicketPhoto')) {
    rows = await prisma.$queryRawUnsafe(`
      SELECT
        "id",
        "ticketId",
        "filePath",
        "mimeType",
        "sizeBytes",
        "createdAt"
      FROM "TroubleTicketPhoto"
      ORDER BY "id" ASC
    `);
  }

  const outputFile = path.join(outputDir, 'trouble-ticket-photo.production.json');
  fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));

  console.log(JSON.stringify({
    outputDir,
    outputFile,
    totalRows: rows.length,
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

## Quick Check

```bash
ls -lah /tmp/psb-wave1a-tt-photo-production
```

## Catatan

- extraction ini read-only
- jalur ini mengandalkan source table detail `TroubleTicketPhoto`, bukan hanya array `closePhotos[]` dari parent ticket
- parent `ticketId` akan di-resolve terhadap batch `PROD-WEBPSB-SUPPORT-CORE-001` pada review DB lokal
