import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Manrope } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TooltipProvider } from "@/components/ui/tooltip";

import { cn } from "@/lib/utils";

const manropeHeading = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Healthalk",
  description: "Perjalanan kesehatan berbantuan AI, dari keluhan hingga pengobatan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id" // Ubah ke "id" jika target utama bahasa Indonesia
      className={cn("font-sans", inter.variable, manropeHeading.variable)}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased bg-slate-50`}
        suppressHydrationWarning
      >
        <TooltipProvider>
          <Navbar />

          <main className="flex-1">{children}</main>

          <Footer />
        </TooltipProvider>
      </body>
    </html>
  );
}
