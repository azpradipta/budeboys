const PENDING_KEY = "healthalk:scrollToSection";

// Scroll ke section tanpa mengubah URL, tidak seperti href="#id" biasa.
// Bila halaman tujuan belum ter-mount, consumePendingScroll yang melanjutkan.
export function scrollToSection(id: string, router: { push: (href: string) => void }) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  sessionStorage.setItem(PENDING_KEY, id);
  router.push("/");
}

// Menuntaskan scroll yang tertunda dari klik navigasi antarhalaman.
export function consumePendingScroll() {
  const id = sessionStorage.getItem(PENDING_KEY);
  if (!id) return;
  sessionStorage.removeItem(PENDING_KEY);
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
