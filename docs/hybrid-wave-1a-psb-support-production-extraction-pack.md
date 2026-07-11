# Wave 1A Support Production Extraction Pack

Paket ini dipakai untuk menarik JSON production `Isolation`, `DismantleTickets`, `DismantleHistory`, dan `TroubleTicket` dari terminal app `Web PSB` di Coolify dengan mode read-only.

## Target Output

```text
/tmp/psb-wave1a-support-production/isolation.production.json
/tmp/psb-wave1a-support-production/dismantle-tickets.production.json
/tmp/psb-wave1a-support-production/dismantle-history.production.json
/tmp/psb-wave1a-support-production/trouble-ticket.production.json
```

## Kolom Minimum Yang Ditarik

### Isolation

- `id`
- `customerName`
- `status`
- `isolationDate`
- `ticketId`
- `ticketDismantle`
- `radboox`
- `marketing`

Kolom opsional bila memang tersedia di production nyata:

- `customerAddress`
- `customerPhone`
- `price`
- `reason`
- `restorationDate`
- `closeNote`
- `isArchived`
- `archivedAt`

### DismantleTickets

- `id`
- `sourceIsolationId`
- `customerName`
- `status`
- `ticketNumber`
- `fieldNote`
- `isolationDate`

Kolom opsional:

- `customerAddress`
- `customerPhone`
- `marketing`
- `radboox`
- `reason`

### DismantleHistory

- `id`
- `sourceIsolationId`
- `customerName`
- `ticketDismantle`
- `closedAt`
- `closedBy`
- `closeNote`

Kolom opsional:

- `customerAddress`
- `customerPhone`
- `marketing`
- `radboox`
- `isolationDate`

### TroubleTicket

- `id`
- `ticketCode`
- `customerName`
- `type`
- `category`
- `status`
- `problemCategory`
- `resolutionAction`
- `openedAt`
- `closedAt`

Kolom opsional:

- `customerPhone`
- `customerAddress`
- `user`
- `notes`
- `closeNotes`
- `closePhotos`

## Snippet Node Read-Only

Jalankan dari terminal app `Web PSB` di Coolify:

```bash
node <<'EOF'
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const outputDir = '/tmp/psb-wave1a-support-production';
  fs.mkdirSync(outputDir, { recursive: true });

  const isolation = await prisma.isolation.findMany({
    select: {
      id: true,
      customerName: true,
      status: true,
      isolationDate: true,
      ticketId: true,
      ticketDismantle: true,
      radboox: true,
      marketing: true,
    },
    orderBy: { id: 'asc' },
  });

  const dismantleTickets = await prisma.dismantleTickets.findMany({
    select: {
      id: true,
      sourceIsolationId: true,
      customerName: true,
      status: true,
      ticketNumber: true,
      fieldNote: true,
      isolationDate: true,
    },
    orderBy: { id: 'asc' },
  });

  const dismantleHistory = await prisma.dismantleHistory.findMany({
    select: {
      id: true,
      sourceIsolationId: true,
      customerName: true,
      ticketDismantle: true,
      closedAt: true,
      closedBy: true,
      closeNote: true,
    },
    orderBy: { id: 'asc' },
  });

  const troubleTicket = await prisma.troubleTicket.findMany({
    select: {
      id: true,
      ticketCode: true,
      customerName: true,
      type: true,
      category: true,
      status: true,
      problemCategory: true,
      resolutionAction: true,
      openedAt: true,
      closedAt: true,
    },
    orderBy: { id: 'asc' },
  });

  const outputs = {
    isolation: path.join(outputDir, 'isolation.production.json'),
    dismantleTickets: path.join(outputDir, 'dismantle-tickets.production.json'),
    dismantleHistory: path.join(outputDir, 'dismantle-history.production.json'),
    troubleTicket: path.join(outputDir, 'trouble-ticket.production.json'),
  };

  fs.writeFileSync(outputs.isolation, JSON.stringify(isolation, null, 2));
  fs.writeFileSync(outputs.dismantleTickets, JSON.stringify(dismantleTickets, null, 2));
  fs.writeFileSync(outputs.dismantleHistory, JSON.stringify(dismantleHistory, null, 2));
  fs.writeFileSync(outputs.troubleTicket, JSON.stringify(troubleTicket, null, 2));

  console.log(JSON.stringify({
    outputDir,
    outputs,
    summary: {
      isolation: isolation.length,
      dismantleTickets: dismantleTickets.length,
      dismantleHistory: dismantleHistory.length,
      troubleTicket: troubleTicket.length,
    },
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

## Guardrail

- jangan tambahkan operasi write ke tabel production
- bila salah satu kolom opsional tidak ada di production nyata, hapus dari `select` lalu rerun
- file JSON hasil extraction jangan di-commit ke repository lokal

## Quick Check

Setelah snippet berhasil, cek file output:

```bash
ls -lah /tmp/psb-wave1a-support-production
```

## Next Step

Setelah empat file JSON production berhasil ditarik, lanjutkan ke runbook lokal:

- [hybrid-wave-1a-psb-support-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1a-psb-support-production-runbook.md)
