import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoginDialogProvider } from "@/components/auth/login-dialog-context";

import { cn } from "@/lib/utils";

const manropeHeading = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

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
      lang="id"
      className={cn("font-sans", inter.variable, manropeHeading.variable)}
    >
      <body
        className="min-h-screen flex flex-col antialiased bg-slate-50"
        suppressHydrationWarning
      >
        <TooltipProvider>
          <LoginDialogProvider>
            <Navbar />

            <main className="flex-1">{children}</main>

            <Footer />
          </LoginDialogProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
