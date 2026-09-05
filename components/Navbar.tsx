"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isMobileMenuOpen]);

  const navLinks = [
    { title: "Beranda", href: "/" },
    { title: "Konsultasi", href: "/consultations" },
    { title: "Riwayat", href: "/consultations/history" },
    { title: "Resep", href: "/prescriptions" },
    { title: "Rekam Medis", href: "/records" },
  ];

  return (
    <>
      <header
        className={`fixed z-50 transition-all duration-500 ease-in-out left-0 right-0 mx-auto flex items-center justify-between ${
          isScrolled
            ? "top-3 w-[95%] sm:w-[92%] max-w-5xl bg-white/90 backdrop-blur-md border border-slate-200 shadow-lg py-3 px-5 md:px-8 rounded-3xl"
            : "top-0 w-full max-w-full bg-transparent border-transparent py-5 px-5 md:px-12 rounded-none"
        }`}
      >
        <Link
          href="/"
          className="text-2xl font-bold tracking-tighter text-primary flex-shrink-0"
        >
          Healthalk<span className="text-primary/60">.</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link, idx) => (
            <Link
              key={idx}
              href={link.href}
              className="text-sm font-medium text-slate-600 hover:text-primary transition-colors"
            >
              {link.title}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <Button variant="ghost" render={<Link href="/profile" />}>
            Profil
          </Button>
          <Button render={<Link href="/consultations" />}>Mulai Konsultasi</Button>
        </div>

        <div className="md:hidden flex-shrink-0 flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-slate-900"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </header>

      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div
        className={`fixed top-0 right-0 h-full w-[300px] bg-white z-[70] shadow-xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <span className="text-lg font-bold">Menu</span>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <nav className="flex flex-col gap-6">
            {navLinks.map((link, idx) => (
              <Link
                key={idx}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-lg font-medium text-slate-800 hover:text-primary transition-colors"
              >
                {link.title}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-3 mt-8 pt-6 border-t">
            <Button
              variant="outline"
              className="w-full rounded-full"
              render={<Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} />}
            >
              Profil
            </Button>
            <Button
              className="w-full"
              render={<Link href="/consultations" onClick={() => setIsMobileMenuOpen(false)} />}
            >
              Mulai Konsultasi
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
