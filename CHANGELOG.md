# Changelog

All notable changes to this project will be documented in this file.

Format mengikuti prinsip `Keep a Changelog`, dan versi mengikuti `Semantic Versioning`.

## [Unreleased]

### Planned

- penguatan query domain dan action backend setelah MySQL review dipakai penuh

### Fixed

- transform tahap 3 tidak lagi memakai `JSON_TABLE` pada parsing `photo_list_text`, sehingga tetap kompatibel dengan MariaDB lokal saat tahap 4 mengeksekusi stage 1-4 berurutan: [xampp_review_transform_stage_3.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_stage_3.sql)
- transform tahap 4 kini bisa resolve `target_subscription_id` dari staging order lintas batch (tidak mengunci `batch_id`), sehingga batch billing terpisah tetap bisa diimport setelah batch user/order selesai: [xampp_review_transform_stage_4.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_stage_4.sql)
- eksekusi transform import kini me-render `@batch_id` langsung ke setiap statement sebelum dikirim ke MariaDB, sehingga transform sample tidak lagi berakhir `SUCCESS` tapi `0 imported` akibat session variable tidak terbaca: [import-write-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/import-write-service.ts)

### Improved

- halaman detail batch import sekarang menampilkan ringkasan operasional per row (`imported`, `valid`, `mapped/pending`, `invalid/skipped`), progres finalisasi batch, dan breakdown tabel target final yang sudah terbentuk agar operator lebih cepat membaca hasil transform: [import-batch-detail-view.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-detail-view.tsx)
- daftar batch import kini menampilkan informasi duplikat secara lebih eksplisit di tabel dan kartu mobile agar review awal operator lebih cepat: [import-batch-table.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-table.tsx)
- transform tahap 2 kini juga mengimpor `staging_legacy_user_records` ke `auth_users` dan langsung menghubungkan `target_user_id`, sehingga row seperti `USR-001` tidak lagi tertinggal dalam status `VALID`: [xampp_review_transform_stage_2.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_transform_stage_2.sql)
- panel aksi batch import kini memberi rekomendasi langkah berikutnya berdasarkan status batch dan row yang masih belum final, sehingga operator tidak perlu menebak apakah harus validasi atau menjalankan tahap 01-04 tertentu: [import-batch-action-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-action-panel.tsx)

## [0.63.81] - 2026-07-09

### Improved

- Support kini memprioritaskan queue TT berdasarkan `follow-up` terdekat atau yang sudah overdue, menampilkan `follow-up state` langsung di panel, dan memberi konteks progress terakhir pada form close agar operator tidak menutup ticket tanpa melihat PIC/follow-up/progress terbaru: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.81`

## [0.63.82] - 2026-07-09

### Improved

- Support kini membawa konteks `SLA Days`, `SLA Due`, dan `SLA State` langsung ke queue TT, prefill form progress, serta form close; ticket yang sudah `OVERDUE` atau paling dekat jatuh tempo juga diprioritaskan lebih dulu agar operator tidak perlu membuka master SLA terpisah saat menentukan aksi: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [support-ticket-progress-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-progress-form.tsx), [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.82`

## [0.63.83] - 2026-07-09

### Improved

- Support kini punya jalur `eskalasi ticket` non-destruktif untuk kasus `SLA overdue` atau prioritas tinggi, lengkap dengan side-car escalation log, append note aman ke ticket, tombol aksi dari queue TT, dan form eskalasi dengan snapshot SLA/progress/eskalasi terakhir agar operator bisa mendorong kasus ke owner berikutnya tanpa keluar dari shell support: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/escalate/route.ts), [support-ticket-escalation-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-ticket-escalation-service.ts), [support-ticket-escalate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-escalate-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.83`

## [0.63.84] - 2026-07-09

### Improved

- Billing collection kini mendukung mode `single` dan `batch` dari queue invoice tindak lanjut yang sedang tampil, sehingga operator bisa mencatat reminder/call/promise-to-pay/suspend massal secara aman tanpa membuka invoice satu per satu: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/route.ts), [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.84`

## [0.63.85] - 2026-07-09

### Improved

- Billing kini punya `Collection Follow Up Queue` berbasis action collection `OPEN` terbaru per invoice, lengkap dengan `remaining`, `follow-up state`, `collection status`, dan `suspend candidate`; context queue ini juga dipakai ulang oleh form collection dan payment untuk prefill aman serta ringkasan tagihan sebelum operator menindak invoice: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [billing-payment-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-payment-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.85`

## [0.63.86] - 2026-07-09

### Improved

- Billing kini punya jalur `resolve collection follow-up` dari queue aktif, sehingga operator bisa menutup action collection `OPEN` terbaru per invoice sebagai `DONE` atau `CANCELLED` dengan catatan formal tanpa harus membuat action baru: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/collection-actions/resolve/route.ts), [billing-collection-resolve-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-resolve-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Payment entry kini otomatis menutup action collection `OPEN` yang terkait invoice tersebut, sehingga lifecycle penagihan lebih rapi setelah pembayaran diterima: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/payments/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.86`

## [0.63.87] - 2026-07-09

### Improved

- Billing status kini mendukung jalur `SUSPENDED` dan `OVERDUE` selain `CANCELLED`, sehingga operator bisa menandai invoice belum lunas sebagai suspend candidate lalu mengaktifkannya kembali ke jalur overdue/reconnect langsung dari web dengan context follow-up yang aman: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/status/route.ts), [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Billing read-side kini menampilkan section `Invoice Suspended` agar antrean reconnect tidak hilang dari layar operator saat invoice sudah masuk jalur suspend: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.87`

## [0.63.88] - 2026-07-09

### Improved

- Billing status kini mendukung mode `batch` untuk jalur `SUSPENDED` dan `OVERDUE`, sehingga operator bisa mengeksekusi suspend massal dari antrean siap suspend dan reconnect massal dari antrean invoice suspended tanpa memproses satu per satu: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/status/route.ts), [billing-invoice-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-status-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)
- Billing read-side kini menampilkan section `Suspend Ready Queue` dan `Reconnect Ready Queue` agar antrean keputusan suspend/reconnect lebih eksplisit dan tidak bercampur dengan follow-up umum: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.88`

## [0.63.89] - 2026-07-09

### Improved

- Billing read-side kini menampilkan section `Promise To Pay Queue` agar invoice dengan janji bayar aktif terpisah jelas dari antrean siap suspend, sehingga operator collection bisa membedakan invoice yang masih layak ditunggu dari invoice yang harus dinaikkan tindakannya: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)
- Form collection action batch kini otomatis memakai antrean yang paling relevan berdasarkan `action type`, termasuk `promise to pay`, `siap suspend`, dan `siap reconnect`, sehingga batch action tidak lagi menembak antrean yang terlalu umum: [billing-collection-action-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-collection-action-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.89`

## [0.63.80] - 2026-07-09

### Improved

- Support kini punya `update progress trouble ticket` non-destruktif dengan side-car progress log untuk PIC, status kerja, follow-up, dan catatan progres terbaru; queue TT dan shell support juga langsung menampilkan snapshot progress terakhir agar operator bisa lanjut dari open ticket tanpa menimpa data inti: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/%5BticketCode%5D/progress/route.ts), [support-ticket-progress-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-ticket-progress-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [support-ticket-progress-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-progress-form.tsx), [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.80`

## [0.63.79] - 2026-07-09

### Improved

- Billing kini mendukung `batch recurring invoice generation` dari daftar `Subscription Billing-Ready`, sehingga operator bisa membuat invoice bulanan massal langsung dari shell web sambil tetap memakai guard existing per subscription untuk menghindari duplikasi periode: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/billing/invoices/generate/route.ts), [billing-invoice-generate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/billing-invoice-generate-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.79`

## [0.63.78] - 2026-07-09

### Improved

- `Import Center` sekarang mengunci upload ulang batch yang sudah punya row staging, sehingga operator tidak lagi bisa menimpa review lama secara destruktif; form upload juga menampilkan guardrail yang mengarahkan operator membuat batch baru untuk file revisi: [import-file-loader.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/import-file-loader.ts), [import-batch-upload-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-upload-form.tsx), [import-batch-detail-view.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/import-batch-detail-view.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.78`

## [0.63.77] - 2026-07-09

### Improved

- HR sekarang punya section `Face Priority Queue` yang menyatukan capture `RETAKE` pending dan employee dengan baseline `DRIFTING/WATCHLIST`, lengkap dengan `priority score` agar operator bisa menindak item paling kritis lebih cepat tanpa analisis manual tambahan: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.77`

## [0.63.76] - 2026-07-09

### Improved

- HR kini punya deteksi drift baseline wajah per employee agar operasional lebih cepat membaca apakah kualitas referensi masih `STABLE`, masuk `WATCHLIST`, atau sudah `DRIFTING`; alert ini dihitung dari gap skor terbaru terhadap rata-rata dan skor terbaik, lalu ditampilkan langsung di section `Face Reference Trends` dan panel trend pada form baseline employee: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.76`

## [0.63.75] - 2026-07-09

### Improved

- baseline wajah HR kini punya history dan scoring trend per employee: setiap perubahan baseline manual maupun reinforce review disimpan ke tabel history side-car, HR shell menampilkan section `Face Reference History` dan `Face Reference Trends`, dan form baseline employee menampilkan ringkasan trend terpilih agar operator tahu kualitas referensi sebelum menimpa baseline aktif: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/face-reference/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.75`

## [0.63.74] - 2026-07-09

### Improved

- feedback loop review wajah HR kini non-destruktif dan lebih operasional: reviewer bisa memperkuat baseline employee secara terkontrol saat hasil `VERIFIED + MATCH`, sementara capture yang berakhir `REJECTED + RETAKE` otomatis masuk ke section `Face Retake Queue` untuk follow-up pengambilan ulang, lengkap dengan audit trail baru: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/review/route.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx), [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.74`

## [0.63.73] - 2026-07-09

### Improved

- review wajah HR kini mendapat matching recommendation berbasis baseline employee aktif, sehingga antrean review bisa melihat `Baseline Reference`, `Baseline Match Score`, `Baseline Match Outcome`, dan alasan `MATCH / REVIEW_MANUAL / RETAKE` sebelum operator menetapkan keputusan akhir: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.73`

## [0.63.72] - 2026-07-09

### Improved

- baseline referensi wajah employee sekarang bisa membaca kandidat otomatis dari capture yang sudah `VERIFIED`: shell HR menampilkan section `Verified Face Candidates`, form baseline wajah melakukan prefill aman saat baseline belum ada, dan operator bisa memakai kandidat terbaru dengan satu klik tanpa mengetik ulang `capture ref`: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.72`

## [0.63.71] - 2026-07-09

### Improved

- HR kini punya baseline referensi wajah per employee secara non-intrusive melalui tabel side-car, route write khusus, audit trail, section review `Employee Face References`, dan form safety UX yang bisa prefill referensi lama saat operator memilih employee aktif, sehingga fondasi matching engine tidak perlu menempel ke tabel `hr_employees` inti: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/face-reference/route.ts), [hr-employee-face-reference-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-face-reference-form.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.71`

## [0.63.70] - 2026-07-09

### Improved

- shell HR kini menampilkan analytics outcome verifikasi wajah yang merangkum backlog `PENDING_REVIEW/VERIFIED/REJECTED`, distribusi confidence placeholder, rata-rata score sample terbaru, serta split adopsi `CAMERA_CAPTURE` vs mode manual agar operator bisa membaca kualitas outcome sebelum masuk ke recognition engine penuh: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.70`

## [0.63.69] - 2026-07-09

### Improved

- konfigurasi face attendance HR kini mendukung kebijakan `auto-verify` yang bisa diatur admin, termasuk sakelar aktivasi dan `minimum score` untuk confidence tinggi, sehingga jalur `Auto-Verify Aman` tidak lagi hardcoded dan bisa mengikuti kebijakan operasional tiap divisi: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/route.ts), [hr-attendance-face-config-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-config-form.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.69`

## [0.63.68] - 2026-07-09

### Improved

- review wajah HR kini punya `confidence band` (`HIGH`, `MEDIUM`, `LOW`) dan indikator `auto-review aman`, sehingga operator bisa melihat apakah capture cukup kuat untuk `Auto-Verify Aman` atau tetap perlu review manual mendalam: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.68`

## [0.63.67] - 2026-07-09

### Improved

- workflow review wajah HR kini dilengkapi scoring placeholder dan rekomendasi keputusan otomatis: shell HR menampilkan `match score`, `recommended decision`, dan alasan rekomendasi, sementara form review bisa langsung memakai saran `VERIFIED`, `PENDING_REVIEW`, atau `REJECTED` sebelum recognition engine otomatis penuh hadir: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.67`

## [0.63.66] - 2026-07-09

### Improved

- face attendance HR kini punya workflow review operasional: setiap capture wajah masuk ke status `PENDING_REVIEW`, tersedia antrean review terbaru di shell HR, operator bisa mengubah hasil menjadi `VERIFIED` atau `REJECTED`, dan audit review wajah ikut masuk ke dashboard terpusat: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/review/route.ts), [hr-attendance-face-review-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-review-form.tsx), [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.66`

## [0.63.65] - 2026-07-09

### Improved

- form attendance HR sekarang sudah punya fondasi capture kamera browser langsung di web: operator bisa membuka kamera, mengambil snapshot wajah, melihat preview capture, dan menghasilkan `faceCaptureRef` otomatis untuk jalur verifikasi `CAMERA_CAPTURE` tanpa mengetik referensi manual: [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.65`

## [0.63.64] - 2026-07-09

### Improved

- fondasi face attendance HR kini hidup secara non-intrusive: ada konfigurasi mode verifikasi wajah terpisah, log referensi face capture/manual review terpisah, form attendance bisa mengirim referensi verifikasi wajah, dan mode wajib/opsional dapat diatur sebelum recognition engine penuh diaktifkan: [hr-attendance-face-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-face-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/face/route.ts), [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx), [hr-attendance-face-config-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-face-config-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.64`

## [0.63.63] - 2026-07-09

### Improved

- fondasi geofence/radius attendance HR kini hidup secara non-intrusive: ada konfigurasi titik kerja + radius terpisah, capture lokasi browser di form attendance, validasi radius opsional/wajib saat check-in, log lokasi attendance terpisah, serta audit `ATTENDANCE_GEOFENCE_CONFIG` untuk perubahan konfigurasi geofence: [hr-attendance-geofence-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-attendance-geofence-service.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/geofence/route.ts), [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx), [hr-attendance-geofence-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-geofence-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.63`

## [0.63.62] - 2026-07-09

### Improved

- flow payroll HR kini benar-benar lebih rapat: form void menampilkan ringkasan slip terpilih (periode, status, income, deduction) sebelum submit, dan backend release menolak slip yang sudah berstatus void agar operator tidak bisa merilis payroll yang sudah dibatalkan secara non-destruktif: [hr-salary-slip-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-void-form.tsx), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/salary-slips/route.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.62`

## [0.63.61] - 2026-07-09

### Improved

- flow release dan void Payroll HR sekarang menampilkan suggestion yang lebih kaya (periode, status, income, deduction), lalu form release memperlihatkan ringkasan slip terpilih sebelum submit agar operator lebih aman saat merilis payroll: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-salary-slip-release-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-release-form.tsx), [hr-salary-slip-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-void-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.61`

## [0.63.60] - 2026-07-09

### Improved

- flow update dan void Loan HR sekarang menampilkan suggestion yang lebih kaya (loan type, amount, installment) serta form update menampilkan status saat ini dan melakukan prefill status tujuan secara aman agar operator tidak salah ubah status: [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-loan-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-loan-status-form.tsx), [hr-loan-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-loan-void-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.60`

## [0.63.59] - 2026-07-09

### Improved

- correction attendance HR kini lebih aman untuk operator karena suggestion review membawa metadata mentah `check in`, `check out`, `overtime`, dan `lock admin`, lalu form otomatis melakukan prefill saat row attendance dipilih sehingga koreksi tidak mudah mengosongkan nilai lama secara tidak sengaja: [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx), [hr-attendance-update-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-update-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.59`

## [0.63.58] - 2026-07-09

### Improved

- HR kini mendukung reaktivasi employee non-destruktif dari status `ARCHIVED` ke status aktif yang dipilih operator, lengkap dengan validasi status aman di backend dan actor trail `EMPLOYEE_REACTIVATE`: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/reactivate/route.ts), [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts)
- halaman HR kini menyediakan form khusus untuk mengaktifkan kembali employee archived langsung dari review suggestion, sehingga siklus archive/reactivate menjadi lengkap tanpa membuat row employee baru: [hr-employee-reactivate-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-reactivate-form.tsx), [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx)

### Changed

- audit dashboard HR kini mengenali action `EMPLOYEE_REACTIVATE`, sehingga timeline `SUPER_ADMIN` menampilkan jejak unarchive/reactivate employee dengan label yang lebih operasional: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.63.58`

## [0.63.57] - 2026-07-09

### Improved

- Employee HR kini mendukung archive non-destruktif lewat route khusus yang mengubah `employment_status` menjadi `ARCHIVED`, sehingga data pegawai bisa ditutup tanpa menghapus histori attendance, loan, payroll, atau relasi lain yang sudah ada: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/archive/route.ts), [hr-employee-archive-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-employee-archive-form.tsx)

### Changed

- audit dashboard HR kini mengenali action `EMPLOYEE_ARCHIVE`, dan halaman HR menyediakan form archive employee terpisah agar tidak tercampur dengan write-action create
- `VERSION` dinaikkan ke `0.63.57`

## [0.63.56] - 2026-07-09

### Improved

- Loan HR kini mendukung cancel/void non-destruktif lewat status `CANCELLED`, sehingga pinjaman bisa dibatalkan tanpa menghapus row `hr_loans`, histori tetap muncul di review HR, dan audit actor tercatat sebagai aksi terpisah: [void route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/loans/void/route.ts), [hr-loan-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-loan-void-form.tsx)

### Changed

- review section HR untuk loan kini menampilkan histori terbaru termasuk status `CANCELLED`, dan dashboard audit HR mengenali action `LOAN_VOID`
- `VERSION` dinaikkan ke `0.63.56`

## [0.63.55] - 2026-07-09

### Improved

- Payroll HR kini mendukung `void` non-destruktif lewat tabel flag `hr_salary_slip_voids`, sehingga slip gaji bisa dibatalkan tanpa menghapus row payroll, status `VOIDED` tampil di review HR, dan audit actor tetap tercatat: [hr-salary-slip-void-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-salary-slip-void-service.ts), [void route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/salary-slips/void/route.ts), [hr-salary-slip-void-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-salary-slip-void-form.tsx)

### Changed

- audit dashboard HR kini mengenali action `SALARY_SLIP_VOID` dan review section HR menampilkan status payroll `VOIDED`
- `VERSION` dinaikkan ke `0.63.55`

## [0.63.54] - 2026-07-09

### Improved

- HR kini mendukung correction attendance langsung dari web dengan audit trail actor untuk perubahan status, jam masuk/keluar, overtime, dan lock admin, sehingga jejak audit HR tidak hanya berhenti di loan update dan payroll release: [attendance route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/attendance/route.ts), [hr-attendance-update-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-update-form.tsx)

### Changed

- label audit HR di dashboard diperluas agar correction attendance tampil lebih natural untuk operator dan admin
- `VERSION` dinaikkan ke `0.63.54`

## [0.63.53] - 2026-07-09

### Improved

- HR kini tidak hanya mencatat create audit, tetapi juga mendukung update status loan dan release slip gaji langsung dari web dengan actor trail yang tercatat ke `hr_audit_logs`, lengkap dengan dua form operasional baru di domain HR: [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [loans route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/loans/route.ts), [salary-slips route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/salary-slips/route.ts)

### Changed

- dashboard HR audit kini menampilkan label action yang lebih operasional untuk create, update loan, dan release payroll
- `VERSION` dinaikkan ke `0.63.53`

## [0.63.52] - 2026-07-09

### Improved

- HR kini memiliki actor trail dasar via tabel `hr_audit_logs` untuk create employee, attendance, loan, dan salary slip, lalu feed audit dashboard `SUPER_ADMIN` ikut membaca jejak ini sehingga coverage audit lintas domain utama makin lengkap: [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts), [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- route write-side HR (`employees`, `attendance`, `loans`, `salary-slips`) kini mencatat snapshot actor setelah insert sukses tanpa mengubah tabel inti `hr_*`, sehingga jalur audit ditambah dengan risiko migrasi yang rendah
- `VERSION` dinaikkan ke `0.63.52`

## [0.63.51] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action sales dari lead, survey, sales order, work order, dan aktivasi subscription yang jejak aktornya sudah tersimpan di kolom notes, sehingga audit terpusat kini mencakup hampir seluruh domain operasional utama: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.51`

## [0.63.50] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action billing dari pembuatan invoice, pembatalan invoice, payment entry, dan collection action, sehingga audit terpusat makin dekat ke operasi penagihan nyata: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.50`

## [0.63.49] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action inventory dari request barang, update status request, barang masuk, pinjaman, dan pengembalian berdasarkan tabel operasional yang sudah ada, sehingga audit terpusat makin dekat ke alur gudang/teknisi nyata: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.49`

## [0.63.48] - 2026-07-09

### Improved

- feed audit dashboard untuk `SUPER_ADMIN` kini juga membaca write-action domain support dari create ticket, close ticket, create isolir, restore isolir, dan dismantle yang jejak aktornya sudah tersimpan di tabel review, sehingga audit terpusat tidak lagi terbatas pada import dan settings: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.48`

## [0.63.47] - 2026-07-09

### Fixed

- formatter waktu activity feed dashboard kini aman menerima nilai tanggal dari review DB yang tidak selalu berbentuk string, sehingga dashboard tidak lagi jatuh ke `Mock Fallback` dengan error `value.includes is not a function`: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)

### Changed

- `VERSION` dinaikkan ke `0.63.47`

## [0.63.46] - 2026-07-09

### Improved

- feed dashboard kini membaca jejak aksi nyata secara terpusat untuk `SUPER_ADMIN` dengan menggabungkan audit Import Center, Settings Users, permission master, dan role-permission, sambil tetap menjaga fallback aman untuk role lain: [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- panel aktivitas dashboard diperjelas sebagai feed audit hidup agar operator admin lebih mudah mengenali konteks jejak aksi terbaru: [activity-feed.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/activity-feed.tsx)
- checklist PRD audit diperbarui agar status implementasi mencerminkan audit terpusat lintas import dan settings yang kini sudah tampil di dashboard: [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md)

### Changed

- `VERSION` dinaikkan ke `0.63.46`

## [0.63.39] - 2026-07-09

### Added

- laporan korelasi duplikasi `inventory_stock_movements` ke staging inventory movement (batch/source/legacy/status) untuk memastikan sumber duplikasi sebelum cleanup: [xampp_review_schema_precheck_inventory_movements_correlate_0_63_39.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_inventory_movements_correlate_0_63_39.sql)

### Changed

- dokumentasi staging import menambahkan referensi laporan korelasi movement↔staging: [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.39`

## [0.63.38] - 2026-07-09

### Added

- laporan precheck khusus duplikasi `inventory_stock_movements` per `reference_no` agar penanganan cleanup bisa lebih aman dan terarah: [xampp_review_schema_precheck_inventory_movements_by_ref_0_63_38.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_inventory_movements_by_ref_0_63_38.sql)

### Changed

- dokumentasi staging import menambahkan catatan investigasi duplikat movement per reference: [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.38`

## [0.63.37] - 2026-07-09

### Added

- script dry-run untuk menampilkan kandidat row yang akan dibersihkan (tanpa mengubah data) sebelum autofix dan patch UNIQUE: [xampp_review_schema_autofix_dry_run_0_63_37.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_autofix_dry_run_0_63_37.sql)
- script autofix guarded (rollback default) untuk memastikan cleanup hanya terjadi jika `@confirm_apply = 1`: [xampp_review_schema_autofix_guarded_0_63_37.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_autofix_guarded_0_63_37.sql)

### Changed

- dokumentasi staging import diperbarui agar alur cleanup bersifat aman (precheck → dry-run → guarded apply → patch UNIQUE): [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.37`

## [0.63.36] - 2026-07-09

### Added

- script precheck detail yang menampilkan daftar `id` untuk setiap grup duplikat, agar cleanup sebelum UNIQUE lebih terarah: [xampp_review_schema_precheck_detail_0_63_36.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_detail_0_63_36.sql)

### Changed

- dokumentasi staging import kini menuliskan urutan patch aman (precheck → autofix → patch UNIQUE): [staging-import.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/staging-import.md)
- `VERSION` dinaikkan ke `0.63.36`

## [0.63.35] - 2026-07-09

### Added

- script autofix terkontrol untuk membersihkan duplikasi paling aman sebelum penerapan UNIQUE business key transform (primary address ganda, duplikasi persis photos/invoice items/payments/collection actions): [xampp_review_schema_autofix_0_63_35.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_autofix_0_63_35.sql)

### Changed

- `VERSION` dinaikkan ke `0.63.35`

## [0.63.34] - 2026-07-09

### Added

- script precheck untuk mendeteksi duplikasi data existing sebelum menerapkan UNIQUE business key transform (menghindari kegagalan ALTER TABLE saat patch diterapkan ke DB yang sudah berisi data): [xampp_review_schema_precheck_0_63_34.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_precheck_0_63_34.sql)

### Changed

- `VERSION` dinaikkan ke `0.63.34`

## [0.63.33] - 2026-07-09

### Changed

- schema review DB ditambah UNIQUE index minimal untuk business key yang dipakai pipeline transform tahap 1-4 agar idempotent terhadap race dan aman saat re-run: [xampp_review_schema.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema.sql), [xampp_review_schema_phase_1_1.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_phase_1_1.sql)
- disediakan patch schema yang bisa dijalankan aman berulang (cek `information_schema`) untuk installasi existing: [xampp_review_schema_patch_0_63_33.sql](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema_patch_0_63_33.sql)
- `VERSION` dinaikkan ke `0.63.33`

## [0.63.32] - 2026-07-09

### Changed

- eksekusi transaksi review DB kini memakai koneksi yang konsisten lewat helper `runReviewDbTransaction` agar transaksi benar-benar atomic: [review-db.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/review-db.ts)
- pipeline transform import tahap 1-4 kini berjalan dalam transaksi + lock batch untuk mencegah state setengah jalan dan double-run paralel: [import-write-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/import-write-service.ts)
- perbaikan pemakaian transaksi pada bulk approval Daily Activity, inventory loans/returns, inventory request status, dan bootstrap permission agar konsisten: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/bulk/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/return/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts), [access-permission-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/access-permission-service.ts)
- `VERSION` dinaikkan ke `0.63.32`

## [0.63.31] - 2026-07-09

### Changed

- form Plan Daily Activity kini auto-fill `planningLevel` dari profile user dan mengunci field org untuk non-superadmin: [daily-activity-plan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-plan-form.tsx)
- endpoint create & approval daily activity kini menegakkan scope org dari profile user (server-side), bukan dari input form: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/route.ts), [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/bulk/route.ts)
- approval queue dashboard kini menghitung scope berdasarkan session/profile (supaya konsisten dengan Daily Activity profile per username): [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts)
- `VERSION` dinaikkan ke `0.63.31`

## [0.63.30] - 2026-07-09

### Added

- bulk approve/reject pada halaman Daily Activity (Approval Manager) menggunakan endpoint bulk: [daily-activity-manager-approval-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-manager-approval-form.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.30`

## [0.63.29] - 2026-07-09

### Added

- endpoint bulk approval daily activity (maks 20 item per batch) untuk mempercepat proses manager/SPV: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/bulk/route.ts)
- bulk approve/reject dari dashboard Approval Queue dengan checkbox: [daily-activity-approval-queue.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/daily-activity-approval-queue.tsx)

### Changed

- `VERSION` dinaikkan ke `0.63.29`

## [0.63.28] - 2026-07-09

### Added

- quick action approve/reject daily activity langsung dari panel Approval Queue dashboard: [daily-activity-approval-queue.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/daily-activity-approval-queue.tsx)

### Changed

- [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts) kini memuat daftar pending approval terbaru (maks 6) untuk diproses langsung dari dashboard
- `VERSION` dinaikkan ke `0.63.28`

## [0.63.27] - 2026-07-09

### Added

- panel `Approval Queue` daily activity di dashboard utama untuk role yang punya izin approve, dengan ringkasan pending approval dan shortcut ke halaman daily activity: [daily-activity-approval-queue.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/daily-activity-approval-queue.tsx)

### Changed

- [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts) kini memuat data pending approval daily activity (per divisi/sub-divisi) untuk dashboard
- [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx) kini menampilkan panel approval queue secara kondisional berdasarkan RBAC `daily_activity:approve`
- `VERSION` dinaikkan ke `0.63.27`

## [0.63.26] - 2026-07-09

### Added

- filter tambahan `Approval Status` (ALL/PENDING/APPROVED/REJECTED/NONE) pada [daily-activity-filter-bar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-filter-bar.tsx) agar manager bisa fokus ke item yang menunggu approval

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) kini menerapkan filter approval status ke kalender/performa/riwayat sesuai pilihan user
- `VERSION` dinaikkan ke `0.63.26`

## [0.63.25] - 2026-07-09

### Added

- filter tampilan Daily Activity (divisi/sub-divisi/level) via query param pada [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) dan UI selector [daily-activity-filter-bar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-filter-bar.tsx)

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) kini menghitung kalender/performa/riwayat berdasarkan filter divisi/sub-divisi/level yang dipilih
- navigasi kalender `prev/next month` kini menjaga filter agar tidak reset saat pindah bulan di [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx)
- `VERSION` dinaikkan ke `0.63.25`

## [0.63.24] - 2026-07-09

### Added

- navigasi kalender plan `prev/next month` lewat query `?month=YYYY-MM` pada [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) dan [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx)

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) kini menghitung rekap bulanan dan kalender berdasarkan bulan yang dipilih, serta memperluas window pembacaan data menjadi 370 hari
- `VERSION` dinaikkan ke `0.63.24`

## [0.63.23] - 2026-07-09

### Added

- permission resource `daily_activity` pada [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) dan baseline permission matrix di [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts) untuk mendukung aksi `approve` dan `export`
- endpoint approval manager [approval/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/approval/route.ts) untuk approve/reject closing sore per divisi/sub-divisi
- endpoint export CSV [export/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/export/route.ts) untuk rekap daily activity berdasarkan rentang tanggal
- komponen [daily-activity-manager-approval-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-manager-approval-form.tsx) dan [daily-activity-export-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-export-form.tsx) pada halaman daily activity

### Changed

- [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) menambah kolom `approval_status/approved_by/approved_at` dan performa dihitung dari aktivitas yang sudah `APPROVED`
- [status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/status/route.ts) kini mengubah closing menjadi `PENDING` approval dan mengizinkan resubmit bila sebelumnya `REJECTED`
- [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) kini mengikuti RBAC `daily_activity` untuk create/update/approve/export
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk mencatat approval manager dan export CSV daily activity sebagai capability aktif
- `VERSION` dinaikkan ke `0.63.23`

## [0.63.22] - 2026-07-09

### Added

- helper baru [daily-activity-org.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/daily-activity-org.ts) untuk baseline divisi, sub-divisi, dan level plan `Manager`, `SPV`, `Leader` pada daily activity
- perhitungan performa otomatis harian, mingguan, dan bulanan di [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts) beserta breakdown divisi/sub-divisi dan level plan
- kalender plan bulanan di [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx) untuk memantau sebaran aktivitas per tanggal

### Changed

- [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/route.ts) sekarang mewajibkan pengisian level plan, divisi, dan sub-divisi sesuai baseline organisasi sebelum plan disimpan
- [daily-activity-plan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-plan-form.tsx) kini mendukung input plan per divisi/sub-divisi dan level `Manager`, `SPV`, `Leader`
- [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx) dan [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx) kini menampilkan performa otomatis lintas periode dan kalender plan
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar daily activity tingkat divisi/sub-divisi beserta performa periode dan kalender plan tercatat sebagai capability aktif
- `VERSION` dinaikkan ke `0.63.22`

## [0.63.21] - 2026-07-09

### Added

- menu baru [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts) untuk `Daily Activity` di path `/dashboard/daily-activity` agar user punya jalur khusus plan pagi dan closing sore
- halaman [page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/daily-activity/page.tsx), service [daily-activity-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/daily-activity-service.ts), dan endpoint [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/route.ts) serta [status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/daily-activities/status/route.ts) untuk workflow daily activity berbasis review DB
- komponen [daily-activity-plan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-plan-form.tsx), [daily-activity-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-close-form.tsx), dan [daily-activity-summary-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/daily-activity-summary-panel.tsx) untuk input plan pagi, closing sore, dan transparansi progres harian

### Changed

- [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx) dan [navigation.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/navigation.ts) kini memakai active item paling spesifik agar menu `Daily Activity` tidak bentrok dengan `Dashboard`
- [mock-dashboard.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/mock-dashboard.ts) kini menampilkan shortcut `Daily Activity` di dashboard module cards
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk mencatat menu daily activity sebagai capability web yang sudah hidup
- `VERSION` dinaikkan ke `0.63.21`

## [0.63.20] - 2026-07-09

### Added

- endpoint baru [receipts/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/receipts/route.ts) untuk jalur `barang masuk` yang langsung menambah stok tanpa operator memilih tipe movement manual
- form [inventory-stock-receipt-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-stock-receipt-form.tsx) untuk pencatatan penerimaan barang yang lebih mudah dipakai gudang
- panel [inventory-stock-receipt-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-stock-receipt-panel.tsx) untuk merangkum transaksi barang masuk terbaru

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menampilkan panel dan form khusus barang masuk selain form stock movement umum
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar alur inbound gudang yang lebih mudah tercatat sebagai capability inventory aktif
- `VERSION` dinaikkan ke `0.63.20`

## [0.63.19] - 2026-07-09

### Added

- service baru [inventory-loan-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/inventory-loan-service.ts) untuk bootstrap tabel pinjaman inventory dan generate kode pinjaman otomatis
- endpoint [loans/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/route.ts) dan [loans/return/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/loans/return/route.ts) untuk alur barang dipinjam lalu dikembalikan
- komponen [inventory-item-loan-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-item-loan-form.tsx), [inventory-loan-return-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-loan-return-form.tsx), dan [inventory-loan-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-loan-ops-panel.tsx) untuk flow pinjam-kembali di domain Inventory

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) kini memuat section `Pinjaman Inventory` dengan status `BORROWED`, `PARTIAL_RETURN`, `RETURNED`, dan indikator `OVERDUE`
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menampilkan panel operasional pinjaman inventory serta form pinjam dan pengembalian barang
- alur pinjam otomatis membuat movement `OUT` dan mengurangi stok, sedangkan alur pengembalian membuat movement `IN` dan menambah stok kembali
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar flow barang pinjam-kembali tercatat sebagai capability inventory aktif
- `VERSION` dinaikkan ke `0.63.19`

## [0.63.18] - 2026-07-09

### Added

- panel baru [inventory-request-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-ops-panel.tsx) untuk merangkum antrean request inventory per sub-divisi teknisi dan per status proses

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menampilkan panel operasional request inventory dan memperkaya suggestion form proses status dengan konteks sub-divisi dan status
- [inventory-request-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-status-form.tsx) diperjelas agar petugas inventory langsung melihat konteks sub-divisi teknisi saat memproses request
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk mencatat antrean request inventory per sub-divisi/status sebagai capability aktif
- `VERSION` dinaikkan ke `0.63.18`

## [0.63.17] - 2026-07-09

### Added

- helper baru [inventory-request-org.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/inventory-request-org.ts) untuk mengunci divisi `Teknisi` dan pilihan sub-divisi request inventory (`Teknisi PSB`, `Teknisi Jalur dan Expan`, `Teknisi Jointer`)

### Changed

- [inventory-request-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/inventory-request-service.ts) kini memastikan tabel `inventory_item_requests` memiliki kolom `requested_division` dan `requested_subdivision`
- [requests/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/route.ts) sekarang mewajibkan sub-divisi teknisi saat membuat request barang
- [inventory-item-request-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-item-request-form.tsx) kini menampilkan input divisi/sub-divisi teknisi agar request inventory lebih presisi sejak awal
- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) menampilkan metadata divisi dan sub-divisi pada section `Request Inventory Teknisi`
- [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md) dan [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar tagging sub-divisi teknisi tercatat sebagai capability inventory aktif
- `VERSION` dinaikkan ke `0.63.17`

## [0.63.16] - 2026-07-09

### Added

- dokumen baru [org-division-baseline.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/org-division-baseline.md) untuk mengunci struktur divisi dan sub-divisi organisasi sebagai baseline pengembangan ERP

### Changed

- [role-meta.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/role-meta.ts) sekarang menyimpan metadata divisi dan sub-divisi untuk seluruh role aktif ERP
- [topbar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/topbar.tsx), [sidebar.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/layout/sidebar.tsx), dan [dashboard/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx) kini menampilkan konteks divisi/sub-divisi role aktif agar perspektif organisasi lebih jelas di UI
- [web-psb-target-role-design.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-role-design.md) dan [web-psb-target-permission-matrix.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-psb-target-permission-matrix.md) diperbarui agar mapping role ERP selalu mengacu pada baseline divisi terbaru
- `VERSION` dinaikkan ke `0.63.16`

## [0.63.15] - 2026-07-09

### Changed

- [requests/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/route.ts) sekarang mengizinkan `FIELD_TECHNICIAN` membuat request barang meskipun role tersebut tidak memiliki `create` umum pada domain Inventory
- [requests/status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts) membatasi proses status request agar tidak bisa dijalankan oleh `FIELD_TECHNICIAN`, sehingga penyelesaian stok tetap dikendalikan tim inventory/operasional
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menampilkan screen Inventory yang lebih sesuai role: teknisi fokus ke form request barang, sedangkan form admin inventory tidak lagi ditampilkan untuk teknisi
- `VERSION` dinaikkan ke `0.63.15`

## [0.63.14] - 2026-07-09

### Added

- helper baru [inventory-request-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/inventory-request-service.ts) untuk bootstrap tabel request inventory teknisi dan generate kode request otomatis
- endpoint [requests/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/route.ts) dan [requests/status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts) untuk alur request barang harian teknisi dengan status `Request`, `On Progress`, `Pending`, dan `Selesai`
- komponen [inventory-item-request-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-item-request-form.tsx) dan [inventory-request-status-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-request-status-form.tsx) untuk mensimulasikan pola marketplace internal di domain Inventory

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) kini memuat section baru `Request Inventory Teknisi` agar request teknisi terbaca langsung di read-side inventory
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menampilkan form request barang teknisi dan form update status request di domain Inventory
- penyelesaian request inventory otomatis mencatat stock movement `OUT` dan mengurangi stok item secara transaksional di [requests/status/route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/requests/status/route.ts)
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui untuk memasukkan workflow request barang teknisi sebagai capability inventory yang sudah mulai hidup
- `VERSION` dinaikkan ke `0.63.14`

## [0.63.13] - 2026-07-09

### Added

- helper baru [map-links.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/map-links.ts) untuk membangun tautan Google Maps dari koordinat atau teks lokasi secara konsisten
- panel baru [inventory-network-ops-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-network-ops-panel.tsx) untuk merangkum ODP, port aktif/bermasalah, device assignment, dan indikasi accessories di domain Inventory

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) kini membawa metadata koordinat ODP dan kategori item assignment agar konteks maps dan accessories bisa dipakai di read-side inventory
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menampilkan panel operasional inventory sebelum form write action
- [inventory-odp-create-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-odp-create-form.tsx) kini menampilkan preview maps dan penegasan parity ODP/port/accessories dari legacy
- [hr-attendance-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/hr-attendance-form.tsx) sekarang menampilkan roadmap resmi untuk face recognition, radius attendance, dan geofence titik kerja
- [prd-web-checklist.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/prd-web-checklist.md) diperbarui agar gap Inventory dan HR secara eksplisit mencakup maps ODP, accessories detail, face recognition attendance, dan radius attendance
- `VERSION` dinaikkan ke `0.63.13`

## [0.63.12] - 2026-07-09

### Added

- helper baru [support-action-links.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-action-links.ts) untuk menghasilkan anchor dan query link aksi support yang konsisten lintas lane
- panel [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx) dan [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx) sekarang memiliki tombol aksi per row agar operator bisa langsung menindak item yang sedang direview

### Changed

- [support/[lane]/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx) dan [[domain]/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) meneruskan `searchParams` prefill ke `DomainShell` sehingga flow aksi tetap kompatibel dengan versi Next yang dipakai repo ini
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini menyalurkan `supportPrefill` ke form close ticket, restore isolir, dismantle, dan SLA
- [support-ticket-close-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-ticket-close-form.tsx), [support-isolation-restore-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-restore-form.tsx), [support-dismantle-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-form.tsx), dan [support-sla-form.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-form.tsx) sekarang mendukung nilai awal dari query prefill agar operator tidak perlu mengetik ulang item yang sudah dipilih di lane panel
- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) menambahkan tipe `SupportFormPrefill` untuk menjaga kontrak prefill form support tetap rapi
- `VERSION` dinaikkan ke `0.63.12`

## [0.63.11] - 2026-07-09

### Added

- komponen baru [support-action-quick-links.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-action-quick-links.tsx) untuk menyediakan shortcut aksi ringan dari lane support ke form yang relevan tanpa menambah fetch data baru

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini memberi anchor stabil pada form support lane sehingga panel `/support/{lane}` dapat melompat langsung ke aksi utama yang diprioritaskan
- [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx), [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx), [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx), dan [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx) sekarang menampilkan quick action link sesuai lane aktif agar operator lebih cepat masuk ke form kerja
- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) menambahkan tipe `SupportActionLink` untuk menjaga kontrak shortcut action tetap konsisten lintas panel support
- `VERSION` dinaikkan ke `0.63.11`

## [0.63.6] - 2026-07-09

### Changed

- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) mengoptimalkan query support review DB sehingga `/support/{lane}` hanya mengambil section yang relevan untuk lane tersebut
- `VERSION` dinaikkan ke `0.63.6`

## [0.63.7] - 2026-07-09

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) merapikan layout halaman `/support/{lane}` dengan header lane-specific dan menyembunyikan aksi pendukung agar fokus kerja lebih dedicated
- `VERSION` dinaikkan ke `0.63.7`

## [0.63.8] - 2026-07-09

### Added

- panel operasional [support-tt-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-tt-queue-panel.tsx) untuk menampilkan queue Trouble Ticket di halaman `/support/tt` dengan ringkasan status dan detail meta yang lebih actionable

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) menampilkan panel TT khusus saat membuka lane `tt`
- `VERSION` dinaikkan ke `0.63.8`

## [0.63.9] - 2026-07-09

### Added

- panel operasional [support-isolation-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-isolation-queue-panel.tsx) untuk menampilkan queue Isolir di halaman `/support/isolations` dengan ringkasan status, marketing, dan meta isolir yang lebih siap diproses

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) menampilkan panel isolir khusus saat membuka lane `isolations`
- `VERSION` dinaikkan ke `0.63.9`

## [0.63.10] - 2026-07-09

### Added

- panel operasional [support-dismantle-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-dismantle-queue-panel.tsx) untuk menampilkan histori dismantle dan meta penutupan layanan di halaman `/support/dismantle`
- panel operasional [support-sla-queue-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-sla-queue-panel.tsx) untuk menampilkan aturan SLA trouble ticket di halaman `/support/sla`

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) menampilkan panel operasional yang spesifik untuk lane `dismantle` dan `sla`
- `VERSION` dinaikkan ke `0.63.10`

## [0.63.5] - 2026-07-08

### Added

- route dedicated [support/[lane]/page.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/support/[lane]/page.tsx) untuk screen kerja lane support seperti `/support/tt`, `/support/isolations`, `/support/dismantle`, dan `/support/sla`
- panel ringkasan lane [support-lane-detail-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-lane-detail-panel.tsx) untuk menampilkan highlight operasional (item/section/status dominan) di halaman dedicated lane support

### Changed

- [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) kini menyediakan helper `getSupportLanePath()` agar semua tautan lane support memakai path dedicated yang konsisten
- [support-role-queue-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-role-queue-board.tsx) sekarang mengarahkan kartu lane ke halaman dedicated, bukan query string fokus
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) mengganti chip navigasi lane ke path dedicated agar operator bisa berpindah antar workspace support lewat subpage yang stabil
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi helper path lane dan akses subroute `/support/tt`
- `VERSION` dinaikkan ke `0.63.5`

### Notes

- versi `0.63.5` memindahkan lane support dari sekadar mode fokus di halaman tunggal menjadi screen kerja dedicated yang lebih siap dipakai sebagai fondasi navigasi operasional

## [0.63.4] - 2026-07-08

### Added

- panel baru [support-lane-workspace-panel.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-lane-workspace-panel.tsx) untuk menampilkan checklist, area review, dan catatan eskalasi lane support aktif

### Changed

- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) kini menambahkan `SupportLaneWorkspace`, `SupportLaneActionKey`, `activeLane`, dan `activeWorkspace` agar lane support punya struktur workspace yang lebih operasional
- [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) diperluas dengan builder workspace per lane sehingga `TT`, `isolir`, `dismantle`, dan `SLA` punya checklist dan peta aksi yang konsisten
- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) sekarang menghitung `activeLane` dan `activeWorkspace` di payload `supportFocus`
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini memprioritaskan form berdasarkan `actionKeys` workspace lane aktif, termasuk default role ketika user belum memilih lane manual
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi `activeLane` dan `activeWorkspace`
- `VERSION` dinaikkan ke `0.63.4`

### Notes

- versi `0.63.4` mendorong parity support dari kontrak data ke pengalaman kerja yang lebih operasional, karena lane aktif sekarang punya checklist dan peta aksi yang siap dipakai tim support

## [0.63.3] - 2026-07-08

### Added

- payload `DomainPageData` sekarang mendukung `supportFocus` agar konteks lane support bisa dipakai ulang oleh page server, API, dan wrapper berikutnya

### Changed

- [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts) menambahkan tipe `SupportLaneKey`, `SupportLaneSnapshot`, dan `DomainSupportFocus` sebagai kontrak lane support lintas layer
- [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) diperluas dengan builder snapshot lane agar service dan UI memakai metadata lane yang sama
- [domain-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/domain-service.ts) sekarang menerima opsi `supportLane` dan menghasilkan `supportFocus` untuk domain `support`
- [domain API route](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/domains/[domain]/route.ts) membaca query `lane` lalu meneruskannya ke service, sehingga mode fokus support tersedia juga di payload API
- [domain page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) dan [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini membaca `supportFocus` dari service sebagai sumber tunggal lane aktif dan section yang terlihat
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi default lane, selected lane, dan visible sections pada payload support
- `VERSION` dinaikkan ke `0.63.3`

### Notes

- versi `0.63.3` mendorong parity support dari fokus UI ke kontrak data/service, sehingga lane `TT`, `isolir`, `dismantle`, dan `SLA` lebih siap dipakai ulang pada API dan mobile wrapper

## [0.63.2] - 2026-07-08

### Added

- helper [support-lanes.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/support-lanes.ts) untuk menormalkan query `lane`, metadata lane support, dan pemetaan section review per jalur kerja

### Changed

- [support-role-queue-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-role-queue-board.tsx) sekarang menjadikan setiap kartu lane sebagai entry point ke mode fokus `support?lane=...`, lengkap dengan penanda lane default per role dan lane aktif
- [domain page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) membaca query `lane` untuk domain `support` lalu meneruskannya ke shell halaman
- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) kini memprioritaskan form dan review section berdasarkan lane support aktif agar flow `TT`, `isolir`, `dismantle`, dan `SLA` tidak lagi tampil campur aduk
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperluas untuk memverifikasi helper lane support baru
- `VERSION` dinaikkan ke `0.63.2`

### Notes

- versi `0.63.2` mendorong parity support dari sekadar micro queue visual menjadi mode kerja yang bisa difokuskan per lane tanpa mengganggu shell domain support yang sudah ada

## [0.63.1] - 2026-07-08

### Added

- panel `Micro Queue Support` di [support-role-queue-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/support-role-queue-board.tsx) untuk memecah jalur kerja support menjadi lane `TT`, `isolir`, `dismantle`, dan `SLA`

### Changed

- [domain-shell.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/domain-shell.tsx) sekarang menerima role aktif dan menampilkan queue mikro khusus saat membuka domain `Support`
- [domain page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/[domain]/page.tsx) meneruskan role session ke shell agar UI support bisa diurutkan sesuai role login
- `VERSION` dinaikkan ke `0.63.1`

### Notes

- versi `0.63.1` mendorong parity support dari level dashboard umum ke level domain kerja, khususnya untuk `NOC`, `TT`, `CS`, `FIELD_TECHNICIAN`, dan `DISMANTLE`

## [0.63.0] - 2026-07-08

### Added

- panel queue per role pada dashboard melalui [role-queue-grid.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/role-queue-grid.tsx) agar setiap role baru langsung melihat prioritas kerja utamanya
- panel list kerja terpadu melalui [worklist-board.tsx](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/dashboard/worklist-board.tsx) sebagai baseline pengalaman `list` lintas domain
- metadata item queue dan worklist baru di [types.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/types.ts)

### Changed

- [dashboard-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/dashboard-service.ts) sekarang menghasilkan `roleQueues` dan `worklist` berdasarkan role aktif, memakai review DB bila tersedia atau fallback mock bila belum ada data
- [mock-dashboard.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/mock-dashboard.ts) diperluas dengan template queue dan baseline worklist per role target
- [dashboard page](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/(app)/dashboard/page.tsx) kini menampilkan perspektif role aktif, queue prioritas, dan list kerja terpadu
- [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperbarui untuk memverifikasi data dashboard role-aware

### Notes

- versi `0.63.0` menandai pergeseran dashboard dari shell generik ke shell yang mulai role-aware, terutama untuk parity `CS`, `MARKETING`, `NOC`, `TEKNISI`, dan `DISMANTLE`

## [0.62.9] - 2026-07-08

### Changed

- fondasi role ERP di `apps/web` diperluas dari 3 role bootstrap menjadi 9 role target: `SUPER_ADMIN`, `SALES_MARKETING`, `CS_OPERATOR`, `CS_ADMIN`, `NOC_OPERATOR`, `FIELD_TECHNICIAN`, `TT_OPERATOR`, `DIGITAL_CREATOR`, dan `DISMANTLE_OPERATOR`
- baseline route prefix dan permission matrix di [access-control.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/access-control.ts) disesuaikan ke role baru agar guard akses dan capability domain mengikuti desain parity terbaru
- mapping auth di [auth-session.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/auth-session.ts) kini mengenali role legacy dan memetakkannya ke role ERP target baru
- layanan user dan bootstrap permission di [auth-user-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/auth-user-service.ts) serta [access-permission-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/access-permission-service.ts) diperbarui agar label, seed role, dan baseline permission konsisten dengan model role baru
- smoke test di [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) diperbarui untuk memverifikasi fondasi role baru

### Notes

- versi `0.62.9` adalah baseline implementasi kode pertama untuk parity role ERP, sehingga langkah berikutnya bisa fokus ke queue per role, list kerja terpadu, dan flow mikro per modul

## [0.62.8] - 2026-07-08

### Added

- dokumen `docs/web-psb-target-permission-matrix.md` untuk menerjemahkan role ERP target ke permission matrix yang lebih implementatif
- dokumen `docs/web-psb-module-gap-plan.md` untuk memetakan gap implementasi per modul setelah role dan permission matrix target dikunci

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar dokumen permission matrix target dan gap modul masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.8`

### Notes

- versi `0.62.8` menandai perpindahan dari desain role dan flow parity ke baseline akses yang lebih siap diimplementasikan, sekaligus menetapkan prioritas modul yang harus dibenahi lebih dulu

## [0.62.7] - 2026-07-08

### Added

- dokumen `docs/web-psb-target-role-design.md` untuk mendefinisikan role ERP target yang memetakan sembilan role operasional `web-psb-perkasa` ke struktur role ERP baru
- dokumen `docs/web-psb-flow-checklist.md` untuk menilai flow parity per role dengan status go/no-go sebelum cutover

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar artefak desain role target dan checklist flow parity masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.7`

### Notes

- versi `0.62.7` menandai pergeseran dari parity konseptual ke parity operasional yang bisa diuji per role setelah login review DB lokal berhasil digunakan

## [0.62.6] - 2026-07-08

### Added

- dokumen `docs/web-psb-role-action-parity.md` untuk memetakan parity detail per role, menu, dan aksi antara `web-psb-perkasa` dan ERP baru

### Changed

- `docs/xampp-setup.md` kini menegaskan bahwa XAMPP dipakai untuk MySQL review DB, sedangkan web `Next.js` dijalankan lewat `apps/web` dengan `npm run dev`
- `docs/README.md` dan `README.md` root diperbarui agar dokumen parity detail masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.6`

### Notes

- versi `0.62.6` menambahkan baseline parity operasional yang lebih detail dan memperjelas quick start lokal untuk menjalankan web ERP dengan MySQL XAMPP

## [0.62.5] - 2026-07-08

### Added

- dokumen `docs/web-psb-parity-matrix.md` sebagai baseline matriks parity role, menu, aksi, flow, dan logic antara `web-psb-perkasa` dan `perkasa-erp-oss-bss`

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar dokumen matriks parity masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.5` untuk menandai bahwa kesiapan cutover kini diukur dengan parity operasional, bukan hanya migrasi data

### Notes

- versi `0.62.5` menegaskan bahwa gap terbesar saat ini ada pada role parity, menu parity, action parity, flow parity, dan logic parity; ERP baru belum boleh menggantikan `web-psb-perkasa` sebelum gap tersebut ditutup

## [0.62.4] - 2026-07-08

### Changed

- `docs/web-psb-integration-week-1.md` kini menambahkan syarat parity sebelum cutover penuh: role parity, logic parity, flow parity, checklist parity wajib, dan definisi sukses migrasi dari `web-psb-perkasa` ke ERP baru
- `VERSION` dinaikkan ke `0.62.4` untuk mengunci requirement bahwa ERP baru harus mampu menjalankan seluruh role, logika, dan alur penting dari web lama sebelum pindah penuh

### Notes

- versi `0.62.4` memastikan arah migrasi tidak sekadar memindahkan data; ERP baru harus benar-benar bisa dipakai oleh seluruh role operasional dengan perilaku yang setara atau lebih baik dari `web-psb-perkasa`

## [0.62.3] - 2026-07-08

### Changed

- `docs/web-psb-integration-week-1.md` kini menegaskan target end-state bahwa web utama nantinya dikonsolidasikan ke `perkasa-erp-oss-bss`, sekaligus menambahkan kriteria cutover dan syarat kapan `web-psb-perkasa` baru boleh dipensiunkan
- `VERSION` dinaikkan ke `0.62.3` untuk mengunci keputusan transisi end-state secara formal

### Notes

- versi `0.62.3` memperjelas bahwa `web-psb-perkasa` tidak ditinggalkan sekarang; aplikasi itu tetap aktif sampai domain inti lolos mapping, staging, rekonsiliasi, kesiapan UI, hak akses, rollback, dan masa paralel operasional

## [0.62.2] - 2026-07-08

### Changed

- `docs/web-psb-integration-week-1.md` kini menegaskan keputusan arsitektur bahwa `web-psb-perkasa` menjadi baseline bisnis-operasional, sedangkan `perkasa-erp-oss-bss` menjadi baseline integrasi target
- `VERSION` dinaikkan ke `0.62.2` untuk mengunci keputusan baseline secara formal di artefak project

### Notes

- versi `0.62.2` menghilangkan ambiguitas arah integrasi: web lama tetap menjadi acuan proses harian, sementara ERP berkembang bertahap melalui mapping, staging, audit, dan transform per domain

## [0.62.1] - 2026-07-08

### Added

- dokumen `docs/web-psb-field-matrix-week-1.md` sebagai matriks field-by-field untuk `Ticket`, `Isolation`, `TroubleTicket`, dan `ODP`

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar dokumen matriks field minggu pertama masuk ke indeks resmi project
- `VERSION` dinaikkan ke `0.62.1` untuk menandai sinkronisasi dokumen operasional setelah baseline playbook `0.62.0`

### Notes

- versi `0.62.1` memperinci playbook integrasi minggu pertama ke level field, rule transform, dan rule review manual agar tim bisa langsung menyiapkan staging, validasi, dan rekonsiliasi tanpa menyentuh sistem lama

## [0.62.0] - 2026-07-08

### Added

- dokumen `docs/web-psb-integration-week-1.md` sebagai playbook integrasi 1 minggu yang memetakan modul `web-psb-perkasa` ke domain ERP dengan pola non-intrusive

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar playbook integrasi 1 minggu masuk ke indeks dokumentasi resmi project
- `VERSION` dinaikkan ke `0.62.0` sebagai baseline formal untuk paket integrasi minggu pertama

### Notes

- versi `0.62.0` mengunci pendekatan integrasi yang aman: `web-psb-perkasa` tetap menjadi sistem operasional utama, sedangkan ERP bergerak melalui read-only, staging, dan transform batch
- fokus minggu pertama dibatasi pada domain risiko rendah seperti `ODP`, `Isolation`, dan `Trouble Ticket summary`, serta menahan auth, billing live, dan write-back ke sistem lama

## [0.61.0] - 2026-07-07

### Added

- cache RBAC server kini ikut disegarkan setiap kali role-permissions diubah agar menu, guard halaman, dan guard API bisa segera mengikuti permission master dinamis

### Changed

- `apps/web/lib/access-control.ts` kini bersifat hybrid: tetap aman untuk client components, namun akan memakai snapshot permission DB bila tersedia di runtime server
- `apps/web/lib/services/access-permission-service.ts` memanggil invalidasi cache RBAC server setelah bootstrap/upsert/assign permission

## [0.60.0] - 2026-07-07

### Added

- filter interaktif pada detail batch import (status, domain, dan pencarian cepat) untuk mempercepat review row bermasalah sesuai PRD

## [0.59.0] - 2026-07-07

### Changed

- pipeline transform import tahap 1-4 sekarang ter-scope per batch dengan variabel `@batch_id` (mencegah transform lintas batch saat tombol transform dipicu dari web)
- `apps/web/lib/services/import-write-service.ts` sekarang mengeset `@batch_id` sebelum eksekusi SQL stage

### Added

- histori eksekusi transform per batch melalui tabel `staging_import_batch_transform_runs` (RUNNING/SUCCESS/FAILED, durasi, jumlah statement) dan ditampilkan pada detail batch import

## [0.58.1] - 2026-07-07

### Fixed

- merapikan struktur layout Next.js App Router dengan route group:
  - `(auth)` untuk `/login` tanpa `AppShell`
  - `(app)` untuk halaman aplikasi (dashboard/import/domain/settings) dengan `AppShell`
- menghapus `ShellBoundary` berbasis `usePathname()` yang berpotensi memicu hydration mismatch saat SSR/hydration

## [0.58.0] - 2026-07-07

### Added

- komponen `apps/web/components/billing-invoice-status-form.tsx` dan route `POST /api/billing/invoices/status` untuk membatalkan invoice unpaid langsung dari domain `billing`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan write action billing untuk pembatalan invoice selain generate invoice, collection action, dan payment entry
- `apps/web/lib/services/domain-service.ts` menambah review section billing: `Invoice Dibatalkan Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone pembatalan invoice tercermin pada fallback mock, test, dan dokumentasi

### Notes

- versi `0.58.0` melengkapi lifecycle billing dengan pembatalan invoice yang aman tanpa penghapusan data
- pembatalan invoice tetap defensif: hanya role dengan izin update yang boleh menjalankan aksi, invoice yang sudah memiliki pembayaran ditolak untuk dibatalkan, dan status cancel otomatis menutup collection serta menonaktifkan suspend candidate

## [0.57.0] - 2026-07-07

### Added

- komponen `apps/web/components/billing-invoice-generate-form.tsx` dan route `POST /api/billing/invoices/generate` untuk membuat invoice dari subscription `ACTIVE` langsung dari domain `billing`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan tiga write action billing: generate invoice, collection action, dan payment entry
- `apps/web/lib/services/domain-service.ts` menambah review section billing: `Subscription Billing-Ready` dan `Invoice Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone generate invoice tercermin pada fallback mock, test, dan dokumentasi

### Notes

- versi `0.57.0` melengkapi fondasi invoice lifecycle billing: subscription aktif tanpa invoice recurring bulan berjalan sekarang bisa langsung digenerate dari web
- flow generate invoice tetap defensif: hanya untuk subscription `ACTIVE`, menolak duplikasi recurring per periode, membuat `invoice_no` otomatis, dan selalu menambah `billing_invoice_items` tipe `SUBSCRIPTION`

## [0.56.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-device-return-form.tsx` dan route `POST /api/inventory/device-assignments/status` untuk menyelesaikan assignment perangkat (RETURNED/DAMAGED/LOST) dengan pemulihan stok otomatis saat RETURNED
- komponen `apps/web/components/inventory-odp-port-status-form.tsx` dan route `POST /api/inventory/odp-ports/status` untuk mengubah status port (AVAILABLE/RESERVED/FAULTY/DISABLED) dan opsi mengosongkan mapping subscription/customer

### Changed

- `apps/web/components/domain-shell.tsx` menambah write action inventory untuk update status port ODP dan return perangkat
- `apps/web/lib/services/domain-service.ts` menambah review section inventory: `Port Bermasalah` dan `Device Return Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar flow return perangkat dan status port tercermin pada fallback mock, test, dan dokumentasi

### Notes

- versi `0.56.0` melengkapi loop inventory jaringan: port ODP bisa di-reserve/faulty/disable, dan perangkat bisa direturn untuk memulihkan stok
- return perangkat bersifat defensif: hanya assignment dengan status ASSIGNED yang boleh ditutup, dan stok hanya bertambah saat status RETURNED

## [0.55.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-odp-create-form.tsx` dan route `POST /api/inventory/odps` untuk membuat master ODP beserta generate port otomatis
- komponen `apps/web/components/inventory-odp-port-assign-form.tsx` dan route `POST /api/inventory/odp-ports/assign` untuk assign port ODP ke subscription/customer
- komponen `apps/web/components/inventory-device-assignment-form.tsx` dan route `POST /api/inventory/device-assignments` untuk menautkan perangkat inventory ke subscription/work order/customer dan mencatat stok keluar

### Changed

- `apps/web/components/domain-shell.tsx` menambah write action inventory untuk ODP, assign port, dan device assignment
- `apps/web/lib/services/domain-service.ts` menambah review section inventory: `ODP Terbaru`, `Port Terpakai`, dan `Device Assignment Terbaru`
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui untuk mencerminkan flow ODP dan assignment inventory

### Notes

- versi `0.55.0` menutup gap inventory: dari item master + stock movement menjadi siap untuk pemetaan jaringan (ODP/port) dan assignment perangkat ke layanan
- flow baru tetap defensif: ODP code unik, port hanya bisa dipakai bila status AVAILABLE/RESERVED, movement stok keluar ditolak bila stok tidak cukup

## [0.54.0] - 2026-07-07

### Added

- komponen `apps/web/components/hr-salary-slip-form.tsx` dan route `POST /api/hr/salary-slips` untuk membuat slip gaji bulanan employee langsung dari domain `hr`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan empat write action pada domain `hr`: employee, attendance, loan, dan salary slip
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section baru `Slip Gaji Terbaru` dari review DB untuk menutup loop payroll awal
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone payroll awal tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.54.0` melengkapi fondasi HR agar employee yang sudah memiliki attendance dan loan bisa langsung dibuatkan slip gaji dari web
- payroll tetap defensif: slip gaji menolak duplikasi employee per bulan/tahun, `loan_deduction` bisa otomatis mengambil cicilan loan aktif, dan `net_salary` tidak boleh negatif

## [0.53.0] - 2026-07-07

### Added

- komponen `apps/web/components/hr-attendance-form.tsx` dan route `POST /api/hr/attendance` untuk mencatat attendance harian employee langsung dari domain `hr`
- komponen `apps/web/components/hr-loan-create-form.tsx` dan route `POST /api/hr/loans` untuk mencatat loan atau kasbon employee langsung dari domain `hr`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan tiga write action pada domain `hr`: employee master, attendance, dan loan
- suggestion employee untuk form attendance dan loan diambil dari review section employee yang aktif pada halaman HR
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone attendance dan loan awal tercermin pada dokumentasi

### Notes

- versi `0.53.0` melengkapi fondasi HR agar employee yang sudah dibuat bisa langsung memiliki attendance dan loan dari web
- flow baru tetap defensif: attendance menolak duplikasi employee pada tanggal yang sama, validasi check-in/check-out dijaga, dan loan hanya bisa dibuat untuk employee yang valid dengan nominal yang masuk akal

## [0.52.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-stock-movement-form.tsx` dan route `POST /api/inventory/stock-movements` untuk mencatat histori pergerakan stok dari item inventory yang sudah ada
- komponen `apps/web/components/hr-employee-create-form.tsx` dan route `POST /api/hr/employees` untuk membuat employee master awal pada domain `hr`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua write action pada domain `inventory` dan satu write action awal pada domain `hr`
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section HR (`Employee Terbaru`, `Attendance Hari Ini`, `Loan Aktif`) dan memperkaya inventory dengan movement terbaru yang berasal dari review DB
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone inventory movement dan HR awal tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.52.0` membuka fondasi write action awal untuk domain HR dan melengkapi inventory agar item master bisa langsung mempunyai histori movement
- flow baru tetap defensif: movement OUT menolak stok minus, employee code dibuat otomatis, dan cabang/divisi HR hanya ditautkan jika kode master valid

## [0.51.0] - 2026-07-07

### Added

- komponen `apps/web/components/inventory-item-create-form.tsx` untuk membuat item master inventory langsung dari halaman domain `inventory`
- route `POST /api/inventory/items` di `apps/web/app/api/inventory/items/route.ts` untuk menyimpan item baru ke tabel `inventory_items` dengan `item_code` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan write action awal pada domain `inventory` untuk menambah item master langsung dari web
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section `Item Inventory Terbaru` dan `Stock Movement Terbaru` dari review DB
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone inventory awal tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.51.0` membuka write action pertama pada domain inventory agar item master dan review movement tidak lagi hanya berupa shell summary
- item inventory saat ini tetap defensif: kategori dan satuan wajib ada di master review DB, `item_code` dibuat otomatis, dan angka stok divalidasi sebelum insert

## [0.50.0] - 2026-07-07

### Added

- komponen `apps/web/components/sales-subscription-activate-form.tsx` untuk mengaktifkan subscription langsung dari sales order pada halaman domain `sales`
- route `POST /api/sales/subscriptions` di `apps/web/app/api/sales/subscriptions/route.ts` untuk membuat `service_subscriptions`, melengkapi customer master bila belum ada, dan menautkan hasil aktivasi ke order/work order

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan enam write action pada domain `sales`: create lead, create coverage, create survey, create sales order, create work order, dan aktivasi subscription
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section baru `Subscription Aktivasi Terbaru` dari review DB untuk menutup loop sales ke layanan aktif
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone aktivasi subscription tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.50.0` menutup gap awal aktivasi subscription sehingga alur sales kini sudah bisa bergerak dari lead sampai layanan aktif
- aktivasi saat ini tetap defensif: order sumber wajib valid, paket wajib aktif, `service_no` dibuat otomatis, customer master dibentuk otomatis bila belum ada, dan work order instalasi terakhir ikut diselesaikan bila tersedia

## [0.49.0] - 2026-07-07

### Added

- komponen `apps/web/components/sales-coverage-create-form.tsx` untuk membuat coverage area awal dari lead langsung pada halaman domain `sales`
- route `POST /api/sales/covered-areas` di `apps/web/app/api/sales/covered-areas/route.ts` untuk menyimpan coverage area ke tabel `sales_covered_areas` dengan `area_code` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan lima write action pada domain `sales`: create lead, create coverage, create survey, create sales order, dan create work order
- `apps/web/lib/services/domain-service.ts` sekarang memuat review section baru `Coverage Terbaru` dari review DB untuk memperlihatkan kesiapan area layanan
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone coverage flow tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.49.0` menutup gap awal coverage flow sehingga validasi area layanan bisa dicatat sebelum survey dan order dilanjutkan
- coverage saat ini tetap defensif: sumber wajib dari lead valid, `area_code` dibuat otomatis, dan lead sumber diselaraskan ke `QUALIFIED` atau `COVERAGE_CHECK` sesuai status coverage

## [0.48.0] - 2026-07-07

### Added

- komponen `apps/web/components/sales-survey-create-form.tsx` untuk membuat survey awal langsung dari lead pada halaman domain `sales`
- route `POST /api/sales/surveys` di `apps/web/app/api/sales/surveys/route.ts` untuk menyimpan survey ke tabel `sales_surveys` dengan `survey_no` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan empat write action pada domain `sales`: create lead, create survey, create sales order, dan create work order
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone sales survey flow tercermin pada dokumentasi implementasi web

### Notes

- versi `0.48.0` menutup gap awal write action survey sehingga proses coverage dan feasibility bisa mulai dicatat tanpa menunggu workflow sales lengkap
- survey saat ini tetap defensif: sumber wajib dari lead valid, `survey_no` dibuat otomatis, dan lead sumber didorong ke status `SURVEY_REQUEST` setelah survey dibuat

## [0.47.0] - 2026-07-06

### Added

- komponen `apps/web/components/sales-work-order-create-form.tsx` untuk membuat work order delivery dari sales order aktif langsung dari halaman domain `sales`
- route `POST /api/sales/work-orders` di `apps/web/app/api/sales/work-orders/route.ts` untuk menyimpan work order ke tabel `service_work_orders` dengan `work_order_no` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan tiga write action pada domain `sales`: create lead, create sales order, dan create work order
- `apps/web/lib/services/domain-service.ts` sekarang menambahkan `Order ID` pada review queue order dan memuat review section baru `Work Order Aktif` dari review DB
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone work order flow tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.47.0` menutup gap awal transisi order ke delivery lapangan tanpa menunggu aktivasi subscription penuh
- work order saat ini tetap defensif: sumber wajib dari sales order valid, nomor work order dibuat otomatis, dan order sumber didorong ke status `READY_INSTALL` atau `ON_PROCESS` sesuai status awal work order

## [0.46.0] - 2026-07-06

### Added

- komponen `apps/web/components/sales-order-create-form.tsx` untuk membuat sales order baru dari lead yang sudah ada langsung dari halaman domain `sales`
- route `POST /api/sales/orders` di `apps/web/app/api/sales/orders/route.ts` untuk menyimpan order ke tabel `sales_orders` dengan `order_no` otomatis

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua write action pada domain `sales`: create lead dan create sales order
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone sales order flow tercermin pada dokumentasi implementasi web

### Notes

- versi `0.46.0` menutup gap awal transisi lead ke order tanpa menunggu integrasi work order penuh
- sales order saat ini tetap defensif: sumber wajib berasal dari lead yang valid, `order_no` dibuat otomatis, dan jadwal instalasi masih opsional

## [0.45.0] - 2026-07-06

### Added

- komponen `apps/web/components/billing-payment-form.tsx` untuk menambah pembayaran invoice langsung dari halaman domain `billing`
- route `POST /api/billing/payments` di `apps/web/app/api/billing/payments/route.ts` untuk menyimpan payment entry ke `billing_payments`

### Changed

- `apps/web/lib/services/domain-service.ts` sekarang memuat daftar pembayaran terbaru dari review DB sebagai review section baru pada domain `billing`
- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua write action pada domain `billing`: collection action dan payment entry
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone payment billing tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.45.0` menutup gap awal lifecycle invoice dengan menambahkan payment entry yang menyelaraskan `paid_amount` dan `invoice_status`
- payment entry bersifat defensif: overpayment ditolak, invoice `PAID` tidak bisa dibayar ulang, dan invoice lunas otomatis menutup `collection_status` serta membersihkan `suspend_candidate`

## [0.44.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-dismantle-form.tsx` untuk memindahkan pelanggan dari isolir aktif ke histori dismantle langsung dari halaman domain `support`
- route `POST /api/support/isolations/[id]/dismantle` di `apps/web/app/api/support/isolations/[id]/dismantle/route.ts` untuk menyimpan snapshot ke `support_dismantle_history` dan mengarsipkan sumber isolir

### Changed

- `apps/web/lib/services/domain-service.ts` sekarang memuat histori dismantle terbaru dari review DB sebagai review section baru pada domain `support`
- `apps/web/components/domain-shell.tsx` sekarang menampilkan flow dismantle di samping create/close ticket, SLA, isolir aktif, dan restorasi isolir
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone dismantle support tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.44.0` melengkapi loop awal domain `support` dengan histori dismantle yang aman dan terpisah dari data aktif
- flow ini mengikuti prinsip arsip: data dengan histori dismantle dipindahkan ke `support_dismantle_history` dan sumber isolir ditandai `is_archived = 1`

## [0.43.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-isolation-restore-form.tsx` untuk menutup isolir aktif langsung dari halaman domain `support`
- route `POST /api/support/isolations/[id]/restore` di `apps/web/app/api/support/isolations/[id]/restore/route.ts` untuk menyimpan restorasi isolir ke tabel `support_isolations`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan write action restorasi isolir di samping create ticket, close ticket, kelola SLA, dan tambah isolir aktif
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone restorasi isolir tercermin pada dokumentasi implementasi web

### Notes

- versi `0.43.0` menutup loop dasar workflow isolir: web sekarang bisa menambah isolir aktif dan menutupnya kembali melalui restorasi
- cakupan support tetap parsial karena dismantle flow web dan automasi SLA penuh masih belum tersedia

## [0.42.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-isolation-form.tsx` untuk menambah pelanggan isolir aktif langsung dari halaman domain `support`
- route `POST /api/support/isolations` di `apps/web/app/api/support/isolations/route.ts` untuk menyimpan data isolir aktif ke tabel `support_isolations`

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan empat write action awal pada domain `support`: create ticket, close ticket, kelola SLA, dan tambah isolir aktif
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone isolir support tercermin pada dokumentasi implementasi web

### Notes

- versi `0.42.0` memperluas domain `support` ke write action isolir dasar yang menjadi jembatan menuju workflow suspend, restorasi, dan dismantle
- cakupan support masih parsial karena close/open TT, SLA, dan isolir sudah hidup, tetapi restorasi isolir dan dismantle flow web masih belum tersedia

## [0.41.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-sla-form.tsx` untuk membuat atau memperbarui SLA trouble ticket langsung dari halaman domain `support`
- route `POST /api/support/trouble-ticket-sla` di `apps/web/app/api/support/trouble-ticket-sla/route.ts` untuk menyimpan SLA ke tabel `support_trouble_ticket_sla`

### Changed

- `apps/web/lib/services/domain-service.ts` sekarang memuat daftar SLA aktif dari review DB dan menampilkannya sebagai review section baru pada domain `support`
- `apps/web/components/domain-shell.tsx` sekarang menampilkan form SLA support untuk role yang memiliki izin approve
- `apps/web/lib/mock-domains.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone SLA support tercermin pada fallback mock, pengujian, dan dokumentasi

### Notes

- versi `0.41.0` memperluas domain `support` dari open/close trouble ticket ke kontrol SLA dasar per tipe ticket
- cakupan support masih parsial karena isolir action dan dismantle flow web masih belum dihidupkan

## [0.40.0] - 2026-07-06

### Added

- komponen `apps/web/components/support-ticket-close-form.tsx` untuk menutup trouble ticket open langsung dari halaman domain `support`
- route `POST /api/support/trouble-tickets/[ticketCode]/close` di `apps/web/app/api/support/trouble-tickets/[ticketCode]/close/route.ts` untuk menyimpan hasil close ke review DB

### Changed

- `apps/web/components/domain-shell.tsx` sekarang menampilkan dua form write action pada domain `support`: create ticket dan close ticket
- `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar milestone close flow support tercermin pada dokumentasi implementasi web

### Notes

- versi `0.40.0` menutup gap penting pada domain `support`: web review sekarang tidak hanya bisa membuat trouble ticket open, tetapi juga menutup ticket yang masih aktif langsung ke `support_trouble_tickets`
- cakupan support masih bersifat parsial karena SLA penuh, isolir action, dan dismantle flow belum dihidupkan dari web

## [0.39.0] - 2026-07-06

### Added

- service `apps/web/lib/services/auth-user-audit-service.ts` untuk ensure table, mencatat, dan membaca audit log perubahan user internal
- komponen `apps/web/components/auth-user-audit-list.tsx` untuk menampilkan jejak create, update, dan reset password di halaman `settings/users`
- tabel `auth_user_audit_logs` pada `database/xampp_review_schema.sql` sebagai fondasi audit formal user internal

### Changed

- `apps/web/app/api/settings/users/route.ts` sekarang mencatat audit saat user internal baru dibuat
- `apps/web/app/api/settings/users/[id]/route.ts` sekarang mencatat audit update profil dan reset password tanpa memblokir aksi utama
- `apps/web/app/settings/users/page.tsx`, `apps/web/lib/services/auth-user-service.ts`, `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone audit user internal tercermin di UI, fallback mock, pengujian, dan tracker PRD

### Notes

- versi `0.39.0` menutup gap audit dasar pada modul `settings/users`, sehingga create, edit, change status, dan reset password kini punya jejak formal di web review
- audit tetap dirancang defensif: kegagalan pencatatan log tidak membatalkan aksi utama create/update/reset password

## [0.38.0] - 2026-07-06

### Added

- komponen `apps/web/components/auth-user-management-table.tsx` untuk mengelola user internal langsung dari halaman `settings/users`
- endpoint `PATCH /api/settings/users/[id]` di `apps/web/app/api/settings/users/[id]/route.ts` untuk update profil inti user dan reset password review

### Changed

- `apps/web/lib/services/auth-user-service.ts` diperluas agar list user membawa `roleId`, `roleCode`, `divisionId`, dan `branchId` sebagai basis form edit
- `apps/web/app/settings/users/page.tsx` sekarang menampilkan table manage user, bukan hanya direktori read-only
- `apps/web/README.md`, `docs/prd-web-checklist.md`, dan `VERSION` diperbarui untuk mencerminkan milestone manajemen user internal yang lebih lengkap

### Notes

- versi `0.38.0` menutup gap utama pada `settings/users`: user review sekarang bisa dibuat, diedit, dinonaktifkan/diaktifkan kembali, dan password-nya direset dari web
- username sengaja tetap dikunci pada tahap ini agar identitas login tidak berubah sembarangan saat fondasi auth internal masih distabilkan

## [0.37.0] - 2026-07-06

### Added

- tabel `staging_import_batch_actions` pada `database/xampp_review_staging_import.sql` untuk menyimpan histori aksi batch import secara terstruktur
- timeline histori aksi pada detail batch import melalui `apps/web/components/import-batch-detail-view.tsx`

### Changed

- `apps/web/lib/services/import-write-service.ts` sekarang menangani ensure table histori, pencatatan aksi, dan pembacaan action log per batch
- `apps/web/app/api/import/batches/route.ts`, `apps/web/app/api/import/batches/[id]/route.ts`, serta flow validasi/transform sekarang mencatat event `CREATE`, `UPLOAD`, `VALIDATE`, dan `TRANSFORM`
- `apps/web/lib/services/import-service.ts` dan `apps/web/lib/mock-import.ts` diperluas agar detail batch membawa histori aksi
- `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone histori aksi batch tercatat

### Notes

- versi `0.37.0` menutup gap histori aksi Import Center sehingga jejak create, upload, validasi, dan transform bisa direview langsung dari web
- pencatatan histori dirancang tidak memblokir aksi utama, jadi create/upload/validasi/transform tetap berjalan meskipun tabel histori belum bisa dibuat di database review

## [0.36.0] - 2026-07-06

### Added

- service `apps/web/lib/services/import-file-loader.ts` untuk mem-parse file upload dan memuat row ke tabel `staging_*` sesuai scope batch
- dokumentasi `docs/import-file-format.md` yang menjelaskan format JSON/XLSX/XLS/CSV yang didukung oleh Import Center web
- dependency `xlsx` pada `apps/web/package.json` untuk membaca workbook upload dari browser

### Changed

- `POST /api/import/batches/[id]` di `apps/web/app/api/import/batches/[id]/route.ts` sekarang tidak hanya menyimpan file lokal, tetapi juga otomatis mengisi row staging dan memperbarui total row batch
- `apps/web/components/import-batch-upload-form.tsx` dan `apps/web/README.md` diperbarui agar menjelaskan batasan format file yang aman untuk parser otomatis
- `docs/README.md`, `README.md`, dan `docs/prd-web-checklist.md` diperbarui agar status parser upload ke staging tercatat

### Notes

- versi `0.36.0` menutup gap terbesar pada Import Center web: file upload sekarang bisa langsung menjadi row staging yang siap divalidasi dan ditransform dari web
- parser saat ini paling kuat untuk `JSON` terstruktur dan workbook `XLSX/XLS` multi-sheet per scope, sedangkan `CSV` disarankan hanya untuk scope satu section

## [0.35.0] - 2026-07-06

### Added

- service `apps/web/lib/services/import-write-service.ts` untuk validasi row staging, rekap batch, dan eksekusi baseline SQL transform tahap 1-4
- endpoint `POST /api/import/batches/[id]/validate` untuk memvalidasi row staging batch dari web
- endpoint `POST /api/import/batches/[id]/transform` untuk menjalankan transform tahap 1-4 dari web
- komponen `apps/web/components/import-batch-action-panel.tsx` untuk tombol validasi dan transform pada detail batch

### Changed

- `apps/web/app/import/[batchId]/page.tsx` dan `apps/web/components/import-batch-detail-view.tsx` diperluas agar detail batch sekarang memuat area approval, validasi, dan trigger transform
- `apps/web/tests/mock-data.test.ts`, `apps/web/README.md`, dan `docs/prd-web-checklist.md` diperbarui agar milestone approve/transform pada Import Center tercatat

### Notes

- versi `0.35.0` membuat Import Center jauh lebih utuh di web: alur create batch, upload file, validasi batch, lalu trigger transform tahap 1-4 sekarang sudah tersedia dari satu halaman detail batch
- transform saat ini menjalankan baseline SQL review yang ada di folder `database/`, sehingga eksekusi masih mengikuti model review global dan belum memiliki histori eksekusi terstruktur per batch

## [0.34.0] - 2026-07-06

### Added

- form `apps/web/components/import-batch-upload-form.tsx` untuk upload file sumber pada detail batch import
- dukungan `POST /api/import/batches/[id]` di `apps/web/app/api/import/batches/[id]/route.ts` untuk menerima file `xlsx`, `xls`, `csv`, atau `json`

### Changed

- `apps/web/lib/types.ts`, `apps/web/lib/services/import-service.ts`, dan `apps/web/lib/mock-import.ts` diperluas agar batch membawa metadata `sourceFileName`
- `apps/web/components/import-batch-detail-view.tsx` dan `apps/web/components/import-batch-table.tsx` sekarang menampilkan file sumber batch
- `.gitignore`, `apps/web/README.md`, `docs/prd-web-checklist.md`, dan `apps/web/tests/mock-data.test.ts` diperbarui untuk mencerminkan milestone upload file import

### Notes

- versi `0.34.0` menambahkan langkah kedua pada write-side Import Center: file sumber bisa diunggah ke storage lokal project dan metadata batch otomatis diperbarui ke status `UPLOADED`
- langkah berikutnya yang paling logis adalah validasi batch dan trigger transform tahap 1-4 dari web

## [0.33.0] - 2026-07-06

### Added

- form `apps/web/components/import-batch-create-form.tsx` untuk membuat batch review baru dari Import Center
- dukungan `POST /api/import/batches` di `apps/web/app/api/import/batches/route.ts` untuk menambah row baru ke `staging_import_batches`

### Changed

- halaman `apps/web/app/import/page.tsx` sekarang menampilkan write action awal Import Center untuk role yang memiliki izin create
- smoke test `apps/web/tests/mock-data.test.ts` diperluas agar memverifikasi izin create pada `import_center`
- dokumentasi `apps/web/README.md` dan `docs/prd-web-checklist.md` diperbarui agar status Import Center mencerminkan create batch dari web

### Notes

- versi `0.33.0` menandai write-side pertama pada Import Center, dimulai dari pembuatan batch review tanpa menyentuh transform
- langkah berikutnya yang paling logis adalah upload file sumber, validasi batch, lalu trigger transform tahap 1-4 dari web

## [0.32.0] - 2026-07-06

### Added

- dokumen `docs/prd-web-checklist.md` sebagai tracker status implementasi web terhadap requirement PRD aplikasi web utama

### Changed

- `docs/README.md` dan `README.md` root diperbarui agar checklist PRD web masuk ke indeks dokumen resmi project

### Notes

- versi `0.32.0` menambahkan artefak kendali implementasi agar gap antara PRD dan web bisa dipantau lebih objektif per iterasi
- checklist ini dirancang sebagai acuan fase berikutnya, terutama untuk import pipeline, inventory, HR, dan CRUD user internal lanjutan

## [0.31.0] - 2026-07-06

### Added

- form `apps/web/components/auth-user-create-form.tsx` untuk menambah user internal baru dari halaman `settings/users`
- route `POST /api/settings/users` di `apps/web/app/api/settings/users/route.ts` untuk menyimpan user baru ke `auth_users`
- lookup role, divisi, dan cabang pada service `apps/web/lib/services/auth-user-service.ts` agar create user memakai referensi master review DB

### Changed

- halaman `apps/web/app/settings/users/page.tsx` sekarang tidak lagi read-only; halaman ini sudah bisa dipakai untuk review sekaligus create user internal
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi lookup option user internal tetap tersedia
- dokumentasi `apps/web/README.md` diperbarui agar status auth internal mencakup write action awal user management

### Notes

- versi `0.31.0` menandai langkah awal CRUD user internal, dimulai dari create user langsung ke `auth_users`
- langkah berikutnya yang paling logis adalah edit user, reset password, dan deactivate/reactivate akun

## [0.30.0] - 2026-07-06

### Added

- halaman `apps/web/app/settings/users/page.tsx` untuk menampilkan direktori user auth internal di area settings
- service layer `apps/web/lib/services/auth-user-service.ts` untuk membaca `auth_users` dari review DB dengan fallback ke akun bootstrap mock
- navigasi `User Internal` khusus `SUPER_ADMIN` agar fondasi manajemen user mulai terlihat di shell aplikasi

### Changed

- matrix akses dan whitelist route diperluas agar `SUPER_ADMIN` dapat membuka `/settings/users`
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi akses route dan data directory user internal
- root project sekarang memiliki `.gitignore` dan repository lokal sudah diinisialisasi dengan `git init` agar siap dipublikasikan ke GitHub

### Notes

- versi `0.30.0` menandai bahwa auth internal tidak lagi hanya hidup di login resolver, tetapi mulai punya permukaan review di UI
- pembuatan repo GitHub private sudah dicoba, tetapi masih terblokir karena sesi browser GitHub belum login

## [0.29.0] - 2026-07-06

### Added

- file `database/xampp_review_auth_seed.sql` untuk menyiapkan akun review minimum di `auth_users`
- dokumen `docs/auth-review-seed.md` yang menjelaskan urutan eksekusi seed auth internal dan kredensial awal review
- role `OPERATOR` ke `database/xampp_review_core_master_seed.sql` agar role aplikasi web punya representasi langsung di review DB

### Changed

- smoke test `apps/web/tests/mock-data.test.ts` diperbaiki agar type-safe terhadap union result dari hybrid auth
- dokumentasi root, docs index, core seed, dan `apps/web/README.md` diperbarui agar langkah auth internal sekarang mencakup seed user review

### Notes

- versi `0.29.0` menandai transisi auth internal dari sekadar fallback-aware menjadi siap diuji end-to-end di MySQL review
- langkah berikutnya yang paling logis adalah menjalankan seed ini di XAMPP review lalu menambahkan manajemen user internal berbasis CRUD

## [0.28.0] - 2026-07-06

### Added

- mode auth hybrid yang memprioritaskan `auth_users/auth_roles` dari review DB saat tersedia
- fallback aman ke akun bootstrap mock bila review DB auth belum siap atau user review belum tersedia
- dukungan verifikasi password langsung dan `sha256` sederhana untuk fase transisi mapping user lama ke `auth_users.password_hash`

### Changed

- route login sekarang tidak lagi hard-coded ke mock, tetapi memakai resolver auth terpadu
- halaman login diperbarui agar menjelaskan status auth hybrid dan memisahkan istilah akun bootstrap mock dari auth internal
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi fallback auth tetap bekerja saat review DB belum aktif

### Notes

- versi `0.28.0` menandai awal transisi dari auth mock ke auth internal tanpa memutus akses development lokal
- langkah berikutnya yang disarankan adalah menyiapkan seed `auth_users` review DB atau layar manajemen user internal agar hybrid auth bisa dipakai penuh

## [0.27.0] - 2026-07-06

### Added

- route `POST /api/customers` untuk menambah customer master baru ke `crm_customers`
- penyimpanan alamat utama sekaligus ke `crm_customer_addresses` saat customer review dibuat
- form inline write action pada domain `customers` untuk input nama customer, tipe, identitas, kontak, alamat utama, dan maps URL

### Changed

- domain `customers` sekarang tidak lagi read-only; modul ini sudah memiliki write action awal untuk membuat customer review
- dokumentasi `apps/web/README.md` diperbarui agar status domain `customers` mencakup write action awal
- write-side ERP baru kini mencakup empat domain prioritas: `billing`, `sales`, `support`, dan `customers`

### Notes

- versi `0.27.0` melengkapi gelombang awal write-side pada empat domain prioritas tanpa mengubah flow import/transform yang sudah ada
- langkah berikutnya paling logis adalah memulai transisi auth internal atau memperdalam write action lanjutan per domain

## [0.26.0] - 2026-07-06

### Added

- route `POST /api/support/trouble-tickets` untuk menambah trouble ticket open baru ke `support_trouble_tickets`
- form inline write action pada domain `support` untuk input nama customer, customer user, kategori, tipe ticket, status awal, problem category, dan catatan
- generator `ticket_code` review dengan prefix kategori (`TT` / `PV`) dan urutan bulanan sederhana untuk menjaga keunikan ticket baru

### Changed

- domain `support` sekarang tidak lagi read-only; modul ini sudah memiliki write action awal untuk membuat trouble ticket review
- dokumentasi `apps/web/README.md` diperbarui agar status domain `support` mencakup write action awal
- write-side ERP baru kini mencakup tiga domain operasional awal: `billing`, `sales`, dan `support`

### Notes

- versi `0.26.0` memperluas write-side dari billing dan sales ke support tanpa menyentuh logika close ticket maupun histori dismantle
- langkah berikutnya paling logis adalah write action awal di `customers` atau mulai transisi dari auth mock ke auth internal

## [0.25.0] - 2026-07-06

### Added

- route `POST /api/sales/leads` untuk menambah lead baru langsung ke tabel `sales_leads` pada review DB
- form inline write action pada domain `sales` untuk input nama prospek, tipe lead, status awal, source, PIC marketing, alamat, dan catatan
- integrasi suggestion marketing pada halaman `sales` dari review queue yang sedang tampil agar input manual lebih konsisten

### Changed

- domain `sales` sekarang tidak lagi read-only; modul ini sudah memiliki write action awal untuk membuat lead review
- dokumentasi `apps/web/README.md` diperbarui agar status domain `sales` mencakup write action awal
- pola write action lintas domain kini dimulai dari `billing` dan `sales` sebagai fondasi form operasional berikutnya

### Notes

- versi `0.25.0` memperluas write-side ERP baru dari billing ke sales tanpa mengubah alur transform/import yang sudah ada
- langkah berikutnya paling logis adalah write action review di `support` atau `customers`, atau mulai mengganti auth mock ke auth internal

## [0.24.0] - 2026-07-06

### Added

- route `POST /api/billing/collection-actions` untuk menambah histori collection action langsung ke review DB
- form inline write action pada domain `billing` untuk input `invoice_no`, `action_type`, `action_status`, `follow up`, dan catatan
- helper `runReviewDbExecute()` pada adapter MySQL review agar service/route bisa menjalankan statement write dengan pool yang sama

### Changed

- domain `billing` sekarang tidak lagi read-only; modul ini sudah memiliki write action backend pertama yang aman untuk workflow review
- penyimpanan collection action ikut menyelaraskan `collection_status` invoice dan flag `suspend_candidate` ketika tipe aksi menuntutnya
- dokumentasi `apps/web/README.md` diperbarui agar status billing mencakup write action awal

### Notes

- versi `0.24.0` menjadi tonggak write action backend pertama di project ERP baru tanpa menyentuh data inti secara destruktif
- pola ini sengaja dipilih dari domain `billing` karena paling aman untuk memulai write-side sebelum form operasional besar lain dibuat

## [0.23.0] - 2026-07-06

### Added

- query review DB untuk daftar `lead terbaru` dari `sales_leads`
- query review DB untuk daftar `survey dan order berjalan` dari `sales_surveys` dan `sales_orders`
- fallback mock review operasional pada domain `sales` agar funnel akuisisi tetap dapat direview saat `review-db` belum siap

### Changed

- shell domain `sales` sekarang tidak hanya menampilkan KPI funnel, tetapi juga daftar lead dan alur delivery awal yang sedang bergerak
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi review section domain `sales`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup domain `sales`

### Notes

- versi `0.23.0` menyelesaikan gelombang awal review section untuk empat domain prioritas: `sales`, `support`, `customers`, dan `billing`
- sesudah ini fokus paling logis adalah domain `inventory`/`hr` atau mulai membuat write action backend pertama

## [0.22.0] - 2026-07-06

### Added

- query review DB untuk daftar `invoice perlu tindak lanjut` dari `billing_invoices` yang ditautkan ke customer subscription
- query review DB untuk daftar `collection action terbaru` dari `billing_collection_actions`
- fallback mock review operasional pada domain `billing` agar alur collection tetap bisa direview saat `review-db` belum siap

### Changed

- shell domain `billing` sekarang tidak berhenti di KPI overdue/partial, tetapi mulai menampilkan queue operasional invoice dan collection action
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi review section domain `billing`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup domain `billing`

### Notes

- versi `0.22.0` menyelesaikan gelombang awal review section untuk tiga domain prioritas: `support`, `customers`, dan `billing`
- langkah berikutnya paling logis adalah membawa domain `sales` ke pola yang sama atau mulai membuat write action backend pertama

## [0.21.0] - 2026-07-06

### Added

- query review DB untuk daftar `customer terbaru` dari `crm_customers` dan alamat utama `crm_customer_addresses`
- query review DB untuk daftar `subscription aktif` dari `service_subscriptions` yang ditautkan ke customer dan paket
- fallback mock review operasional pada domain `customers` agar lifecycle customer tetap dapat direview saat mode `review-db` belum siap

### Changed

- shell domain `customers` sekarang tidak hanya menampilkan KPI, tetapi juga review data operasional customer dan layanan aktif
- smoke test `apps/web/tests/mock-data.test.ts` diperluas untuk memverifikasi review section domain `customers`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup domain `customers`

### Notes

- versi `0.21.0` memperluas pola review section dari domain `support` ke domain `customers`
- fondasi ini memudahkan iterasi berikutnya untuk membawa domain `billing` atau `sales` ke pola review data yang sama

## [0.20.0] - 2026-07-06

### Added

- review section reusable pada shell domain untuk menampilkan daftar operasional ringkas di bawah kartu summary
- query review DB untuk daftar `TT open` dan `isolir aktif` terbaru pada domain `support`
- sampel review operasional mock pada domain `support` agar fallback tetap informatif saat koneksi review DB belum siap

### Changed

- halaman domain `support` tidak lagi berhenti di KPI; sekarang mulai menampilkan daftar kerja operasional yang lebih dekat ke alur harian support
- smoke test `apps/web/tests/mock-data.test.ts` diperluas agar memverifikasi keberadaan review section pada domain `support`
- dokumentasi `apps/web/README.md` diperbarui agar status integrasi review DB mencakup daftar operasional support

### Notes

- versi `0.20.0` menandai transisi shell domain dari summary-only menuju review data operasional nyata
- pola review section ini sengaja dibuat reusable agar domain lain seperti `sales`, `customers`, atau `billing` bisa mengikuti pendekatan yang sama pada iterasi berikutnya

## [0.19.0] - 2026-07-06

### Added

- adapter `apps/web/lib/review-db.ts` untuk koneksi MySQL review berbasis `DATABASE_URL`
- dependency `mysql2` dan env `REVIEW_DB_CONNECT_TIMEOUT_MS`
- query review DB untuk `dashboard`, `import center`, detail batch, dan summary shell domain

### Changed

- `dashboard-service`, `import-service`, dan `domain-service` sekarang mencoba membaca MySQL review saat `APP_DATA_MODE=review-db`
- service layer akan fallback ke mock dengan status sumber data eksplisit jika koneksi atau query review DB gagal
- tipe status import dan batch detail diperluas agar cocok dengan nilai staging riil seperti `DRAFT`, `FAILED`, `PENDING`, `INVALID`, dan `SKIPPED`
- smoke test diubah untuk memverifikasi jalur fallback `review-db` tanpa mensyaratkan MySQL aktif di sandbox

### Notes

- versi `0.19.0` menandai bahwa web baru sudah mulai membaca database review nyata, walaupun masih memakai fallback mock saat koneksi belum tersedia
- tahap berikutnya adalah memperdalam query domain, form operasional, dan write action ke backend review yang sama

## [0.18.0] - 2026-07-06

### Added

- service layer `apps/web/lib/services/domain-service.ts` untuk shell domain `sales`, `customers`, `support`, `inventory`, `hr`, dan `billing`
- route handler `GET /api/domains/[domain]` dengan guard session dan role access
- capability badge per domain untuk menampilkan aksi aktif hasil permission matrix pada UI

### Changed

- halaman `app/[domain]/page.tsx` tidak lagi membaca `mock-domains` secara langsung; sekarang memakai service layer domain
- komponen `apps/web/components/domain-shell.tsx` sekarang menampilkan status sumber data dan capability aktif per role
- kontrak tipe domain diperjelas melalui `DomainKey`, `DomainCapability`, dan `DomainPageData`
- smoke test diperluas untuk memverifikasi service layer domain dan capability per role

### Notes

- versi `0.18.0` menandai bahwa semua shell utama di `apps/web` sekarang sudah berada di pola data access layer yang seragam
- konektor database review untuk domain masih belum aktif, tetapi jalur integrasinya sekarang sudah konsisten dengan dashboard dan import

## [0.17.0] - 2026-07-06

### Added

- helper `apps/web/lib/data-source.ts` untuk menentukan mode sumber data `mock` vs `review-db`
- service layer `apps/web/lib/services/dashboard-service.ts` dan `apps/web/lib/services/import-service.ts`
- komponen `apps/web/components/data-source-status.tsx`
- file `apps/web/.env.example` untuk kontrak `APP_DATA_MODE` dan `DATABASE_URL`

### Changed

- halaman `dashboard`, `import`, `import/[batchId]`, dan API terkait sekarang membaca service layer, bukan mengimpor mock source langsung
- UI dashboard dan import sekarang menampilkan status sumber data efektif beserta fallback jika `review-db` belum siap
- smoke test diperluas agar memverifikasi data mode, fallback source, dan service layer

### Notes

- versi `0.17.0` menandai transisi dari mock source langsung ke data access layer yang siap diarahkan ke MySQL review
- koneksi database nyata belum diaktifkan pada tahap ini; `review-db` masih berupa kontrak konfigurasi dengan fallback eksplisit ke mock

## [0.16.0] - 2026-07-06

### Added

- script `apps/web/scripts/sandbox-verify.ps1` untuk menjalankan verifikasi lewat runner temp di luar workspace
- dokumentasi `Verifikasi Sandbox` pada `apps/web/README.md`

### Changed

- proses verifikasi `apps/web` sekarang punya jalur resmi yang kompatibel dengan sandbox tanpa membuat `node_modules` di dalam project

### Notes

- sandbox workspace memblokir operasi pada `apps/web/node_modules`, termasuk pembuatan junction ke folder temp
- jalur yang terbukti berhasil adalah menyalin `apps/web` ke `%TEMP%\perkasa-web-runner`, lalu menjalankan `npm install`, `npm run check`, dan `npm run test:smoke` di sana

## [0.15.0] - 2026-07-06

### Added

- permission matrix per role di `apps/web/lib/access-control.ts` untuk resource dan aksi domain
- komponen `apps/web/components/access/permission-matrix.tsx` untuk menampilkan matrix izin di UI
- ringkasan permission aktif pada halaman `settings/access`

### Changed

- `settings/access` tidak lagi memakai shell generik; halaman ini sekarang menampilkan role aktif, ringkasan izin, dan matrix aksi per resource
- pengujian di `apps/web/tests/mock-data.test.ts` diperluas agar mencakup permission matrix dan action check
- `apps/web/README.md` diperbarui agar milestone bootstrap mencakup permission matrix per role

### Notes

- versi `0.15.0` menandai bahwa fondasi authorization sekarang sudah naik dari pembatasan route ke model izin yang mulai mendekati kebutuhan operasional
- matrix pada tahap ini masih mock dan statis, tetapi bentuk kontraknya sudah cukup untuk dihubungkan ke auth internal dan master permission nyata pada iterasi berikutnya

## [0.14.0] - 2026-07-06

### Added

- helper role access di `apps/web/lib/access-control.ts` untuk menentukan landing page, navigasi, shortcut modul, dan izin route per role
- akun review `OPERATOR` tambahan untuk menguji pembatasan menu dan route
- pengujian role access pada `apps/web/tests/mock-data.test.ts`

### Changed

- sidebar dan shortcut dashboard sekarang hanya menampilkan menu yang sesuai role session
- halaman `import`, detail batch, shell domain, dan `settings/access` sekarang mengecek izin role, bukan sekadar status login
- API import dan topbar shortcut `Review Batch` sekarang mengikuti izin role yang sama
- `apps/web/README.md` diperbarui agar cakupan bootstrap mencakup role-based access awal

### Notes

- versi `0.14.0` menandai bahwa auth mock sekarang sudah punya lapisan authorization awal, sehingga struktur satu website mulai mencerminkan pembatasan akses per role
- model izin pada tahap ini masih sederhana dan berbasis prefix route, lalu bisa diperdalam ke level permission per data domain pada iterasi berikutnya

## [0.13.0] - 2026-07-06

### Added

- helper session di `apps/web/lib/auth-session.ts` untuk akun review, pembuatan token, dan verifikasi session cookie
- helper server auth di `apps/web/lib/auth.ts` untuk membaca cookie, guard halaman, dan mengelola cookie response
- route handler `POST /api/auth/login` dan `POST /api/auth/logout`
- pengujian auth mock pada `apps/web/tests/mock-data.test.ts`

### Changed

- halaman `login` sekarang benar-benar mengirim kredensial ke route auth mock dan menampilkan pesan error login
- `dashboard`, `import`, `import/[batchId]`, shell domain, dan API mock sekarang memerlukan session login
- topbar shell aplikasi sekarang menampilkan identitas session aktif dan tombol logout
- `apps/web/README.md` diperbarui agar cakupan bootstrap mencakup auth mock

### Notes

- versi `0.13.0` menandai bahwa bootstrap aplikasi web tidak lagi sekadar shell visual; jalur login, cookie session, dan guard akses awal sudah tersedia untuk review
- auth pada tahap ini masih mock dan sengaja sederhana agar kontrak UI, route, dan akses bisa diuji sebelum integrasi auth produksi

## [0.12.0] - 2026-07-06

### Added

- bootstrap `apps/web` berbasis `Next.js`, `React`, `TypeScript`, dan `Tailwind CSS`
- halaman `login`, `dashboard`, `import`, `import/[batchId]`, dan shell domain operasional awal
- route handler mock `/api/dashboard/summary`, `/api/import/batches`, dan `/api/import/batches/[id]`
- smoke test `apps/web/tests/mock-data.test.ts` untuk memeriksa konsistensi mock source utama

### Changed

- `apps/web/README.md` diperbarui agar mencerminkan bahwa aplikasi web utama sudah dibootstrap
- `README.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar milestone project sekarang mencakup shell aplikasi web utama

### Notes

- versi `0.12.0` menandai transisi dari artefak database review ke fondasi aplikasi web yang bisa dipakai untuk integrasi auth, Prisma, dan API domain nyata
- halaman dan API pada tahap ini masih memakai mock data yang disengaja agar struktur frontend dan kontrak awal backend bisa direview lebih cepat

## [0.11.0] - 2026-07-06

### Added

- tabel staging billing di `database/xampp_review_staging_import.sql` untuk invoice, item, payment, dan collection
- sample batch `SAMPLE-WEBPSB-BILLING-001` di `database/xampp_review_sample_import.sql`
- file `database/xampp_review_transform_stage_4.sql` untuk transform billing dari staging ke tabel final
- dokumen `docs/staging-transform-stage-4.md` untuk menjelaskan transform billing tahap 4

### Changed

- `docs/staging-import.md` dan `docs/sample-import.md` diperbarui agar mencakup domain billing
- `README.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar milestone project sekarang mencakup transform tahap 4
- `docs/staging-transform-stage-3.md` diperbarui agar langkah berikutnya mengarah ke tahap 4 yang sekarang sudah tersedia

### Notes

- versi `0.11.0` menandai bahwa fondasi review migrasi sekarang sudah mencakup domain billing, bukan hanya operasional dan support
- transform billing tetap mengikuti subscription hasil tahap 2 agar relasi invoice tidak berdiri tanpa layanan yang valid

## [0.10.0] - 2026-07-06

### Added

- file `database/xampp_review_transform_stage_3.sql` untuk transform work order, trouble ticket, isolation, dan dismantle history
- dokumen `docs/staging-transform-stage-3.md` untuk menjelaskan cakupan, urutan eksekusi, dan batas billing pada tahap 3
- sample `ISOLATION` dan `DISMANTLE_HISTORY` tambahan di `database/xampp_review_sample_import.sql`

### Changed

- `docs/sample-import.md` diperbarui agar sample review support tidak hanya mencakup trouble ticket
- `README.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar milestone project sekarang mencakup transform tahap 3

### Notes

- versi `0.10.0` menandai bahwa jalur operasional dari order ke work order dan histori support sudah punya artefak transform review
- billing masih sengaja ditahan karena schema billing sudah ada, tetapi staging billing sebagai sumber transform belum dibuat

## [0.9.0] - 2026-07-06

### Added

- file `database/xampp_review_transform_stage_2.sql` untuk transform customer, address, sales order, dan subscription dari staging ke tabel final
- dokumen `docs/staging-transform-stage-2.md` untuk menjelaskan cakupan, urutan eksekusi, dan query review tahap 2

### Changed

- `README.md` dan `docs/README.md` diperbarui agar milestone project sekarang mencakup transform tahap 2
- `docs/phase-1-roadmap.md` diperbarui untuk menambahkan sprint khusus transform customer, address, order, dan subscription

### Notes

- versi `0.9.0` menandai bahwa jalur komersial inti dari customer sampai subscription sudah punya artefak transform review
- `sales_leads`, `service_work_orders`, domain support, dan billing masih sengaja dipisahkan ke tahap berikutnya agar lifecycle operasionalnya tidak tercampur terlalu cepat

## [0.8.0] - 2026-07-06

### Added

- file `database/xampp_review_transform_stage_1.sql` untuk transform awal dari staging ke tabel final
- dokumen `docs/staging-transform.md` untuk menjelaskan cakupan, urutan eksekusi, dan cara review hasil transform

### Changed

- `README.md` dan `docs/README.md` diperbarui agar milestone project sekarang mencakup transform tahap 1
- `docs/phase-1-roadmap.md` diperbarui untuk menambahkan sprint khusus transform inventory dan HR

### Notes

- versi `0.8.0` menandai bahwa review migrasi sekarang sudah masuk tahap insert terkontrol ke tabel final, meskipun masih dibatasi pada domain inventory dan HR
- domain customer, order, subscription, support, dan billing sengaja belum dimasukkan ke tahap ini agar relasinya bisa direview lebih hati-hati

## [0.7.0] - 2026-07-06

### Added

- sample batch `GA` untuk `inventory item` dan `inventory movement` di `database/xampp_review_sample_import.sql`
- sample batch `FINANCE` untuk `employee`, `attendance`, `salary`, dan `loan` di `database/xampp_review_sample_import.sql`
- query review tambahan di `docs/sample-import.md` untuk domain inventory dan HR

### Changed

- `docs/sample-import.md` diperbarui agar cakupan sample sekarang lintas `WEB_PSB`, `GA`, dan `FINANCE`
- `docs/phase-1-roadmap.md` dan `README.md` diperbarui agar milestone berikutnya bergeser ke tahap transform staging ke tabel final

### Notes

- versi `0.7.0` menandai bahwa sample review sekarang sudah menyentuh tiga sumber legacy utama, bukan hanya domain web psb
- seluruh sample tetap berhenti di area staging agar konsistensi satu database bisa direview sebelum proses insert ke tabel final

## [0.6.1] - 2026-07-06

### Added

- file `database/xampp_review_core_master_seed.sql` untuk menyiapkan master minimum sebelum mapping seed dijalankan
- dokumen `docs/core-master-seed.md` untuk menjelaskan dependency foreign key pada master mapping

### Changed

- urutan eksekusi di `docs/master-mapping.md`, `docs/master-mapping-seed.md`, dan `docs/sample-import.md` diperbaiki agar memakai core master seed terlebih dahulu
- `README.md` dan `docs/README.md` diperbarui agar file seed master minimum ikut tercatat

### Notes

- versi `0.6.1` adalah patch yang memastikan sample review dan mapping seed bisa dijalankan dengan referensi master yang valid

## [0.6.0] - 2026-07-06

### Added

- file `database/xampp_review_master_mapping_seed.sql` sebagai baseline awal translasi nilai legacy
- file `database/xampp_review_sample_import.sql` sebagai sample batch kecil untuk uji staging dan mapping
- dokumen `docs/master-mapping-seed.md` untuk menjelaskan fungsi seed awal
- dokumen `docs/sample-import.md` untuk menjelaskan urutan eksekusi dan hasil yang diharapkan dari sample batch

### Changed

- `README.md`, `docs/README.md`, `docs/master-mapping.md`, `docs/staging-import.md`, dan `docs/phase-1-roadmap.md` diperbarui agar selaras dengan milestone seed dan sample import

### Notes

- versi `0.6.0` menandai bahwa fondasi migrasi sekarang sudah punya contoh baseline mapping dan contoh batch review, bukan hanya schema transit
- sample import tetap berhenti di area staging agar aman untuk review satu database sebelum import nyata

## [0.5.0] - 2026-07-05

### Added

- file `database/xampp_review_master_mapping.sql` untuk template mapping nilai legacy ke master tunggal
- dokumen `docs/master-mapping.md` untuk menjelaskan fungsi mapping role, division, branch, package, category, unit, dan status
- dokumen `docs/platform-architecture.md` untuk mengunci constraint `1 database`, `1 domain`, dan `1 website`

### Changed

- `README.md` diperbarui agar prinsip project secara eksplisit mengikuti arsitektur satu platform terpadu
- `docs/blueprint.md`, `docs/staging-import.md`, `docs/data-mapping.md`, `docs/README.md`, dan `docs/phase-1-roadmap.md` diperbarui agar selaras dengan constraint arsitektur dan tahap master mapping

### Notes

- versi `0.5.0` menandai bahwa fondasi project sekarang tidak hanya punya schema dan staging, tetapi juga aturan penyatuan nilai legacy ke model data tunggal
- keputusan `1 database, 1 domain, 1 website` berarti modul baru harus tetap modular di dalam satu aplikasi, bukan dipecah menjadi situs terpisah

## [0.4.0] - 2026-07-05

### Added

- file `database/xampp_review_staging_import.sql` untuk tabel staging import dari tiga sistem lama
- dokumen `docs/staging-import.md` untuk menjelaskan pola staging, status import, dan alur review data mentah
- tabel batch import `staging_import_batches`
- tabel staging domain untuk user, customer, order, support, inventory, employee, attendance, salary, dan loan

### Changed

- `README.md` dan `docs/README.md` diperbarui agar milestone project mencakup staging import
- `docs/data-mapping.md`, `docs/schema-gap.md`, dan `docs/phase-1-roadmap.md` diperbarui agar konsisten dengan tahap staging

### Notes

- versi `0.4.0` menandai bahwa review database sekarang tidak hanya punya schema final, tetapi juga area aman untuk cleansing dan validasi data legacy
- staging import tetap diposisikan sebagai area transit, bukan sumber data operasional utama

## [0.3.0] - 2026-07-05

### Added

- file `database/xampp_review_schema_phase_1_1.sql` sebagai patch schema lanjutan setelah schema dasar
- dokumen `docs/schema-phase-1-1.md` untuk menjelaskan isi dan urutan eksekusi patch schema
- tabel coverage dan survey: `sales_covered_areas`, `sales_surveys`, `sales_survey_photos`
- tabel billing dan collection: `billing_invoices`, `billing_invoice_items`, `billing_payments`, `billing_collection_actions`
- tabel `network_odp_ports` untuk detail port ODP
- tabel `service_device_assignments` untuk assignment perangkat ke customer/subscription

### Changed

- `auth_users` direncanakan terhubung ke `hr_employees` melalui kolom `employee_id` pada patch schema phase 1.1
- `README.md`, `docs/README.md`, `docs/phase-1-roadmap.md`, dan `docs/schema-gap.md` diperbarui agar sinkron dengan milestone schema terbaru

### Notes

- versi `0.3.0` menandai transisi dari review struktur dasar ke schema operasional yang lebih dekat ke alur end-to-end ISP
- patch `phase 1.1` harus dijalankan setelah `database/xampp_review_schema.sql`

## [0.2.0] - 2026-07-05

### Added

- dokumen `docs/data-mapping.md` untuk mapping entitas dan field dari `web-psb-perkasa`, `finance-repo`, dan `ga-web-app`
- dokumen `docs/phase-1-erd.md` untuk merangkum relasi tabel phase 1
- dokumen `docs/schema-gap.md` untuk memetakan gap schema dan prioritas iterasi berikutnya

### Changed

- `README.md` diperbarui agar milestone saat ini mengarah ke schema phase 1.1 dan staging import
- `docs/README.md` diperbarui agar indeks dokumen mencakup ERD dan schema gap

### Notes

- versi `0.2.0` menandai milestone integrasi dokumen domain, field mapping, dan review relasi database
- schema review awal sudah cukup untuk validasi fondasi, tetapi belum lengkap untuk billing, coverage/survey, dan ODP port detail

## [0.1.0] - 2026-07-05

### Added

- inisialisasi folder project baru `perkasa-erp-oss-bss`
- dokumen blueprint gabungan di `docs/blueprint.md`
- roadmap phase 1 di `docs/phase-1-roadmap.md`
- schema awal MySQL XAMPP untuk review di `database/xampp_review_schema.sql`
- struktur awal `apps/web`
- file `VERSION`
- kebijakan versioning project

### Notes

- versi `0.1.0` menandai fase fondasi arsitektur dan database review
- belum ada bootstrap framework aplikasi utama
- belum ada eksekusi schema ke XAMPP
