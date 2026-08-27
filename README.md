# SCA PORTAL — Sistem Terpadu Percetakan SCA

Portal internal terpadu untuk **Percetakan SCA (Sinar Cetak Anugerah)** yang menggabungkan
**tiga tool operasional** dalam satu aplikasi Next.js 15 (App Router):

| Tool | Fungsi | Akses |
| --- | --- | --- |
| 📦 **Laporan Stok SCA** | Mutasi & laporan stok Kertas / Tinta / Lain-lain | Superadmin + Admin/PIC (kecuali Laporan Detail) |
| 🧮 **Kalkulator HPP** | Perhitungan Harga Pokok Produksi (14 modul biaya) + PDF quotation | **Superadmin only** |
| 📋 **Tracking PO** | Pelacakan Purchase Order 11 tahapan produksi + jadwal + foto bukti | Superadmin + Admin/PIC |

Antarmuka Bahasa Indonesia (opsi Inggris untuk PO Tracker), responsive, dark/light mode,
siap deploy langsung ke **Vercel**.

---

## 1. Overview Project

**Latar belakang.** Sebelumnya tiap tool berjalan sebagai proyek terpisah dengan stack
berbeda-beda (React CRA + FastAPI, backend Python + JavaScript campur). Untuk memudahkan
operasional harian tim Percetakan SCA, ketiganya digabung menjadi **satu aplikasi single
deployable** dengan:

- **Satu portal login** dengan role-based access (Superadmin vs Admin/PIC)
- **Satu database MongoDB Atlas** yang berisi seluruh koleksi (mutasi stok, kalkulasi HPP,
  PO, jadwal, file metadata, log audit & aktivitas, user)
- **Satu sidebar terpadu** yang menampilkan menu sesuai role user yang login
- **Satu credit deployment** di Vercel (bukan tiga project terpisah)

**Alur pengguna singkat.**

```
1. User buka /login → pilih role (Superadmin / Admin-PIC) → input username & password.
2. Sistem verifikasi:
   - kredensial cocok DI DB
   - role yang dipilih SAMA dengan record DB (kalau beda → ditolak)
3. Setelah login → sidebar menampilkan menu sesuai role.
4. Aktivitas dicatat di activity_logs (login/logout) dan audit_logs (edit/hapus data).
5. Auto-logout setelah 60 menit tanpa aktivitas.
```

**Aturan bisnis lintas-tool.**

- Stok tidak boleh negatif (transaksi Keluar/OUT ditolak bila melebihi stok tersedia).
- Nominal stok dihitung dengan **weighted average** dari harga masuk.
- Setiap tahap PO Tracker punya panel input berbeda + boleh unggah foto bukti (Cloudflare R2).
- Kalkulator HPP menyimpan snapshot input & hasil sehingga bisa dibuka ulang & di-edit.

---

## 2. Tech Stack

| Layer | Teknologi | Versi | Peran |
| --- | --- | --- | --- |
| **Frontend Framework** | React | 19 | Component-based UI |
| **Full-Stack Framework** | Next.js (App Router) | 15 | SSR shell, API Routes, routing |
| **Client-side Router** | react-router-dom | 7 | SPA routing di dalam catch-all `[[...slug]]` |
| **UI Library** | shadcn/ui + Radix UI | latest | Komponen dasar (Button, Dialog, Select, dll) |
| **Styling** | Tailwind CSS | 3.4 | Utility-first + `@layer base` untuk theme tokens |
| **Icons** | lucide-react | latest | Icon set konsisten |
| **Animation** | framer-motion | latest | Motion transitions di HPP kalkulator |
| **Notifikasi** | sonner | latest | Toast global (top-right) |
| **Charts** | recharts | latest | Grafik tren stok bulanan |
| **Backend Runtime** | Next.js API Routes (`nodejs`) | — | Semua endpoint di `app/api/**/route.js` |
| **Legacy Proxy (dev only)** | FastAPI + Uvicorn | — | `backend/server.py` hanya untuk supervisor preview di container dev. **Vercel production TIDAK memakainya.** |
| **Database** | MongoDB Atlas | 6.x driver | Cluster free-tier, connection cached per lambda |
| **ODM/Driver** | `mongodb` (native) | 6.x | Motor manual (tanpa Mongoose) supaya cold-start cepat |
| **Auth** | JWT (`jose`) HS256 + httpOnly cookie | — | 12 jam TTL, `secure=true` `sameSite=none` |
| **Password Hashing** | `bcryptjs` | latest | 10 rounds |
| **Object Storage** | **Cloudflare R2** via `@aws-sdk/client-s3` | v3 | Foto bukti tahap PO Tracker. Serve via URL public R2 (`pub-xxx.r2.dev`) — CDN edge Cloudflare. |
| **PDF Generation** | `pdf-lib` | latest | Quotation HPP + Rekap PO landscape |
| **Package Manager** | Yarn | 1.22 | Frozen lockfile untuk reproducibility |
| **Deployment** | **Vercel** | — | Serverless functions + edge network |
| **Node.js** | ≥ 20 | — | Runtime target |

### Kenapa **bukan** FastAPI di production?

Awalnya HPP System & PO Tracker punya backend FastAPI (Python). Setelah merge:

- **Vercel serverless function tidak natively support Python** dengan cold-start cepat + koneksi MongoDB persistent. Node.js jauh lebih ringan di serverless.
- Semua endpoint di-port ulang jadi **Next.js API Routes** (JavaScript) yang berjalan di same lambda dengan frontend → **satu deploy, satu domain, satu env**.
- File `backend/server.py` (FastAPI) yang tersisa hanya dipakai oleh Supervisor di container preview Emergent untuk mem-proxy `/api/*` → `localhost:3000`. **Tidak ikut ke production Vercel.**

---

## 3. Folder Structure

```
/                                    ← ROOT (Next.js 15 App Router)
├── app/                             ← Next.js App Router (routing + API endpoints)
│   ├── layout.js                    ← Root layout (fonts + wrapper)
│   ├── [[...slug]]/                 ← Catch-all: semua non-/api → React SPA
│   │   └── page.js                  ← Bootstrap ClientApp (SPA shell)
│   └── api/                         ← Backend endpoints (Next.js Route Handlers, runtime=nodejs)
│       │
│       ├── auth/                    ── AUTHENTICATION
│       │   ├── login/               ← POST: verifikasi username+password+role
│       │   ├── logout/              ← POST: revoke session
│       │   ├── me/                  ← GET: user aktif dari cookie
│       │   └── verify-temp-password/← POST: unlock section (Laporan Detail, Log & User, Tutup Tahun)
│       │
│       ├── users/                   ── USER MANAGEMENT (Superadmin only)
│       │   ├── route.js             ← GET list, POST create user baru (dengan role)
│       │   └── [id]/route.js        ← PUT update, DELETE, POST reset-password
│       │
│       ├── paper|ink|other/         ── STOK MUTATIONS
│       │   ├── mutations/route.js   ← GET list dgn filter, POST create mutasi
│       │   └── [id]/route.js        ← PUT/DELETE mutasi
│       │
│       ├── dashboard/               ── Ringkasan stok + tren + mutasi terbaru
│       ├── reports/                 ── Laporan Stok + Detail
│       ├── logs/                    ── Activity log & Audit log
│       ├── settings/                ── Temp password setter
│       ├── year/close/              ── Tutup tahun (reset mutasi)
│       ├── pdf/[kind]/              ── PDF export Laporan Stok/Detail
│       │
│       ├── hpp/                     ── KALKULATOR HPP (Superadmin only)
│       │   ├── calculations/        ← GET list, POST save
│       │   │   └── [id]/            ← GET, PUT, DELETE per kalkulasi
│       │   └── pdf/                 ← POST: PDF Quotation (pdf-lib)
│       │
│       └── po/                      ── PO TRACKER (Superadmin + Admin/PIC)
│           ├── pos/                 ← GET list (search+filter+month), POST create
│           │   ├── [id]/            ← GET (with computed status), PUT, DELETE
│           │   │   ├── stages/[num]/       ← POST: update stage_data
│           │   │   │   └── photo/          ← POST upload → R2, DELETE
│           │   │   │       └── [fileId]/   ← DELETE file
│           │   │   ├── delivery/schedule/  ← POST: jadwal kirim + supir
│           │   │   └── delivery/result/    ← POST: success/failed + fail_reason
│           │   ├── check-conflict/  ← POST: cek overlap est_start/est_end
│           │   └── export/pdf/      ← GET: PDF rekap landscape
│           ├── schedules/           ← Kalender jadwal produksi
│           ├── files/[id]/          ← GET: redirect ke R2 public URL
│           └── dashboard/           ← Counts per bucket
│
├── src/                             ← Source code frontend + server helpers
│   ├── App.js                       ← Root SPA: providers + <BrowserRouter> + routes
│   ├── App.css                      ← Tailwind imports
│   ├── ClientApp.jsx                ← Dynamic-imported shell (SSR-safe)
│   ├── index.css                    ← Theme tokens (light/dark) + global utilities
│   │
│   ├── views/                       ← Halaman-halaman (satu file per route)
│   │   ├── Login.jsx                ← Layar login dgn role dropdown
│   │   ├── Dashboard.jsx            ← Dashboard Stok
│   │   ├── PaperMutations.jsx       ← Mutasi Kertas
│   │   ├── InkMutations.jsx        ← Mutasi Tinta
│   │   ├── OtherMutations.jsx       ← Mutasi Lain
│   │   ├── StockReport.jsx          ← Laporan Stok
│   │   ├── DetailReport.jsx         ← Laporan Detail (locked)
│   │   ├── LogsUsers.jsx            ← Log & User (locked)
│   │   ├── YearClose.jsx            ← Tutup Tahun (locked)
│   │   ├── hpp/                     ── HPP MODULE
│   │   │   └── Calculator.jsx       ← Full kalkulator 14 modul + SummaryPanel
│   │   └── po/                      ── PO MODULE
│   │       ├── PoDashboard.jsx      ← 4 top cards + 14 bucket grid clickable
│   │       ├── PoList.jsx           ← Daftar PO + search + filter + PDF export
│   │       ├── PoForm.jsx           ← Form new/edit + conflict detection
│   │       ├── PoDetail.jsx         ← Detail: stepper + panel per tahap + foto + log
│   │       └── PoCalendar.jsx       ← Kalender bulanan + schedule
│   │
│   ├── components/                  ← Komponen reusable
│   │   ├── AppShell.jsx             ← Sidebar unified + header (lang + theme + user)
│   │   ├── Logo.jsx                 ← Logo SVG SCA
│   │   ├── ThemeToggle.jsx          ← Dark/Light toggle (next-themes)
│   │   ├── MutationForm.jsx         ← Form mutasi Stok (reusable Paper/Ink/Other)
│   │   ├── MutationsTable.jsx       ← Tabel mutasi (dgn edit/delete)
│   │   ├── SectionGate.jsx          ← Wrapper section terkunci (Laporan Detail, dst)
│   │   ├── hpp/                     ── Sub-komponen HPP
│   │   │   ├── fields.jsx           ← Input primitives (NumberInput, SelectInput, dsb)
│   │   │   ├── modules.jsx          ← Definisi 14 modul + ikon + render
│   │   │   └── SummaryPanel.jsx     ← Panel kanan Ringkasan + Laba/Bunga/PPN
│   │   ├── po/                      ── Sub-komponen PO
│   │   │   └── ProductionStepper.jsx← 11-stage visual stepper
│   │   └── ui/                      ← shadcn/ui primitives (Button, Dialog, Select, dst)
│   │
│   ├── context/                     ← React Context providers
│   │   ├── AuthContext.jsx          ← user, login, logout, sectionUnlocked, perms{}
│   │   └── LangContext.jsx          ← lang, setLang, t(key), stageName(n) — ID/EN
│   │
│   ├── lib/                         ← Utility client-side
│   │   ├── api.js                   ← Axios instance + interceptor (attach cookie/token)
│   │   ├── format.js                ← formatRp, formatNumber, fmtDate, dst
│   │   ├── hppCalc.js               ← Rumus kalkulasi 14 modul HPP
│   │   ├── hppRefData.js            ← DB kertas / mesin / CTP / finishing / lem
│   │   ├── hppDefaults.js           ← State default & empty state kalkulator
│   │   ├── hppApi.js                ← Client wrapper: listCalculations, saveCalc, exportHppPdf
│   │   ├── poStages.js              ← STAGE_NAMES + BUCKET_META (warna & label bucket)
│   │   ├── poApi.js                 ← Client wrapper PO: listPos, updateStage, uploadPhoto, dst
│   │   └── utils.js                 ← cn() dari clsx + tailwind-merge
│   │
│   └── server/                      ← Server-side helpers (dipakai API routes)
│       ├── mongo.js                 ← getDb() dgn cached client + COL constants
│       ├── http.js                  ← handle(), json(), pdfResponse(), HttpError
│       ├── init.js                  ← ensureInit(): bikin indexes + seed superadmin
│       ├── auth.js                  ← JWT sign/verify, requireAuth, requireSuperadmin
│       ├── r2.js                    ← Cloudflare R2 client (S3 SDK) + publicUrlFor
│       ├── stock.js                 ← Weighted average + stock calculation helper
│       ├── mutations.js             ← CRUD mutations + validation
│       ├── reports.js               ← Aggregation helpers untuk laporan
│       ├── pdf/                     ── PDF generators
│       │   ├── stokPdf.js           ← PDF Laporan Stok
│       │   ├── detailPdf.js         ← PDF Laporan Detail
│       │   ├── hppPdf.js            ← PDF Quotation HPP (14 modul)
│       │   └── poPdf.js             ← PDF Rekap PO (landscape, group per bulan)
│       └── po/
│           └── stages.js            ← STAGE_NAMES + computeStatus() + rangesOverlap()
│
├── backend/                         ── DEV-ONLY: FastAPI reverse proxy untuk container preview
│   ├── server.py                    ← Proxy /api/* ke localhost:3000 (Next.js)
│   └── requirements.txt             ← fastapi + httpx + uvicorn
│
├── public/                          ← Static assets (favicon, logo)
├── memory/
│   └── PRD.md                       ← Product Requirements Document
├── plan.md                          ← Development plan history
├── .env.example                     ← Template env vars (copy ke .env di Vercel)
├── next.config.js                   ← Config Next.js (dev origins, CORS)
├── tailwind.config.js               ← Config Tailwind (design tokens + fonts)
├── jsconfig.json                    ← Alias @/* → src/*
├── vercel.json                      ← Config deploy Vercel
├── package.json                     ← Yarn dependencies + scripts
└── yarn.lock                        ← Locked versions
```

---

## 4. Data Flow

Semua request ikuti alur berikut. Tidak ada mixing (mis. Node.js call ke Python) — semua
lintasan **frontend → API route → MongoDB / R2**.

### 4.1 Alur Read (contoh: list PO)

```
Browser (React SPA)
   │
   │  1. User klik menu "Daftar PO" → react-router push /po/pos
   │     Komponen <PoList/> mount, call:
   │     api.get("/po/pos", { params: { search, bucket, month } })
   ▼
Next.js API Route  ── app/api/po/pos/route.js  ──────────────────────────
   │
   │  2. requireAuth(req) → validasi JWT httpOnly cookie
   │     - jose.jwtVerify() dgn JWT_SECRET
   │     - fetch user dari MongoDB (via getDb())
   │  3. Ambil rows dari COL.pos (limit 2000, sorted created_at desc)
   │  4. Map tiap doc → enrichPo() → tambahkan computed.bucket & current_stage
   │  5. Filter sesuai search/bucket/month
   ▼
MongoDB Atlas  ── laporan_stok_sca DB ────────────────────────────────────
   │
   │  6. Query `pos` collection
   │  7. Return arrays of documents
   ▼
Response JSON  ← [{id, po_number, client_name, computed:{...}, ...}, ...]
   │
   ▼
Browser
   │  8. setState(pos) → render <Card/> tiap PO dgn bucket color
```

### 4.2 Alur Write dengan side-effects (contoh: upload foto stage PO)

```
Browser
   │
   │  1. User klik "Upload" di panel stage → pilih file
   │     PoDetail.jsx call:
   │     api.post(`/po/pos/${id}/stages/${num}/photo`, formData)
   │
   ▼
Next.js API Route  ── app/api/po/pos/[id]/stages/[num]/photo/route.js ────
   │
   │  2. requireAuth(req) → user aktif
   │  3. Parse multipart FormData → dapat file
   │  4. Baca buffer + validasi ukuran/type
   │  5. Generate fileId (crypto.randomUUID)
   │  6. Key = `sca-production/uploads/{poId}/{fileId}.{ext}`
   │
   ├──► Cloudflare R2  ── S3Client.putObject() ──────────────────────────
   │       Bucket: sca-po-photos
   │       Body: buffer, ContentType: file.type
   │       └─► publicUrl = https://pub-xxx.r2.dev/{key}   (CDN Cloudflare edge)
   │
   ├──► MongoDB
   │       INSERT po_files: { id, po_id, stage_number, r2_key, public_url, ... }
   │       UPDATE pos.stage_data.{num}.photos: push { id, filename, url }
   │
   ▼
Response JSON  ← { id, filename, url: "https://pub-xxx.r2.dev/..." }
   │
   ▼
Browser
   │  7. toast.success + reload() → tampilkan thumbnail dari public URL
   │     <img src={p.url} /> — di-fetch langsung dari R2 CDN, TIDAK lewat lambda lagi
```

### 4.3 Autentikasi lengkap

```
       ┌──────────────────────────────────────────────────────────────┐
       │  LOGIN                                                       │
       │                                                              │
       │  Browser: POST /api/auth/login                              │
       │           { username, password, role }                       │
       │                                                              │
       │  Route:   1. findOne({ username })                           │
       │           2. bcrypt.compareSync(password, hash) → true       │
       │           3. user.role === role → true  (KALAU SALAH → 401)  │
       │           4. INSERT activity_logs { user, login_time }       │
       │           5. sid = randomUUID()                              │
       │           6. token = jose.SignJWT({ sub:id, role, sid })     │
       │              .setExpirationTime("12h").sign(secret)          │
       │           7. Set-Cookie: access_token=... HttpOnly Secure    │
       │                                                              │
       │  Response: 200 { id, name, username, role, token }           │
       │                                                              │
       └──────────────────────────────────────────────────────────────┘

       ┌──────────────────────────────────────────────────────────────┐
       │  PROTECTED REQUEST                                           │
       │                                                              │
       │  Browser: GET /api/hpp/calculations                          │
       │           Cookie: access_token=eyJhbGci...                   │
       │                                                              │
       │  Route:   requireSuperadmin(req)                             │
       │             ├─ getCurrentUser(req)                           │
       │             │    ├─ read cookie                              │
       │             │    ├─ jose.jwtVerify(token, secret)            │
       │             │    ├─ findOne({ id: payload.sub })             │
       │             │    ├─ user.active !== false                    │
       │             │    └─ return user                              │
       │             └─ if user.role !== "superadmin" → 403           │
       │                                                              │
       │  Continue: business logic → response                         │
       └──────────────────────────────────────────────────────────────┘
```

### 4.4 Bootstrap DB (auto pada cold start pertama)

```
Cold start lambda #1
    │
    ▼
handle() wraps API route
    │
    ▼
ensureInit()  (dari src/server/init.js) — idempotent, dijalankan sekali per boot
    │
    ├── createIndex users.username (unique)
    ├── createIndex paper/ink/other_mutations.year
    ├── createIndex activity_logs.login_time DESC
    ├── createIndex audit_logs.timestamp DESC
    ├── createIndex hpp_calculations.id (unique), updated_at DESC
    ├── createIndex pos.po_number (unique), pos.id, pos.created_at DESC
    ├── createIndex po_schedules.id, .date, .po_id
    ├── createIndex po_files.id, (po_id, is_deleted)
    │
    ├── if users.findOne({ username: SUPERADMIN_USERNAME }) == null
    │       insertOne({ username, password_hash: bcrypt(pass), role: "superadmin" })
    │
    ├── if password lama beda dari SUPERADMIN_PASSWORD env
    │       updateOne({ $set: { password_hash: bcrypt(newPass) } })
    │
    └── if settings.findOne({ key: "temp_password" }) == null
            insertOne({ key: "temp_password", hash: bcrypt(TEMP_ACCESS_PASSWORD) })
```

---

## 5. Coding Conventions

### 5.1 Penamaan File

| Tipe | Format | Contoh |
| --- | --- | --- |
| Component React | `PascalCase.jsx` | `PoDetail.jsx`, `SummaryPanel.jsx` |
| Halaman (views) | `PascalCase.jsx` | `Login.jsx`, `Dashboard.jsx` |
| Utility client | `camelCase.js` | `hppCalc.js`, `poApi.js`, `format.js` |
| Server helper | `camelCase.js` | `mongo.js`, `auth.js`, `r2.js` |
| API route | `route.js` (fixed name) | `app/api/po/pos/route.js` |
| Dynamic segment | `[param]` folder | `app/api/po/pos/[id]/route.js` |
| Catch-all | `[[...slug]]` | `app/[[...slug]]/page.js` |
| Konteks React | `XxxContext.jsx` | `AuthContext.jsx`, `LangContext.jsx` |

**Konvensi khusus:**

- Folder tool selalu **lowercase** (`hpp/`, `po/`, `ui/`) di dalam `views/`, `components/`, `lib/`, `server/`.
- Satu **halaman = satu file di `views/`**. Sub-komponen boleh ditaruh di `components/{tool}/`.
- File API route **hanya export HTTP handler** (`GET`, `POST`, `PUT`, `DELETE`), tanpa business logic besar. Logic ditaruh di `src/server/**`.

### 5.2 Penamaan Variabel

| Konteks | Konvensi | Contoh |
| --- | --- | --- |
| Variabel & fungsi biasa | `camelCase` | `const totalStock = 0`, `function computeStatus()` |
| Konstanta global | `SCREAMING_SNAKE_CASE` | `const STAGE_NAMES = { ... }`, `TOKEN_HOURS = 12` |
| Komponen React | `PascalCase` | `<PoDetail/>`, `<SummaryPanel/>` |
| Nama collection MongoDB | `snake_case` | `paper_mutations`, `po_schedules`, `hpp_calculations` |
| Field MongoDB | `snake_case` | `po_number`, `est_start`, `stage_data`, `created_at` |
| Field response JSON | `snake_case` (samain dgn DB, hindari transformasi) | `created_by_username`, `is_completed` |
| Env variable | `SCREAMING_SNAKE_CASE` | `MONGO_URL`, `R2_BUCKET_NAME` |
| React state | `camelCase` | `const [pos, setPos] = useState([])` |
| Boolean state / prop | prefix `is`/`can`/`has` | `isSuperadmin`, `canHpp`, `hasConflict` |

### 5.3 Style Coding

**Import order** (dipisah dgn blank line):

```javascript
// 1. External libs
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// 2. Internal — server / lib / context
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import * as api from "@/lib/poApi";

// 3. Components
import { Button } from "@/components/ui/button";
import ProductionStepper from "@/components/po/ProductionStepper";
```

**Alias:** selalu pakai `@/` (dipetakan ke `src/*` via `jsconfig.json`).
❌ `import x from "../../../lib/format"`
✅ `import x from "@/lib/format"`

**Async / error handling** di komponen React:

```javascript
const doSave = async () => {
  try {
    await api.savePo(payload);
    toast.success("Tersimpan");
  } catch (e) {
    toast.error(e?.response?.data?.detail || "Gagal simpan");
  }
};
```

Di API route pakai wrapper `handle()`:

```javascript
export const POST = handle(async (req) => {
  const user = await requireAuth(req);       // throws HttpError(401/403)
  const body = await readJson(req);           // validation
  if (!body.foo) throw new HttpError(400, "foo wajib");
  const result = await businessLogic(body);
  return json(result);                        // otomatis 200 + JSON
});
```

**Data fetching (React):**

- Selalu pakai axios instance `@/lib/api` (bukan `fetch` langsung) — sudah include `withCredentials`.
- Simpan token juga di `localStorage` (`sca_token`, `stokku_token`) sebagai fallback untuk `Authorization: Bearer …` bila cookie diblokir.
- Loading & error state **wajib** (jangan biarkan UI kosong).

**Testid untuk elemen interaktif** (untuk QA & E2E test):

```jsx
<Button data-testid="po-save" onClick={submit}>Simpan</Button>
<Input data-testid="login-username" ... />
```

**Tailwind — kelas panjang** boleh multi-line dengan template literal + `cn()` helper:

```jsx
import { cn } from "@/lib/utils";

<div className={cn(
  "flex items-center gap-3 rounded-xl border p-3 transition-colors",
  isActive ? "border-primary bg-accent" : "border-border hover:bg-accent/50"
)} />
```

**Design tokens** — jangan hardcode warna:

```jsx
// ❌ jangan
<div className="bg-white text-black" />

// ✅ pakai tokens (light/dark responsive)
<div className="bg-background text-foreground" />
<div className="bg-card text-card-foreground" />
<Button className="bg-primary text-primary-foreground" />
```

**Bahasa & format:**

- UI Bahasa Indonesia (opsi Inggris untuk PO Tracker via `LangContext`).
- Nominal Rupiah: `formatRp(v)` — hasil `"Rp 12.345"`.
- Tanggal: `fmtDate("2026-01-15")` → `"15-01-2026"`. Datetime: `fmtDateTime(iso)`.
- Angka biasa: `formatNumber(v, digits)`.

**Kode server — hindari:**

- Sync file I/O di dalam handler (blocking lambda).
- Loop `n+1` query — gunakan `find({ ... }).toArray()` sekali.
- Import langsung dari `@/lib/**` (client-side) di dalam `src/server/**`. Server-only helper cukup import dari `@/server/**`.

**Kode client — hindari:**

- Import `mongodb`, `bcryptjs`, atau apapun Node.js-only di komponen React.
- Simpan token / password di `localStorage` tanpa enkripsi (kecuali JWT yg memang ditujukan untuk itu).

### 5.4 Git & Branching

- **Branch main** = production (auto-deploy ke Vercel).
- Fitur/perbaikan besar → branch `feat/<nama-fitur>` atau `fix/<nama-bug>` → PR ke `main`.
- Refactor / dokumentasi → branch `refactor/…` atau `docs/…`.
- Commit message pakai Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
- Body commit boleh multi-baris menjelaskan **apa** yang berubah dan **kenapa**.

Contoh:

```
feat: tambah upload foto multi-file di stage PO

- Support upload beberapa foto sekaligus (drag & drop)
- Progress bar per file di UI
- Backend menerima file[] array
```

---

## Setup Cepat

### Prasyarat
- Node.js ≥ 20
- Yarn 1.22
- Akses MongoDB Atlas
- (Opsional untuk foto PO) Cloudflare R2 API Token dengan permission **Object Read & Write**

### Instalasi lokal

```bash
git clone https://github.com/ClientSca7452/ClientscaStock.git
cd ClientscaStock
yarn install
cp .env.example .env.local
# edit .env.local — isi MONGO_URL, JWT_SECRET, R2_*, dst
yarn dev
```

Aplikasi jalan di `http://localhost:3000`. Login default `Jeffsca / jeff3131` (superadmin) —
**GANTI di produksi**.

### Deploy ke Vercel

1. Import repo di Vercel Dashboard.
2. Framework preset: **Next.js** (auto-detected).
3. Environment Variables (Production + Preview): salin semua dari `.env.example` dan isi.
4. Deploy → dapat URL production `https://<project>.vercel.app`.
5. First request akan trigger `ensureInit()` (bikin indexes + seed superadmin).

**Environment variables:**

| Nama | Wajib | Contoh |
| --- | :---: | --- |
| `MONGO_URL` | ✅ | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/?...` |
| `DB_NAME` | ✅ | `laporan_stok_sca` |
| `JWT_SECRET` | ✅ | `openssl rand -hex 32` |
| `SUPERADMIN_USERNAME` | ✅ | `Jeffsca` |
| `SUPERADMIN_PASSWORD` | ✅ | (pilih kuat, min 12 char) |
| `TEMP_ACCESS_PASSWORD` | ✅ | (untuk unlock section terkunci Admin/PIC) |
| `OWNER_EMAIL` | — | `owner@example.com` |
| `R2_ACCOUNT_ID` | ✅¹ | 32-char hex |
| `R2_ACCESS_KEY_ID` | ✅¹ | 32-char hex |
| `R2_SECRET_ACCESS_KEY` | ✅¹ | 64-char hex |
| `R2_BUCKET_NAME` | ✅¹ | `sca-po-photos` |
| `R2_PUBLIC_URL` | ✅¹ | `https://pub-xxx.r2.dev` |

¹ Wajib bila upload foto PO Tracker mau dipakai. Kalau di-skip, endpoint upload akan error tapi seluruh app lain tetap jalan.

---

## Testing

- **Unit / API test**: `backend_test.py` (curl-style, dapat dijalankan `python backend_test.py`).
- **Manual browser test**: preview URL / staging.
- **Smoke test cold start**: hit `GET /api/health` → 200.

---

## Lisensi

Internal — Percetakan SCA. Tidak untuk distribusi publik.
