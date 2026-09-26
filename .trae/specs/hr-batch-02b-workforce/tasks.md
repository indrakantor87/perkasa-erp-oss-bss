# HR-BATCH-02B WORKFORCE — TASK IMPLEMENTATION PLAN (Ordered Atomic Gates)

**Baseline Commit**: `da467b6646c633d057a331bdb270dde82088e437` on main
**Feature Branch Target**: `feat/hr-batch-02b-workforce` (created from exact baseline SHA T0 gate)
**Locked Scope Exclusions FOREVER**: Full Payroll / PPh21 / BPJS / Real FP SDK / Cron / Encryption / BCDR / Deploy / Divisions-Branches / Recruitment / Training / Reopen Non-FP Attendance Source POST (Browser/Manual/Face/GPS tetap 403)
**Safety Rules Git**: No amend, No force push, No merge main pre-approved, Linear history from baseline, each completed task recorded Completion Evidence = SHA or output command.

---

## AC Coverage Matrix Summary (28 AC → 17 Tasks + 10 Regression Test Scenarios)

| # | AC Coverage | Task Gate | Priority | Type |
|---|-------------|-----------|----------|------|
| 1 | Baseline Branch + SHA Exact Match Safety | **T0** | high | gate |
| 2 | Type System Role + New Resources Enum Extend (leave/overtime permission matrix) + AppRole entry keep KARYAWAN HR perm empty | **T1** | high | rule TR-1 |
| 3 | HR Audit Action Type Enum + SQL column 3-place extend (13 new values LEAVE_* + OVERTIME_*). Pattern reuse Batch-02A ORG values 7 → 13 leave+overtime | **T2** | high | rule TR-2 |
| 4 | Schema Ensure tables: hr_leave_types, hr_leave_balances, hr_leave_requests, hr_leaves_docs, hr_overtime_requests, hr_ot_docs + Supervisor relationship helper service `resolveDirectSubordinateEmployeeIds(supervisorAuthUserId)` reusable all gates + circular/self-supervisor forbid validation | **T3** | high | rule TR-3 rule TR-3b |
| 5 | Leave Type Master CRUD `/api/hr/leave-types` (GET all roles view OK, write HR only) + FK delete block when requests ref >0 → 400 inactive fallback | **T4** | high | rule TR-4 TR-5 |
| 6 | Leave Balance per Employee `/api/hr/leave-balances` HR set + `/api/me/leave-balances` self read-only KARYAWAN | **T5** | medium | rule TR-6 |
| 7 | Leave Request Lifecycle core: CRUD endpoints `/api/hr/leave-requests` + `/api/me/leave-requests` self-scope identity trusted, date overlap validation AC-7, attachment needs_docs requirement. | **T6** | high | rule TR-7 TR-8 TR-9 TR-10 |
| 8 | Leave Transition Approvals: Supervisor scope (direct reports only, no self, no circular) + HR Final APPROVED_HR immutable + Cancel rules + Audit recordHrAudit per-state before/after payload | **T7** | high | rule TR-11 TR-12 TR-13 TR-14 |
| 9 | Overtime Request Lifecycle core: CRUD `/api/hr/overtime-requests` + `/api/me/overtime-requests` self scope, date max 480 min/day aggregate server compute | **T8** | high | rule TR-15 TR-16 TR-17 |
| 10 | Overtime Approvals: Supervisor direct scope (no self/circular) + HR set approved_minutes final immutable + Audit state transitions | **T9** | high | rule TR-18 TR-19 TR-20 |
| 11 | **CRITICAL INTEGRATION — Attendance Correction Pattern — 6 Columns MAX Only**: After APPROVED_HR leave → snapshot attendance insert/update per-date range. After APPROVED_HR overtime → set attendance.overtime_minutes only. BOTH SAVE snapshot_before JSON for HR cancel revert. SOURCE_TYPE NEVER IN SET clause anywhere. | **T10** | high | rule TR-21 TR-22 (RUBRIC SCORE — critical) |
| 12 | HR Admin Cancel Revert: Cancel APPROVED_HR leave/overtime → revert attendance row 6 columns EXACT from snapshot_before JSON. Again NO source_type SET. Deduction balance leave otomatis rollback. | **T11** | high | rule TR-23 |
| 13 | Navigation Sidebar: Tambah 2 workspace items baru untuk HR (Data Leave + Data Overtime) di `buildHrMainItem()` children; Tambah 2 `/me/leaves` + `/me/overtime-requests` items di `buildKaryawanSelfServiceItem()` children existing 4 entries → jadi 6 entries total self. FIELD_TECHNICIAN section **0 edits UNCHANGED** safety. Prefix `/hr/leaves` `/hr/overtimes` allowed for HR only; KARYAWAN NO /hr access tetap keep | **T12** | medium | rule TR-24 |
| 14 | TypeScript Strict Full Compile apps/web npx tsc noEmit → exit 0. Any Record type missing KARYAWAN access-control/worklist/support-lanes/role-meta → resolve sequential compile clean without skipLibCheck | **T13** | high | rule TR-25 |
| 15 | **Executable Regression Runner (10 Scenarios Total — existing wave2 tsx pattern pure function simulator buildSession/assertEq counters no Jest/Vitest install)**: `tests/hr-batch02b-regression.test.ts`. Semua 10 scenario harus PASS exit code 0 0 skip 0 fail. Scenarios lihat bagian TASK T15 LIST dibawah detail dengan TR rule each scenario. | **T15** | high | multi-rule (10 scenario cover) |
| 16 | Scope Purity Check + Static Batch-01 Provenance + Diff Whitespace. Verifikasi: (a) git diff baseline scope files HR ONLY + shared minimal dependency OK non-HR logic untouched FINANCE/TECH/CS/NOC/SALES/INVENTORY = 0 diff logic. Score rubric AC-27 compute 1-5. (b) git diff --check whitespace exit 0. (c) Static diff core attendance engine + correction routes = 0 lines behavioral (provenance kernel Batch-01 unchanged). | **T16** | high | rubric TR-26 TR-27 TR-28 |
| 17 | Commit + Push feature branch → Independent Review AC 28/28 gate → Final Report artifact | **T17** | high | gate |

---

## Task Gate Detail — Per-AC TR (Test Requirements — rule or rubric) + Status + Evidence

---

### 🚦 TASK T0: BASELINE BRANCH CREATE EXACT SHA
**Status**: pending (akan start ketika user approve implementasi)
**Parent AC**: gate safety.
**TR-0 (rule)**: `git rev-parse HEAD` = exact `da467b6646c633d057a331bdb270dde82088e437` after `git checkout -b feat/hr-batch-02b-workforce da467b6`. Working tree tracked files = CLEAN (modified/staged = 0). Untracked artifacts .md/.trae specs allowed.
**Completion Evidence (saat implement)**: output rev-parse exact match text.

---

### 🚦 TASK T1: TYPE SYSTEM ENUM + PERMISSION CONSISTENCY
**Status**: pending
**Parent AC**: AC-1 view/create role boundaries + KARYAWAN no global HR perm.
**TR-1a (rule)**: Di `apps/web/lib/types.ts` keep `KARYAWAN` AppRole exists. TIDAK PERLU role baru SUPERVISOR (supervisor derived from relationship FK). Add 2 resource label di permission matrix labels set baseline: `leave_requests` + `overtime_requests` actions view/create/update/approve/cancel/export.
**TR-1b (rule)**: Di `apps/web/lib/access-control.ts`:
  - `baselineRolePermissionMatrix[HR/SA/ADMIN/OWNER]` → receive actions `leave_requests: [view create update approve export]`, `overtime_requests: [view create update approve export]`.
  - ⚠️ CRITICAL: `baselineRolePermissionMatrix['KARYAWAN']` TETAP **HR resources EMPTY**. Leave/Overtime KARYAWAN access via `/me/*` identity scope endpoint SAJA. TIDAK BOLEH KARYAWAN dapat grant leave_requests[approve] apapun.
  - KARYAWAN actions allowed: daily_activity[view create] keep.
**TR-1c (rule)**: worklist-service, support-lanes KARYAWAN entries TETAP seperti 02A (jangan diubah — tidak perlu worklist leave disini karena self menu via `/me/*`).
**Completion Evidence (implement)**: npx tsc noEmit Record type check pass all AppRole keys.

---

### 🚦 TASK T2: HR AUDIT ACTION TYPE ENUM EXTEND 3 PLACE CONSISTENCY
**Status**: pending
**Parent AC**: AC-13 leave audit + AC-25 overtime audit.
**TR-2a (rule)**: Tambahkan 13 values baru type union `HrAuditActionType` di `hr-audit-service.ts`:
```
LEAVE_TYPE_CREATE, LEAVE_TYPE_UPDATE, LEAVE_TYPE_DELETE,
LEAVE_REQUEST_CREATE, LEAVE_REQUEST_SUBMIT, LEAVE_REQUEST_SPV_APPROVE, LEAVE_REQUEST_SPV_REJECT,
LEAVE_REQUEST_HR_APPROVE, LEAVE_REQUEST_HR_REJECT, LEAVE_REQUEST_CANCEL,
OVERTIME_REQUEST_CREATE, OVERTIME_REQUEST_SPV_APPROVE, OVERTIME_REQUEST_HR_APPROVE, OVERTIME_REQUEST_HR_REJECT, OVERTIME_REQUEST_CANCEL,
LEAVE_BALANCE_ADJUST, LEAVE_IDOR_ATTEMPT, OVERTIME_IDOR_ATTEMPT, SCOPE_VIOLATION_SUPERVISOR_CHAIN
```
(Total ~18 values baru; jumlah bisa disesuaikan tapi 3 place WAJIB ISI SAMA)
**TR-2b (rule)**: CREATE TABLE schema SQL hr_audit_logs → column `action_type ENUM(...)` list tambahkan values SAMA PERSIS dengan type union atas.
**TR-2c (rule)**: ALTER TABLE MODIFY COLUMN rerun schema ensure function → tambahkan values list yang sama di ALTER query modify enum column agar idempotent rerun.
**TR-2d (rule)**: normalizeActionType / validateActionType function conditional list extend dengan semua values diatas. Kalau value tidak recognized → return default EMPLOYEE_HISTORY_EVENT or throw error explicit sesuai pattern Batch-02A.
**Completion Evidence**: tsc strict pass + migration run dry tidak SQL error "out of range enum value".

---

### 🚦 TASK T3: SCHEMA ENSURE TABLES + SUPERVISOR HELPER SERVICE
**Status**: pending
**Parent AC**: AC-4 FK delete rule (AC-2 mirror) + AC-10 supervisor chain forbid self/circular.
**TR-3a (rule)**: Buat file baru `apps/web/lib/services/hr-batch02b-schema-ensure.ts`. Reexport `ensureHrBatch01Schema, ensureHrBatch02aEmployeeCodeUnique` dari 01/02A lalu fungsi `export async function ensureHrBatch02bWorkforceSchema()`. Didalamnya sequential:
1. Ensure hr_leave_types columns: id PK, code UNIQUE, name VARCHAR, needs_docs BOOL default 0, deduct_balance BOOL default 1, default_allocation INT default 12, carryover_max INT default 0, is_active BOOL.
2. Ensure hr_leave_balances: id PK, employee_id FK hr_employees(id) ON DELETE CASCADE, leave_type_id FK leave types, fiscal_year YEAR (YYYY), balance_initial DECIMAL, balance_used DECIMAL, balance_remaining DECIMAL, UNIQUE constraint composite (employee_id, leave_type_id, fiscal_year) → 1 employee + 1 jenis cuti + 1 tahun hanya 1 baris balance.
3. Ensure hr_leave_requests: id PK, employee_id FK, leave_type_id FK, start_date DATE, end_date DATE, total_days DECIMAL(4,2), half_day ENUM('none','morning','afternoon') default none, status ENUM(...11 values exact from spec AC-9), reason TEXT, attachment_doc_ids JSON array, submitter_employee_id INT non-null, supervisor_approver_id INT NULL, supervisor_approved_at DATETIME NULL, supervisor_notes TEXT, hr_approver_id INT NULL, hr_approved_at DATETIME NULL, hr_notes TEXT, attendance_snapshot_before JSON (store per-date map original attendance values for revert), balance_applied BOOL default 0 (flag deduct sudah jalan or belum for idempotent), created_at, updated_at. Add INDEX status, employee_id + date range.
4. hr_overtime_requests: id PK, employee_id FK, overtime_date DATE, planned_start DATETIME, planned_end DATETIME, actual_start DATETIME, actual_end DATETIME, reason TEXT, approved_minutes INT default NULL (null = pending approval), status ENUM(...OT states from spec AC-19 9 values), attachment_evidence_ids JSON, submitter_id INT, supervisor_approver_id INT NULL, spv_approved_at NULL, hr_approver_id INT NULL, hr_approved_at NULL, hr_notes TEXT, attendance_snapshot_before JSON (original overtime_minutes attendance row tanggal itu for revert). Index (employee_id, overtime_date) UNIQUE not needed karena boleh multiple request aggregate daily tapi endpoint gabung total.
5. FK constraint ON DELETE restrict for leave_type_id / balance employee_id cascade employee delete.
6. **Idempotent**: Semua column add = `addColumnIfMissing()` existing pattern; table create = `CREATE TABLE IF NOT EXISTS` (dari Batch-01 pattern).
**TR-3b (rule)**: Buat service baru `apps/web/lib/services/hr/supervisor-scope.service.ts` exports:
  - `resolveDirectSubordinateEmployeeIds(supervisorAuthUserId: number)` → returns array number employee ids yang supervisor_id = identity.employeeId (trusted mapping from session.userId → auth session).
  - `isEmployeeInMySubordinateScope(supervisorIdentity, targetEmployeeId): boolean` reusable shorthand.
  - `validateSupervisorChainNoCircularAndNoSelf(approverEmployeeId, targetEmployeeId)` throw Error bila:
    a) Self approve: approverId === targetId → error "Tidak dapat menyetujui permohonan sendiri"
    b) Circular chain: walk UP supervisor pointer dari approverId sampai root (NULL). Jika ketemu targetId di chain atas → error "Circular supervisor chain detected. Tidak dapat approve." (reuse existing logic batch 01 bila ada).
**Completion Evidence**: tsc strict pass. Pure function test circular helper pass scenario T8.

---

### 🚦 TASK T4: LEAVE TYPE MASTER CRUD ENDPOINTS
**Status**: pending
**Parent AC**: AC-1, AC-2, AC-4.
**TR-4a (rule)**: `/api/hr/leave-types/route.ts`:
  - GET list: all roles authenticated allowed view (KARYAWAN juga lihat jenis cuti yang available untuk dirinya — no global HR write, view read OK).
  - POST create: HANYA HR role (hr.create permission). Code UNIQUE check duplicate pre-insert → 409 bila code sama sudah aktif.
**TR-4b (rule)**: `/api/hr/leave-types/[id]/route.ts`: PUT update + DELETE. Delete check `SELECT COUNT(*) FROM hr_leave_requests WHERE leave_type_id = ?`. Jika refCount > 0 → return 400 "Tipe cuti masih digunakan. Set is_active=0 nonaktifkan saja sebagai ganti penghapusan." Fallback PUT inactive allowed same pattern Batch-02A Teams Positions.
**TR-5 (rule)**: Active filter default GET list → is_active = true. HR can param includeInactive=true.

---

### 🚦 TASK T5: LEAVE BALANCE READ/WRITE ENDPOINTS
**Status**: pending
**Parent AC**: AC-3 balance scope rule.
**TR-6a (rule)**: `/api/hr/leave-balances/route.ts` — HANYA HR (hr create/update permission). Bulk import set balance. Setiap update balance → `recordHrAudit(LEAVE_BALANCE_ADJUST) detail employee_code + type + delta before/after.
**TR-6b (rule)**: `/api/me/leave-balances` — KARYAWAN readonly. Filter identity.id + fiscal_year current. Cross tamper query `?employee_id=999` → enforce server identity override; tidak pernah return data orang lain.

---

### 🚦 TASK T6: LEAVE REQUEST CREATE/SUBMIT VALIDATION OVERLAP + ATTACHMENT
**Status**: pending
**Parent AC**: AC-5, AC-6, AC-7, AC-8.
**TR-7a (rule)**: 2 routes entry `/api/hr/leave-requests` (HR create for employee / admin) + `/api/me/leave-requests` (KARYAWAN self). **Self scope enforcement**: `/api/me/*` → body `employee_id` field DI-IGNORE total. Set server side `employee_id = identity.id` 100% trusted. Cross check tamper IDOR via create for orang lain di /me → impossible.
**TR-7b (rule)**: Scope GET `/api/hr/leave-requests` list filter:
  - KARYAWAN role → HANYA return list identity.id. Query param `?employee_id=X` akan otomatis override dengan identity.id (filter tidak bocor) + warning log SCOPE_VIOLATION bila beda.
  - Supervisor role (relationship FK derived) → return HANYA list subordinate direct reports + own requests. Cannot view orang luar chain.
  - HR admin → semua employee list allowed.
  - Cross IDOR access unknown id for lower role scopes → 404 not found pattern. Audit log `LEAVE_IDOR_ATTEMPT` detail actor + target.
**TR-8 (rule)**: Overlap date validation (spec AC-7). SQL check overlap existing statuses ≥ PENDING_SUPERVISOR (exclude CANCELLED_* / REJECTED_*). Overlap return 400 specific tanggal mana konflik.
**TR-9 (rule)**: Needs docs flag check: jika type.needs_docs = TRUE → request body wajib minimal 1 attachment doc id (existing document upload route / doc ids from Batch-02A documents). Tanpa docs → 400 "Jenis cuti ini memerlukan lampiran dokumen (misal surat dokter, surat izin keluarga)."
**TR-10 (rule)**: Status default create DRAFT → bila endpoint POST body action="submit" → otomatis transition ke PENDING_SUPERVISOR sekaligus. Bisa terpisah POST create status DRAFT, lalu PATCH /submit transition. Either way consistent state machine transition FORBIDDEN lompat state (misal DRAFT langsung APPROVED_HR tanpa PENDING_SUPERVISOR) → validation throw transition invalid error 400 "State transition tidak diizinkan."

---

### 🚦 TASK T7: LEAVE APPROVAL SUPERVISOR + HR FINAL
**Status**: pending
**Parent AC**: AC-10, AC-11, AC-12, AC-13.
**TR-11 (rule)**: `POST /api/hr/leave-requests/[id]/supervisor-approve` actor identity. Validate:
  (a) Employee target request IN `resolveDirectSubordinateIds(actor)`. No → 404.
  (b) Not self approve.
  (c) Not circular chain via validateSupervisorChainNoCircularAndNoSelf.
  (d) Current status request = `PENDING_SUPERVISOR` only.
  → Success set status = `APPROVED_SUPERVISOR` → set supervisor_approver_id + approved_at → then auto transition → `PENDING_HR`. (Or keep APPROVED_SUPERVISOR step visible separate for audit; both acceptable, state machine 11 states remain ≤11 total.)
  → Reject route set status `REJECTED_SUPERVISOR` + mandatory reason wajib isi >20 karakter.
**TR-12 (rule)**: `POST /api/hr/leave-requests/[id]/hr-approve` hanya HR hr.approve permission. Current status = PENDING_HR or APPROVED_SUPERVISOR allowed. After APPROVED_HR → **TRIGGER SYNC ATTENDANCE SNAPSHOT (call T10 helper apply leave to attendance)**. Update immutable flag request — no further state changes except HR admin cancel.
**TR-13 (rule)**: Cancel route rules:
  - Employee cancel self: status in {DRAFT, PENDING_SUPERVISOR} → set CANCELLED_EMPLOYEE
  - HR admin cancel any time before COMPLETED → CANCELLED_HR_ADMIN + if sudah APPLIED snapshot attendance revert (call T11 revert helper)
  - Supervisor TIDAK PUNYA cancel permission → 403
**TR-14 (rule)**: Setiap state change INSERT audit log recordHrAudit sesuai 6+ leave action types. Detail payload JSON: `{ before_status, after_status, actor_employee_code, reason, affected_dates: [list dates] }`

---

### 🚦 TASK T8: OVERTIME REQUEST CREATE/SUBMIT + SERVER DURATION CALC
**Status**: pending
**Parent AC**: AC-16, AC-17, AC-18, AC-19, AC-26.
**TR-15 (rule)**: 2 endpoints entry `/api/hr/overtime-requests` + `/api/me/overtime-requests`. Self scope enforcement identity trusted SAMA PERSIS dengan leave pattern TR-7a. GET list filter supervisor scope sama juga.
**TR-16 (rule)**: SERVER-SIDE CALC — NEVER trust client submitted `approved_minutes` or `actual_duration` field. Ignore field itu di create/submit request body. Initial value planned duration = `Math.floor(planned_end-planned_start)/60000` minute.
**TR-17 (rule)**: Max Overtime Daily Aggregate: when entering APPROVED_HR, SUM all other APPROVED_HR overtime requests same employee same date + new one → TOTAL > 480 minutes → 400 "Melebihi batas maksimum 8 jam/ hari lembur (480 menit)."
**TR-18 (rule)**: State machine transitions overtime 9 states from AC-19 → NO jump states. Default POST create = DRAFT. Submit = PENDING_SUPERVISOR.

---

### 🚦 TASK T9: OVERTIME APPROVALS SUPERVISOR + HR FINAL
**Status**: pending
**Parent AC**: AC-20, AC-21, AC-23, AC-25.
**TR-19 (rule)**: Supervisor approval route POST `/overtime-requests/[id]/supervisor-approve` — SCOPE EXACT direct subordinates only (helper from T3 service). Self approve forbid + circular forbid SAMA with leave rules.
Supervisor approval required SET `approved_minutes: number` field (dapat ≤ planned duration). Validasi >0 and ≤ MAX 480/day aggregate di final step HR aja.
After supervisor success → transition APPROVED_SUPERVISOR → PENDING_HR.
Reject set REJECTED_SUPERVISOR reason mandatory.
**TR-20 (rule)**: HR approve final. Hanya hr.approve. set approved_minutes final value (boleh ubah dari supervisor value untuk kebijakan perusahaan). Final state `APPROVED_HR` → trigger SYNC ATTENDANCE OVERTIME SNAPSHOT helper from T10 (update attendance.overtime_minutes = approved_minutes only, NO source_type touch). After HR approve immutable kecuali cancel admin HR revert. Audit trail all state changes with overtime action types enum.

---

### 🚦 TASK T10: CRITICAL ATTENDANCE INTEGRATION — NO FAKE ROWS, EXACT ALLOWED FIELD LIST PER WORKFLOW ONLY, NO 6 COL CORRECTION PATTERN REUSE CLAIM
**Status**: pending
**Parent AC**: AC-14 LEAVE (status/notes/updated_at = 3 fields EXACT max only) + AC-24 OVERTIME (overtime_minutes/notes/updated_at = 2–3 fields EXACT max only) → BOTH **TIDAK BOLEH membuat INSERT row PALSU attendance jika no fingerprint event exists.**
**⚠️ HIGHEST PRIORITY SAFETY TASK**. Failure = MERGE GATE BLOCKED P0 remediation hard revert wajib.
**TR-21 (rule)**: BUAT HELPER SERVER SIDE (pure function direct invoke TIDAK call PATCH route correction public) `applyApprovedLeaveToAttendance(leaveRequestId, actor)` di attendance integration service reusable:
  Logic per tanggal dari start_date s/d end_date inclusive (single date step iterate):
  1. SELECT attendance WHERE employee_id=? AND attendance_date=? LIMIT 1 (row existence check NON-NEGOTIABLE FIRST step)
  2. **JIKA TIDAK ADA ROW (tidak ada raw FP event / belum ada engine insert row → employee kemungkinan tidak datang / ALPHA tidak tercatat di table.)**
     → **RETURN SKIP TOTAL (NO-OP) for tanggal ini.** DILARANG KERAS `INSERT INTO hr_attendance ...` row PALSU apapun dengan source_type=NULL atau status=LEAVE_APPROVED hanya demi representasikan cuti di attendance table. Canonical truth APPROVED_HR di hr_leave_requests sudah cukup. Payroll Batch-03 nanti YANG mengabungkan JOIN hr_leave_requests + hr_attendance rows sendiri.
  3. **JIKA ADA ROW (fingerprint event memang ada dan row sudah dipopulate engine batch-01):**
     a. Push original values ke Map `attendance_snapshot_before[date_str] = { status, notes, updated_at }` (hanya 3 field yang diubah)
     b. **EXACT MAX 3 FIELDS UPDATE SET ONLY** — Dijamin 3 fields atau KURANG. Tidak boleh gunakan "6 columns correction pattern" sebagai izin memperluas set field. Correction PATCH public route ADALAH WORKFLOW TERPISAH dan TIDAK BOLEH dicampur izinnya.
        ```sql
        UPDATE hr_attendance
        SET
          status = CASE leave.type_code WHEN 'SAKIT' THEN 'SICK'
                      WHEN 'IZIN' THEN 'PERMIT'
                      ELSE 'LEAVE_APPROVED' END,
          notes = CONCAT_WS('; ', COALESCE(notes,''), ?leave_applied_note),
          updated_at = NOW()
        WHERE id = att_row.id
        ```
        **FORBIDDEN FIELD ZONE (JANGAN SAMPAI MASUK SET, 1 KARAKTER KELUAR FAIL P0:**
        ❌ check_in / check_in_time ❌ check_out / check_out_time ❌ overtime_minutes ❌ locked_by_admin ❌ source_type.
  4. Audit trail `recordHrAudit action = LEAVE_REQUEST_HR_ATTENDANCE_APPLIED` detail `LEAVE_REQUEST_ID=XXX date=YYYY-MM-DD`.
  5. Simpan `hr_leave_requests.attendance_snapshot_before` = JSON stringify map of dates (only dates yang ADA row attendance; tanggal tidak ada row = TIDAK MASUK snapshot key; revert nanti hanya touch date yang ada snapshotnya saja).
**TR-22 (rule)**: Overtime helper function `applyApprovedOvertimeToAttendance(otRequestId)`.
  Date = overtime_date single day.
  1. SELECT attendance WHERE employee_id = ? AND attendance_date = ? LIMIT 1.
  2. **JIKA TIDAK ADA ROW → RETURN SKIP (NO-OP) TOTAL — DILARANG INSERT row PALSU lembur untuk alasan "keperluan representasi"!** Canonical approved_minutes di hr_overtime_requests sudah SUMBER KEBENARAN UTAMA untuk payroll nanti. Attendance row tidak perlu di-INSERT untuk menyimpan redundancy jika tidak ada fingerprint event.
  3. **JIKA ADA ROW (employee datang / fingerprint event ASLI ADA):**
     a. Save original `{ overtime_minutes, notes, updated_at }` ke `hr_overtime_requests.attendance_snapshot_before[overtime_date_str]`.
     b. **EXACT MAX 3 FIELDS SET ONLY (BIASANYA 2 SAJA):**
        ```sql
        UPDATE hr_attendance
        SET
          overtime_minutes = ?approved,       -- EXACT final otRequest.approved_minutes
          updated_at = NOW()
          -- (notes opsional jika ingin ditambah catatan overtime ID=XXX applied)
        WHERE id = att.id
        ```
        **FORBIDDEN ZONE OVERTIME:**
        ❌ check_in ❌ check_out ❌ status (biarkan fingerprint PRESENT/ALPHA/SICK PERMIT ASLI JANGAN DIUBAH SEKALI PUN) ❌ locked_by_admin ❌ source_type.
  4. Audit `OVERTIME_REQUEST_HR_ATTENDANCE_APPLIED` with detail minutes delta applied.
**TR-22b (rubric scale 0–3 threshold PASS ≥2)**: 3 verification gates. PASS = 3/3. FAIL = 0 BLOCKED.
  (a) Static grep occurrences `SET source_type` inside ALL attendance snapshot apply/revert helper files for leave/overtime → COUNT = 0.
  (b) Static grep occurrences `INSERT INTO hr_attendance` inside leave/overtime snapshot integration files → COUNT = 0 (tidak boleh buat row palsu).
  (c) COUNT SET columns list: leave = ≤3 fields (status,notes,updated_at); overtime ≤3 fields (overtime_minutes,notes,updated_at). diff count diff ≤ 3 each → pass 3/3.
**Completion Evidence**: Output 3 grep checks (a=0 b=0 c=pass).

---

### 🚦 TASK T11: HR CANCEL ADMIN REVERT ATTENDANCE SNAPSHOT + ATOMIC BALANCE RESTORE
**Status**: pending
**Parent AC**: AC-12 Cancel Rule 1 (Exact revert NOT assume PRESENT) + AC-15 Balance atomic rollback deduction leave + OT revert conditional NO blind overwrite.
**TR-23 (rule)** — `revertLeaveRequestAttendanceSnapshot(leaveRequestId)` (RULE V4 FINAL CANCEL CONFLICT-SAFE LEAVE = SAMA PATTERN OT REVERT SAFE — compare expected leave-applied-state WITH current actual before SET; DO NOT blindly overwrite revert to snapshot before):
  1. Loop `Object.keys(hr_leave_requests.attendance_snapshot_before_json)` for per date entries exists (tanggal yang TIDAK ADA row attendance = TIDAK MASUK key list ini; otomatis NO-OP revert STRICT).
  2. **FORBIDDEN ACTIONS HARD GATE**: ❌ `INSERT row attendance` (jika dulu tidak ada = tetap tidak ada NO-OP). ❌ `DELETE row attendance` (historical fingerprint rows tidak boleh hilang provenance).
  3. Snapshot per date T10 apply menyimpan 4 field WAJIB untuk V4 compare safe revert:
     `{ id, before_leave_status, before_leave_notes, after_leave_applied_expected_status, after_leave_applied_expected_notes }`.
  4. SELECT current attendance row values status + notes for id.
     - **CASE MATCH SAFE (no intervention later after Leave applied)**: `current.status == snapshot.after_leave_applied_expected_status AND current.notes == snapshot.after_leave_applied_expected_notes` → safe revert. `UPDATE hr_attendance SET status = @snapshot.before_leave_status, notes = @snapshot.before_leave_notes, updated_at = NOW() WHERE id = @snapshot.id LIMIT 1`.
       - ❌ HARD REVERT CHECK PRESENT ASSUMPTION BUG: Snapshot before status boleh SICK/ALPHA/PERMIT/PRESENT value canonical existing apa saja. Revert = exact sesuai value di `before_leave_status`. Bukan SET default PRESENT (invented revert heuristic wrong = FAIL S5 scenario sub-assertion revert SICK not PRESENT).
     - **CASE CONFLICT DIFFERENT (HR Correction PATCH / OT apply / other processes modified attendance set status or notes AFTER leave approval)**:
       Current status/notes TIDAK COCOK dengan expected after leave applied state → **SKIP revert attendance SET (no status no notes updates executed)**. Record audit `LEAVE_REVERT_CONFLICT` actionType di HrAuditLog dengan detail payload: `{leave_request_id, date, attendance_id, expected_status_after, current_status, expected_notes, current_notes, conflict_action='SKIP revert attendance; HR manual finalize via Correction PATCH required.'}`. Response Cancel endpoint JSON wajib include visible warning untuk user: `"leave_revert_warning": "⚠️ Attendance di tanggal-tanggal berikut telah berubah setelah leave approved sebelumnya (koreksi HR, OT apply, atau proses lain). Cancel Leave Workflow ke CANCELLED_HR_ADMIN tetap berhasil diproses. TETAPI revert otomatis attendance status/notes dibatalkan TIDAK overwrite nilai lebih baru. Silakan finalisasi via PATCH Correction attendance manual untuk nilai status final yang diinginkan. Tanggal konflik: [list dates conflicted]"`.
  5. **FORBIDDEN ZONE revert leave SET fields = exactly same with apply leave set field**: ❌ check_in, ❌ check_out, ❌ overtime_minutes, ❌ locked_by_admin, ❌ source_type. (3 fields allowed: status/notes/updated_at MAX; never lebih.)
**TR-23b — ATOMIC Leave Balance Revert**:
  Saat HR admin cancel trigger: IF `leave_request.balance_applied = TRUE` → `UPDATE hr_leave_balances SET balance_remaining = balance_remaining + @total_days, updated_at = NOW() WHERE id = @balance_id LIMIT 1`; THEN `UPDATE hr_leave_requests SET balance_applied = FALSE` exactly ONCE. Jika false flag sudah (double revert attempt) → SKIP step balance revert safely no error return. Transaction atomic bersama status leave berubah CANCELLED_HR_ADMIN. Insufficient balance scenario di test S6.
**TR-23c — Overtime revert conditional NO blind overwrite later HR corrections**:
  OT Cancel HR ADMIN executed:
  1. Loop `attendance_snapshot_before` overtime keys dates.
  2. Snapshot per date has fields: `{ id, overtime_minutes_before_snapshot, approved_minutes_expected_after_apply = otRequest.approved_minutes }`.
  3. **COMPARE CURRENT (SELECT latest) attendance.overtime_minutes sekarang vs approved_minutes_expected_after_apply**:
     - CASE EQUAL (no change, no HR Correction intervenced between apply → cancel): safe revert `SET overtime_minutes = @snapshot.overtime_minutes_before_snapshot, updated_at = NOW()` only (≤3 fields; JANGAN sentuh status/ci/co/lock/source_type apapun).
     - CASE DIFFERENT (HR menjalankan PATCH CORRECTION manual mengubah overtime_minutes SETELAH approved OT, ATAU ada OT request kedua lain applied overlapping tanggal itu): **SKIP revert attendance SET overtime_minutes. Audit log warning `OVERTIME_REVERT_CONFLICT_INTERVENED` detail payload { expected_approved, found_current_db, snapshot_before_value, actor_requester }. Response JSON response return WARNING field: `"ot_revert_warning": "Overtime attendance value diubah oleh koreksi HR setelah approved OT. Revert otomatis attendance dibatalkan TIDAK overwrite. Silakan finalisasi via PATCH Correction manual attendance."`**. Workflow overtime request status ke CANCELLED_HR_ADMIN tetap committed success (workflow state tidak rollback); hanya attendance overtime_minutes revert tidak jalan. Never silent overwrite.
  4. ❌ Jangan delete ci/co/source_type provenance apapun.
**TR-23d GATE T11 safety**:
  - grep COUNT SET columns revert leave query set_list = exactly `status, notes, updated_at` MAX 3 fields; no forbidden 5 fields.
  - grep COUNT SET OT revert `overtime_minutes, notes, updated_at` ≤3.
  - grep `SET source_type` seluruh T10 T11 revert + apply = ZERO.
  - grep `INSERT INTO hr_attendance` T10 T11 apply revert files = ZERO (no fake row / no insert saat revert).

---

### 🚦 TASK T12: NAVIGATION SIDEBAR UPDATES — TECH UNCHANGED BOUNDARY
**Status**: pending
**Parent AC**: Nav boundaries.
**TR-24 (rule)**: 2 lokasi edit ONLY. NO OTHERS:
  1. `buildHrMainItem()` children → tambah 2 entries baru:
     - `Permohonan Cuti/Izin` → href `/hr/leave-requests`
     - `Permohonan Lembur` → href `/hr/overtime-requests`
     (Total children HR jadi ~10 entries; tidak masalah)
  2. `buildKaryawanSelfServiceItem()` children existing 4 entries (profile/attendance/docs/salary-slips) → tambah 2 entries jadi 6:
     - `Cuti/Izin Saya` → href `/me/leaves`
     - `Lembur Saya` → href `/me/overtime-requests`
  3. **CRITICAL BOUNDARY**: JANGAN sentuh entry apapun yang terkait `FIELD_TECHNICIAN` (case FIELD_TECHNICIAN, buildTeknisiLapangan* functions, teknisi-psb paths, rolePreferredOrder TECH entry). Diff post-edit grep FIELD_TECHNICIAN lines changed = 0. Jika tidak → BLOCK GATE T12 FAILURE required remediation edit revert.

---

### 🚦 TASK T13: TYPESCRIPT STRICT FULL COMPILE APPS/WEB
**Status**: pending
**Parent AC**: General safety.
**TR-25 (rule)**: `cd apps/web && npx tsc --noEmit` → exit code 0, 0 errors strict mode tanpa `@ts-ignore` tanpa `skipLibCheck:true` baru ditambahkan. Jika Record<KARYAWAN, T> missing property → resolve sequential KARYAWAN property added dulu tsc 1 error resolve 1by1 ulang sampai clean.

---

### 🚦 TASK T15: EXECUTABLE REGRESSION TESTS — 10 SCENARIOS (tsx pattern existing wave2 no framework install)
**Status**: pending
Buat file `apps/web/tests/hr-batch02b-workforce-regression.test.ts`. Run command: `cd apps/web ; npx tsx tests/hr-batch02b-workforce-regression.test.ts` — Expected exit 0. FAIL IF any assertion fail.
List Scenario 10 mandatory (setiap scenario minimal 2 assertions → total assertions ≥ 20 di test file):

| # | Scenario | Cover AC/TR | Pass Evidence |
|---|----------|-------------|---------------|
| S1 | Leave Request Authorization | AC-5 / AC-6 | KARYAWAN create for subordinate id via tamper → enforced self identity milik sendiri. Cross id tamper create OR view list → IDOR pattern return filtered own only |
| S2 | Supervisor Scope Test | AC-10 / TR-11 | Supervisor 1001 punya subordinates 2001,2002. Spv 1001 try approve id=3000 (not sub) → return 404/403. In-scope ids 2001 approve success |
| S3 | Self Approve Forbid + Circular Chain Forbid | AC-10 | Actor=1001 leave request milik sendiri ID=99. Actor 1001 sebagai SPV try approve → return 400 self approve blocked. Circular A→B→A try chain → validation throw circular detected error |
| S4 | Leave Date Overlap Validation | AC-7 | Create leave 1-5 Jan → success. Create 2nd leave 3-7 Jan same employee still pending → 400 overlap tanggal 3,4,5. |
| **S5** | **Leave → Attendance Integration 5 sub-gates V4 FINAL: (a) SET EXACT 3 fields only apply. (b) NO SET forbidden ci/co/ot/lock/source_type. (c) NO INSERT fake rows. (d) CANCEL REVERT EXACT snapshot NOT assume PRESENT. (e) V4 CANCEL CONFLICT-SAFE compare current matches leave-applied before revert else warning audit.** | **AC-12 Rule V4 / AC-14 Rule 2 existing status / TR-21 TR-23 / TR-22b gates** | Assertion MIN 7 sub assertions TOTAL wajib: (1) Leave approve apply 3 fields list only SET: status, notes, updated_at. SAKIT leave_type → assert status = canonical existing SICK. CUTI_TAHUNAN leave_type → assert status = canonical existing PERMIT (NOT invented LEAVE_APPROVED). (2) Forbidden field values after leave apply unchanged: check_in/check_out/overtime_minutes/locked_by_admin/source_type === original. (3) Date tanpa fingerprint row: after approve SELECT attendance count EMP 0 row NO fake INSERT. (4) Scenario revert exact NOT PRESENT default bug: attendance pre-correction PATCH status=SICK duluan; leave type cuti approved set → status=PERMIT; HR Cancel → revert assert status = SICK (BUKAN heuristik PRESENT default revert bug). (5) Scenario V4 CANCEL CONFLICT: after leave approved (expected final PERMIT + notes X), HR PATCH Correction manual ubah attendance status ke ALPHA (intervensi later). HR Admin trigger Cancel leave → (a) attendance status TETAP ALPHA = NOT overwrite revert (TIDAK buta revert ke snapshot before SICK) (b) Workflow Leave status = CANCELLED_HR_ADMIN berhasil committed. (c) Response JSON = warning key `leave_revert_warning` exists contains message sesuai spec; (d) Audit log action `LEAVE_REVERT_CONFLICT` exists record inserted true. (6) Tanggal tanpa attendance row: HR Cancel → attendance count tetap 0 no insert no delete. (7) grep SET source_type = ZERO occurrences leave snapshot revert files. 7 ALL sub assertions PASS = S5 PASS. |
| **S6** | **ATOMIC Leave Balance Quota + Reject/Cancel Scenarios V3 (Rule 3 atomic balance)** | **AC-15 Part1 atomic balance** | Sub assertions wajib MIN 5: (1) Deduct ONLY on APPROVED_HR final not earlier (Submit PENDING → balance unchanged assert count). (2) Insufficient balance (quota 2 sisa, apply 5 hari deduct_balance=true) → HR approve transition FAIL error. attendance snapshot BELUM committed (rollback transaction assert status masih PENDING_HR). Balance remaining tetap 2 (tidak terpotong setengah). (3) REJECTED HR / REJECTED_SPV → balance = NOT deducted exactly same as before reject assert. (4) HR Cancel APPROVED_HR (balance_applied flag TRUE) → revert assert balance restored exact remaining = original before approve + amount total days return. balance_applied flag = FALSE kembali. (5) DOUBLE CANCEL REVERT (call cancel endpoint 2 kali same id) → balance restored EXACTLY ONCE only (tidak double + +). Idempotent. 5 assertions all pass → S6 PASS |
| S7 | Overtime Duration Server Calc Correct | AC-18 | Start 18:00, End 21:30 → initial planned = 210 minutes. Supervisor approved 180 min → final approved_minutes stored = 180 (bukan client send 300). Approved >480 min/day → validation 400 reject exceed max. |
| S8 | Overtime Approvals Lifecycle Complete | AC-19/20/21 | DRAFT→PENDING_SPV→SPV_APPROVED→HR_APPROVED success immutable. HR set approved_minutes=240, then HR Cancel+ revert when NO correction intervence → revert overtime_minutes attendance back original value 0; source_type, ci, co, status unchanged assert.
| **S9** | **OT Revert Conflict Safe Intervened Correction (Rule3 OT part2 NOT blindly overwrite)** + Overtime→Attendance integration gates V3 revised. | **AC-15 Part2 revert OT compare + AC-24** | Assertions MIN 5 sub total: (1) OT approved Jan 1 → attendance row SET overtime_minutes = approved_minutes EXACT; status unchanged (PRESENT from fingerprint). (2) OT date tanpa FP → 0 insert count (NO fake). (3) Conflict scenario simulate: after OT APPROVED (OT expect 240m), HR menjalankan PATCH CORRECTION SET attendance.overtime_minutes = 300 (intervensi later). HR Admin cancel OT request → (a) attendance overtime_minutes TETAP = 300 (NOT blindly overwrite revert back 0 ot 200 snapshot before; expected compare different skip revert). (b) Workflow OT request status = CANCELLED_HR_ADMIN (state changes succeed). (c) Response JSON warning key exist ot_revert_warning contains message sesuai spec; audit log OVERTIME_REVERT_CONFLICT_INTERVENED true inserted. (4) OT Revert non-conflict (no later correction) → revert safe set snapshot before value. (5) SET columns OT apply revert ≤3. 5 all pass = S9 PASS. |
| S10 | KARYAWAN Cross-user IDOR Test Suite (Leave + OT + Balances) | AC-6/AC-26 | 3 sub assertions: (a) GET leave detail id milik B via KARYAWAN A credential → 404 or filtered A only. (b) GET OT request id B via actor A → no leak. (c) leave-balances ?employee_id=other override → enforced return own only. Total cross = 0 data leak B records to A token. |
| S11 | Batch-01 Provenance Non-Regression + Unauthorized Role Access | AC batch-01 carry / TR-26 static | (a) POST attendance browser/manual/face/geo → still 403 (unchanged). (b) FINANCE role (no HR / no Supervisor chain) try access /hr/leave-requests (not own) → 403. Expected: Batch-01 behavior 100% preserved. Unauthorized denied. |

**Completion Evidence**: Runner output `SUMMARY X/Y PASS ALL 11 SCENARIOS PASSED` (TOTAL SCENARIO 11 S1→S11). Total assertions MIN ≥ 40 (S5=6 + S6=5 + S9=5 sub-assertions combined). Exit code 0. Simpan output log sebagai evidence.

---

### 🚦 TASK T16: SCOPE PURITY CHECK + STATIC DIFF PROVENANCE + WHITESPACE (RUBRIC GATE)
**Status**: pending
**Parent AC**: AC-27 rubric score ≥4 PASS / AC-28 test pass.
**TR-26 (rule)**: `git diff a575c1f (or actually baseline da467b6 parent new baseline) -- apps/web/lib/services/attendance-processing-engine.ts -- apps/web/app/api/hr/attendance/route.ts` → lines count diff = 0. Any functional line modification → BLOCK remediation revert required (terkecuali comment whitespace saja — tetapi lebih baik 0).
**TR-27 (rule)**: `git diff --check a575c1f (da467b6 parent) HEAD` → exit 0 whitespace errors = NONE. If 1 trailing space error → fix small amend NO (buat commit fix whitespace baru tersendiri).
**TR-28 (rubric AC-27 scale 1-5 threshold≥4)**: Compute purity manually: count total touched logic non-shared-dep files for categories TECH/NOC/SALES/CS/BILLING/INVENTORY/FINANCE outside HR approval chain:
- 0 touched = SCORE 5
- 1 shared enum touched unavoidable dep = 5 (allowed)
- 1 logic file touched unrelated = 3
- 2+ logic = FAIL score ≤2 → BLOCK remediation revert

---

### 🚦 TASK T17: COMMIT PUSH + INDEPENDENT REVIEW 28 AC → REPORT
**Status**: pending
**Gate Safety Git**: No amend commit apapun. Push origin feature branch TANPA force. Verify local HEAD SHA === remote ls-remote SHA match.
**Independent Review Gate**: Create `review.md` in specs folder. Loop semua 28 AC dari spec.md. masing-masing tulis `[PASS]` / `[FAIL]` + evidence link static/test output commands. WAJIB 28/28 AC PASS untuk merge review. Jika ada FAIL → create pending remediation task back ke task terkait (tidak boleh langsung merge).
**Final Report**: Create `hr-batch-02b-implementation-report.md` 15 sections exact format user dari Batch-02A. Final Gate PRODUCTION READY = NO PERMANENT. MERGE READY conditional all pass.

---

## TASK ORDER SEQUENCE — CANNOT PARALLELIZE DEPENDENCY CHAIN

```
T0 → T1 → T2 → T3 → [T4 parallel T5] → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T15 → T16 → T17
```
(T15 dan T16 setelah compile T13 clean). Tidak boleh lompati step T10 Attendance Integration provenance gate sebelum T7/T9 approval complete karena dependency transition status APPROVED_HR.

## SAFETY CHECKLIST BEFORE IMPLEMENTATION STARTS (On Approve)

- [ ] Force push disabled untuk branch `main` dan `feat/*-hr-*` di GitHub settings (opsional — lakukan manual check or not applicable)
- [ ] No amend commit rule diterapkan, setiap remediation commit baru dengan format pesan `fix(hr-b02b): <scope> description`
- [ ] Semua migration schema-ensure TIDAK ADA auto DELETE duplicate rows apapun. Pattern STOP HARD error auto resolve NO seperti employee_code duplicate preflight Batch-02A
- [ ] TIDAK BOLEH ada HTTP endpoint manapun yang menerima `employee_id` dari KARYAWAN body untuk penentuan scope ownership. Semua identity from session only.
- [ ] **SAFETY #1 NO FAKE ATTENDANCE ROWS**: grep `INSERT INTO hr_attendance` di semua file LEAVE + OVERTIME related (T10 helpers, T11 revert, route handlers) → count MATCHES = ZERO occurrences. Jika ada 1 → FAIL remediation revert required.
- [ ] **SAFETY #2 FORBIDDEN SET FIELDS ZONES**: grep SET column list leave apply/revert: pastikan TIDAK ADA `check_in`, `check_out`, `overtime_minutes`, `locked_by_admin`, `source_type`. grep SET column list OT apply/revert: pastikan TIDAK ADA `check_in`, `check_out`, `status`, `locked_by_admin`, `source_type`.
- [ ] **SAFETY #3 NO CORRECTION 6-COL PATTERN REUSE CLAIM ABUSE**: Setiap UPDATE query leave ≤ 3 fields; overtime ≤ 3 fields. Jangan ada komentar atau logic yang menyebut "boleh ubah field apapun asal ≤ 6 columns" — allowed list harus EXACT.
- [ ] TIDAK ADA SET clause `source_type = 'LEAVE'|'OVERTIME'|'MANUAL'|SOURCE_FINGERPRINT_MACHINE|NULL via explicit SET update (insert engine default NULL allowed tapi SET in update DILARANG KERAS dimanapun di T10/T11 helpers. Pattern grep static 0 occurrences before merge gate.)
