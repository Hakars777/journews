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

function getString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const q = getString(searchParams.q);
  const categorySlug = getString(searchParams.category);
  const tagSlug = getString(searchParams.tag);
  const dateFrom = getString(searchParams.from);
  const dateTo = getString(searchParams.to);
  const page = parsePage(searchParams.page);
  const { skip, take } = getPagination(page, PAGE_SIZE);

  // Load filter options for the dropdowns
  const [allCategories, allTags] = await Promise.all([
    prisma.category.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.tag.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
  ]);

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

  // Build extra filters
  const extraWhere: Record<string, unknown> = {};
  if (categorySlug && allCategories.find((c) => c.slug === categorySlug)) {
    extraWhere.category = { slug: categorySlug };
  }
  if (tagSlug) {
    extraWhere.tags = { some: { tag: { slug: tagSlug } } };
  }

  // publishedAt: always keep "not: null", optionally add gte/lte
  const publishedAtFilter: Record<string, unknown> = { not: null };
  if (dateFrom) {
    const d = new Date(dateFrom);
    if (!isNaN(d.getTime())) publishedAtFilter.gte = d;
  }
  if (dateTo) {
    const d = new Date(dateTo);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      publishedAtFilter.lte = d;
    }
  }

  const hasFilters = !!(q || categorySlug || tagSlug || dateFrom || dateTo);

  let total = 0;
  let items: Awaited<ReturnType<typeof prisma.news.findMany<{ select: typeof newsSelect }>>> = [];

  if (hasFilters) {
    if (q && isPostgres() && !categorySlug && !tagSlug && !dateFrom && !dateTo) {
      // Pure FTS without extra filters — use optimised path
      const { ids, total: ftsTotal } = await searchNewsByFts(q, skip, take);
      total = ftsTotal;
      if (ids.length) {
        const found = await prisma.news.findMany({
          where: { id: { in: ids } },
          select: newsSelect,
        });
        const map = new Map(found.map((n) => [n.id, n]));
        items = ids.map((id) => map.get(id)).filter(Boolean) as typeof found;
      }
    } else {
      const where = {
        status: "PUBLISHED" as const,
        publishedAt: publishedAtFilter,
        ...(q ? buildNewsSearchWhere(q) : {}),
        ...extraWhere,
      };
      [total, items] = await Promise.all([
        prisma.news.count({ where }),
        prisma.news.findMany({
          where,
          orderBy: { publishedAt: "desc" },
          skip,
          take,
          select: newsSelect,
        }),
      ]);
    }
  }

  const totalPages = pageCount(total, PAGE_SIZE);

  function buildHref(p: number) {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (categorySlug) sp.set("category", categorySlug);
    if (tagSlug) sp.set("tag", tagSlug);
    if (dateFrom) sp.set("from", dateFrom);
    if (dateTo) sp.set("to", dateTo);
    if (p > 1) sp.set("page", String(p));
    return `/search?${sp.toString()}`;
  }

  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <div className="min-w-0">
          <Breadcrumbs items={[{ href: "/", label: "Главная" }, { label: "Поиск" }]} />

          <div className="mt-4">
            <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">
              Поиск
            </h1>

            <form action="/search" method="get" className="mt-3 grid gap-3">
              {/* Keyword */}
              <div className="flex gap-2">
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Введите запрос"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Найти
                </button>
              </div>

              {/* Filters row */}
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                {/* Category */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Категория</label>
                  <select
                    name="category"
                    defaultValue={categorySlug}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Все категории</option>
                    {allCategories.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tag */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Тег</label>
                  <select
                    name="tag"
                    defaultValue={tagSlug}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Все теги</option>
                    {allTags.map((t) => (
                      <option key={t.slug} value={t.slug}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date from */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">С даты</label>
                  <input
                    type="date"
                    name="from"
                    defaultValue={dateFrom}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>

                {/* Date to */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">По дату</label>
                  <input
                    type="date"
                    name="to"
                    defaultValue={dateTo}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              </div>

              {/* Active filters summary */}
              {(categorySlug || tagSlug || dateFrom || dateTo) && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>Фильтры:</span>
                  {categorySlug && (
                    <span className="rounded bg-muted px-2 py-0.5">
                      {allCategories.find((c) => c.slug === categorySlug)?.name ?? categorySlug}
                    </span>
                  )}
                  {tagSlug && (
                    <span className="rounded bg-muted px-2 py-0.5">
                      #{allTags.find((t) => t.slug === tagSlug)?.name ?? tagSlug}
                    </span>
                  )}
                  {dateFrom && <span className="rounded bg-muted px-2 py-0.5">с {dateFrom}</span>}
                  {dateTo && <span className="rounded bg-muted px-2 py-0.5">по {dateTo}</span>}
                  <a href="/search" className="text-primary underline underline-offset-2">
                    Сбросить
                  </a>
                </div>
              )}
            </form>
          </div>

          <div className="mt-4">
            {!hasFilters ? (
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                Введите запрос или выберите фильтры для поиска.
              </div>
            ) : items.length ? (
              <>
                <p className="mb-2 text-xs text-muted-foreground">
                  Найдено: {total}
                </p>
                {items.map((n) => (
                  <NewsCardRow key={n.id} item={n} />
                ))}
              </>
            ) : (
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                По заданным параметрам ничего не найдено.
              </div>
            )}
          </div>

          {hasFilters ? (
            <PaginationLinks
              page={page}
              totalPages={totalPages}
              buildHref={buildHref}
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
