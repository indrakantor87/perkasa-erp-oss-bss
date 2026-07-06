# Format File Import Web

## Tujuan

Dokumen ini menjelaskan format file yang didukung oleh Import Center web saat upload file sumber langsung ke batch review.

## Format yang Didukung

- `JSON`
- `XLSX`
- `XLS`
- `CSV` terbatas untuk scope satu section

## Prinsip Umum

- File yang diupload tidak hanya disimpan lokal, tetapi juga diparse ke tabel staging sesuai `scope` batch.
- Parser web mengikuti struktur entity staging, jadi nama key JSON atau nama sheet workbook harus mencerminkan section staging.
- Row hasil parsing akan masuk ke staging dengan status awal `PENDING`.
- Setelah itu user menjalankan `Validasi Batch` dari web agar row berubah ke `VALID` atau `INVALID`.

## Scope dan Section

### `USER_AND_ORDER_SAMPLE`

Section yang didukung:

- `users`
- `customers`
- `orders`
- `support`

### `BILLING_SAMPLE`

Section yang didukung:

- `invoices`
- `items`
- `payments`
- `collections`

### `INVENTORY_SAMPLE`

Section yang didukung:

- `items`
- `movements`

### `HR_SAMPLE`

Section yang didukung:

- `employees`
- `attendance`
- `salaries`
- `loans`

### `CUSTOMER_REVIEW`

Section yang didukung:

- `customers`

### `SUPPORT_REVIEW`

Section yang didukung:

- `support`

## Format JSON

### Scope multi-section

Gunakan object dengan key section:

```json
{
  "users": [
    {
      "legacy_id": "USR-001",
      "full_name": "Admin CS Sample",
      "username": "admincs.sample",
      "mapped_role_code": "ADMIN_CS",
      "mapped_division_code": "CS"
    }
  ],
  "customers": [
    {
      "legacy_id": "CUST-001",
      "customer_name": "Budi Sample",
      "phone": "081300000001",
      "branch_code": "PATI"
    }
  ]
}
```

### Scope satu section

Boleh langsung memakai array:

```json
[
  {
    "legacy_id": "SUP-001",
    "support_type": "TROUBLE_TICKET",
    "ticket_code": "TT-SAMPLE-001",
    "customer_name": "Budi Sample"
  }
]
```

## Format Workbook XLSX/XLS

- Buat satu sheet per section.
- Nama sheet sebaiknya memakai nama section langsung, misalnya:
  - `users`
  - `customers`
  - `orders`
  - `support`
- Header kolom mengikuti nama field staging, misalnya `legacy_id`, `customer_name`, `mapped_package_code`, `support_type`, dan seterusnya.

## Format CSV

- `CSV` disarankan hanya untuk batch dengan satu section seperti `CUSTOMER_REVIEW` atau `SUPPORT_REVIEW`.
- Untuk scope multi-section, gunakan `JSON` atau `XLSX/XLS` agar setiap entity bisa dipisah dengan benar.

## Catatan Field

- Parser menerima nama field `snake_case` dan sebagian alias `camelCase`.
- Jika `normalized_key` tidak diisi, web akan mencoba membuat fallback sederhana dari field utama.
- `raw_payload` akan diisi otomatis dari row asli jika tidak diberikan.
- Field target seperti `target_customer_id`, `target_order_id`, dan `target_invoice_id` tidak diisi saat upload awal.

## Urutan Operasional

1. Buat batch di Import Center.
2. Upload file sumber.
3. Parser web memuat row ke staging.
4. Jalankan `Validasi Batch`.
5. Jalankan `Transform Tahap 1-4` sesuai kebutuhan review.
