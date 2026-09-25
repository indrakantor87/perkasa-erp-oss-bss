# HR BATCH-01 FORMAL REQUIREMENTS SPECIFICATION
## Employee Master + Attendance Fingerprint Integration
## Perkasa ERP OSS/BSS

### Phase: Specify | Status: Draft Pending Approval

---

## 1. Business Baseline (Source of Truth: User Keputusan Fundamental 22 September 2026)

### Employee Master Decisions
| # | Decision | Detail | Evidence Reference |
|---|---|---|---|
| EM-1 | Data wajib pegawai | Nama Karyawan, ID Karyawan, Email, Nomor HP, Foto KTP / dokumen legal pribadi | User jawaban #1 |
| EM-2 | Struktur organisasi resmi | Unit/Divisi → Team → Jabatan → Atasan (4 level) | User jawaban #2 |
| EM-3 | Status & Riwayat pegawai | ✅ Diperlukan, termasuk riwayat masuk, mutasi, perubahan jabatan, kontrak, keluar | User jawaban #3 |
| EM-4 | Dokumen wajib pegawai | Foto KTP, KK, Ijazah terakhir (3 jenis) | User jawaban #9 |
| EM-5 | Akses dokumen pegawai | ✅ HR ONLY (lihat, ubah, upload, download, hapus) | User jawaban #9 |
| EM-6 | Approval seluruh proses HR | ✅ Approval ke HR (satu level HR approve-semua baseline batch-01) | User jawaban #8 |

### Attendance Decisions
| # | Decision | Detail | Evidence |
|---|---|---|---|
| ATT-1 | Source data absensi | Ambil data langsung dari mesin fingerprint melalui IP mesin di jaringan (ERP initiates pull via network) | User jawaban #4 |
| ATT-2 | Export attendance | ✅ Data absensi harus dapat diekspor ke Excel apabila diperlukan | User jawaban #10 + jawaban #4 |
| ATT-3 | Prioritas Batch-01 | 🔝 Data Karyawan + integrasi absensi dari mesin finger = batch pertama | User jawaban #10 |

### Lembur Decisions (Referensi untuk Payroll Batch Berikutnya)
| # | Decision | Detail | Evidence |
|---|---|---|---|
| OT-1 | Lembur masuk ERP | ✅ Ya, approve = HR, terhubung dengan penggajian | User jawaban #6 |
| OT-2 | Note Batch-01 | ⚠️ OUT OF SCOPE Batch-01. Hanya dicatat sebagai context depedency payroll ownership nanti. | Section 27 |

### Payroll Ownership Decisions
| # | Decision | Detail | Evidence |
|---|---|---|---|
| PAY-1 | Payroll ownership | Finance owner penuh, HR hanya collect dan hitung per-item yang dibutuhkan, diserahkan ke Finance. Finance menu penggajian lengkap = batch berikutnya. | User jawaban #7 |
| PAY-2 | Note Batch-01 | ⚠️ OUT OF SCOPE Batch-01. Absensi batch 01 = prepare source data for Finance payroll calculate nanti. | Section 27 Out of Scope |

---

## 2. Scope

### In Scope Batch-01
1. **Employee Master Data Lengkap:**
   - Core fields 14 item (wajib + conditional exit date) sesuai Section 3
   - Struktur organisasi Unit/Divisi → Team → Jabatan → Atasan (FK relations)
   - Employment status vocabulary + riwayat perubahan (Section 4)
   - Org Units (Division baru → Team tables baru → Position table baru + Supervisor FK self-referencing) (Section 5)
   - 3 dokumen wajib: KTP/KK/Ijazah dengan akses HR-only + audit access (Section 6)
2. **Attendance Data Source:**
   - Device registry mesin fingerprint (name, IP, model, location, status) (Section 9)
   - ERP ↔ Mesin fingerprint direct network connection pull records (Section 8)
   - Employee ERP ↔ Fingerprint enrollment ID mapping (Section 10)
   - Raw attendance records immutable storage (Section 12)
   - Attendance Processing → daily records (Section 13)
   - Sync: Manual SYNC NOW button; Scheduled sync option (decision pending) (Section 11)
   - Duplicate handling & Failed/Partial sync status tracking (Sections 14, 15)
3. **Attendance Operations:**
   - Daily view / Monthly view (Section 16)
   - Excel export attendance (Section 17 — reuse existing `xlsx@0.18.5` library, 26 locations already used in repo)
   - Dashboard HR workspace integration tab attendance
4. **Security, Authorization, Audit (Section 18–20):**
   - Roles: HR full; Employee/TBD; Manager/TBD; Finance NO access batch-01
   - Server-side auth; Document access HR-only isolation; No IDOR; Machine credentials never expose to client
   - Audit trail employee create/update/sync/export (created_by/updated_by/sync_by/exported_by)

### ⚠️ Out of Scope Batch-01
(Full detail di Section 25)
- Payroll calculation engine, Finance payroll UI, BPJS, tax/PPh, bonus, allowance libraries
- Leave/Cuti implementation (Q5 user "Betul" hanya confirmation dibutuhkan, tidak masuk batch-01 priority user #10)
- Overtime workflow approval (simpan field `overtime_hours` saja jika mesin punya data, tidak buat OT request form)
- Recruitment, Performance/KPI full appraisal, Full onboarding/offboarding workflow, LMS, 360 review, career path, biometric match algorithm processing, on-device fingerprint enrollment UI di ERP

---

## 3. Employee Master Requirements

### 3.1 Core Fields

| # | Field | Required | Editable By | Data Type | Business Rule / Validation | Current Schema Support Status |
|---|---|---|---|---|---|
| EM-F1 | Employee ID (employee_code) | ✅ MANDATORY | HR Auto-generate on create, read-only sesudahnya | VARCHAR(50) UNIQUE | ✅ EXISTS — format `EMP-YYYYMM-NNNN` di [employees POST route](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/hr/employees/route.ts#L1-L188). No changes required — preserved. |
| EM-F2 | Employee Name (full_name) | ✅ MANDATORY | HR | VARCHAR(150) NOT NULL | Required ≥ 2 karakter. Trim whitespace. | ✅ EXISTS — `hr_employees.full_name` (XAMPP L649) |
| EM-F3 | Email (email_corporate) | ✅ MANDATORY NEW | HR | VARCHAR(180) UNIQUE | Valid format email. Unique per employee (bukan shared). Jika belum punya, decision: boleh sementara isi email pribadi saat onboarding. | ❌ NOT FOUND. Add new column. Decision pending: boleh pribadi / wajib corporate. |
| EM-F4 | Phone (phone) | ✅ MANDATORY | HR | VARCHAR(30) | Existing field + validasi nomor Indonesia (08xx min 10 digit, +62 otomatis dinormalisasi ke 08) | ✅ EXISTS — `hr_employees.phone`. Tambah validation. |
| EM-F5 | WhatsApp (whatsapp) | OPTIONAL | HR | VARCHAR(30) | Sama validasi phone. Boleh sama dengan phone. | ✅ EXISTS — `hr_employees.whatsapp` L657. Preserved. |
| EM-F6 | Unit/Division (division_id FK) | ✅ MANDATORY | HR | BIGINT FK → org_divisions.id | Resolve via divisionCode (safe pattern existing: lookup code → id). Tidak menerima raw division_id di body. | ✅ EXISTS — `hr_employees.branch_id` + `division_id` FK di [xampp L647-665](file:///d:/trae_projects/perkasa-erp-oss-bss/database/xampp_review_schema.sql#L647-L665). ⚠️ Existing dependency `branch_id` tetap harus diisi (existing schema memiliki branch). Lihat Section 5. |
| EM-F7 | Team (team_id FK) | ✅ MANDATORY NEW | HR | BIGINT FK → NEW org_teams.id | Required. Employee HARUS ter-assign ke 1 team di 1 division. | ❌ NOT FOUND. New relation (lihat Section 5 org structure baru). |
| EM-F8 | Position / Jabatan (position_id FK) | ✅ MANDATORY NEW | HR | BIGINT FK → NEW org_positions.id | Ganti dari position_name free-text VARCHAR (PARTIAL existing) → controlled vocabulary FK master jabatan. | ⚠️ PARTIAL → Upgrade. Existing `hr_employees.position_name VARCHAR(120)` L651 = di-backfill ke FK baru; keep legacy column compatible 1 transisi batch atau drop jika aman addColumnIfMissing pattern. |
| EM-F9 | Direct Supervisor (supervisor_id FK) | ✅ MANDATORY NEW | HR | BIGINT FK → hr_employees.id (self-referencing) | WAJIB terisi (kecuali direktur teratas tanpa atasan = set NULL dengan exception rule: only Director level boleh supervisor_id NULL). Approval HR only baseline batch-01. | ❌ NOT FOUND. New FK. |
| EM-F10 | Employment Status (employment_status) | ✅ MANDATORY UPGRADE | HR | ENUM('PROBATION','PKWT','PKWTT','MAGANG','OUTSOURCE','RESIGNED','TERMINATED','PENSIUN','ARCHIVED') DEFAULT 'PKWTT' | Ganti dari free-text VARCHAR(50) default 'KARYAWAN' menjadi ENUM controlled vocabulary 9 values. Status ARCHIVED = soft delete existing tetap preserved. | ⚠️ PARTIAL free text → Upgrade ENUM + riwayat history table EM-H1. |
| EM-F11 | Join Date (join_date) | ✅ MANDATORY | HR | DATE NOT NULL | Existing preserved. Validation: join_date ≤ today; tidak boleh melebihi termination_date saat di set. | ✅ EXISTS — `hr_employees.join_date` L653 |
| EM-F12 | Contract Information (contract_doc_id + contract_start_date + contract_end_date) | ✅ MANDATORY NEW | HR | contract_doc_id FK → hr_documents.id (ijazah/contract kategori); contract_start_date DATE; contract_end_date DATE NULL for permanent PKWTT | Untuk PKWT: end_date WAJIB + reminder H-30 sebelum habis (notifikasi = batch berikutnya OOS, tapi field disiapkan). Untuk PKWTT permanent: end_date = NULL. | ❌ NOT FOUND. 3 new columns + FK ke dokumen contract jika di-upload sebagai category KONTRAK. |
| EM-F13 | Exit / Termination Date (exit_date) | CONDITIONAL | HR | DATE NULL | Wajib di-SET saat status berubah ke RESIGNED/TERMINATED/PENSIUN. Validation exit_date ≥ join_date. Saat status kembali aktif (rehire): exit_date = NULL + masuk riwayat EM-H8. | ❌ NOT FOUND. New exit_date column + exit_reason TEXT nullable. |
| EM-F14 | Base Salary (base_salary) | OPTIONAL PRESERVED | HR | DECIMAL(15,2) DEFAULT 0 | Existing preserved. Note: Payroll ownership Finance batch berikutnya. Batch 01 hanya simpan source of truth. | ✅ EXISTS — `hr_employees.base_salary` L655 |
| **Branch Dependency Column** | `branch_id FK` → org_branches.id | REQUIRED oleh existing schema | HR | BIGINT | ⚠️ USER DECISION baseline structure (EM-2) tidak menyebut Branch. TAPI existing `hr_employees` memiliki column `branch_id` FK ke `org_branches`. Existing HR API L47-77 employees POST me-resolve branchCode. JANGAN HAPUS. Dokumentasikan sebagai existing dependency. Untuk user: branch tetap implicit bagian dari org structure (seperti sebelum audit). | ✅ EXISTS. Preserved. |
| **Employee ↔ Auth User Relation** | `user_id FK → auth_users.id` (optional nullable) | DECISION REQUIRED LINK | HR + SUPER_ADMIN only mapping | BIGINT NULLABLE UNIQUE | User jawaban #1 tidak menyebut wajib. Tapi fundamental untuk self-service future. Tambahkan column nullable unique, tidak mandatory batch-01 (HR bisa isi manual SUPER_ADMIN). Batch berikutnya jika self-service dibutuhkan. | ❌ NOT FOUND. New nullable FK. UNIQUE constraint 1 auth user hanya boleh menjadi 1 employee. |

### 3.2 Current Schema vs Requirement (Visual Quick Reference)
```
hr_employees EXISTING 14 cols
├── branch_id (FK) ........ ✅ KEEP sebagai existing dependency
├── division_id (FK) ...... ✅ KEEP = Unit/Divisi
├── employee_code UNIQUE .. ✅ KEEP Employee ID
├── full_name ............. ✅ KEEP
├── position_name VARCHAR . ⚠️ BACKFILL → position_id FK (Section 5)
├── employment_status VAR . ⚠️ UPGRADE to ENUM 9 statuses
├── join_date ............. ✅ KEEP
├── base_salary ........... ✅ KEEP
├── phone ................. ✅ KEEP
├── whatsapp .............. ✅ KEEP
├── created_at / updated_at ✅ KEEP
└── id (PK) ............... ✅ KEEP

hr_employees NEW COLUMNS Batch-01 (9 cols):
├── email_corporate VARCHAR(180) UNIQUE .. EM-F3
├── team_id FK org_teams ................. EM-F7
├── position_id FK org_positions ......... EM-F8
├── supervisor_id FK hr_employees self ... EM-F9
├── contract_doc_id FK hr_documents ...... EM-F12
├── contract_start_date DATE ............. EM-F12
├── contract_end_date DATE NULL .......... EM-F12
├── exit_date DATE NULL .................. EM-F13
├── exit_reason TEXT NULL ................ EM-F13
└── user_id FK auth_users UNIQUE NULL .... Future self-service bridge (optional nullable)
```

---

## 4. Employee Status & History

User jawaban #3: "Status & Riwayat pegawai ✅ diperlukan (masuk, mutasi, perubahan jabatan, kontrak, keluar)."

### 4.1 History Events Table (Wajib Batch-01)
**Nama Table Candidate:** `hr_employee_history` (NEW, 1 row per event)

| History Event Type (enum `history_event`) | Minimum Data Tercatat (audit column) | Actor = session user | Timestamp Server |
|---|---|---|---|
| **EM-H1: HIRED / JOINED** | employment_status baru, join_date, base_salary awal, position_id, team_id, division_id, branch_id, supervisor_id | HR yang create employee | created_at server |
| **EM-H2: MUTASI BRANCH / DIVISI PINDAH** | prev_division_id, new_division_id; prev_branch_id, new_branch_id, effective_date, reason | HR update mutation | updated_at |
| **EM-H3: TEAM CHANGE** | prev_team_id, new_team_id, effective_date, reason | HR | updated_at |
| **EM-H4: POSITION / JABATAN CHANGE (Promosi/Demosi/Perubahan Jabatan)** | prev_position_id, new_position_id, effective_date, reason, base_salary_change (jika ada kenaikan gaji sekaligus) | HR | updated_at |
| **EM-H5: SUPERVISOR / ATASAN CHANGE** | prev_supervisor_id, new_supervisor_id, effective_date, reason | HR | updated_at |
| **EM-H6: KONTRAK BARU / PERPANJANGAN KONTRAK** | contract_doc_id, contract_start_date, contract_end_date, contract_type (PKWT/PKWTT), notes | HR upload contract document | updated_at |
| **EM-H7: STATUS KEPEGAWAIAN CHANGE (PROBATION → PKWTT, MAGANG → PKWT, dll)** | prev_status, new_status, effective_date, reason (misal: "Lulus probation 3 bulan") | HR | updated_at |
| **EM-H8: RESIGN / TERMINATE / PENSIUN / KELUAR** | exit_date, exit_type enum(RESIGN/TERMINATE/PENSIUN/LAINNYA), exit_reason, final_payroll_note_link (ke batch berikutnya), supervisor_id saat exit, team/divisi saat exit | HR set status → trigger insert history | updated_at saat status change ke exited |
| **EM-H9: SALARY / BASE_SALARY CHANGE** | prev_base_salary, new_base_salary, effective_date (tanggal berlaku kenaikan), reason, document_ref_sk_kenaikan_gaji (optional FK ke hr_documents kategori SK) | HR | updated_at |
| **EM-H10: REHIRE** | prev_exit_date, rehire_join_date, status baru, reason rehire | HR saat reactivate dari ARCHIVED ke status aktif | updated_at saat reactivate |
| **EM-H11: EMPLOYEE ↔ AUTH USER MAPPING** | prev_user_id, new_user_id, set_by (HR / SUPER_ADMIN), date | SUPER_ADMIN / HR saat mapping | updated_at |
| **EM-H12: CORRECTION** | Manual correction description (koreksi typo nama, dll), field_list yang diubah | HR | updated_at |

### 4.2 Behavior Rules
- **Rule 1:** Setiap UPDATE ke hr_employees kolom status, jabatan, divisi, team, supervisor, gaji, contract = WAJIB insert 1 row riwayat. Tanpa kecuali.
- **Rule 2:** Kolom `detail_json` TEXT nullable = opsional simpan full diff snapshot before/after JSON untuk debugging audit.
- **Rule 3:** Riwayat TIDAK boleh di-UPDATE atau di-DELETE. INSERT ONLY table. (Tidak ada endpoint delete history).
- **Rule 4:** View riwayat 1 employee = hanya HR yang boleh buka tab "Riwayat" di workspace `/hr/employees/[empId]` detail.

### 4.3 History Events Coverage Verification (Gate 0 Reconciliation R3)

**Total 12 History Events (H1 s/d H12) — Semua Sudah Tercatat di Spec:**

| # | Event ID | Nama Event | Covered Di Spec? | Audit Trail Action Type Terkait |
|---|---|---|---|---|
| 1 | **EM-H1** | **HIRED / JOINED** | ✅ **SUDAH COVERED** oleh existing EMPLOYEE_CREATE (audit log action #1) + otomatis insert row H1 saat create employee. | EMPLOYEE_CREATE + (optional EMPLOYEE_HISTORY_EVENT untuk explicit audit log H1). |
| 2 | EM-H2 | MUTASI BRANCH / DIVISI PINDAH | ✅ Covered oleh behavior Rule 4.2 #1. Update division_id/branch_id → trigger insert H2. | EMPLOYEE_UPDATE + EMPLOYEE_HISTORY_EVENT. |
| 3 | EM-H3 | TEAM CHANGE | ✅ Covered Rule 4.2 #1. Update team_id → H3. | EMPLOYEE_UPDATE + EMPLOYEE_HISTORY_EVENT. |
| 4 | EM-H4 | POSITION / JABATAN CHANGE | ✅ Covered Rule 4.2 #1. Update position_id → H4. | EMPLOYEE_UPDATE + EMPLOYEE_HISTORY_EVENT. |
| 5 | EM-H5 | SUPERVISOR / ATASAN CHANGE | ✅ Covered Rule 4.2 #1. Update supervisor_id → H5. | EMPLOYEE_UPDATE + EMPLOYEE_HISTORY_EVENT. |
| 6 | EM-H6 | KONTRAK BARU / PERPANJANGAN | ✅ Covered. Upload contract doc + update contract fields → H6. | EMPLOYEE_UPDATE + EMPLOYEE_HISTORY_EVENT + EMPLOYEE_DOC_UPLOAD (jika upload). |
| 7 | EM-H7 | STATUS KEPEGAWAIAN CHANGE | ✅ Covered Rule 4.2 #1. Update employment_status ENUM → H7. | EMPLOYEE_UPDATE + EMPLOYEE_HISTORY_EVENT. |
| 8 | EM-H8 | RESIGN / TERMINATE / PENSIUN / KELUAR | ✅ Covered. Set status RESIGNED/TERMINATED/PENSIUN + exit_date → H8. (Existing EMPLOYEE_ARCHIVE tetap ada untuk soft archive.) | EMPLOYEE_UPDATE + EMPLOYEE_HISTORY_EVENT + EMPLOYEE_ARCHIVE (jika di-arsipkan). |
| 9 | EM-H9 | SALARY / BASE_SALARY CHANGE | ✅ Covered Rule 4.2 #1. Update base_salary → H9. | EMPLOYEE_UPDATE + EMPLOYEE_HISTORY_EVENT. |
| 10 | EM-H10 | REHIRE | ✅ Covered. Reactivate dari ARCHIVED → status aktif. (Existing EMPLOYEE_REACTIVATE audit tetap ada.) | EMPLOYEE_REACTIVATE + EMPLOYEE_UPDATE + EMPLOYEE_HISTORY_EVENT. |
| 11 | EM-H11 | EMPLOYEE ↔ AUTH USER MAPPING | ✅ **BARU EXPLICIT COVERED oleh AC-11** (ditambahkan R2). POST/PATCH user_id mapping → INSERT H11. | EMPLOYEE_UPDATE + EMPLOYEE_HISTORY_EVENT. |
| 12 | EM-H12 | CORRECTION | ✅ **BARU EXPLICIT COVERED oleh AC-12** (ditambahkan R2). Koreksi typo / patch attendance → INSERT H12. | Scenario A non-attendance: EMPLOYEE_HISTORY_EVENT. Scenario B attendance: EMPLOYEE_ATTENDANCE_CORRECTION (action #29) + EMPLOYEE_HISTORY_EVENT. |

**Kesimpulan R3:** 12/12 = 100% events H1-H12 sudah explicit di spec. H1 = covered existing EMPLOYEE_CREATE. H2-H10 = covered oleh 4.2 Behavior Rules. H11 = covered AC-11 (R2 baru). H12 = covered AC-12 (R2 baru). Tidak ada uncovered gap.

---

## 5. Organization Structure — 4 Level Source of Truth

### 5.1 Struktur Final
```
Unit/Divisi (org_divisions 👉 EXISTING - expanded columns)
        ↓ 1-to-Many
Team (org_teams 👉 NEW TABLE)
        ↓ 1-to-Many
Jabatan (org_positions 👉 NEW TABLE)
        ↓ Many-to-1 (Employee assigned to 1 position)
Employee (hr_employees)
        ↓ Many-to-1 Supervisor FK Self-referencing
Supervisor / Atasan Langsung (hr_employees.id)
```

⚠️ **Existing Branch Dependency:** org_branches TETAP ADA di luar 4 level ini (existing schema dependency). Semua Division → 1 Branch sudah ada. User decisions tidak mention Branch tapi schema HR existing 100% punya branch FK, tidak boleh hapus tanpa migration script besar diluar scope batch-01.

### 5.2 Tables Detail

| Table | Status | Purpose | Key Columns |
|---|---|---|---|
| **org_branches** | ✅ EXISTS KEEP, 0 perubahan column required | Branch Lokasi | id, code UNIQUE, name, address, phone |
| **org_divisions** | ✅ EXISTS, expand minimal + branch FK tetap | Unit/Divisi | id, code UNIQUE, name, **branch_id FK org_branches** (EXISTS preserved) |
| **org_teams** | ❌ NEW Batch-01 | Team dalam Divisi | id (PK), team_code VARCHAR(32) UNIQUE per division, name VARCHAR(100) NOT NULL, division_id FK org_divisions NOT NULL, description TEXT, active TINYINT DEFAULT 1, created_at, updated_at |
| **org_positions** | ❌ NEW Batch-01 | Master Jabatan (controlled vocabulary ganti free text) | id (PK), position_code VARCHAR(32) UNIQUE, position_name VARCHAR(120) NOT NULL, position_level VARCHAR(40) NULL (Staff/Senior/Manager/Head/Director — business decision vocabulary nanti bisa di expand hanya via SUPER_ADMIN master jabatan page), description TEXT, active TINYINT DEFAULT 1, created_at, updated_at |
| **hr_employees.supervisor_id FK** | ❌ NEW Batch-01 | Atasan langsung (self ref) | FK hr_employees.id. CYCLE DETECTION at insert: tidak boleh boss → staff → boss (circular reporting). Rule batch-01 sederhana: supervisor_id != employee_id sendiri. Lebih dari 1 level circular = future validation (OOS Batch 01). |

### 5.3 Existing Master Data Preserve
- Data `org_branches` yang ada SEED cabang HO = TIDAK DIUBAH
- Data `org_divisions` existing row = TIDAK dihapus
- Employee lama yang position_name sudah berisi text = **backfill migration script 1x** saat provision batch: insert row `org_positions` dengan position_code auto generate dari existing unique position_name, lalu update employee.position_id = new position FK PK. Legacy column `position_name` = di-keep 1 batch compatibility (write both sampai UI position FK teruji), setelah batch 01 production verified 2 minggu: deprecated.

---

## 6. Employee Document Management (3 Wajib: KTP / KK / Ijazah Terakhir)

User jawaban #9: "Foto KTP, KK, Ijazah terakhir. Yang berwenang ke dokumen pegawai yaitu HR."

### 6.1 Dokumen Categories
Dokumen = **4 Kategori Batch-01** (3 wajib user + 1 optional contract):
| Doc Category Enum | Required? | Access | Notes |
|---|---|---|---|
| `KTP` | ✅ MANDATORY | HR Only | Foto KTP, max size 5MB per file |
| `KK` | ✅ MANDATORY | HR Only | Foto Kartu Keluarga |
| `IJAZAH_TERAKHIR` | ✅ MANDATORY | HR Only | Ijazah SD/SMA/S1/S2 terakhir |
| `KONTRAK_KERJA` | Conditional (wajib untuk PKWT/PKWTT signed document) | HR Only | Untuk relation EM-F12 contract_doc_id FK |
| `LAINNYA` | Optional | HR Only | Cadangan batch-01 untuk user upload SK kenaikan, dll tanpa butuh schema baru |

### 6.2 Dokumen Table Candidate
**Table:** `hr_documents` NEW

| Metadata Column | Requirement | Security Note |
|---|---|---|
| id (PK) | AUTO_INCREMENT BIGINT | - |
| employee_id FK hr_employees | NOT NULL, cascade delete jika employee di-hard-delete (hard delete = future, batch 01 soft archive saja) | ❌ NO public URL pattern |
| doc_category ENUM di atas | NOT NULL | - |
| original_filename | VARCHAR(200) NOT NULL (contoh: KTP_EMP001_Andi.pdf) | Tidak expose storage path asli ke client |
| storage_ref_internal VARCHAR(500) | NOT NULL — Internal server path or storage URI. JANGAN return ke client; hanya internal service yang resolve ke binary stream | 🔴 Server side only. Client API hanya dapat download via `/api/hr/documents/[docId]/download` yang AUTH CHECK + log access. |
| file_size_bytes BIGINT | Audit | - |
| mime_type VARCHAR(80) | image/jpeg, image/png, application/pdf saja. Batch 01 block .exe/.zip/.dll. | Content validation server side. |
| uploaded_by_user_id FK auth_users | NOT NULL. Diambil dari SESSION, bukan body. Tamper proof. | ✅ Pattern existing audit actor |
| uploaded_at | DATETIME NOT NULL default CURRENT_TIMESTAMP | - |
| last_accessed_at | DATETIME NULL. Updated setiap kali di-download atau HR buka preview (jika preview ada). Audit. | - |
| checksum_sha256 | VARCHAR(64) NULL — optional, untuk anti-tamper. Bisa isi NULL batch-01, future isi. | Anti-manipulasi dokumen legal |

### 6.3 Document Operations & Access Control

| Operation | HR | Employee Self? | Manager/Atasan? | SUPER_ADMIN | Security Rule |
|---|---|---|---|---|---|
| Upload KTP/KK/Ijazah/Kontrak | ✅ | ❌ (Batch 01 self upload OOS. Future batch 02+ bisa enable) | ❌ | ✅ | Server side validation ≤ 5MB, allowed mime only. Checksum optional |
| View List dokumen per employee | ✅ Hanya employee HR bisa list semua 4 kategori dokumen milik siapa saja | ❌ Batch 01 TIDAK boleh lihat sendiri via self-service (akses dokumen pribadi = kerahasiaan → decision future OOS) | ❌ Manager tidak boleh lihat KTP/KK bawahan (privasi) | ✅ | Authorization: role check `session.role IN HR, SUPER_ADMIN` → else 403. |
| Download file | ✅ | ❌ (OOS) | ❌ | ✅ | Setiap download insert row ke audit table download log 6.4. Content-Disposition: attachment; filename=KTP_EMPxxxx_xxx.pdf. Tidak serve static folder public. |
| Replace file (versi baru KTP saat perpanjangan) | ✅ | ❌ | ❌ | ✅ | Soft replace: JANGAN hapus versi lama. TAMBAH row baru dengan tanggal upload baru. Lama tetap tersimpan sebagai history (di UI tampilkan riwayat versi, default tampil terbaru). |
| Soft Delete / Mark Inactive | ✅ | ❌ | ❌ | ✅ | TIDAK ada hard delete row. Tambah column `active TINYINT DEFAULT 1`. Delete = set active=0 + audit by who when. Storage file bisa bersih nanti dengan cleanup script 6 bulan non-active (manual ops). |
| Public unauthenticated access URL | ❌ NEVER | ❌ | ❌ | ❌ | 🔴 NO signed URL public. Semua access via authorized API download only. |

### 6.4 Audit Trail Dokumen (Wajib Batch-01)
**Table New:** `hr_document_access_logs` — setiap view metadata / download / replace / delete = insert 1 row.
Columns: id, document_id FK hr_documents, action_type ENUM(VIEW_METADATA, DOWNLOAD, REPLACE_NEW_VERSION, MARK_INACTIVE, UPLOAD), actor_user_id FK auth_users, actor_ip VARCHAR(45) NULL, accessed_at DATETIME, client_user_agent VARCHAR(255) NULL.

### 6.5 Storage Backend
- **Current State Evidence:** Belum ada storage engine document dedicated untuk HR. Zero file upload endpoints untuk HR (hanya sales support ticket evidence + import center upload existing, tapi untuk CSV/Excel/PDF ticket).
- **Business Decision Required (Section 26 OB-6):** User harus pilih opsi storage, tapi default batch-01 candidate:
  → **Option A (Recommended Default MVP):** Server Local Disk dalam folder khusus `apps/web/storage/hr_documents/[employee_id]/` dengan OS level permissions ketat (chmod 600). DILUAR folder public. Tidak di-serve Next static, hanya via stream controller authorized.
  → **Option B:** Object Storage (S3/MinIO/GCS) untuk production (opsi infra decision, OOS decide nanti). FRS menggunakan pattern storage_ref_internal abstraction, jadi mudah ganti backend nanti tanpa rubah kode client.
- **Enkripsi at-rest:** Decision OPS, tapi sebagai NFR security future: jika mengatur PDP Law No 27/2022 KTP = data rahasia personal. Sebaiknya enkripsi. Tapi batch 01 tidak enforce enkripsi wajib (decision infra).

---

## 7. Attendance Requirements

### 7.1 Business Flow Target (sesuai User Section 10)
```
Mesin Fingerprint di Jaringan LAN kantor (via IP statis)
        ↓ Pull via Network Protocol TBD
ERP Attendance Connector (server side, TIDAK client browser)
        ↓ validate
Raw Attendance Log Immutable (Section 12)
        ↓ Processing Rule Engine Section 13
Processed Daily Attendance per Employee per Date
        ↓
Daily Recap / Monthly Recap Views
        ↓
Excel Export Section 17
```

### 7.2 Attendance Core Requirements vs Current System
| Requirement | Current System (Audit) | Status Support |
|---|---|---|
| Data source = mesin fingerprint network pull | **FINGERPRINT MACHINE ONLY — NO Browser, NO Manual, NO Face, NO GPS/Geofence.** Existing legacy Browser Geo + Face upload di-nonaktifkan/DI-TOLAK 403 oleh route attendance. | ✅ **FINGERPRINT ONLY IMPLEMENTED.** Non-fingerprint create rejected via 403. Hanya processing engine dari hr_fp_raw_events (via MockConnector / real connector HW-spec) yang dapat menciptakan hr_attendance. |
| Daily per-employee attendance clock IN / OUT | ✅ EXISTS — hr_attendance table L667 check_in/check_out | ✅ REUSE existing table. Canonical source_type = SOURCE_FINGERPRINT_MACHINE SATU-SATUNYA. Legacy SOURCE_BROWSER (data lawas) otomatis di-upgrade normalize ke SOURCE_FINGERPRINT_MACHINE saat re-process. Correction = TIDAK MENGUBAH source_type; correction hanya audit EMPLOYEE_ATTENDANCE_CORRECTION dengan BEFORE/AFTER snapshot (NOT a source method). |
| Status 4 ENUM PRESENT/SICK/PERMIT/ALPHA | ✅ EXISTS hr_attendance.status (LATE missing, OOS batch 01 processing rule simple) | ✅ KEEP ENUM; LAMBAT = future batch OOS |
| Overtime hours DECIMAL field | ✅ EXISTS overtime_hours L677 | ⚠️ Keep field, tapi OT workflow request form = OOS. Jika mesin punya event IN下班后 extra clock = masuk overtime_hours (jika bisa mapping dari type event TBD). |
| Locked by admin (manual koreksi) | ✅ EXISTS locked_by_admin TINYINT L679 | ✅ Keep. Rules: processed FROM fingerprint → default locked_by_admin=0. HR bisa klik "Lock Final" 1x setelah review → tidak berubah di sync berikutnya. |

---

## 8. Fingerprint Integration Requirements

### 8.1 Integration Pattern
ERP sebagai **Initiator Pull:**
```
ERP Server (private network / VPN reachable)
  → open TCP/HTTP connection to:
     Machine IP (statis perangkat, user isi di device registry)
     Machine Port (TBD tergantung vendor Section 27 HW-2)
     Auth (if required: password / token / SDK key Section 27 HW-5)
  → Query: Get all attendance events since last_sync cursor
  → Terima response packet data mentah
  → Validate format
  → Normalize ke struktur Raw Attendance (Section 12)
  → Deduplicate (Section 14)
  → INSERT raw
  → Trigger Processing (Section 13)
  → Update last_sync cursor + status SUCCESS/PARTIAL/FAILED (Section 15)
```

### 8.2 Why Pull not Push?
- Kebanyakan mesin fingerprint Indonesia default = TCP server protocol (ZKTeco/zketco/ZKSoftware = default TCP port 4370/80 push SDK command). ERP pull = common pattern.
- Jika ternyata model mesin = HTTP REST API, pull via HTTP GET with basic auth = juga support dengan connector adapter pattern (1 abstract interface → 2 adapter implementations TCP/HTTP).
- **FRS Design Pattern Connector Abstraction:**
  → `interface FingerprintMachineConnector { connect(), getAttendanceRecords(since: Date): Promise<RawFingerprintEvent[]>, testConnection(): Promise<boolean> }`
  → Concrete nanti ada `ZKTecoTCPConnector`, `GenericHTTPConnector`, dll sesuai vendor baru diketahui (HW spec required).
- **HARDWARE SPECIFICATION REQUIRED** (semua field TBD di Section 27): Vendor, Model, Protocol, Port, Auth. TANPA info ini = implementasi connector tidak bisa jalan. FRS tidak mengarang vendor. Hanya contract interface.

### 8.3 Security Rules for Connection (Wajib Batch 01)
1. **Credential Storage:** All machine password / token / comm_key disimpan di column `auth_config_encrypted TEXT` menggunakan server-side encryption (key from env FINGERPRINT_MACHINE_ENCRYPTION_KEY). TIDAK BOLEH plaintext.
2. **Never expose ke client browser:** List machine device admin HR hanya menampilkan: "Tersimpan ✓" untuk password, tidak pernah return value ke response API manapun (bahkan SUPER_ADMIN sekalipun via browser inspect tab network).
3. **Network Isolation assumption:** ERP server berada di LAN yang sama / VPN / dedicated VLAN ke mesin fingerprint. Jika tidak = user sediakan IT infra connectivity. ERP tidak handle tunnel setup.
4. **Timeouts:** Connection timeout default = 8 detik; jika > 8 detik → connection failed (Section 15 SYNC FAILED). Configurable per device advanced.

---

## 9. Device Registry Requirements (Mesin Fingerprint Management Page)

Device Registry = 1 halaman master di workspace `/hr/attendance` → sub-tab "Perangkat Fingerprint". Hanya HR (full CRUD) + SUPER_ADMIN. Finance / Employee / Manager = NO access (default deny).

### 9.1 Device Candidate Fields Table (11 Fields)
**New Table Candidate:** `hr_fp_machines`

| # | Field | Required | Notes / Status |
|---|---|---|---|
| DM-1 | Device Name (machine_name) | ✅ YES | Contoh: "Fingerprint HO Lantai 1", "Fingerprint Cabang Bandung". VARCHAR(120) NOT NULL |
| DM-2 | IP Address (ip_address) | ✅ YES | IPv4 atau IPv6. Validasi regex format IP. Contoh: `192.168.1.120`. Unicity: (ip_address, port) UNIQUE combination (boleh IP sama, port beda untuk 2 virtual mesin jarang — default 1 IP 1 port). |
| DM-3 | Network Port (port) | ⚠️ HARDWARE DEPENDENT | INTEGER 1-65535. Default candidate umum ZKTeco TCP = `4370` (pre-fill di UI helper text "Port default umum ZKTeco: 4370. HTTP API umum: 80 atau 443. Cek manual mesin fingerprint."). User yang confirm value benar. |
| DM-4 | Device Model (machine_model) | ✅ YES | VARCHAR(100) NOT NULL. Contoh user harus isi: "ZKTeco K40", "ZKTeco G3". Digunakan untuk memilih connector adapter. |
| DM-5 | Location / Deskripsi Lokasi | ✅ YES | TEXT. "Lantai 1 lobby HO", "Pintu masuk kantor cabang Surabaya". Opsional relation ke branch_id FK org_branches (existing optional). |
| DM-6 | Active / Inactive Status | ✅ YES | TINYINT DEFAULT 1. Scheduler hanya pull dari device active=1. |
| DM-7 | Last Sync Timestamp (last_sync_at) | ✅ YES | DATETIME NULL. Auto-update setiap sync berhasil (jika SUCCESS atau PARTIAL — tidak update jika FULL FAILED). Sebagai cursor ambil data dari mesin TANPA ambil ulang record lama (performance). |
| DM-8 | Connection Status (last_connection_status) | ✅ YES | ENUM('ONLINE','OFFLINE','SYNC_ERROR','AUTH_FAILED','UNKNOWN') DEFAULT 'UNKNOWN'. Di-update setiap test connection / sync attempt. |
| DM-9 | Sync Method (sync_method) | ⚠️ HARDWARE DEPENDENT ENUM | ENUM('TCP_ZKTECO_SDK','HTTP_REST_API','MANUAL_CSV_IMPORT','OTHER'). Default preselect TCP_ZKTECO_SDK jika model match ZK prefix. User override. OTHER = catatan custom text. (TBD, lihat Section 27 HW decisions.) |
| DM-10 | Timezone mesin (device_timezone) | ✅ YES | VARCHAR(40) DEFAULT 'Asia/Jakarta'. Wajib ada karena jam mesin bisa salah setting → saat normalize ke UTC / Asia/Jakarta ada correction factor. |
| DM-11 | Machine Auth Configuration (auth_config_encrypted) | ✅ YES | TEXT ENCRYPTED — menyimpan comm_key / admin_password / basic_auth_username:password base64. Selalu decrypt server-side only. Tidak pernah dikirim ke API response GET device list (return "•" bullet). Encryption key env var. |
| DM-12 | Notes TEXT | OPTIONAL | TEXT. Catatan admin HR: "Mesin restart setiap minggu malam Minggu", dll |
| DM-13 | FK branch_id Optional | OPTIONAL | BIGINT FK org_branches. Untuk laporan perangkat per cabang. |

### 9.2 Device Actions UI/API Wajib
1. **Test Connection Button (PING machine):**
   → HR klik Test. Jalankan connector connect(). Timeout 8 detik. Return result: "Berhasil terhubung! Mesin merespons. Versi firmware: X". Jika gagal: pesan error specific: "Connection Refused (firewall / IP salah?)" / "Authentication Failed (password salah?)" / "Timeout (IP tidak reachable dari server ERP?)".
2. **Manual SYNC NOW button:** (Section 11)
3. **View Device Sync History:** 50 sync terakhir untuk device itu — status, waktu, records pulled, errors.
4. **CRUD Device:** Create/Read/Update/Delete (soft-delete active=0). HR role only. Delete device tidak menghapus data raw attendance yang sudah di-pull.

---

## 10. Employee ↔ Fingerprint Identity Mapping

⚠️ Fundamental mapping problem: Employee di ERP punya `employee_id` (bigint PK) dan `employee_code` (EMP-202609-0001). **Mesin Fingerprint punya ID user internal sendiri (enrollment_id / machine_user_id biasanya integer 1-9999 saat di-enroll di perangkat).** Kedua sistem ini = berbeda ID.

### 10.1 Mapping Requirement
**New Table Candidate:** `hr_fp_employee_mappings`

| Column | Required | Description |
|---|---|---|
| id PK | ✅ | BIGINT |
| machine_id FK hr_fp_machines | ✅ | 1 employee bisa terdaftar di beberapa mesin? → lihat Section 27 HW-4 decision user. |
| employee_id FK hr_employees | ✅ | Employee ERP target. |
| machine_user_id (VARCHAR 40) | ✅ | ID user di dalam mesin fingerprint (string karena beberapa mesin pakai string enrollment ID bukan integer). |
| enrollment_status ENUM('ENROLLED','REVOKED','PENDING') | ✅ | DEFAULT 'ENROLLED'. Jika employee resign → set REVOKED → tidak diproses event dari ID itu lagi meskipun mesin kirim. |
| enrolled_at DATETIME | ✅ | Timestamp. |
| revoked_at DATETIME | Conditional | Saat resign / pindah perangkat. |
| notes TEXT | Opsional | "Sidik jari 1 tangan kanan", dll. |
| created_by_user_id FK auth_users | ✅ | Session. |

### 10.2 Business Rules (Unresolved TBD di Section 26 + HW decisions)
| Rule ID | Question / Rule | Status Decision Required? |
|---|---|---|
| MP-1 | Satu Employee → 1 fingerprint ID per 1 mesin? Ya/ Tidak? | TBD HW-4 & OB-3. Default allow 1 emp → N mapping N mesin = user cabang sering pindah. Unique constraint = (machine_id, machine_user_id) unique per device (1 id di 1 mesin tidak boleh jadi 2 employee). |
| MP-2 | Satu employee → BISA terdaftar di BEBERAPA mesin fingerprint? (Contoh: staff HO lantai 1 & 3 punya 2 mesin, tap di mana saja = masuk.) | TBD HW-4. Default: YA allow many. |
| MP-3 | Perlu history mapping bila employee ganti mesin / re-enroll karena jari terluka? | TBD OB-4. Default: YA, insert row baru enrollment_status=ENROLLED, row lama set REVOKED, tidak dihapus. Riwayat. |
| MP-4 | Saat event mentah dari mesin TIDAK DAPAT di-map ke employee (ID di mesin tidak ada di mapping table). Bagaimana behavior? → TBD Section 15 Sync Fail Rule. | TBD OB-5. Default: Catat di raw log dengan status UNMAPPED_ID. Tampilkan di dashboard warning "Ada N records belum ter-mapping. Mohon mapping ke employee." |

---

## 11. Sync Requirements

### 11.1 Sync Modes Option
| Mode | Description | USER DECISION REQUIRED (Section 26 OB-1)? |
|---|---|---|
| **Manual Sync** | HR klik tombol "SYNC NOW" di Device Registry / Attendance Tab → Pull sekarang juga. | ✅ ALWAYS INCLUDED Batch-01. Tidak butuh scheduler. |
| **Scheduled Sync (Periodic Pull)** | ERP otomatis pull pada interval, misal: setiap 15 menit dari jam 07:00 s/d 20:00 setiap hari kerja. | ⚠️ **DECISION REQUIRED OB-2.** Jika YA: butuh implementasi cron job (belum ada pattern cron server-side existing di repo — Section 21 dep). Manual trigger selalu tersedia meskipun scheduled ON. |
| **Both** | Manual click Kapan saja + Scheduler background otomatis. | Recommended default. |

### 11.2 Sync Behavior Universal
Setiap sync run (manual / scheduled) = **HARUS insert 1 row ke `hr_fp_sync_runs`** sebagai log audit:
- sync_run_id, machine_id FK, started_at, finished_at, sync_mode ENUM(MANUAL,SCHEDULED), actor_user_id FK auth_users (NULL for scheduled), total_records_fetched, total_new_valid, total_duplicates_skipped, total_unmapped, total_failed_parse, final_status ENUM(SUCCESS, PARTIAL, FAILED), error_summary TEXT (if FAILED/PARTIAL).

### 11.3 Manual Sync = Wajib Batch 01 Always Include.
- UI 2 tempat: (1) di Detail 1 perangkat ada button "Sync Sekarang", (2) di Attendance overview ada button global "Sync Semua Mesin Aktif" → iterasi semua device active=1, pull parallel.
- Scheduled Sync = Optional Toggle ON/OFF per device.

---

## 12. Raw Attendance Requirements (Immutable Storage!)

**Aturan 🔴 PENTING:** Raw data dari mesin fingerprint = **IMMUTABLE NEVER UPDATE / NEVER DELETE.** Sebagai bukti elektronik jika ada perselisihan ketenagakerjaan / PHK / gaji.

### 12.1 Raw Event Table Candidate
**Table New:** `hr_fp_raw_events` (INSERT ONLY, TIDAK BOLEH ada UPDATE endpoint / DELETE endpoint.)

| Raw Column | Requirement | Description / Mapping |
|---|---|---|
| id PK | ✅ | BIGINT |
| sync_run_id FK hr_fp_sync_runs | ✅ | Dari sync mana record ini berasal. Audit. |
| machine_id FK hr_fp_machines | ✅ | Dari mesin mana. |
| machine_user_id (asal mesin) VARCHAR(40) | ✅ | Mentah dari perangkat, sebelum mapping. |
| employee_id FK hr_employees | ✅ NULLABLE | Setelah mapping diisi. Jika tidak ketemu mapping = NULL + unmapped_flag=1. |
| event_timestamp_original DATETIME | ✅ | Waktu event ASLI dari mesin (BELUM dikoreksi timezone). Untuk audit perbandingan kalau jam mesin salah. |
| event_timestamp_normalized DATETIME Asia/Jakarta | ✅ | Hasil normalize timezone. Yang dipakai ke Processing Engine Section 13. |
| event_type_raw VARCHAR(40) | ✅ NULLABLE | Tipe event dari mesin kalau ada: (FINGERPRINT_VERIFY / FINGERPRINT_FAIL / CARD / PASSWORD / DOOR_OPEN / IN_CHECK / OUT_CHECK). Beberapa mesin kirim kode angka 0/1. Kita simpan nilai mentah dan value string. |
| event_mode ENUM('IN','OUT','UNDEFINED') | ✅ ENUM HASIL CLARIFY | Default UNDEFINED. Clarify rule nanti: jika ≤ 12:00 = IN, >12:00 = OUT atau aturan pin 1 = In, 2 = Out (TBD per mesin). |
| verify_score INT NULL | Opsional | Score match fingerprint (kalau mesin kirim). 0-100. |
| raw_payload_json TEXT | ✅ | JSON full packet mentah dari mesin disimpan apa adanya — untuk debug kalau nanti ada parsing error. JANGAN diparsing untuk query, simpan saja. |
| received_at DATETIME | ✅ | Waktu server ERP menerima record. |
| deduplication_hash CHAR(64) UNIQUE | ✅ SHA256(machine_id, machine_user_id, event_timestamp_original, event_type_raw) | Untuk Section 14 Duplicate Handling unique constraint. |
| is_processed TINYINT DEFAULT 0 | ✅ | 0 = raw belum masuk processed attendance. 1 = sudah masuk ke hr_attendance via engine processing. 2 = warning skipped duplicate atau unmapped. |
| is_unmapped TINYINT DEFAULT 0 | ✅ | 1 = employee mapping tidak ditemukan. Ditampilkan warning ke HR untuk diperbaiki mapping. |
| processing_notes TEXT | Opsional | Alasan di-skip / error. |

### 12.2 Raw vs Processed Distinction (JANGAN SAMAKAN)
- **Raw = bukti elektronik.** Tidak bisa hilang. Original. 100 events dari mesin = 100 rows masuk. Insert saja.
- **Processed = 1 row per employee per tanggal.** (Section 13.) 1 employee 3 kali tap masuk 1 pagi → di raw ada 3; di processed = clock_in = earliest dari 3 itu (termasuk).
- **Delete Protection:** DB trigger atau app-level service check. Tidak ada DELETE function untuk raw table di code manapun. Jika ingin clean up ≥ 7 tahun = script DBA separate SUPER_ADMIN manual. Compliance retention (TBD Section 26 OB-13).

---

## 13. Attendance Processing

Pisahkan jelas:
```
RAW FINGERPRINT EVENT (1 row per tap)
  ↓ 🔧 Processing Engine Run Setiap Selesai Sync
PROCESSED DAILY ATTENDANCE (1 row per employee per tanggal) → hr_attendance existing table
  ↓ Masuk ke UI / Excel Export
```

### 13.1 Processing Rules Batch-01 Sederhana (TIDAK masuk logic shift / libur / terlambat = OOS Batch-02)
| Rule | Description | Catatan Scope |
|---|---|---|
| PR-1: Clock In = min(event_time) hari itu yang event_mode=IN atau UNDEFINED sebelum jam 12:00 | Tap masuk terkecil = clock_in di hr_attendance.check_in | Simpel. Jika nanti ada aturan 1x tap IN dan 1x OUT (shift baru jelas) = refine. |
| PR-2: Clock Out = max(event_time) hari itu event_mode=OUT atau UNDEFINED setelah jam 11:00 | Tap keluar terbesar = check_out di hr_attendance.check_out | Bisa NULL jika employee hanya tap 1x pagi saja tidak tap sore (lupa). Tampilkan warning badge "⚠️ Hanya Tap 1 Kali" di UI attendance. |
| PR-3: Status default = PRESENT jika setidaknya ada 1 event IN pagi. | Jika ada events untuk hari itu employee → hr_attendance.status = 'PRESENT' ENUM. | Aturan SICK/PERMIT = tetap manual HR set saat koreksi. (Leave/Overtime Batch 01 OOS. Integrasi data cuti ke processing = future batch 02 OOS.) |
| PR-4: Alpha = tidak ada events sama sekali, atau mapping = unmapped → TIDAK otomatis insert ALPHA record | 🔴 Hati-hati jangan false ALPHA karena mesin mati 1 hari atau network putus. Batch 01: tidak auto-create ALPHA rows. HR harus manual review "Hari ini tidak ada data dari mesin X?". Future batch job OOS. |
| PR-5: Idempotent. Reprocessing 10x data raw yang sama → processed rows tidak berubah (tidak duplicate karena UNIQUE(employee_id, attendance_date) existing hr_attendance). | Update hr_attendance existing jika raw clock_out ada data lebih lengkap daripada existing. TAPI JIKA locked_by_admin = 1 → JANGAN sentuh (skip update). | Protection terhadap HR yang sudah kunci final. |
| PR-6: Overtime Hours = TIDAK otomatis hitung Batch-01 (butuh shift + jam pulang normal = future). | Tetap field ada di hr_attendance.overtime_hours seperti existing. HR isi manual. (OT form workflow OOS batch 01). | Di UI attendance tampilkan field OT, edit manual HR saja. |

---

## 14. Duplicate Handling

Duplicate didefinisikan sebagai: **same machine_id + same machine_user_id + same event_timestamp_original + same event_type_raw.**

### 14.1 Mechanism
- Kolom `deduplication_hash` = SHA256 ke-4 parameter di atas.
- MySQL UNIQUE INDEX `uq_hr_fp_raw_events_dedup_hash` pada deduplication_hash.
- Saat INSERT: `INSERT IGNORE` atau `ON DUPLICATE KEY UPDATE is_processed=is_processed` — no error. Return counter "125 records fetched: 100 new + 25 duplicates skipped".
- Sync run log: `total_duplicates_skipped` kolom terisi.

### 14.2 Multi-Machine Corner Case
Jika Employee X tap di Mesin A (HO lobby) 07:55 dan Mesin B (HO lantai 3) 07:56 pagi yang sama → HASH berbeda (machine_id beda) → keduanya masuk raw. Processing Engine: Clock IN = earliest = 07:55 dari Mesin A. Record Mesin B ada di raw, tidak masuk processed clock_in (sudah ada earlier tap). Normal. Tidak duplikat.

---

## 15. Failed / Partial Sync Behavior

### 15.1 Sync Result Status Enum
| Status | Kapan Terjadi | Behavior Followup |
|---|---|---|
| ✅ **SYNC SUCCESS** | Semua device connected, semua record > threshold valid (unmapped ≤ 5% tolerated warning ≤ 10%). | Update last_sync_at = now; connection_status='ONLINE'. HR toast: "Sync berhasil. N records ditambahkan." Tampilkan warning jika unmapped > 0. |
| ⚠️ **SYNC PARTIAL** | Connected OK, tapi: Beberapa record parse failed format / ≥ 10% adalah unmapped IDs / sebagian batch berhasil sebagian. | Update last_sync_at YES; connection_status='SYNC_ERROR'. Log hr_fp_sync_runs.final_status='PARTIAL' + error_summary. Tampilkan panel warning ke HR: "Partial sync. Ada 12 data pegawai dengan ID mesin tidak terdaftar. Mohon mapping di halaman perangkat." |
| ❌ **SYNC FAILED** | Device offline, IP salah, connection timeout, firewall blocked, auth failed, port wrong, crash parsing. | JANGAN update last_sync_at. connection_status ke value tepat: OFFLINE (timeout/no route), AUTH_FAILED (wrong password), SYNC_ERROR (other). error_summary TEXT = sejelas mungkin (copy paste dari error exception yang user-friendly). Tampilkan red banner. |

### 15.2 Error Handling Matrix Detail
| Exception Scenario | Connection Status | User Friendly Error Messaging |
|---|---|---|
| Connection Timeout 8s / No route to host / Host unreachable | OFFLINE | "Tidak dapat terhubung ke mesin fingerprint di IP {ip}:{port}. Periksa: (1) Apakah IP benar? (2) Apakah server ERP dapat menjangkau LAN mesin? (3) Firewall mesin memblok? (4) Mesin fingerprint hidup?" |
| Connection Refused (port salah / service mati di mesin) | OFFLINE | "Koneksi ditolak {ip}:{port}. Kemungkinan PORT salah (default ZKTeco: 4370) atau mesin fingerprint service fingerprint tidak berjalan." |
| Authentication Failed (wrong comm key / admin password) | AUTH_FAILED | "Otentikasi mesin fingerprint ditolak. Periksa password/comm_key device." |
| Malformed Record / Unknown Packet Structure | SYNC_ERROR (PARTIAL jika record lain valid; FAILED jika semua broken) | "Ada {n} record format data tidak dikenali. Dilewati. Versi firmware mesin mungkin tidak didukung connector. Cek setting atau contact vendor." |
| Total Unmapped > 10% records in sync batch | SYNC_ERROR PARTIAL | "{n} record tidak dapat dicocokkan ke data pegawai. Buka halaman Device → Mapping untuk daftar ID mesin belum terdaftar dan mapping ke employee." |
| MySQL Duplicate throw (kalau unique index violation non-dedup) | FAILED | "Internal constraint error. Duplicate raw data (tidak seharusnya terjadi). Hubungi tim IT / catat di log error." |
| Unknown Exception Any | SYNC_ERROR | "Error sinkronisasi: {user_friendly_message}. Details ada di log sync." |

### 15.3 Recovery Behavior
Kedua sync berikutnya, cursor last_sync_at TIDAK di-advance jika FAILED. Artinya: failed sync → coba lagi NANTI, data yang terlewat akan di-RE-PULL dari mesin pada sync berikutnya dengan cursor lama. Tidak kehilangan data. (Jika mesin fingerprint menyimpan history. Beberapa mesin hanya simpan N ribu record. User harus pastikan sync rutin sebelum buffer penuh. Decision infra notifikasi saat buffer mendekati penuh = OOS future.)

---

## 16. Attendance Reporting

### 16.1 Daily Report View (Sudah ada di tab Attendance workspace HR = tambah kolom source fingerprint)
Per baris per employee per tanggal:
| Column | Source | New/Existing |
|---|---|---|
| Employee Name, Code, Position, Division, Team | hr_employees join | Existing |
| Attendance Date | attendance_date | Existing |
| Clock IN (Asia/Jakarta format HH:mm:ss) | check_in dari processed hr_attendance | Existing + tambah badge SOURCE: 🖐️ Browser / 👆 Mesin Fingerprint (berdasarkan new kolom source_type ENUM). |
| Clock OUT | check_out | Existing + badge source |
| Worked Hours = (clock_out - clock_in) jika keduanya ada | Calculated | NEW Column UI display (tidak harus disimpan di DB, calculated on fly) |
| Status (PRESENT/ALPHA/...) | hr_attendance.status ENUM | Existing |
| Tap count = N events di raw hari itu | Count from raw table | NEW Badge info |
| Locked By Admin? | locked_by_admin | Existing visual lock icon |
| Actions | Koreksi manual HR (existing patch attendance API), View raw events detail modal | Expand existing: add modal "View 5 raw events hari ini" untuk debug disputes. |

### 16.2 Monthly Recap Periode (New Tab / New View)
Filter: Month (YYYY-MM) + Optional: Division / Team / Individual Employee.
Row per employee per month:
1. Total Hari Kerja in month (hari kerja di periode tanpa Minggu/tanggal merah? Batch-01 = hari kalender saja minus Minggu. Libur nasional = future Batch 02 OOS libur table).
2. Hadir (PRESENT count)
3. Tanpa Keterangan (ALPHA count) / Tidak ada data
4. Sakit (SICK)
5. Izin (PERMIT)
6. Total Tap 1x Hanya Pagi (warning incomplete) count
7. Total Overtime hours (sum existing overtime_hours)
8. Average clock in time, average clock out (informasi)

### 16.3 Attendance Dashboard 3 Summary Cards (Existing expand)
- Sudah ada "Attendance Hari Ini" di overview (domain-service L1390 count). Expand: add "Unmapped events need mapping" badge warning count.
- New card "Mesin Fingerprint Online / Offline Summary" — device count active, online status last check.

---

## 17. Excel Export Attendance

### 17.1 Requirement User: "Export attendance ke Excel apabila diperlukan."
**Library Existing Reuse Evidence:** `xlsx@^0.18.5` installed in [apps/web/package.json L38](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json#L38). Sudah dipakai di 26 existing locations:
- Sales export: [psb-lists export route](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/app/api/sales/psb-lists/export/route.ts#L240)
- Inventory reports: [inventory-report-page.tsx L5](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/inventory-report-page.tsx#L5)
- Import templates generator: [marketing-activity-manager L401](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/components/marketing-activity-manager.tsx#L401) (contoh writeFile workbook template).

✅ **TIDAK PERLU dependency baru.** Reuse 100% existing library + existing patterns (instantiate workbook server-side route or client side). For performance 5k+ rows → server side API endpoint generate & download (mirip psb-lists export pattern route handler dengan canPerformAction permission).

### 17.2 Export Parameters UI Form
HR click button "Export Excel" → muncul modal filter:
1. **Periode Tanggal:** Date range From → To (required). Validasi To ≥ From, range ≤ 90 hari (kawal performance). Default: Month-to-date (awal bulan s/d hari ini).
2. **Optional Filter Division (Unit/Divisi):** Default = Semua. Jika pilih 1 divisi = hanya employee divisi itu.
3. **Optional Filter Team:** Default = Semua dalam Divisi.
4. **Optional Filter Individual Employee:** Default = semua.
5. **Format Export:** Radio:
   - (A) **Daily Detailed** (1 row = 1 employee × 1 tanggal; kolom lengkap seperti L16.1 table). Default Recommended.
   - (B) **Monthly Recap Summary** (1 row per employee; 12 kolom ringkasan section 16.2) — Opsi hanya jika start/end date pas 1 bulan penuh (kalau cross month, disable opsi B atau generate per bulan pecah sheet).

### 17.3 Export File Spec
| Item | Spec |
|---|---|
| Filename | `Attendance_Period_{YYYYMMDD}_{YYYYMMDD}_{timestamp_YYMMDDHHmmSS}.xlsx`. Contoh: `Attendance_Period_20260901_20260930_260930153022.xlsx` |
| Timezone Date Cells | Asia/Jakarta (UTC+7). Format Tanggal: `yyyy-mm-dd`. Format Jam: `hh:mm:ss`. |
| Sheet Name | 1 Sheet = "Attendance" untuk format Daily; 1 Sheet "Monthly Recap" untuk format B. |
| Header Row | Bold, background soft blue. Freeze row 1 (header scroll). Kolom: No, Kode Karyawan, Nama Karyawan, Divisi, Team, Jabatan, Tanggal, Clock IN, Clock OUT, Durasi Jam Kerja, Status, Lembur(jam), Sumber Data, Jumlah Tap. (13 cols detailed.) |
| Data Source (L16 kolom Sumber Data) | Isi value "Browser Web" / "Fingerprint Machine" / "Manual Koreksi HR". |
| Generated Metadata — Row footer terakhir 3 baris | Teks informasi: "Laporan dibuat oleh: {username display name} — {user role}"; "Dibuat tanggal: {full timestamp WIB}"; "Periode: From → To". |
| Generated By / Timestamp | Juga masuk audit trail export. |

### 17.4 Security Export
- **Authorization:** Hanya role HR & SUPER_ADMIN. Route `/api/hr/attendance/export` → guard session requireSession() + canPerformAction('hr', 'export'). TAMBAH scope branch filter jika security scope decision = YA (section 20).
- **Audit Trail Export:** Insert ke `hr_audit_logs` dengan action type baru `ATTENDANCE_EXPORT` (tambah ke enum 16 existing actions audit service). Data: `target_ref = period:20260901-20260930; filter:div=IT;team=Backend;format=daily_detail`, actor_name = session display(username). Detail_text = log. (Existing reuse audit pattern 16 actions.)
- **Unauthorized → 403.** Jangan expose token atau sign download URL tanpa session cookie auth.

---

## 18. Roles & Authorization (Batch-01)

User Jawaban #8: Approval = HR satu level. User #9: Dokumen pegawai = HR only. User #7: Payroll ownership Finance = Finance tidak perlu akses data employee detail dokumen batch 01.

### 18.1 Action Matrix

| Action / Module | HR (canonical role) | Employee Self Service (role tidak ada existing, future) | Manager/Atasan Langsung | Finance (Payroll owner batch berikutnya) | SUPER_ADMIN | Notes |
|---|---|---|---|---|---|---|
| **Employee Master** | | | | | | |
| View Employee List / Detail | ✅ FULL | TBD (❌ Default Batch-01 NON-AKTIF, self-service OOS) | TBD (Default ❌ Batch-01 TIDAK BERI AKSES; jika user mau manager lihat nama anak buahnya = future. JANGAN asumsikan.) | ❌ (Finance tidak perlu lihat data personal pegawai. Hanya butuh data gaji nanti dari payload. — TBD Section 26 OB-11) | ✅ FULL | View = server side page guard `/hr` prefix allowed existing di access-control L34. |
| Create Employee New | ✅ | ❌ | ❌ | ❌ | ✅ | |
| Edit Employee Core Data / Jabatan / Supervisor / Status | ✅ | ❌ | ❌ | ❌ | ✅ | Trigger riwayat Section 4 wajib setiap update. |
| View History Employee (mutasi, jabatan, gaji) | ✅ | ❌ | ❌ | ❌ | ✅ | |
| Export Employee Master Data Excel (future) | ✅ | ❌ | ❌ | ❌ | ✅ | Batch 01 tidak perlu endpoint export master data. |
| **Dokumen Pegawai** | | | | | |
| Upload KTP/KK/Ijazah/Contract | ✅ HR ONLY | ❌ (OOS) | ❌ | ❌ | ✅ SUPER_ADMIN bisa | 🔴 Strictest! Manager/Finance = TIDAK BOLEH lihat file KTP/KK/Keluarga = privacy PDP Law. |
| View Metadata Dokumen list (category, filename) per Employee | ✅ | ❌ | ❌ | ❌ | ✅ | |
| Download Dokumen File Binary | ✅ | ❌ | ❌ | ❌ | ✅ | Setiap download = access log (Section 6.4). |
| Replace New Version / Non-Aktifkan Dokumen | ✅ | ❌ | ❌ | ❌ | ✅ | |
| **Attendance** | | | | | | |
| View Attendance Dashboard + Daily/Monthly Tab | ✅ FULL | TBD Default ❌ Batch 01. (Keputusan employee lihat absen sendiri? Section 26 OB-10) | TBD Default ❌ Batch 01 (Section 26 OB-11 manager lihat anak buah?). | TBD — Finance nanti butuh rekap mentah untuk hitung gaji? Default ❌ batch 01; batch payroll Finance dapat data via payload transfer bukan direct view. | ✅ FULL | |
| Fingerprint Device Management (CRUD, test conn, Mapping) | ✅ HR | ❌ | ❌ | ❌ | ✅ | |
| Sync Attendance (Manual / Run Scheduler) | ✅ | ❌ | ❌ | ❌ | ✅ | Schedule run actor NULL (system). |
| Manual Attendance Correction (existing patch) | ✅ HR Approved = Single level HR (sesuai user jawaban 8). | ❌ | ❌ Manager tidak koreksi absen (batch 01 baseline single HR approval). | ❌ | ✅ SUPER_ADMIN bisa koreksi. | Tambah audit trail correction actor. |
| Export Attendance Excel (Section 17) | ✅ | TBD ❌ Batch 01 Default. (Self service future.) | TBD ❌ | TBD Finance bisa butuh? Default ❌ Batch 01. Bisa diijinkan nanti batch Finance. (OB-12) | ✅ | |

### 18.2 Unresolved Permissions (All TBD → Section 26 Open Business Decisions)
Semua cell `TBD` di atas. JANGAN diberikan grant sampai user confirm di Section 26. Default Batch 01 = conservative HANYA HR + SUPER_ADMIN. Semua TBD = default ❌ TIDAK DIBERIKAN akses batch 01.

---

## 19. Audit Trail (Reuse & Expand Existing Pattern)

### 19.1 Existing Pattern to Reuse: `hr_audit_logs` (evidence dari Read-Only audit Section 14).
**Existing 16 ENUM actions (tidak berubah):**
1. EMPLOYEE_CREATE
2. EMPLOYEE_ARCHIVE
3. EMPLOYEE_REACTIVATE
4. EMPLOYEE_FACE_REFERENCE_UPSERT
5. ATTENDANCE_CREATE
6. ATTENDANCE_UPDATE
7. ATTENDANCE_GEOFENCE_CONFIG
8. ATTENDANCE_FACE_CONFIG
9. ATTENDANCE_FACE_REVIEW
10. ATTENDANCE_FACE_RETAKE_QUEUE
11. LOAN_CREATE
12. LOAN_UPDATE
13. LOAN_VOID
14. SALARY_SLIP_CREATE
15. SALARY_SLIP_RELEASE
16. SALARY_SLIP_VOID

**Baru 13 ENUM actions Batch-01 (13 baru):**
17. EMPLOYEE_UPDATE
18. EMPLOYEE_HISTORY_EVENT
19. EMPLOYEE_DOC_UPLOAD
20. EMPLOYEE_DOC_DOWNLOAD
21. EMPLOYEE_DOC_INACTIVE
22. FP_DEVICE_CREATE
23. FP_DEVICE_UPDATE
24. FP_DEVICE_DELETE
25. FP_MAP_EMPLOYEE
26. ATTENDANCE_SYNC_SUCCESS
27. ATTENDANCE_SYNC_FAILED
28. ATTENDANCE_EXPORT
29. EMPLOYEE_ATTENDANCE_CORRECTION

**TOTAL FINAL = 16 existing + 13 baru = 29 action ENUM.**

### 19.2 New Action ENUM Values Wajib Tambah di Batch-01 (total menjadi 29 actions — add via provisioner lazy `ALTER TABLE hr_audit_logs MODIFY COLUMN action_type ENUM(...)` pattern existing 16 enum sync):

| Action ID (ENUM value) # | Kapan Dipanggil | actor_name | target_ref example | detail_text |
|---|---|---|---|---|
| **17. EMPLOYEE_UPDATE** | Setiap perubahan data master employee (divisi, team, jabatan, supervisor, email, phone, base salary, status, user_id mapping) | session displayName | `EMP-202609-0001` | "Update jabatan: Staff → Senior Engineer. prev_position_id: 5 new:12." |
| **18. EMPLOYEE_HISTORY_EVENT** | Tiap insert ke hr_employee_history event H1..H12 (Section 4). H1 (HIRED create) = tercatat juga bersama EMPLOYEE_CREATE. | session | `EMP-202609-0001 #H4` | "Promosi jabatan per tanggal 2026-10-01." |
| **19. EMPLOYEE_DOC_UPLOAD** | Upload dokumen KTP/KK/ijazah/kontrak | session | `DOC-1234 (KTP)` | "Upload file: KTP_Andi.jpg (2.3MB)" |
| **20. EMPLOYEE_DOC_DOWNLOAD** | Download file binary | session | `DOC-1234` | "Download via dashboard." |
| **21. EMPLOYEE_DOC_INACTIVE** | Mark non-active / hapus versi dokumen | session | `DOC-1234 (versi 1)` | "Versi lama dinonaktifkan. Ada versi baru 2 diupload." |
| **22. FP_DEVICE_CREATE** | Device management CREATE | session | `MACHINE-HO-LANTAI1 (ID=7)` | "Create. IP 192.168.1.120 Port 4370." |
| **23. FP_DEVICE_UPDATE** | Device management UPDATE | session | `MACHINE-HO-LANTAI1 (ID=7)` | "Update IP: 192.168.1.120 → 192.168.1.121" |
| **24. FP_DEVICE_DELETE** | Device management DELETE (soft active=0) | session | `MACHINE-HO-LANTAI1 (ID=7)` | "Soft delete. Reason: Mesin diangkat ke cabang lain." |
| **25. FP_MAP_EMPLOYEE** | Mapping employee ke mesin fingerprint (create/update/revoke mapping) | session | `EMP-0001 ↔ Machine 7/ID=23` | "Registered enrollment ID 23 on device Machine HO." |
| **26. ATTENDANCE_SYNC_SUCCESS** | Sync selesai SUCCESS / PARTIAL | (actor HR if manual; "SYSTEM:SCHEDULED" if scheduler) | `Sync Run #234 machine #7` | "Fetched 156 records. 150 new. 6 duplicates. 0 unmapped." |
| **27. ATTENDANCE_SYNC_FAILED** | Sync FAILED | SYSTEM / HR | `Machine #7 IP 192.168.1.120` | "Connection Timeout 8s. Host unreachable." |
| **28. ATTENDANCE_EXPORT** | Excel Export attendance | session HR | `Period 20260901-20260930` | "Daily detail format, 45 employee, 30 days = 1350 rows." |
| **29. EMPLOYEE_ATTENDANCE_CORRECTION** | HR edit manual patch attendance clock in/out atau koreksi field data employee typo via form correction. Untuk koreksi field employee non-attendance = reuse EMPLOYEE_HISTORY_EVENT dengan detail_json snapshot before/after. | session HR | `EMP-202609-0001 Date 2026-09-23` | "Koreksi clock_in: 09:15 → 08:05. Reason: Lupa tap, masuk lobi sudah 07:58. Saksi: Supervisor Budi." |

### 19.3 Timestamps Universal
Semua 6 fields audit FRS wajib terpenuhi di DB level:
1. `created_by` — all create operations
2. `created_at DATETIME DEFAULT CURRENT_TIMESTAMP` — all tables (existing sudah pattern)
3. `updated_by` — sebelum update query, inject dari session
4. `updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP` (auto di MariaDB, atau manual set server side)
5. `sync_by` / `sync_job` — hr_fp_sync_runs kolom actor NULL if system scheduled
6. `exported_by`, `exported_at` — ATTENDANCE_EXPORT di audit logs (Section 17). Add generic exported_by di export payloads.

---

## 20. Security Requirements (HR Data Isolation)

### 20.1 Employee & Attendance Data Security
1. **Server-Side Authorization Wajib:** Semua endpoint baru (documents, devices, mapping, sync, export) = 4 gate pattern existing (requireSession → canPerformAction(hr, create/update/view/export) → effectiveMode review-db → prepared statements). TIDAK ada client-side trust.
2. **Branch Scope Filter pada List Queries Employee & Attendance:**
   - ⚠️ Decision Required: [Section 17 Security Q1 previous HR BUSDEC TBD Q1 — Apakah HR cabang hanya lihat cabangnya?] Jika user jawab = scope branch YA, maka tambahkan WHERE he.branch_id IN (session user branch_ids) = resolve SECURITY FINDING previous audit. Jika user jawab = HQ HR lihat semua = tidak apply. **FRS TIDAK MEMUTUSKAN. Decision di Section 26 OB-7.** Default Batch-01 = TANPA filter dulu (existing behavior sebelum keputusan), TAPI toggle flag tersedia supaya cepak enable jika decision = branch scope later.
3. **No IDOR check:**
   - Dokumen endpoint `/api/hr/documents/[id]/download`: WAJIB check bahwa document_id tersebut benar-benar milik employee (join query). Jangan percaya parameter id saja. Juga check role. 403 jika employee X buka doc employee Y via ganti docId parameter URL.
   - Employee detail `/hr/employees/[empId]` page: future self-service TBD tapi check pattern ownership already.
4. **No Client Exposure Sensitive**
   - Machine auth config encrypted = never response plaintext ke client. Return masked •••••••• only.
   - Storage ref internal hr_documents = never exposed ke client sebagai URL. Hanya binary stream authorized download endpoint.

### 20.2 Dokumen Privacy Security
1. HR ONLY Access matrix 18.1 strict. Manager & Finance TIDAK default.
2. Audit setiap access → table hr_document_access_logs (S 6.4).
3. Upload MIME whitelist = image/jpeg, image/png, application/pdf SAJA. Block executable file types (application/x-msdownload, application/zip, application/x-dosexec, text/html with script). 400 invalid jika diluar.
4. Storage backend: taruh DILUAR folder `public` Next.js. Default path apps/web/storage/hr_documents/** dengan folder permission 0700 owner process only.
5. Anti-virus scan file uploads = infrastructure decision (optional OOS Batch 01; not required MVP tapi recommended).

### 20.3 Attendance Export Security (17.4 repeated)
- Audit trail mandatory ATTENDANCE_EXPORT action log.
- Max date range ≤ 90 days (bukan export 2 tahun sekaligus tanpa pagination). Prevention against data exfiltration pegawai keluar dengan semua data historis.
- Export scope = sesuai branch scope filter if enabled.

---

## 21. Technical Dependencies

### Hardware (SEMUA = HARDWARE SPECIFICATION REQUIRED Section 27)
| Dependency | Current Evidence | Status | Impact jika tidak diketahui = BLOCKED IMPLEMENTATION CONNECTOR |
|---|---|---|---|
| HW-1: Fingerprint machine Vendor | NOT FOUND repo | 🔴 REQUIRED | ZKTeco? Solution? eSSL? Hikvision? Implement connector TCP berbeda per vendor SDK. |
| HW-2: Exact Model Mesin (contoh: ZKTeco SpeedFace V5L) | NOT FOUND | 🔴 REQUIRED | Protocol capability berbeda (TCP biner / HTTP JSON / C3 SDK UDP?). Tanpa model = tidak bisa pilih connector adapter. |
| HW-3: Network protocol mesin (TCP biner / RESTful HTTP / UDP / Serial-over-IP?) | NOT FOUND | 🔴 REQUIRED | Default asumsi ZKTeco TCP 4370 = bisa wrong kalau ternyata HTTP JSON basic auth. |
| HW-4: Port number (1-65535) | NOT FOUND | 🟡 DEPENDENT | Default 4370 ZK, tapi user harus confirm di device. |
| HW-5: Authentication method (Comm Key? Password admin? Basic auth over HTTP? SDK API key?) | NOT FOUND | 🟡 DEPENDENT | Default ZKTeco = comm key 8 byte. Jika mesin baru HTTP = user/pass. |
| HW-6: Berapa jumlah mesin fingerprint total Perkasa Networks sekarang? | NOT FOUND (Audit previous) | 🟢 NICE TO HAVE (scalability) | Misal 5 mesin → sync parallel simple. 50 mesin → butuh queue worker. |
| HW-7: Employee identifier di dalam mesin menggunakan apa? Nomor urut = Employee Code (0001 untuk EMP-202601-0001) atau random 123456? | NOT FOUND (Section 10 mapping) | 🟡 IMPORTANT | Backfill mapping table strategy. |
| HW-8: Jam mesin disetting timezone Asia/Jakarta? atau masih UTC / salah? | NOT FOUND | 🟢 Correction factor di device_timezone column. | |

### ERP Internal Dependencies
| Dependency | Current Evidence Status | Path Reference |
|---|---|---|
| Employee Master hr_employees | ✅ EXISTS. Expand new FK columns. | L647-665 |
| org_divisions, org_branches | ✅ EXISTS + Branch preserved. | L7-L31. |
| hr_attendance processed daily table | ✅ EXISTS. Add new source_type column lazy. | L667-681 |
| hr_audit_logs action ENUM 16 actions | ✅ EXISTS → expand 29 actions (16 existing + 13 baru Batch-01). Lazy alter modify column pattern proven. | [hr-audit-service.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/hr-audit-service.ts#L1-L117) ENUM L7-L24. |
| Lazy Schema Ensure Pattern (addColumnIfMissing, ensure...Tables) | ✅ Proven. 2 locations existing technician-schema & unified-ticket service addColumnIfMissing. | [technician-schema-ensure.ts](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/lib/services/technician-schema-ensure.ts#L1-L90). Reuse. |
| 4-gate API route handler (auth + permission + mode + prepared) | ✅ Proven 15 HR API routes existing. | attendance route. Reuse. |
| Excel Export Library xlsx@0.18.5 | ✅ EXISTING 26 locations use. | [apps/web/package.json](file:///d:/trae_projects/perkasa-erp-oss-bss/apps/web/package.json#L38). |
| Review-DB Mode Guard (effectiveMode review-db & !fallback = 503) | ✅ Pattern existing 100% mutation route. | 4 gate pattern. Reuse. |
| Scheduler / Cron Job Server Side (jika user pilih scheduled sync) | ❌ NOT FOUND. Client setInterval only di beberapa component untuk timer UI. Tidak ada server side cron runner library di package.json (no node-cron/node-schedule/BullMQ/agenda). | If OB-2 scheduled sync = YA → Add 1 new dependency or user accept Manual only default. If Manual acceptable = NO ADD DEPENDENCY NEEDED. (Decision OB-2.) |
| Document Storage Engine (path / encryption at rest) | ❌ NOT FOUND (HR specific). Jika pakai local disk = no library (fs module). | New storage/hr_documents folder. |
| Auth Users ↔ Employee optional nullable user_id FK | ❌ NOT FOUND new column. Optional relation. | Employee Table EM-F user_id col. |

### Infrastructure / Network Dependencies
| Dependency | Status | Notes |
|---|---|---|
| ERP Server IP bisa reach mesin Fingerprint di LAN / VPN | ⚠️ USER MUST VERIFY IT | Jika ERP deploy cloud publik tidak bisa LAN → perlu VPN / tunnel / reverse proxy. Not in scope ERP code development. |
| Firewall (Mesin → Port Inbound Allow dari IP server ERP) | ⚠️ USER VERIFY | Sering port block meskipun IP benar. |
| Static IP untuk setiap mesin fingerprint | ⚠️ Decision infra (DHCP reservation / Static) | Jika IP berubah setiap reboot = sync device IP list sering update. Static recommended. |
| Encryption Key Environment Variable for device auth | ⚠️ Add 1 env var ke secret manager / process.env TANPA commit ke repo. **NO FALLBACK HARDCODED DEFAULT** (fail closed: create/update/sync/test-connection device akan ERROR 503 jika env tidak tersedia). Untuk decrypt legacy ciphertext yang dienkripsi sebelum fix-1, tetap bisa jika value IV lawas. **JANGAN hardcoded key.** | `FINGERPRINT_DEVICE_CONFIG_ENCRYPTION_KEY` wajib. Format: minimal 8 karakter apapun (akan di-normalisasi SHA-256 ke 32 bytes AES-256 key) ATAU hex exact 64 chars (32 bytes raw AES-256). |

---

## 22. Data Model Candidate

Visual Entity Relationship Diagram Candidate (New vs Existing):
```mermaid
erDiagram
    org_branches ||--o{ org_divisions : "1 branch punya N divisi (EXISTING preserved)"
    org_divisions ||--o{ org_teams : "1 divisi punya N teams (NEW relation)"
    org_teams ||--o{ hr_employees : "1 team punya N employees (NEW FK team_id)"
    org_positions ||--o{ hr_employees : "Master Jabatan 1 position dimiliki N employee (NEW FK position_id)"
    hr_employees ||--o{ hr_employees : "Supervisor Self-Relation (NEW supervisor_id FK → hr_employees.id)"
    org_branches ||--o{ hr_employees : "EXISTING dependency branch_id (Wajib preserved)"
    hr_employees ||--o{ hr_employee_history : "RIWAYAT 1 EMP → N events (NEW table)"
    hr_employees ||--o{ hr_documents : "1 employee N dokumen (NEW table KTP/KK/IJAZAH/KONTRAK)"
    hr_documents ||--o{ hr_document_access_logs : "Setiap access dok = 1 log audit (NEW)"
    hr_employees ||--o{ hr_fp_employee_mappings : "1 employee → N mapping fingerprint (NEW table TBD)"
    hr_fp_machines ||--o{ hr_fp_employee_mappings : "1 mesin N employee terdaftar"
    hr_fp_machines ||--o{ hr_fp_sync_runs : "1 mesin -> N riwayat sync run"
    hr_fp_sync_runs ||--o{ hr_fp_raw_events : "1 sync run tarik N raw events (INSERT ONLY immutable)"
    hr_fp_employee_mappings ||--o{ hr_fp_raw_events : "mapping ke employee ID sesudah identify"
    hr_employees ||--o{ hr_attendance : "Processed Daily Attendance EXISTING table expand"

    %% Legends
    %% Rectangle EXISTING = hijau. NEW = cream.
    classDef existing fill:#d5e8d4,stroke:#82b366;
    classDef new fill:#fff2cc,stroke:#d6b656;
    class org_branches,org_divisions,hr_employees,hr_attendance existing;
    class org_teams,org_positions,hr_employee_history,hr_documents,hr_document_access_logs,hr_fp_machines,hr_fp_employee_mappings,hr_fp_sync_runs,hr_fp_raw_events new;
```

### Total Table Count Batch 01
| Tables | Jumlah | Notes |
|---|---|---|
| Existing Preserved Tidak Diubah (structure) | 4 | org_branches, org_divisions, hr_employees*, hr_attendance* *tambah kolom lazy via addColumnIfMissing |
| Existing Expand Columns / ENUM | 2 | hr_employees (+9 cols), hr_attendance (+2 cols source_type, fingerprint_device_id optional), hr_audit_logs (+13 ENUM values = 16 existing + 13 baru = 29 total) |
| **Total TABEL BARU** | **9 buah** | org_teams, org_positions, hr_employee_history, hr_documents, hr_document_access_logs, hr_fp_machines, hr_fp_employee_mappings, hr_fp_sync_runs, hr_fp_raw_events |
| Total Tables in HR Domain After Batch-01 | 15 legacy (audit previous) + 7 new = 22 tables. | Sesuai lazy provisioner `HR_VERSION` bump dari `1.0.0-honest-hr-domain` menjadi `1.1.0-fingerprint-employee-master-batch01` di provision HR schema script. |

---

## 22.1 Migration & Backfill Safe Plans (Gate 0 Reconciliation R3–R6)

**Prinsip Umum:** Semua migration existing data = FAIL-CLOSED. Jika ada indikasi > 5% row unknown value yang tidak dapat di-map, pause migration dan report ke user. Jangan langsung ALTER tanpa UPDATE map terlebih dahulu. Semua backfill = IDEMPOTENT (bisa di-run 10x tanpa error). Semua statement dijalankan dalam TRANSACTION sehingga rollback full jika ada step gagal.

---

### R3: Existing Status VARCHAR → ENUM Migration Backfill Safe Plan
**Konteks:** Existing `hr_employees.employment_status` adalah VARCHAR(50) default 'KARYAWAN' (free text). Akan di-upgrade ke ENUM('PROBATION','PKWT','PKWTT','MAGANG','OUTSOURCE','RESIGNED','TERMINATED','PENSIUN','ARCHIVED').

**Step-by-Step SAFE MIGRATION (dalam 1 transaksi DB):**

| Step | Action SQL Pseudocode | Tujuan |
|---|---|---|
| **R3-0 (PRE-CHECK)** | `SELECT employment_status, COUNT(*) AS cnt FROM hr_employees GROUP BY employment_status ORDER BY cnt DESC;` | Ambil semua distinct status value + count yang ada di production SEBELUM apapun diubah. Simpan report ini sebagai audit trail pre-migration. |
| **R3-1 (COUNT TOTAL)** | `SELECT COUNT(*) AS total_rows FROM hr_employees;` | Hitung total rows untuk persentase unknown calc. |
| **R3-2 (MAP TABLE DEFINISI)** | | Mapping status free text → ENUM target: |
| | `'KARYAWAN'` → `PKWTT` | Default lama "Karyawan Tetap" = PKWTT. |
| | `'TETAP'` → `PKWTT` | Sinonim Karyawan Tetap. |
| | `'KONTRAK'` → `PKWT` | Kontrak kerja = PKWT. |
| | `'PKWT'` → `PKWT` | Sudah benar, no-op. |
| | `'MAGANG'` → `MAGANG` | Sudah benar. |
| | `'OUTSOURCE'` → `OUTSOURCE` | Sudah benar. |
| | `'PROBATION'` atau `'PERCOBAAN'` → `PROBATION` | Masa percobaan. |
| | `'RESIGN'` atau `'KELUAR'` → `RESIGNED` | Karyawan resign. |
| | `'PHK'` → `TERMINATED` | Pemutusan Hubungan Kerja. |
| | `'PENSIUN'` → `PENSIUN` | Sudah benar. |
| | `'ARSIP'` → `ARCHIVED` | Arsip / soft delete. |
| | `NULL`, empty string `''`, atau value tidak ada di daftar di atas → `OUTSOURCE` | **SAFE DEFAULT REVERSIBLE:** Unknown value = map ke OUTSOURCE terlebih dahulu (tidak hilang). User bisa review dan koreksi manual SETELAH migration sukses via UI. Tidak ada row data hilang. |
| **R3-3 (UNKNOWN CHECK FAIL-CLOSED)** | Hitung jumlah rows dengan status **tidak** masuk daftar known values di atas. Hitung `unknown_pct = unknown_count * 100.0 / total_rows`. | ⚠️ **JIKA unknown_pct > 5% → PAUSE MIGRATION!** Jangan lanjut step berikutnya. Report ke user: "Ada `{unknown_count}` rows ({unknown_pct}%) employment_status tidak dikenali. Nilai unknown: [list distinct values]. Mohon review mapping sebelum lanjut." **HANYA LANJUT JIKA unknown ≤ 5% (atau user explicit override approve).** |
| **R3-4 (RUN UPDATE, BUKAN LANGSUNG ALTER)** | Jalankan UPDATE statement CASE WHEN untuk semua rows sesuai mapping table R3-2 di atas. Dalam 1 transaksi. | Semua status di-normalize ke ENUM string values SEBELUM column type diubah. Tidak ada row gagal karena value tidak match ENUM nanti. |
| **R3-5 (VERIFY POST-UPDATE)** | Run SELECT distinct employment_status lagi. Pastikan HANYA ada 9 value ENUM target. Count total rows harus sama dengan R3-1 (tidak ada row hilang). | Verifikasi sebelum ALTER. |
| **R3-6 (ALTER COLUMN TYPE)** | BARU SETELAH update semua row aman: `ALTER TABLE hr_employees MODIFY COLUMN employment_status ENUM('PROBATION','PKWT','PKWTT','MAGANG','OUTSOURCE','RESIGNED','TERMINATED','PENSIUN','ARCHIVED') NOT NULL DEFAULT 'PKWTT';` | Akhirnya ganti type column. Karena semua value sudah match ENUM, tidak ada truncate/error. |
| **R3-7 (POST-MIGRATION AUDIT)** | `SELECT employment_status, COUNT(*) FROM hr_employees GROUP BY employment_status;` → bandingkan dengan pre-migration R3-0 + mapping. Commit transaction jika semua match. | Final verification sebelum commit. |

**Reversibility:** Sebelum commit transaksi di step R3-7, rollback selalu memungkinkan (kembali ke state sebelum R3-4). Setelah commit: value yang tadinya unknown sekarang = OUTSOURCE, user bisa bulk-update via UI SQL admin jika perlu dikoreksi. Tidak ada row data hilang kapanpun.

---

### R4: Existing Employee position_name free text → FK position_id Backfill Plan
**Konteks:** Existing `hr_employees.position_name VARCHAR(120)` = free text. Akan di-ganti ke `position_id BIGINT FK → org_positions.id`. Legacy column position_name di-keep sementara untuk kompatibilitas 1 batch.

**Step Backfill IDEMPOTENT (run 10x = tidak ada error):**

| Step | Action SQL Pseudocode | Catatan |
|---|---|---|
| **R4-1 (IDENTIFY UNIQUE POSITIONS)** | `SELECT DISTINCT TRIM(position_name) AS clean_pos_name, COUNT(*) AS employee_count FROM hr_employees WHERE position_name IS NOT NULL AND TRIM(position_name) <> '' GROUP BY clean_pos_name ORDER BY employee_count DESC;` | Ambil daftar semua jabatan unik yang pernah dipakai. Ini untuk UI report user "Ada N jabatan unik akan di-generate otomatis." |
| **R4-2 (INSERT POSITIONS MASTER — IDEMPOTENT)** | Untuk setiap unique clean_pos_name dari R4-1: `INSERT IGNORE INTO org_positions (position_code, position_name, position_level, active, created_at, updated_at) VALUES (CONCAT('AUTO-', LEFT(SHA1(clean_pos_name), 8)), clean_pos_name, NULL, 1, NOW(), NOW());` | **Idempotent karena INSERT IGNORE.** Jika position_name sudah ada di org_positions (karena user sudah manual input), tidak ditambah duplicate. position_code = auto-generate dari SHA1 hash 8 char pertama → deterministic unique (tidak collision untuk N jabatan < 1000). position_level = NULL dulu (user bisa isi manual via UI master jabatan nanti). |
| **R4-3 (BACKUPDATE EMPLOYEE FK — IDEMPOTENT)** | `UPDATE hr_employees e INNER JOIN org_positions p ON p.position_name = TRIM(e.position_name) SET e.position_id = p.id WHERE e.position_id IS NULL AND e.position_name IS NOT NULL AND TRIM(e.position_name) <> '';` | **Idempotent karena WHERE e.position_id IS NULL.** Rows yang sudah punya position_id (user set manual / di-run sebelumnya) = tidak di-sentuh. Rows tanpa position_name = di-skip (user bisa isi position_id manual nanti jika perlu). |
| **R4-4 (VERIFY)** | `SELECT COUNT(*) AS no_position FROM hr_employees WHERE position_id IS NULL AND (position_name IS NOT NULL AND TRIM(position_name) <> '');` → harus = 0. Juga: `SELECT COUNT(DISTINCT position_name) FROM hr_employees WHERE position_name IS NOT NULL;` = `SELECT COUNT(*) FROM org_positions WHERE position_code LIKE 'AUTO-%';` (match). | Pastikan tidak ada employee dengan position_name tapi position_id NULL. |
| **R4-5 (LEGACY COLUMN COMPATIBILITY)** | ⚠️ **JANGAN HAPUS position_name VARCHAR column.** Tetap simpan sebagai legacy deprecated column 1 batch (Batch-01). Write both position_name dan position_id selama masa transisi sampai Batch-01 production verified 2 minggu. Setelah itu: deprecated column, set kolom menjadi unused (tidak di-dorp permanen sampai Batch-02 confirmed). | Backward compatible 1 siklus batch. Tidak merusak code existing yang masih baca position_name. |

**No data lost:** Jika ada employee dengan position_name NULL, position_id tetap NULL. User bisa isi manual via UI employee edit. Tidak ada row dihapus atau dimodifikasi tanpa FK yang valid.

---

### R5: Supervisor FK Cycle Detection Algorithm
**Konteks:** `hr_employees.supervisor_id FK self-referencing ke hr_employees.id`. Tidak boleh ada circular: A → B → A (A melapor ke B, B melapor ke A). Juga tidak boleh self (A → A).

**Dua Layer Validation Wajib (BASIC + RECURSIVE):**

| Layer | Scenario | Algorithm Detail | Error Response HTTP 400 |
|---|---|---|---|
| **R5-1: BASIC CHECK (Self Reference)** | `supervisor_id == employee_id` (Employee X mau jadi atasan sendiri A→A). | Check sederhana di service/application level SEBELUM query DB: `if body.supervisor_id == employeeId → reject immediately`. Tidak perlu DB call untuk ini. | `"Tidak boleh menjadi atasan sendiri. Supervisor ID {supervisor_id} sama dengan Employee ID {employee_id}."` |
| **R5-2: RECURSIVE CYCLE CHECK (N-Level Circular)** | A→B→A, atau A→B→C→D→A (cycle panjang multi-level). | **Option A: Recursive CTE di Database (Recommended, efficient):** <br>Query CTE: `WITH RECURSIVE supervisor_chain AS ( SELECT supervisor_id, 1 AS depth FROM hr_employees WHERE id = NEW_SUPERVISOR_ID UNION ALL SELECT e.supervisor_id, sc.depth + 1 FROM hr_employees e INNER JOIN supervisor_chain sc ON e.id = sc.supervisor_id WHERE sc.depth < 50 AND sc.supervisor_id IS NOT NULL ) SELECT COUNT(*) AS cycle_found FROM supervisor_chain WHERE supervisor_id = employee_id;` <br>Jika `cycle_found > 0` → ada cycle. <br><br>**Option B: Service-level While Loop (fallback jika DB tidak support CTE):** <br>```current_id = NEW_SUPERVISOR_ID; depth = 0; while (current_id is not null && depth <= 50) { if (current_id == employee_id) return CYCLE_DETECTED; current_id = db_get_supervisor_id(current_id); depth++; }```<br>Max depth 50 level → prevent infinite loop kalau ada bug/race condition. Struktur organisasi real ≤ 10 level. | `"Terdeteksi circular atasan. Employee {employee_code} → supervisor chain menuju {chain_preview} → kembali ke employee. Mohon perbaiki struktur organisasi terlebih dahulu."` |

**2 Test Case Wajib Cover untuk Verification:**
1. **Test Case A (A→A Self):** Employee ID=1, set supervisor_id=1 → Expected: HTTP 400 dengan message "Tidak boleh menjadi atasan sendiri".
2. **Test Case B (A→B→A Cycle):**
   - Pre-seed: Employee ID=1 (supervisor_id=2), Employee ID=2 (supervisor_id=NULL).
   - Action: PATCH Employee ID=2 set supervisor_id=1.
   - Expected: HTTP 400 dengan message circular atasan. Sekarang struktur menjadi 1→2→1 (cycle).

**Race Condition Safe:** Gunakan `SELECT ... FOR UPDATE` pada rows employee yang terlibat saat cycle check berjalan, sehingga 2 concurrent update tidak bisa sama-sama lolos check lalu membentuk cycle setelah commit.

---

### R6: HR Document Storage Private Requirements
**Konteks:** Penyimpanan dokumen KTP/KK/Ijazah/Kontrak = data Pribadi (PDP Law No 27/2022). Harus private, tidak pernah public access.

#### R6-1 Storage Location & Permissions
| Item | Spec |
|---|---|
| **Absolute Folder Path** | `{PROJECT_ROOT}/apps/web/storage/hr_documents` |
| **Folder Structure Dalamnya** | Disarankan per employee untuk navigability: `apps/web/storage/hr_documents/{employee_id}/{sha256_internal_filename}.{ext}` (folder employee_id auto-create jika belum ada saat upload). |
| **OS Permission** | `chmod 0700` untuk folder hr_documents dan semua subfolder. Hanya OS runtime user (yang menjalankan process Next.js / Node) yang dapat READ/WRITE. Tidak ada group/other access. |
| **.gitignore Verifikasi** | ✅ SUDAH DIVERIFIKASI: Root `.gitignore` line 14 sudah berisi `apps/web/storage` → seluruh isi storage TIDAK PERNAH ter-commit ke git. Tidak ada KTP/KK dokumen masuk repo. |

#### R6-2 Upload Validation (Server Side Wajib)
| Validation | Rule |
|---|---|
| **MIME Whitelist** | HANYA 3 MIME types yang diterima: `image/jpeg` (JPG/JPEG), `image/png` (PNG), `application/pdf` (PDF). Selain ini → reject HTTP 400 "Tipe file tidak diijinkan. Hanya JPG, PNG, dan PDF." |
| **Max Filesize Per Document** | 5 MB (5 × 1024 × 1024 = 5242880 bytes). Lebih dari ini → 413 "File terlalu besar. Maksimal 5MB per dokumen." |
| **Filename Sanitization (Original Filename — untuk display)** | Semua karakter kecuali `[A-Za-z0-9._-]` di-replace menjadi `_` (underscore). Contoh: `KTP Andi 09/2024.pdf` → `KTP_Andi_09_2024.pdf`. **TIDAK BOLEH** mengandung path traversal atau karakter berbahaya: `../`, `/`, `\`, `C:`, `..`, `%2e%2e%2f`, dll. Semua path separator di-strip sebelum dipakai apapun. |
| **Internal Storage Filename (Di-disk Server)** | Format: `SHA256(employee_id + original_filename_raw + timestamp_ms).toHex() + '.' + ext`. Contoh: `a1b2c3d4e5f6...a1b2c3.pdf`. **TIDAK** gunakan original filename di-disk server. Alasan: (1) collision prevention, (2) tidak bisa tebak storage path dari luar. |
| **File Extension Validation** | Ekstensi file juga harus match whitelist: `.jpg`, `.jpeg`, `.png`, `.pdf`. Selain itu reject. Jangan hanya percaya MIME type header (bisa di-spoof). |

#### R6-3 Access & Download Security
| Rule | Detail |
|---|---|
| **NO Public Static Folder** | 🔴 **JANGAN PERNAH** taruh file dokumen di dalam `apps/web/public/**` atau folder Next.js static serve manapun. Tidak pernah ada URL seperti `/hr_documents/123/ktp.pdf` yang accessible tanpa auth. Semua akses hanya via API authorized binary stream. |
| **Download Endpoint** | Route pattern: `GET /api/hr/documents/{documentId}/download`. Middleware 4-gate: requireSession() → role HR/SUPER_ADMIN only → IDOR check (document.employee_id join query pastikan milik employee yang sah → tidak bisa ganti docId sembarang) → mode review-db guard. |
| **Binary Stream Headers** | Response content-type = actual mime_type dokumen. Response header tambahan: `Content-Disposition: attachment; filename={original_filename_sanitized}.pdf` atau `inline; filename=...` jika mau preview (default attachment untuk privacy). |
| **HEAD Check for Size** | Boleh support HEAD request untuk dapatkan Content-Length tanpa download body. Tetap butuh auth. |

#### R6-4 Access Audit Logging
Setiap action pada dokumen = WAJIB insert 1 row ke table `hr_document_access_logs` (Section 6.4). Columns lengkap:
- `document_id FK hr_documents.id`
- `action_type ENUM('VIEW_METADATA', 'DOWNLOAD', 'REPLACE_NEW_VERSION', 'MARK_INACTIVE', 'UPLOAD')` — 5 actions dari Section 6.4
- `actor_user_id FK auth_users.id` (session user, never from body)
- `actor_ip VARCHAR(45) NULL` — ambil dari `request.headers['x-forwarded-for']` atau `request.socket.remoteAddress`. Simpan IP untuk audit traceability. Jika IPv6 bisa sampai 45 char.
- `accessed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP`
- `client_user_agent VARCHAR(255) NULL` — User-Agent header request.

---

## 23. Data Flow (Sesuai Section 29 User Requirement + Tambah Employee Master Mapping)
```
                         ┌──────────────────────┐
                         │ Fingerprint Machine  │
                         │ IP: TBD (Section 27) │
                         └──────────┬───────────┘
                                    │
                              LAN / Protocol TBD
                              (TCP 4370 / HTTP TBD)
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ ERP Fingerprint      │
                         │ Connector Adapter    │
                         │ (abstraction interface)
                         │ + testConnection()   │
                         │ + getRecords(since)  │
                         └──────────┬───────────┘
                                    │
                          ┌─────────┴─────────────┐
                          ▼                       ▼
               ┌──────────────────┐     ┌────────────────────────┐
               │ Device Registry  │     │ Employee ↔ Fingerprint │
               │ hr_fp_machines   │     │ Mapping Table          │
               └──────────────────┘     └──────────────┬─────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Raw Attendance Log   │◄── INSERT ONLY IMMUTABLE
                         │ hr_fp_raw_events     │    dedup_hash UNIQUE
                         │ (SHA256 dedup, audit)│    full payload JSON raw
                         └──────────┬───────────┘
                                    │
                              Processing Engine
                              PR-1 s/d PR-6
                              (min/max tap time → CLOCK IN/OUT)
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ Processed Daily      │←── EXISTING hr_attendance
                         │ Attendance Records   │    expand source_type col
                         │ 1 EMP × 1 DATE = 1   │
                         └──────────┬───────────┘
                                    │
                     ┌──────────────┴───────────────┐
                     ▼                              ▼
              HR Workspace Attendance        Excel Export (xlsx reuse)
              List Daily / Monthly Recap     Format Daily Detail / Monthly
              Unmapped Warning Panel
```

---

## 24. Acceptance Criteria (Rule / Rubric per Spec Mode Skill Artifact Template)

### AC-1: Employee Master Create & 13 Core Fields Validation
- **Type:** `rule`
- **Given:** Role HR login, data test 1 employee baru belum ada di DB, kolom EM-F1 sampai EM-F13 section 3 diisi benar, serta relation EM-F7 (team exists), EM-F8 (position exists), EM-F9 (supervisor valid bukan self).
- **When:** HR submit form New Employee → POST `/api/hr/employees` (upgrade existing route new fields payload body)
- **Then:**
  1. `employee_code` format `EMP-YYYYMM-NNNN` auto-generated server side (tidak dari body), return dalam response.
  2. Email UNIQUE constraint check. Duplikat email → 400 "Email sudah terdaftar untuk employee ID XXX".
  3. 3 kategori dokumen (KTP/KK/IJAZAH) required: upload endpoint dipanggil sesudah create, dokumen tersimpan dengan kategori benar.
  4. Row `hr_employee_history` event `HIRED` otomatis ter-insert.
  5. Audit log `EMPLOYEE_CREATE` + `EMPLOYEE_HISTORY_EVENT` tercatat di hr_audit_logs dengan actor session user displayName(username).
- **Pass Condition:** 1–5 semua TRUE, TypeScript check pass, permission non-HR = POST get 403.
- **Evidence:** API call response data 9 new cols terisi benar; SQL SELECT verify row + history row; 2 audit log exist.

### AC-2: Organization Structure 4 Levels FK Valid (No Invalid FK / Cycle Supervisor)
- **Type:** `rule`
- **Given:** DB sudah provision 2 tabel baru `org_teams` + `org_positions` dengan data sample seed (Divisi IT → Team Backend; Position = "Junior BE", "Senior BE"). Supervisor = Employee ID 1 (valid exist).
- **When:** Employee create dengan team_id=Backend, position_id=Senior BE, supervisor_id=1. Lalu coba update supervisor_id = employee_id sendiri (cycle simple). Coba update team_id = ID yang tidak ada di org_teams.
- **Then:**
  1. Insert success valid FK = 201.
  2. supervisor_id == self_id → 400 "Supervisor tidak boleh sama dengan employee sendiri."
  3. FK team_id tidak ada → 404 "Team dengan ID XXX tidak ditemukan di divisi." (Tidak throw raw 500 FK violation.)
- **Pass Condition:** 3 test scenario return expected HTTP status code, correct error message Indonesian.
- **Evidence:** 3 curl calls + response JSON.

### AC-3: Employee Update Riwayat Tercatat Otomatis (9 History Events)
- **Type:** `rule`
- **Given:** 1 employee existing dengan data awal.
- **When:** 9 actions update = (a) pindah divisi/branch mutation, (b) team change, (c) jabatan change, (d) supervisor change, (e) status PROBATION → PKWTT, (f) base_salary kenaikan, (g) contract extension end_date baru, (h) resign set status RESIGNED exit_date=today, (i) reactivate ARCHIVED rehire.
- **Then:** Setiap update = bertambah 1 row di hr_employee_history dengan ENUM event type H2..H10 benar. history event memiliki actor session dan timestamp server, detail_json snapshot before/after.
- **Pass Condition:** 9 action → 9 history rows distinct events types. Audit logs EMPLOYEE_UPDATE + EMPLOYEE_HISTORY_EVENT juga bertambah 18 (setiap action 2 logs EMP+UPD).
- **Evidence:** Count before/after query history table.

### AC-4: Dokumen HR = HR ONLY Isolation + Audit Akses Download
- **Type:** `rule`
- **Given:** KTP document milik Employee A sudah diupload oleh HR user1. Ada auth user Finance (role FINANCE). Test user2 dengan role HR (lain) dan FINANCE.
- **When:**
  1. User2 (HR lain) coba GET download endpoint doc.
  2. User FINANCE coba GET doc ID yang sama.
  3. KTP Employee A employee coba self access (jika user_id mapping available dan self-service default off — deny).
- **Then:**
  - (1) Status 200 binary stream KTP correct. 1 row log INSERT ke hr_document_access_logs action DOWNLOAD dengan user id user2, time, ip. hr_audit_logs action EMPLOYEE_DOC_DOWNLOAD bertambah.
  - (2) 403 Forbidden. TIDAK ada download log access (catat attempt FAILED access di log).
  - (3) 403 — default self service TIDAK di-ijinkan batch 01 (OB-10 decision TBD = NO).
- **Pass Condition:** 3 scenario result benar, audit logs + access logs exist sesuai. Finance & self TIDAK dapat download byte apapun (response body 0 length + 403).
- **Evidence:** HTTP status + content-length checks + DB audit rows.

### AC-5: Fingerprint Device Registry + Test Connection Button (Hardware Pending Mock)
- **Type:** `rule`
- **Given:** Data dummy 1 device baru Machine Name="Fingerprint Test", IP=valid IP format, Port=4370, Model=ZKTeco G3, Auth config empty placeholder "1234" (encrypted).
- **When:**
  1. Submit Create Device.
  2. Klik Test Connection (terhadap mock connector HTTP ZKTeco simulator — saat implementasi nanti ada mock untuk unit test tanpa mesin nyata).
  3. Get Device List via API → check response auth_config_encrypted field = "••••••••" (masked). Jangan pernah return plain text comm key value.
- **Then:**
  - Device inserted, active=1.
  - Test Connection Online = status ONLINE / mock response simulator "Connected! Firmware version: v1.2.3".
  - List API response: auth_config field masked string only.
- **Pass Condition:** Creation success, UI test success flow, NO credential leak di network response.
- **Evidence:** Device record in DB. Network tab browser → response JSON device list = tidak ada value plaintext password.
- **⚠️ Hardware-dependent Note:** AC ini pass via Mock connector / Unit test tanpa mesin asli. Untuk mesin production nyata → PENDING HARDWARE SPECIFICATION & connectivity test environment.

### AC-6: Fingerprint Pull Sync → Raw Immutable Events → Processed Daily Attendance (End-to-End with Mock Data)
- **Type:** `rule`
- **Given:** Device Active. Employee A dimapping (machine_user_id = 23 → employee_id=A). Dummy mock connector return 150 fake events: 148 valid dari 20 employee berbeda, 1 duplicate (SHA same hash), 1 unmapped ID=999.
- **When:** Click Manual SYNC NOW button.
- **Then:**
  1. hr_fp_sync_runs insert 1 row final_status=PARTIAL (karena unmapped). total_records_fetched=150, new_valid=148, duplicates_skipped=1, unmapped=1.
  2. hr_fp_raw_events insert 149 rows (1 duplicate di-skip UNIQUE index). Deduplication hash benar. is_unmapped=1 untuk id=999 event. is_processed=0 default untuk new rows.
  3. Processing Engine berjalan → insert/update ke hr_attendance processed rows. 1 employee × 1 tanggal = 1 row. Clock IN = earliest pagi, clock OUT = latest sore. Status PRESENT.
  4. Dashboard attendance warning panel "Ada 1 unmapped event. Mohon mapping." muncul.
  5. Audit log ATTENDANCE_SYNC_SUCCESS / PARTIAL bertambah dengan detail fetch 150 row.
- **Pass Condition:** 5 poin semua TRUE. Reprocess Sync ulang data yang sama = duplicates skipped lagi (idempotent), hr_attendance tidak bertambah ganda (UNIQUE constraint employee+date), locked rows tidak berubah.
- **Evidence:** SQL count queries. UI attendance list employee A tanggal X menampilkan Clock IN/OUT benar.

### AC-7: Duplicate Handling + Failed / Partial Sync Behavior Correct
- **Type:** `rule`
- **Given:** Mock connector bisa diatur throw: (a) Timeout, (b) Auth rejected, (c) 30% record broken.
- **When:** 3 sync runs terpisah scenario a, b, c.
- **Then:**
  1. Scenario A timeout 8s → FAILED status sync. Connection_status mesin = OFFLINE. last_sync_at TIDAK di-advance (masih lama).
  2. Scenario B wrong password → FAILED AUTH. connection_status='AUTH_FAILED'. last_sync tidak maju.
  3. Scenario C 30% malformed → PARTIAL SYNC (70% new valid). last_sync MAJU. Error_summary = "30 records gagal parse format. 70 tersimpan."
- **Pass Condition:** Status FAILED/PARTIAL + connection_status enum values akurat. Last Sync cursor advance rule benar.
- **Evidence:** hr_fp_sync_runs 3 rows final_status benar.

### AC-8: Excel Export Attendance Daily Detail via Route with Authorization + Audit
- **Type:** `rule`
- **Given:** 1 bulan attendance data 45 employee 30 hari work = ~1350 rows attendance. HR user login. Finance user login.
- **When:**
  1. HR POST Export endpoint filter range = Month Full. Format Daily Detail.
  2. Finance user call endpoint yang sama.
  3. HR panggil lagi range From = 2026-01-01 To = 2026-12-31 (365 hari > 90 days maximum).
- **Then:**
  - (1) HTTP 200. Response header Content-Disposition attachment filename sesuai S17.3 pattern `Attendance_Period_20260901_20260930_261001xxxx.xlsx`. Content = XLSX binary (valid parse di server test: workbook sheet count = 1, row count header + 1350 data + 3 metadata footer = 1354 rows). Kolom 13 lengkap L17.3. Audit log ATTENDANCE_EXPORT bertambah 1 di hr_audit_logs.
  - (2) 403 Forbidden Finance. TIDAK ada audit log ATTENDANCE_EXPORT (catat failed attempt auth log di general logs).
  - (3) 400 Bad Request "Periode maksimal export 90 hari. Silakan pecah menjadi beberapa periode."
- **Pass Condition:** 3 scenario benar. Audit export HR action log present.
- **Evidence:** Excel file content parse test (xlsx.read return correct rows), status codes 200 / 403 / 400.

### AC-9: Sensitive Data Exposure Negative Check (Security)
- **Type:** `rubric`
- **Dimension:** Data Leak Prevention across all new HR endpoints
- **Scale:** 1 (worst leak) — 3 (acceptable secure) — 5 (excellent zero leak)
- **Anchors:**
  1 = KTP raw bytes accessible public non-auth URL OR device passwords terlihat di network tab response.
  3 = Semua access butuh auth tapi ada 1 minor leak metadata employee name di 404 tanpa auth.
  5 = Semua 15 endpoint baru require session HR/SUPER_ADMIN, mask credential, no IDOR download doc, storage path tidak bisa ditebak, branch scope jika enabled, export permission ketat.
- **Pass Threshold:** ≥ 4
- **Evidence:** Manual pen tests 15 endpoints, check DOM/network for sensitive values; static grep source code for res.send(storage_path) leakage.

### AC-10: Lazy Schema Provision Idempotency (Run Twice = No Error)
- **Type:** `rule`
- **Given:** Empty schema. Call `ensureHrBatch01Schema()` function baru (reuse pattern provisioner).
- **When:** Call function 2x berturut-turut.
- **Then:**
  - Call 1 = Success, tables created/columns added.
  - Call 2 = Success idempotent. Tidak ada error Duplicate table/column name. Schema drift detection report = TIDAK ada perubahan required (all match expected).
- **Pass Condition:** Kedua run return exit 0 / ok status. HR_VERSION bumped to 1.1.0 fingerprint-employee-batch01 di log provision.
- **Evidence:** ensure* function output 2 runs. MariaDB DESCRIBE tables = 9 new tables exist. DESCRIBE hr_employees = 9 new cols + user_id nullable UNIQUE. Add.
- **Pending Hardware:** All AC with fingerprint = PENDING HARDWARE SPECIFICATION untuk production integration test on real devices. Mock connector validasi logic code sudah cukup unit test pass.

### AC-11: H11 AUTH MAP Employee ↔ Auth User
- **Type:** `rule`
- **Given:** Employee A sudah ada di hr_employees (employee_id=123). Auth user baru `user_id=456` ada di auth_users (belum ter-mapping ke employee manapun). SUPER_ADMIN / HR user login memiliki permission untuk map user_id.
- **When:** SUPER_ADMIN / HR POST endpoint `/api/hr/employees/{empId}/user-mapping` dengan body `{ user_id: 456 }` (mapping ditetapkan). Atau PATCH employee dengan field user_id diisi/diubah.
- **Then:**
  1. `hr_employees.user_id` = 456 ter-UPDATE untuk employee_id=123. UNIQUE constraint enforced: 1 user_id hanya boleh milik 1 employee. Jika user_id=456 sudah dipakai employee lain → 400 "Auth user ID 456 sudah terdaftar untuk employee ID XXX."
  2. INSERT 1 row ke `hr_employee_history` dengan `history_event = EM-H11 AUTH MAP`. Data wajib tercatat: `prev_user_id` (sebelumnya, NULL jika baru pertama kali di-set), `new_user_id` = 456, `actor` = session user displayName, `timestamp` = server time, `detail_json` berisi snapshot before/after user_id.
  3. Audit trail di hr_audit_logs: 2 actions bertambah:
     - `EMPLOYEE_HISTORY_EVENT` target_ref = `EMP-XXXX #H11`
     - `EMPLOYEE_UPDATE` target_ref = `EMP-XXXX` detail_text = "Update user_id mapping: prev_user_id=null → new_user_id=456."
  4. Ketika user_id di-UNSET (body `{ user_id: null }`) → history event H11 juga tercatat dengan prev_user_id=456, new_user_id=NULL.
- **Pass Condition:** 4 poin semua TRUE. UNIQUE constraint violation return 400 dengan pesan jelas. Test 2 scenario: (a) Set mapping baru first time prev_user_id=NULL, (b) Ubah mapping user_id lama ke user_id baru → prev_user_id tercatat benar di history.
- **Evidence:** SQL SELECT hr_employee_history history_event='EM-H11 AUTH MAP' row exist. hr_audit_logs 2 rows (EMPLOYEE_HISTORY_EVENT + EMPLOYEE_UPDATE).

### AC-12: H12 CORRECTION Manual (Field Typo / Attendance Patch)
- **Type:** `rule`
- **Given:** Employee A existing dengan data awal. Existing attendance date=2026-09-23 clock_in=09:15, clock_out=NULL.
- **When:**
  - **Scenario A (Koreksi data master typo):** HR edit via form Correction: `full_name` typo "Andi Prasety" → "Andi Prasetyo", `phone` typo "0812345678" → "081234567890". Patch endpoint `/api/hr/employees/{empId}/correction` dengan body `{ field_list: ['full_name','phone'], reason: 'Koreksi typo input saat create, source: KTP asli.', corrections: { full_name: 'Andi Prasetyo', phone: '081234567890' } }`.
  - **Scenario B (Koreksi attendance):** HR patch attendance via existing correction endpoint: clock_in 09:15 → 08:05, reason "Lupa tap, masuk lobi sudah 07:58. Saksi: Supervisor Budi."
- **Then:**
  - **Scenario A (Field Correction Non-Attendance):**
    1. hr_employees kolom full_name & phone ter-UPDATE.
    2. INSERT 1 row ke `hr_employee_history` dengan `history_event = EM-H12 CORRECTION`. Kolom wajib: `field_list` = array ['full_name','phone'] disimpan di detail_json, `detail_json` = snapshot lengkap BEFORE (value lama) + AFTER (value baru) per-field, `reason` = "Koreksi typo input saat create, source: KTP asli.", `actor` = session HR.
    3. Audit trail di hr_audit_logs: `EMPLOYEE_HISTORY_EVENT` (reuse action enum untuk koreksi field master non-attendance) dengan detail_text berisi list field yang diubah.
  - **Scenario B (Attendance Correction):**
    1. hr_attendance clock_in=08:05 ter-UPDATE, locked_by_admin jika ingin dikunci juga.
    2. INSERT 1 row ke `hr_employee_history` dengan `history_event = EM-H12 CORRECTION` (sama event type), `field_list` = ['clock_in'], `detail_json` = before: { clock_in: '09:15' }, after: { clock_in: '08:05' }, reason = "Lupa tap...".
    3. Audit trail di hr_audit_logs: Action type khusus **`EMPLOYEE_ATTENDANCE_CORRECTION`** (action enum #29) dengan target_ref = `EMP-XXXX Date 2026-09-23`, detail_text menjelaskan attendance mana yang dikoreksi beserta reason.
- **Pass Condition:** 2 scenario semua poin terpenuhi. Test negative: tanpa reason → 400 "Reason koreksi wajib diisi." Tanpa field_list non-empty → 400 "Minimal 1 field harus dikoreksi."
- **Evidence:** hr_employee_history EM-H12 CORRECTION rows exist for both scenarios dengan detail_json before/after lengkap. hr_audit_logs action EMPLOYEE_ATTENDANCE_CORRECTION present untuk Scenario B. Response body API correction mengembalikan diff before/after untuk HR verifikasi.

---

## 25. Out of Scope Batch-01 (Tegas — Jangan Sampai Masuk Implementation Nanti!)
| Area | Why OOS Batch-01 | When to Handle |
|---|---|---|
| Payroll Calculate UI, Finance Payroll Menu Lengkap, BPJS Ketenagakerjaan/Kesehatan formula, PPh 21 Pajak, Tunjangan Makan/Transport/Keluarga libraries, Bonus THR engine, Deduction SP, Payslip PDF, Bank transfer CSV. | User jawaban #7 = Finance owner penuh, pengerjaan = BATCH BERIKUTNYA (HR-PAYROLL-FINANCE-BATCH). Batch 01 cuma menyiapkan source data (Employee base salary, attendance processed raw untuk Finance tarik nanti via payload atau integration API). | Batch 02 atau 03. |
| Leave / Cuti / Izin Workflow (request form, balance, approval, attachment) | Priority user #10 = Data Karyawan + Fingerprint saja dulu. Meskipun user #5 confirm dibutuhkan, tidak prioritas batch-01. | Batch 02+. |
| Overtime Request Form + Approval OT + OT Formula Rate kelipatan UU | User #6 confirm dibutuhkan tapi tidak masuk prioritas #10. Hanya simpan field overtime_hours jika mesin ada data tap extra. | Batch 02 bersama Leave Schedule. |
| Work Schedule / Shift Table / Holiday Calendar Nasional / Aturan Terlambat (LAMBAT ENUM value) | Dibutuhkan untuk validasi keterlambatan & perhitungan OT rate otomatis. Tanpa shift = tidak bisa define "jam 08:00 = batas terlambat". | Batch 02 Attendance v2. |
| Self-Service Employee Login lihat absen sendiri / slip gaji sendiri (new role EMPLOYEE) | Butuh keputusan User ↔ Employee relation FK 1-ke-1, juga UI profile. Decision dari batch 01 OB-10 TBD. Jika user set YA = masuk batch 02 self-service. | Batch 02+. |
| Manager/Atasan dapat melihat anak buahnya attendance, approval cuti, koreksi absensi (delegasi) | Saat ini approval 1-level ke HR (jawaban #8). Jika manager butuh batch berikutnya expand 2 level approval. | Batch 02+. |
| Recruitment, Performance Appraisal Formal, Coaching PIP, SP Discipline Workflow (SP1/2/3), Full Onboarding Checklist/Training/Orientation, Offboarding Clearance Asset Return / Deactive Auth User Auto. | Semua diluar 2 prioritas user (Data Karyawan + Absensi Fingerprint). Riwayat mutasi/status employee batch 01 ada. Workflow formal = nanti. | Batch 03+. |
| On-device fingerprint enrollment UI, Upload template sidik jari dari ERP ke mesin | User jawaban #4 → mesin sebagai sumber data absensi ditarik ke web. Enroll sidik jari = tetap di mesin fingerprint langsung (standard SOP). Tidak perlu reverse command enroll via ERP (OOS), nanti butuh API mesin vendor support. | Future / jika vendor SDK memiliki. |
| Biometric match algorithm processing, Fingerprint Template storage / verification algorithm | Matching = SIDE mesin fingerprint. ERP hanya terima event hasil match, tidak olah template biometrik. | NEVER (mesin handle). |
| Notifikasi realtime Email / WA / In App Badge: "Halo Andi, absen Anda hari ini terlambat di-scan." atau "Sync mesin fingerprint cabang Bandung FAILED!". | Butuh Notifikasi engine belum ada di system (NOT FOUND dependency). Bisa future email/WA gateway. | Batch 03 Notifications Module. |
| Cron Scheduler Pull Automatic (jika user jawab OB-2 = TIDAK PERLU / Manual sync saja cukup) | Jika OB-2 = YA butuh Scheduled → Add 1 dependency cron, tetap Batch 01 sama, tinggal enable. Jika TIDAK → Omit. | TBD OB-2 Decision. |
| Laporan HR lain: Headcount per divisi report, Turnover report, Training LMS, Career path, 360 Review, Inventory Equipment Assignment per Employee. | Semua diluar Batch 01 scope 2 prioritas. | Batch 04+. |

---

## 26. Open Business Decisions (OB = User Jawab Sebelum Implement / Saat Implementasi Jalan)

Ini pertanyaan yang user harus jawab selain hardware specification (Section 27). Jawaban user akan mengubah beberapa FRS detail (default nilai berlaku jika tidak dijawab).

| ID | Question | Default Sementara (jika user tidak jawab = pakai ini) | Section Reference in FRS |
|---|---|---|---|
| **OB-1** | Sync mode = MANUAL ONLY? / AUTOMATED SCHEDULED ONLY? / **BOTH** (Manual + Scheduled default recommended)? | ✅ **BOTH (Manual + Scheduled)** Scheduler 15 menit 07.00–20.00 hari kerja. Manual selalu bisa kapan saja. | 11 Sync Mode |
| **OB-2** | Jika Scheduled = YA, berapa interval? Jam operasional? Default setiap 15 menit dari jam 07:00 WIB s/d 20:00 WIB hari Senin s/d Sabtu. Hari libur = nanti Batch 02 libur table apply. Batch 01 set schedule manual cron (weekday + Saturday). | **15 menit interval, 07–20, Senin–Sabtu.** Jika user mau 1 jam sekali = lebih ringan. | 11 Sync Modes |
| **OB-3** | Satu Employee BISA terdaftar di BEBERAPA Mesin Fingerprint? (Ya/ Tidak) | **YA.** Unique constraint hanya di-per-machine (1 user id dalam 1 machine = 1 employee). Boleh 1 employee punya mapping ke 3 mesin berbeda kantor. | 10 MP-1, MP-2 Rules |
| **OB-4** | Riwayat Fingerprint mapping saat re-enroll jari baru / pindah mesin = simpan history? | **YA. Riwayat.** Row lama enrollment_status=REVOKED, tidak dihard delete. | 10 MP-3 |
| **OB-5** | Jika ada Unmapped ID event dari mesin (ID tidak ketemu mapping). Behavior Batch-01: Abaikan saja + Warning panel ke HR untuk mapping nanti? ATAU setiap sync > N unmapped → FAILED status supaya user perbaiki? | **Default Abaikan + Warning Panel (PARTIAL SYNC warning, bukan FAILED). Beri peringatan dashboard HR: N Data Pegawai Mesin Belum Terdaftar. Click untuk ke halaman Mapping.** Jangan buat FAILED total. | 10 MP-4; 15 Partial rule. |
| **OB-6** | Dokumen Storage Backend: **A (Default) Local Disk** `apps/web/storage/hr_documents`? **B Object Storage (S3/MinIO)?** Enkripsi at-rest file KTP/KK = WAJIB / TIDAK (menunggu PDP audit)? | **Opsi A (Local Disk).** Enkripsi at-rest recommended tapi tidak mandatory Batch-01 MVP, tapi abstraksi storage_ref_internal supaya gampang pindah ke Object Storage nanti tanpa rubah app logic. | Section 6.5 Storage |
| **OB-7** | Branch Scope view data HR: Role HR CABANG hanya bisa lihat employee + attendance branch sendiri? ATAU SEMUA HR = lihat semua cabang (HQ visibility)? (Ini resolve SECURITY FINDING sebelumnya Branch scope tidak ada filter.) | **Default untuk Batch-01 sementara = SEMUA LIHAT SEMUA (HQ visibility), tapi toggle filter ada dan bisa enable sewaktu-waktu jika user memutuskan scope cabang di kemudian hari.** Beritahu user risiko cross-branch leak jika tidak dipisah. | 20 Security. Branch Scope Filter. |
| **OB-8** | Employment Status ENUM 9 opsi (PROBATION/PKWT/PKWTT/MAGANG/OUTSOURCE/RESIGNED/TERMINATED/PENSIUN/ARCHIVED). Apakah ini vocabulary final? Atau kurang? Ada yang mau diganti nama? Mau tambah LAINNYA? | **Gunakan 9 values di atas.** Missing value bisa ditambahkan nanti via ALTER MODIFY ENUM lazy pattern. User OK kan? | EM-F10 Status ENUM. |
| **OB-9** | Position Level vocabulary untuk master jabatan? Position Level contoh: "Staff/Senior/Manager/Head/Director". User mau 5 itu? Atau tambah "Associate", "Leader", dll? | **Default 5 levels itu saja.** Bisa edit via UI master jabatan (text field level not enum — flexible). | Table org_positions position_level col. |
| **OB-10** | Employee Self-Service view data sendiri: Boleh lihat attendance harian sendiri? Boleh download slip nanti? Boleh upload KTP sendiri untuk di-review HR? **Batch 01 Default = TIDAK di-aktifkan dulu (all deny).** Apakah user ingin Batch 01 juga include self-service view attendance? | **DEFAULT TIDAK ADA SELF SERVICE BATCH 01.** Jika user ingin = butuh role "EMPLOYEE" baru + UI pages dashboard self = butuh effort tambahan (kemungkinan Batch 02). Bisa diputuskan user. | 18 Roles TBD Employee Self. AC-4 #3 deny. |
| **OB-11** | Manager / Atasan Langsung (Supervisor): Boleh lihat attendance team anak buahnya sendiri? Bisa export anak tim? Atau 100% semua hanya HR? | **DEFAULT BATCH 01 TIDAK BERI AKSES KE MANAGER.** Semua hanya HR + SUPER_ADMIN. Jika user ingin manager lihat anak buah = future batch 02. Expand UI + permissions manager-level. | 18 Roles Matrix kolom Manager/Atasan = TBD ❌ Default. |
| **OB-12** | Finance (Payroll Owner): Apakah Finance perlu AKSES LANGSUNG menu Attendance export Excel? ATAU HR mengekspor lalu mengirim file ke Finance (tidak perlu login Finance ke menu HR)? | **DEFAULT BATCH 01 = Finance TIDAK PUNYA AKSES HR ATTENDANCE.** Payroll batch berikutnya bisa sediakan endpoint secure transfer payload summary ke Finance tanpa Finance perlu lihat halaman HR raw. Kalau Finance mau akses menu = decision user, kita expand permission. | 18 Roles TBD Finance column. |
| **OB-13** | Retention Data Raw Attendance Fingerprint & Dokumen pegawai setelah resign: Berapa tahun disimpan sebelum destroy/arsip offline? Sesuai Ketenagakerjaan RI = minimal 5 tahun setelah PHK / 7 tahun untuk pajak? | **Default 7 tahun (pajak + ketenagakerjaan terpanjang).** Cleanup script non-active docs / raw archived data bisa dijalankan manual SUPER_ADMIN setelah 7 tahun. | 12 Raw Retention. 6 Dokumen Retention. |
| **OB-14** | Saat Resign/Offboard status RESIGNED/TERMINATED (status change H8), otomatis mapping fingerprint enrollment_status di-set REVOKED? (Tap sidik jari = event tidak diproses meskipun mesin masih mengenalinya.) | **YA. Otomatis revoke all mappings employee status berubah ke exited (RESIGNED/TERMINATED/PENSIUN/ARCHIVED).** Rehire = mapping re-enable kembali. | H8 Rule Status → Auto Revoke. |
| **OB-15** | Koreksi Attendance oleh HR: Boleh mengubah Clock IN/OUT yang berasal dari Fingerprint Machine? Atau Raw mesin = Immutable Final, koreksi harus melalui Surat Izin / Adjustment terpisah? Saat ini API PATCH /api/hr/attendance existing BISA keduanya. | **Default: HR BISA koreksi (manual adjustment).** Setiap koreksi = audit log EMPLOYEE_ATTENDANCE_CORRECTION, catat before/after dan reason text. Locked by admin tetap bisa. Jika user ingin rule "Fingerprint data = final, tidak boleh koreksi tanpa izin tertulis SPV", bisa tambah approval layer nanti. | 18 Manual Correction HR. |

---

## 27. Hardware Decisions Required (BLOCKER Connector Implementation — WAJIB user jawab sebelum implementasi connection ke mesin ASLI. Bisa implementasi logic + mock connector duluan, tapi integrasi mesin nyata = TIDAK BISA tanpa info ini.)

| HW Decision ID | Question (Wajib user jawab / berikan manual book mesin / IT team jawab) | Notes |
|---|---|---|
| **HW-1** | Vendor / Merek Fingerprint = apa? | Contoh: ZKTeco, Solution, eSSL, Hikvision, Dahua, Fingerprint Merk lain? |
| **HW-2** | Exact Model Number setiap mesin? | Misal: "ZKTeco SpeedFace-V5L [RFID+Face+Finger]"; "ZKTeco K40"; "Solution X100-C". Tolong merek + model EXACT. |
| **HW-3** | Protocol komunikasi mesin mendukung apa? (Baca manual / vendor): **(A) ZKTeco Standard TCP Binary protocol (port 4370 default, comm key), (B) HTTP REST API dengan Basic Auth di Port 80/443, (C) UDP C3 Protocol, (D) WebSocket Push Events, (E) CSV File Export via USB (jika network TIDAK BISA, fallback USB export import CSV).** | Paling umum ZKTeco = Opsi A. Beberapa mesin support HTTP JSON. Jika opsi E USB = perlu tambah mode CSV Upload manual di FRS (sementara). FRS connector abstraction siap adaptasi asalkan protocol diketahui. |
| **HW-4** | Network Port Number setiap mesin? | Jika ZKTeco TCP = 4370 default. Jika HTTP = 80/443. Cek di mesin menu Info → Network. |
| **HW-5** | Authentication mesin: (A) Comm Key (TCP ZKTeco default biasanya 0 atau 12345678 8 byte?), (B) Admin Username & Password (web interface HTTP), (C) SDK Access token, (D) Tidak ada auth (not recommended)? | **⚠️ JANGAN kirim password PLAINTEXT ke chat ini.** Tandai saja: "Comm Key sudah disimpan di vault IT / password manager, akan dimasukkan via .env saat implementasi". Kita hanya butuh TAU metode auth nya apa (A/B/C/D). |
| **HW-6** | Total Jumlah mesin fingerprint yang akan terhubung Batch-01? Dan masing-masing IP Address & lokasi? | Misal: 5 mesin. (1) 192.168.1.120 HO Lantai 1 Lobby, (2) 192.168.1.121 HO Lantai 3, (3) 10.10.20.12 Cabang Surabaya, dst. Kalau IP belum static = DHCP Reservation, butuh static untuk stabilitas sync. |
| **HW-7** | Setting Timezone di semua mesin = ASIA/JAKARTA WIB UTC+7? Ada mesin yang jam nya salah / tidak sinkron NTP? | Jika jam salah beberapa menit / beda timezone: kita setting device_timezone per device di DB, normalize ke WIB di raw processing. User cek 1 perangkat apakah menunjukan jam yang benar sesuai jam HP. |
| **HW-8** | Cara pendaftaran sidik jari employee di dalam mesin: User ID / Enrollment ID di mesin = menggunakan format NOMOR URUT berapa digit? Misal EMP001 → ID = 1? Atau 4 digit = 0001? atau 5 digit? Apakah urutan ID cocok dengan nomor urut `employee_code` EMP-YYYYMM-NNNN (digit NNNN saja)? | Contoh: EMP-202609-0007 → di mesin ID user = 7? Atau 0007? atau 2026090007? Menentukan strategy backfill mapping table di Section 10. Kalau ID random = HR harus 1 per 1 mapping manual via UI (ada page mapping). |
| **HW-9** | Setiap mesin menyimpan berapa banyak record history log sebelum data ter-overwrite? (Misal 50.000 records / 100.000 records). Ini untuk menentukan seberapa sering scheduled sync (jika buffer kecil 10rb → sync setiap 5 menit agar tidak terhapus lama). | Lihat manual mesin atau menu storage Info di mesin. Jika tidak diketahui → safe default sync setengah jam sekali. |
| **HW-10** | Apakah mesin fingerprint BISA diakses dari server ERP melalui network? (IT team jalankan perintah `ping <ip_mesin>` dan `telnet <ip> <port>` dari server ERP — Apakah Connected / Refused / Timeout?) | 🔴 KRITIS INFRA. Jika tidak bisa connect = code implementasi sehebat apapun tidak bisa konek. Jangan skip. IT Team jalankan 2 test ini dan report hasil ke FRS Evidence. |

---

## 28. Candidate Implementation Batches (Internal Grouping, Bukan Final. Bisa digabung/split user setuju.)

### 🧱 Candidate A — Employee Foundation (Org Structure + Master + Dokumen + Riwayat)
**Area:**
- New Tables: org_teams, org_positions
- hr_employees expand +9 cols (EM-F3, F7–F13 + user_id nullable)
- employment_status ENUM upgrade (free text → ENUM 9)
- hr_employee_history events H1..H12 insert triggers/service layer
- hr_documents + hr_document_access_logs tables + 4 endpoints CRUD/download upload/replace
- Audit trail expand +13 action ENUM values EMPLOYEE_UPDATE/DOC_*/FP_*/ATTENDANCE_SYNC_*/ATTENDANCE_EXPORT/EMPLOYEE_ATTENDANCE_CORRECTION (total 29 = 16 existing + 13 baru)
**Dependency:** None (independent pertama jalan)
**Business Decision:** Section 26 OB-6, OB-7, OB-8, OB-9, OB-14
**Technical Gap:** Backfill position_name existing free text to FK positions, unique email constraint conflict handling existing duplicate data.
**Expected Benefit:** Dasar struktur 4 level + 3 dokumen legal + riwayat mutasi employee 100% terlacak. Privacy PDP Data KTP/KK terkontrol.
**Open Questions:** OB storage dokumen local vs S3 (OB-6).

### 👆 Candidate B — Fingerprint Integration (Devices + Mapping + Connector Adapter Abstraction + Mock)
**Area:**
- New Tables: hr_fp_machines (device registry 13 cols), hr_fp_employee_mappings (mapping rules), hr_fp_sync_runs (log sync)
- Interface `FingerprintMachineConnector` + concrete Mock implementation for unit tests
- Test Connection UI, CRUD Devices, Mapping UI pages
- Encrypted storage device auth config
**Dependency:** Candidate A complete (employee_id FK exists).
**Decision Needed:** Section 27 ALL HW decisions (vendor/model/protocol) at minimum untuk decide connector concrete ZK/HTTP; tapi Mock + Abstract bisa jalan DULU sambil menunggu jawaban user HW.
**Technical Gap:** No fingerprint SDK dep existing. Pilih TCP library untuk ZKTeco atau HTTP client (existing pattern node:http atau axios sudah tersedia).
**Expected Benefit:** UI devices lengkap, bisa test conn mock, mapping data siap sebelum real connector.
**Open Questions:** SEMUA Section 27 HW IDs.

### 📊 Candidate C — Attendance Operations (Raw Events Processing + Daily/Monthly Recap UI + Excel Export)
**Area:**
- hr_fp_raw_events immutable table, dedup hash unique
- Processing Engine PR-1..PR-6 rules, manual / scheduled sync runners
- Failed/Partial/Duplicate handling (Sections 14-15)
- Expand existing hr_attendance processed table (new source_type column, UNIQUE preserved)
- Attendance daily/monthly UI filter views + warning unmapped panel
- Export Excel endpoint (reuse xlsx) + audit export log
**Dependency:** Candidate A + Candidate B complete (butuh employee list & devices).
**Decision Needed:** Section 26 OB-1 (Sync modes), OB-2 (interval schedule), OB-3/4/5 (mapping rules), OB-13 (retention), OB-15 (koreksi).
**Technical Gap:** Scheduler cron dependency (OB-2). Jika Manual only → no dep. Jika Scheduled Ya → node-cron/BullMQ addition.
**Expected Benefit:** ✅ End to End flow: Fingerprint → Raw → Processed → UI → Export Excel. Prioritas #10 user complete!
**Open Questions:** OB-10/11/12 (self-service / manager / finance access exports).

### Dependency Diagram Candidate Batches:
```
Candidate A (Employee Foundation) ─┐
                                   ├──► Candidate C (Attendance Ops + Export)
Candidate B (Fingerprint) ─────────┘
                 │
                 └──► Depends on all HW decisions Section 27 for real device connector.
```
Bisa juga user memilih menggabungkan A + B (Employee + Devices) menjadi 1 Batch besar jalan pertama tanpa split. Terserah user timeline.

---

## 29. Current System vs Requirement Gap Matrix

| Requirement | Current System (Audit Evidence) | Gap | Status |
|---|---|---|---|
| EM-F1 Employee Code | ✅ Auto generate `EMP-YYYYMM-NNNN` | Tidak ada gap. | EXISTS. Preserved. |
| EM-F3 Email Corporate Unique | ❌ NOT FOUND col. | Add Email UNIQUE + validate format. | **NEW COLUMN + VALIDATION required.** |
| EM-F7 Team FK org_teams | ❌ org_teams = 0. | New table org_teams + FK hr_employees.team_id. | **NEW TABLE + FK + UI form select.** |
| EM-F8 Position FK Master (replace free text position_name) | ⚠️ PARTIAL position_name text | New org_positions table + backfill existing values to FK rows. | **NEW TABLE + DATA BACKFILL MIGRATION.** |
| EM-F9 Supervisor FK Self | ❌ NOT FOUND. | New column + cycle detection basic rule (not self). | **NEW FK + Validation Rule.** |
| EM-F10 Status ENUM Controlled Vocab | ⚠️ PARTIAL free text VARCHAR default KARYAWAN | ALTER MODIFY COLUMN ENUM 9 values + history events trigger. | **MODIFY EXISTING COLUMN TYPE.** |
| EM-F12 Contract Info + Exit Date | ❌ NOT FOUND 5 cols (contract_doc_id/start/end, exit_date, exit_reason). | 5 new cols + FK to hr_documents. | **NEW COLUMNS.** |
| Riwayat Pegawai H1..H12 | ❌ NOT FOUND. Audit log existing only 16 generic actions no per-field diff. | New hr_employee_history table + service insert setiap update. | **NEW TABLE + Service Layer Triggers Every Update.** |
| 4 Level Org Structure | ⚠️ PARTIAL (2 levels: Branch + Division). Missing 2 levels: Team → Position → Supervisor self-ref | Add tables org_teams/org_positions + supervisor FK. | **2 NEW TABLES + 2 NEW FK.** |
| 3 Dokumen KTP/KK/Ijazah HR Only + Access Control HR | ❌ 0 tables 0 endpoints. Upload route HR TIDAK ADA. | 2 New tables (hr_documents + access_logs). + 5 endpoints Upload/Download/Replace/Inactive/List. Storage folder + MIME whitelist. | **2 TABLES + 5 ENDPOINTS + STORAGE.** |
| Fingerprint Device Registry + Encrypted Auth | ❌ 0 tables 0 code. Search repo = NOT FOUND (only getItemCodeFingerprint helper for barcode = unrelated). | New Table hr_fp_machines + Encryption env var. Connector interface abstraction. Mask credential UI. | **NEW TABLE + CRUD ENDPOINTS + MASKING.** |
| Device ↔ Employee Fingerprint Mapping | ❌ NOT FOUND. | New Table hr_fp_employee_mappings. UI mapping page batch upload or 1-1. | **NEW TABLE + UI.** |
| Pull Data Mesin Network IP | ❌ 0 network TCP/HTTP integration code ke fingerprint. Face recognition existing = upload browser capture, TIDAK ada machine pull. | Connector + sync service. Manual SYNC NOW. Optional Scheduled. | **NEW ABSTRACTION + 2 CONNECTOR (Mock + vendor specific concrete TBD).** |
| Raw Attendance Immutable Storage + Dedupe SHA256 | ❌ NOT FOUND. Raw event = TIDAK tersimpan. | hr_fp_raw_events INSERT ONLY with dedup hash index. Retain JSON payload. | **NEW TABLE + INDEX + INSERT ONLY RULE.** |
| Daily Attendance Processed Clock IN/OUT min/max tap | ✅ PARTIAL. table hr_attendance exist check_in/out colum. | Add PR-1..PR-6 processing engine. | **Expand Existing Table — add source_type column; add PROCESSING ENGINE service.** |
| Attendance Status Processing (LAMBAT / libur / shift) | ❌ No LAMBAT ENUM. 4 status existing: PRESENT/SICK/PERMIT/ALPHA. | ⚠️ Keep 4 Statuses Batch 01. LAMBAT = Future Batch 02 OOS. Libur/Shift = OOS. | **NO CHANGES for LAMBAT (Out of Scope Batch 01).** |
| Duplicate Detection Attendance | ❌ Not implemented. | SHA256 hash + unique index. | **NEW INDEX MECHANISM.** |
| Sync Success / Partial / Fail behavior & error messages | ❌ No sync concept existing = manual HR input. | hr_fp_sync_runs table + 7 matrix fail scenarios error messages Indonesia friendly. | **TABLE + ERROR HANDLING + STATUS TRACKING.** |
| Monthly Recap Attendance View | ⚠️ PARTIAL visualization 30 hari di tab permissions/disciplinary (read-only insight, no formal filter month). | New Tab Monthly Recap with month filter, team/div filter. | **UI NEW TAB in Workspace Attendance.** |
| Export Excel Attendance Daily Detail / Monthly Recap | ⚠️ PARTIAL permission matrix `hr.export = TRUE` existing di access-control, tapi **0 endpoint export** untuk HR attendance. Library xlsx available but not used for HR. | New Export Endpoint. Reuse xlsx@18.5 lib + 26 existing patterns. 90 day max rule. | **NEW API ENDPOINT + Audit ATTENDANCE_EXPORT log.** |
| Security Branch Scope Filter Queries | ❌ NOT FOUND (security finding previous audit no WHERE branch filter). | Decision OB-7. If user YA → add toggle WHERE condition. If user TIDAK → no changes temporary. | **CONDITIONAL TOGGLE implementation based OB-7 decision.** |
| Payroll Calculation, BPJS, Tax, Payroll UI Finance | ❌ (Sempat salary-slips route HR exist = existing ownership Finance kepindahan user jawaban 7). | Batch 01 OOS. Future Finance Batch. | **OUT OF SCOPE BATCH 01 per user jawaban 7.** |
| Role HR Only for dokumen + employee edit + attendance operations | ✅ EXISTS permission matrix `hr` resource = create/update/export view HR role allowed. Finance excluded prefix /hr (access-control good). | Missing granular action doc download / device config = tambah scope ke permission matrix (atau inline check role HR/SUPER_ADMIN only without new table permission). | ✅ Largely EXISTS; **minor adjustment add HR-only checks for new endpoints.** |
| Scheduled Sync Job Server Side | ❌ NOT FOUND (setInterval client-side only UI timer). | Decision OB-1. If BOTH/Manual + Scheduled = add node-cron dependency. If Manual Only → skip. | **CONDITIONAL DEPENDENCY ADD (OB-1).** |

---

## 30. Final Readiness Classification

| Item | Classification | Notes |
|---|---|---|
| **A. Employee Master (Section 3, 4, 5, 6) + Riwayat + Dokumen** | 🟢 **READY FOR IMPLEMENTATION** | Semua fields, table, behavior, access rules sudah jelas di FRS. Hanya menunggu 5 keputusan kecil OB-6 (Storage), OB-8 (status ENUM), OB-9 (levels jabatan), OB-14 (auto revoke mapping on resign), OB-13 retention. Default values ada → tidak perlu block. Mulai duluan. |
| **B. Organization 4 Levels Expand (Team + Position + Supervisor)** | 🟢 **READY FOR IMPLEMENTATION** | Clear add 2 tables + FKs. Tidak ada external dependency hardware. Backfill strategy clear. 2 tabel baru sederhana. Mulai. |
| **C. Attendance Device Registry + Fingerprint Connector Interface Abstraction + Mock Connector** | 🟡 **READY WITH OPEN DECISIONS** | Bisa implement UI device registry, CRUD, Test Connection Mock, Mapping pages, dan Mock Connector interface TANPA menunggu spesifikasi hardware nyata. Unit test dengan Mock Connector 150 fake events → PR-1..PR-6 processing → Excel export pipeline. Logic internal 100% berjalan tanpa mesin asli. |
| **D. Attendance Raw Storage + Processing Engine + UI Recaps + Excel Export** | 🟡 **READY WITH OPEN DECISIONS** | OB decisions sync modes OB 1/2/5 → default values tersedia. Implementasikan dengan default, jika user override ganti setting value DB saja. |
| **E. Production Real Fingerprint Machine Network Integration (Actual Pull Data dari Mesin Nyata)** | 🔴 **BLOCKED BY HARDWARE INFORMATION** | 🔴 Tidak bisa lanjut tanpa jawaban **Section 27 SEMUA 10 HW decisions** (Vendor, Model, Protocol, Port, Auth, IP list, IT ping test). Sampai user / IT team mengirim ini = connector concrete TIDAK BISA ditulis & di-tes terhadap mesin asli. Bisa menulis mock adapter, tapi production connect nyata = BLOCKED sampai spesifikasi hardware & network readiness terkonfirmasi. |
| **Security Branch Scope Filter (OB-7) + Self Service Access (OB-10/11/12)** | 🟡 **READY WITH OPEN DECISIONS** | Toggle switch tersedia di code design. Tinggal enable / disable berdasarkan user jawaban Section 26 OB. Tidak block schedule implementasi dasar. |
| **FINAL OVERALL** | **READY WITH OPEN DECISIONS + HARDWARE BLOCK for real machine connection only** | Logic, Tables, UI, Processing Engine, Roles, Audit, Export = SEMUA READY (bisa start Candidate A, B abstract mock, C). Yang BLOCKED = koneksi mesin fingerprint PRODUKSI NYATA butuh HW spec + network test IT. Mock connector development TIDAK TERHALANG. |

---

## APPROVE GATE: Menunggu Review User FRS ini

Sebelum implementasi Candidate A/B/C mulai:
1. User konfirmasi **Section 30 Final Readiness setuju.**
2. Jawab **minimal Section 27 HW-ID HW-1 s/d HW-10** (jika ingin langsung production connector; jika hanya mock internal unit test dulu = boleh tunda HW jawaban sambil develop logic A+B Mock+C).
3. Jawab **Section 26 Open Business Decisions yang ingin di-override dari default value.** Default berlaku jika user tidak jawab.

Setelah user APPROVE spec.md ini → Spec Mode beralih phase: Generate tasks.md (Plan phase) → Implementasi batch.

---

## GATE 0 RECONCILIATION SUMMARY (Ringkasan Perubahan Spec Reconciliation Batch)

**Tujuan:** Dokumen ini merangkum 6 item reconciliations (R1 s/d R6) yang ditambahkan ke FRS ini untuk memastikan spec lengkap sebelum implementasi berjalan. Semua 6 item = SUDAH DIMASUKKAN ke section terkait di FRS ini. Berikut ringkasan cross-reference:

| Reconciliation ID | Judul Ringkas | Section Lokasi Detail di FRS | Status Verifikasi |
|---|---|---|---|
| **R1** | **Fixed Audit Trail ENUM Count: 16 Existing + 13 Baru = 29 Total Actions** | Section 19.1 (list 16 existing + 13 baru), Section 19.2 (tabel detail 13 actions baru explicit: #17 s/d #29), Section 21 Internal Deps (29 actions), Section 22 Data Model (+13 ENUM), Section 28 Candidate A (+13 ENUM). Semua "25" → "29", semua "9 baru" → "13 baru" sudah di-replace. | ✅ DONE 100%. |
| **R2** | **Added AC-11 (H11 AUTH MAP) + AC-12 (H12 CORRECTION) ke Acceptance Criteria** | Section 24 → `### AC-11: H11 AUTH MAP Employee ↔ Auth User` (rule lengkap dengan 4 Then steps, UNIQUE constraint user_id, 2 audit trail EMPLOYEE_HISTORY_EVENT + EMPLOYEE_UPDATE). `### AC-12: H12 CORRECTION Manual (Field Typo / Attendance Patch)` (Scenario A typo field master → EMPLOYEE_HISTORY_EVENT, Scenario B patch attendance → EMPLOYEE_ATTENDANCE_CORRECTION action #29). Kedua AC di-append SETELAH AC-10, SEBELUM Section 25. Tidak ada renumber AC existing. | ✅ DONE 100%. |
| **R3** | **Status VARCHAR → ENUM Migration Backfill Safe Plan** | Section 22.1 `### R3: Existing Status VARCHAR → ENUM Migration Backfill Safe Plan`. 7 step: R3-0 PRE-SELECT DISTINCT, R3-1 COUNT TOTAL, R3-2 MAP TABLE 13 mapping value explicit (KARYAWAN/TETAP→PKWTT, KONTRAK/PKWT→PKWT, MAGANG, OUTSOURCE, PROBATION/PERCOBAAN, RESIGN/KELUAR→RESIGNED, PHK→TERMINATED, PENSIUN, ARSIP→ARCHIVED, NULL/empty/unknown→OUTSOURCE safe default), R3-3 FAIL-CLOSED unknown > 5% PAUSE, R3-4 UPDATE dulu BUKAN langsung ALTER, R3-5 VERIFY post-update, R3-6 ALTER COLUMN, R3-7 POST-AUDIT. All dalam TRANSACTION, rollback aman. | ✅ DONE 100%. |
| **R4** | **position_name free text → FK position_id Backfill Plan** | Section 22.1 `### R4: Existing Employee position_name free text → FK position_id Backfill Plan`. 5 step IDEMPOTENT: R4-1 SELECT DISTINCT position_name GROUP BY, R4-2 INSERT IGNORE INTO org_positions dengan CONCAT('AUTO-', LEFT(SHA1(position_name),8)), R4-3 UPDATE INNER JOIN set position_id WHERE position_id IS NULL, R4-4 VERIFY no NULL position_id for non-empty position_name, R4-5 LEGACY column position_name di-keep 1 batch compatibility, deprecated 2 minggu post Batch-01, NO DROP. Run 10x = tidak ada error. | ✅ DONE 100%. |
| **R5** | **Supervisor FK Cycle Detection Algorithm (2 Layer)** | Section 22.1 `### R5: Supervisor FK Cycle Detection Algorithm`. 2 layer wajib: (a) R5-1 BASIC CHECK self: supervisor_id == employee_id → 400 "Tidak boleh menjadi atasan sendiri". (b) R5-2 RECURSIVE CTE (Option A, recommended) atau While Loop max depth 50 (Option B fallback) untuk detect N-level cycle A→B→A atau A→B→C→D→A → 400 "Terdeteksi circular atasan. Mohon perbaiki struktur organisasi." 2 Test Case explicit cover: Test A (A→A reject), Test B (A→B→A reject). Race condition safe dengan SELECT FOR UPDATE. | ✅ DONE 100%. |
| **R6** | **HR Document Storage Private Requirements** | Section 22.1 `### R6: HR Document Storage Private Requirements`. 4 subsections: R6-1 Location (apps/web/storage/hr_documents, chmod 0700, .gitignore VERIFIED apps/web/storage already line 14 root .gitignore). R6-2 Upload Validation: MIME whitelist image/jpeg, image/png, application/pdf ONLY. Max 5MB per file. Filename sanitize [^A-Za-z0-9._-] → '_', NO path traversal chars. Internal storage name = SHA256(emp_id+filename+timestamp).hex + ext. R6-3 Access Download: NO public static folder NEVER. Only authorized endpoint binary stream Content-Disposition attachment with original_sanitized filename. R6-4 Audit Access Logs: hr_document_access_logs setiap action (VIEW_METADATA/DOWNLOAD/REPLACE_NEW_VERSION/MARK_INACTIVE/UPLOAD) + actor_ip + user_agent. | ✅ DONE 100%. |

**Total Summary Gate 0:** 6/6 Reconciliation Items (R1-R6) = ✅ SUDAH TERINTEGRASI PENUH ke spec.md ini. Tidak ada unresolved item pending. History event coverage 12/12 (H1-H12) sudah diverifikasi di Section 4.3 R3 table. Acceptance Criteria sekarang AC-1 s/d AC-12 (10 awal + 2 baru R2). Audit action ENUM 29 total (16 existing + 13 baru R1). Spec ini = GATE 0 PASSED untuk masuk ke approval user → Plan phase tasks.md generate.
