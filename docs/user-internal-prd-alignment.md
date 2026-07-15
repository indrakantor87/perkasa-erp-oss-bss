# User Internal PRD Alignment

## Tujuan

Dokumen ini menyelaraskan implementasi modul `User Internal` di web ERP dengan:

- `/.trae/documents/prd-aplikasi-web-utama.md`
- `/docs/web-role-division-menu-feature-catalog.md`
- prinsip shared auth, shared shell, dan capability-based governance

Dokumen ini menandai:

- `Core PRD`: requirement inti yang memang diminta PRD / katalog fitur
- `Operational Extension`: perluasan operasional yang masih sejalan dengan PRD
- `Operational Constraint`: batas implementasi yang masih dapat diterima untuk fase saat ini

## Ringkasan Acuan PRD

### PRD utama

PRD utama menempatkan auth internal sebagai fondasi untuk:

- login username/password tunggal
- role-based access dalam satu website ERP
- konfigurasi user internal oleh admin global

PRD juga menegaskan bahwa akses user mengikuti shell ERP yang sama, bukan aplikasi yang terpisah per divisi.

### Katalog fitur web

Katalog fitur web menetapkan area `User Internal` sebagai:

- ringkasan user
- tabel user
- form user
- audit user
- panel profil daily activity

Katalog juga menetapkan bahwa menu `/settings/users` saat ini hanya terlihat untuk:

- `SUPER_ADMIN`

## Alignment Implementasi Saat Ini

### 1. Shell modul User Internal

Status: `Core PRD - aligned`

Implementasi `User Internal` saat ini sudah:

- hadir sebagai route resmi `/settings/users`
- tetap berada di shell ERP yang sama
- dijaga oleh route guard sebelum halaman dirender

Halaman ini juga diposisikan jujur sebagai review akun auth internal lintas modul, sehingga tetap konsisten dengan tujuan PRD untuk satu fondasi login ERP.

Sumber:

- `apps/web/app/(app)/settings/users/page.tsx`

### 2. Ringkasan user

Status: `Core PRD - aligned`

Katalog meminta ringkasan user.

Implementasi saat ini sudah menampilkan:

- total user
- user aktif
- admin users
- operator users

Ringkasan ini diambil dari daftar user yang dimuat di halaman, baik dari review DB maupun fallback mock, sehingga operator admin tetap mendapat pembacaan cepat atas kondisi auth internal.

Sumber:

- `apps/web/app/(app)/settings/users/page.tsx`
- `apps/web/lib/services/auth-user-service.ts`

### 3. Tabel user

Status: `Core PRD - aligned`

Katalog meminta tabel user dengan konteks utama operasional.

Implementasi tabel saat ini sudah mencakup:

- user
- role
- divisi
- cabang
- status
- sumber data
- aksi kelola

Untuk user yang berasal dari `review-db`, tabel juga membuka panel edit inline sehingga admin dapat mengelola user tanpa keluar dari daftar utama.

Sumber:

- `apps/web/components/auth-user-management-table.tsx`
- `apps/web/lib/services/auth-user-service.ts`

### 4. Form user: create

Status: `Core PRD - aligned`

Katalog meminta form user.

Implementasi create user saat ini sudah mendukung:

- nama lengkap
- username
- email
- password awal
- role database
- divisi
- cabang
- status

Guardrail server-side yang sudah ada:

- validasi session dan capability `manage`
- write hanya aktif saat `review-db` benar-benar tersedia
- validasi format username, email, password, status
- validasi keberadaan role, divisi, dan cabang
- pencegahan duplikasi username atau email

Sumber:

- `apps/web/components/auth-user-create-form.tsx`
- `apps/web/app/api/settings/users/route.ts`

### 5. Form user: edit, reset password, deactivate/reactivate

Status: `Core PRD - aligned`

Katalog meminta create, edit, reset password, deactivate, dan reactivate.

Implementasi saat ini sudah menyediakan:

- edit profil inti user
- ganti role
- ubah divisi
- ubah cabang
- ubah status `ACTIVE` / `INACTIVE`
- reset password melalui field `newPassword`

Keputusan alignment:

- deactivate/reactivate saat ini direalisasikan melalui perubahan status `ACTIVE` dan `INACTIVE`
- ini tetap memenuhi intent PRD karena kontrol aktivasi user sudah tersedia dari UI dan API resmi

Guardrail penting:

- username sengaja dikunci agar identitas login tidak berubah sembarangan
- email duplikat dicegah saat update
- password baru harus memenuhi panjang minimum

Sumber:

- `apps/web/components/auth-user-management-table.tsx`
- `apps/web/app/api/settings/users/[id]/route.ts`

### 6. Audit user internal

Status: `Core PRD - aligned`

Katalog meminta histori perubahan user internal.

Implementasi audit saat ini sudah mencatat:

- `CREATE`
- `UPDATE`
- `RESET_PASSWORD`

Audit ditampilkan kembali pada halaman `User Internal` sebagai jejak perubahan yang menyimpan:

- actor
- target user
- detail perubahan
- waktu kejadian

Ini sudah memenuhi requirement audit user internal sebagai modul governance.

Sumber:

- `apps/web/components/auth-user-audit-list.tsx`
- `apps/web/lib/services/auth-user-audit-service.ts`
- `apps/web/app/api/settings/users/route.ts`
- `apps/web/app/api/settings/users/[id]/route.ts`

### 7. Panel profil Daily Activity

Status: `Core PRD - aligned`

Katalog meminta panel profil user untuk konteks approval dan organisasi di daily activity.

Implementasi saat ini sudah menyediakan panel khusus untuk:

- mapping username ke divisi
- mapping sub-divisi
- mapping planning level

Profil ini dipakai untuk:

- auto-fill daily activity
- menjaga konsistensi divisi/sub-divisi
- menjaga scope approval manager per username

Ini sesuai dengan intent PRD karena profil user internal tidak hanya menjadi akun login, tetapi juga pengikat struktur organisasi operasional.

Sumber:

- `apps/web/components/daily-activity-user-profile-panel.tsx`
- `apps/web/app/api/settings/users/daily-activity-profiles/route.ts`

### 8. Capability-based rendering dan server guard

Status: `Core PRD - aligned`

PRD menuntut bahwa konfigurasi user internal tidak boleh terbuka ke role non-admin.

Implementasi saat ini sudah mematuhi rule itu melalui:

- route guard `canAccessPath`
- action guard `canPerformAction`
- write-side khusus `user_settings:manage`
- `review-db` gating pada API create, edit, dan daily activity profile

Katalog saat ini juga konsisten karena hanya `SUPER_ADMIN` yang melihat menu ini.

Sumber:

- `apps/web/app/(app)/settings/users/page.tsx`
- `apps/web/lib/access-control.ts`
- `apps/web/app/api/settings/users/route.ts`
- `apps/web/app/api/settings/users/[id]/route.ts`
- `apps/web/app/api/settings/users/daily-activity-profiles/route.ts`

## Operational Extension Yang Diterima

### 1. Fallback mock users saat review DB belum siap

Status: `Operational Extension - acceptable`

Halaman `User Internal` saat ini tetap hidup walau `review-db` belum siap, dengan menampilkan akun bootstrap mock.

Ini diterima karena:

- membantu review shell dan layout governance tetap berjalan
- tidak membuka kredensial riil di UI
- write-side tetap dikunci sehingga mock tidak menjadi sumber kebenaran palsu

Sumber:

- `apps/web/lib/services/auth-user-service.ts`
- `apps/web/app/(app)/settings/users/page.tsx`

## Operational Constraint Saat Ini

### 1. Write-side user internal hanya aktif saat review DB

Status: `Operational Constraint - acceptable`

Saat `review-db` belum aktif atau fallback sedang dipakai:

- create user dinonaktifkan
- edit user dinonaktifkan
- mapping daily activity profile dinonaktifkan

Ini masih dapat diterima karena:

- governance write-side tidak boleh menulis ke mock source
- fallback tetap hanya dipakai untuk review visual dan struktur

### 2. Deactivate/reactivate belum menjadi action type audit yang terpisah

Status: `Operational Constraint - acceptable`

Secara fungsi, deactivate/reactivate sudah ada melalui perubahan status `ACTIVE` dan `INACTIVE`.

Namun pada audit log, perubahan ini saat ini tercatat sebagai bagian dari:

- `UPDATE`

dan bukan action type khusus terpisah.

Ini masih dapat diterima karena:

- jejak perubahan status tetap tercatat di detail audit
- requirement inti audit user masih terpenuhi

Guardrail:

- bila nanti audit governance perlu lebih granular, action type khusus `DEACTIVATE` dan `REACTIVATE` dapat ditambahkan tanpa mengubah flow utama

### 3. Username belum bisa diubah dari UI

Status: `Operational Constraint - acceptable`

Username saat ini sengaja dikunci saat edit.

Ini masih sejalan dengan PRD karena:

- identitas login lebih aman bila tidak sering berubah
- risiko drift ke referensi username pada auth dan daily activity menjadi lebih kecil

Guardrail:

- bila suatu saat rename username dibutuhkan, harus lewat flow khusus yang memikirkan dampak ke profil daily activity dan audit

## Keputusan Alignment

### Sudah selaras

- shell resmi `User Internal` di `/settings/users`
- ringkasan user
- tabel user
- form create user
- edit user
- reset password
- deactivate/reactivate via status
- audit user internal
- panel profil daily activity
- capability-based rendering dan server guard

### Extension yang diterima

- fallback mock users untuk menjaga review UI tetap hidup tanpa write ke source palsu

### Constraint yang masih diterima

- write-side hanya aktif saat `review-db`
- audit deactivate/reactivate belum memakai action type terpisah
- username dikunci saat edit

## Guardrail Lanjutan

- user internal tetap harus dikelola lewat endpoint resmi, bukan manipulasi state client
- fallback mock tidak boleh diperlakukan sebagai sumber kebenaran auth riil
- perubahan role user harus tetap tunduk pada matrix permission dan route guard
- perubahan username, bila kelak dibuka, harus mempertahankan konsistensi audit dan profil daily activity
