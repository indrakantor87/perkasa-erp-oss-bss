# Hybrid Wave 2 PSB Production Mini-Batch

## Tujuan

Dokumen ini mengunci `mini-batch produksi pertama` yang aman dijalankan dari data production `Web PSB` setelah sample review `Wave 1A`, `Wave 1B`, dan `Wave 1C` memberi bukti yang cukup.

Target dokumen ini:

1. memilih batch production paling rendah risiko
2. menentukan urutan import yang tidak menunggu seluruh migrasi selesai
3. menghindari batch production yang masih terlalu longgar atau belum tervalidasi run nyata
4. menyiapkan jembatan dari review DB ke import production kecil yang benar-benar bisa dieksekusi

## Prinsip Batch

- pilih domain yang:
  - sudah punya model final yang stabil
  - sudah lolos sample review nyata
  - minim ketergantungan ke `Ticket split`
  - tidak membutuhkan write-back ke production source
- hindari dulu domain yang:
  - relasinya longgar
  - membutuhkan heuristik matching berat
  - masih menunggu adapter atau final config table

## Status Bukti Saat Ini

### Sudah Lolos Review Nyata

- `Wave 1A`
  - `DismantleTickets` -> `support_dismantle_queue`
  - `TroubleTicketPhoto` -> `support_trouble_ticket_photos`
  - `TroubleTicketSla` -> `support_trouble_ticket_sla`
  - `psb_odp` -> `network_odp`
- `Wave 1C`
  - `CoveredArea` -> `sales_covered_areas`
  - `MarketingActivity` -> `sales_marketing_activities`
  - relasi activity -> area
  - bootstrap native `network_odp_ports`

### Sudah Siap Artefak, Belum Lolos Run Nyata

- `Wave 1B`
  - `Ticket` -> `crm_customers`
  - `Ticket` -> `crm_customer_addresses`
  - `Ticket` -> `sales_orders`
  - `Ticket` -> `service_subscriptions`
  - `Ticket` -> `service_work_orders`

### Masih Ditahan

- `TroubleTicketMaster`
- `Priority`
- `WhatsappTemplate`
- production support batch yang bergantung pada matching longgar customer/service

## Mini-Batch Produksi Pertama yang Disarankan

### Batch A: Sales Coverage

Source production:

- `CoveredArea`

Target ERP:

- `sales_covered_areas`

Alasan aman:

- struktur source sederhana
- final table sudah stabil
- sample `Wave 1C` sudah lulus
- tidak bergantung pada customer/service

### Batch B: Marketing Activity

Source production:

- `MarketingActivity`

Target ERP:

- `sales_marketing_activities`
- `sales_marketing_activity_areas`

Alasan aman:

- model final sudah tervalidasi di `Wave 1C`
- relasi area sudah terbukti bisa dinormalisasi
- bernilai tinggi untuk parity divisi Marketing

Catatan:

- hanya dijalankan setelah `CoveredArea` production selesai masuk

### Batch C: ODP Header

Source production:

- `psb_odp`

Target ERP:

- `network_odp`

Alasan aman:

- sample `Wave 1A` sudah lulus
- source production nyata sudah tervalidasi
- struktur header cukup stabil

### Batch D: Native ODP Port Bootstrap

Source ERP:

- `network_odp`

Target ERP:

- `network_odp_ports`

Alasan aman:

- tidak menunggu source legacy yang memang tidak ada
- model bootstrap sudah lulus `Wave 1C`
- bisa segera memberi struktur port untuk modul operasional ERP baru

Catatan penting:

- port dibuat `1..total_ports`
- seluruh slot awal `AVAILABLE`
- jangan menandai `USED` hanya berdasar `terpakai`

### Batch E: Trouble Ticket SLA

Source production:

- `TroubleTicketSla`

Target ERP:

- `support_trouble_ticket_sla`

Alasan aman:

- bentuknya master/config sederhana
- sample `Wave 1A` sudah lulus
- bernilai tinggi untuk dashboard aging dan lane SLA

## Batch yang Sengaja Ditunda dari Mini-Batch Pertama

### Ticket Split Production

Walaupun artefak `Wave 1B` sudah siap, batch ini saya sarankan belum masuk mini-batch produksi pertama sampai:

1. sample `Wave 1B` lulus run nyata di review DB
2. package mapping final dipastikan cukup untuk variasi data production
3. strategi deduplikasi customer dan address diuji pada subset production kecil

### Isolation / Dismantle / TroubleTicket Transaksional

Domain ini sudah bernilai tinggi, tetapi saya sarankan tidak menjadi batch produksi pertama karena:

- relasi ke customer/service masih bisa longgar
- matching fallback belum sepenuhnya diuji pada subset production besar
- risiko dampak operasional lebih tinggi bila rule mapping masih perlu iterasi

## Urutan Eksekusi Mini-Batch Produksi Pertama

1. `CoveredArea`
2. `MarketingActivity`
3. `psb_odp`
4. bootstrap `network_odp_ports`
5. `TroubleTicketSla`

Urutan ini dipilih karena:

- sales coverage menjadi pondasi untuk marketing activity
- header ODP harus ada dulu sebelum port bootstrap
- SLA TT bisa dijalankan mandiri dan tidak memblokir batch lainnya

## Format Ekstraksi Production yang Disarankan

Karena akses DB production dilakukan via terminal Coolify dan read-only, format yang paling aman adalah:

1. jalankan query read-only dari app `Web PSB`
2. keluarkan hasil sebagai JSON
3. simpan per tabel ke file export terpisah
4. impor file export itu ke review flow / staging local

Contoh pembagian file:

- `covered-area.production.json`
- `marketing-activity.production.json`
- `psb-odp.production.json`
- `trouble-ticket-sla.production.json`

## Guardrail Eksekusi

- dilarang write ke DB production
- seluruh query extraction harus read-only
- batch dijalankan di review DB terlebih dahulu
- setiap batch wajib punya:
  - row count source
  - row count staging
  - row count final
  - daftar row `BLOCKED`
- jika satu batch gagal, batch berikutnya tidak otomatis jalan

## Acceptance Criteria

### Batch A dan B

- seluruh row `CoveredArea` source masuk ke `sales_covered_areas`
- seluruh row `MarketingActivity` source masuk ke `sales_marketing_activities`
- seluruh relasi area valid masuk ke `sales_marketing_activity_areas`
- tidak ada relasi area orphan

### Batch C dan D

- seluruh row `psb_odp` source masuk ke `network_odp`
- untuk setiap header ODP, jumlah row `network_odp_ports` = `total_ports`
- tidak ada slot bootstrap yang diisi `USED` tanpa source bukti

### Batch E

- seluruh row `TroubleTicketSla` source masuk ke `support_trouble_ticket_sla`
- tidak ada duplikasi `trouble_type + duration_days`

## Deliverable yang Perlu Disiapkan Berikutnya

1. extraction query pack production untuk:
   - `CoveredArea`
   - `MarketingActivity`
   - `psb_odp`
   - `TroubleTicketSla`
2. assertion query `Wave 1B`
3. assertion query `Wave 1C`
4. runbook `Wave 2 production mini-batch`
5. checklist hasil mini-batch production

## Keputusan

Mini-batch produksi pertama yang paling aman dan bernilai tinggi adalah:

- `CoveredArea`
- `MarketingActivity`
- `psb_odp`
- bootstrap `network_odp_ports`
- `TroubleTicketSla`

Sedangkan `Ticket split production` dan support transaksi longgar tetap ditahan untuk batch sesudah validasi `Wave 1B` nyata.
