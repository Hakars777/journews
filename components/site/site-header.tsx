import Link from "next/link";
import { Search, Rss } from "lucide-react";
import { unstable_cache } from "next/cache";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site";
import { LogoLink } from "@/components/site/logo-link";
import { MobileMenu } from "@/components/site/mobile-menu";
import { BreakingTicker } from "@/components/site/breaking-ticker";

const getHeaderCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      orderBy: { name: "asc" },
      take: 7,
      select: { id: true, name: true, slug: true },
    }),
  ["site-header-categories-v2"],
  { revalidate: 300, tags: ["categories"] },
);

export async function SiteHeader() {
  const [categories, settings] = await Promise.all([
    getHeaderCategories() as Promise<{ id: string; name: string; slug: string }[]>,
    getSiteSettings(),
  ]);

  const now = new Date();
  const dateStr = now.toLocaleDateString("ru-RU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="sticky top-0 z-30 bg-background shadow-sm">
      {/* Top bar: date + RSS + admin */}
      <div className="border-b bg-muted/50">
        <div className="container flex h-8 items-center justify-between text-xs text-muted-foreground">
          <span className="capitalize hidden sm:block">{dateStr}</span>
          <div className="flex items-center gap-4 ml-auto">
            <a
              href="/rss.xml"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
              aria-label="RSS лента"
            >
              <Rss className="h-3 w-3" />
              RSS
            </a>
            <Link
              href="/admin"
              className="hover:text-foreground transition-colors"
            >
              Войти
            </Link>
          </div>
        </div>
      </div>

      {/* Main header: logo + nav + search + mobile burger */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container flex h-14 items-center gap-4">
          <LogoLink name={settings.name} />

          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground ml-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="hover:text-foreground transition-colors font-medium"
              >
                {c.name}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <form action="/search" className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                placeholder="Поиск"
                className="w-[190px] pl-9 h-8 text-sm"
                autoComplete="off"
              />
            </form>
            <MobileMenu categories={categories} />
          </div>
        </div>
      </div>

      {/* Breaking news ticker */}
      <BreakingTicker />
    </header>
  );
}
