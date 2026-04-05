import Link from "next/link";
import { Rss } from "lucide-react";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site";

const getFooterCategories = unstable_cache(
  async () =>
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ["footer-categories"],
  { revalidate: 300, tags: ["categories"] },
);

export async function SiteFooter() {
  const [settings, categories] = await Promise.all([
    getSiteSettings(),
    getFooterCategories() as Promise<{ id: string; name: string; slug: string }[]>,
  ]);

  return (
    <footer className="border-t bg-muted/30 mt-8">
      <div className="container py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-3">
              <span className="h-3 w-3 rounded-sm bg-primary" aria-hidden />
              <span className="jn-headline text-base font-semibold uppercase tracking-wide">
                {settings.name}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {settings.description}
            </p>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide mb-3">
              Рубрики
            </h4>
            <ul className="grid gap-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/category/${c.slug}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide mb-3">
              Навигация
            </h4>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Главная
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-foreground transition-colors">
                  Поиск
                </Link>
              </li>
              <li>
                <a
                  href="/rss.xml"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <Rss className="h-3.5 w-3.5" />
                  RSS-лента
                </a>
              </li>
            </ul>
          </div>

          {/* For editors */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide mb-3">
              Редакция
            </h4>
            <ul className="grid gap-2 text-sm text-muted-foreground">
              <li>
                <Link href="/admin" className="hover:text-foreground transition-colors">
                  Войти в систему
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} {settings.name}. Все права защищены.</p>
          <p>Все материалы сайта защищены авторским правом.</p>
        </div>
      </div>
    </footer>
  );
}
