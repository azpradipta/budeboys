import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Manrope } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
// Import Footer kamu di sini (pastikan file-nya sudah ada)
// import Footer from "@/components/Footer";

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
  title: "IngatSehat",
  description: "Accessible healthcare assistant",
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
      >
        <Navbar />

        <main className="flex-1">{children}</main>

        {/* <Footer /> */}
      </body>
    </html>
  );
}
