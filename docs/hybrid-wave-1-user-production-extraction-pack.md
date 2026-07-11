# Hybrid Wave 1 User Production Extraction Pack

Paket ini dipakai untuk menarik source production `User` dari terminal app `Web PSB` di Coolify dan langsung merangkum distribusi `role` serta `division` agar mapping ke ERP baru tidak mengarang.

## Tujuan

- mengekstrak data user production ke JSON
- menghitung distribusi `role`
- menghitung distribusi `division`
- menyiapkan bukti nyata untuk mapping ke:
  - `auth_roles`
  - `org_divisions`
  - `auth_users`

## Target Output

```text
/tmp/psb-wave1-user-production/users.production.json
```

## Snippet Extraction Discovery

Paste snippet ini di terminal app `Web PSB` pada Coolify. Jangan paste seluruh markdown.

```bash
node <<'EOF'
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function tally(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const value = String((row?.[key] ?? '')).trim() || '(blank)';
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])),
  );
}

async function main() {
  const outputDir = '/tmp/psb-wave1-user-production';
  fs.mkdirSync(outputDir, { recursive: true });

  const rows = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      role: true,
      division: true,
      createdAt: true,
    },
    orderBy: { id: 'asc' },
  });

  const outputFile = path.join(outputDir, 'users.production.json');
  fs.writeFileSync(outputFile, JSON.stringify(rows, null, 2));

  console.log(JSON.stringify({
    outputDir,
    outputFile,
    totalRows: rows.length,
    roleCounts: tally(rows, 'role'),
    divisionCounts: tally(rows, 'division'),
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
ls -lah /tmp/psb-wave1-user-production
```

## Output yang Perlu Dikembalikan

- JSON summary hasil snippet
- output `ls -lah /tmp/psb-wave1-user-production`

## Guardrail

- extraction ini read-only
- file JSON user production tidak boleh di-commit ke repository
- fokus tahap ini hanya discovery dan penguncian mapping `role/division`, belum import final
