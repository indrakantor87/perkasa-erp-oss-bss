# Wave 1B Ticket Production Extraction Pack

Paket ini dipakai untuk menarik JSON production `Ticket` dari terminal app `Web PSB` di Coolify dengan mode read-only.

## Target Output

```text
/tmp/psb-wave1b-production/ticket.production.json
```

## Kolom Minimum Yang Ditarik

- `id`
- `customerName`
- `phoneNumber`
- `package`
- `requestDate`
- `installedDate`
- `marketingName`
- `teknisi`
- `locationMap`
- `status`
- `statusOrder`

Kolom opsional bila memang tersedia di production nyata:

- `orderNo`
- `ticketCode`
- `ticketNumber`
- `scheduledInstallationAt`
- `email`
- `identityNo`
- `addressText`
- `latitude`
- `longitude`

## Snippet Node Read-Only

Jalankan dari terminal app `Web PSB` di Coolify:

```js
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const outputDir = '/tmp/psb-wave1b-production';
  fs.mkdirSync(outputDir, { recursive: true });

  const rows = await prisma.ticket.findMany({
    select: {
      id: true,
      customerName: true,
      phoneNumber: true,
      package: true,
      requestDate: true,
      installedDate: true,
      marketingName: true,
      teknisi: true,
      locationMap: true,
      status: true,
      statusOrder: true,
    },
    orderBy: { id: 'asc' },
  });

  const outputFile = path.join(outputDir, 'ticket.production.json');
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
```

## Guardrail

- jangan tambahkan operasi write
- bila salah satu kolom opsional tidak ada di production nyata, hapus dari `select` lalu rerun
- file JSON hasil extraction jangan di-commit ke repository lokal

## Next Step

Setelah `ticket.production.json` berhasil ditarik, lanjutkan ke runbook lokal:

- [hybrid-wave-1b-psb-ticket-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1b-psb-ticket-production-runbook.md)
