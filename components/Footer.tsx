import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const columns = [
  {
    title: "Layanan",
    links: [
      { label: "Mulai Konsultasi", href: "/consultations" },
      { label: "Riwayat Konsultasi", href: "/consultations/history" },
      { label: "Resep Saya", href: "/prescriptions" },
    ],
  },
  {
    title: "Akun",
    links: [
      { label: "Profil", href: "/profile" },
      { label: "Privasi & Keamanan", href: "/profile#privacy" },
    ],
  },
];

const Footer = () => {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <Link
              href="/"
              className="text-xl font-bold tracking-tighter text-primary"
            >
              Healthalk<span className="text-primary/60">.</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Dari cerita keluhan hingga pemahaman resep, satu perjalanan
              kesehatan yang tetap terhubung.
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              Data kesehatan dienkripsi &amp; access-controlled.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-16">
            {columns.map((col) => (
              <div key={col.title}>
                <p className="text-sm font-semibold text-foreground">
                  {col.title}
                </p>
                <ul className="mt-3 flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Healthalk. Prototype hackathon, bukan
            alat diagnosis medis.
          </p>
          <p>
            AI memberikan informasi awal; keputusan klinis tetap oleh tenaga
            kesehatan.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
