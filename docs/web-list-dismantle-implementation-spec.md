# Desain Teknis Implementasi List Dismantle

## Tujuan

Dokumen ini menerjemahkan keputusan bisnis terbaru untuk `List Dismantle` menjadi desain teknis yang siap
dipakai saat implementasi di `apps/web`.

Modul `List Dismantle` diposisikan sebagai domain kerja baru yang berdiri di antara:

1. `Billing / Isolir` sebagai sumber kandidat
2. `CS` sebagai validator dan pengendali distribusi kerja
3. `Ticketing / NOC / Teknisi Dismantle` sebagai domain eksekusi lapangan

Dokumen ini melengkapi:

1. [web-operational-final-backlog.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-operational-final-backlog.md)
2. [web-list-psb-implementation-spec.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-list-psb-implementation-spec.md)
3. [web-psb-module-gap-plan.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-module-gap-plan.md)

## Posisi Dalam Alur Bisnis

Alur final yang menjadi acuan:

```text
Billing -> Isolir aktif 1 bulan -> List Dismantle -> CS validasi/pilih -> Ticket Dismantle
```

Implikasinya:

1. data isolir tidak langsung menjadi ticket dismantle
2. `List Dismantle` menjadi antrean kontrol kandidat yang siap ditindak
3. `CS` menjadi penjaga pintu sebelum data berubah menjadi ticket dismantle operasional
4. transfer ke ticketing harus punya audit trail yang jelas sejak asal isolir

## Route dan Ownership

### Route ideal

1. `/list-dismantle`
2. opsi detail: `/list-dismantle/[dismantleListId]`

### Owner operasional

1. `BILLING` menghasilkan kandidat dari isolir
2. `CS_OPERATOR` mereview dan menyiapkan transfer
3. `CS_ADMIN` memberi persetujuan akhir bila diperlukan
4. `SUPER_ADMIN` memegang override dan audit penuh

### Hubungan dengan route yang sudah ada

1. `/billing` tetap dipakai untuk kontrol isolir dan suspend candidate
2. `/customers/cs-admin` tetap menjadi meja kontrol cepat `CS`
3. `/dashboard/tracking/noc-queue` menerima item yang sudah ditransfer menjadi `Ticket Dismantle`
4. `/support/dismantle` tetap menjadi lane eksekusi ticket setelah transfer berhasil

## Scope Fitur

### Fitur fase pertama

1. tombol `Transfer ke List Dismantle` dari data isolir yang memenuhi syarat
2. tabel `List Dismantle`
3. halaman detail item `List Dismantle`
4. validasi dan keputusan oleh `CS`
5. transfer ke `Ticket Dismantle`
6. histori audit dari isolir sampai transfer

### Fitur fase kedua

1. assignment PIC `CS`
2. SLA review `List Dismantle`
3. lampiran bukti atau catatan lapangan awal
4. ringkasan rekap harian untuk screenshot `CS`
5. koneksi lebih dalam ke `Customer`, `Subscription`, `Isolir`, `Inventory Return`, dan `Ticket Dismantle`

## Status Domain

Status yang disarankan untuk `List Dismantle`:

1. `BARU`
2. `REVIEW_CS`
3. `PERLU_KOREKSI`
4. `DITRANSFER_KE_TICKETING`
5. `BATAL`

### Aturan transisi

1. `BARU -> REVIEW_CS`
2. `REVIEW_CS -> PERLU_KOREKSI`
3. `REVIEW_CS -> DITRANSFER_KE_TICKETING`
4. `REVIEW_CS -> BATAL`
5. `PERLU_KOREKSI -> REVIEW_CS`

### Guard utama

1. item yang sudah `DITRANSFER_KE_TICKETING` tidak boleh ditransfer ulang tanpa jalur pembatalan formal
2. `BATAL` hanya bisa dibuka ulang oleh `CS_ADMIN` atau `SUPER_ADMIN`
3. `PERLU_KOREKSI` harus menyimpan alasan koreksi
4. transfer ke ticketing harus menyimpan referensi isolir sumber dan nomor ticket hasil transfer

## Data Model Usulan

### Tabel utama `support_dismantle_lists`

Kolom minimum yang disarankan:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint | primary key internal |
| `dismantleListCode` | varchar | kode list seperti `DML-202607-0001` |
| `sourceIsolationId` | bigint nullable | referensi ke data isolir sumber |
| `sourceIsolationRef` | varchar nullable | nomor atau kode isolir sumber |
| `customerId` | bigint nullable | relasi customer bila ada |
| `customerName` | varchar | nama customer |
| `customerPhone` | varchar nullable | nomor kontak |
| `serviceRef` | varchar nullable | referensi layanan atau subscription |
| `addressText` | text | alamat customer |
| `odpCode` | varchar nullable | ODP terkait bila ada |
| `isolationStartedAt` | datetime nullable | tanggal mulai isolir |
| `eligibleAt` | datetime nullable | tanggal memenuhi syarat ke list dismantle |
| `status` | varchar | status domain |
| `reviewNotes` | text nullable | catatan review CS |
| `correctionNotes` | text nullable | catatan koreksi |
| `transferredTicketId` | bigint nullable | ticket hasil transfer |
| `transferredTicketRef` | varchar nullable | nomor ticket hasil transfer |
| `transferredAt` | datetime nullable | waktu transfer |
| `createdByUserId` | bigint nullable | pembuat event list awal |
| `updatedByUserId` | bigint nullable | pengubah terakhir |
| `createdAt` | datetime | audit default |
| `updatedAt` | datetime | audit default |

### Tabel audit `support_dismantle_list_audits`

Kolom minimum:

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint | primary key |
| `dismantleListId` | bigint | relasi ke tabel utama |
| `eventType` | varchar | `CREATE_FROM_ISOLATION`, `SUBMIT_REVIEW`, `REQUEST_CORRECTION`, `TRANSFER`, `CANCEL`, `REOPEN` |
| `fromStatus` | varchar nullable | status sebelumnya |
| `toStatus` | varchar nullable | status sesudahnya |
| `actorUserId` | bigint nullable | pelaku |
| `actorName` | varchar nullable | snapshot nama |
| `actorRole` | varchar nullable | snapshot role |
| `notes` | text nullable | catatan event |
| `payloadJson` | json nullable | snapshot tambahan |
| `createdAt` | datetime | waktu event |

### Relasi domain

1. `support_dismantle_lists` harus menyimpan asal dari `Isolir`
2. `support_dismantle_lists` dapat menghasilkan satu `Ticket Dismantle`
3. `support_dismantle_list_audits` wajib mencatat seluruh perpindahan tahap penting

## Service Layer

### Service baru yang disarankan

1. `dismantle-list-service.ts`

Kemampuan minimum:

1. `getDismantleLists(filters)`
2. `getDismantleListById(id)`
3. `createDismantleListFromIsolation(input, actor)`
4. `updateDismantleList(id, input, actor)`
5. `transitionDismantleListStatus(id, action, payload, actor)`
6. `transferDismantleListToTicket(id, payload, actor)`
7. `getDismantleListAuditTrail(id)`

### Filter minimum untuk read-side

1. `status`
2. `eligibleAt`
3. `odpCode`
4. `customerName`
5. `sourceIsolationRef`
6. `search`

### Kontrak read model

Read model `DismantleListRow` yang disarankan:

```ts
type DismantleListStatus =
  | 'BARU'
  | 'REVIEW_CS'
  | 'PERLU_KOREKSI'
  | 'DITRANSFER_KE_TICKETING'
  | 'BATAL'

type DismantleListRow = {
  id: number
  dismantleListCode: string
  sourceIsolationRef: string | null
  customerName: string
  customerPhone: string | null
  serviceRef: string | null
  addressText: string
  odpCode: string | null
  isolationStartedAt: string | null
  eligibleAt: string | null
  status: DismantleListStatus
  reviewNotes: string | null
  correctionNotes: string | null
  transferredTicketRef: string | null
  createdAt: string | null
  updatedAt: string | null
}
```

## API Yang Disarankan

### 1. List dan create

- `GET /api/support/dismantle-lists`
- `POST /api/support/dismantle-lists`

`POST` dipakai untuk:

1. membuat item dari transfer isolir
2. membuka jalur create manual terbatas bila nanti dibutuhkan

### 2. Detail dan update

- `GET /api/support/dismantle-lists/[id]`
- `PATCH /api/support/dismantle-lists/[id]`

### 3. Transisi status

- `POST /api/support/dismantle-lists/[id]/transition`

Payload minimum:

```json
{
  "action": "REQUEST_CORRECTION",
  "notes": "Alamat dan kontak customer perlu dicek ulang sebelum dibuat ticket dismantle"
}
```

`action` yang disarankan:

1. `SUBMIT_REVIEW`
2. `REQUEST_CORRECTION`
3. `TRANSFER`
4. `CANCEL`
5. `REOPEN`

### 4. Transfer dari isolir

- `POST /api/billing/isolations/[id]/transfer-to-dismantle-list`

Payload minimum:

```json
{
  "notes": "Sudah isolir 1 bulan dan dipindah ke antrean dismantle"
}
```

### 5. Transfer ke ticketing

- `POST /api/support/dismantle-lists/[id]/transfer`

Payload minimum:

```json
{
  "ticketType": "DISMANTLE",
  "notes": "Siap diteruskan ke ticketing dismantle"
}
```

### 6. Audit trail

- `GET /api/support/dismantle-lists/[id]/audits`

## Permission Matrix Minimum

| Aksi | Billing | CS Operator | CS Admin | Super Admin |
|---|---|---|---|---|
| lihat list | terbatas | ya | ya | ya |
| transfer dari isolir | ya | opsional | ya | ya |
| edit saat `BARU` | tidak | ya | ya | ya |
| kirim ke review | opsional | ya | ya | ya |
| minta koreksi | tidak | ya | ya | ya |
| transfer ke ticketing | tidak | ya | ya | ya |
| batal | tidak | opsional | ya | ya |
| buka ulang item batal | tidak | tidak | ya | ya |
| lihat audit penuh | terbatas | ya | ya | ya |

## Desain UI

### Halaman daftar `/list-dismantle`

Blok utama:

1. ringkasan status
2. filter operasional
3. tabel `List Dismantle`
4. quick action per row
5. side summary untuk kandidat prioritas

Kolom minimum tabel:

1. kode list
2. referensi isolir
3. customer
4. alamat
5. ODP atau area
6. layanan
7. tanggal isolir
8. eligible date
9. status
10. ticket hasil transfer
11. aksi cepat

### Halaman detail `/list-dismantle/[id]`

Blok minimum:

1. ringkasan data customer dan layanan
2. konteks isolir sumber
3. panel keputusan `CS`
4. histori audit
5. panel transfer ke ticketing

### Quick action row

Aksi cepat yang disarankan:

1. `Review`
2. `Minta Koreksi`
3. `Transfer ke Ticketing`
4. `Batalkan`
5. `Buka Detail`

## Integrasi Dengan Modul Yang Sudah Ada

### Billing / Isolir

1. `Billing` tetap menjadi tempat kontrol isolir
2. data isolir yang sudah memenuhi syarat dapat dipindah ke `List Dismantle`
3. `Billing` dapat melihat apakah sebuah isolir sudah pernah ditransfer ke list dismantle

### CS

1. `CS` membaca `List Dismantle` sebagai antrean validasi
2. rekap cepat `CS` dapat menampilkan jumlah `BARU`, `REVIEW_CS`, dan `SIAP TRANSFER`

### Ticketing / NOC

1. item `REVIEW_CS` yang lolos dapat ditransfer menjadi `Ticket Dismantle`
2. ticket hasil transfer harus menyimpan referensi `dismantleListId`

### Inventory

1. tidak menjadi owner `List Dismantle`
2. hanya membaca konsekuensi setelah ticket dismantle membutuhkan pengembalian atau validasi perangkat

## Audit dan Observability

Minimal event audit yang perlu dicatat:

1. transfer dari isolir
2. submit ke review
3. permintaan koreksi
4. transfer ke ticketing
5. pembatalan
6. buka ulang item

Field audit minimum:

1. actor
2. role
3. status lama
4. status baru
5. notes
6. referensi isolir sumber
7. referensi ticket bila ada

## Strategi Mock dan Review DB

### Mode mock

1. sediakan `List Dismantle` dummy agar `CS` bisa review flow tanpa DB nyata
2. sediakan beberapa status untuk kebutuhan preview
3. sediakan satu kasus yang sudah berhasil ditransfer ke ticketing
4. sediakan satu kasus yang berasal dari isolir aktif 1 bulan

### Review DB

1. read-side awal boleh memakai fallback mock
2. write-side transfer dari isolir wajib menjaga histori asal
3. transfer ke ticketing wajib idempotent dan terjaga dari duplikasi

## Acceptance Minimum

Implementasi fase pertama dianggap selesai bila:

1. `Billing` bisa mentransfer isolir yang memenuhi syarat ke `List Dismantle`
2. `CS` bisa mereview dan mengubah status
3. `CS` bisa mentransfer item ke `Ticket Dismantle`
4. audit trail terbaca dari UI
5. item yang sudah ditransfer tidak bisa ditransfer ulang sembarangan

## Urutan Implementasi

### Tahap 1

1. model dan service `List Dismantle`
2. route `/list-dismantle`
3. tabel dasar dan detail dasar
4. audit trail dasar

### Tahap 2

1. tombol transfer dari isolir
2. transisi status penuh
3. quick action row
4. transfer ke ticketing

### Tahap 3

1. sinkron rekap `CS`
2. filter lebih kaya
3. hardening permission dan anti-duplikasi transfer

## Risiko Yang Harus Dijaga

1. jangan biarkan data isolir langsung membuat ticket dismantle tanpa tahap `List Dismantle`
2. jangan gabungkan `List Dismantle` ke lane `Support Dismantle` tanpa pembeda asal kandidat vs ticket aktif
3. jangan biarkan transfer ke ticketing tanpa audit
4. jangan ubah flow lane `Support Dismantle` yang sudah ada; cukup beri source ticket yang lebih rapi

## Versioning

Dokumen ini dirilis pada baseline:

- `0.66.37`
