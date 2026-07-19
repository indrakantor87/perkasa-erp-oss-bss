# Desain Teknis Implementasi List PSB

## Tujuan

Dokumen ini menerjemahkan keputusan bisnis terbaru untuk `List PSB` menjadi desain teknis yang siap
dipakai saat implementasi di `apps/web`.

Modul `List PSB` diposisikan sebagai domain kerja baru yang berdiri di antara:

1. `Penjualan` sebagai sumber input awal
2. `CS` sebagai validator dan pengendali distribusi kerja
3. `Ticketing / NOC / Teknisi` sebagai domain eksekusi lapangan

Dokumen ini melengkapi:

1. [web-operational-final-backlog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-operational-final-backlog.md)
2. [web-psb-module-gap-plan.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-module-gap-plan.md)
3. [web-psb-flow-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-flow-checklist.md)

## Posisi Dalam Alur Bisnis

Alur final yang menjadi acuan:

```text
Penjualan -> List PSB -> CS validasi/pilih -> Ticket PSB -> NOC/Teknisi
```

Implikasinya:

1. `Penjualan` tidak langsung membuat ticket operasional
2. `List PSB` menjadi antrean kontrol kualitas dan kesiapan kerja
3. `CS` menjadi penjaga pintu sebelum data berubah menjadi ticket lapangan
4. transfer ke ticketing harus punya audit trail yang jelas

## Route dan Ownership

### Route ideal

1. `/list-psb`
2. opsi detail: `/list-psb/[psbListId]`

### Owner operasional

1. `PENJUALAN` membuat dan mengoreksi draft
2. `CS_OPERATOR` mereview dan menyiapkan transfer
3. `CS_ADMIN` memberi persetujuan akhir bila diperlukan
4. `SUPER_ADMIN` memegang override dan audit penuh

### Hubungan dengan route yang sudah ada

1. `/penjualan` tetap dipakai untuk input awal
2. `/customers/cs-admin` tetap menjadi meja kontrol cepat CS
3. `/dashboard/tracking/noc-queue` menerima item yang sudah ditransfer menjadi `Ticket PSB`

## Scope Fitur

### Fitur fase pertama

1. tabel `List PSB`
2. halaman detail item `List PSB`
3. validasi dan koreksi oleh `CS`
4. transfer ke `Ticket PSB`
5. histori audit dari input sampai transfer

### Fitur fase kedua

1. assignment PIC `CS`
2. SLA review `List PSB`
3. lampiran dokumen atau bukti tambahan
4. ringkasan rekap harian untuk screenshot `CS`
5. koneksi lebih dalam ke `Customer`, `Address`, `Subscription`, dan `Work Order`

## Status Domain

Status yang disarankan untuk `List PSB`:

1. `BARU`
2. `REVIEW_CS`
3. `PERLU_KOREKSI`
4. `DISETUJUI`
5. `DITOLAK`
6. `DITRANSFER_KE_TICKETING`

### Aturan transisi

1. `BARU -> REVIEW_CS`
2. `REVIEW_CS -> PERLU_KOREKSI`
3. `REVIEW_CS -> DISETUJUI`
4. `REVIEW_CS -> DITOLAK`
5. `PERLU_KOREKSI -> REVIEW_CS`
6. `DISETUJUI -> DITRANSFER_KE_TICKETING`

### Guard utama

1. item yang sudah `DITRANSFER_KE_TICKETING` tidak boleh ditransfer ulang tanpa jalur pembatalan formal
2. `DITOLAK` hanya bisa dibuka ulang oleh `CS_ADMIN` atau `SUPER_ADMIN`
3. `PERLU_KOREKSI` harus menyimpan alasan koreksi
4. `DISETUJUI` harus menyimpan siapa penyetuju dan kapan disetujui

## Data Model Usulan

### Tabel utama `sales_psb_lists`

Kolom minimum yang disarankan:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint | primary key internal |
| `psbListCode` | varchar | kode list seperti `PSBL-202607-0001` |
| `sourceSalesLeadId` | bigint nullable | referensi ke lead/order sumber bila sudah ada |
| `customerName` | varchar | nama calon customer |
| `customerPhone` | varchar nullable | nomor kontak |
| `addressText` | text | alamat pemasangan |
| `odpCode` | varchar nullable | ODP target bila sudah diketahui |
| `packageLabel` | varchar nullable | paket pemasangan |
| `salesOwnerName` | varchar nullable | nama marketing atau penjualan |
| `escortNotes` | text nullable | catatan pengawalan |
| `activityNotes` | text nullable | catatan aktivitas tambahan |
| `requestedInstallDate` | datetime nullable | tanggal target pemasangan |
| `status` | varchar | status domain |
| `reviewNotes` | text nullable | catatan review CS |
| `correctionNotes` | text nullable | catatan koreksi |
| `approvedByUserId` | bigint nullable | user penyetuju |
| `approvedAt` | datetime nullable | waktu setuju |
| `transferredTicketId` | bigint nullable | ticket hasil transfer |
| `transferredTicketRef` | varchar nullable | nomor ticket hasil transfer |
| `transferredAt` | datetime nullable | waktu transfer |
| `createdByUserId` | bigint nullable | pembuat awal |
| `updatedByUserId` | bigint nullable | pengubah terakhir |
| `createdAt` | datetime | audit default |
| `updatedAt` | datetime | audit default |

### Tabel audit `sales_psb_list_audits`

Kolom minimum:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint | primary key |
| `psbListId` | bigint | relasi ke tabel utama |
| `eventType` | varchar | `CREATE`, `SUBMIT_REVIEW`, `REQUEST_CORRECTION`, `APPROVE`, `REJECT`, `TRANSFER` |
| `fromStatus` | varchar nullable | status sebelumnya |
| `toStatus` | varchar nullable | status sesudahnya |
| `actorUserId` | bigint nullable | pelaku |
| `actorName` | varchar nullable | snapshot nama |
| `actorRole` | varchar nullable | snapshot role |
| `notes` | text nullable | catatan event |
| `payloadJson` | json nullable | snapshot tambahan |
| `createdAt` | datetime | waktu event |

### Relasi domain

1. `sales_psb_lists` dapat ditautkan ke entitas `sales lead/order` bila sudah ada
2. `sales_psb_lists` dapat menghasilkan satu `Ticket PSB`
3. `sales_psb_list_audits` wajib mencatat seluruh transisi penting

## Service Layer

### Service baru yang disarankan

1. `psb-list-service.ts`

Kemampuan minimum:

1. `getPsbLists(filters)`
2. `getPsbListById(id)`
3. `createPsbList(input, actor)`
4. `updatePsbList(id, input, actor)`
5. `transitionPsbListStatus(id, action, payload, actor)`
6. `transferPsbListToTicket(id, payload, actor)`
7. `getPsbListAuditTrail(id)`

### Filter minimum untuk read-side

1. `status`
2. `salesOwner`
3. `csPic`
4. `requestedInstallDate`
5. `odpCode`
6. `search`

### Kontrak read model

Read model `PsbListRow` yang disarankan:

```ts
type PsbListStatus =
  | 'BARU'
  | 'REVIEW_CS'
  | 'PERLU_KOREKSI'
  | 'DISETUJUI'
  | 'DITOLAK'
  | 'DITRANSFER_KE_TICKETING'

type PsbListRow = {
  id: number
  psbListCode: string
  customerName: string
  customerPhone: string | null
  addressText: string
  odpCode: string | null
  packageLabel: string | null
  salesOwnerName: string | null
  requestedInstallDate: string | null
  status: PsbListStatus
  reviewNotes: string | null
  correctionNotes: string | null
  transferredTicketRef: string | null
  createdAt: string | null
  updatedAt: string | null
}
```

## API Yang Disarankan

### 1. List dan create

- `GET /api/sales/psb-lists`
- `POST /api/sales/psb-lists`

### 2. Detail dan update

- `GET /api/sales/psb-lists/[id]`
- `PATCH /api/sales/psb-lists/[id]`

### 3. Transisi status

- `POST /api/sales/psb-lists/[id]/transition`

Payload minimum:

```json
{
  "action": "REQUEST_CORRECTION",
  "notes": "Alamat pemasangan perlu diperjelas"
}
```

`action` yang disarankan:

1. `SUBMIT_REVIEW`
2. `REQUEST_CORRECTION`
3. `APPROVE`
4. `REJECT`
5. `REOPEN`

### 4. Transfer ke ticketing

- `POST /api/sales/psb-lists/[id]/transfer`

Payload minimum:

```json
{
  "ticketType": "PSB",
  "notes": "Siap diteruskan ke ticketing operasional"
}
```

### 5. Audit trail

- `GET /api/sales/psb-lists/[id]/audits`

## Permission Matrix Minimum

| Aksi | Penjualan | CS Operator | CS Admin | Super Admin |
|---|---|---|---|---|
| lihat list | ya | ya | ya | ya |
| buat item baru | ya | opsional | opsional | ya |
| edit saat `BARU` | ya | ya | ya | ya |
| kirim ke review | ya | ya | ya | ya |
| minta koreksi | tidak | ya | ya | ya |
| setujui | tidak | opsional | ya | ya |
| tolak | tidak | opsional | ya | ya |
| transfer ke ticketing | tidak | ya | ya | ya |
| buka ulang item ditolak | tidak | tidak | ya | ya |
| lihat audit penuh | terbatas | ya | ya | ya |

## Desain UI

### Halaman daftar `/list-psb`

Blok utama:

1. ringkasan status
2. filter operasional
3. tabel `List PSB`
4. quick action per row
5. side summary untuk item prioritas

Kolom minimum tabel:

1. kode list
2. customer
3. alamat
4. ODP atau area
5. paket
6. sales owner
7. target pasang
8. status
9. ticket hasil transfer
10. aksi cepat

### Halaman detail `/list-psb/[id]`

Blok minimum:

1. ringkasan data pemasangan
2. catatan pengawalan dan aktivitas
3. panel keputusan `CS`
4. histori audit
5. panel transfer ke ticketing

### Quick action row

Aksi cepat yang disarankan:

1. `Review`
2. `Minta Koreksi`
3. `Setujui`
4. `Tolak`
5. `Transfer ke Ticketing`
6. `Buka Detail`

## Integrasi Dengan Modul Yang Sudah Ada

### Penjualan

1. `Penjualan` tetap menjadi tempat input awal
2. setelah submit, data masuk ke `List PSB`
3. bila diperlukan, `Penjualan` dapat melihat hasil review `CS`

### CS

1. `CS` membaca `List PSB` sebagai antrean validasi
2. rekap cepat `CS` dapat menampilkan jumlah `BARU`, `REVIEW_CS`, dan `SIAP TRANSFER`

### Ticketing / NOC

1. item `DISETUJUI` dapat ditransfer menjadi `Ticket PSB`
2. ticket hasil transfer harus menyimpan referensi `psbListId`

### Inventory

1. tidak menjadi owner `List PSB`
2. hanya membaca konsekuensi setelah ticket operasional membutuhkan barang

## Audit dan Observability

Minimal event audit yang perlu dicatat:

1. pembuatan list
2. submit ke review
3. permintaan koreksi
4. persetujuan
5. penolakan
6. transfer ke ticketing

Field audit minimum:

1. actor
2. role
3. status lama
4. status baru
5. notes
6. referensi ticket bila ada

## Strategi Mock dan Review DB

### Mode mock

1. sediakan `List PSB` dummy agar `CS` bisa review flow tanpa DB nyata
2. sediakan beberapa status untuk kebutuhan preview
3. sediakan satu kasus yang sudah berhasil ditransfer ke ticketing

### Review DB

1. read-side awal boleh memakai view atau fallback mock
2. write-side harus menjaga audit trail sejak fase pertama
3. transfer ke ticketing wajib idempotent dan terjaga dari duplikasi

## Acceptance Minimum

Implementasi fase pertama dianggap selesai bila:

1. `Penjualan` bisa membuat item `List PSB`
2. `CS` bisa mereview dan mengubah status
3. `CS` bisa mentransfer item yang sudah disetujui ke `Ticket PSB`
4. audit trail terbaca dari UI
5. item yang sudah ditransfer tidak bisa ditransfer ulang sembarangan

## Urutan Implementasi

### Tahap 1

1. model dan service `List PSB`
2. route `/list-psb`
3. tabel dasar dan detail dasar
4. audit trail dasar

### Tahap 2

1. transisi status penuh
2. quick action row
3. transfer ke ticketing

### Tahap 3

1. sinkron rekap `CS`
2. filter lebih kaya
3. hardening permission dan anti-duplikasi transfer

## Risiko Yang Harus Dijaga

1. jangan biarkan `Penjualan` langsung membuat ticket operasional
2. jangan gabungkan `List PSB` ke domain `Customer` tanpa pembeda ownership
3. jangan biarkan transfer ke ticketing tanpa audit
4. jangan ubah flow `NOC` yang sudah stabil; cukup beri source `Ticket PSB` yang lebih rapi

## Versioning

Dokumen ini dirilis pada baseline:

- `0.66.36`
