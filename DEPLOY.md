# Panduan Deploy — LAPORAN STOK SCA

Panduan lengkap deploy aplikasi ke **Vercel** dengan database **MongoDB Atlas**, dari nol sampai siap dipakai client.

> Stack: Next.js 15 (App Router, full-stack) + MongoDB Atlas.
> Root Directory Vercel: `./` (default) — aplikasi sudah berada di root repo.

---

## Daftar Isi

1. [Prasyarat](#1-prasyarat)
2. [Setup MongoDB Atlas dari Nol](#2-setup-mongodb-atlas-dari-nol)
3. [Integrasi Atlas ke Vercel (Environment Variables)](#3-integrasi-atlas-ke-vercel)
4. [Deploy & Verifikasi](#4-deploy--verifikasi)
5. [Apa yang Terjadi Saat First Deploy](#5-apa-yang-terjadi-saat-first-deploy)
6. [Checklist Serah Terima ke Client](#6-checklist-serah-terima-ke-client)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Prasyarat

- Akun **GitHub** berisi repo ini (branch `main`).
- Akun **Vercel** (gratis) — login pakai GitHub.
- Akun **MongoDB Atlas** (gratis, tanpa kartu kredit).

---

## 2. Setup MongoDB Atlas dari Nol

### 2.1 Buat akun & cluster

1. Daftar di <https://www.mongodb.com/cloud/atlas/register>.
2. Klik **Build a Database** → pilih tier **M0 (FREE)**.
3. Provider **AWS**, region **Singapore (ap-southeast-1)** — sejalan dengan
   region function di `vercel.json` (`sin1`).
4. Klik **Create Deployment**, tunggu 1–3 menit sampai cluster aktif.

### 2.2 Buat Database User

Menu **Database Access** → **Add New Database User**:

| Kolom | Isi |
| --- | --- |
| Authentication | Password |
| Username | mis. `scaadmin` |
| Password | klik **Autogenerate Secure Password** → **salin & simpan** |
| Role | Read and write to any database |

> Password autogenerate selalu aman untuk connection string.
> Hindari membuat password manual berisi `@ : / # %` — kalau terpaksa,
> karakter tsb wajib di-URL-encode (mis. `@` → `%40`).

### 2.3 Buka Network Access

Menu **Network Access** → **Add IP Address** → **ALLOW ACCESS FROM ANYWHERE**
(`0.0.0.0/0`) → **Confirm**.

> Wajib, karena IP serverless Vercel selalu berubah. Koneksi tetap aman
> karena membutuhkan username + password.

### 2.4 Ambil Connection String

1. Menu **Database** → tombol **Connect** pada cluster → pilih **Drivers**.
2. Salin string yang bentuknya:
   ```
   mongodb+srv://scaadmin:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
3. Ganti `<db_password>` dengan password asli — **tanda `<` dan `>` ikut dihapus**.

---

## 3. Integrasi Atlas ke Vercel

### 3.1 Import project (sekali saja)

1. <https://vercel.com/new> → **Import** repo GitHub ini.
2. **Root Directory**: biarkan `./` (default). Framework terdeteksi otomatis: **Next.js**.
3. Jangan klik Deploy dulu — isi env vars di langkah berikut (atau isi lewat
   form "Environment Variables" pada halaman import).

### 3.2 Environment Variables

Project → **Settings** → **Environment Variables** (centang **Production**;
boleh juga Preview & Development):

| Name | Wajib? | Contoh / Keterangan |
| --- | --- | --- |
| `MONGO_URL` | ✅ | Connection string hasil langkah 2.4 (password sudah diganti) |
| `DB_NAME` | ✅ | `laporan_stok_sca` — ganti nama = mulai dengan database baru yang kosong |
| `JWT_SECRET` | ✅ | String acak 64 karakter. Generate: `openssl rand -hex 32` atau <https://generate-secret.vercel.app/64> |
| `SUPERADMIN_USERNAME` | opsional | Default `Jeffsca`. Isi username final untuk client |
| `SUPERADMIN_PASSWORD` | opsional | Default `jeff3131`. **Ganti dengan password kuat untuk produksi** |
| `TEMP_ACCESS_PASSWORD` | opsional | Default `superadminsementara`. Password pembuka section terproteksi untuk Admin/PIC |
| `OWNER_EMAIL` | opsional | Email pemilik (disimpan di profil superadmin) |

> Catatan: mengubah `SUPERADMIN_PASSWORD` lalu redeploy akan otomatis
> **menyinkronkan password superadmin di database** (fitur bawaan seed).
> Mengubah `SUPERADMIN_USERNAME` akan membuat superadmin **baru**;
> user lama tetap ada dan bisa dinonaktifkan dari menu Log & User.

### 3.3 Redeploy setelah mengubah env vars

Env vars **tidak otomatis aktif** pada deployment yang sudah jadi:

Tab **Deployments** → deployment teratas → menu **⋯** → **Redeploy**.

---

## 4. Deploy & Verifikasi

1. Klik **Deploy** (atau Redeploy). Build normal ± 1 menit.
2. Tes endpoint kesehatan:
   ```
   https://NAMA-APP.vercel.app/api/health   →   {"status":"ok"}
   ```
3. Buka aplikasi → login dengan kredensial superadmin (sesuai env).
4. Cek Atlas → **Database** → **Browse Collections** → database sesuai
   `DB_NAME` beserta collection `users`, `settings`, dst. sudah terbentuk otomatis.

---

## 5. Apa yang Terjadi Saat First Deploy

MongoDB **schemaless** — tidak perlu membuat tabel/skema manual. Pada request
API pertama setelah deploy, aplikasi menjalankan auto-init (`src/server/init.js`),
sekali per cold start dan idempotent (aman diulang):

- Membuat **index**: `users.username` (unique), index `year` pada mutasi
  kertas/tinta/lain, index tanggal pada log aktivitas & audit.
- **Seed superadmin** sesuai `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD`.
- **Seed password akses sementara** sesuai `TEMP_ACCESS_PASSWORD`.

Collection lain (mutasi, jenis, log) terbentuk otomatis saat transaksi pertama.

---

## 6. Checklist Serah Terima ke Client

- [ ] `MONGO_URL` menunjuk ke database **fresh** (cluster baru, atau cukup ganti `DB_NAME`)
- [ ] `SUPERADMIN_USERNAME` & `SUPERADMIN_PASSWORD` = kredensial final yang kuat (bukan default)
- [ ] `JWT_SECRET` baru (jangan pakai bekas masa testing)
- [ ] `TEMP_ACCESS_PASSWORD` diganti dari default
- [ ] Redeploy → `/api/health` OK → login OK → dashboard tampil 0 semua (bersih)
- [ ] Buat akun **Admin/PIC** untuk staf client lewat menu **Log & User**
- [ ] (Opsional) Pasang **custom domain**: Vercel → Settings → Domains
- [ ] (Opsional) Hapus database dummy lama di Atlas: Browse Collections → Drop Database

---

## 7. Troubleshooting

| Gejala | Penyebab | Solusi |
| --- | --- | --- |
| `Kesalahan server: bad auth : authentication failed` | Username/password **database user** di `MONGO_URL` salah, placeholder `<db_password>` belum diganti, atau karakter spesial belum di-encode | Atlas → Database Access → Edit user → Autogenerate password baru → perbarui `MONGO_URL` di Vercel → Redeploy |
| Timeout / `Server selection timed out` | Network Access Atlas belum dibuka | Tambahkan `0.0.0.0/0` di Network Access |
| `Deployment Blocked — commit email could not be matched` | Email author commit tidak terhubung ke akun GitHub | Pastikan `git config user.email` = email akun GitHub (atau email noreply `ID+username@users.noreply.github.com`), lalu commit & push ulang / merge PR baru |
| Login gagal padahal `MONGO_URL` benar | Kredensial tidak sesuai env, atau env diubah tanpa redeploy | Samakan dengan `SUPERADMIN_USERNAME/PASSWORD` di Vercel, lalu **Redeploy** |
| Env vars baru tidak berpengaruh | Deployment lama masih dipakai | Selalu **Redeploy** setelah mengubah env vars |
| Warning `engines node auto-upgrade` saat build | — | Sudah ditangani: `engines.node` di-pin `20.x` |
| Data dummy masih terlihat | Masih memakai `DB_NAME` lama | Ganti `DB_NAME` (mis. `laporan_stok_sca_prod`) → Redeploy, atau drop database lama di Atlas |

---

## Referensi Cepat

```
# Format MONGO_URL yang benar (tanpa < >, tanpa spasi):
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# Generate JWT_SECRET:
openssl rand -hex 32

# Tes kesehatan setelah deploy:
curl https://NAMA-APP.vercel.app/api/health
```
