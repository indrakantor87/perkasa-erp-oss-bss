# HR PRD Alignment

## Tujuan

Dokumen ini menyelaraskan implementasi modul `HR` di web ERP dengan:

- `/.trae/documents/prd-aplikasi-web-utama.md`
- `/docs/web-role-division-menu-feature-catalog.md`
- rule global capability-based rendering dan contextual prefill pada shell ERP

Dokumen ini menandai:

- `Core PRD`: requirement inti yang memang diminta PRD / katalog fitur
- `Operational Extension`: perluasan operasional yang tetap sejalan dengan PRD
- `Operational Constraint`: batas implementasi yang masih dapat diterima untuk fase saat ini

## Ringkasan Acuan PRD

### PRD utama

PRD utama menetapkan HR sebagai shell untuk:

- employee
- attendance
- salary slip
- loan

### Katalog fitur web

Katalog fitur HR menetapkan area:

- shell domain: header, highlights, alur employee, attendance, payroll, loan
- review employee: `employee`, `division`, `branch`, `status employee`
- review attendance: `tanggal`, `check-in`, `check-out`, `overtime`, `status lock`
- review face attendance: `analytics status`, `score/confidence band`, `recommendation`, `baseline state`
- review loan: `loan amount`, `installment`, `status loan`
- review payroll: `income`, `deduction`, `total`, `release status`, `void status`
- form write-side:
  - employee master
  - attendance
  - geofence
  - face config
  - loan
  - payroll
  - archive/reactivate
- contextual prefill:
  - `attendance`
  - `loan`
  - `employee`
  - `payroll`

## Alignment Implementasi Saat Ini

### 1. Shell domain HR

Status: `Core PRD - aligned`

Implementasi HR saat ini sudah:

- berada pada domain resmi `/hr`
- menampilkan review data HR dan panel write-side dalam shell yang sama
- memakai gating role dan `review-db ready`
- memanfaatkan prefill untuk action HR yang relevan

Sumber:

- `apps/web/components/domain-shell.tsx`

### 2. Review employee

Status: `Core PRD - aligned`

Review employee saat ini sudah menampilkan:

- employee code
- nama employee
- division
- branch
- position
- employment status
- join date
- phone

Implementasi berasal dari:

- `hr_employees`
- `org_divisions`
- `org_branches`

Sumber:

- `apps/web/lib/services/domain-service.ts`

### 3. Review attendance

Status: `Core PRD - aligned`

Review attendance saat ini sudah menampilkan:

- attendance date
- check-in
- check-out
- overtime hours
- status
- locked by admin

Ini sesuai dengan requirement PRD untuk review attendance harian.

### 4. Review face attendance

Status: `Core PRD - aligned`

Implementasi HR sudah menyediakan section khusus untuk:

- face attendance config
- face priority queue
- review face attendance
- face retake queue
- analytics / baseline outcome

Ini selaras dengan katalog fitur yang memang meminta review face attendance berbasis analytics dan recommendation.

Catatan penting:

- implementasi saat ini adalah fondasi capture, review, baseline, confidence band, dan recommendation
- belum boleh diklaim sebagai face recognition otomatis penuh

### 5. Review loan HR

Status: `Core PRD - aligned`

Review loan saat ini sudah mencakup:

- employee
- loan type
- amount
- monthly installment
- status

Ini konsisten dengan requirement loan dan status pinjaman employee.

### 6. Review payroll

Status: `Core PRD - aligned`

Review payroll saat ini sudah mencakup:

- payroll month/year
- total income
- total deduction
- net salary
- release status
- void status

Ini sesuai dengan requirement payroll di katalog fitur.

### 7. Form employee master

Status: `Core PRD - aligned`

Form employee create saat ini sudah mendukung:

- branch code
- division code
- full name
- position
- employment status
- join date
- base salary
- phone
- whatsapp

Tambahan write-side lain yang sudah tersedia:

- archive employee
- reactivate employee

Sumber:

- `apps/web/components/hr-employee-create-form.tsx`
- `apps/web/components/hr-employee-archive-form.tsx`
- `apps/web/components/hr-employee-reactivate-form.tsx`

### 8. Form attendance

Status: `Core PRD - aligned`

Form attendance saat ini sudah mendukung:

- employee selection
- attendance date
- check-in / check-out
- latitude / longitude
- geolocation browser
- attendance status
- overtime hours

Tambahan penting:

- bila mode face attendance aktif, attendance form bisa menangkap snapshot wajah dari browser camera
- capture menghasilkan `faceCaptureRef` untuk masuk ke alur review

Sumber:

- `apps/web/components/hr-attendance-form.tsx`

### 9. Form face config dan geofence

Status: `Core PRD - aligned`

Form yang sudah tersedia:

- face attendance config
- face review
- geofence config
- face reference employee

Ini sesuai dengan requirement PRD yang meminta write-side:

- geofence
- face config

Catatan alignment:

- face config diimplementasikan jujur sebagai fondasi verifikasi wajah
- geofence menjadi bagian dari safety UX attendance

### 10. Form loan dan payroll

Status: `Core PRD - aligned`

Form yang sudah tersedia:

- create loan
- update loan status
- void loan
- create salary slip
- release salary slip
- void salary slip

Ini menutup area inti loan dan payroll yang diminta PRD.

Sumber:

- `apps/web/components/hr-loan-create-form.tsx`
- `apps/web/components/hr-loan-status-form.tsx`
- `apps/web/components/hr-loan-void-form.tsx`
- `apps/web/components/hr-salary-slip-form.tsx`
- `apps/web/components/hr-salary-slip-release-form.tsx`
- `apps/web/components/hr-salary-slip-void-form.tsx`

### 11. Contextual prefill HR

Status: `Core PRD - aligned`

PRD meminta token prefill:

- `attendance`
- `loan`
- `employee`
- `payroll`

Implementasi saat ini sudah memakai prefill untuk:

- archive/reactivate employee
- attendance update
- salary create
- loan status
- salary release

Ini sesuai arah safety UX yang diminta katalog fitur.

Sumber:

- `apps/web/components/domain-shell.tsx`

## Operational Extension Yang Diterima

### 1. Face priority queue dan retake queue

Status: `Operational Extension - allowed`

Section face priority queue dan retake queue adalah extension operasional yang membantu HR menindak capture bermasalah secara harian.

Ini tidak bertentangan dengan PRD karena:

- tetap berada di domain HR yang sama
- tetap memakai data review yang sah
- hanya membuat analytics lebih actionable

### 2. Capture kamera browser di form attendance

Status: `Operational Extension - allowed`

Capture kamera browser adalah extension UX untuk mempercepat pengambilan referensi wajah.

Ini tetap selaras karena:

- hanya memasok data capture untuk review
- tidak menggantikan validasi akhir
- tidak mengubah entitas HR inti

## Operational Constraint Saat Ini

### 1. Face attendance belum recognition engine penuh

Status: `Operational Constraint - critical honesty`

Ini adalah constraint paling penting untuk HR.

Implementasi saat ini:

- mendukung `MANUAL_REVIEW`
- mendukung `CAMERA_CAPTURE`
- mendukung baseline, score, confidence band, dan recommendation

Namun:

- belum boleh diposisikan sebagai sistem face recognition otomatis penuh yang final tanpa review

Semua komunikasi produk dan operasional harus tetap jujur pada batas ini.

### 2. Review shell masih berbasis sample terbaru

Status: `Operational Constraint - acceptable`

Seperti domain lain, shell HR saat ini menampilkan sample review terbaru.

Ini masih sesuai untuk mode operasional panel, selama:

- tidak diklaim sebagai listing penuh semua entitas
- worklist / query / form tetap menjadi pintu lanjut tindak

## Guardrail Lanjutan untuk HR

### A. HR tetap bertumpu pada employee master tunggal

- employee code harus tetap menjadi identitas utama employee
- payroll, attendance, face log, dan loan harus tetap merujuk employee yang sama

### B. Fitur wajah harus selalu dijelaskan jujur

- capture browser dan review baseline boleh disebut fondasi verifikasi
- jangan menyebutnya face recognition otomatis penuh jika masih butuh review atau threshold operasional

### C. Geofence dan face config tidak boleh mem-bypass review DB rule

- semua write-side HR tetap hanya aktif saat `review-db` benar-benar tersedia
- role tanpa capability create/update tidak boleh mendapat akses write-side

### D. Prefill tetap harus deterministik

- token `attendance`, `loan`, `employee`, dan `payroll` harus tetap menjadi token resmi
- UX tambahan tidak boleh membuat token liar di luar pola ini tanpa dokumentasi

## Keputusan Final

### Sudah selaras core PRD

- shell HR
- review employee
- review attendance
- review face attendance
- review loan
- review payroll
- form employee / attendance / geofence / face config / loan / payroll
- archive/reactivate
- contextual prefill HR
- capability-based rendering

### Diterima sebagai extension operasional

- face priority queue
- face retake queue
- capture kamera browser pada attendance

### Constraint yang harus dijaga secara jujur

- face attendance saat ini masih fondasi capture/review, belum recognition engine penuh

### Tidak ada konflik PRD yang terdeteksi

- implementasi HR saat ini konsisten dengan PRD
- area yang paling sensitif bukan konflik alur, tetapi kejujuran positioning fitur wajah terhadap capability aktual sistem

