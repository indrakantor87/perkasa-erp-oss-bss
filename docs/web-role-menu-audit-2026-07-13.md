# Audit Menu Per Role 2026-07-13

Dokumen ini merangkum audit sidebar/menu aktual berbasis implementasi dan UAT browser. Fokusnya bukan hanya daftar menu, tetapi juga menandai mana yang:

1. sudah oke
2. misleading
3. masih perlu dibenahi

## Ringkasan

| Role | Menu Utama Aktual | Status Umum | Catatan |
|---|---|---|---|
| `SUPER_ADMIN` | dashboard, list kerja, daily activity, import, seluruh domain, settings, workspace khusus | `oke` | tetap menjadi role kontrol lintas domain |
| `SALES_MARKETING` | dashboard, list kerja, daily activity, sales, customer, support, inventory | `perlu dibenahi ringan` | CTA `Import Center` di shell sales sudah dibersihkan |
| `CS_OPERATOR` | dashboard, list kerja, daily activity, sales, customer, support, inventory | `oke` | smoke UAT login/landing sudah lulus |
| `CS_ADMIN` | dashboard, list kerja, daily activity, sales, customer, support, inventory, workspace supervisor | `perlu dibenahi` | query supervisor masih fallback, jadi pembacaan queue belum final |
| `NOC_OPERATOR` | dashboard, list kerja, daily activity, support, inventory | `oke` | fokus teknis relatif bersih |
| `FIELD_TECHNICIAN` | dashboard, list kerja, daily activity, support, inventory, teknisi psb/expan/jointer | `oke` | workspace khusus kini hanya tampil ke role target |
| `TT_OPERATOR` | dashboard, list kerja, daily activity, support | `oke` | role mikro cukup sempit |
| `DISMANTLE_OPERATOR` | dashboard, list kerja, daily activity, support | `oke` | landing dismantle lulus smoke UAT |
| `DIGITAL_CREATOR` | dashboard, list kerja, daily activity, sales, digital creator | `partial` | workspace khusus sudah dipersempit, tetapi domain masih belum parity penuh |

## Sudah Oke

- Default landing per role sudah hidup dan tidak lagi seragam ke `/dashboard`.
- `List Kerja` sudah menjadi menu resmi dan muncul lintas role sesuai scope.
- Sidebar role fondasi (`CS_OPERATOR`, `NOC_OPERATOR`, `TT_OPERATOR`, `DISMANTLE_OPERATOR`) sudah cukup konsisten dengan pola kerja masing-masing.
- Workspace khusus berikut sekarang hanya tampil dan bisa diakses oleh role target:
  - `CS & Admin CS`
  - `Digital Creator`
  - `Teknisi PSB`
  - `Teknisi Expan`
  - `Teknisi Jointer`
  - `Legal`
  - `Kantor`
  - `Toko`

## Misleading Yang Sudah Dibereskan

- `SALES_MARKETING` sebelumnya melihat CTA `Buka Import Center` pada shell sales, padahal route `/import` dijaga untuk `SUPER_ADMIN`. CTA ini sudah diganti ke `Buka List Kerja`.
- `CS_ADMIN` sebelumnya melihat shortcut `Buka Billing` di workspace supervisor, padahal role ini tidak punya akses baseline ke `/billing`. Shortcut ini sudah dihapus.
- Workspace khusus sebelumnya mengandalkan prefix route sehingga terlihat seolah tersedia untuk role lebih luas. Guard kini fail-closed ke role target.

## Masih Perlu Dibenahi

- `CS_ADMIN` masih tertahan blocker query supervisor review DB: `Column 'status' in field list is ambiguous`.
- Bukti write-side/high-risk flow belum lengkap untuk:
  - restore isolir
  - transfer ke dismantle
  - reopen dismantle
  - update TT teknis
  - update port/ODP
- `DIGITAL_CREATOR` masih belum layak cutover walau menu khususnya sudah rapi, karena parity domain creator digital belum penuh.

## Rekomendasi Lanjut

1. selesaikan query supervisor `CS_ADMIN` agar bucket approval/koreksi/restore valid dari review DB
2. formalkan bukti write-side per role di checklist UAT/hardening
3. pertahankan prinsip fail-closed untuk workspace khusus lain yang nanti ditambahkan

