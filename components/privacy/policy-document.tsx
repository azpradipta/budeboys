import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

/**
 * Kebijakan privasi, terpisah dari tab Keamanan yang melaporkan status
 * runtime. Isinya sengaja ditulis mengikuti perilaku kode yang benar-benar
 * berjalan, bukan template hukum umum — setiap klaim di sini bisa ditelusuri
 * ke berkas yang disebut.
 */

function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-border py-6 first:border-t-0 first:pt-0">
      <h3 className="font-heading text-base font-semibold text-foreground">
        <span className="mr-2 text-primary">{n}.</span>
        {title}
      </h3>
      <div className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <span>{children}</span>
    </li>
  );
}

function Processor({
  name,
  host,
  active,
  receives,
  note,
}: {
  name: string;
  host: string;
  active: boolean | null;
  receives: string;
  note?: string;
}) {
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">{name}</span>
        <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{host}</code>
        {active === null ? (
          <Badge variant="outline">Selalu aktif</Badge>
        ) : active ? (
          <Badge variant="secondary">Aktif</Badge>
        ) : (
          <Badge variant="outline">Tidak aktif</Badge>
        )}
      </div>
      <p className="mt-2 text-sm">
        <span className="font-medium text-foreground">Menerima: </span>
        {receives}
      </p>
      {note && <p className="mt-1 text-xs">{note}</p>}
    </li>
  );
}

export function PolicyDocument({
  healthifyEnabled,
  openaiEnabled,
}: {
  healthifyEnabled: boolean;
  openaiEnabled: boolean;
}) {
  return (
    <div className="flex flex-col">
      <Section n={1} title="Ringkasan">
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>
            Healthalk menyimpan cerita keluhan dan hasil pembacaan resep Anda supaya
            konteksnya tidak hilang saat berpindah tahap.
          </li>
          <li>Foto resep tidak pernah dikirim ke server kami.</li>
          <li>Record Anda hanya bisa dibaca oleh akun Anda sendiri.</li>
          <li>Anda bisa mengunduh atau menghapus seluruh data kapan saja.</li>
          <li>
            Ini prototipe hackathon dan bukan alat diagnosis. Keputusan klinis tetap milik
            tenaga kesehatan.
          </li>
        </ul>
      </Section>

      <Section n={2} title="Data yang kami kumpulkan">
        <ul className="flex flex-col gap-3">
          <Item label="Identitas">
            User id, alamat email, nama tampilan, dan URL foto profil, yang datang dari akun
            Google Anda lewat Supabase Auth.
          </Item>
          <Item label="Isi konsultasi">
            Transcript percakapan, gejala yang terdeteksi, health context, ringkasan sesi,
            penilaian awal beserta tingkat risikonya, dan rujukan evidence yang dipakai.
          </Item>
          <Item label="Isi resep">
            Teks hasil pembacaan OCR, field terstrukturnya (nama obat, kekuatan, frekuensi,
            rute, instruksi), penjelasan obat, dan status verifikasinya.
          </Item>
          <Item label="Teknis">
            Hanya cookie sesi yang membuat Anda tetap masuk. Tidak ada analytics pihak ketiga,
            tidak ada iklan, tidak ada pelacakan lintas situs.
          </Item>
        </ul>
      </Section>

      <Section n={3} title="Yang tidak pernah kami terima">
        <ul className="flex flex-col gap-3">
          <Item label="Foto resep asli">
            OCR dijalankan di dalam browser Anda memakai Tesseract WASM. Berkas gambarnya hanya
            berada di memori tab dan dibuang begitu OCR selesai; route API pun membuang field
            gambarnya sebelum menulis apa pun ke database. Yang tersimpan hanya teksnya.
          </Item>
          <Item label="Kata sandi">
            Masuk memakai Google SSO, jadi kata sandi Anda tidak pernah melewati Healthalk.
          </Item>
          <Item label="Rekaman suara Anda, oleh kami">
            Dikte memakai Web Speech API bawaan browser. Perlu Anda ketahui: di Chrome dan Edge,
            pengenalan ucapan diproses di server milik pembuat browser, sehingga audionya
            dikirim ke pihak tersebut, bukan ke Healthalk. Bila Anda tidak menghendakinya,
            gunakan input teks.
          </Item>
        </ul>
      </Section>

      <Section n={4} title="Untuk apa data ini dipakai">
        <p>
          Menjaga health context tetap tersambung antar tahap, menyusun informasi awal yang
          dapat ditelusuri ke sumbernya, dan membantu Anda memahami isi resep.
        </p>
        <p>
          Data Anda tidak dijual, tidak dipakai untuk iklan, dan tidak dipakai melatih model apa
          pun milik kami.
        </p>
      </Section>

      <Section n={5} title="Pihak ketiga yang ikut memproses">
        <p>
          Status di bawah dibaca dari konfigurasi yang sedang berjalan. Integrasi yang tidak
          aktif berarti tidak ada data yang dikirim ke sana sama sekali, karena aplikasi memakai
          mesin aturan dan basis pengetahuan lokalnya.
        </p>
        <ul className="flex flex-col gap-2">
          <Processor
            name="Supabase"
            host="*.supabase.co"
            active={null}
            receives="Identitas akun serta record konsultasi dan resep Anda."
            note="Bila kunci enkripsi terpasang, record tersimpan sebagai ciphertext AES-256-GCM, sehingga akses langsung ke database tidak menghasilkan isi yang terbaca."
          />
          <Processor
            name="Google"
            host="accounts.google.com"
            active={null}
            receives="Permintaan autentikasi saat Anda masuk."
            note="Healthalk hanya menerima profil dasar Anda sebagai hasilnya."
          />
          <Processor
            name="Healthify Intelligence API"
            host="healthify.twenti.studio"
            active={healthifyEnabled}
            receives="Kalimat keluhan yang Anda tulis atau ucapkan, health context sesi tersebut, dan id sesi konsultasi."
            note="Id sesi adalah id konsultasi internal, bukan identitas Anda. Nama dan email Anda tidak ikut dikirim."
          />
          <Processor
            name="OpenAI"
            host="api.openai.com"
            active={openaiEnabled}
            receives="Teks hasil OCR resep, serta nama, kekuatan, frekuensi, rute, dan instruksi obat."
            note="Gambar resep dan identitas Anda tidak ikut dikirim."
          />
        </ul>
      </Section>

      <Section n={6} title="Cookie dan penyimpanan di perangkat">
        <ul className="flex flex-col gap-3">
          <Item label="Cookie sesi">
            Bernama <code className="rounded bg-muted px-1 py-0.5 text-xs">sb-…-auth-token</code>{" "}
            beserta pecahannya. Menyimpan sesi login Anda, dengan path{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">/</code> dan{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">SameSite=Lax</code>. Tanpa ini
            Anda tidak bisa tetap masuk.
          </Item>
          <Item label="Cookie sementara proses login">
            Verifier PKCE yang hanya hidup selama proses masuk berlangsung, lalu dihapus setelah
            kode ditukar menjadi sesi.
          </Item>
          <Item label="Session storage">
            Satu kunci untuk menuntaskan scroll antar halaman. Tidak berisi data kesehatan.
          </Item>
          <Item label="Tidak ada">
            Cookie iklan, cookie analytics, maupun pixel pelacak.
          </Item>
        </ul>
      </Section>

      <Section n={7} title="Penyimpanan dan retensi">
        <p>
          Record Anda disimpan sampai Anda sendiri menghapusnya. Tidak ada penghapusan otomatis
          setelah jangka waktu tertentu.
        </p>
        <p>
          Setiap baris terikat pada user id pemiliknya dan dijaga Row Level Security di sisi
          database, sehingga akun lain tidak bisa membacanya meskipun kode aplikasi keliru.
        </p>
        <p>
          Menghapus data di sini tidak serta-merta menghapus jejak pemrosesan di pihak ketiga
          pada bagian 5; retensi mereka tunduk pada kebijakan masing-masing.
        </p>
      </Section>

      <Section n={8} title="Hak Anda dan cara memakainya">
        <ul className="flex flex-col gap-3">
          <Item label="Melihat">
            Tab Keamanan menunjukkan status perlindungan yang sedang berlaku, dibaca langsung
            dari sistem, bukan dari teks ini.
          </Item>
          <Item label="Portabilitas">
            Tombol Unduh data saya di tab Data Anda memberi satu berkas JSON berisi seluruh
            konsultasi dan resep Anda dalam bentuk yang sudah terbaca.
          </Item>
          <Item label="Penghapusan">
            Tombol Hapus semua data menghapus permanen seluruh konsultasi beserta resepnya.
            Salinan yang terlanjur Anda unduh tidak ikut terhapus, dan akun Google Anda tetap
            aktif.
          </Item>
        </ul>
      </Section>

      <Section n={9} title="Batas layanan">
        <p>
          Healthalk memberi informasi dan penilaian awal, bukan diagnosis. Jangan memakainya
          untuk menunda pertolongan medis. Bila Anda mengalami tanda kegawatan, segera hubungi
          layanan darurat atau fasilitas kesehatan terdekat.
        </p>
      </Section>

      <Section n={10} title="Perubahan kebijakan">
        <p>
          Kebijakan ini menggambarkan perilaku kode yang sedang berjalan, bukan rencana. Bila
          perilakunya berubah, halaman ini ikut berubah. Status pada tab Keamanan dibaca langsung
          dari konfigurasi dan isi database, jadi bisa Anda pakai untuk memeriksa klaim di sini.
        </p>
      </Section>
    </div>
  );
}
