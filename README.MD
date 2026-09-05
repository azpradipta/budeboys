# Healthalk - From Symptoms to Treatment

> **From what you feel to what your doctor needs, connected in one health journey.**

Healthalk adalah sistem berbasis AI yang membantu pengguna melewati perjalanan kesehatan secara lebih terstruktur, mulai dari menceritakan keluhan, mendapatkan informasi kesehatan berbasis penelitian, membawa ringkasan kondisi ke dokter, hingga memahami resep dan obat setelah konsultasi.

Healthalk menjaga informasi tetap terhubung dari satu tahap ke tahap berikutnya, sehingga pengguna tidak harus memulai kembali dari awal setiap kali berpindah proses.

---

## The Problem

Ketika seseorang mengalami masalah kesehatan, perjalanan mereka sering terpecah menjadi beberapa bagian.

```text
Merasa tidak enak badan
        ↓
Mencari informasi sendiri
        ↓
Bertanya ke AI / Internet
        ↓
Pergi ke dokter
        ↓
Menerima resep
        ↓
Mencari tahu sendiri obatnya
```

---

## Menjalankan

```bash
npm install
cp .env.example .env.local   # isi kredensial Supabase, Healthify, OpenAI
npm run dev
```

Semua integrasi eksternal punya fallback lokal, jadi aplikasi tetap jalan
walau Healthify atau OpenAI belum dikonfigurasi.

## Dokumentasi API

Spesifikasi OpenAPI 3.1 didefinisikan di [`lib/openapi.ts`](lib/openapi.ts)
dan disajikan lewat dua endpoint:

| Endpoint       | Isi                                              |
| -------------- | ------------------------------------------------ |
| `/docs`        | Referensi API interaktif (Scalar)                |
| `/api/openapi` | Dokumen OpenAPI mentah dalam JSON                |

Menambah atau mengubah endpoint berarti memperbarui `lib/openapi.ts` juga,
karena spec ditulis manual dan tidak di-generate dari kode.
