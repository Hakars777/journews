import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { PaginationLinks } from "@/components/site/pagination";
import { SiteSidebar } from "@/components/site/site-sidebar";
import { NewsCardRow } from "@/components/news/news-cards";
import { Input } from "@/components/ui/input";
import { prisma } from "@/lib/prisma";
import { isPostgres } from "@/lib/db";
import { getPagination, pageCount, parsePage } from "@/lib/pagination";
import { buildNewsSearchWhere, searchNewsByFts } from "@/lib/search";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export function generateMetadata({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): Metadata {
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  if (!q) return { title: "Поиск" };
  return { title: `Поиск: ${q}` };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const page = parsePage(searchParams.page);
  const { skip, take } = getPagination(page, PAGE_SIZE);

  const newsSelect = {
    id: true,
    slug: true,
    title: true,
    lead: true,
    coverImage: true,
    publishedAt: true,
    category: { select: { name: true, slug: true } },
    author: { select: { name: true, slug: true } },
  } as const;

  let total = 0;
  let items: Awaited<ReturnType<typeof prisma.news.findMany<{ select: typeof newsSelect }>>> = [];

  if (q) {
    if (isPostgres()) {
      // Full-text search via PostgreSQL tsvector (production / Supabase)
      const { ids, total: ftsTotal } = await searchNewsByFts(q, skip, take);
      total = ftsTotal;
      if (ids.length) {
        const found = await prisma.news.findMany({
          where: { id: { in: ids } },
          select: newsSelect,
        });
        // Preserve relevance order returned by FTS
        const map = new Map(found.map((n) => [n.id, n]));
        items = ids.map((id) => map.get(id)).filter(Boolean) as typeof found;
      }
    } else {
      // ILIKE fallback for SQLite in local dev
      const where = {
        status: "PUBLISHED" as const,
        publishedAt: { not: null },
        ...buildNewsSearchWhere(q),
      };
      [total, items] = await Promise.all([
        prisma.news.count({ where }),
        prisma.news.findMany({ where, orderBy: { publishedAt: "desc" }, skip, take, select: newsSelect }),
      ]);
    }
  }

  const totalPages = pageCount(total, PAGE_SIZE);

  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <div className="min-w-0">
          <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Поиск" }]} />

          <div className="mt-4">
            <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">
              Поиск
            </h1>

            <form action="/search" className="mt-3 flex gap-2">
              <Input
                name="q"
                defaultValue={q}
                placeholder="Введите запрос"
                autoComplete="off"
              />
              <button className="rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                Найти
              </button>
            </form>
          </div>

          <div className="mt-4">
            {!q ? (
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                Введите запрос для поиска по заголовку, лиду и тексту новости.
              </div>
            ) : items.length ? (
              items.map((n) => <NewsCardRow key={n.id} item={n} />)
            ) : (
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                По запросу «{q}» ничего не найдено.
              </div>
            )}
          </div>

          {q ? (
            <PaginationLinks
              page={page}
              totalPages={totalPages}
              buildHref={(p) => {
                const sp = new URLSearchParams({ q });
                if (p > 1) sp.set("page", String(p));
                return `/search?${sp.toString()}`;
              }}
            />
          ) : null}
        </div>

        <Suspense>
          <SiteSidebar />
        </Suspense>
      </div>
    </div>
  );
}

