# Checklist PRD Web Utama

## Tujuan

Dokumen ini menjadi tracker implementasi antara PRD aplikasi web utama dan status aktual `apps/web`.

Status dipakai dengan arti:

- `SUDAH`: requirement inti sudah hidup di web
- `PARSIAL`: fondasi sudah ada, tetapi alur belum lengkap
- `BELUM`: baru berupa rencana, shell kosong, atau belum muncul di web

## Ringkasan Cepat

| Area | Status | Catatan |
|---|---|---|
| Login tunggal | SUDAH | Auth hybrid + session cookie sudah hidup |
| Dashboard utama | SUDAH | KPI, module shortcut, status sumber data sudah ada |
| Navigasi shell | SUDAH | Sidebar, topbar, RBAC menu sudah aktif |
| Import center | PARSIAL | Read-side kuat, action pipeline belum penuh |
| Detail batch | SUDAH | Row review dan summary batch sudah ada |
| Sales | PARSIAL | Lead review sudah bisa create, workflow belum lengkap |
| Customers | PARSIAL | Customer master sudah bisa create, lifecycle belum lengkap |
| Support | PARSIAL | TT review sudah bisa create, close/SLA belum lengkap |
| Billing | PARSIAL | Collection action sudah bisa create, payment/invoice penuh belum |
| Inventory | BELUM | Masih shell + summary |
| HR | BELUM | Masih shell + summary |
| Settings access | PARSIAL | Matrix akses ada, permission master dinamis belum |
| Settings users | PARSIAL | List + create sudah ada, edit/reset/deactivate belum |
| Mobile readiness | PARSIAL | Shell adaptif, mode detail mobile belum merata |
| Prisma target | BELUM | Saat ini masih memakai `mysql2` langsung |

## Checklist Detail

| Requirement PRD | Status | Implementasi Saat Ini | Gap Utama | Prioritas |
|---|---|---|---|---|
| Login username/password tunggal | SUDAH | Halaman login, session cookie, logout, redirect per role | Belum ada reset password dan full auth admin | Tinggi |
| Role user `SUPER_ADMIN`, `ADMIN_DIVISI`, `OPERATOR` | SUDAH | RBAC route, sidebar, shortcut, action matrix | Permission masih statis, belum per data instance | Tinggi |
| Dashboard KPI lintas domain | SUDAH | KPI customer, order, TT, isolir, inventory, employee, overdue invoice | KPI per proses detail belum lengkap | Tinggi |
| Sidebar domain + topbar context | SUDAH | Shell aplikasi dan active state sudah ada | Quick search modul belum nyata | Sedang |
| Pusat import sebagai modul kelas satu | PARSIAL | Halaman daftar batch, detail batch, create batch, upload file sumber, parser ke row staging, validasi, trigger transform, dan histori aksi batch sudah hidup | Parser format bebas per domain dan eksekusi transform per batch yang benar-benar terisolasi belum aktif penuh | Sangat Tinggi |
| Pipeline transform tahap 1-4 | PARSIAL | Tombol eksekusi transform tahap 1-4 dari web sudah ada | Eksekusi masih mengikuti baseline SQL review global, belum punya histori eksekusi terstruktur per batch | Sangat Tinggi |
| Filter review batch dan row bermasalah | PARSIAL | Detail row sudah ada | Filter interaktif per status/domain/source belum penuh | Sedang |
| Sales shell: lead, coverage, survey, order | PARSIAL | Lead review sudah bisa create | Coverage, survey, dan sales order belum hidup | Sangat Tinggi |
| Customer shell: master, address, subscription, histori | PARSIAL | Create customer + primary address sudah ada | Subscription lifecycle dan histori layanan belum lengkap | Tinggi |
| Support shell: TT, isolir, dismantle, SLA | PARSIAL | TT open review sudah ada, create TT sudah ada | Close ticket, SLA penuh, isolir action, dismantle flow belum ada | Sangat Tinggi |
| Inventory shell: item, stock movement, ODP, device assignment | BELUM | Baru shell domain dan summary | Review section dan write action belum ada | Tinggi |
| HR shell: employee, attendance, salary, loan | BELUM | Baru shell domain dan summary | Review section dan write action belum ada | Tinggi |
| Billing shell: invoice, payment, collection, overdue | PARSIAL | Collection action dan review invoice sudah ada | Payment entry dan lifecycle invoice belum lengkap | Sangat Tinggi |
| Settings access dan permission | PARSIAL | Permission matrix dan access summary sudah ada | Permission master dinamis dan audit perubahan belum ada | Tinggi |
| Settings users internal | PARSIAL | Direktori user + create user ke `auth_users` sudah ada | Edit user, reset password, deactivate/reactivate belum ada | Sangat Tinggi |
| Audit log dasar | BELUM | Belum ada modul/layar khusus audit | Perubahan write action belum tercatat terpusat | Tinggi |
| Kompatibilitas mobile web | PARSIAL | Shell dan login cukup aman di layar kecil | Tabel review/detail belum punya pola card/stacked merata | Tinggi |
| Android wrapper readiness | PARSIAL | Arsitektur mengarah ke sana dan shell aman sebagai basis | Integrasi wrapper dan pengujian jalur mobile belum formal | Sedang |
| Prisma sebagai target data layer | BELUM | Service layer sudah ada | Implementasi masih memakai `mysql2/promise` langsung | Sedang |

## Evidence Implementasi

### Auth

- `apps/web/app/login/page.tsx`
- `apps/web/app/api/auth/login/route.ts`
- `apps/web/app/api/auth/logout/route.ts`
- `apps/web/lib/auth.ts`
- `apps/web/lib/auth-session.ts`
- `apps/web/lib/access-control.ts`

### Dashboard

- `apps/web/app/dashboard/page.tsx`
- `apps/web/lib/services/dashboard-service.ts`
- `apps/web/components/data-source-status.tsx`

### Import

- `apps/web/app/import/page.tsx`
- `apps/web/app/import/[batchId]/page.tsx`
- `apps/web/lib/services/import-service.ts`
- `apps/web/app/api/import/batches/route.ts`
- `apps/web/app/api/import/batches/[id]/route.ts`

### Domain

- `apps/web/app/[domain]/page.tsx`
- `apps/web/components/domain-shell.tsx`
- `apps/web/lib/services/domain-service.ts`
- `apps/web/lib/mock-domains.ts`

### Settings

- `apps/web/app/settings/access/page.tsx`
- `apps/web/app/settings/users/page.tsx`
- `apps/web/components/auth-user-create-form.tsx`
- `apps/web/app/api/settings/users/route.ts`
- `apps/web/lib/services/auth-user-service.ts`

## Prioritas Implementasi Berikutnya

1. Aktifkan write action Import Center:
   create batch, validasi, dan trigger transform tahap 1-4.
2. Lengkapi user internal:
   edit user, reset password, deactivate/reactivate.
3. Lengkapi workflow domain inti:
   sales order, work order, payment, dan support close flow.
4. Hidupkan inventory dan HR:
   review section operasional + write action awal.
5. Rapikan mobile behavior:
   pola card/stacked row untuk tabel sempit dan form panjang.

## Catatan

- Dokumen ini adalah checklist implementasi web, bukan pengganti PRD.
- Status dapat berubah cepat seiring iterasi fitur, jadi file ini sebaiknya diperbarui setiap kali milestone web bertambah.
