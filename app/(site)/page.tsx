import { Suspense } from "react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Separator } from "@/components/ui/separator";
import { NewsCardBig, NewsCardRow, NewsCardSmall } from "@/components/news/news-cards";
import { PaginationLinks } from "@/components/site/pagination";
import { SiteSidebar } from "@/components/site/site-sidebar";
import { prisma } from "@/lib/prisma";
import { getPagination, pageCount, parsePage } from "@/lib/pagination";
import { timed } from "@/lib/perf";

export const revalidate = 300;

const PAGE_SIZE = 10;

const getHomePageData = unstable_cache(
  async (page: number) => {
    const { skip, take } = getPagination(page, PAGE_SIZE);

    const top = await timed("home:top", () =>
      prisma.news.findMany({
        where: { status: "PUBLISHED", isTop: true, publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: 5,
        select: {
          id: true,
          slug: true,
          title: true,
          lead: true,
          coverImage: true,
          publishedAt: true,
          category: { select: { name: true, slug: true } },
          author: { select: { name: true, slug: true } },
        },
      }),
    );

    const topIds = top.map((t) => t.id);

    const feedWhere = {
      status: "PUBLISHED" as const,
      publishedAt: { not: null },
      ...(topIds.length ? { id: { notIn: topIds } } : {}),
    };

    const [total, feed] = await timed("home:feed+count", () =>
      Promise.all([
        prisma.news.count({ where: feedWhere }),
        prisma.news.findMany({
          where: feedWhere,
          orderBy: { publishedAt: "desc" },
          skip,
          take,
          select: {
            id: true,
            slug: true,
            title: true,
            lead: true,
            coverImage: true,
            publishedAt: true,
            category: { select: { name: true, slug: true } },
            author: { select: { name: true, slug: true } },
          },
        }),
      ]),
    );

    return {
      top,
      feed,
      totalPages: pageCount(total, PAGE_SIZE),
    };
  },
  ["home-page"],
  { revalidate: 300 },
);

export default async function HomePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const page = parsePage(searchParams.page);
  const { top, feed, totalPages } = await getHomePageData(page);

  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <div className="min-w-0">
          <section className="grid gap-5">
            <div className="flex items-center justify-between">
              <h1 className="jn-headline text-xl font-semibold uppercase tracking-wide">
                Топ-новости
              </h1>
              <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground">
                Поиск
              </Link>
            </div>

            {top.length ? (
              <div className="grid gap-6 lg:grid-cols-[1fr,320px]">
                <div className="min-w-0">
                  <NewsCardBig item={top[0]} />
                </div>
                <div className="grid gap-4">
                  {top.slice(1).map((t) => (
                    <NewsCardSmall key={t.id} item={t} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                Пока нет опубликованных топ-новостей.
              </div>
            )}
          </section>

          <Separator className="my-8" />

          <section>
            <h2 className="jn-headline text-xl font-semibold uppercase tracking-wide">
              Лента
            </h2>

            <div className="mt-2">
              {feed.length ? (
                feed.map((item) => <NewsCardRow key={item.id} item={item} />)
              ) : (
                <div className="rounded-md border p-6 text-sm text-muted-foreground">
                  Ничего не найдено.
                </div>
              )}
            </div>

            <PaginationLinks
              page={page}
              totalPages={totalPages}
              basePath="/"
              searchParams={searchParams}
            />
          </section>
        </div>

        <Suspense>
          <SiteSidebar />
        </Suspense>
      </div>
    </div>
  );
}