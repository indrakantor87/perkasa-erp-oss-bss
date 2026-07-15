# Access PRD Alignment

## Tujuan

Dokumen ini menyelaraskan implementasi modul `Akses` di web ERP dengan:

- `/.trae/documents/prd-aplikasi-web-utama.md`
- `/docs/web-role-division-menu-feature-catalog.md`
- prinsip capability-based rendering dan shared shell ERP

Dokumen ini menandai:

- `Core PRD`: requirement inti yang memang diminta PRD / katalog fitur
- `Operational Extension`: perluasan operasional yang masih sejalan dengan PRD
- `Operational Constraint`: batas implementasi yang masih dapat diterima untuk fase saat ini

## Ringkasan Acuan PRD

### PRD utama

PRD utama menetapkan bahwa:

- user masuk ke satu website yang sama
- akses modul ditentukan oleh role dan permission
- konfigurasi global hanya boleh dipegang admin

PRD juga membagi hak akses inti secara konseptual menjadi:

- `Super Admin`
- `Admin Divisi`
- `Operator`

### Katalog fitur web

Katalog fitur web menetapkan area modul `Akses` sebagai:

- ringkasan role aktif
- matrix permission
- admin permission master
- assign role-permission
- audit perubahan permission

Katalog juga menegaskan bahwa menu `/settings/access` saat ini hanya terlihat untuk:

- `SUPER_ADMIN`

## Alignment Implementasi Saat Ini

### 1. Shell modul Akses

Status: `Core PRD - aligned`

Implementasi `Akses` saat ini sudah:

- hadir sebagai route resmi `/settings/access`
- tetap berada dalam shell ERP yang sama
- dibatasi oleh route guard sebelum halaman dirender

Halaman juga menegaskan positioning yang benar:

- shared auth
- shared shell
- pembatasan di level route, shortcut, dan aksi domain

Sumber:

- `apps/web/app/(app)/settings/access/page.tsx`

### 2. Ringkasan role aktif dan permission summary

Status: `Core PRD - aligned`

Katalog meminta ringkasan role aktif dan gambaran capability utama.

Implementasi saat ini sudah menampilkan ringkasan:

- jumlah resource aktif
- jumlah akses approval
- jumlah akses manage

Ringkasan tersebut dihitung dari permission matrix role aktif, sehingga halaman ini memang berfungsi sebagai ringkasan cepat fondasi akses.

Sumber:

- `apps/web/app/(app)/settings/access/page.tsx`
- `apps/web/lib/access-control.ts`

### 3. Matrix permission

Status: `Core PRD - aligned`

Matrix permission saat ini sudah menampilkan:

- resource
- daftar aksi per resource

Struktur baseline matrix sudah memetakan hak akses lintas domain seperti:

- `dashboard`
- `daily_activity`
- `import_center`
- `sales`
- `customers`
- `support`
- `inventory`
- `hr`
- `billing`
- `access_settings`
- `user_settings`

Ini sesuai dengan requirement PRD untuk menampilkan matrix izin yang terbaca jelas dari perspektif role.

Sumber:

- `apps/web/components/access/permission-matrix.tsx`
- `apps/web/lib/access-control.ts`

### 4. Permission master dinamis

Status: `Core PRD - aligned`

Katalog fitur meminta admin permission master.

Implementasi saat ini sudah mendukung:

- bootstrap permission dari baseline aplikasi
- daftar permission dari `auth_permissions`
- create atau update permission master
- pencarian permission

Pola ini sesuai dengan kebutuhan permission master yang tidak lagi hardcoded penuh di UI, karena database review dapat menjadi sumber permission aktif saat tersedia.

Sumber:

- `apps/web/components/access/permission-admin.tsx`
- `apps/web/app/api/settings/access/bootstrap/route.ts`
- `apps/web/app/api/settings/access/permissions/route.ts`
- `apps/web/lib/services/access-permission-service.ts`

### 5. Assign role-permission

Status: `Core PRD - aligned`

Katalog fitur meminta kemampuan assign role-permission.

Implementasi saat ini sudah menyediakan:

- daftar role dari `auth_roles`
- load permission code per role
- checklist permission per role
- simpan ulang role-permission ke `auth_role_permissions`

Guardrail penting yang sudah ada:

- validasi session dan capability `manage`
- hanya aktif saat `review-db` benar-benar tersedia
- update dilakukan terpusat di service
- cache akses diinvalidasi setelah perubahan

Ini konsisten dengan PRD karena perubahan hak akses tidak dilakukan di client secara liar, tetapi tetap lewat endpoint resmi dengan cache refresh yang eksplisit.

Sumber:

- `apps/web/components/access/permission-admin.tsx`
- `apps/web/app/api/settings/access/role-permissions/[roleId]/route.ts`
- `apps/web/lib/services/access-permission-service.ts`
- `apps/web/lib/access-control-server.ts`

### 6. Audit perubahan permission

Status: `Core PRD - aligned`

Katalog fitur meminta audit perubahan permission.

Implementasi saat ini sudah memisahkan dua jalur audit:

- audit permission master
- audit role-permission

Masing-masing memiliki tabel audit sendiri dan ditampilkan kembali pada halaman `Akses`.

Perubahan yang tercatat meliputi:

- bootstrap
- create/update permission
- set role-permission

Ini sudah memenuhi requirement audit perubahan permission pada level governance modul `Akses`.

Sumber:

- `apps/web/components/access/permission-admin.tsx`
- `apps/web/app/api/settings/access/audits/route.ts`
- `apps/web/lib/services/auth-permission-audit-service.ts`
- `apps/web/lib/services/auth-role-permission-audit-service.ts`

### 7. Capability-based rendering dan server guard

Status: `Core PRD - aligned`

PRD mewajibkan konfigurasi akses tunduk pada capability matrix.

Implementasi saat ini mematuhi rule itu melalui:

- route guard `canAccessPath`
- action guard `canPerformAction`
- pengecekan session pada API
- penguncian seluruh write-side ke mode `review-db`

Dengan pola ini, halaman `Akses` tidak hanya informatif di UI, tetapi tetap dijaga dari sisi server saat bootstrap, create permission, assign role-permission, dan baca audit.

Sumber:

- `apps/web/app/(app)/settings/access/page.tsx`
- `apps/web/app/api/settings/access/bootstrap/route.ts`
- `apps/web/app/api/settings/access/permissions/route.ts`
- `apps/web/app/api/settings/access/roles/route.ts`
- `apps/web/app/api/settings/access/role-permissions/[roleId]/route.ts`
- `apps/web/app/api/settings/access/audits/route.ts`

## Operational Extension Yang Diterima

### 1. Granular role aktif lebih detail dari model PRD tinggi-level

Status: `Operational Extension - acceptable`

PRD utama menulis role secara konseptual sebagai:

- `Super Admin`
- `Admin Divisi`
- `Operator`

Implementasi web saat ini sudah memecahnya menjadi role operasional yang lebih presisi, seperti:

- `CS_ADMIN`
- `NOC_OPERATOR`
- `TT_OPERATOR`
- `DIGITAL_CREATOR`
- `DISMANTLE_OPERATOR`

Ini diterima karena:

- tetap berada dalam satu model RBAC yang sama
- justru membantu permission matrix menjadi lebih jujur terhadap kebutuhan operasional nyata
- tidak bertentangan dengan arah PRD yang memang berbasis role/divisi

Sumber:

- `apps/web/lib/access-control.ts`
- `/docs/web-role-division-menu-feature-catalog.md`

## Operational Constraint Saat Ini

### 1. Permission dinamis efektif penuh hanya saat review DB aktif

Status: `Operational Constraint - acceptable`

Saat `review-db` belum aktif atau fallback sedang dipakai:

- permission master tidak dapat dikelola
- role database tidak dibaca
- aplikasi kembali memakai baseline permission matrix bawaan

Ini masih dapat diterima karena:

- konfigurasi akses tetap aman berkat fallback baseline
- write-side governance tidak dibuka pada source yang belum siap

Guardrail:

- jangan membuka edit permission di mode non-review
- bila nanti ada production source resmi, aktivasi harus tetap melewati source yang tervalidasi

### 2. Scope permission masih di level route prefix dan resource-action

Status: `Operational Constraint - acceptable`

Implementasi saat ini sudah kuat untuk:

- route prefix permission
- resource-action permission

Namun belum sampai ke level instance atau policy yang lebih sempit, misalnya:

- approval tiket tertentu
- edit customer tertentu
- export billing berdasarkan cabang tertentu

Ini masih sesuai dengan catatan halaman `Akses` sendiri yang menyebut tahap berikutnya adalah pemecahan izin ke level data domain dan resource instance.

Guardrail:

- jangan menganggap matrix saat ini sebagai fine-grained policy final
- bila granular permission ditambah, tetap pertahankan pola capability yang deterministik dan dapat diaudit

### 3. Audit modul Akses belum sama dengan audit write action lintas semua domain

Status: `Operational Constraint - acceptable`

Modul `Akses` sudah memiliki audit khusus untuk:

- permission master
- role-permission

Tetapi ini belum sama dengan audit terpadu untuk seluruh aksi write lintas modul ERP.

Ini masih dapat diterima karena:

- requirement inti modul `Akses` sudah terpenuhi
- scope audit lintas domain adalah concern governance yang lebih luas dari satu modul ini

## Keputusan Alignment

### Sudah selaras

- shell resmi `Akses` di `/settings/access`
- ringkasan capability role aktif
- matrix permission per role
- permission master dinamis
- assign role-permission
- audit perubahan permission
- capability-based rendering dan server guard

### Extension yang diterima

- pemecahan role operasional menjadi lebih granular daripada klasifikasi PRD tingkat atas

### Constraint yang masih diterima

- permission dinamis penuh hanya aktif saat `review-db`
- scope permission masih route prefix dan resource-action
- audit masih spesifik ke permission governance, belum audit write action lintas seluruh domain

## Guardrail Lanjutan

- perubahan permission tetap harus lewat endpoint resmi, bukan state client semata
- invalidasi cache akses wajib dipertahankan setelah update permission
- fallback baseline harus tetap aman saat DB permission tidak tersedia
- perluasan ke permission level instance tidak boleh mem-bypass pola audit dan capability matrix yang sudah ada
