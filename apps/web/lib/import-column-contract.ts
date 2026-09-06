import type { BatchScopeName } from '@/lib/types'
import { BATCH_SCOPE_NAMES } from '@/lib/import-batch-capabilities'

export type { BatchScopeName }

export type ImportColumnType = 'string' | 'number' | 'integer' | 'boolean' | 'date'

export interface ImportColumnContract {
  readonly scope: BatchScopeName
  readonly sheet: string
  readonly column: string
  readonly parserField: string
  readonly targetField: string
  readonly required: boolean
  readonly type: ImportColumnType
  readonly format?: string
  readonly description: string
  readonly example: string
  readonly templateHeader: boolean
}

export interface ImportScopeSheet {
  readonly key: string
  readonly displayName: string
  readonly columns: readonly ImportColumnContract[]
}

export interface ImportScopeContract {
  readonly scope: BatchScopeName
  readonly sheets: readonly ImportScopeSheet[]
}

function col(
  scope: BatchScopeName,
  sheet: string,
  opts: {
    parserField: string
    targetField: string
    required?: boolean
    type?: ImportColumnType
    format?: string
    description: string
    example: string
    templateHeader?: boolean
  },
): ImportColumnContract {
  return {
    scope,
    sheet,
    column: opts.parserField,
    parserField: opts.parserField,
    targetField: opts.targetField,
    required: opts.required ?? false,
    type: opts.type ?? 'string',
    format: opts.format,
    description: opts.description,
    example: opts.example,
    templateHeader: opts.templateHeader ?? true,
  }
}

const U = 'USER_AND_ORDER' as const
const B = 'BILLING' as const
const I = 'INVENTORY' as const
const H = 'HR' as const
const CR = 'CUSTOMER_REVIEW' as const
const SR = 'SUPPORT_REVIEW' as const

function usersCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'users', { parserField: 'source_system', targetField: 'source_system', description: 'Sumber data (default scope sesuai)', example: 'WEB_PSB / GA / FINANCE' }),
    col(scope, 'users', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID user pada sistem sumber lama', example: 'USR-001' }),
    col(scope, 'users', { parserField: 'legacy_role', targetField: 'legacy_role', description: 'Nama role pada sistem sumber lama', example: 'Admin Billing' }),
    col(scope, 'users', { parserField: 'legacy_division', targetField: 'legacy_division', description: 'Nama divisi pada sistem sumber lama', example: 'Divisi Keuangan' }),
    col(scope, 'users', { parserField: 'full_name', targetField: 'full_name', required: true, description: 'Nama lengkap akun user', example: 'NAMA_LENGKAP_USER_CONTOH' }),
    col(scope, 'users', { parserField: 'username', targetField: 'username', required: true, description: 'Username untuk login (harus unik per user)', example: 'username.contoh' }),
    col(scope, 'users', { parserField: 'email', targetField: 'email', description: 'Alamat email aktif user', example: 'user.contoh@perusahaan.co.id' }),
    col(scope, 'users', { parserField: 'phone', targetField: 'phone', description: 'Nomor handphone/WhatsApp user', example: '08XXXXXXXXXX' }),
    col(scope, 'users', { parserField: 'employee_legacy_id', targetField: 'employee_legacy_id', description: 'Relasi ke legacy_id karyawan yang terkait dengan user ini', example: 'EMP-007' }),
    col(scope, 'users', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah JSON (opsional; bila dikosongkan parser akan generate dari row ini)', example: '{"field_sumber":"nilai_sumber"}' }),
    col(scope, 'users', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional; auto-build dari username, email, legacy_id bila dikosongkan)', example: 'usernamecontoh08xxxxxxusr001' }),
    col(scope, 'users', { parserField: 'mapped_role_code', targetField: 'mapped_role_code', required: true, description: 'Kode role mapping di ERP master baru (harus sesuai katalog mapping)', example: 'ROLE_FINANCE_ADMIN' }),
    col(scope, 'users', { parserField: 'mapped_division_code', targetField: 'mapped_division_code', required: true, description: 'Kode divisi mapping di ERP master baru (harus sesuai katalog mapping)', example: 'DIV_FINANCE' }),
  ]
}

function customersCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'customers', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID customer sistem sumber lama', example: 'CUS-0001' }),
    col(scope, 'customers', { parserField: 'customer_name', targetField: 'customer_name', required: true, description: 'Nama lengkap customer / nama instansi / nama perusahaan', example: 'NAMA_CUSTOMER_CONTOH' }),
    col(scope, 'customers', { parserField: 'customer_type', targetField: 'customer_type', description: 'Kategori customer (personal / enterprise / instansi)', example: 'PERSONAL / ENTERPRISE' }),
    col(scope, 'customers', { parserField: 'phone', targetField: 'phone', description: 'Nomor HP / kontak utama customer', example: '08XXXXXXXXXX' }),
    col(scope, 'customers', { parserField: 'email', targetField: 'email', description: 'Alamat email customer', example: 'customer.contoh@email.com' }),
    col(scope, 'customers', { parserField: 'identity_no', targetField: 'identity_no', description: 'Nomor identitas (NIK / NIB / NPWP)', example: '32XXXXXXXXXXXXXX' }),
    col(scope, 'customers', { parserField: 'address_text', targetField: 'address_text', description: 'Alamat tempat tinggal / kantor customer lengkap', example: 'JALAN_CONTOH NO. 1 RT/RW X/Y KEL KEC KOTA PROV' }),
    col(scope, 'customers', { parserField: 'maps_url', targetField: 'maps_url', description: 'Link Google Maps / Gmaps menuju lokasi customer', example: 'https://maps.google.com/xxx' }),
    col(scope, 'customers', { parserField: 'latitude', targetField: 'latitude', type: 'number', description: 'Koordinat lintang lokasi customer (format desimal derajat)', example: '-6.200000' }),
    col(scope, 'customers', { parserField: 'longitude', targetField: 'longitude', type: 'number', description: 'Koordinat bujur lokasi customer (format desimal derajat)', example: '106.816666' }),
    col(scope, 'customers', { parserField: 'marketing_name', targetField: 'marketing_name', description: 'Nama marketing / sales yang menangkap lead customer ini', example: 'SALES_CONTOH' }),
    col(scope, 'customers', { parserField: 'branch_code', targetField: 'branch_code', description: 'Kode cabang / area operasional customer', example: 'BRANCH_JKT' }),
    col(scope, 'customers', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'customers', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build dari customer_name+phone+legacy_id)', example: 'namacustomer08xxxxxxxxxxcus0001' }),
  ]
}

function ordersCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'orders', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID order pada sistem sumber lama', example: 'ORD-2025-0001' }),
    col(scope, 'orders', { parserField: 'legacy_customer_id', targetField: 'legacy_customer_id', required: true, description: 'ID customer sumber lama yang melakukan order (relasi ke customers sheet)', example: 'CUS-0001' }),
    col(scope, 'orders', { parserField: 'legacy_package_name', targetField: 'legacy_package_name', description: 'Nama paket / produk layanan pada sistem sumber lama', example: 'PAKET_INTERNET_100MB' }),
    col(scope, 'orders', { parserField: 'order_no', targetField: 'order_no', description: 'Nomor order / SPK / nomor dokumen order', example: 'SPK/2025/001' }),
    col(scope, 'orders', { parserField: 'order_type', targetField: 'order_type', description: 'Jenis order (baru / pindah / upgrade / downgrade)', example: 'BARU / MIGRASI / UPGRADE' }),
    col(scope, 'orders', { parserField: 'order_status', targetField: 'order_status', description: 'Status workflow order', example: 'PENDING / INSTALLASI / COMPLETE' }),
    col(scope, 'orders', { parserField: 'request_date', targetField: 'request_date', type: 'date', description: 'Tanggal customer mengajukan permintaan (format ISO atau DD/MM/YYYY)', example: '2025-01-15' }),
    col(scope, 'orders', { parserField: 'scheduled_installation_at', targetField: 'scheduled_installation_at', type: 'date', description: 'Tanggal & waktu rencana installasi teknisi', example: '2025-01-17 09:00' }),
    col(scope, 'orders', { parserField: 'installed_date', targetField: 'installed_date', type: 'date', description: 'Tanggal installasi benar-benar selesai', example: '2025-01-17' }),
    col(scope, 'orders', { parserField: 'marketing_name', targetField: 'marketing_name', description: 'Nama marketing / sales pemegang order', example: 'SALES_CONTOH' }),
    col(scope, 'orders', { parserField: 'teknisi_name', targetField: 'teknisi_name', description: 'Nama teknisi / tim lapangan yang melakukan installasi', example: 'TEKNISI_CONTOH' }),
    col(scope, 'orders', { parserField: 'location_map', targetField: 'location_map', description: 'Link / deskripsi lokasi titik installasi', example: 'https://maps.google.com/xxx' }),
    col(scope, 'orders', { parserField: 'notes', targetField: 'notes', description: 'Catatan internal order', example: 'Customer ingin dipanggil 1 hari sebelum kunjungan' }),
    col(scope, 'orders', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'orders', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build dari order_no+legacy_id)', example: 'spk2025001ord20250001' }),
    col(scope, 'orders', { parserField: 'mapped_package_code', targetField: 'mapped_package_code', required: true, description: 'Kode paket mapping di katalog master ERP baru', example: 'PKG_FIBER_100MB' }),
  ]
}

function supportCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'support', { parserField: 'support_type', targetField: 'support_type', required: true, description: 'Kategori layanan (gangguan / komplain / permintaan / survey)', example: 'GANGGUAN / KOMPLAIN / PERMINTAAN' }),
    col(scope, 'support', { parserField: 'legacy_id', targetField: 'legacy_id', required: true, description: 'ID ticket / nomor laporan pada sistem sumber lama', example: 'TIC-2025-0001' }),
    col(scope, 'support', { parserField: 'legacy_customer_id', targetField: 'legacy_customer_id', description: 'ID customer sumber lama yang terkait ticket (relasi ke customers sheet)', example: 'CUS-0001' }),
    col(scope, 'support', { parserField: 'ticket_code', targetField: 'ticket_code', description: 'Kode / nomor ticket human-readable', example: '#SUPPORT-001' }),
    col(scope, 'support', { parserField: 'customer_name', targetField: 'customer_name', description: 'Nama customer pelapor (opsional; bisa langsung isi tanpa relasi)', example: 'NAMA_CUSTOMER_CONTOH' }),
    col(scope, 'support', { parserField: 'customer_user', targetField: 'customer_user', description: 'Username / PIC pelapor di akun customer', example: 'pic.customer' }),
    col(scope, 'support', { parserField: 'category', targetField: 'category', description: 'Kategori masalah (internet / TV / telepon / tagihan)', example: 'INTERNET / BILLING' }),
    col(scope, 'support', { parserField: 'trouble_type', targetField: 'trouble_type', description: 'Jenis masalah detail (slow / no-internet / wrong-billing)', example: 'TIDAK ADA_SINYAL' }),
    col(scope, 'support', { parserField: 'support_status', targetField: 'support_status', description: 'Status tiket saat ini', example: 'OPEN / PROGRESS / PENDING_PART / CLOSED' }),
    col(scope, 'support', { parserField: 'opened_at', targetField: 'opened_at', type: 'date', description: 'Waktu ticket dibuat / dilaporkan', example: '2025-01-16 13:45' }),
    col(scope, 'support', { parserField: 'closed_at', targetField: 'closed_at', type: 'date', description: 'Waktu ticket selesai ditangani (bila sudah closed)', example: '2025-01-16 17:20' }),
    col(scope, 'support', { parserField: 'reason_text', targetField: 'reason_text', description: 'Penyebab / alasan mendasar masalah', example: 'Kabel terputus di tiang' }),
    col(scope, 'support', { parserField: 'problem_category', targetField: 'problem_category', description: 'Klasifikasi masalah untuk pelaporan management', example: 'INFRASTRUKTUR / USER_ERROR' }),
    col(scope, 'support', { parserField: 'resolution_action', targetField: 'resolution_action', description: 'Aksi perbaikan yang dilakukan teknisi', example: 'Ganti kabel patch + reboot ONT' }),
    col(scope, 'support', { parserField: 'photo_list_text', targetField: 'photo_list_text', description: 'Daftar link foto bukti (pisahkan dengan koma / newline)', example: 'https://cdn.photo/1.jpg, https://cdn.photo/2.jpg' }),
    col(scope, 'support', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'support', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build ticket_code+legacy_id+support_type)', example: 'support001tic20250001gangguan' }),
  ]
}

function invoicesCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'invoices', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID invoice pada sistem sumber', example: 'INV-SRC-2025-0001' }),
    col(scope, 'invoices', { parserField: 'legacy_customer_id', targetField: 'legacy_customer_id', required: true, description: 'ID customer sumber lama pemilik invoice (relasi ke customers sheet)', example: 'CUS-0001' }),
    col(scope, 'invoices', { parserField: 'legacy_subscription_ref', targetField: 'legacy_subscription_ref', description: 'ID langganan / referensi paket pada sumber lama', example: 'SUB-CUS-0001-AKTIF' }),
    col(scope, 'invoices', { parserField: 'invoice_no', targetField: 'invoice_no', required: true, description: 'Nomor invoice resmi (nomor surat tagihan)', example: 'INV/2025/01/000001' }),
    col(scope, 'invoices', { parserField: 'invoice_type', targetField: 'invoice_type', description: 'Jenis invoice (normal / koreksi / penggantian / denda)', example: 'NORMAL / KOREKSI / DENDA' }),
    col(scope, 'invoices', { parserField: 'billing_month', targetField: 'billing_month', type: 'integer', format: 'Bilangan bulat 1-12', description: 'Bulan periode tagihan', example: '1' }),
    col(scope, 'invoices', { parserField: 'billing_year', targetField: 'billing_year', type: 'integer', format: 'Tahun 4 digit', description: 'Tahun periode tagihan', example: '2025' }),
    col(scope, 'invoices', { parserField: 'period_start', targetField: 'period_start', type: 'date', description: 'Tanggal awal periode pemakaian', example: '2025-01-01' }),
    col(scope, 'invoices', { parserField: 'period_end', targetField: 'period_end', type: 'date', description: 'Tanggal akhir periode pemakaian', example: '2025-01-31' }),
    col(scope, 'invoices', { parserField: 'issue_date', targetField: 'issue_date', type: 'date', description: 'Tanggal invoice diterbitkan / dikirim', example: '2025-02-01' }),
    col(scope, 'invoices', { parserField: 'due_date', targetField: 'due_date', type: 'date', description: 'Tanggal jatuh tempo pembayaran', example: '2025-02-10' }),
    col(scope, 'invoices', { parserField: 'subtotal', targetField: 'subtotal', type: 'number', format: 'Angka desimal (titik) tanpa pemisah ribuan', description: 'Subtotal sebelum diskon / denda / pajak', example: '500000.00' }),
    col(scope, 'invoices', { parserField: 'penalty_amount', targetField: 'penalty_amount', type: 'number', description: 'Denda / bunga keterlambatan', example: '50000.00' }),
    col(scope, 'invoices', { parserField: 'discount_amount', targetField: 'discount_amount', type: 'number', description: 'Total potongan / diskon', example: '25000.00' }),
    col(scope, 'invoices', { parserField: 'total_amount', targetField: 'total_amount', type: 'number', description: 'Grand total yang harus dibayar', example: '525000.00' }),
    col(scope, 'invoices', { parserField: 'paid_amount', targetField: 'paid_amount', type: 'number', description: 'Jumlah yang sudah dibayar customer', example: '525000.00' }),
    col(scope, 'invoices', { parserField: 'invoice_status', targetField: 'invoice_status', description: 'Status invoice', example: 'UNPAID / PARTIAL / PAID / VOID' }),
    col(scope, 'invoices', { parserField: 'collection_status', targetField: 'collection_status', description: 'Status kegiatan penagihan kolektor', example: 'NOT_CONTACTED / PROMISE_TO_PAY / VISIT_PLANNED' }),
    col(scope, 'invoices', { parserField: 'suspend_candidate', targetField: 'suspend_candidate', type: 'boolean', format: '0 / 1 atau true / false', description: 'Flag kandidat suspend karena tunggakan', example: '0' }),
    col(scope, 'invoices', { parserField: 'notes', targetField: 'notes', description: 'Catatan internal invoice', example: 'Janji bayar via transfer tanggal 15' }),
    col(scope, 'invoices', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'invoices', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build invoice_no+legacy_id)', example: 'inv202501000001invsrc20250001' }),
  ]
}

function billingItemsCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'items', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID item sumber lama', example: 'ITM-INV-0001' }),
    col(scope, 'items', { parserField: 'legacy_invoice_id', targetField: 'legacy_invoice_id', required: true, description: 'ID invoice sumber lama yang menjadi induk item ini', example: 'INV-SRC-2025-0001' }),
    col(scope, 'items', { parserField: 'item_type', targetField: 'item_type', description: 'Jenis item (paket / abonemen / one-time / denda / pajak)', example: 'ABONEMEN / ONE_TIME / PAJAK' }),
    col(scope, 'items', { parserField: 'description', targetField: 'description', required: true, description: 'Deskripsi / nama rincian tagihan', example: 'Internet 100Mbps Januari 2025' }),
    col(scope, 'items', { parserField: 'qty', targetField: 'qty', type: 'number', description: 'Jumlah kuantitas item', example: '1' }),
    col(scope, 'items', { parserField: 'unit_price', targetField: 'unit_price', type: 'number', description: 'Harga satuan per item', example: '500000.00' }),
    col(scope, 'items', { parserField: 'line_total', targetField: 'line_total', type: 'number', description: 'Subtotal baris (qty * unit_price)', example: '500000.00' }),
    col(scope, 'items', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'items', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build legacy_invoice_id+description+legacy_id)', example: 'invsrc20250001internet100mbpsjanuari2025itminv0001' }),
  ]
}

function paymentsCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'payments', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID payment sumber lama', example: 'PAY-SRC-2025-0001' }),
    col(scope, 'payments', { parserField: 'legacy_invoice_id', targetField: 'legacy_invoice_id', required: true, description: 'ID invoice sumber lama yang dibayar (relasi ke invoices sheet)', example: 'INV-SRC-2025-0001' }),
    col(scope, 'payments', { parserField: 'payment_no', targetField: 'payment_no', description: 'Nomor bukti pembayaran / kwitansi / referensi', example: 'KWT/2025/02/000001' }),
    col(scope, 'payments', { parserField: 'payment_date', targetField: 'payment_date', type: 'date', description: 'Tanggal transaksi pembayaran', example: '2025-02-09' }),
    col(scope, 'payments', { parserField: 'amount', targetField: 'amount', type: 'number', required: true, description: 'Jumlah nominal yang dibayar', example: '525000.00' }),
    col(scope, 'payments', { parserField: 'payment_method', targetField: 'payment_method', description: 'Kanal pembayaran', example: 'TRANSFER_BCA / VIRTUAL_ACCOUNT / CASH / EDC' }),
    col(scope, 'payments', { parserField: 'reference_no', targetField: 'reference_no', description: 'Nomor referensi bank / nomor autorisasi', example: 'REF-TRF-BCA-XXXXXX' }),
    col(scope, 'payments', { parserField: 'received_by_legacy_user', targetField: 'received_by_legacy_user', description: 'Nama / legacy_id kasir penerima pembayaran', example: 'USR-KASIR-001' }),
    col(scope, 'payments', { parserField: 'notes', targetField: 'notes', description: 'Catatan internal payment', example: 'Lunas penuh sisa tagihan' }),
    col(scope, 'payments', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'payments', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build payment_no+legacy_id)', example: 'kwt202502000001paysrc20250001' }),
  ]
}

function collectionsCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'collections', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID aksi koleksi sumber lama', example: 'COL-2025-0001' }),
    col(scope, 'collections', { parserField: 'legacy_invoice_id', targetField: 'legacy_invoice_id', required: true, description: 'ID invoice sumber lama yang ditagih', example: 'INV-SRC-2025-0001' }),
    col(scope, 'collections', { parserField: 'action_type', targetField: 'action_type', required: true, description: 'Jenis aksi penagihan (telepon / WA / kunjungan lapangan / surat)', example: 'CALL / WA / VISIT / SURAT' }),
    col(scope, 'collections', { parserField: 'action_status', targetField: 'action_status', description: 'Hasil aksi', example: 'TERJAWAB / TIDAK_ADA_ORANG / JANJI_BAYAR / TOLAK_BAYAR' }),
    col(scope, 'collections', { parserField: 'action_at', targetField: 'action_at', type: 'date', description: 'Waktu aksi penagihan dilakukan', example: '2025-02-12 10:30' }),
    col(scope, 'collections', { parserField: 'due_follow_up_at', targetField: 'due_follow_up_at', type: 'date', description: 'Waktu follow-up selanjutnya yang dijanjikan', example: '2025-02-14 09:00' }),
    col(scope, 'collections', { parserField: 'handled_by_legacy_user', targetField: 'handled_by_legacy_user', description: 'Legacy_id / nama kolektor yang menangani', example: 'USR-KOL-007' }),
    col(scope, 'collections', { parserField: 'notes', targetField: 'notes', description: 'Catatan hasil kunjungan / pembicaraan', example: 'Customer janji transfer tanggal 15 Februari' }),
    col(scope, 'collections', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'collections', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build legacy_invoice_id+action_type+legacy_id)', example: 'invsrc20250001callcol20250001' }),
  ]
}

function inventoryItemsCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'items', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID item gudang pada sistem sumber', example: 'INV-ITM-0001' }),
    col(scope, 'items', { parserField: 'legacy_category_id', targetField: 'legacy_category_id', description: 'ID kategori sumber lama', example: 'CAT-FIBER-ACC' }),
    col(scope, 'items', { parserField: 'legacy_unit_id', targetField: 'legacy_unit_id', description: 'ID satuan sumber lama', example: 'UNIT-PCS' }),
    col(scope, 'items', { parserField: 'item_code', targetField: 'item_code', description: 'Kode SKU / kode barang internal', example: 'SKU-FIBER-ONT-GPON' }),
    col(scope, 'items', { parserField: 'item_name', targetField: 'item_name', required: true, description: 'Nama barang / material / asset', example: 'ONT GPON 4 PORT 1 POTS WIFI' }),
    col(scope, 'items', { parserField: 'barcode', targetField: 'barcode', description: 'Nomor barcode / QR yang dicetak di kemasan', example: '899XXXXXXXXXX' }),
    col(scope, 'items', { parserField: 'default_price', targetField: 'default_price', type: 'number', description: 'Harga jual standar (harga pokok opsional ditambah notes)', example: '850000.00' }),
    col(scope, 'items', { parserField: 'minimum_stock', targetField: 'minimum_stock', type: 'integer', description: 'Stok minimum safety (bila kurang → trigger PO)', example: '5' }),
    col(scope, 'items', { parserField: 'current_stock', targetField: 'current_stock', type: 'integer', description: 'Jumlah stok on-hand saat ini (opsional; bisa juga dari movement)', example: '50' }),
    col(scope, 'items', { parserField: 'status_text', targetField: 'status_text', description: 'Status item (aktif / nonaktif / obsolete)', example: 'AKTIF / OBSOLETE' }),
    col(scope, 'items', { parserField: 'photo_path', targetField: 'photo_path', description: 'Link / path gambar barang', example: 'https://cdn.gudang/foto/ont.jpg' }),
    col(scope, 'items', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'items', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build item_code+item_name+legacy_id)', example: 'skufiberontgponontgpon4port1potswifiinvitm0001' }),
    col(scope, 'items', { parserField: 'mapped_category_code', targetField: 'mapped_category_code', required: true, description: 'Kode kategori mapping pada master katalog ERP baru', example: 'CAT_NETWORK_DEVICE' }),
    col(scope, 'items', { parserField: 'mapped_unit_code', targetField: 'mapped_unit_code', required: true, description: 'Kode satuan mapping pada master ERP baru', example: 'UOM_PCS' }),
  ]
}

function movementsCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'movements', { parserField: 'movement_source', targetField: 'movement_source', description: 'Sumber transaksi (default ADJUSTMENT bila kosong)', example: 'ADJUSTMENT / RECEIVE / ISSUE / TRANSFER / SOLD / RETUR' }),
    col(scope, 'movements', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID transaksi movement sumber lama', example: 'MOV-2025-01-0001' }),
    col(scope, 'movements', { parserField: 'legacy_item_id', targetField: 'legacy_item_id', required: true, description: 'ID item sumber lama yang bergerak (relasi ke inventory items sheet)', example: 'INV-ITM-0001' }),
    col(scope, 'movements', { parserField: 'reference_no', targetField: 'reference_no', description: 'Nomor dokumen pendukung (BPB / BPP / SJ / invoice penjualan)', example: 'BPB/GUDANG/2025/01/0001' }),
    col(scope, 'movements', { parserField: 'movement_type', targetField: 'movement_type', description: 'Arah gerak (IN / OUT / TRANSFER_IN / TRANSFER_OUT)', example: 'IN / OUT / ADJ_PLUS / ADJ_MINUS' }),
    col(scope, 'movements', { parserField: 'qty', targetField: 'qty', type: 'integer', required: true, description: 'Jumlah unit yang bergerak (bilangan bulat positif)', example: '10' }),
    col(scope, 'movements', { parserField: 'unit_price', targetField: 'unit_price', type: 'number', description: 'Harga per unit saat transaksi (dapat 0 bila transfer internal)', example: '850000.00' }),
    col(scope, 'movements', { parserField: 'movement_at', targetField: 'movement_at', type: 'date', description: 'Waktu kejadian transaksi', example: '2025-01-20 14:30' }),
    col(scope, 'movements', { parserField: 'assignee_name', targetField: 'assignee_name', description: 'Nama penerima / PIC yang menyerahkan barang', example: 'GUDANG_CONTOH' }),
    col(scope, 'movements', { parserField: 'notes', targetField: 'notes', description: 'Catatan movement', example: 'Penerimaan dari supplier PO #PO-001' }),
    col(scope, 'movements', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'movements', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build reference_no+legacy_item_id+legacy_id)', example: 'bpbgudang2025010001invitm0001mov2025010001' }),
  ]
}

function employeesCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'employees', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID karyawan pada sistem HR sumber', example: 'EMP-0001' }),
    col(scope, 'employees', { parserField: 'employee_code', targetField: 'employee_code', description: 'NIK / Nomor Induk Karyawan perusahaan', example: 'NIK-2023-0001' }),
    col(scope, 'employees', { parserField: 'full_name', targetField: 'full_name', required: true, description: 'Nama lengkap sesuai KTP karyawan', example: 'NAMA_LENGKAP_KARYAWAN' }),
    col(scope, 'employees', { parserField: 'department_text', targetField: 'department_text', description: 'Departemen / bagian pada sumber lama', example: 'Department Teknologi Informasi' }),
    col(scope, 'employees', { parserField: 'position_name', targetField: 'position_name', description: 'Jabatan / posisi pekerjaan', example: 'Staff IT Support' }),
    col(scope, 'employees', { parserField: 'employment_status', targetField: 'employment_status', description: 'Status kepegawaian', example: 'TETAP / KONTRAK / MAGANG / HARIAN' }),
    col(scope, 'employees', { parserField: 'join_date', targetField: 'join_date', type: 'date', description: 'Tanggal masuk / mulai kerja pertama', example: '2023-06-01' }),
    col(scope, 'employees', { parserField: 'base_salary', targetField: 'base_salary', type: 'number', description: 'Gaji pokok bulanan', example: '7000000.00' }),
    col(scope, 'employees', { parserField: 'phone', targetField: 'phone', description: 'Nomor HP karyawan', example: '08XXXXXXXXXX' }),
    col(scope, 'employees', { parserField: 'whatsapp', targetField: 'whatsapp', description: 'Nomor WhatsApp karyawan (bisa sama dengan phone)', example: '08XXXXXXXXXX' }),
    col(scope, 'employees', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'employees', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build employee_code+full_name+legacy_id)', example: 'nik20230001namalengkapkaryawanemp0001' }),
    col(scope, 'employees', { parserField: 'mapped_division_code', targetField: 'mapped_division_code', required: true, description: 'Kode divisi mapping pada master organisasi ERP baru', example: 'DIV_TECHNOLOGY' }),
  ]
}

function attendanceCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'attendance', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID record absensi sumber lama', example: 'ATT-20250115-001' }),
    col(scope, 'attendance', { parserField: 'legacy_employee_id', targetField: 'legacy_employee_id', required: true, description: 'ID karyawan sumber lama yang melakukan absen (relasi ke employees sheet)', example: 'EMP-0001' }),
    col(scope, 'attendance', { parserField: 'attendance_date', targetField: 'attendance_date', type: 'date', required: true, description: 'Tanggal hari kerja yang diabsen', example: '2025-01-15' }),
    col(scope, 'attendance', { parserField: 'check_in', targetField: 'check_in', description: 'Waktu clock-in / kedatangan (format HH:mm atau datetime)', example: '08:05' }),
    col(scope, 'attendance', { parserField: 'check_out', targetField: 'check_out', description: 'Waktu clock-out / kepulangan', example: '17:35' }),
    col(scope, 'attendance', { parserField: 'attendance_status', targetField: 'attendance_status', description: 'Status kehadiran', example: 'HADIR / SAKEK / IZIN / ALFA / CUTI / LIBUR' }),
    col(scope, 'attendance', { parserField: 'overtime_hours', targetField: 'overtime_hours', type: 'number', description: 'Jumlah jam lembur (bisa desimal 1.5 = 1 jam 30 menit)', example: '2' }),
    col(scope, 'attendance', { parserField: 'locked_by_admin', targetField: 'locked_by_admin', type: 'boolean', format: '0 / 1 atau true / false', description: 'Flag edit lock absen oleh admin payroll', example: '1' }),
    col(scope, 'attendance', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'attendance', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build legacy_employee_id+attendance_date+legacy_id)', example: 'emp000120250115att20250115001' }),
  ]
}

function salariesCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'salaries', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID slip gaji sumber lama', example: 'SLIP-2025-01-0001' }),
    col(scope, 'salaries', { parserField: 'legacy_employee_id', targetField: 'legacy_employee_id', required: true, description: 'ID karyawan sumber lama pemilik slip gaji', example: 'EMP-0001' }),
    col(scope, 'salaries', { parserField: 'payroll_month', targetField: 'payroll_month', type: 'integer', format: 'Bilangan bulat 1-12', required: true, description: 'Bulan periode penggajian', example: '1' }),
    col(scope, 'salaries', { parserField: 'payroll_year', targetField: 'payroll_year', type: 'integer', format: 'Tahun 4 digit', required: true, description: 'Tahun periode penggajian', example: '2025' }),
    col(scope, 'salaries', { parserField: 'base_salary', targetField: 'base_salary', type: 'number', description: 'Gaji pokok pada periode ini', example: '7000000.00' }),
    col(scope, 'salaries', { parserField: 'attendance_allowance', targetField: 'attendance_allowance', type: 'number', description: 'Tunjangan kehadiran / transport / makan', example: '500000.00' }),
    col(scope, 'salaries', { parserField: 'overtime_amount', targetField: 'overtime_amount', type: 'number', description: 'Total uang lembur', example: '350000.00' }),
    col(scope, 'salaries', { parserField: 'performance_bonus', targetField: 'performance_bonus', type: 'number', description: 'Bonus kinerja / target / THR', example: '1000000.00' }),
    col(scope, 'salaries', { parserField: 'position_allowance', targetField: 'position_allowance', type: 'number', description: 'Tunjangan jabatan', example: '750000.00' }),
    col(scope, 'salaries', { parserField: 'loan_deduction', targetField: 'loan_deduction', type: 'number', description: 'Cicilan potongan pinjaman karyawan', example: '500000.00' }),
    col(scope, 'salaries', { parserField: 'total_income', targetField: 'total_income', type: 'number', description: 'Total pendapatan sebelum potongan', example: '9600000.00' }),
    col(scope, 'salaries', { parserField: 'total_deduction', targetField: 'total_deduction', type: 'number', description: 'Total seluruh potongan (BPJS, PPh21, pinjaman, dll)', example: '1500000.00' }),
    col(scope, 'salaries', { parserField: 'net_salary', targetField: 'net_salary', type: 'number', description: 'Take home pay yang diterima karyawan', example: '8100000.00' }),
    col(scope, 'salaries', { parserField: 'released_at', targetField: 'released_at', type: 'date', description: 'Tanggal gaji di-release / ditransfer', example: '2025-01-28' }),
    col(scope, 'salaries', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'salaries', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build legacy_employee_id+payroll_month+payroll_year+legacy_id)', example: 'emp000112025slip2025010001' }),
  ]
}

function loansCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'loans', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID transaksi pinjaman sumber lama', example: 'LOAN-0001' }),
    col(scope, 'loans', { parserField: 'legacy_employee_id', targetField: 'legacy_employee_id', required: true, description: 'ID karyawan yang meminjam (relasi ke employees sheet)', example: 'EMP-0001' }),
    col(scope, 'loans', { parserField: 'loan_type', targetField: 'loan_type', description: 'Jenis pinjaman', example: 'KOPERASI / KASBON / PERUSAHAAN' }),
    col(scope, 'loans', { parserField: 'amount', targetField: 'amount', type: 'number', required: true, description: 'Nilai pokok pinjaman (jumlah awal dipinjam)', example: '6000000.00' }),
    col(scope, 'loans', { parserField: 'monthly_installment', targetField: 'monthly_installment', type: 'number', description: 'Cicilan bulanan', example: '500000.00' }),
    col(scope, 'loans', { parserField: 'loan_date', targetField: 'loan_date', type: 'date', description: 'Tanggal pencairan / tanggal akad pinjaman', example: '2024-10-01' }),
    col(scope, 'loans', { parserField: 'loan_status', targetField: 'loan_status', description: 'Status pinjaman saat ini', example: 'ACTIVE / LUNAS / MACET' }),
    col(scope, 'loans', { parserField: 'description', targetField: 'description', description: 'Keterangan / tujuan pinjaman', example: 'Biaya renovasi rumah' }),
    col(scope, 'loans', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'loans', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build legacy_employee_id+loan_date+legacy_id)', example: 'emp000120241001loan0001' }),
  ]
}

function coverageCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'coverage', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID coverage area sumber lama', example: 'COV-AREA-001' }),
    col(scope, 'coverage', { parserField: 'branch_code', targetField: 'branch_code', description: 'Kode cabang / wilayah', example: 'BRANCH_JABODETABEK' }),
    col(scope, 'coverage', { parserField: 'area_code', targetField: 'area_code', description: 'Kode unik area coverage', example: 'AREA-JKT-PUSAT' }),
    col(scope, 'coverage', { parserField: 'area_name', targetField: 'area_name', required: true, description: 'Nama area / nama wilayah operasional', example: 'JAKARTA PUSAT - MENTENG / GONDANGDIA' }),
    col(scope, 'coverage', { parserField: 'coverage_status', targetField: 'coverage_status', description: 'Status ketersediaan layanan di area', example: 'READY / PENDING_INFRA / TIDAK_TERLAYANI' }),
    col(scope, 'coverage', { parserField: 'village', targetField: 'village', description: 'Nama desa / kelurahan', example: 'KELURAHAN_MENTENG' }),
    col(scope, 'coverage', { parserField: 'district', targetField: 'district', description: 'Nama kecamatan', example: 'KECAMATAN_MENTENG' }),
    col(scope, 'coverage', { parserField: 'city', targetField: 'city', description: 'Nama kota / kabupaten', example: 'KOTA ADM. JAKARTA PUSAT' }),
    col(scope, 'coverage', { parserField: 'province', targetField: 'province', description: 'Nama provinsi', example: 'DKI JAKARTA' }),
    col(scope, 'coverage', { parserField: 'latitude', targetField: 'latitude', type: 'number', description: 'Koordinat lintang tengah area', example: '-6.185000' }),
    col(scope, 'coverage', { parserField: 'longitude', targetField: 'longitude', type: 'number', description: 'Koordinat bujur tengah area', example: '106.831000' }),
    col(scope, 'coverage', { parserField: 'notes', targetField: 'notes', description: 'Catatan coverage', example: 'Wilayah premium, support 24 jam' }),
    col(scope, 'coverage', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'coverage', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build legacy_id+area_code+area_name)', example: 'covarea001areajktpusatjakartapusatmentenggondangdia' }),
  ]
}

function marketingActivitiesCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'marketing_activities', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID kegiatan marketing sumber lama', example: 'MKT-ACT-001' }),
    col(scope, 'marketing_activities', { parserField: 'branch_code', targetField: 'branch_code', description: 'Cabang / wilayah penyelenggara event', example: 'BRANCH_JABODETABEK' }),
    col(scope, 'marketing_activities', { parserField: 'activity_date', targetField: 'activity_date', type: 'date', required: true, description: 'Tanggal kegiatan marketing berlangsung', example: '2025-01-26' }),
    col(scope, 'marketing_activities', { parserField: 'marketing_name', targetField: 'marketing_name', required: true, description: 'Nama kegiatan / event / promosi', example: 'ROADSHOW PAKET NEW YEAR 2025 - MENTENG' }),
    col(scope, 'marketing_activities', { parserField: 'activity_type', targetField: 'activity_type', description: 'Tipe kegiatan', example: 'EXPO / ROADSHOW / DOOR TO DOOR / DISKON / BUNDLING' }),
    col(scope, 'marketing_activities', { parserField: 'notes', targetField: 'notes', description: 'Catatan kegiatan / ringkasan hasil', example: '12 leads, target closing 6 akhir bulan' }),
    col(scope, 'marketing_activities', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'marketing_activities', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build legacy_id+activity_date+marketing_name)', example: 'mktact00120250126roadshowpaketnewyear2025menteng' }),
  ]
}

function marketingActivityAreasCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'marketing_activity_areas', { parserField: 'legacy_activity_id', targetField: 'legacy_activity_id', description: 'Relasi ke legacy_id kegiatan marketing (marketing_activities sheet)', example: 'MKT-ACT-001' }),
    col(scope, 'marketing_activity_areas', { parserField: 'legacy_area_id', targetField: 'legacy_area_id', description: 'Relasi ke legacy_id area coverage (coverage sheet)', example: 'COV-AREA-001' }),
    col(scope, 'marketing_activity_areas', { parserField: 'sort_order', targetField: 'sort_order', type: 'integer', description: 'Urutan tampilan / prioritas area', example: '1' }),
    col(scope, 'marketing_activity_areas', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'marketing_activity_areas', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build legacy_activity_id+legacy_area_id+sort_order)', example: 'mktact001covarea0011' }),
  ]
}

function odpCols(scope: BatchScopeName): readonly ImportColumnContract[] {
  return [
    col(scope, 'odp', { parserField: 'legacy_id', targetField: 'legacy_id', description: 'ID ODP sumber lama', example: 'ODP-JKT-0001' }),
    col(scope, 'odp', { parserField: 'odp_code', targetField: 'odp_code', required: true, description: 'Kode ODP / ID ODP unik di jaringan (nomor panel ODP)', example: 'ODP-JKT-PST-001-MENTENG-16PORT-FTTH' }),
    col(scope, 'odp', { parserField: 'odp_name', targetField: 'odp_name', description: 'Nama deskriptif ODP (sesuai naming convention jaringan)', example: 'ODP Menteng 1 Gondangdia' }),
    col(scope, 'odp', { parserField: 'region_name', targetField: 'region_name', description: 'Wilayah / regional jaringan', example: 'REGION 1 - JABODETABEK' }),
    col(scope, 'odp', { parserField: 'location_text', targetField: 'location_text', description: 'Alamat fisik pemasangan ODP (sejelas mungkin)', example: 'DEPAN RUMAH SAKIT PUSAT, Jl. Merdeka No.12 RT 01 RW 02 Menteng JakPus' }),
    col(scope, 'odp', { parserField: 'latitude', targetField: 'latitude', type: 'number', description: 'Koordinat lintang titik ODP', example: '-6.185500' }),
    col(scope, 'odp', { parserField: 'longitude', targetField: 'longitude', type: 'number', description: 'Koordinat bujur titik ODP', example: '106.832000' }),
    col(scope, 'odp', { parserField: 'total_ports', targetField: 'total_ports', type: 'integer', description: 'Jumlah port dalam panel ODP', example: '16' }),
    col(scope, 'odp', { parserField: 'active_ports', targetField: 'active_ports', type: 'integer', description: 'Port yang sudah berlangganan / customer aktif', example: '12' }),
    col(scope, 'odp', { parserField: 'pole_status', targetField: 'pole_status', description: 'Kondisi tiang / tempat menempel ODP', example: 'SEHAT / RUSAK RINGAN / RUSAK BERAT / PERLU PINDAH' }),
    col(scope, 'odp', { parserField: 'is_active', targetField: 'is_active', type: 'boolean', format: '0 / 1 atau true / false', description: 'Status aktif ODP di jaringan', example: '1' }),
    col(scope, 'odp', { parserField: 'raw_payload', targetField: 'raw_payload', description: 'Payload mentah (opsional)', example: '{}' }),
    col(scope, 'odp', { parserField: 'normalized_key', targetField: 'normalized_key', description: 'Kunci normalisasi (opsional, auto build legacy_id+odp_code)', example: 'odpjkt0001odpjktpst001menteng16portftth' }),
  ]
}

export const IMPORT_COLUMN_CONTRACTS: Record<BatchScopeName, ImportScopeContract> = {
  USER_AND_ORDER: {
    scope: U,
    sheets: [
      { key: 'users', displayName: 'Auth Users', columns: usersCols(U) },
      { key: 'customers', displayName: 'Customers', columns: customersCols(U) },
      { key: 'orders', displayName: 'Orders & Installation', columns: ordersCols(U) },
      { key: 'support', displayName: 'Support Tickets', columns: supportCols(U) },
      { key: 'coverage', displayName: 'Sales Coverage Areas', columns: coverageCols(U) },
      { key: 'marketing_activities', displayName: 'Marketing Activities', columns: marketingActivitiesCols(U) },
      { key: 'marketing_activity_areas', displayName: 'Marketing Activity × Area Mapping', columns: marketingActivityAreasCols(U) },
    ],
  },
  BILLING: {
    scope: B,
    sheets: [
      { key: 'invoices', displayName: 'Billing Invoices', columns: invoicesCols(B) },
      { key: 'items', displayName: 'Invoice Line Items', columns: billingItemsCols(B) },
      { key: 'payments', displayName: 'Billing Payments', columns: paymentsCols(B) },
      { key: 'collections', displayName: 'Collection Actions', columns: collectionsCols(B) },
    ],
  },
  INVENTORY: {
    scope: I,
    sheets: [
      { key: 'items', displayName: 'Inventory Items / Stock Master', columns: inventoryItemsCols(I) },
      { key: 'movements', displayName: 'Stock Movement Transactions', columns: movementsCols(I) },
      { key: 'odp', displayName: 'Network ODP Inventory', columns: odpCols(I) },
    ],
  },
  HR: {
    scope: H,
    sheets: [
      { key: 'employees', displayName: 'Employees Master', columns: employeesCols(H) },
      { key: 'attendance', displayName: 'Attendance Records', columns: attendanceCols(H) },
      { key: 'salaries', displayName: 'Salary Slips', columns: salariesCols(H) },
      { key: 'loans', displayName: 'Employee Loans', columns: loansCols(H) },
    ],
  },
  CUSTOMER_REVIEW: {
    scope: CR,
    sheets: [{ key: 'customers', displayName: 'Customers (Review)', columns: customersCols(CR) }],
  },
  SUPPORT_REVIEW: {
    scope: SR,
    sheets: [{ key: 'support', displayName: 'Support Tickets (Review)', columns: supportCols(SR) }],
  },
} as const

export function getScopeContract(scope: string | BatchScopeName): ImportScopeContract | undefined {
  const s = String(scope ?? '').trim().toUpperCase()
  if (!(BATCH_SCOPE_NAMES as readonly string[]).includes(s)) return undefined
  return IMPORT_COLUMN_CONTRACTS[s as BatchScopeName]
}

export function getScopeSheetHeaders(scope: BatchScopeName): Record<string, string[]> {
  const contract = IMPORT_COLUMN_CONTRACTS[scope]
  const out: Record<string, string[]> = {}
  for (const sheet of contract.sheets) {
    out[sheet.key] = sheet.columns.filter((c) => c.templateHeader).map((c) => c.parserField)
  }
  return out
}

export function isRequiredColumn(scope: BatchScopeName, sheetKey: string, parserField: string): boolean {
  const contract = IMPORT_COLUMN_CONTRACTS[scope]
  const sheet = contract.sheets.find((s) => s.key === sheetKey)
  if (!sheet) return false
  return sheet.columns.some((c) => c.parserField === parserField && c.required)
}

export function scopeSheetsTotalHeaderCount(scope: BatchScopeName): number {
  const c = IMPORT_COLUMN_CONTRACTS[scope]
  return c.sheets.reduce((acc, s) => acc + s.columns.filter((c2) => c2.templateHeader).length, 0)
}
