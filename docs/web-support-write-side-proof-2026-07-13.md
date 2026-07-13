# Bukti Write-Side Support 2026-07-13

Dokumen ini merangkum bukti yang sudah tersedia untuk flow write-side support berisiko tinggi tanpa melakukan mutasi review DB secara sembarangan. Fokus saat ini:

1. `restore isolir`
2. `transfer ke dismantle`
3. `reopen dismantle`
4. `update TT teknis`
5. `update port/ODP`

## Status Singkat

| Flow | Guard Role | Guard State/Schema | Audit Note | Bukti Eksekusi Saat Ini | Status |
|---|---|---|---|---|---|
| `restore isolir` | `support update` | wajib `review-db`, wajib ada `status`, menolak data tidak ada / sudah closed / sudah restore | catatan restore dinormalisasi dengan actor web | code review + smoke proof RBAC + mutation proof aktual | `pass` |
| `transfer ke dismantle` | `CS_ADMIN` approver atau `DISMANTLE_OPERATOR` | wajib `review-db`, wajib ada `customer_name/status`, menolak archived / closed / duplicate queue | transfer note terstruktur dengan actor web | code review + smoke proof RBAC/note + mutation proof aktual | `pass` |
| `reopen dismantle` | `CS_ADMIN` approver atau `DISMANTLE_OPERATOR` | wajib `review-db`, wajib ada `status`, menolak histori tidak ada / isolation tidak ada / queue aktif duplikat | reopen note terstruktur dengan actor web | code review + smoke proof RBAC/note + mutation proof aktual | `pass` |

## Bukti Route Aktual

### Restore Isolir

- Route: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/[id]/restore/route.ts)
- Guard penting:
  - wajib login
  - wajib `canPerformAction(role, 'support', 'update')`
  - wajib `review-db` non-fallback
  - wajib `closeNote`
  - menolak `404` jika data isolir tidak ada
  - menolak `409` jika isolir sudah `CLOSED` atau sudah punya `restoration_date`
- Audit note:
  - format `[Restored via billing workflow] <displayName> (<username>) - <note>`

### Transfer ke Dismantle

- Route: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/isolations/[id]/dismantle/route.ts)
- Guard penting:
  - wajib login
  - wajib `canProcessSupportDismantle(...)`
  - wajib `review-db` non-fallback
  - wajib `transferNote`
  - menolak `404` jika isolir tidak ada
  - menolak `409` jika isolir sudah archived, sudah closed, atau sudah ada di queue dismantle
- Audit note:
  - dibentuk oleh [support-dismantle-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/support-dismantle-service.ts) dengan format `[Transferred to dismantle queue] <displayName> (<username>) - <note>`

### Reopen Dismantle

- Route: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle-history/[id]/reopen/route.ts)
- Guard penting:
  - wajib login
  - wajib `canProcessSupportDismantle(...)`
  - wajib `review-db` non-fallback
  - wajib `reopenNote`
  - menolak `404` jika histori atau isolir asal tidak ada
  - menolak `409` jika isolir sudah aktif normal atau queue dismantle aktif sudah ada
- Audit note:
  - format `[Reopened via dismantle] <displayName> (<username>) - <note>`

## Bukti Executable

- Smoke proof executable sudah ditambahkan di [mock-data.test.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/tests/mock-data.test.ts) untuk memastikan:
  - `CS_OPERATOR` tetap bisa `isolation-restore`
  - `CS_OPERATOR` tidak boleh `dismantle-close`
  - `CS_ADMIN` boleh `dismantle-reopen`
  - `DISMANTLE_OPERATOR` boleh `dismantle-close`
  - gate `canProcessSupportDismantle()` hanya meloloskan approver yang benar atau `DISMANTLE_OPERATOR`
  - transfer/close/reopen note tetap terstruktur dan menyimpan metadata actor, field PIC, device status, pickup status, outcome, dan billing disposition

## Bukti Mutasi Terkontrol

- Helper proof terkontrol tersedia di [prove-support-write-side.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/prove-support-write-side.mjs) dan hanya bisa menulis bila `--apply` dipakai bersama `--confirm-db` atau `--confirm-host`.
- Bukti aktual yang sudah dijalankan pada review DB `erp_isp_review`:

| Flow | Kandidat | Aktor Web | Before | After | Hasil |
|---|---|---|---|---|---|
| `restore isolir` | `support_isolations.id = 271` (`Tika Sri Lestari`) | `cstest` | `status=OPEN`, `restoration_date=NULL`, `close_note=NULL` | `status=CLOSED`, `restoration_date=2026-07-13 07:52:59`, `close_note` terisi note restore | `pass` |
| `transfer ke dismantle` | `support_isolations.id = 272` (`Nur Azizah`) | `admincs.sample` | belum ada queue dismantle | `support_dismantle_queue.id = 66`, `transferred_by_username=admincs.sample`, `transfer_note` terisi | `pass` |
| `reopen dismantle` | `support_dismantle_history.id = 321` (`YUNI SUSANTI`) | `admincs.sample` | histori ada, queue aktif belum ada, isolir masih `CLOSED`/`archived` | histori terhapus, isolir kembali `OPEN`, queue aktif baru `id = 68`, `transfer_note` dan `reopened_note` terisi | `pass` |

## Hardening Reopen Tambahan

- Mutation proof pertama untuk `reopen dismantle` sempat gagal karena `staging_legacy_support_records.target_dismantle_history_id` masih mengarah ke histori yang hendak dihapus.
- Route `reopen` kini merelink lineage staging ke `target_dismantle_queue_id` yang baru sebelum menghapus histori lama, sehingga foreign key tetap konsisten pada review DB nyata: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/dismantle-history/[id]/reopen/route.ts)

## Yang Masih Belum Final

- Mutation proof terkontrol untuk tiga flow prioritas sudah tersedia, tetapi bukti write-side support secara keseluruhan masih belum final untuk:
  - `update TT teknis`
  - `update port/ODP`
- Evidence hari-H tetap perlu menyalin hasil yang relevan ke template go-live sesuai host/commit deploy aktual.

## Rekomendasi Lanjut

1. lanjutkan mutation proof untuk `update TT teknis`
2. lanjutkan mutation proof untuk `update port/ODP`
3. salin hasil mutation proof support ini ke template [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md) saat rehearsal server-side atau hari-H

## Appendiks: TT Teknis (Progress/Eskalasi/Close)

### Route

- Update Progress: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/[ticketCode]/progress/route.ts)
- Eskalasi: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/[ticketCode]/escalate/route.ts)
- Close: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/support/trouble-tickets/[ticketCode]/close/route.ts)

### Helper Proof

- Helper: [prove-tt-write-side.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/prove-tt-write-side.mjs)
- Discover kandidat (contoh):
  - `npm run prove:tt-write-side -- --discover --flow progress --env .env`
  - `npm run prove:tt-write-side -- --discover --flow close --env .env`
- Dry-run snapshot (tanpa mutasi):
  - `npm run prove:tt-write-side -- --flow progress --ticket TT-XXXX --env .env`
- Apply (mutasi terkontrol, wajib confirm host/db):
  - `npm run prove:tt-write-side -- --apply --confirm-db erp_isp_review --flow progress --ticket TT-XXXX --progress-status ON_PROGRESS --owner-name "PIC" --progress-notes "Catatan uji" --username <user> --password <pass> --evidence-file docs/proofs/tt-progress-TT-XXXX.json`
  - `npm run prove:tt-write-side -- --apply --confirm-db erp_isp_review --flow escalate --ticket TT-XXXX --escalation-target "NOC" --escalation-level MANUAL --escalation-reason "Uji eskalasi" --username <user> --password <pass> --evidence-file docs/proofs/tt-escalate-TT-XXXX.json`
  - `npm run prove:tt-write-side -- --apply --confirm-db erp_isp_review --flow close --ticket TT-XXXX --resolution-action "RESOLVED" --close-notes "Uji close" --username <user> --password <pass> --evidence-file docs/proofs/tt-close-TT-XXXX.json`

## Appendiks: Port/ODP (Assign/Status)

### Route

- Assign Port: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/odp-ports/assign/route.ts)
- Update Status Port: [route.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/inventory/odp-ports/status/route.ts)

### Helper Proof

- Helper: [prove-odp-write-side.mjs](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/scripts/prove-odp-write-side.mjs)
- Discover kandidat:
  - `npm run prove:odp-write-side -- --discover --flow assign --env .env`
  - `npm run prove:odp-write-side -- --discover --flow status --env .env`
- Dry-run snapshot (tanpa mutasi):
  - `npm run prove:odp-write-side -- --flow assign --odp ODP-XXXX --port 1 --env .env`
- Apply (mutasi terkontrol, wajib confirm host/db):
  - `npm run prove:odp-write-side -- --apply --confirm-db erp_isp_review --flow assign --odp ODP-XXXX --port 1 --service-no SVC-XXXX --customer-code CUST-XXXX --notes "Uji assign" --username <user> --password <pass> --evidence-file docs/proofs/odp-assign-ODP-XXXX-1.json`
  - `npm run prove:odp-write-side -- --apply --confirm-db erp_isp_review --flow status --odp ODP-XXXX --port 1 --port-status RESERVED --notes "Uji status" --username <user> --password <pass> --evidence-file docs/proofs/odp-status-ODP-XXXX-1.json`
