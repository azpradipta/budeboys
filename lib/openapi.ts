const ERROR_SCHEMA = {
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
} as const;

function errorResponse(description: string, ...examples: string[]) {
  return {
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/Error" },
        ...(examples.length
          ? { example: { error: examples[0] } }
          : {}),
      },
    },
  };
}

const UNAUTHORIZED = errorResponse("Tidak ada cookie sesi Supabase yang valid.", "unauthorized");

const schemas = {
  Error: ERROR_SCHEMA,

  Severity: {
    type: "string",
    enum: ["mild", "moderate", "severe", "unknown"],
  },

  RiskLevel: {
    type: "string",
    enum: ["LOW_RISK", "MEDIUM_RISK", "HIGH_RISK", "EMERGENCY_SIGNAL"],
  },

  UtteranceIntent: {
    type: "string",
    enum: [
      "SYMPTOM_DESCRIPTION",
      "MEDICAL_INFORMATION_REQUEST",
      "FOLLOW_UP_QUESTION",
      "CLARIFICATION",
      "MEDICATION_QUESTION",
      "PREVIOUS_CONTEXT_REFERENCE",
      "NON_MEDICAL",
      "EMERGENCY_SIGNAL",
    ],
  },

  HealthContext: {
    type: "object",
    description:
      "Fakta terstruktur hasil ekstraksi percakapan sejauh ini. Terkumpul tiap giliran dan dikirim ulang di setiap request.",
    properties: {
      chief_complaint: { type: ["string", "null"] },
      symptoms: { type: "array", items: { type: "string" } },
      duration: { type: ["string", "null"] },
      severity: { $ref: "#/components/schemas/Severity" },
      onset: { type: ["string", "null"] },
      progression: { type: ["string", "null"] },
      associated_symptoms: { type: "array", items: { type: "string" } },
      reported_conditions: { type: "array", items: { type: "string" } },
      medication_information: { type: "array", items: { type: "string" } },
      allergy_information: { type: "array", items: { type: "string" } },
      relevant_history: { type: "array", items: { type: "string" } },
      user_questions: { type: "array", items: { type: "string" } },
    },
    required: [
      "chief_complaint",
      "symptoms",
      "duration",
      "severity",
      "onset",
      "progression",
      "associated_symptoms",
      "reported_conditions",
      "medication_information",
      "allergy_information",
      "relevant_history",
      "user_questions",
    ],
  },

  EvidenceSource: {
    type: "object",
    properties: {
      source_id: { type: "string" },
      title: { type: "string" },
      authors: { type: "string" },
      publication_year: { type: "integer" },
      publisher: { type: "string" },
      doi: { type: "string" },
      abstract: { type: "string" },
      url: { type: "string", format: "uri" },
      source_type: {
        type: "string",
        enum: [
          "journal",
          "systematic_review",
          "clinical_guideline",
          "authoritative_health_source",
        ],
      },
    },
    required: ["source_id", "title", "url", "source_type"],
  },

  EvidenceReference: {
    type: "object",
    properties: {
      source: { $ref: "#/components/schemas/EvidenceSource" },
      snippet: { type: "string" },
      score: {
        type: "number",
        description: "Skor relevansi internal, tidak untuk ditampilkan mentah ke pengguna.",
      },
    },
    required: ["source", "snippet", "score"],
  },

  ConsultationMessage: {
    type: "object",
    properties: {
      id: { type: "string" },
      role: { type: "string", enum: ["user", "assistant"] },
      text: { type: "string" },
      timestamp: { type: "string", format: "date-time" },
      intent: { $ref: "#/components/schemas/UtteranceIntent" },
      evidence: {
        type: "array",
        items: { $ref: "#/components/schemas/EvidenceReference" },
      },
      risk: { $ref: "#/components/schemas/RiskLevel" },
      insufficientEvidence: { type: "boolean" },
    },
    required: ["id", "role", "text", "timestamp"],
  },

  ConsultationSummary: {
    type: "object",
    properties: {
      chief_complaint: { type: "string" },
      reported_symptoms: { type: "array", items: { type: "string" } },
      duration_onset: { type: "string" },
      relevant_information: { type: "array", items: { type: "string" } },
      questions_discussed: { type: "array", items: { type: "string" } },
      ai_preliminary_assessment: { type: "string" },
      evidence_discussed: {
        type: "array",
        items: { $ref: "#/components/schemas/EvidenceReference" },
      },
      recommended_next_step: { type: "string" },
      important_warnings: { type: "array", items: { type: "string" } },
      generated_at: { type: "string", format: "date-time" },
    },
    required: ["chief_complaint", "ai_preliminary_assessment", "generated_at"],
  },

  DoctorValidation: {
    type: "object",
    description:
      "Fase 2. Diisi dokter yang meninjau hasil konsultasi AI, dan AI tidak pernah mengubah field ini.",
    properties: {
      confirmed_information: { type: "array", items: { type: "string" } },
      corrected_information: { type: "array", items: { type: "string" } },
      additional_notes: { type: "string" },
      diagnosis: { type: "string" },
      treatment: { type: "string" },
      source: { type: "string", enum: ["DOCTOR"] },
      recorded_at: { type: "string", format: "date-time" },
    },
    required: ["diagnosis", "source", "recorded_at"],
  },

  ConsultationSession: {
    type: "object",
    properties: {
      id: { type: "string", examples: ["cs_9f2a1c7d"] },
      status: {
        type: "string",
        enum: [
          "ACTIVE",
          "COMPLETING",
          "SUMMARY_GENERATION",
          "SECURITY_PROCESSING",
          "COMPLETED",
        ],
      },
      createdAt: { type: "string", format: "date-time" },
      completedAt: { type: "string", format: "date-time" },
      messages: {
        type: "array",
        items: { $ref: "#/components/schemas/ConsultationMessage" },
      },
      healthContext: { $ref: "#/components/schemas/HealthContext" },
      summary: { $ref: "#/components/schemas/ConsultationSummary" },
      doctorValidation: { $ref: "#/components/schemas/DoctorValidation" },
      encrypted: { type: "boolean" },
    },
    required: ["id", "status", "createdAt", "messages", "healthContext", "encrypted"],
  },

  FieldConfidence: {
    type: "object",
    description:
      "Satu field hasil OCR beserta tingkat keyakinan parser. Field di bawah ambang confidence ditandai agar dikonfirmasi pengguna.",
    properties: {
      value: { type: "string" },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      needsVerification: { type: "boolean" },
      verified: { type: "boolean" },
    },
    required: ["value", "confidence", "needsVerification", "verified"],
  },

  PrescriptionItem: {
    type: "object",
    properties: {
      id: { type: "string" },
      medicine_name: { $ref: "#/components/schemas/FieldConfidence" },
      strength: { $ref: "#/components/schemas/FieldConfidence" },
      frequency: { $ref: "#/components/schemas/FieldConfidence" },
      quantity: { $ref: "#/components/schemas/FieldConfidence" },
      route: { $ref: "#/components/schemas/FieldConfidence" },
      instruction: { $ref: "#/components/schemas/FieldConfidence" },
      refill_instruction: { $ref: "#/components/schemas/FieldConfidence" },
    },
    required: [
      "id",
      "medicine_name",
      "strength",
      "frequency",
      "quantity",
      "route",
      "instruction",
    ],
  },

  MedicationInfo: {
    type: "object",
    description:
      "Penjelasan umum obat, bukan peresepan. Dosis dan frekuensi disalin apa adanya dari resep, tidak pernah dibuat oleh model.",
    properties: {
      medicine_name: { type: "string" },
      general_use: { type: "string" },
      how_it_works: { type: "string" },
      dosage_as_written: { type: "string" },
      frequency_as_written: { type: "string" },
      route: { type: "string" },
      prescription_instruction: { type: "string" },
      important_general_information: { type: "array", items: { type: "string" } },
      matched: {
        type: "boolean",
        description: "False bila obatnya sama sekali tidak dikenali.",
      },
      source: { type: "string", enum: ["openai", "local_kb", "unmatched"] },
    },
    required: ["medicine_name", "general_use", "matched"],
  },

  PrescriptionRecord: {
    type: "object",
    properties: {
      id: { type: "string", examples: ["rx_41b0c8e2"] },
      consultationId: {
        type: "string",
        description: "Resep selalu milik sebuah konsultasi, tidak ada unggahan lepas.",
      },
      status: {
        type: "string",
        enum: [
          "UPLOADED",
          "IMAGE_QUALITY_FAILED",
          "PROCESSING",
          "TEXT_REVIEW",
          "NEEDS_VERIFICATION",
          "VERIFIED",
          "COMPLETED",
        ],
      },
      imageDataUrl: {
        type: "null",
        description:
          "Selalu null di response. Foto di-OCR di browser dan tidak pernah diunggah atau disimpan.",
      },
      fileName: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      rawText: {
        type: "string",
        description: "Teks mentah OCR, bisa dikoreksi pengguna sebelum di-parse.",
      },
      items: {
        type: "array",
        items: { $ref: "#/components/schemas/PrescriptionItem" },
      },
      medications: {
        type: "array",
        items: { $ref: "#/components/schemas/MedicationInfo" },
      },
    },
    required: [
      "id",
      "consultationId",
      "status",
      "imageDataUrl",
      "fileName",
      "createdAt",
      "items",
      "medications",
    ],
  },
};

const paths = {
  "/api/consultations": {
    get: {
      tags: ["Consultations"],
      summary: "Daftar konsultasi",
      description:
        "Mengembalikan seluruh konsultasi milik pengguna yang login, terbaru dulu. RLS yang membatasi query; API tidak memfilter berdasarkan user id.",
      responses: {
        200: {
          description: "Konsultasi milik pengguna.",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/ConsultationSession" },
              },
            },
          },
        },
        401: UNAUTHORIZED,
        500: errorResponse("Kesalahan database."),
      },
    },
    post: {
      tags: ["Consultations"],
      summary: "Membuat atau mengganti konsultasi",
      description:
        "Upsert berdasarkan `id`, jadi klien boleh memanggilnya berulang seiring sesi berjalan.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ConsultationSession" },
          },
        },
      },
      responses: {
        201: {
          description: "Konsultasi yang tersimpan, sudah didekripsi.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ConsultationSession" },
            },
          },
        },
        400: errorResponse("Body tidak punya `id`.", "missing_id"),
        401: UNAUTHORIZED,
        500: errorResponse("Kesalahan database."),
      },
    },
  },

  "/api/consultations/{id}": {
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string" },
        example: "cs_9f2a1c7d",
      },
    ],
    get: {
      tags: ["Consultations"],
      summary: "Mengambil satu konsultasi",
      responses: {
        200: {
          description: "Konsultasi yang diminta.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ConsultationSession" },
            },
          },
        },
        401: UNAUTHORIZED,
        404: errorResponse("Konsultasi tidak ada untuk pengguna ini.", "not_found"),
        500: errorResponse("Kesalahan database."),
      },
    },
    put: {
      tags: ["Consultations"],
      summary: "Mengganti konsultasi",
      description: "`id` di body harus sama dengan parameter path.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ConsultationSession" },
          },
        },
      },
      responses: {
        200: {
          description: "Konsultasi yang tersimpan, sudah didekripsi.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ConsultationSession" },
            },
          },
        },
        400: errorResponse("`id` di body berbeda dengan id di path.", "id_mismatch"),
        401: UNAUTHORIZED,
        500: errorResponse("Kesalahan database."),
      },
    },
  },

  "/api/consultation/turn": {
    post: {
      tags: ["Consultation AI"],
      summary: "Menjawab satu giliran percakapan",
      description:
        "Basa-basi dijawab langsung tanpa retrieval. Selain itu, Healthify dipanggil untuk jawaban berbasis evidence, dan bila tidak dikonfigurasi atau tak terjangkau, generator lokal yang menjawab. Field `source` menandai jalur yang dipakai.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                query: { type: "string", examples: ["Sudah 3 hari kepala saya pusing"] },
                sessionId: {
                  type: "string",
                  description: "Id konsultasi, dipakai menjaga konteks RAG antar giliran.",
                },
                healthContext: { $ref: "#/components/schemas/HealthContext" },
                hasPriorContext: { type: "boolean" },
                lastAssistantText: {
                  type: "string",
                  description: "Jawaban asisten sebelumnya, dipakai agar tidak mengulang.",
                },
              },
              required: ["query", "sessionId", "healthContext", "hasPriorContext"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Giliran jawaban asisten.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  intent: { $ref: "#/components/schemas/UtteranceIntent" },
                  evidence: {
                    type: "array",
                    items: { $ref: "#/components/schemas/EvidenceReference" },
                  },
                  risk: { $ref: "#/components/schemas/RiskLevel" },
                  insufficientEvidence: { type: "boolean" },
                  healthContext: { $ref: "#/components/schemas/HealthContext" },
                  source: {
                    type: "string",
                    enum: ["smalltalk", "healthify", "local_fallback"],
                  },
                },
                required: ["text", "intent", "evidence", "risk", "healthContext", "source"],
              },
            },
          },
        },
        400: errorResponse("`query` kosong.", "missing_query"),
        401: UNAUTHORIZED,
      },
    },
  },

  "/api/consultation/summary": {
    post: {
      tags: ["Consultation AI"],
      summary: "Meringkas konsultasi yang selesai",
      description:
        "Mencoba endpoint summary Healthify, lalu fallback ke generator lokal yang disusun dari pesan-pesan sesi itu sendiri.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                session: { $ref: "#/components/schemas/ConsultationSession" },
              },
              required: ["session"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Ringkasannya.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  summary: { $ref: "#/components/schemas/ConsultationSummary" },
                  source: { type: "string", enum: ["healthify", "local_fallback"] },
                },
                required: ["summary", "source"],
              },
            },
          },
        },
        400: errorResponse("`session` tidak ada atau tanpa `id`.", "missing_session"),
        401: UNAUTHORIZED,
      },
    },
  },

  "/api/prescriptions": {
    get: {
      tags: ["Prescriptions"],
      summary: "Daftar resep",
      parameters: [
        {
          name: "consultationId",
          in: "query",
          required: false,
          schema: { type: "string" },
          description: "Membatasi daftar ke satu konsultasi.",
        },
      ],
      responses: {
        200: {
          description: "Resep milik pengguna, terbaru dulu.",
          content: {
            "application/json": {
              schema: {
                type: "array",
                items: { $ref: "#/components/schemas/PrescriptionRecord" },
              },
            },
          },
        },
        401: UNAUTHORIZED,
        500: errorResponse("Kesalahan database."),
      },
    },
    post: {
      tags: ["Prescriptions"],
      summary: "Membuat atau mengganti resep",
      description:
        "Upsert berdasarkan `id`. `imageDataUrl` di body dibuang sebelum disimpan, karena server tidak pernah menyimpan fotonya.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PrescriptionRecord" },
          },
        },
      },
      responses: {
        201: {
          description: "Resep yang tersimpan, sudah didekripsi.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PrescriptionRecord" },
            },
          },
        },
        400: errorResponse(
          "Body tidak punya `id` atau `consultationId`.",
          "missing_id_or_consultationId"
        ),
        401: UNAUTHORIZED,
        500: errorResponse("Kesalahan database."),
      },
    },
  },

  "/api/prescriptions/{id}": {
    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string" },
        example: "rx_41b0c8e2",
      },
    ],
    get: {
      tags: ["Prescriptions"],
      summary: "Mengambil satu resep",
      responses: {
        200: {
          description: "Resep yang diminta.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PrescriptionRecord" },
            },
          },
        },
        401: UNAUTHORIZED,
        404: errorResponse("Resep tidak ada untuk pengguna ini.", "not_found"),
        500: errorResponse("Kesalahan database."),
      },
    },
    put: {
      tags: ["Prescriptions"],
      summary: "Mengganti resep",
      description: "`id` di body harus sama dengan parameter path.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/PrescriptionRecord" },
          },
        },
      },
      responses: {
        200: {
          description: "Resep yang tersimpan, sudah didekripsi.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PrescriptionRecord" },
            },
          },
        },
        400: errorResponse("`id` di body berbeda dengan id di path.", "id_mismatch"),
        401: UNAUTHORIZED,
        500: errorResponse("Kesalahan database."),
      },
    },
  },

  "/api/prescription/parse": {
    post: {
      tags: ["Prescriptions"],
      summary: "Mengubah teks OCR menjadi item terstruktur",
      description:
        "Browser mentranskrip foto dan hanya mengirim teksnya. LLM memecahnya jadi field obat sambil membaca singkatan resep (`R/`, `S`, `a.c`, `dd`, `1-0-1`). Parser berbasis aturan mengambil alih saat OpenAI tidak tersedia.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                rawText: {
                  type: "string",
                  examples: ["R/ Amoxicillin 500mg tab no. XV\nS 3 dd 1 tab p.c"],
                },
              },
              required: ["rawText"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Item hasil parsing.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: { $ref: "#/components/schemas/PrescriptionItem" },
                  },
                  source: { type: "string", enum: ["openai", "local_fallback"] },
                },
                required: ["items", "source"],
              },
            },
          },
        },
        400: errorResponse("`rawText` kosong.", "missing_text"),
        401: UNAUTHORIZED,
      },
    },
  },

  "/api/medication-info": {
    post: {
      tags: ["Prescriptions"],
      summary: "Menjelaskan obat yang sudah diverifikasi",
      description:
        "Menghasilkan penjelasan umum per item. Dosis, frekuensi, dan aturan pakai disalin dari resep, bukan dibuat model, dan response tidak pernah memuat saran dosis.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  minItems: 1,
                  items: { $ref: "#/components/schemas/PrescriptionItem" },
                },
              },
              required: ["items"],
            },
          },
        },
      },
      responses: {
        200: {
          description: "Satu penjelasan per item yang dikirim, urutannya sama.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  medications: {
                    type: "array",
                    items: { $ref: "#/components/schemas/MedicationInfo" },
                  },
                },
                required: ["medications"],
              },
            },
          },
        },
        400: errorResponse("`items` tidak ada atau kosong.", "missing_items"),
        401: UNAUTHORIZED,
      },
    },
  },

  "/auth/callback": {
    get: {
      tags: ["Auth"],
      summary: "Tujuan redirect OAuth",
      description:
        "Tempat Google mengembalikan pengguna setelah consent. Menukar code jadi cookie sesi lalu meneruskan. Dipanggil browser, bukan API client.",
      security: [],
      parameters: [
        {
          name: "code",
          in: "query",
          required: true,
          schema: { type: "string" },
          description: "Authorization code dari Supabase.",
        },
        {
          name: "next",
          in: "query",
          required: false,
          schema: { type: "string", default: "/consultations" },
          description: "Path tujuan setelah sesi terbentuk.",
        },
      ],
      responses: {
        307: {
          description:
            "Redirect ke `next` bila berhasil, atau ke `/?auth_error=1` bila penukaran gagal.",
        },
      },
    },
  },
};

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "Healthalk API",
    version: "1.0.0",
    description: [
      "Backend Healthalk, aplikasi perjalanan kesehatan berbantuan AI.",
      "",
      "Perjalanannya terdiri dari tiga fase: konsultasi suara yang berbasis evidence,",
      "validasi oleh dokter, dan pemahaman resep.",
      "",
      "## Autentikasi",
      "",
      "Semua endpoint kecuali `/auth/callback` butuh cookie sesi Supabase dari login Google.",
      "Tanpa itu, request dibalas `401 unauthorized`. Batas sesungguhnya adalah Row Level",
      "Security di Postgres: satu user hanya bisa membaca dan menulis barisnya sendiri,",
      "sekalipun handler-nya lupa memfilter.",
      "",
      "## Penanganan data",
      "",
      "Isi konsultasi dan resep disimpan sebagai ciphertext AES-256-GCM yang terikat pada id",
      "pemiliknya, jadi akses langsung ke database tidak menghasilkan apa pun yang terbaca.",
      "Foto resep di-OCR di browser dan tidak pernah diunggah; hanya teks hasilnya yang",
      "sampai ke server.",
      "",
      "## Fallback",
      "",
      "Endpoint yang bergantung pada layanan pihak ketiga (Healthify untuk retrieval, OpenAI",
      "untuk parsing dan penjelasan obat) turun ke logika lokal bila layanan itu tidak",
      "dikonfigurasi atau gagal. Response menyertakan field `source` agar pemanggil tahu",
      "jalur mana yang dipakai.",
    ].join("\n"),
  },
  servers: [{ url: "/", description: "Deployment ini" }],
  tags: [
    { name: "Consultations", description: "Sesi konsultasi yang tersimpan." },
    { name: "Consultation AI", description: "Pembuatan jawaban dan ringkasan." },
    { name: "Prescriptions", description: "Parsing teks OCR, penyimpanan, dan penjelasan obat." },
    { name: "Auth", description: "Login Google lewat Supabase." },
  ],
  security: [{ sessionCookie: [] }],
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "sb-access-token",
        description:
          "Cookie sesi Supabase dari alur login Google. Browser mengirimnya otomatis, dan nama persisnya mengikuti project ref Supabase.",
      },
    },
    schemas,
  },
  paths,
};
