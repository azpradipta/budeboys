import DashboardHeader from "@/components/DashboardHeader";
import { DataControls } from "@/components/privacy/data-controls";
import { PolicyDocument } from "@/components/privacy/policy-document";
import { SignInPrompt } from "@/components/privacy/sign-in-prompt";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isEncryptionConfigured, isStoredEncrypted } from "@/lib/server/crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CircleAlert, CircleCheck } from "lucide-react";
import { headers } from "next/headers";

export const metadata = {
  title: "Privasi & Keamanan — Healthalk",
  description:
    "Kebijakan privasi Healthalk, status keamanan yang sedang berlaku, dan kendali atas data kesehatan Anda.",
};

// Membaca sesi dan kondisi nyata, jadi tidak boleh dirender saat build.
export const dynamic = "force-dynamic";

const BADGE = {
  on: { text: "Aktif", variant: "outline" as const },
  off: { text: "Tidak aktif", variant: "destructive" as const },
  warn: { text: "Perhatian", variant: "secondary" as const },
};

/** Tanpa ikon, agar halaman ini terbaca sebagai dokumen. */
function StatusRow({
  label,
  detail,
  state,
}: {
  label: string;
  detail: string;
  state: keyof typeof BADGE;
}) {
  const badge = BADGE[state];
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
      </div>
      <Badge variant={badge.variant} className="mt-0.5 shrink-0">
        {badge.text}
      </Badge>
    </div>
  );
}

/** Dilaporkan dari dua sisi: kuncinya terpasang atau tidak, dan baris yang
 * ada di database sudah ciphertext atau belum. Keduanya bisa berbeda. */
function encryptionStatus(keyConfigured: boolean, storedIsCiphertext: boolean | null) {
  if (!keyConfigured) {
    return {
      state: "off" as const,
      detail:
        "APP_ENCRYPTION_KEY belum diisi, sehingga record kesehatan tersimpan sebagai teks biasa.",
    };
  }
  if (storedIsCiphertext === null) {
    return {
      state: "on" as const,
      detail:
        "Kunci terpasang, dan setiap record kesehatan dienkripsi sebelum ditulis ke database.",
    };
  }
  if (!storedIsCiphertext) {
    return {
      state: "warn" as const,
      detail:
        "Kunci terpasang, tetapi masih ada record lama yang tersimpan sebagai teks biasa. Record itu ikut terenkripsi saat berikutnya diperbarui.",
    };
  }
  return {
    state: "on" as const,
    detail:
      "Kunci terpasang dan record Anda tersimpan sebagai ciphertext yang terikat pada user id Anda.",
  };
}

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;

  // Terbuka untuk umum karena tertaut dari footer; hanya tab "Data Anda"
  // yang butuh sesi.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let consultationCount = 0;
  let prescriptionCount = 0;
  let storedIsCiphertext: boolean | null = null;

  if (user) {
    const [consultations, prescriptions, sample] = await Promise.all([
      supabase.from("consultations").select("id", { count: "exact", head: true }),
      supabase.from("prescriptions").select("id", { count: "exact", head: true }),
      supabase.from("consultations").select("data").limit(1),
    ]);
    consultationCount = consultations.count ?? 0;
    prescriptionCount = prescriptions.count ?? 0;
    const storedRow = sample.data?.[0]?.data;
    storedIsCiphertext = storedRow === undefined ? null : isStoredEncrypted(storedRow);
  }

  let keyConfigured = false;
  let keyError: string | null = null;
  try {
    keyConfigured = isEncryptionConfigured();
  } catch (e) {
    keyError = e instanceof Error ? e.message : "APP_ENCRYPTION_KEY tidak valid.";
  }
  const encryption = encryptionStatus(keyConfigured, storedIsCiphertext);

  const proto = (await headers()).get("x-forwarded-proto") ?? "http";
  const isHttps = proto === "https";

  const ragEnabled = Boolean(process.env.RAG_API_KEY);
  const openaiEnabled = Boolean(process.env.OPENAI_API_KEY);

  return (
    <div className="mx-auto max-w-6xl px-6 py-26 space-y-6">
      <DashboardHeader
              heading="Privasi & Keamanan"
              subHeading="Kebijakan privasi Healthalk, status perlindungan yang sedang berlaku, dan kendali penuh atas data kesehatan Anda."
            />

      {deleted === "1" && (
        <Alert className="mb-6">
          <CircleCheck className="size-4" />
          <AlertDescription>
            Seluruh konsultasi dan resep Anda sudah dihapus permanen dari database.
          </AlertDescription>
        </Alert>
      )}

      {keyError && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert className="size-4" />
          <AlertDescription>Konfigurasi enkripsi bermasalah: {keyError}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="kebijakan">
        <TabsList variant="line" className="mb-4">
          <TabsTrigger value="kebijakan">Kebijakan Privasi</TabsTrigger>
          <TabsTrigger value="keamanan">Keamanan</TabsTrigger>
          <TabsTrigger value="data">Data Anda</TabsTrigger>
        </TabsList>

        <TabsContent value="kebijakan">
          <Card>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Dokumen ini menjelaskan data apa yang Healthalk kumpulkan, ke mana data itu
                mengalir, berapa lama disimpan, dan apa yang bisa Anda lakukan terhadapnya.
                Setiap pernyataan di sini mengikuti perilaku kode yang sedang berjalan, dan bisa
                Anda periksa silang lewat tab Keamanan.
              </p>
              <Separator className="my-5" />
              <PolicyDocument
                ragEnabled={ragEnabled}
                openaiEnabled={openaiEnabled}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keamanan">
          <Card>
            <CardContent>
              <p className="font-heading font-semibold text-foreground">
                Status perlindungan saat ini
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Dibaca langsung dari konfigurasi dan isi database setiap kali halaman ini dibuka,
                bukan klaim yang ditulis sekali lalu ditinggalkan.
              </p>
              <Separator className="my-4" />

              <div className="divide-y divide-border">
                <StatusRow
                  label="Enkripsi at rest (AES-256-GCM)"
                  detail={encryption.detail}
                  state={encryption.state}
                />
                <StatusRow
                  label="Isolasi antar-pengguna (Postgres Row Level Security)"
                  detail="Kebijakan RLS membatasi setiap baris ke pemiliknya dan ditegakkan di database, sehingga tetap berlaku sekalipun kode aplikasi keliru memfilter."
                  state="on"
                />
                <StatusRow
                  label="Enkripsi saat transit"
                  detail={
                    isHttps
                      ? "Koneksi ke aplikasi ini berjalan di atas HTTPS."
                      : "Koneksi saat ini memakai " +
                        proto.toUpperCase() +
                        ". Wajar untuk pengembangan lokal, tetapi tidak layak dipakai untuk data kesehatan sungguhan."
                  }
                  state={isHttps ? "on" : "warn"}
                />
                <StatusRow
                  label="Identitas"
                  detail={
                    user
                      ? "Masuk lewat Google SSO sebagai " +
                        (user.email ?? "akun Anda") +
                        ". Healthalk tidak pernah menerima kata sandi Anda."
                      : "Masuk memakai Google SSO. Healthalk tidak pernah menerima maupun menyimpan kata sandi Anda."
                  }
                  state="on"
                />
                <StatusRow
                  label="Pengiriman ke RAG API"
                  detail={
                    ragEnabled
                      ? "Aktif. Kalimat keluhan dan health context sesi dikirim ke layanan ini untuk menyusun jawaban berbasis evidence. Identitas Anda tidak ikut dikirim."
                      : "Tidak aktif. Konsultasi dijawab sepenuhnya oleh mesin aturan dan basis pengetahuan lokal, tanpa data yang keluar."
                  }
                  state={ragEnabled ? "warn" : "on"}
                />
                <StatusRow
                  label="Pengiriman ke OpenAI"
                  detail={
                    openaiEnabled
                      ? "Aktif. Teks hasil OCR resep dan rincian obat dikirim untuk diuraikan dan dijelaskan. Gambar resep serta identitas Anda tidak ikut dikirim."
                      : "Tidak aktif. Resep diuraikan oleh parser aturan dan dijelaskan dari basis pengetahuan lokal, tanpa data yang keluar."
                  }
                  state={openaiEnabled ? "warn" : "on"}
                />
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Label Perhatian pada dua baris terakhir bukan berarti ada yang rusak. Itu
                menandai bahwa data Anda memang meninggalkan sistem ini menuju pihak ketiga,
                sesuai bagian 5 pada Kebijakan Privasi.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardContent>
              <p className="font-heading font-semibold text-foreground">Data Anda</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {user
                  ? "Yang tersimpan atas nama akun Anda saat ini."
                  : "Masuk untuk melihat apa yang tersimpan dan mengelolanya."}
              </p>
              <Separator className="my-4" />

              {user ? (
                <>
                  <div className="mb-5 flex flex-wrap gap-2">
                    <Badge variant="secondary">{consultationCount} konsultasi</Badge>
                    <Badge variant="secondary">{prescriptionCount} resep</Badge>
                  </div>

                  <DataControls hasData={consultationCount + prescriptionCount > 0} />

                  <p className="mt-3 text-xs text-muted-foreground">
                    Penghapusan hanya menyasar data kesehatan. Akun Google Anda tetap aktif dan
                    bisa dipakai masuk kembali kapan saja.
                  </p>
                </>
              ) : (
                <>
                  <SignInPrompt />
                  <p className="mt-3 text-xs text-muted-foreground">
                    Setelah masuk, Anda bisa mengunduh seluruh data kesehatan Anda sebagai satu
                    berkas JSON, atau menghapusnya permanen.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
