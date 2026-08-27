# PRD — LAPORAN STOK SCA

## Problem Statement
Web app full-stack (Bahasa Indonesia, responsive) untuk mengelola Mutasi & Laporan Stok Kertas (Rim), Tinta (Kg), dan Barang Lain di percetakan SCA. Pembukuan per tahun kalender dengan fitur tutup tahun.

## Architecture (setelah refactor 2026-08-25)
**Full-stack Next.js 15 (App Router) + MongoDB Atlas — deploy target: Vercel.**

- **UI**: React 19, Tailwind + shadcn/ui, recharts, next-themes (dark/light), sonner toast.
  react-router-dom tetap dipakai sebagai SPA di dalam catch-all route `app/[[...slug]]/page.js`
  (dynamic import `ssr: false`) sehingga tampilan 100% identik dengan versi CRA sebelumnya.
- **API**: Next.js Route Handlers di `frontend/app/api/**` (runtime nodejs, `force-dynamic`).
- **Lapisan server** di `frontend/src/server/`:
  - `mongo.js` — driver `mongodb` resmi, koneksi di-cache di `globalThis` (aman untuk serverless)
  - `init.js` — index + seed idempotent (superadmin & password akses sementara)
  - `auth.js` — JWT `jose` (HS256, 12 jam) + cookie httpOnly, password `bcryptjs`, guard role & section
  - `stock.js` — perhitungan stok & harga (port 1:1 dari `stock.py` lama)
  - `mutations.js` — validasi payload, cek kecukupan stok, aturan edit/hapus
  - `reports.js` — dashboard, laporan stok, laporan detail (PPN bulanan, perbandingan periode)
  - `pdf/` — generator PDF dengan `pdf-lib` (tabel + line/bar/komposisi chart), pengganti reportlab+matplotlib
- **Auth klien**: JWT Bearer (localStorage `stokku_token`) + cookie httpOnly; header
  `X-Section-Password` untuk membuka section terproteksi.
- **Fonts**: Manrope (display) + IBM Plex Sans. Primary biru `#2563eb`.
- **Preview Emergent**: `backend/server.py` hanya reverse proxy `/api/*` -> `localhost:3000/api/*`
  (ingress preview mengarahkan `/api` ke port 8001). Tidak dipakai di Vercel.
- Kode Python lama tersimpan di `legacy_backend/` sebagai referensi.

## Environment variables (server)
`MONGO_URL`, `DB_NAME`, `JWT_SECRET` (wajib) — `SUPERADMIN_USERNAME`, `SUPERADMIN_PASSWORD`,
`TEMP_ACCESS_PASSWORD`, `OWNER_EMAIL` (opsional, ada default). Lihat `frontend/.env.example`.

## User Personas
- **Superadmin** (Jeffsca): akses penuh tanpa password tambahan, termasuk nominal rupiah.
- **Admin/PIC**: akses Mutasi + Laporan Stok ringkas; nominal rupiah disembunyikan.
  Section terproteksi (Laporan Detail, Log & User, Tutup Tahun) dibuka per sesi dengan
  password akses sementara.

## Core Requirements
- 2 role, auto-logout 60 menit + dialog peringatan di menit ke-58.
- Mutasi Kertas / Tinta / Lain: Masuk / Keluar / Retur, cegah stok minus,
  edit-hapus (Admin: hanya milik sendiri & di hari yang sama), audit trail.
- Harga (transaksi Masuk): mode Per Rim / Per Kg (rumus `g*p*l*harga/20000`) / Total Kiriman;
  PPN opsional. Nominal stok memakai weighted average harga masuk.
- Laporan Stok ringkas (breakdown per Supplier) + PDF.
- Laporan Detail terproteksi: nominal, komposisi, tren bulanan, perbandingan periode, PPN bulanan + PDF.
- Log aktivitas & audit, manajemen user, ubah password akses sementara (superadmin).
- Tutup Tahun: wajib unduh PDF dulu, lalu reset seluruh data mutasi (user & log tetap).

## Endpoint
`/api/health` · `/api/auth/{login,logout,me,verify-temp-password}` ·
`/api/{paper|ink|other}/mutations` + `/{id}` · `/api/{type}/jenis` · `/api/dashboard` ·
`/api/reports/{stock,detail}` · `/api/logs/{activity,audit}` · `/api/users` + `/{id}` + `/{id}/toggle` ·
`/api/settings/temp-password` · `/api/year/close` ·
`/api/pdf/{paper-mutations,ink-mutations,other-mutations,stock-ringkas,detail,stock-nominal}`

## Status
- 2026-08-25 — Refactor ke Next.js selesai & di-merge (PR #1).
  `yarn build` sukses; smoke test API `tests/test_core.sh` 47/47 PASS;
  testing agent: backend 44/44, alur UI utama normal, 0 bug kritis.
  Alur diverifikasi manual di browser: input mutasi via form, gate section role Admin/PIC,
  nominal tersembunyi untuk non-superadmin, halaman Tutup Tahun.
- Database produksi (Atlas `laporan_stok_sca`) sudah dibersihkan dari data demo:
  hanya berisi user superadmin + setting password akses.

## Backlog (P2)
- PDF `stock-nominal` menghormati filter start/end (saat ini rekap stok memakai tahun berjalan).
- Invalidasi token sisi server saat logout (saat ini JWT stateless).
- Notifikasi stok menipis; impor mutasi massal dari Excel.

## Credentials (development)
Superadmin: `Jeffsca` / `jeff3131`. Password akses sementara: `superadminsementara`.
Ganti lewat env var `SUPERADMIN_PASSWORD` / `TEMP_ACCESS_PASSWORD` saat deploy produksi.
