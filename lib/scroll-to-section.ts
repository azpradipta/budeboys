const PENDING_KEY = "healthalk:scrollToSection";

/** Smoothly scrolls to a same-page section by id, without ever touching the
 * URL (no `#id` fragment) — best-practice for same-page nav links: a real
 * `href="#id"` jumps instantly, adds a history entry, and leaves an ugly
 * fragment in the address bar. If we're not even on "/" yet, it navigates
 * there first and finishes the scroll once that page has mounted (see
 * `consumePendingScroll`, used by components/scroll-to-pending.tsx). */
export function scrollToSection(id: string, router: { push: (href: string) => void }) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  sessionStorage.setItem(PENDING_KEY, id);
  router.push("/");
}

/** Called once on mount by the page that hosts these sections — scrolls to
 * whatever section (if any) a cross-page nav click was waiting on. */
export function consumePendingScroll() {
  const id = sessionStorage.getItem(PENDING_KEY);
  if (!id) return;
  sessionStorage.removeItem(PENDING_KEY);
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
