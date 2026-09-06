# Anatomi Mesin ragai

Dokumen ini menjelaskan **mesin** di balik RAG API, bukan cara memanggilnya.
Untuk sisi pemanggil lihat [rag-integration.md](rag-integration.md).

Disusun dari pembacaan langsung kode `ragai-tools`: 37 berkas, 7.056 baris.
Setiap angka dan ambang di bawah diambil dari sumbernya.

| | |
|---|---|
| Berkas Python | 37 |
| Baris kode | 7.056 |
| Dependensi non-stdlib | 2 (`django`, `requests`) |
| Tahap pipeline | 10 |
| Dimensi embedding | 768 |
| Framework RAG | tidak ada |

---

## 1. Apa ini, dan di mana letaknya

ragai adalah pustaka Python berdiri sendiri, bukan bagian dari aplikasi
Next.js dan bukan pula layanan web. Ia mesin yang ditanam di dalam aplikasi
Django induk.

```
Healthalk (Next.js)
  └─ lib/server/rag-client.ts
       └─ POST https://ragai.twenti.studio        ← RAG_API_KEY
            └─ aplikasi Django induk
                 └─ ragai.process(payload)        ← mesinnya di sini
```

API publiknya hanya tiga: `ragai.process()`, `ragai.version()`, dan
`ragai.runtime.configure()`.

### Cara menempel pada induk

Engine tidak pernah mengimpor aplikasi induk. Ia menyebutkan peran yang
dibutuhkannya, lalu induk mendaftarkan kelas konkretnya saat start:

```python
runtime.configure(models={...}, services={...}, config={...})

# wajib
JournalArticle · Source · ClaimSource
ConversationSession · ConversationMessage · ConsultationSummary

# opsional
translate · embed_article · training_scripts_dir · training_modules_available
```

Tanpa `translate`, kosakata di luar leksikon tidak terjangkau. Tanpa
`embed_article`, jurnal baru hanya ditemukan lewat kata kunci. Engine tetap
berjalan, hanya kehilangan sebagian kemampuan.

---

## 2. Alur satu permintaan

Sepuluh tahap berurutan. Gerbang di antara tahap 6 dan 7 adalah yang
membedakan sistem ini dari RAG pada umumnya: ia bisa menghentikan seluruh
proses sebelum LLM tersentuh.

| # | Tahap | Keterangan |
|---|---|---|
| 1 | Conversation context | Riwayat sesi + health context kumulatif. Snapshot kosong berarti pembahasan berpindah penyakit, bukan riwayat hilang |
| 2 | Query understanding | Menentukan intent dari 8 jenis. Rule + leksikon, tanpa LLM |
| 3 | Health context | Ekstraksi regex + leksikon. Field yang tidak disebut tetap kosong |
| 4 | Evidence retrieval | Hibrida leksikal + semantik atas tiga sumber |
| 5 | Validation & selection | Verifikasi DOI anti-404, buang sumber karangan, tetapkan status |
| 6 | Reasoning | LLM merangkai kalimat dari bukti yang lolos |
| **⊘** | **Gerbang kecukupan** | **< 2 bukti, atau skor teratas < 0,55, atau aspek tak terjawab → LLM tidak dipanggil sama sekali** |
| 7 | Claim provenance | Tiap kalimat faktual dipetakan balik ke buktinya, secara leksikal |
| 8 | Safety layer | PASS / MODIFY / BLOCK |
| 9 | Preliminary assessment | Penilaian awal, bukan diagnosis |
| 10 | Persist & respond | Simpan giliran, kembalikan `IntelligenceResponse` |

**Intent** (8): `CLAIM_VERIFICATION`, `HEALTH_INFORMATION`, `SYMPTOM_CONTEXT`,
`FOLLOW_UP`, `MEDICATION_INFORMATION`, `GENERAL_HEALTH`, `SMALL_TALK`,
`UNSUPPORTED`.

**Mode** (4): `claim`, `consultation`, `information`, `medication`.

---

## 3. Retrieval hibrida

Dua ukuran yang buta pada hal berbeda, digabung supaya saling menutupi.

### Leksikal

Pencocokan kata harfiah. Cepat dan tepat, tapi buta makna. Satu *kelompok
istilah* adalah himpunan varian dwibahasa yang dihitung sekali; cukup salah
satu cocok, dan bobotnya diambil dari varian terpanjang.

```
# kecocokan terbaik per kelompok
judul     → 3.0
keywords  → 2.0
abstrak   → 1.0
tidak ada → 0.0

skor = Σ(bobot × hit) / (Σbobot × 3.0)      → 0..1
```

### Semantik

Cosine antar teks kesehatan selalu tinggi, jadi angka mentahnya tidak
informatif. Yang bermakna adalah jaraknya dari lantai:

```
sim ≤ 0.35  → 0.0
sim > 0.35  → (sim − 0.35) / (1 − 0.35)

# 0,33 → 0.00     0,50 → 0.23     0,65 → 0.46
```

### Penggabungan

```
tanpa embedding           → skor = leksikal
ada embedding, sim ≤ 0.35 → skor = leksikal × 0.65      ← ditahan
selain itu                → skor = max(leksikal,
                                       0.5·leksikal + 0.5·semantik)
```

`max()` berarti penggabungan hanya bisa menaikkan, tidak pernah menurunkan.
Penalti 0,65 menandai dokumen yang cuma berbagi kata kunci tanpa dukungan
makna: boleh muncul sebagai bukti terbatas, tidak cukup untuk dinyatakan
memadai.

### Embedding asimetris

Pertanyaan dan dokumen **tidak diperlakukan sama**. Dokumen di-embed apa
adanya; query diperkaya dulu dengan padanan Inggris tiap konsep. Alasannya
terukur dan tercatat di kode:

> Meng-embed kalimat Indonesia mentah menghasilkan kemiripan rendah dan
> nyaris seragam — pertanyaan yang ada jawabannya dan yang tidak, sama-sama
> di sekitar 0,33. Sinyal semantiknya tidak bisa membedakan keduanya sampai
> query diperluas ke Bahasa Inggris.

### Tiga sumber kandidat

| Sumber | Isi | Origin |
|---|---|---|
| `JournalArticle` | Basis pengetahuan jurnal kurasi admin | `KNOWLEDGE_BASE` |
| `Source` | Sumber yang tertaut ke klaim terverifikasi | `KNOWLEDGE_BASE` |
| Indeks pgvector | Dari pipeline training, opsional | `VECTOR_INDEX` |

Maksimal **500 kandidat** diskor per permintaan. Pemotongan berdasarkan
tanggal sengaja dihindari, sebab itu membuat kebaruan jadi proksi relevansi.

---

## 4. Re-ranking

Retrieval menjawab *mana yang layak dilihat*. Re-ranking menjawab *mana yang
benar-benar jawabannya*, dengan sinyal yang tidak dilihat retrieval.

| Dimensi | Bobot | Diukur dari |
|---|---|---|
| `semantic_relevance` | 0.45 | Cosine terkalibrasi terhadap query yang diperluas |
| `source_quality` | 0.15 | Prefix DOI penerbit (NEJM, BMJ, Nature, Cochrane, Elsevier) |
| `evidence_type` | 0.15 | Hierarki bukti: meta-analisis > RCT > observasional |
| `context_match` | 0.15 | Gejala dan obat yang pengguna sebut sendiri |
| `publication_recency` | 0.10 | Tahun terbit |

```
skor = Σ(bobot × dimensi) / Σbobot
skor = skor × (0.45 + 0.55 × aspek)      ← pengali, bukan penambah
```

Baris kedua yang tajam. **Aspek adalah pengali**, jadi paper tentang penyakit
yang benar tapi membahas aspek yang salah kehilangan sampai 55% skornya:

```
Pertanyaan: "apa gejala demam berdarah"

"Clinical Manifestations of Dengue Fever"
   leksikal tinggi · aspek gejala terpenuhi   → pengali 1.00

"Dengue Vaccine Efficacy Trial"
   leksikal tinggi · aspek gejala nihil       → pengali 0.45
```

Ada pula gerbang fokus judul: dokumen yang judulnya jelas membahas topik lain
langsung jatuh ke **0,25**, berapa pun skor kata kuncinya. Menurunkan bobotnya
saja tidak cukup — pembaca tetap membuka paper yang tidak nyambung, dan itulah
keluhan yang paling merusak kepercayaan.

---

## 5. Gerbang kecukupan bukti

Keputusan produk, bukan keterbatasan teknis.

| Ambang | Nilai | Artinya |
|---|---|---|
| `MIN_ITEMS_SUFFICIENT` | 2 | Satu paper saja tidak pernah cukup |
| `MIN_TOP_SCORE_SUFFICIENT` | 0.55 | Bukti terbaik harus benar-benar kuat |
| `MIN_TOP_SCORE_PARTIAL` | 0.38 | Di bawah ini: tidak memadai |
| `MIN_ASPECT_MATCH_SUFFICIENT` | 0.5 | Harus menjawab aspek yang ditanyakan |
| `MIN_RELEVANCE_PUBLISHABLE` | 0.30 | Di bawah ini tidak layak ditampilkan |
| `MIN_SEMANTIC_RELEVANCE` | 0.25 | Pemisah dokumen yang cuma berbagi kata umum |

Status: `SUFFICIENT` · `PARTIAL` · `INSUFFICIENT_EVIDENCE`.

Pada status ketiga LLM tidak dipanggil sama sekali. Konsistensi kontraknya
dijaga: bukti yang dinyatakan tidak memadai **tidak menerbitkan daftar
sumber**, sebab kalau tidak, jawabannya bertentangan dengan dirinya sendiri.

---

## 6. Integritas bukti

Setiap bukti membawa asal-usulnya, dan asal-usul menentukan apa yang boleh
ditampilkan.

| `EvidenceOrigin` | Boleh tampil | Keterangan |
|---|---|---|
| `KNOWLEDGE_BASE` | ya | Baris nyata di basis data |
| `VECTOR_INDEX` | ya | Indeks pgvector pipeline training |
| `VERIFIED_REGISTRY` | ya | DOI sudah diverifikasi ke registry resmi |
| `USER_SUPPLIED` | ya | Dari dispute atau laporan pengguna |
| `MODEL_SUGGESTED` | **tidak** | Dikarang LLM; kecuali DOI-nya lolos verifikasi, lalu naik jadi `VERIFIED_REGISTRY` |

### Verifikasi tautan berlapis

```
1. DOI Handle System   responseCode 1 = ada · 100 = tidak ditemukan
2. Crossref agency     cadangan bila lapis pertama tak menjawab
3. HEAD, lalu GET      sebagian server menolak HEAD
```

Judul pun ditimpa dengan judul resmi registry: DOI yang terdaftar bisa saja
dipasangkan ke judul paper lain. Delapan validasi berjalan berbarengan, dan
bukti yang dipakai ulang dalam percakapan yang sama tidak diperiksa dua kali.

---

## 7. Grounding dan provenance

Jawaban memakai penanda `[E1]`, `[E2]`. Setelah generation, tiap kalimat
faktual dipetakan balik ke bukti pendukungnya — **secara leksikal, bukan
dengan LLM**. Alasannya tertulis di kodenya: tidak menambah biaya, tidak bisa
mengarang atribusi, dan mudah diuji.

Kalimat yang dihasilkan sistem sendiri (template, peringatan, disclaimer,
ungkapan ketidakpastian) dikecualikan; itu bukan pernyataan medis.

Empat label `Provenance` menempel pada tiap field ringkasan:
`USER_REPORTED`, `AI_INFERRED`, `EVIDENCE_SUPPORTED`, `SYSTEM_GENERATED`.

---

## 8. Safety layer

Berjalan setelah jawaban dihasilkan dan sebelum dikirim keluar. Tujuannya
bukan menjadikan AI seorang dokter, melainkan memastikan keluarannya tidak
melampaui cakupan sistem. Keputusan: `PASS` · `MODIFY` · `BLOCK`.

| Flag | Pemicu |
|---|---|
| `EMERGENCY_SIGNAL` | Tanda kegawatan pada keluhan pengguna |
| `DANGEROUS_INSTRUCTION` | Instruksi berbahaya pada jawaban → **BLOCK** |
| `TREATMENT_RECOMMENDATION_RISK` | Anjuran dosis spesifik → bagian preskriptifnya dibuang |
| `DIAGNOSIS_CERTAINTY` | Bahasa diagnosis pasti → dilunakkan jadi bahasa kemungkinan |
| `OVERCONFIDENT_CLAIM` | Jaminan berlebihan |
| `UNSUPPORTED_MEDICAL_CLAIM` | Tidak satu pun bagian jawaban tertelusur ke bukti |
| `INSUFFICIENT_EVIDENCE` | Bukti tidak cukup |
| `HIGH_RISK_POPULATION` | Kelompok rentan disebut |
| `MEDICATION_CONTEXT` | Konteks obat |

Kegawatan sengaja dideteksi hanya dari keluhan pengguna. Menyisir teks jawaban
memicu peringatan pada kalimat edukatif, dan peringatan yang muncul di
mana-mana justru diabaikan saat benar-benar dibutuhkan.

---

## 9. Korpus yang melengkapi diri sendiri

Tidak ada skrip ingesti terpisah. Basis pengetahuan tumbuh saat ada pertanyaan
yang belum terjawab.

```
1. Bukti untuk sebuah topik tipis
2. ensure_coverage() → cari topik itu ke Crossref
3. Crossref balas JSON terstruktur
   title · abstract · authors · DOI · publisher · journal · tanggal · subject
4. Abstrak < 200 karakter → dibuang
5. DOI tidak VERIFIED     → dibuang
6. Simpan sebagai JournalArticle
7. embed_article() lewat host → masuk indeks pgvector
8. Retrieval diulang, gerbang relevansi sama dengan impor manual
```

Perhatikan langkah 5: artikel **diverifikasi sebelum masuk**, bukan saat
disajikan. Sumber palsu tidak pernah sempat mengendap di basis data.

Batasnya: satu topik sekali per 24 jam, kuota 30 artikel per jam, dan
`KNOWLEDGE_ACQUISITION_ENABLED=0` mematikannya. Sengaja kecil — tujuannya
menutup lubang secukupnya agar pertanyaan bisa dijawab, bukan mengunduh
seluruh literatur di tengah satu permintaan HTTP.

---

## 10. Bukan pipeline RAG yang biasa

| | RAG lazim | ragai |
|---|---|---|
| Sumber | PDF, HTML mentah | Metadata Crossref terstruktur |
| Parsing | Perlu, rawan gagal | Tidak perlu, sudah JSON |
| Chunking | 500–1000 token, overlap | **Tidak ada** |
| Unit temu | Potongan teks | Satu artikel: judul + abstrak |
| Retrieval | Vektor saja | Hibrida leksikal + semantik |
| Re-rank | Sering tidak ada | 5 dimensi + pengali aspek |
| Bila retrieval buruk | LLM tetap menjawab | LLM tidak dipanggil |
| Sitasi | Opsional | Wajib, dipetakan per kalimat |
| Korpus | Statis | Tumbuh sesuai kebutuhan |

**Kenapa tidak ada chunking?** Chunking adalah solusi untuk masalah yang tidak
ada di sini. Ia ada karena PDF 40 halaman tidak muat di context window dan
tidak punya batas makna yang jelas. Abstrak jurnal sudah satu unit makna yang
utuh, ditulis penulisnya sendiri sebagai ringkasan; memotongnya justru
merusak. Itu pula sebabnya `[E1]` bisa menunjuk ke paper konkret berikut
DOI-nya, bukan ke "chunk 7 dari dokumen X" yang tak berarti bagi pembaca.

---

## 11. Asal angka-angkanya

Perlu dibaca dengan jujur: asal ambang dan bobot di dokumen ini **tidak
seragam**.

### Diukur dari produksi

Jalankan pertanyaan nyata, catat skor untuk yang ada jawabannya dan yang
tidak, taruh ambang di celah pemisahnya.

| Konstanta | Dasar pengukuran |
|---|---|
| `SEMANTIC_FLOOR = 0.35` | ada jawaban 0,435–0,657 · tidak ada 0,303–0,414 |
| `MIN_SEMANTIC_RELEVANCE = 0.25` | tak relevan memuncak 0,19 · benar terendah 0,33 |

### Keputusan desain

Tidak ada catatan pengukuran di kode. Masuk akal, tapi belum tervalidasi.

- Bobot re-ranking 0.45 / 0.15 / 0.15 / 0.15 / 0.10
- `ASPECT_FLOOR = 0.45`
- `NO_SEMANTIC_SUPPORT_PENALTY = 0.65`
- Bobot posisi: judul 3.0 · keywords 2.0 · abstrak 1.0

Kodenya mengakui pembedaan itu: bobotnya sengaja bisa ditimpa lewat
`EVIDENCE_SCORE_WEIGHTS` pada `runtime.configure()`. Begitu ada data uji
berlabel (pertanyaan beserta paper mana yang benar), bobot itu bisa dicari
lewat grid search tanpa menyentuh kode.

Konsekuensi lain: karena tidak ada model reranker terlatih, sistem ini **tidak
butuh data latih untuk jalan**, tapi juga **tidak membaik sendiri**. Setiap
perbaikan harus lewat tangan.

---

## 12. Teknologi

| Lapis | Yang dipakai |
|---|---|
| Bahasa | Python, nyaris seluruhnya pustaka standar |
| Dependensi non-stdlib | `requests` · `django` (hanya untuk cache) |
| Embedding | OpenAI `text-embedding-3-small`, 768 dimensi |
| Vector store | pgvector, tabel `embeddings` di Postgres yang sama |
| Pencarian leksikal | Ditulis sendiri, portabel PostgreSQL maupun SQLite |
| Sumber literatur | Crossref API · DOI Handle System |
| LLM | Default `gpt-5.4-mini`, rantai fallback ke penyedia berprotokol OpenAI |
| Ketahanan | Penyedia gagal ditandai tidak sehat 300 detik sebelum dicoba lagi |
| Konkurensi | `concurrent.futures`, 8 validasi tautan berbarengan |

### Yang justru tidak dipakai

LangChain · LlamaIndex · Haystack · SDK OpenAI · Pinecone · Weaviate ·
cross-encoder reranker · numpy.

Panggilan ke `api.openai.com` pun ditulis manual dengan `requests`. Bagian
paling bernilai dari ragai — menolak menjawab, membuang sumber karangan,
memetakan kalimat ke jurnalnya — memang tidak disediakan framework mana pun.
LangChain hanya akan menambah lapisan di atas bagian yang justru paling mudah,
sekaligus bertabrakan dengan ORM aplikasi induk.

**Harganya.** Ganti vector store atau penyedia LLM berarti menulis kode, bukan
menukar konfigurasi. Tidak ada tracing bawaan seperti LangSmith, hanya
`logging`. Tidak ada streaming, tool calling, maupun agent framework. Dan
setiap heuristik jadi tanggung jawab sendiri untuk dirawat serta dikalibrasi
ulang.

---

## 13. Peta modul

Sepuluh modul terbesar menanggung sebagian besar logikanya.

| Modul | Baris | Tanggung jawab |
|---|---:|---|
| `retrieval/retriever.py` | 712 | Pencarian leksikal + semantik, fusi skor, tiga sumber kandidat |
| `lexicon.py` | 583 | Leksikon gejala, penyakit, obat; jembatan dwibahasa ID→EN |
| `reasoning/generator.py` | 470 | Penyusunan prompt, generation, normalisasi penanda sitasi |
| `retrieval/acquisition.py` | 447 | Pelengkapan basis pengetahuan ke Crossref |
| `contracts.py` | 384 | Seluruh struktur data, tanpa I/O dan tanpa ORM |
| `evidence/link_validator.py` | 367 | Verifikasi DOI dan URL, anti-404 |
| `context/extractor.py` | 354 | Ekstraksi health context terstruktur |
| `engine.py` | 340 | Orkestrator sepuluh tahap |
| `query_understanding/classifier.py` | 296 | Penentuan intent |
| `safety/validator.py` | 280 | Lapisan keamanan keluaran |

### Adapter

Dua adapter menjaga kontrak publik tetap stabil walau engine internalnya
berkembang: `adapters/legacy.py` untuk API Healthify yang sudah ada, dan
`adapters/healthtalk.py` untuk consumer eksternal.

Jalur claim verification memetakan putusan internalnya ke label publik:

| Internal | Label publik |
|---|---|
| `supported` | `valid` |
| `unsupported` | `hoax` |
| `inconclusive` | `uncertain` |
