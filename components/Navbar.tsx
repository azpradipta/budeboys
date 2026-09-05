"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LoginDialog } from "@/components/auth/login-dialog";
import { useUser } from "@/lib/auth/use-user";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginNext, setLoginNext] = useState("/consultations");
  const user = useUser();
  const router = useRouter();

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

  // Proxy redirects unauthenticated visits to protected pages back to
  // "/?login=1&next=<original path>" — pick that up and open the dialog.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "1") {
      const next = params.get("next") ?? "/consultations";
      window.history.replaceState(null, "", window.location.pathname);
      // Deferred so this isn't a bare setState call in the effect body.
      Promise.resolve().then(() => {
        setLoginNext(next);
        setLoginOpen(true);
      });
    }
  }, []);

  const openLogin = useCallback((next?: string) => {
    if (next) setLoginNext(next);
    setLoginOpen(true);
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const navLinks = [
    { title: "Beranda", href: "/" },
    { title: "Konsultasi", href: "/consultations" },
    { title: "Riwayat", href: "/consultations/history" },
    { title: "Resep", href: "/prescriptions" },
  ];

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const displayName = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "";
  const initials = displayName ? displayName.charAt(0).toUpperCase() : "?";

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
          className="text-2xl font-bold tracking-tighter text-primary shrink-0"
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

        <div className="hidden md:flex items-center gap-3 shrink-0">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" className="gap-2 px-1.5" />}
              >
                <Avatar size="sm">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="max-w-32 truncate text-sm">{displayName}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/profile")}>
                  <UserIcon className="size-4" />
                  Profil
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                  <LogOut className="size-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" onClick={() => openLogin("/profile")}>
              Masuk
            </Button>
          )}

          {user ? (
            <Button render={<Link href="/consultations" />}>Mulai Konsultasi</Button>
          ) : (
            <Button onClick={() => openLogin("/consultations")}>Mulai Konsultasi</Button>
          )}
        </div>

        <div className="md:hidden shrink-0 flex items-center">
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
        className={`fixed inset-0 bg-black/40 z-60 transition-opacity duration-300 md:hidden ${
          isMobileMenuOpen ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <div
        className={`fixed top-0 right-0 h-full w-75 bg-white z-70 shadow-xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
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
            {user ? (
              <>
                <div className="flex items-center gap-2 px-1 pb-2">
                  <Avatar size="sm">
                    {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium">{displayName}</span>
                </div>
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  render={<Link href="/profile" onClick={() => setIsMobileMenuOpen(false)} />}
                >
                  Profil
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    void handleSignOut();
                  }}
                >
                  <LogOut className="size-4" />
                  Keluar
                </Button>
                <Button
                  className="w-full"
                  render={
                    <Link href="/consultations" onClick={() => setIsMobileMenuOpen(false)} />
                  }
                >
                  Mulai Konsultasi
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="w-full rounded-full"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openLogin("/profile");
                  }}
                >
                  Masuk
                </Button>
                <Button
                  className="w-full"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openLogin("/consultations");
                  }}
                >
                  Mulai Konsultasi
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} next={loginNext} />
    </>
  );
}
