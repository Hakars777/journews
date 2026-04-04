"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Search } from "lucide-react";

type Category = { id: string; name: string; slug: string };

export function MobileMenu({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Открыть меню"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed left-0 top-0 z-50 h-full w-72 bg-background border-r shadow-xl flex flex-col md:hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <span className="jn-headline font-semibold text-sm uppercase tracking-wide">
                Меню
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Закрыть меню"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-center px-4 py-3 text-sm border-b hover:bg-muted transition-colors"
                >
                  {c.name}
                </Link>
              ))}
            </nav>

            <div className="px-4 py-4 border-t space-y-3">
              <Link
                href="/search"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Search className="h-4 w-4" />
                Поиск
              </Link>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Войти в админку
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
