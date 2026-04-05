"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Menu, X, Search } from "lucide-react";
import { MobileRadioPlayerPanel } from "@/components/site/radio-player-button";

type Category = { id: string; name: string; slug: string };

export function MobileMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  const menuContent =
    open && mounted
      ? createPortal(
          <div className="md:hidden">
            <div
              className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-[1px]"
              onClick={closeMenu}
              aria-hidden="true"
            />

            <div
              className="fixed inset-y-0 left-0 z-[100] w-full max-w-[22rem] border-r bg-background shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Мобильное меню"
            >
              <div className="flex h-[100dvh] min-h-[100dvh] flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b px-4 py-4">
                  <span className="jn-headline text-sm font-semibold uppercase tracking-wide">
                    Меню
                  </span>
                  <button
                    onClick={closeMenu}
                    className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Закрыть меню"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  {categories.map((c) => (
                    <Link
                      key={c.id}
                      href={`/category/${c.slug}`}
                      onClick={closeMenu}
                      className="flex items-center border-b px-4 py-3 text-sm transition-colors hover:bg-muted"
                    >
                      {c.name}
                    </Link>
                  ))}
                </nav>

                <div className="shrink-0 border-t px-4 py-4">
                  <div className="space-y-3">
                    <MobileRadioPlayerPanel />
                    <Link
                      href="/search"
                      onClick={closeMenu}
                      className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Search className="h-4 w-4" />
                      Поиск
                    </Link>
                    <Link
                      href="/admin"
                      onClick={closeMenu}
                      className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Войти в админку
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Открыть меню"
      >
        <Menu className="h-5 w-5" />
      </button>

      {menuContent}
    </>
  );
}
