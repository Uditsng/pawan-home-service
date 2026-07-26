"use client";

export default function SkipToContent() {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const main = document.querySelector<HTMLElement>("main");
    if (main) {
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: false });
      main.scrollIntoView({ behavior: "smooth" });
      main.addEventListener("blur", () => main.removeAttribute("tabindex"), { once: true });
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleClick}
      className="fixed -top-40 left-4 z-[100] px-4 py-2.5 bg-primary text-on-primary text-sm font-bold rounded-xl shadow-xl focus:top-4 transition-all duration-200 outline-none focus:ring-4 focus:ring-secondary/50"
    >
      Skip to main content
    </a>
  );
}
