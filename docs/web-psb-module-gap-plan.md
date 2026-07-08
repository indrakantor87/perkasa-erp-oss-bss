# Gap Implementasi Per Modul

## Tujuan

Dokumen ini merangkum gap implementasi ERP baru per modul berdasarkan:

1. parity role
2. parity flow
3. permission matrix target

Dokumen ini dipakai untuk menentukan modul mana yang:

1. cukup diselesaikan dengan perubahan akses
2. butuh penambahan queue atau screen baru
3. butuh flow baru sebelum cutover

Dokumen ini melengkapi:

1. [web-psb-target-role-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-role-design.md)
2. [web-psb-target-permission-matrix.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-permission-matrix.md)
3. [web-psb-flow-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-flow-checklist.md)

## Skala Gap

Status gap:

1. `rendah` = mayoritas butuh penyesuaian permission atau filter
2. `sedang` = butuh penyesuaian flow dan screen tambahan
3. `tinggi` = butuh modul/flow baru yang cukup besar

## 1. Dashboard

| Area | Status gap | Kebutuhan |
|---|---|---|
| dashboard lintas domain | sedang | perlu perspektif per role dan shortcut yang lebih operasional |
| dashboard per divisi | sedang | perlu kartu/queue sesuai role target |

Kesimpulan:

1. dashboard sudah ada
2. parity akan tercapai jika dashboard mulai dibelah per role

## 2. Sales

| Area | Status gap | Kebutuhan |
|---|---|---|
| input prospek/ticket awal | sedang | perlu parity `input` lama |
| marketing activities | tinggi | belum ada modul eksplisit |
| list kerja marketing | tinggi | perlu queue khusus marketing |
| survey/order/subscription | sedang | struktur ada, flow lintas role perlu dirapikan |

Kesimpulan:

1. domain `sales` sudah cukup kuat untuk baseline
2. gap terbesar ada di `marketing-activities` dan list kerja marketing

## 3. Customers

| Area | Status gap | Kebutuhan |
|---|---|---|
| customer master | rendah | mayoritas butuh penyelarasan akses |
| address/subscription view | rendah | struktur sudah ada |
| list kerja CS terkait customer | sedang | perlu integrasi ke queue lintas domain |

Kesimpulan:

1. modul ini dekat ke parity
2. pekerjaan utama ada pada integrasi ke list kerja terpadu

## 4. Support

| Area | Status gap | Kebutuhan |
|---|---|---|
| trouble ticket | sedang | flow sudah dekat, perlu role micro dan queue lebih presisi |
| isolir | sedang | perlu parity filter, mutate, restore |
| dismantle | tinggi | perlu queue khusus dan role `DISMANTLE_OPERATOR` |
| transfer/restore | tinggi | perlu kontrol supervisor dan audit jelas |

Kesimpulan:

1. `support` adalah domain terdekat ke parity teknis
2. gap paling penting ada pada `dismantle` dan alur admin support

## 5. Inventory

| Area | Status gap | Kebutuhan |
|---|---|---|
| ODP master | rendah | struktur dan write-side sudah ada |
| port/assignment | sedang | perlu pembatasan role yang lebih presisi |
| inventory untuk teknisi/NOC | sedang | perlu pemisahan screen dan queue |

Kesimpulan:

1. modul ini aman jadi prioritas awal cutover teknis
2. perlu pembeda jelas antara `NOC_OPERATOR` dan `FIELD_TECHNICIAN`

## 6. Billing

| Area | Status gap | Kebutuhan |
|---|---|---|
| invoice/payment | sedang | struktur sudah ada, parity web lama belum jadi prioritas awal |
| collection action | sedang | perlu diputuskan siapa role penggunanya dalam model baru |

Kesimpulan:

1. billing tidak perlu jadi gelombang pertama parity `web-psb-perkasa`
2. cukup distabilkan setelah role inti support/sales beres

## 7. HR

| Area | Status gap | Kebutuhan |
|---|---|---|
| employee/attendance/loan/salary | rendah | lebih merupakan domain ERP tambahan |

Kesimpulan:

1. tidak terkait langsung dengan parity `web-psb-perkasa`
2. tidak perlu masuk prioritas cutover awal

## 8. Access dan User Settings

| Area | Status gap | Kebutuhan |
|---|---|---|
| permission matrix | sedang | perlu ditambah 9 role target |
| user internal | sedang | perlu sinkron dengan role target baru |
| audit akses | rendah | fondasi sudah ada |

Kesimpulan:

1. ini fondasi penting untuk parity
2. implementasi role target harus dimulai dari sini

## 9. Creator Digital

| Area | Status gap | Kebutuhan |
|---|---|---|
| content calendar | tinggi | belum ada modul |
| campaigns | tinggi | belum ada modul |
| digital leads | tinggi | belum ada modul |
| analytics | tinggi | belum ada modul |

Kesimpulan:

1. ini gap terbesar di seluruh parity
2. role `DIGITAL_CREATOR` belum bisa aktif penuh sebelum modul dibuat

## 10. List Kerja Terpadu

| Area | Status gap | Kebutuhan |
|---|---|---|
| list lintas divisi | tinggi | belum ada satu layar pengganti `list` lama |
| perspektif per role | tinggi | perlu filter dan queue berdasarkan role baru |

Kesimpulan:

1. ini salah satu gap inti paling besar
2. tanpa modul ini, `CS` dan `MARKETING` belum bisa cutover nyaman

## Prioritas Implementasi

### Gelombang 1

1. `Access/User Settings` untuk role baru
2. `Support`
3. `Inventory`
4. dashboard per role

### Gelombang 2

1. `Sales`
2. `Customers`
3. `List kerja terpadu`

### Gelombang 3

1. `Billing`
2. `Creator Digital`

## Kesimpulan

Fokus paling efektif setelah tahap dokumen ini adalah:

1. aktifkan role baru di access settings
2. ubah permission matrix
3. pecah queue `support` dan `inventory` per role teknis
4. bangun `list kerja terpadu`
5. setelah itu baru ke parity marketing dan creator digital

## Versioning

Dokumen ini dirilis pada:

- `0.62.8` untuk baseline gap implementasi per modul setelah permission matrix target
