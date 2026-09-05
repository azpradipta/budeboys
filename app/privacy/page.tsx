import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { DataControls } from "@/components/privacy/data-controls";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isEncryptionConfigured, isStoredEncrypted } from "@/lib/server/crypto";
import {
  ShieldCheck,
  Lock,
  Eye,
  Database,
  History,
  KeyRound,
  Globe,
  CircleAlert,
  CircleCheck,
  TriangleAlert,
} from "lucide-react";

export const metadata = { title: "Privasi & Keamanan — Healthalk" };

// Halaman ini melaporkan kondisi nyata milik satu pengguna, jadi tidak boleh
// dirender saat build maupun dipakai ulang dari cache bersama.
export const dynamic = "force-dynamic";

const PRIVACY_ITEMS = [
  {
    q: "Data apa yang disimpan?",
    a: "Transcript percakapan, ringkasan konsultasi, informasi gejala, penilaian kesehatan awal, serta hasil pembacaan resep dan informasi obatnya.",
    icon: Database,
  },
  {
    q: "Apakah foto resep ikut disimpan di server?",
    a: "Tidak. Route API membuang imageDataUrl sebelum menulis ke database, jadi yang tersimpan hanya hasil OCR dan field terstrukturnya. Gambar aslinya tetap di perangkat Anda.",
    icon: Eye,
  },
  {
    q: "Untuk apa data ini disimpan?",
    a: "Agar health context Anda tetap tersambung dari konsultasi awal hingga pemahaman resep, tanpa perlu mengulang cerita di setiap tahap.",
    icon: History,
  },
  {
    q: "Siapa yang dapat mengakses data saya?",
    a: "Hanya Anda. Setiap query berjalan sebagai akun Anda dan Postgres Row Level Security menolak baris milik akun lain, bahkan seandainya kode aplikasi lupa memfilter.",
    icon: Lock,
  },
];

const BADGE = {
  on: { text: "Aktif", variant: "outline" as const, Mark: CircleCheck },
  off: { text: "Tidak aktif", variant: "destructive" as const, Mark: CircleAlert },
  warn: { text: "Perhatian", variant: "secondary" as const, Mark: TriangleAlert },
};

function StatusRow({
  icon: Icon,
  label,
  detail,
  state,
}: {
  icon: React.ElementType;
  label: string;
  detail: string;
  state: keyof typeof BADGE;
}) {
  const badge = BADGE[state];
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="flex gap-3">
        <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <Badge variant={badge.variant} className="shrink-0 gap-1">
        <badge.Mark className="size-3" />
        {badge.text}
      </Badge>
    </div>
  );
}

/** Status enkripsi dilaporkan dari dua sisi sekaligus: apakah kuncinya
 * terpasang, dan apakah baris yang benar-benar ada di database sudah berupa
 * ciphertext. Keduanya bisa berbeda, misalnya saat kunci baru dipasang
 * setelah ada record lama. */
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
      detail: "Kunci terpasang. Belum ada record tersimpan untuk diperiksa.",
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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/?login=1&next=%2Fprivacy");

  const [consultations, prescriptions, sample] = await Promise.all([
    supabase.from("consultations").select("id", { count: "exact", head: true }),
    supabase.from("prescriptions").select("id", { count: "exact", head: true }),
    supabase.from("consultations").select("data").limit(1),
  ]);

  const consultationCount = consultations.count ?? 0;
  const prescriptionCount = prescriptions.count ?? 0;

  let keyConfigured = false;
  let keyError: string | null = null;
  try {
    keyConfigured = isEncryptionConfigured();
  } catch (e) {
    keyError = e instanceof Error ? e.message : "APP_ENCRYPTION_KEY tidak valid.";
  }

  const storedRow = sample.data?.[0]?.data;
  const encryption = encryptionStatus(
    keyConfigured,
    storedRow === undefined ? null : isStoredEncrypted(storedRow)
  );

  const proto = (await headers()).get("x-forwarded-proto") ?? "http";
  const isHttps = proto === "https";

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <PageHeader
        eyebrow="Akun"
        title="Privasi & Keamanan"
        description="Status keamanan data kesehatan Anda apa adanya, beserta kendali penuh atas salinan dan penghapusannya."
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

      <Card className="mb-6">
        <CardContent>
          <div className="mb-2 flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            <div>
              <p className="font-heading font-semibold text-foreground">Status keamanan</p>
              <p className="text-xs text-muted-foreground">
                Dibaca dari konfigurasi dan isi database, bukan klaim statis.
              </p>
            </div>
          </div>
          <Separator />

          <div className="divide-y divide-border">
            <StatusRow
              icon={KeyRound}
              label="Enkripsi at rest (AES-256-GCM)"
              detail={encryption.detail}
              state={encryption.state}
            />
            <StatusRow
              icon={Lock}
              label="Isolasi antar-pengguna (Postgres RLS)"
              detail="Kebijakan Row Level Security membatasi setiap baris ke pemiliknya, ditegakkan di database, bukan hanya di kode aplikasi."
              state="on"
            />
            <StatusRow
              icon={Globe}
              label="Enkripsi saat transit"
              detail={
                isHttps
                  ? "Koneksi ke aplikasi ini berjalan di atas HTTPS."
                  : "Koneksi saat ini memakai " +
                    proto.toUpperCase() +
                    ". Wajar untuk pengembangan lokal, tetapi jangan dipakai untuk data kesehatan sungguhan."
              }
              state={isHttps ? "on" : "warn"}
            />
            <StatusRow
              icon={ShieldCheck}
              label="Identitas"
              detail={
                "Masuk lewat Google SSO sebagai " +
                (user.email ?? "akun Anda") +
                ". Healthalk tidak pernah menyimpan kata sandi Anda."
              }
              state="on"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent>
          <div className="mb-3 flex items-center gap-2">
            <Database className="size-5 text-primary" />
            <div>
              <p className="font-heading font-semibold text-foreground">Data Anda</p>
              <p className="text-xs text-muted-foreground">
                Yang tersimpan atas nama akun Anda saat ini.
              </p>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            <Badge variant="secondary">{consultationCount} konsultasi</Badge>
            <Badge variant="secondary">{prescriptionCount} resep</Badge>
          </div>

          <DataControls hasData={consultationCount + prescriptionCount > 0} />

          <p className="mt-3 text-xs text-muted-foreground">
            Penghapusan hanya menyasar data kesehatan. Akun Google Anda tetap aktif dan bisa
            dipakai masuk kembali kapan saja.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Eye className="size-5 text-primary" />
            <div>
              <p className="font-heading font-semibold text-foreground">Pertanyaan umum</p>
              <p className="text-xs text-muted-foreground">
                Transparansi mengenai bagaimana data kesehatan Anda diperlakukan.
              </p>
            </div>
          </div>
          <Separator className="mb-2" />
          <Accordion>
            {PRIVACY_ITEMS.map((item) => (
              <AccordionItem key={item.q} value={item.q}>
                <AccordionTrigger>
                  <span className="flex items-center gap-2">
                    <item.icon className="size-4 text-primary" />
                    {item.q}
                  </span>
                </AccordionTrigger>
                <AccordionContent>{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
