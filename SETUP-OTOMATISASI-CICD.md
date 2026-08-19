# 🔧 Setup Otomatisasi TRAE → GITHUB → COOLIFY (FULL CI/CD)

Dokumen ini berisi step-by-step untuk mengaktifkan pipeline:
> **Push commit ke main → GitHub Actions Build Image → Push ke GHCR → Auto Deploy ke Coolify Server VIA SSH**
> tanpa perlu klik UI Coolify / buka Terminal Server manual lagi! 🎉

---

## 📋 Daftar 3 Secrets yang HARUS di-set di GitHub Repository Settings

Buka di browser: `https://github.com/indrakantor87/perkasa-erp-oss-bss/settings/secrets/actions` → klik **New repository secret** untuk masing-masing 3 item di bawah:

| # | Nama Secret GitHub | Isi Value | Contoh |
|---|---|---|---|
| 1 | `COOLIFY_SERVER_HOST` | **IP PUBLIC server Coolify** (IP VPS, bukan IP internal 10.x). Cari dari URL sslip.io Anda `103.162.17.178.sslip.io` = IPnya **103.162.17.178** | `103.162.17.178` |
| 2 | `COOLIFY_SERVER_USER` | **Username SSH server Coolify** (default di Coolify VPS = `root`, jarang yang bukan). | `root` |
| 3 | `COOLIFY_SERVER_SSH_PRIVATE_KEY` | **ISI PENUH file id_ed25519 PRIVATE KEY SSH** (HARUS 1 FILE PRIVATE KEY LENGKAP mulai dari `-----BEGIN OPENSSH PRIVATE KEY-----` sampai `-----END OPENSSH PRIVATE KEY-----`). JANGAN paste PUBLIC KEY! | Lihat step B di bawah cara generate |

---

## 🚀 Step A: Generate SSH Key Pair (Jika Belum Punya Khusus Deploy)

**JALANKAN di Terminal LOKAL ATAU di Coolify Server Terminal sendiri (localhost).** Kita generate KEY BARU khusus untuk GitHub Actions deploy, JANGAN pakai key pribadi:

```bash
cd ~/.ssh
ssh-keygen -t ed25519 -C "github-actions-deploy-perkasa-erp" -f ./id_ed25519_github_actions_perkasa -N ""
```

Akan menghasilkan 2 file:
```
id_ed25519_github_actions_perkasa        → PRIVATE KEY = Paste ke Secret #3
id_ed25519_github_actions_perkasa.pub    → PUBLIC KEY  = Tambahkan ke server Coolify authorized_keys
```

---

## ✅ Step B: Tambahkan PUBLIC KEY ke Coolify Server (agar Bisa Login Tanpa Password dari Runner GitHub)

Buka Coolify Dashboard → Servers → localhost → tab **Terminal** → paste command berikut:

```bash
# Salin isi PUBLIC KEY ~/.ssh/id_ed25519_github_actions_perkasa.pub di bawah, GANTI ISI NYA DI BAWAH INI!
# Contoh: Ganti "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI..." dengan ISI PUBKEY ANDA SEBENARNYA!
PUBKEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions-deploy-perkasa-erp"

# Tambahkan ke authorized_keys server Coolify localhost
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo "$PUBKEY" >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys

echo "✅ Public key ditambahkan. Cek line terakhir:"
tail -3 /root/.ssh/authorized_keys
```

**TEST SEBELUM SETUP SECRET!** Pastikan dari laptop sendiri (atau mana saja yang punya PRIVATE KEY) bisa masuk tanpa password:
```bash
ssh -i ~/.ssh/id_ed25519_github_actions_perkasa -o StrictHostKeyChecking=no root@103.162.17.178 "hostname && docker ps | head -5"
```
✅ Jika berhasil dan tidak ditanya password = Public key installed OK!

---

## 🗝️ Step C: Copy Isi PRIVATE KEY ke Secret #3

Jalankan di Terminal (di tempat generate key tadi):
```bash
# Outputkan isi file PRIVATE KEY:
cat ~/.ssh/id_ed25519_github_actions_perkasa
```

✅ Copy **SELURUH OUTPUT MULAI DARI BARIS `-----BEGIN OPENSSH PRIVATE KEY-----` SAMPAI BARIS TERAKHIR `-----END OPENSSH PRIVATE KEY-----` (TERMASUK 2 BARIS HEADER/FOOTER ITU!)** → paste ke Secret GitHub nomor 3 bernama `COOLIFY_SERVER_SSH_PRIVATE_KEY`.

---

## 🔵 Step D: Setup 3 Secrets di GitHub Settings

Buka **https://github.com/indrakantor87/perkasa-erp-oss-bss/settings/secrets/actions** → klik **New repository secret** untuk masing-masing:

### Secret 1/3: `COOLIFY_SERVER_HOST`
```
103.162.17.178
```
(atau IP public server Coolify Anda yang benar)

### Secret 2/3: `COOLIFY_SERVER_USER`
```
root
```
(jarang berubah, default root)

### Secret 3/3: `COOLIFY_SERVER_SSH_PRIVATE_KEY`
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW
...
LOTS OF LINES HERE - SEMUA ISI FILE PRIVATE KEY JANGAN ADA YANG TERPOTONG!
...
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==
-----END OPENSSH PRIVATE KEY-----
```

---

## 🧪 Step E: TEST PIPELINE PERTAMA KALI (MANUAL WORKFLOW DISPATCH)

Setelah semua 3 secrets tersimpan:
1. Buka tab **Actions** repo: `https://github.com/indrakantor87/perkasa-erp-oss-bss/actions`
2. Klik Workflow **"Deploy Production to Coolify (via SSH)"** di sidebar kiri
3. Klik tombol **Run workflow ▼** dropdown → pilih Branch `main` → klik **Run workflow** (BIRU)
4. Tunggu Workflow berjalan → Step names:
   - ✅ Install SSH Key
   - ✅ Test koneksi SSH ke Server Coolify (preflight)
   - ✅ 🚀 Jalankan Deploy Production ke Coolify via SSH (akan wait 55 detik)
   - ✅ Post healthcheck
5. Jika **SEMUA HIJAU ✅** → Pipeline 100% WORK! Cek browser app production.

---

## 🔄 Step F: AUTO RUN SETELAH BUILD PUSH

Setelah test manual work, maka **setiap kali ada PUSH COMMIT BARU ke BRANCH MAIN** berikut yang terjadi OTOMATIS 2 job berurutan:
1. ✅ Job 1 (Workflow: **Build & Push Docker Image to GHCR**) → Build → push latest + sha7 ke GHCR (±2 menit)
2. ✅ Job 2 (Workflow: **Deploy Production to Coolify (via SSH)**) → **AUTO-TRIGGER SETELAH Job 1 SUCCESS** → Connect SSH → Pull image → Redeploy container → Production live!

**HASIL = 0 MANUAL INTERVENTION, KECUALI PUSH CODE SAJA.** 🚀

---

## 📝 Troubleshooting Workflow Deploy

| Error Step | Penyebab | Solusi |
|---|---|---|
| Step Install SSH Key "file not found" | Value secret `COOLIFY_SERVER_SSH_PRIVATE_KEY` kosong / tidak lengkap / potong line | Re-copy isi full private key TERMASUK baris BEGIN & END KEY. |
| Step Test SSH "Connection refused" / "Timed out" | Salah IP `COOLIFY_SERVER_HOST` / Port 22 VPS firewall tertutup GitHub runner IP ranges | 1) Pastikan IP = PUBLIC IP Coolify Server VPS (bukan IP private 10.x). 2) Pastikan firewall VPS port 22 OPEN (bukan dibatasi IP tertentu). GitHub Actions IPs = dynamic, tidak bisa whitelist 1 IP saja. |
| Step Test SSH "Permission denied publickey" | Public key tidak masuk authorized_keys server / salah user / secret private key tidak cocok publicnya | Lakukan ulang Step A generate key, pastikan copy line PUB ke /root/.ssh/authorized_keys di server tanpa tambahan newline / whitespace. |
| Step Deploy "docker: command not found" di remote | SSH connect ke server salah (bukan server Coolify localhost yang ada dockernya) / `COOLIFY_SERVER_USER` bukan root tapi user lain tidak punya permission docker | Pastikan user di secret = root / user sudah add ke group docker di server. |
| Step Deploy "Container tidak bisa ping DB 10.0.1.11" | MySQL container di Coolify tidak lagi di network coolify / IP berubah saat restart container MySQL | Cek IP MySQL internal terbaru: `docker inspect rswmvtwn84u5vdjqa8byxvk6 -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'` → update nilai DB_IP di `deploy-coolify-via-ssh.sh` dan `redeploy-coolify.sh` → commit push ke main (workflow akan build dan deploy otomatis dengan IP baru). |

---

## 📦 File Terkait CI/CD Pipeline

| File | Path | Fungsi |
|---|---|---|
| Workflow Build + Push | [.github/workflows/build-push-docker.yml](.github/workflows/build-push-docker.yml) | Build Next.js standalone, push image ghcr.io:latest + sha7 tag (LEBIH DULU JALAN, trigger workflow deploy auto setelahnya) |
| Workflow Deploy Coolify | [.github/workflows/deploy-coolify.yml](.github/workflows/deploy-coolify.yml) | Auto trigger setelah build-push SUCCESS main branch. Steps: SSH key install → Test SSH → jalankan deploy via SSH script |
| SSH Deploy Script | [deploy-coolify-via-ssh.sh](deploy-coolify-via-ssh.sh) | Bash script runner GitHub panggil. Connect via SSH ke Coolify server, kirim heredoc redeploy script (pull → rm → run → wait → status) |
| Redeploy Manual Server Localhost | [redeploy-coolify.sh](redeploy-coolify.sh) | Jalankan langsung di Coolify Terminal Server localhost jika butuh redeploy tanpa GitHub (tanpa perlu push commit) |
| Dockerfile Production | [Dockerfile](Dockerfile) | 3-stage deps → builder → runner. WORKDIR default /app/apps/web/standalone + CMD node server.js (TANPA perlu override custom -w / path node manual) |
