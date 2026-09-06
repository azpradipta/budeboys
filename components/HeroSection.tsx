"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProtectedLinkButton } from "@/components/protected-link-button";
import { scrollToSection } from "@/lib/scroll-to-section";
import { ArrowRight, PlayCircle } from "lucide-react";

export default function Hero() {
  const router = useRouter();

  return (
    <section className="relative w-full max-w-6xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
      <div className="max-w-6xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl  font-extrabold text-foreground leading-[1.1] tracking-tight mb-6">
          Ceritakan Sekali. <br className="hidden md:block" /> Terhubung
          Sepenuhnya{" "}
          <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-primary/80">
            Hingga Sembuh.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-3xl mx-auto">
          Tinggalkan cara lama mengulang keluhan. Asisten AI kami menjembatani
          analisis gejala awal, ringkasan medis untuk dokter, hingga pemahaman
          resep obat dalam satu perjalanan yang mulus.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <ProtectedLinkButton size="lg">
            Mulai Analisis Gejala
            <ArrowRight className="ml-2 " />
          </ProtectedLinkButton>

          <Button
            size="lg"
            variant="outline"
            onClick={() => scrollToSection("journey", router)}
          >
            <PlayCircle className="mr-2  text-muted-foreground" />
            Cara Kerjanya
          </Button>
        </div>
      </div>
    </section>
  );
}
