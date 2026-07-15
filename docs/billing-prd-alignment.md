# Billing PRD Alignment

## Tujuan

Dokumen ini menyelaraskan implementasi modul `Billing` di web ERP dengan:

- `/.trae/documents/prd-aplikasi-web-utama.md`
- `/docs/web-role-division-menu-feature-catalog.md`
- prinsip `List Kerja Terpadu` untuk queue yang actionable dan capability-based

Dokumen ini menandai:

- `Core PRD`: requirement inti yang memang diminta PRD / katalog fitur
- `Operational Extension`: perluasan operasional yang masih sejalan dengan PRD
- `Operational Constraint`: batas implementasi yang masih dapat diterima untuk fase saat ini

## Ringkasan Acuan PRD

### PRD utama

PRD utama menetapkan Billing sebagai shell untuk:

- invoice
- payment
- collection action
- overdue status

Billing harus tetap menjadi bagian dari satu shell ERP yang terhubung ke:

- `Customer`
- `Support`

### Katalog fitur web

Katalog fitur Billing menetapkan area:

- shell domain: header, highlights, alur invoice, payment, collection, integrasi ke Customer dan Support
- review invoice: `invoice number`, `invoice type`, `status`, `total`, `paid`, `remaining`, `due date`
- review collection: `follow-up state`, `action type`, `collection status`
- review suspend dan reconnect: `suspend candidate`, `reconnect ready`, `write-off queue`
- segmentasi queue: `recurring vs one-time`, `follow-up`, `promise to pay`, `suspend ready`, `reconnect ready`, `histori action`
- form write-side:
  - generate invoice
  - status invoice
  - payment entry
  - collection action
  - resolve follow-up
- contextual prefill: query `invoice` dan `service`

## Alignment Implementasi Saat Ini

### 1. Shell domain Billing

Status: `Core PRD - aligned`

Implementasi Billing saat ini sudah:

- tampil dalam shell domain resmi `/billing`
- menampilkan panel aksi prioritas billing
- menghubungkan antrean review ke form yang relevan
- menyembunyikan write-side untuk role tanpa capability create/update

Sumber:

- `apps/web/components/billing-domain-workspace.tsx`
- `apps/web/components/domain-shell.tsx`

### 2. Review invoice

Status: `Core PRD - aligned`

Review data billing saat ini sudah mencakup area inti PRD:

- invoice number
- invoice type
- invoice status
- total amount
- paid amount
- remaining amount
- due date
- issue date
- billing month / year

Implementasi review berasal dari:

- `billing_invoices`
- join ke `service_subscriptions`
- join ke `crm_customers`

Sumber:

- `apps/web/lib/services/domain-service.ts`

### 3. Review collection

Status: `Core PRD - aligned`

Review collection saat ini sudah mencakup:

- follow-up state
- action type
- collection status
- due follow-up
- notes / histori action terbaru

Implementasi memakai:

- `billing_collection_actions`
- konteks invoice dan service terkait

Ini sesuai dengan requirement PRD untuk antrean collection dan histori tindak lanjut.

### 4. Review suspend / reconnect / write-off

Status: `Core PRD - aligned`

Implementasi Billing saat ini sudah memisahkan antrean:

- suspend ready
- reconnect ready
- write-off queue
- promise to pay

Ini konsisten dengan katalog fitur yang meminta segmentasi queue operasional billing.

### 5. Form generate invoice

Status: `Core PRD - aligned`

Form generate invoice saat ini sudah mendukung:

- generate single service
- generate batch billing-ready
- recurring invoice
- one-time invoice:
  - installation
  - adjustment
  - termination

Guardrail yang sudah berjalan:

- hanya subscription ACTIVE yang dipakai
- recurring invoice memakai anti-duplikasi periode
- batch mode hanya untuk recurring dan memakai daftar subscription yang sedang tersedia

Sumber:

- `apps/web/components/billing-invoice-generate-form.tsx`
- `apps/web/app/api/billing/invoices/generate/route.ts`

### 6. Form status invoice

Status: `Core PRD - aligned`

Form update status invoice saat ini sudah mengelola:

- `CANCELLED`
- `SUSPENDED`
- `OVERDUE` sebagai re-open dari suspend

Guardrail server-side:

- invoice yang sudah punya pembayaran tidak bisa dibatalkan
- invoice yang sudah lunas tidak bisa disuspend
- reconnect / re-activate hanya valid dari state yang benar

Sumber:

- `apps/web/components/billing-invoice-status-form.tsx`
- `apps/web/app/api/billing/invoices/status/route.ts`

### 7. Form payment entry

Status: `Core PRD - aligned`

Form payment entry saat ini sudah mencakup:

- invoice target
- nominal
- payment method
- payment date
- reference number
- notes

Perilaku penting:

- otomatis menyelaraskan `paid_amount`
- menghitung `invoice_status`
- menarik invoice keluar dari jalur suspend bila pembayaran mulai masuk

Ini sesuai dengan requirement PRD untuk payment entry dan sinkronisasi overdue status.

Sumber:

- `apps/web/components/billing-payment-form.tsx`
- `apps/web/app/api/billing/payments/route.ts`

### 8. Form collection action dan resolve follow-up

Status: `Core PRD - aligned`

Form collection sudah mendukung action:

- reminder
- call
- visit
- promise to pay
- suspend
- reconnect
- write-off

Serta form resolve follow-up untuk menutup jalur action terbuka.

Guardrail penting:

- beberapa action hanya valid saat status `OPEN`
- reconnect tidak boleh muncul di invoice yang belum valid masuk jalur suspend/reconnect
- invoice `PAID` atau `CANCELLED` tidak menerima action baru

Sumber:

- `apps/web/components/billing-collection-action-form.tsx`
- `apps/web/components/billing-collection-resolve-form.tsx`
- `apps/web/app/api/billing/collection-actions/route.ts`

### 9. Contextual prefill `invoice` dan `service`

Status: `Core PRD - aligned`

PRD Billing mewajibkan contextual prefill:

- `invoice`
- `service`

Implementasi saat ini sudah mematuhi:

- `service` mem-prefill form generate invoice
- `invoice` mem-prefill form status, collection, resolve, dan payment

Sumber:

- `apps/web/components/domain-shell.tsx`
- `apps/web/components/billing-domain-workspace.tsx`

### 10. Aksi prioritas billing dari antrean

Status: `Operational Extension - allowed`

Implementasi Billing saat ini menambah panel `Aksi Billing Prioritas` yang memetakan section review menjadi CTA langsung.

Ini tidak tertulis eksplisit di PRD, tetapi tetap selaras karena:

- CTA masih mengikuti capability role
- CTA masih menuju form write-side resmi
- antrean menjadi lebih actionable, sejalan dengan prinsip worklist

### 11. Quick action modal Billing

Status: `Operational Extension - allowed`

Quick action modal pada row billing dipakai untuk:

- merangkum konteks invoice
- menampilkan draft info
- memberi tombol tindak lanjut cepat

Ini tidak bertentangan dengan PRD selama:

- tidak mengganti form write-side resmi
- tidak mem-bypass permission
- hanya menjadi lapisan UX tambahan

## Operational Constraint Saat Ini

### 1. Shell billing sangat berorientasi queue operasional

Status: `Operational Constraint - acceptable`

UI Billing saat ini lebih condong ke antrean operasional daripada daftar master invoice penuh.

Ini masih dapat diterima karena:

- PRD justru menekankan queue collection, suspend, reconnect, dan follow-up
- review master invoice inti tetap tersedia di section domain

### 2. Batch generate recurring memakai suggestion yang tampil

Status: `Operational Constraint - acceptable`

Mode batch saat ini memakai daftar `subscriptionSuggestions` yang tersedia di halaman.

Ini aman untuk fase sekarang, tetapi harus dipahami sebagai:

- alat operasional terbatas
- bukan batch engine skala besar terpisah

Guardrail:

- jangan mengklaim batch ini sebagai pengganti proses massal terjadwal/backoffice
- tetap jaga anti-duplikasi recurring invoice

## Guardrail Lanjutan untuk Billing

### A. Billing tetap bergantung pada customer dan subscription yang sama

- customer harus dibaca dari entitas yang sama dengan domain Customers
- service harus dibaca dari subscription yang sama dengan Sales/Support

### B. Collection action tidak boleh menjadi status liar

- action type harus mengikuti allowlist resmi
- perubahan status invoice harus lewat route/form resmi
- resolve follow-up harus menutup jalur terbuka dengan jelas

### C. Suspend / reconnect harus tetap formal

- suspend tidak boleh dilakukan pada invoice paid/lunas
- reconnect atau re-open tidak boleh dilakukan tanpa state pendahulu yang sah

### D. Prefill harus tetap deterministik

- `invoice` dan `service` tetap menjadi token utama domain Billing
- tambahan UX tidak boleh mengganti token resmi ini

## Keputusan Final

### Sudah selaras core PRD

- shell Billing
- review invoice
- review collection
- review suspend / reconnect / write-off
- form generate invoice
- form status invoice
- form payment entry
- form collection action / resolve follow-up
- contextual prefill `invoice` dan `service`
- capability-based write-side

### Diterima sebagai extension operasional

- panel aksi billing prioritas
- quick action modal billing

### Constraint yang masih bisa diterima

- orientasi shell billing yang sangat queue-first
- batch recurring yang memakai suggestion aktif halaman

### Tidak ada konflik PRD yang terdeteksi

- implementasi Billing saat ini konsisten dengan PRD dan justru cukup matang dari sisi operasional
- modul ini sudah siap dijadikan acuan saat nanti audit detail `HR` atau pengencangan `worklist` lintas domain

