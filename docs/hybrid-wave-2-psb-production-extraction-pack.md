# Hybrid Wave 2 PSB Production Extraction Pack

## Tujuan

Dokumen ini menyiapkan `read-only extraction pack` untuk mini-batch produksi pertama `Web PSB` dari terminal app di `Coolify`.

Scope extraction:

- `CoveredArea`
- `MarketingActivity`
- `psb_odp`
- `TroubleTicketSla`

Dokumen ini tidak menulis ke DB production. Semua langkah di sini hanya untuk:

1. mengekstrak data production ke bentuk JSON
2. mencatat row count sumber
3. menyiapkan input aman untuk flow staging di review DB / ERP

## File Utama

- query SQL read-only: [postgres_web_psb_wave2_extraction_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/postgres_web_psb_wave2_extraction_queries.sql)
- rencana batch produksi: [hybrid-wave-2-psb-production-mini-batch.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-2-psb-production-mini-batch.md)

## Prasyarat

1. Anda sudah masuk ke terminal app `Web PSB` di Coolify
2. `DATABASE_URL` atau `DIRECT_URL` valid di environment app
3. `node` tersedia
4. `@prisma/client` tersedia seperti saat audit schema production sebelumnya

## Guardrail

- jangan jalankan `INSERT`, `UPDATE`, `DELETE`, `ALTER`, atau `DROP`
- jangan ubah file env production
- hasil extraction disimpan sebagai file lokal/export teks, bukan ditulis balik ke DB production
- jika satu query gagal, hentikan dan kirim errornya

## Langkah Eksekusi

### 1. Masuk ke terminal app

Masuk ke resource `Web PSB` di Coolify lalu buka `Terminal`.

### 2. Verifikasi runtime minimum

Jalankan:

```sh
node -v
node -e "console.log(require.resolve('@prisma/client'))"
```

### 3. Jalankan extraction JSON

Pakai snippet berikut di terminal:

```sh
node <<'EOF'
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const outputDir = '/tmp/psb-wave2-production';
  fs.mkdirSync(outputDir, { recursive: true });

  const coveredArea = await prisma.$queryRawUnsafe(`
    SELECT "id","name","description","createdAt","updatedAt"
    FROM "CoveredArea"
    ORDER BY "id"
  `);

  const marketingActivity = await prisma.$queryRawUnsafe(`
    SELECT
      "id","date","marketingName","activity","notes",
      "areaId","areaId2","areaId3","areaId4",
      "createdAt","updatedAt"
    FROM "MarketingActivity"
    ORDER BY "id"
  `);

  const odp = await prisma.$queryRawUnsafe(`
    SELECT
      "id","nama_odp","lokasi","kapasitas","terpakai",
      "status_tiang","is_active","wilayah","latitude","longitude",
      "createdAt","updatedAt"
    FROM "psb_odp"
    ORDER BY "id"
  `);

  const ttSla = await prisma.$queryRawUnsafe(`
    SELECT "id","type","durationDays","createdAt","updatedAt"
    FROM "TroubleTicketSla"
    ORDER BY "id"
  `);

  const summary = {
    CoveredArea: coveredArea.length,
    MarketingActivity: marketingActivity.length,
    psb_odp: odp.length,
    TroubleTicketSla: ttSla.length,
  };

  fs.writeFileSync(path.join(outputDir, 'covered-area.production.json'), JSON.stringify(coveredArea, null, 2));
  fs.writeFileSync(path.join(outputDir, 'marketing-activity.production.json'), JSON.stringify(marketingActivity, null, 2));
  fs.writeFileSync(path.join(outputDir, 'psb-odp.production.json'), JSON.stringify(odp, null, 2));
  fs.writeFileSync(path.join(outputDir, 'trouble-ticket-sla.production.json'), JSON.stringify(ttSla, null, 2));
  fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log(JSON.stringify({
    outputDir,
    summary
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
EOF
```

### 4. Tampilkan ringkasan hasil

Setelah berhasil, jalankan:

```sh
cat /tmp/psb-wave2-production/summary.json
```

### 5. Tampilkan sample awal per file

Jalankan:

```sh
node <<'EOF'
const fs = require('fs');
const files = [
  '/tmp/psb-wave2-production/covered-area.production.json',
  '/tmp/psb-wave2-production/marketing-activity.production.json',
  '/tmp/psb-wave2-production/psb-odp.production.json',
  '/tmp/psb-wave2-production/trouble-ticket-sla.production.json',
];

for (const file of files) {
  const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('\nFILE:', file);
  console.log(JSON.stringify(rows.slice(0, 3), null, 2));
}
EOF
```

## Output yang Perlu Dikirim Balik

Kirim salah satu dari dua opsi berikut:

### Opsi Ringkas

- isi `summary.json`
- sample 3 row pertama untuk:
  - `CoveredArea`
  - `MarketingActivity`
  - `psb_odp`
  - `TroubleTicketSla`

### Opsi Lengkap

- seluruh file JSON di `/tmp/psb-wave2-production/`

## Acceptance Check Awal

Sebelum lanjut ke import review DB, kita ingin memastikan:

- `CoveredArea` tidak kosong
- `MarketingActivity` punya data area (`areaId` setidaknya pada sebagian row)
- `psb_odp` punya `kapasitas` dan `terpakai`
- `TroubleTicketSla` punya `type` dan `durationDays`

## Setelah Extraction Berhasil

Langkah berikutnya:

1. cocokkan row count source dengan `summary.json`
2. siapkan loader dari JSON ke staging review DB
3. jalankan mini-batch produksi kecil sesuai [hybrid-wave-2-psb-production-mini-batch.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-2-psb-production-mini-batch.md)

## Catatan

- file SQL di [postgres_web_psb_wave2_extraction_queries.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/postgres_web_psb_wave2_extraction_queries.sql) tetap berguna jika nanti Anda punya `psql`
- untuk kondisi terminal Coolify saat ini, snippet `node + PrismaClient` adalah jalur paling realistis dan konsisten dengan audit yang sudah terbukti berhasil sebelumnya
