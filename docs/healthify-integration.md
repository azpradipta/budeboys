# Integrasi Healthify Intelligence API

Fitur konsultasi (Fase 1) dilandasi **Healthify Intelligence API**, RAG di atas
literatur jurnal peer-reviewed dengan DOI tervalidasi.
Dokumentasi: https://healthify.twenti.studio/docs

## Setup

1. Key berformat `ht_live_xxxxxxxx` didapat lewat tombol **Request API access**
   di halaman dokumentasi, dengan menyertakan deskripsi aplikasi dan perkiraan
   volume request.
2. Key tersebut ditaruh di `.env.local`. Sifatnya server-only, sehingga tidak
   memakai prefiks `NEXT_PUBLIC_`:

   ```
   HEALTHIFY_API_KEY=ht_live_xxxxxxxx
   HEALTHIFY_API_BASE_URL=https://healthify.twenti.studio
   ```

3. Setelah dev server dijalankan ulang, aplikasi otomatis beralih dari fallback
   lokal ke API sungguhan.

Selama key belum diisi, semuanya tetap berfungsi memakai logika berbasis aturan
dan demo KB di `lib/health-ai.ts` dan `lib/kb.ts`.

## Pemetaan route

| Route kita | Memanggil Healthify | Fallback |
|---|---|---|
| `POST /api/consultation/turn` | `POST /api/v1/intelligence/query` (`mode: consultation`, `format: full`) | `generateLocalTurn()` |
| `POST /api/consultation/summary` | `POST /api/v1/intelligence/summary` | `generateSummary()` |

- `lib/server/healthify-client.ts`: HTTP client. Selalu mengembalikan `null`
  saat gagal, tidak pernah throw, agar fallback berjalan mulus.
- `lib/server/healthify-mapping.ts`: satu-satunya tempat yang tahu perbedaan
  nama field Healthify dan milik kita. Kalau bentuk response mereka berubah,
  cukup ubah file ini.
- Id konsultasi kita dipakai langsung sebagai `context.session_id`, sehingga
  akumulasi konteks antar giliran ditangani Healthify di sisi server.

## Aturan dari dokumentasi mereka yang kita patuhi

- **Tautan `https://doi.org/{doi}` tidak pernah disusun sendiri.** Sumber baru
  ditampilkan bila Healthify mengembalikan `url` yang tervalidasi.
- **`notice`, `has_evidence: false`, dan safety flag** dipetakan ke `RiskLevel`,
  `insufficientEvidence`, dan teks respons darurat kita.
- **Latensi 2-10 detik.** Route turn menunggunya langsung, dan UI sudah
  menampilkan status "sedang berpikir" selama itu.
- **Rate limit 60 request per menit per key, dipakai bersama semua pengguna.**
  Karena itu `/api/consultation/*` mewajibkan login.
