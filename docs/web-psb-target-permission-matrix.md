# Permission Matrix Target ERP

## Tujuan

Dokumen ini menerjemahkan desain role ERP target menjadi permission matrix yang lebih siap diimplementasikan pada `perkasa-erp-oss-bss`.

Dokumen ini dipakai untuk:

1. mendefinisikan resource dan action per role
2. menjadi acuan perubahan `permission matrix` di ERP
3. memastikan parity operasional dengan `web-psb-perkasa`

Dokumen ini melengkapi:

1. [web-psb-target-role-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-role-design.md)
2. [web-psb-flow-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-flow-checklist.md)
3. [web-psb-role-action-parity.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-role-action-parity.md)

## Acuan Teknis Saat Ini

Permission matrix bootstrap yang aktif sekarang masih berbasis:

1. tiga role: `SUPER_ADMIN`, `ADMIN_DIVISI`, `OPERATOR`
2. resource umum: `dashboard`, `import_center`, `sales`, `customers`, `support`, `inventory`, `hr`, `billing`, `access_settings`, `user_settings`
3. action umum: `view`, `create`, `update`, `approve`, `export`, `manage`

Referensi implementasi saat ini:

1. [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)
2. [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts)

## Prinsip Matrix Target

Matrix target mengikuti aturan:

1. resource tetap dikelompokkan per domain besar agar tidak terlalu meledak
2. pembatasan mikro dilakukan lewat kombinasi `role + action + queue/screen`
3. role tidak boleh diberi akses lebih luas daripada flow lama
4. `approve` hanya diberikan jika memang ada kontrol supervisor
5. `manage` hanya untuk akses sistem, user, dan konfigurasi

## Resource Target

Resource target tahap ini tetap memakai resource besar yang sudah ada:

1. `dashboard`
2. `import_center`
3. `sales`
4. `customers`
5. `support`
6. `inventory`
7. `hr`
8. `billing`
9. `access_settings`
10. `user_settings`

## Action Target

Action yang dipakai:

1. `view`
2. `create`
3. `update`
4. `approve`
5. `export`
6. `manage`

## Matrix Target Per Role

### 1. `SUPER_ADMIN`

| Resource | Actions |
|---|---|
| `dashboard` | `view`, `export`, `manage` |
| `import_center` | `view`, `create`, `approve`, `export`, `manage` |
| `sales` | `view`, `create`, `update`, `approve`, `export`, `manage` |
| `customers` | `view`, `create`, `update`, `approve`, `export`, `manage` |
| `support` | `view`, `create`, `update`, `approve`, `export`, `manage` |
| `inventory` | `view`, `create`, `update`, `approve`, `export`, `manage` |
| `hr` | `view`, `create`, `update`, `approve`, `export`, `manage` |
| `billing` | `view`, `create`, `update`, `approve`, `export`, `manage` |
| `access_settings` | `view`, `manage` |
| `user_settings` | `view`, `manage` |

### 2. `SALES_MARKETING`

| Resource | Actions |
|---|---|
| `dashboard` | `view` |
| `sales` | `view`, `create`, `update`, `export` |
| `customers` | `view`, `create`, `update` |
| `support` | `view` |
| `inventory` | `view` |

Catatan:

1. `marketing-activities` nantinya ditaruh di bawah resource `sales`
2. tidak diberi `approve` pada fase awal
3. tidak diberi akses `billing`, `access_settings`, `user_settings`, `hr`, `import_center`

### 3. `CS_OPERATOR`

| Resource | Actions |
|---|---|
| `dashboard` | `view` |
| `sales` | `view`, `create`, `update` |
| `customers` | `view`, `update` |
| `support` | `view`, `create`, `update` |
| `inventory` | `view`, `update` |

Catatan:

1. `list kerja terpadu` akan menarik kombinasi dari `sales/customers/support`
2. tidak punya `approve`
3. tidak punya akses admin sistem

### 4. `CS_ADMIN`

| Resource | Actions |
|---|---|
| `dashboard` | `view`, `export` |
| `sales` | `view`, `create`, `update`, `approve`, `export` |
| `customers` | `view`, `create`, `update`, `approve`, `export` |
| `support` | `view`, `create`, `update`, `approve`, `export` |
| `inventory` | `view`, `update`, `approve`, `export` |

Catatan:

1. ini adalah supervisor operasional CS
2. approval dipakai untuk restore, transfer, dan koreksi tertentu
3. belum otomatis diberi `import_center`

### 5. `NOC_OPERATOR`

| Resource | Actions |
|---|---|
| `dashboard` | `view` |
| `support` | `view`, `create`, `update`, `export` |
| `inventory` | `view`, `update`, `export` |

Catatan:

1. fokus pada TT teknis dan ODP
2. tidak diberi akses sales/customers/hr/billing

### 6. `FIELD_TECHNICIAN`

| Resource | Actions |
|---|---|
| `dashboard` | `view` |
| `support` | `view`, `update` |
| `inventory` | `view`, `update` |

Catatan:

1. aksi terbatas pada hasil lapangan
2. tidak punya `create` umum di domain support
3. pembeda dari NOC ada pada queue dan screen, bukan hanya matrix

### 7. `TT_OPERATOR`

| Resource | Actions |
|---|---|
| `dashboard` | `view` |
| `support` | `view`, `create`, `update` |

Catatan:

1. hanya fokus TT
2. tidak punya akses inventory umum

### 8. `DIGITAL_CREATOR`

| Resource | Actions |
|---|---|
| `dashboard` | `view` |
| `sales` | `view`, `create`, `update`, `export` |

Catatan:

1. sementara domain creator digital dititipkan di resource `sales`
2. jika nanti modul creator digital sudah berdiri sendiri, resource perlu dipecah lagi

### 9. `DISMANTLE_OPERATOR`

| Resource | Actions |
|---|---|
| `dashboard` | `view` |
| `support` | `view`, `update` |

Catatan:

1. pembatasan role ini lebih banyak ditentukan oleh queue dismantle khusus
2. tidak boleh mutate flow support lain di luar scope dismantle

## Ringkasan Perbandingan Dengan Bootstrap Saat Ini

| Area | Bootstrap saat ini | Target |
|---|---|---|
| jumlah role | 3 | 9 |
| fokus role | generik | fungsi kerja nyata |
| kontrol supervisor | terbatas | ada `CS_ADMIN` dan `SUPER_ADMIN` |
| role mikro | belum ada | `TT_OPERATOR`, `DISMANTLE_OPERATOR` |
| creator digital | belum ada | `DIGITAL_CREATOR` |

## Aturan Implementasi

Saat matrix target mulai diimplementasikan:

1. ubah tipe role agar tidak lagi terbatas pada 3 role lama
2. tambahkan baseline allowed prefixes per role baru
3. tambahkan baseline permission matrix per role baru
4. verifikasi `navigation`, `guard`, dan `landing path`
5. uji flow checklist per role setelah matrix aktif

## Catatan Desain

Matrix ini masih memakai resource tingkat domain besar. Parity mikro akan dicapai lewat:

1. queue khusus per role
2. screen khusus per role
3. filter data berdasarkan role/divisi
4. validasi action di service layer

## Versioning

Dokumen ini dirilis pada:

- `0.62.8` untuk baseline permission matrix target role ERP baru
