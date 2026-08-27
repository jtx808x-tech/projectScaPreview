# plan.md — Merge & Refactor 3 Tools SCA (Stock + HPP + PO Tracker)

## 1) Objectives
- Menggabungkan **SCA-Stock (repo utama ClientscaStock)** + **HPP System** + **PO Tracker** menjadi **1 aplikasi Next.js 15 (App Router) siap Vercel**.
- Menyatukan **auth/role**:
  - **Superadmin**: akses semua menu (3 tools) + **CRUD user**.
  - **Admin/PIC**: akses **Stok SCA** (kecuali **Laporan Detail**) + **PO Tracker** (semua menu). Tidak bisa akses HPP.
  - Halaman login ada **dropdown role**; role yang dipilih **harus match** dengan role di DB.
- Migrasi backend FastAPI legacy (HPP + PO) menjadi **Next.js Route Handlers** + MongoDB Atlas.
- Migrasi upload foto PO ke **Cloudflare R2 (S3-compatible) + CDN**, metadata di MongoDB.
- Menjaga fitur existing SCA-Stock tetap stabil (mutasi, laporan, PDF, section lock, tutup tahun).

## 2) Implementation Steps (Phased, core-first)

### Phase 1 — Core POC (R2 upload/display + role-login verification)
**Kenapa POC:** Integrasi eksternal R2 + flow upload/preview paling riskan di Vercel.

**User stories (POC)**
1. Sebagai superadmin, saya bisa login dengan memilih role “Superadmin” dan ditolak bila salah pilih role.
2. Sebagai admin/PIC, saya bisa login dengan role “Admin/PIC” dan mendapat menu sesuai akses.
3. Sebagai user PO Tracker, saya bisa upload 1 foto bukti tahap ke R2 dan mendapatkan URL publik.
4. Sebagai user, saya bisa melihat kembali foto yang sudah diupload (preview) dari CDN URL.
5. Sebagai user, saya bisa menghapus foto dan link tidak lagi muncul di detail PO.

**Langkah teknis**
- Tambah env + contoh di `.env.example`: `R2_*` + `R2_PUBLIC_URL`.
- Buat modul server `src/server/r2.js` (AWS SDK S3 client) + fungsi `put/get/delete`.
- Buat 2 endpoint minimal:
  - `POST /api/po/poc/upload` (multipart) → simpan ke R2 → return `{key, publicUrl}`
  - `DELETE /api/po/poc/upload?key=` → delete object
- Update `/api/auth/login` agar menerima `{username, password, role}` dan memverifikasi role.
- Jalankan uji isolasi (curl) untuk:
  - login sukses/gagal karena mismatch role
  - upload 1 file ke R2 → akses publicUrl (200)
  - delete → pastikan tidak bisa diakses / tidak tampil

**Checkpoint (wajib lulus sebelum lanjut)**
- Upload → tampil → delete berjalan end-to-end di environment preview/Vercel-like.

### Phase 2 — V1 App Development (merge minimal, fokus alur inti 3 tools)
**User stories (V1)**
1. Sebagai superadmin, saya bisa membuka sidebar dan masuk ke 3 tools: Stok, PO Tracker, HPP.
2. Sebagai admin/PIC, saya hanya melihat menu Stok (tanpa Laporan Detail) dan PO Tracker.
3. Sebagai user PO Tracker, saya bisa membuat PO baru, memilih tahapan, dan melihat status bucket otomatis.
4. Sebagai superadmin, saya bisa membuat perhitungan HPP, menyimpan, membuka ulang, dan export PDF.
5. Sebagai user Stok, saya bisa membuat mutasi dan melihat laporan stok tanpa perubahan perilaku dari versi sebelumnya.

**Langkah teknis (merge code)**
- **UI Shell terpadu**
  - `src/views/AppShell.jsx` + sidebar 3 tools + guard.
  - `src/views/Login.jsx` update: dropdown role.
  - Update `src/App.js` routes: `/stok/*`, `/po/*`, `/hpp/*`, `/users`.
- **Auth & guards**
  - Update `src/server/auth.js` untuk role + guard tool (`requireSuperadmin`, `requireAdminOrSuperadmin`, `guardStokNoDetailForAdmin`).
  - Pastikan endpoint stok “detail” tetap pakai section lock existing.
- **Port HPP ke Next.js**
  - Pindah `hppCalc.js`, `refData.js` ke `src/lib/`.
  - Tambah API `app/api/hpp/calculations/*` (CRUD) + `app/api/hpp/pdf` (pdf-lib).
  - Tambah halaman `src/views/hpp/Calculator.jsx` (port dari CRA) + adapt ke AppShell.
- **Port PO Tracker ke Next.js (tanpa foto dulu selain POC)**
  - Tambah koleksi: `pos`, `po_schedules`, `po_files`.
  - API inti: PO CRUD, stage update, delivery schedule/result, dashboard counts, calendar schedules.
  - Halaman: `POList`, `POForm`, `PODetail`, `Calendar`, `Dashboard` (port dan adapt).
- Akhiri phase dengan **1x e2e smoke test** (manual + testing agent): login 2 role, stok flow minimal, PO create + update stage, HPP save + pdf.

### Phase 3 — Feature Completion (foto R2 penuh + PDF PO + refactor modular)
**User stories (Feature completion)**
1. Sebagai user PO Tracker, saya bisa upload banyak foto per tahap, melihat thumbnail, dan hapus.
2. Sebagai user, saya bisa download/lihat file lewat URL publik R2 tanpa token.
3. Sebagai user, saya bisa export PDF rekap PO dengan filter bulan/bucket.
4. Sebagai superadmin, saya bisa membuat user baru (admin/pic) dan reset password.
5. Sebagai admin/pic, saya tetap tidak bisa mengakses HPP dan tidak bisa membuka Laporan Detail.

**Langkah teknis**
- Implement endpoint foto final:
  - `POST /api/po/pos/[id]/stages/[num]/photo` → upload R2 + simpan metadata `po_files` + update `stage_data.photos`
  - `DELETE /api/po/pos/[id]/stages/[num]/photo/[fileId]` → soft delete metadata + delete R2 (opsional)
- Implement **PO PDF export** via `pdf-lib` (gantikan reportlab), endpoint `/api/po/pos/export/pdf`.
- Refactor backend PO ke folder `src/server/po/*` (stages, conflict, pdf, validators).
- Rapikan UI PODetail (pecah komponen) jika sudah stabil.
- Testing agent: regression semua modul + negative cases (role mismatch, forbidden routes).

### Phase 4 — Hardening for Vercel (stabilitas + migrasi data + docs)
**User stories (Hardening)**
1. Sebagai owner, saya bisa deploy ke Vercel dengan env lengkap dan semua menu berjalan.
2. Sebagai user, saya tidak mengalami logout/redirect loop saat navigasi SPA.
3. Sebagai superadmin, saya bisa migrasi data lama PO/HPP bila dibutuhkan.
4. Sebagai user, PDF export tidak timeout dan format konsisten.
5. Sebagai tim, kami punya README + env example yang jelas.

**Langkah teknis**
- Pastikan koneksi Mongo cached untuk serverless; index creation idempotent.
- Konfigurasi CORS/cookie untuk domain Vercel (SameSite, secure) sesuai pola existing.
- Tambah script migrasi opsional untuk import data dari legacy (zip) jika user punya DB lama.
- Update README + `.env.example` final.
- Commit + push ke `main` repo `ClientscaStock`.

## 3) Next Actions (need from user + immediate execution)
1. User kirim **R2 credentials**:
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` (r2.dev / custom domain)
2. Aku langsung kerjakan **Phase 1 POC** (role-login + R2 upload/display/delete) di repo utama.
3. Setelah POC lulus, lanjut Phase 2 merge V1 (HPP + PO core + unified shell).

## 4) Success Criteria
- **Role gating benar**:
  - Admin/PIC tidak bisa akses `/hpp/*` dan tidak bisa akses stok Laporan Detail.
  - Superadmin bisa akses semuanya + CRUD user.
  - Login ditolak jika dropdown role ≠ role di DB.
- **PO Tracker core berfungsi**: PO CRUD, status tahapan, delivery attempts, kalender schedule.
- **Foto PO berfungsi via R2**: upload → tampil via CDN URL → delete/soft delete.
- **HPP berfungsi**: kalkulasi, simpan/load, export PDF.
- **Regresi stok nol**: semua fitur SCA-Stock existing tetap PASS.
- **Deploy Vercel**: build sukses, runtime API stabil, env documented.

---

## Status Lanjutan — 27 Agustus 2026

### Fase A — Live preview (SELESAI)
- Repo `ClientSca7452/ClientscaStock` dipasang ke `/app`, dependencies terinstall, service jalan
- Terhubung ke MongoDB Atlas asli; login superadmin & seluruh menu berfungsi

### Fase B — Perbaikan & PR #7 di repo lama (SELESAI, sudah merged)
- `devIndicators:false`, `ChartBox`, header sidebar "Kalkulator"
- `tests/verify_flagged.py` — 27/27 PASS (PO stages, delivery flow + reschedule, check-conflict, HPP PDF, auth negatif)

### Fase C — UI Polish 21st.dev + Font Geist (SELESAI)
- Geist Sans/Mono via next/font, angka tabel tabular-nums
- `ui/chart.jsx`, gradient area chart, donut + total tengah, rounded bar
- `ui/empty.jsx`, skeleton shimmer, stepper PO bergaris, glass dialog/popover
- Bug fix: `TRX_LABEL` (badge Transaksi kosong)

### Fase D — Refactor pola shadcn dashboard starter (SELESAI)
- `PageContainer` + `Heading` di 10 halaman, `Breadcrumbs`, Command Palette Ctrl+K,
  `NavUser`, `TablePagination`, `TableViewOptions`, `AppSkeleton`, `Kbd`/`Spinner`/`LoadingButton`
- Bug fix: komposisi laporan detail unik (duplicate key), CommandDialog a11y

### Fase E — Data demo (SELESAI)
- `tests/seed_dummy.py` (opsi `--wipe`, `--pos-only`)
- Terisi: 56 mutasi kertas + 45 tinta + 41 lain, 12 PO (progres & skenario kirim beragam),
  24 jadwal, 6 perhitungan HPP `[DEMO]`. Data asli user (4 mutasi kertas) dipertahankan

### Fase F — Regression test (SELESAI, iteration_5.json)
- Backend 65/70 (0 bug aplikasi; 5 kegagalan = urutan test agent), Frontend 100%
- Terkonfirmasi hilang: warning Recharts, React duplicate key, error DialogTitle
- Gating diverifikasi manual: admin tanpa header → 403, dengan `X-Section-Password` → 200,
  `/api/hpp/**` untuk admin → 403, password section salah → 403

### Fase G — Repo baru (SELESAI)
- `jtx808x-tech/projectScaPreview` — PR #1 **sudah di-merge** ke `main` (54 file, +2546/-297)
- Kredensial hardcoded di `tests/test_core.sh` dipindah ke environment

### Sisa pekerjaan / catatan
- [ ] Token Cloudflare R2 masih **READ-only** → upload foto bukti tahap PO belum bisa dipakai.
      Perlu regenerate dengan permission **Object Read & Write**
- [ ] `src/server/init.js` masih punya fallback password superadmin hardcoded (kode lama)
- [ ] Data dummy bisa dihapus kapan saja: `python3 tests/seed_dummy.py --wipe`
- [ ] Rotasi (ganti) GitHub PAT, password Atlas, dan key R2 karena pernah dikirim via chat
