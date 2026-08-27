# LAPORAN STOK SCA

Sistem **mutasi & laporan stok** kertas, tinta, dan barang lain untuk percetakan SCA.
Full-stack **Next.js 15 (App Router)** + **MongoDB Atlas**, siap deploy ke **Vercel**.

Antarmuka sepenuhnya Bahasa Indonesia, responsive, mendukung mode terang & gelap.

---

## Fitur

| Modul | Keterangan |
| --- | --- |
| **Dashboard** | Total stok kertas (Rim) & tinta (Kg), jumlah mutasi hari ini, total nominal stok (khusus Superadmin), grafik tren 6 bulan, daftar mutasi terbaru |
| **Mutasi Kertas** | Masuk / Keluar / Retur. Identitas barang = jenis + gramatur + ukuran (panjang × lebar). Harga masuk 3 mode: Per Rim, Per Kg (`g × p × l × harga ÷ 20000`), Total Kiriman. PPN opsional |
| **Mutasi Tinta** | Masuk / Keluar / Retur dengan harga per Kg |
| **Mutasi Lain** | Barang bebas (nama + satuan sendiri, mis. box/pcs/roll) dengan harga per satuan |
| **Laporan Stok** | Rekap stok berjalan per item **beserta rincian per supplier**, ekspor PDF |
| **Laporan Detail** | Nominal rupiah, komposisi nominal, tren nilai stok bulanan, perbandingan dengan periode sebelumnya, rekap PPN per bulan, ekspor PDF *(section terproteksi)* |
| **Log & User** | Log aktivitas login/logout, log audit edit/hapus, CRUD user, aktif/nonaktif user, ubah password akses sementara *(section terproteksi)* |
| **Tutup Tahun** | Wajib unduh PDF laporan dulu, baru reset seluruh data mutasi. Data user & log tetap tersimpan *(section terproteksi)* |

Aturan bisnis penting:

- Stok **tidak boleh minus** — transaksi Keluar ditolak bila melebihi stok tersedia.
- Nominal stok dihitung dengan **rata-rata tertimbang (weighted average)** harga masuk.
- **Superadmin** bebas mengedit/menghapus mutasi apa pun.
  **Admin/PIC** hanya bisa mengubah mutasi miliknya sendiri **dan** di hari yang sama saat dibuat.
- Auto-logout setelah **60 menit** tidak aktif, dengan dialog peringatan di menit ke-58.
- Semua perubahan & penghapusan mutasi tercatat di **log audit**.

---

## Role & akses

| Role | Akses |
| --- | --- |
| **Superadmin** | Semua modul, termasuk semua nominal rupiah. Tanpa password tambahan |
| **Admin/PIC** | Dashboard, semua Mutasi, Laporan Stok. Nominal rupiah **disembunyikan** (kartu tampil "Terkunci") |

Section terproteksi (**Laporan Detail**, **Log & User**, **Tutup Tahun**) bisa dibuka oleh
Admin/PIC dengan **password akses sementara**, berlaku selama sesi login saat itu
(dikirim ke API lewat header `X-Section-Password`).

---

## Stack

| Bagian | Teknologi |
| --- | --- |
| UI | React 19, Tailwind CSS, shadcn/ui, Recharts, next-themes, sonner |
| Routing halaman | react-router-dom sebagai SPA di dalam catch-all route `app/[[...slug]]` |
| API | Next.js Route Handlers (`app/api/**`), runtime Node.js |
| Database | MongoDB (Atlas) via driver resmi `mongodb`, koneksi di-cache untuk serverless |
| Auth | JWT `jose` (HS256, 12 jam) + cookie httpOnly, hash password `bcryptjs` |
| PDF | `pdf-lib` — tabel dengan header berulang & page-break, line/bar/komposisi chart. Murni JS, tanpa dependensi native |

---

## Struktur project

```
.
├── app/                              # Next.js App Router
│   ├── layout.js
│   ├── [[...slug]]/page.js           # shell SPA (ssr: false)
│   └── api/                          # seluruh endpoint REST
│       ├── health/
│       ├── auth/{login,logout,me,verify-temp-password}/
│       ├── [type]/mutations/[id]/    # type = paper | ink | other
│       ├── [type]/jenis/
│       ├── dashboard/
│       ├── reports/{stock,detail}/
│       ├── logs/{activity,audit}/
│       ├── users/[id]/toggle/
│       ├── settings/temp-password/
│       ├── year/close/
│       └── pdf/[kind]/
├── src/
│   ├── App.js                        # definisi route SPA
│   ├── views/                        # halaman (Login, Dashboard, dst.)
│   ├── components/                   # komponen + components/ui (shadcn)
│   ├── context/AuthContext.jsx
│   ├── lib/{api.js,format.js,utils.js}
│   └── server/                       # LAPISAN SERVER
│       ├── mongo.js                  # koneksi + cache
│       ├── init.js                   # index & seed idempotent
│       ├── auth.js                   # JWT, bcrypt, guard role/section
│       ├── stock.js                  # perhitungan stok & harga
│       ├── mutations.js              # validasi + aturan edit/hapus
│       ├── reports.js                # dashboard, stok, detail
│       └── pdf/{core.js,builders.js}
├── scripts/seed.mjs                  # seed manual (opsional)
├── package.json                      # aplikasi Next.js (root repo)
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── jsconfig.json
├── vercel.json
├── .env.example
├── tests/test_core.sh                # smoke test API end-to-end (47 skenario)
├── backend/server.py                 # reverse proxy /api -> Next.js (khusus preview Emergent)
├── frontend/package.json             # shim preview Emergent (meneruskan ke root)
└── legacy_backend/                   # kode FastAPI lama, hanya referensi
```

> **Catatan 1:** aplikasi Next.js berada di **root repo**, jadi Root Directory di Vercel
> dibiarkan `./` (default).
>
> **Catatan 2:** folder halaman sengaja bernama `src/views`, **bukan** `src/pages`,
> karena `src/pages` akan dianggap Pages Router oleh Next.js dan membuat build gagal.
>
> **Catatan 3:** `frontend/package.json` hanya shim untuk preview Emergent (supervisor
> menjalankan `yarn start` di folder itu, lalu diteruskan ke root). Tidak dipakai Vercel.

---

## Environment variables

Wajib:

| Key | Keterangan |
| --- | --- |
| `MONGO_URL` | Connection string MongoDB Atlas (`mongodb+srv://...`) |
| `DB_NAME` | Nama database, mis. `laporan_stok_sca` |
| `JWT_SECRET` | Kunci tanda tangan JWT — buat dengan `openssl rand -hex 32` |

Opsional (punya nilai default, dipakai saat seed pertama):

| Key | Default |
| --- | --- |
| `SUPERADMIN_USERNAME` | `Jeffsca` |
| `SUPERADMIN_PASSWORD` | `jeff3131` |
| `TEMP_ACCESS_PASSWORD` | `superadminsementara` |
| `OWNER_EMAIL` | *(kosong)* |
| `NEXT_PUBLIC_API_BASE` | `/api` (isi hanya bila API dipisah dari frontend) |

Contoh lengkap ada di `.env.example`. **File `.env` tidak pernah di-commit.**

---

## Menjalankan di lokal

```bash
cp .env.example .env.local        # isi MONGO_URL, DB_NAME, JWT_SECRET
yarn install
yarn dev                          # http://localhost:3000
```

Superadmin & password akses **dibuat otomatis** saat request API pertama.
Untuk seed manual (mis. menyiapkan Atlas dari lokal):

```bash
yarn seed
```

Perintah lain:

```bash
yarn build     # production build (dipakai Vercel)
yarn serve     # jalankan hasil build
```

---

## Deploy ke Vercel

1. Push repo ke GitHub.
2. Vercel → **Add New Project** → import repo ini.
3. **Root Directory: biarkan `./`** (default, tidak perlu diubah).
   Framework otomatis terdeteksi sebagai **Next.js**, build command `yarn build`.
4. Tambahkan Environment Variables untuk **Production** dan **Preview**:
   `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `SUPERADMIN_USERNAME`,
   `SUPERADMIN_PASSWORD`, `TEMP_ACCESS_PASSWORD`.
5. MongoDB Atlas → **Network Access** → izinkan `0.0.0.0/0`
   (IP function Vercel dinamis, tidak bisa di-whitelist satu-satu).
6. **Deploy.** Buka domainnya, login dengan kredensial superadmin.

### Checklist produksi

- [ ] `JWT_SECRET` acak dan **berbeda** dari yang dipakai saat development.
- [ ] `SUPERADMIN_PASSWORD` bukan nilai default.
- [ ] Password user MongoDB Atlas kuat (bukan sama dengan username).
- [ ] `TEMP_ACCESS_PASSWORD` diganti, lalu bisa diubah lagi kapan pun dari
      menu **Log & User → Password Akses** tanpa perlu redeploy.

---

## Referensi API

Semua endpoint diawali `/api`. Autentikasi memakai cookie httpOnly
**atau** header `Authorization: Bearer <token>`.

| Method | Endpoint | Akses |
| --- | --- | --- |
| GET | `/health` | publik |
| POST | `/auth/login` | publik |
| POST | `/auth/logout` | login |
| GET | `/auth/me` | login |
| POST | `/auth/verify-temp-password` | login |
| GET · POST | `/{type}/mutations` | login |
| PUT · DELETE | `/{type}/mutations/{id}` | pemilik hari itu / superadmin |
| GET | `/{type}/jenis` | login |
| GET | `/dashboard` | login *(nominal hanya untuk superadmin)* |
| GET | `/reports/stock` | login |
| GET | `/reports/detail?start=&end=` | section |
| GET | `/logs/activity` · `/logs/audit` | section |
| GET · POST | `/users` | superadmin |
| DELETE | `/users/{id}` | superadmin |
| PATCH | `/users/{id}/toggle` | superadmin |
| POST | `/settings/temp-password` | superadmin |
| POST | `/year/close` | section |
| GET | `/pdf/{kind}` | login / section |

`{type}` = `paper` · `ink` · `other`
`{kind}` = `paper-mutations` · `ink-mutations` · `other-mutations` · `stock-ringkas` · `detail` · `stock-nominal`

Keterangan akses: **login** = perlu token · **section** = superadmin, atau role lain
dengan header `X-Section-Password` yang benar · **superadmin** = khusus superadmin.

Error selalu dikembalikan sebagai `{ "detail": "pesan dalam Bahasa Indonesia" }`.

---

## Testing

```bash
bash tests/test_core.sh
```

47 skenario end-to-end: login & guard token, CRUD ketiga jenis mutasi, validasi
stok tidak cukup, retur beserta referensi, filter & pencarian, dashboard,
laporan stok & detail, log, CRUD user, proteksi section per role, 6 laporan PDF,
ubah password akses, dan tutup tahun.

Status terakhir: **47/47 PASS**, `yarn build` sukses, testing agent melaporkan
backend 44/44 dan seluruh alur UI utama berjalan normal tanpa bug kritis.

---

## Catatan preview Emergent

Ingress preview Emergent mengarahkan semua request `/api/*` ke port **8001**,
sedangkan Next.js berjalan di port **3000**. Karena itu `backend/server.py`
hanya berisi reverse proxy tipis (`/api/*` → `localhost:3000/api/*`).

Di Vercel proxy ini **tidak dipakai** — Next.js melayani `/api/*` secara native.
