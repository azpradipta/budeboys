import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, Manrope } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Healthalk",
  description: "AI-assisted healthcare journey — from symptoms to treatment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={cn("font-sans", inter.variable, manropeHeading.variable)}
    >
      <body
        className="min-h-screen flex flex-col antialiased bg-slate-50"
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
