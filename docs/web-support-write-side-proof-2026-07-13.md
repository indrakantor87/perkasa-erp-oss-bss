# Bukti Write-Side Support 2026-07-13

Dokumen ini merangkum bukti yang sudah tersedia untuk flow write-side support berisiko tinggi tanpa melakukan mutasi review DB secara sembarangan. Fokus saat ini:

1. `restore isolir`
2. `transfer ke dismantle`
3. `reopen dismantle`

## Status Singkat

| Flow | Guard Role | Guard State/Schema | Audit Note | Bukti Eksekusi Saat Ini | Status |
|---|---|---|---|---|---|
| `restore isolir` | `support update` | wajib `review-db`, wajib ada `status`, menolak data tidak ada / sudah closed / sudah restore | catatan restore dinormalisasi dengan actor web | code review + smoke proof RBAC | `partial` |
| `transfer ke dismantle` | `CS_ADMIN` approver atau `DISMANTLE_OPERATOR` | wajib `review-db`, wajib ada `customer_name/status`, menolak archived / closed / duplicate queue | transfer note terstruktur dengan actor web | code review + smoke proof RBAC/note | `partial` |
| `reopen dismantle` | `CS_ADMIN` approver atau `DISMANTLE_OPERATOR` | wajib `review-db`, wajib ada `status`, menolak histori tidak ada / isolation tidak ada / queue aktif duplikat | reopen note terstruktur dengan actor web | code review + smoke proof RBAC/note | `partial` |

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

## Yang Masih Belum Final

- Bukti mutasi manual terkontrol pada review DB masih belum diformalisasi untuk:
  - satu contoh `restore isolir`
  - satu contoh `transfer ke dismantle`
  - satu contoh `reopen dismantle`
- Bukti tersebut sengaja belum dipaksa pada batch ini agar tidak menulis data review DB tanpa guard operasional yang jelas.

## Rekomendasi Lanjut

1. jalankan mutation proof terkontrol pada data kandidat uji yang sudah dipilih PIC
2. simpan sebelum/sesudah record untuk `support_isolations`, `support_dismantle_queue`, dan `support_dismantle_history`
3. lampirkan hasilnya ke template [web-go-live-evidence-template.md](file:///d:/trae_projects/perkasa-erp-oss-bss/docs/web-go-live-evidence-template.md)

