import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, PlayCircle } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative w-full max-w-6xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
      <div className="max-w-3xl">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-[1.1] tracking-tight mb-6">
          Ceritakan Sekali. <br className="hidden md:block" /> Terhubung
          Sepenuhnya{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/80">
            Hingga Sembuh.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
          Tinggalkan cara lama mengulang keluhan. Asisten AI kami menjembatani
          analisis gejala awal, ringkasan medis untuk dokter, hingga pemahaman
          resep obat dalam satu perjalanan yang mulus.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Button size="lg">
            Mulai Analisis Gejala
            <ArrowRight className="ml-2 " />
          </Button>

          <Button size="lg" variant="outline">
            <PlayCircle className="mr-2  text-muted-foreground" />
            Cara Kerjanya
          </Button>
        </div>
      </div>
    </section>
  );
}
