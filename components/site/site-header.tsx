import Link from "next/link";
import { Search } from "lucide-react";
import { unstable_cache } from "next/cache";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site";
import { LogoLink } from "@/components/site/logo-link";

const getHeaderCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      orderBy: { name: "asc" },
      take: 7,
      select: { id: true, name: true, slug: true },
    }),
  ["site-header-categories-v2"],
  { revalidate: 300 },
);

export async function SiteHeader() {
  const [categories, settings] = await Promise.all([getHeaderCategories(), getSiteSettings()]);

  return (
    <header className="border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-14 items-center gap-4">
        <LogoLink name={settings.name} />

        <nav className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="hover:text-foreground transition-colors"
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
              className="w-[220px] pl-9"
              autoComplete="off"
            />
          </form>
          <Link
            href="/admin"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Админ
          </Link>
        </div>
      </div>

      <div className="border-t md:hidden">
        <div className="container flex gap-3 overflow-x-auto py-2 text-sm text-muted-foreground">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="whitespace-nowrap hover:text-foreground transition-colors"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}