# Product Requirements Documents (PRD)
# Healthalk

**Product Category:** AI-Assistend Healthcare Journey
**Primary Platform**: Web / Mobile Web

---
# 1. Product Definition
## 1.1 Product Name
**Healthalk**

## 1.2 Product Concept
Healthalk adalah sistem yang membantu pengguna dalam setiap tahap perjalanan kesehatannya, mulai dari menceritakan keluhan, mendapatkan informasi kesehatan berbasis penelitian, merangkum hasil konsultasi untuk dibawa ke dokter, hingga memahami resep dan obat yang diberikan setelah pemeriksaan. Setiap informasi yang diperoleh selama proses tersebut tetap terhubung, sehingga pengguna tidak perlu mengulang atau mencari kembali informasi yang sama di setiap tahap.

Core Journey:
```text
User Health Concern
        ↓
AI-Assisted Conversation
        ↓
Health Understanding
        ↓
Consultation Record
        ↓
Doctor Consultation
        ↓
Prescription
        ↓
Prescription Understanding
```

# 2. Product Problem
Saat sesorang mengalami keluhan kesehatan, terdapat beberapa titik friksi:
1. User kesulitan menjelaskan keluhan secara sistematis.
2. Informasi kesehatan yang ditemukan secara online belum tentu relevan dengan konteks user
3. Informasi dari percakapan awal tida selalu terbawa ketika user bertemu dokter.
4. Setelah mendapatkan resep, tulisan dan istilah obat dapat sulit dipahami
5. Informasi kesehatan tersebar dan tidak membentuk satu alur yang kontinu.

Healthalk menyelesaikan masalah tersebut dengan mempertahankan health context sepanjang perjalanan.

# 3. Product Objective
## 3.1 Membangun sistem yang dapat:
- Menerima keluhan kesehatan melalui percakapan natural
- Memahami dan menstrukturkan infromasi kesehatan dari percakapan
- Menemukan evidence yang relevan
- Menghasilkan respons berdasarkan evidence
- Membentuk ringkasan kesehatan
- Menjaga keamanan data ringkasan
- Menerima resep dalam bentuk gambar
- Mengekstrak informasi reseo
- Memberikan penjelasan mengenai obat yang tertulis

## 3.2 Secondary Objective
Membangun fondation arsitektur yang memungkinkan sistem dikembangkan dari prototype menjadi platform health intelligence yang besar.


# 4. Product Principle
## 4.1 AI Is Not the Final Clinical Authority
Sistem hanya memberikan informasi dan assessment awal.
Diagnosis dan keputusan klinis tetap dilakukan oleh tenaga kesehatan.

## 4.2 Every Important Claim Must Have Evidence
Informasi medis yang digunakan sistem harus dapat ditelusuri ke sumber yang digunakan.

## 4.3 Context Must Be Preserved
Informasi yang sudah diperoleh pada tahap sebelumnya tidak boleh hilang ketika berpindah ke tahap berikutnya.

## 4.4 Uncertainty Must Be Explicit
Sistem tidak boleh mengubah ketidakpastian menjadi kepastian.

## 4.5 Health Data Is Sensitive
Data kesehatan harus diperlakukan sebagai sensitive information sejak ingestion hingga storage.

# 5. Target User
## 5.1 Primary User
Orang dewasa yang:
- sedang mengalami keluhan kesehatan;
- ingin memahami kondisi awal;
- ingin mempersiapkan konsultasi dokter;
- ingin memahami resep yang telah diperoleh.

## 5.2 Secondary User
Tenaga kesehatan yang menerima informasi awal user.

## 5.3 Supporting User
Apoteker yang membantu user memahami obat.

# Product Journey
Healthalk terdiri dari tiga fase:

```text
PHASE 1
UNDERSTAND
↓
PHASE 2
VALIDATE
↓
PHASE 3
UNDERSTAND TREATMENT
```

# 7. Phase 1 -> AI Health Consultation
## 7.1 Obejective 
Membantu user menyampaikan kondisi secara natural dan memperoleh informasi awal berbasis evidence

## 7.2 Entry Point
User memilih:
```text
Start Consultation
```

Sistem membuat:
```Consultation Session``` dengan identifier unik.

# 8. Voice Interaction Requirements
User berinteraksi dengan sistem melalui suara.

## 8.1 Input
Audio user.

## 8.2 Processing
```text
Audio
 ↓
Speech Recognition
 ↓
Transcript
```

## 8.3 Output

Transcript harus:
- mempertahankan makna ucapan;
- mempertahankan konteks;
- memiliki timestamp;
- dikaitkan dengan session;
- dapat digunakan untuk downstream processing.

# 9. Conversation Manager
Sistem harus mempertahankan conversation state, sistem tidak boleh memperlakukan setiap utterance sebagai pertanyaan independen.

Contoh:
User bertanya : "Saya Demam sejak tiga hari lalu"
Sistem harus memahami: "tiga hari yang lalu" -> duration dari demam

## 10. Health Information Extraction

Sistem tidak hanya menyimpan transcript.

Sistem harus mengubah percakapan menjadi structured health context.

Minimal schema:

```text
HealthContext
├── chief_complaint
├── symptoms[]
├── duration
├── severity
├── onset
├── progression
├── associated_symptoms[]
├── reported_conditions[]
├── medication_information[]
├── allergy_information[]
├── relevant_history[]
└── user_questions[]
```

Field yang belum diketahui harus bernilai:

```text
unknown / null
```

Bukan diasumsikan.

---

## 11. Conversation Intelligence

Sistem harus dapat menentukan apakah informasi dari user:

1. merupakan gejala;
2. merupakan durasi;
3. merupakan pertanyaan;
4. merupakan background information;
5. merupakan medication information;
6. merupakan clarification;
7. merupakan informasi yang tidak relevan.

Contoh:

> “Saya batuk dan dada terasa berat sejak kemarin.”

Structured result:

```json
{
  "symptoms": [
    "cough",
    "chest discomfort"
  ],
  "duration": "1 day"
}
```

---

## 12. Conversation Question Strategy

Sistem tidak boleh sekadar menjawab setiap pertanyaan user.

Sistem harus mampu menentukan apakah informasi yang tersedia cukup untuk menjawab atau membutuhkan clarification.

Contoh:

User:

> “Saya sakit perut.”

Sistem dapat meminta informasi tambahan yang relevan.

Namun sistem harus menghindari questioning yang tidak perlu.

Prioritas:

```text
Safety-critical information
        ↓
Relevant context
        ↓
Optional detail
```

---

## 13. Health Query Understanding

Setiap user utterance harus diklasifikasikan berdasarkan intent.

Minimal:

```text
SYMPTOM_DESCRIPTION
MEDICAL_INFORMATION_REQUEST
FOLLOW_UP_QUESTION
CLARIFICATION
MEDICATION_QUESTION
PREVIOUS_CONTEXT_REFERENCE
NON_MEDICAL
EMERGENCY_SIGNAL
```

Intent digunakan untuk menentukan processing pipeline berikutnya.

---

# 14. HEALTH EVIDENCE ENGINE

## 14.1 Objective

Engine informasi kesehatan harus menjawab pertanyaan berdasarkan evidence yang dapat ditelusuri.

Pipeline:

```text
User Query
 ↓
Query Understanding
 ↓
Clinical / Health Concepts
 ↓
Information Need
 ↓
Evidence Retrieval
 ↓
Evidence Filtering
 ↓
Evidence Ranking
 ↓
Response Generation
```

Sistem tidak boleh langsung menghasilkan jawaban medical factual melalui LLM tanpa evidence retrieval untuk pertanyaan yang membutuhkan factual medical information.

---

## 15. Evidence Retrieval

### 15.1 Objective

Menemukan sumber penelitian yang relevan terhadap konteks pertanyaan user.

### 15.2 Retrieval Input

```text
User Query
+
Structured Health Context
+
Conversation Context
```

Contoh:

```text
Query:
"Apakah demam selama tiga hari perlu diperiksa?"

Context:
fever
duration = 3 days
adult
```

Sistem kemudian menghasilkan search representation.

---

## 16. Evidence Source

Knowledge base minimal dapat berasal dari:

- jurnal penelitian;
- systematic review;
- clinical guideline;
- authoritative health source.

Setiap source harus memiliki metadata:

```text
source_id
title
authors
publication_year
publisher
doi / identifier
abstract
url
source_type
```

---

## 17. Evidence Processing

Dokumen evidence diproses menjadi:

```text
Document
 ↓
Cleaning
 ↓
Chunking
 ↓
Metadata Extraction
 ↓
Embedding
 ↓
Vector Index
```

Metadata harus tetap melekat dengan setiap chunk.

Contoh:

```text
Chunk
├── text
├── embedding
├── source_id
├── title
├── year
├── DOI
└── source_type
```

---

## 18. Retrieval Strategy

Retrieval tidak hanya berdasarkan semantic similarity.

Pipeline ideal:

```text
User Question
      ↓
Semantic Retrieval
      ↓
Keyword / Entity Matching
      ↓
Metadata Filtering
      ↓
Re-ranking
      ↓
Top Evidence
```

Untuk MVP, semantic retrieval + metadata filtering sudah cukup.

---

## 19. Evidence Quality

Setiap evidence dapat diberikan internal score berdasarkan:

```text
Relevance
Source Quality
Recency
Evidence Type
Context Match
```

Contoh:

```text
Evidence Score: 0.87
```

Score internal tidak harus ditampilkan ke user.

---

## 20. Response Generation

LLM menerima:

```text
User Question
+
Conversation Context
+
Structured Health Context
+
Retrieved Evidence
```

Dan menghasilkan:

```text
Response
+
Evidence References
+
Uncertainty
+
Safety Guidance
```

---

## 21. Response Policy

Response harus:

1. menjawab pertanyaan user;
2. tidak mengarang sumber;
3. tidak menciptakan evidence yang tidak retrieved;
4. tidak menyatakan diagnosis definitif;
5. membedakan evidence dari inference;
6. menyebutkan keterbatasan apabila evidence tidak cukup.

---

## 22. Evidence-Grounded Generation

Setiap factual medical statement yang material harus memiliki hubungan dengan evidence yang retrieved.

Conceptually:

```text
Claim A
 ↓
Evidence A

Claim B
 ↓
Evidence B
```

Sistem harus dapat menyimpan provenance:

```text
response_claim
    ↓
supporting_chunk
    ↓
source_document
```

Ini penting untuk pengembangan health intelligence selanjutnya.

---

## 23. Evidence Failure

Jika evidence tidak ditemukan, sistem tidak boleh mengarang.

State:

```text
INSUFFICIENT_EVIDENCE
```

Response dapat berupa:

> “Saya belum menemukan evidence yang cukup untuk memberikan jawaban yang dapat dipercaya mengenai hal tersebut.”

---

## 24. Health Safety Layer

Sebelum response diberikan kepada user, sistem melakukan safety check.

```text
Generated Response
 ↓
Safety Validator
 ↓
PASS / MODIFY / BLOCK
```

Kategori minimal:

```text
LOW RISK
MEDIUM RISK
HIGH RISK
EMERGENCY SIGNAL
```

Untuk kondisi berisiko tinggi, sistem harus memprioritaskan arahan mencari bantuan tenaga kesehatan dibanding memberikan penjelasan panjang.

---

# 25. CONSULTATION COMPLETION

User dapat memilih:

> **End Consultation**

Sistem kemudian menghentikan conversation state.

```text
ACTIVE
 ↓
COMPLETING
 ↓
SUMMARY_GENERATION
 ↓
SECURITY_PROCESSING
 ↓
COMPLETED
```

---

## 26. Consultation Summary Generator

Summary dibuat dari structured health context + conversation transcript.

Summary bukan transcript.

Format:

```text
CONSULTATION SUMMARY

Chief Complaint
...

Reported Symptoms
...

Duration / Onset
...

Relevant Information
...

Questions Discussed
...

AI Preliminary Assessment
...

Information / Evidence Discussed
...

Recommended Next Step
...

Important Warnings
...
```

---

## 27. Summary Quality Requirements

Summary harus:

- concise;
- factual;
- tidak menambahkan informasi yang tidak disampaikan user;
- memisahkan user-reported information dan AI-generated interpretation;
- dapat dibaca manusia;
- dapat dikonsumsi oleh dokter.

---

## 28. Information Provenance

Setiap informasi dalam summary idealnya memiliki origin.

Contoh:

```text
"Demam selama 3 hari"
Source:
USER_REPORTED

"Potential concern"
Source:
AI_GENERATED

"Article X supports..."
Source:
EVIDENCE
```

Ini memungkinkan sistem membedakan:

```text
FACT
USER REPORT
AI INFERENCE
EVIDENCE
```

---

# 29. ENCRYPTED HEALTH RECORD

Setelah summary selesai, sistem membentuk:

```text
HealthRecord
```

HealthRecord harus dienkripsi sebelum disimpan.

Concept:

```text
Structured Summary
        ↓
Serialization
        ↓
Encryption
        ↓
Encrypted Storage
```

Data yang termasuk sensitive:

- transcript;
- summary;
- symptom information;
- health assessment;
- prescription image;
- medication information.

---

## 30. Health Record Access

User dapat membuka consultation record setelah authentication.

Sistem:

```text
Authenticated User
       ↓
Authorization Check
       ↓
Encrypted Record Retrieval
       ↓
Decryption
       ↓
Display
```

User hanya boleh mengakses record miliknya.

---

# 31. DOCTOR HANDOFF

Consultation record dapat digunakan sebagai preparation material ketika user melakukan konsultasi langsung.

Flow:

```text
AI Consultation
 ↓
Health Record
 ↓
User
 ↓
Doctor
```

Untuk prototype, dokter tidak harus memiliki integrasi backend penuh.

Presentation dapat berupa:

```text
Share / View Consultation Summary
```

---

## 32. Doctor Validation

Dokter merupakan tahap clinical validation.

Doctor dapat menilai:

```text
AI Preliminary Assessment
        ↓
Clinical Examination
        ↓
Doctor Assessment
```

Jika sistem memiliki doctor input interface, minimal tersedia:

```text
Confirmed Information
Corrected Information
Additional Notes
Diagnosis
Treatment
```

Diagnosis dokter tidak boleh ditulis sebagai hasil AI.

---

## 33. Doctor Diagnosis Model

Data diagnosis harus memiliki provenance:

```text
source = DOCTOR
```

bukan:

```text
source = AI
```

Hal ini penting untuk membedakan medical authority.

---

# 34. PRESCRIPTION INGESTION

Setelah konsultasi dokter, user memperoleh prescription.

Input:

```text
Image
```

User dapat:

- mengambil foto;
- upload gambar.

---

## 35. Prescription Image Preprocessing

Pipeline:

```text
Image
 ↓
Quality Check
 ↓
Crop / Detection
 ↓
Perspective Correction
 ↓
Noise Reduction
 ↓
Text Recognition
```

Sistem harus memeriksa:

- blur;
- glare;
- insufficient resolution;
- cropped image;
- handwriting visibility.

Jika kualitas terlalu rendah:

```text
IMAGE_QUALITY_FAILED
```

dan sistem meminta foto ulang.

---

## 36. Prescription Text Recognition

Sistem harus mengidentifikasi:

- medication name;
- strength/dose;
- frequency;
- quantity;
- route;
- instruction;
- refill instruction jika ada.

Output:

```text
PrescriptionItem
```

---

## 37. Prescription Structuring

Contoh input:

```text
"Amoxicillin 500 mg
3 x 1
sesudah makan"
```

Output:

```json
{
  "medicine_name": "Amoxicillin",
  "strength": "500 mg",
  "frequency": "3x daily",
  "instruction": "after meals"
}
```

---

## 38. OCR Confidence

Setiap extracted field memiliki confidence.

Contoh:

```text
Medicine Name     0.97
Strength          0.94
Frequency         0.88
Instruction       0.61
```

Confidence rendah harus menghasilkan:

```text
NEEDS_VERIFICATION
```

---

## 39. Prescription Verification

User harus dapat memeriksa hasil OCR sebelum menganggap data sebagai final.

UI:

```text
Medicine:
[Amoxicillin] ✓

Dose:
[500 mg] ✓

Frequency:
[3 × daily] ⚠

Instruction:
[After meals] ⚠
```

User dapat:

```text
Confirm
Edit
Retake Photo
```

---

## 40. Medication Information

Setelah medication teridentifikasi dan diverifikasi, sistem dapat mengambil informasi obat.

Minimal:

```text
Medication Name
General Use
Dosage as Written
Frequency as Written
Route
Prescription Instruction
Important General Information
```

Informasi “general use” tidak boleh berubah menjadi klaim bahwa obat tersebut pasti cocok untuk kondisi user.

---

## 41. Medication Knowledge Source

Drug information harus berasal dari structured/authoritative drug information source.

Concept:

```text
Prescription
 ↓
Medication Entity
 ↓
Drug Knowledge Retrieval
 ↓
Medication Information
```

Sistem tidak boleh mengandalkan LLM memory sebagai satu-satunya sumber.

---

## 42. Prescription Safety

Sistem tidak boleh:

- mengubah dosis dokter;
- menyarankan mengganti obat;
- menghapus obat;
- menambahkan obat;
- menyatakan resep valid/tidak valid berdasarkan AI saja.

Sistem berfungsi sebagai:

> **Prescription Understanding Layer**

bukan prescribing system.

---

# 43. HEALTH JOURNEY DATA MODEL

Seluruh journey harus memiliki parent object:

```text
HealthJourney
```

Struktur konseptual:

```text
HealthJourney
│
├── Consultation Sessions
│   ├── Conversations
│   ├── Health Context
│   ├── Evidence
│   └── Summary
│
├── Doctor Consultation
│   ├── Validation
│   ├── Diagnosis
│   └── Notes
│
└── Prescription
    ├── Image
    ├── OCR Result
    ├── Verification
    └── Medication Information
```

---

# 44. Event Model

Setiap perubahan penting dapat dibuat sebagai event:

```text
CONSULTATION_STARTED
MESSAGE_RECEIVED
EVIDENCE_RETRIEVED
RESPONSE_GENERATED
CONSULTATION_COMPLETED
SUMMARY_GENERATED
RECORD_ENCRYPTED
DOCTOR_VALIDATION_ADDED
PRESCRIPTION_UPLOADED
OCR_COMPLETED
PRESCRIPTION_VERIFIED
MEDICATION_INFORMATION_GENERATED
```

Event memungkinkan timeline dan audit trail dibangun kemudian.

---

# 45. SYSTEM ARCHITECTURE

Arsitektur logical:

```text
                    CLIENT
                      │
                      ▼
               API / BACKEND
                      │
              ORCHESTRATION LAYER
                      │
       ┌──────────────┼──────────────┐
       │              │              │
       ▼              ▼              ▼
 Conversation     Health         Prescription
   Engine       Intelligence       Engine
                     │
              ┌──────┴──────┐
              ▼             ▼
        Evidence Store   LLM Layer
              │
              ▼
        Health Knowledge
```

Cross-cutting:

```text
Authentication
Authorization
Encryption
Logging
Audit Trail
```

---

# 46. Engine Boundaries

Setiap engine harus memiliki tanggung jawab yang jelas.

## Conversation Engine

Responsible for:

- audio input;
- speech recognition;
- conversation state;
- text response to audio.

Tidak responsible for:

- medical evidence retrieval;
- medical diagnosis.

## Health Intelligence Engine

Responsible for:

- health information extraction;
- intent detection;
- evidence retrieval;
- response generation;
- preliminary assessment;
- summary generation.

## Prescription Engine

Responsible for:

- prescription image analysis;
- OCR;
- medication entity extraction;
- prescription structuring;
- confidence estimation.

---

# 47. ORCHESTRATION LAYER

Orchestrator bertugas menghubungkan engine.

Contoh flow:

```text
User Audio
 ↓
Conversation Engine
 ↓
Transcript
 ↓
Orchestrator
 ↓
Health Intelligence
 ↓
Response
 ↓
Conversation Engine
 ↓
Audio
```

Ketika konsultasi selesai:

```text
Conversation Completed
 ↓
Orchestrator
 ↓
Summary Generator
 ↓
Encryption Service
 ↓
Health Record
```

---

# 48. ERROR STATES

Minimal system states:

```text
VOICE_RECOGNITION_FAILED
EVIDENCE_NOT_FOUND
AI_GENERATION_FAILED
SAFETY_BLOCKED
SUMMARY_FAILED
ENCRYPTION_FAILED
IMAGE_QUALITY_FAILED
OCR_FAILED
PRESCRIPTION_AMBIGUOUS
MEDICATION_MATCH_FAILED
```

Setiap state harus memiliki user-facing fallback.

---

# 49. NON-FUNCTIONAL REQUIREMENTS

## Performance

Target prototype:

- audio processing terasa conversational;
- response AI memiliki latency yang dapat diterima untuk percakapan;
- summary generated dalam waktu beberapa detik setelah sesi selesai;
- OCR result diproses dalam waktu beberapa detik.

## Availability

Prototype harus tetap dapat menyelesaikan journey apabila salah satu non-critical feature gagal.

## Security

Sensitive health data harus:

- encrypted in transit;
- encrypted at rest;
- access-controlled.

## Auditability

Sistem harus mampu mengetahui:

```text
who
did what
when
to which health record
```

---

# 50. UI INFORMATION ARCHITECTURE

Minimal navigation:

```text
Home
├── Start Consultation
├── Consultation History
└── Health Records

Prescription
├── Upload Prescription
└── Prescription History

Profile
└── Privacy & Security
```

---

# 51. CONSULTATION SCREEN

Core elements:

```text
Session Status
Voice Interaction
Transcript Preview
End Consultation
```

Transcript tidak harus menjadi fokus visual utama karena primary interaction adalah voice.

---

# 52. CONSULTATION RESULT SCREEN

```text
Consultation Completed

Summary
├── Main Complaint
├── Symptoms
├── Duration
├── Important Information
├── Preliminary Assessment
└── Recommended Next Step

Evidence
└── Sources

[Secure Record]
[Share with Doctor]
```

---

# 53. PRESCRIPTION SCREEN

```text
Upload Prescription
        ↓
Processing
        ↓
Recognized Prescription
        ↓
Verify Result
        ↓
Medication Information
```

---

# 54. PRIVACY UI

User harus dapat mengetahui:

- data apa yang disimpan;
- tujuan penyimpanan;
- status keamanan;
- siapa yang dapat mengakses data.

Contoh:

> “Your consultation record is encrypted and can only be accessed through your authorized account.”

---

# 55. CORE API CONTRACTS

## Create Session

```http
POST /consultations
```

Response:

```json
{
  "session_id": "...",
  "status": "ACTIVE"
}
```

## Send User Transcript

```http
POST /consultations/{session_id}/messages
```

## End Session

```http
POST /consultations/{session_id}/complete
```

## Get Summary

```http
GET /consultations/{session_id}/summary
```

## Upload Prescription

```http
POST /prescriptions
```

## Get Prescription Result

```http
GET /prescriptions/{id}
```

---

# 56. Minimum Data Entities

Prototype minimum:

```text
USER
HEALTH_SESSION
MESSAGE
HEALTH_CONTEXT
EVIDENCE_SOURCE
EVIDENCE_CHUNK
CONSULTATION_SUMMARY
HEALTH_RECORD
DOCTOR_VALIDATION
PRESCRIPTION
PRESCRIPTION_ITEM
MEDICATION
```

Security-related:

```text
ENCRYPTION_METADATA
ACCESS_LOG
```

---

# 57. MVP Priority

## P0 — Must Work

### Consultation

- voice interaction;
- STT;
- conversation state;
- health context extraction;
- evidence retrieval;
- evidence-grounded response;
- TTS.

### Completion

- consultation summary;
- encrypted storage;
- record retrieval.

### Prescription

- image upload;
- OCR;
- medication extraction;
- confidence;
- verification;
- basic medication information.

## P1 — Should Work

- evidence source display;
- doctor summary view;
- structured doctor validation;
- health timeline;
- better OCR preprocessing;
- richer medication information;
- source provenance.

## P2 — Future

- real doctor teleconsultation;
- appointment booking;
- pharmacy integration;
- medication reminders;
- patient monitoring;
- wearable integration;
- longitudinal health analytics;
- hospital integration;
- multilingual support.

---

# 58. End-to-End Acceptance Criteria

### AC-01

User dapat memulai konsultasi suara.

### AC-02

Speech user berhasil diubah menjadi transcript.

### AC-03

Transcript dapat dipahami dalam conversation context.

### AC-04

System dapat mengambil evidence relevan.

### AC-05

Response memperlihatkan source/evidence.

### AC-06

Conversation dapat berlangsung lebih dari satu turn tanpa kehilangan konteks.

### AC-07

User dapat mengakhiri konsultasi.

### AC-08

System menghasilkan structured consultation summary.

### AC-09

Summary disimpan secara encrypted.

### AC-10

User dapat mengambil kembali record miliknya.

### AC-11

User dapat mengupload foto resep.

### AC-12

System dapat melakukan OCR.

### AC-13

System memberikan confidence terhadap extraction.

### AC-14

User dapat memverifikasi extraction.

### AC-15

System memberikan medication information.

### AC-16

Seluruh journey dapat diperagakan dari satu user session.

---

# 59. Demo Scenario

Satu user digunakan untuk memperlihatkan seluruh sistem.

## Step 1 — Talk

User:

> “Saya mengalami demam dan batuk sejak tiga hari.”

System memahami informasi tersebut.

## Step 2 — Health Evidence

User bertanya:

> “Apa yang mungkin menyebabkan kondisi seperti ini?”

System:

```text
Query Understanding
 ↓
Evidence Retrieval
 ↓
Evidence-grounded Answer
```

Response disampaikan melalui suara.

## Step 3 — Continue Conversation

Percakapan berlanjut dan system mengumpulkan health context.

## Step 4 — Summary

User mengakhiri session.

System:

```text
Conversation
 ↓
Structured Health Context
 ↓
Consultation Summary
 ↓
Encryption
```

## Step 5 — Doctor Validation

Summary dibawa ke dokter.

Doctor melakukan pemeriksaan dan diagnosis.

Dalam demo, stage ini dapat direpresentasikan sebagai:

```text
AI Preliminary Assessment
        ↓
Doctor Validation
        ↓
Actual Diagnosis
```

## Step 6 — Prescription

Doctor memberikan prescription tulisan tangan.

## Step 7 — Prescription OCR

User mengupload foto.

```text
Prescription Image
 ↓
OCR
 ↓
Medication Extraction
 ↓
Verification
```

## Step 8 — Medication Information

System menampilkan:

```text
Medication
Dose
Frequency
Instruction
General Information
```

Journey selesai.

---

# 60. Product Success Metrics

Untuk hackathon, fokus pada measurable technical/product outcomes.

## Conversation

- successful voice interaction rate;
- average response latency;
- conversation completion rate.

## Health Intelligence

- retrieval success;
- evidence-grounded response rate;
- citation coverage;
- unsupported response rate.

## Summary

- summary generation success rate;
- structured information completeness.

## OCR

- medication recognition accuracy;
- dosage extraction accuracy;
- frequency extraction accuracy;
- low-confidence detection accuracy.

## Overall

### End-to-End Completion Rate

Persentase journey yang berhasil diselesaikan:

```text
Start Consultation
→ AI Conversation
→ Summary
→ Secure Record
→ Prescription Upload
→ OCR
→ Medication Understanding
```

---

# 61. Future Architecture Direction

Walaupun prototype hanya membutuhkan tiga capability utama, arsitektur harus memungkinkan HealthTalk berkembang menjadi:

```text
                    HEALTH TALK
                         │
               HEALTH INTELLIGENCE
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   Conversation      Evidence          Medication
   Intelligence      Intelligence       Intelligence
        │                │                │
        └────────────────┼────────────────┘
                         ↓
                  Health Context
                         │
                         ↓
                 Longitudinal Record
```

Dengan demikian health intelligence tidak lagi diperlakukan sebagai:

> “mesin pencari jurnal untuk klaim kesehatan.”

Melainkan sebagai **Health Intelligence Layer** yang dapat berkembang untuk memahami context, evidence, reasoning, assessment, dan longitudinal health information.

---

# 62. Final Product Principle

HealthTalk harus menjawab satu pertanyaan:

> **“Bagaimana kita membuat informasi kesehatan seseorang tidak terputus sepanjang perjalanan mereka?”**

Jawabannya:

```text
                USER
                  ↓
              TALK
                  ↓
          HEALTH CONTEXT
                  ↓
             EVIDENCE
                  ↓
            UNDERSTANDING
                  ↓
          SECURE HEALTH RECORD
                  ↓
              DOCTOR
                  ↓
             VALIDATION
                  ↓
           PRESCRIPTION
                  ↓
           UNDERSTANDING
```

HealthTalk bukan sekadar chatbot, OCR, atau consultation application.

Produk utamanya adalah **continuity of health information**.

Seluruh engine adalah komponen yang membuat continuity tersebut terjadi.
