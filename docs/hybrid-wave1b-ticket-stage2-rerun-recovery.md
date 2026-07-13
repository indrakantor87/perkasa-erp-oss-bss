# Recovery Rerun Tahap 2 Wave 1B Ticket

## Tujuan

Dokumen ini dipakai ketika `transform tahap 2` atau jalur `Wave 1B Ticket production`
tanpa sengaja dijalankan ulang dan tim ingin memastikan apakah duplikat yang muncul
masih aman, perlu re-link, atau perlu cleanup sebelum lanjut ke hosting / cutover.

Dokumen ini melengkapi:

1. [staging-transform-stage-2.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-transform-stage-2.md)
2. [hybrid-wave-1b-psb-ticket-production-runbook.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/hybrid-wave-1b-psb-ticket-production-runbook.md)
3. [xampp_review_wave1b_ticket_stage2_rerun_audit.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_wave1b_ticket_stage2_rerun_audit.sql)

## Jawaban Singkat

Ya, kondisi ini bisa diperbaiki.

Tetapi cara perbaikannya harus dibedakan menjadi dua:

1. **hanya UI / metadata batch yang terlihat duplikat**  
   Tidak perlu hapus data final. Cukup audit dan pastikan link staging masih benar.
2. **memang ada record final ganda akibat rerun / reload batch**  
   Perlu cleanup terarah, tetapi hanya setelah audit downstream reference selesai.

## Catatan Penting

- Jangan langsung menghapus `crm_customers`, `sales_orders`, `service_subscriptions`, atau `service_work_orders` tanpa audit.
- Batch `PROD-WEBPSB-TICKET-001` bersifat fondasional. Subscription dan work order dari batch ini bisa sudah dipakai oleh:
  - support
  - billing
  - inventory / ODP
  - device assignment
- Karena itu recovery yang aman selalu dimulai dari query audit read-only.

## Langkah 1: Audit Dulu

Jalankan:

```sql
SOURCE database/xampp_review_wave1b_ticket_stage2_rerun_audit.sql;
```

Fokus baca hasil pada section berikut:

1. `same_batch_code_history`
2. `customer_target_collisions_in_batch`
3. `order_target_collisions_in_batch`
4. `duplicate_final_customers_linked_to_batch`
5. `duplicate_final_orders_linked_to_batch`
6. `duplicate_final_subscriptions_linked_to_batch`
7. `duplicate_final_work_orders_linked_to_batch`
8. `downstream_reference_counts_for_batch_targets`

## Interpretasi Hasil

### Aman / ringan

Jika:

- collision query kosong
- duplicate final query kosong
- downstream reference count tidak menunjukkan anomali

maka kemungkinan besar yang terjadi hanya:

- batch pernah dijalankan ulang, tetapi transform tetap idempotent
- angka duplikat pada UI berasal dari metadata / dedupe natural key

Dalam kondisi ini tidak perlu cleanup final record.

### Perlu recovery terbatas

Jika:

- ada `duplicate_final_customers_linked_to_batch`
- tetapi order / subscription / work order tidak ganda

maka recovery cukup fokus pada customer layer.

### Perlu recovery penuh batch

Jika:

- order, subscription, atau work order juga ganda
- dan downstream reference masih `0`

maka jalur paling aman adalah:

1. backup DB dulu
2. rollback link batch ini
3. hapus final record yang hanya milik batch ini
4. rerun transform tahap 2
5. jika perlu, rerun tahap 3 dan 4 sesuai urutan

## Kapan Jangan Cleanup Langsung

Jangan hapus final record jika audit menunjukkan reference aktif pada:

- `support_trouble_tickets`
- `support_isolations`
- `support_dismantle_history`
- `billing_invoices`
- `network_odp_ports`
- `service_device_assignments`

Jika salah satu count di section `downstream_reference_counts_for_batch_targets` lebih
dari `0`, berarti duplicate cleanup harus dilakukan secara relink terarah, bukan
delete langsung.

## Recovery Paling Aman Secara Operasional

Untuk kasus sebelum hosting dan sebelum cutover production nyata, pendekatan paling aman adalah:

1. audit hasil rerun
2. backup DB review
3. tentukan apakah duplicate hanya customer, atau sudah sampai order/subscription/work order
4. lakukan cleanup terarah hanya pada entity yang benar-benar ganda
5. rerun transform dari tahap yang paling rendah yang terdampak

Urutan rerun setelah cleanup:

1. `database/xampp_review_transform_stage_2.sql` atau jalur production ticket yang sesuai
2. `database/xampp_review_transform_stage_3.sql` bila work order / support perlu dibentuk ulang
3. `database/xampp_review_transform_stage_4.sql` bila invoice bergantung pada subscription yang ikut disentuh

## Rekomendasi Praktis Untuk Kasus Anda

Karena Anda menyebut duplikat muncul setelah `double` menjalankan tahap 2, rekomendasi saya:

1. **jangan lanjut cleanup manual buta**
2. jalankan audit SQL di atas
3. lihat apakah duplikat hanya ada di customer, atau sudah sampai order/subscription
4. bila Anda kirim hasil section audit itu, cleanup bisa ditentukan dengan jauh lebih presisi

## Pencegahan Ke Depan

- Gunakan jalur production yang sudah dihardening dan idempotent bila tersedia
- Catat batch id aktif sebelum rerun
- Setelah rerun, selalu cek:
  - target link di staging
  - final count per entity
  - downstream references
- Jangan mengandalkan angka `valid / invalid / duplikat` di ringkasan Import Center saja untuk memutuskan health batch
