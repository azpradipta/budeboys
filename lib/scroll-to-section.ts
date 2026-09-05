const PENDING_KEY = "healthalk:scrollToSection";

/** Scroll ke section di halaman yang sama tanpa mengubah URL. `href="#id"`
 * asli akan melompat kasar, menambah history, dan menyisakan fragment di
 * address bar. Bila halaman tujuan belum ter-mount, fungsi ini pindah dulu
 * dan `consumePendingScroll` yang menyelesaikan. */
export function scrollToSection(id: string, router: { push: (href: string) => void }) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  sessionStorage.setItem(PENDING_KEY, id);
  router.push("/");
}

/** Dipanggil saat mount oleh halaman pemilik section, untuk menuntaskan
 * scroll yang tertunda dari klik navigasi antarhalaman. */
export function consumePendingScroll() {
  const id = sessionStorage.getItem(PENDING_KEY);
  if (!id) return;
  sessionStorage.removeItem(PENDING_KEY);
  requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}
