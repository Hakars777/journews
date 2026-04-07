import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { Separator } from "@/components/ui/separator";
import { NewsCardRow } from "@/components/news/news-cards";
import { PaginationLinks } from "@/components/site/pagination";
import { SiteSidebar } from "@/components/site/site-sidebar";
import { prisma } from "@/lib/prisma";
import { getPagination, pageCount, parsePage } from "@/lib/pagination";
import { buildCanonicalUrl } from "@/lib/seo";
import { shouldSkipBuildStaticParams } from "@/lib/build-env";

export const revalidate = 300;

const PAGE_SIZE = 10;

const newsCardSelect = {
  id: true,
  slug: true,
  title: true,
  lead: true,
  coverImage: true,
  publishedAt: true,
  category: { select: { name: true, slug: true } },
  author: { select: { name: true, slug: true } },
} as const;

export async function generateStaticParams() {
  if (shouldSkipBuildStaticParams()) {
    return [];
  }

  // Pre-render first 10 pages of the homepage feed
  return Array.from({ length: 9 }, (_, i) => ({ page: String(i + 2) }));
}

const getHomePageData = unstable_cache(
  async (page: number) => {
    const { skip, take } = getPagination(page, PAGE_SIZE);

    const top = await prisma.news.findMany({
      where: { status: "PUBLISHED", isTop: true, publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: { id: true },
    });

    const topIds = top.map((t) => t.id);

    const topCategories = await prisma.category.findMany({
      where: {
        news: {
          some: { status: "PUBLISHED", publishedAt: { not: null } },
        },
      },
      orderBy: { news: { _count: "desc" } },
      take: 3,
      select: { id: true },
    });

    const categorySections = await Promise.all(
      topCategories.map(async (cat) =>
        prisma.news.findMany({
          where: {
            status: "PUBLISHED",
            publishedAt: { not: null },
            categoryId: cat.id,
            ...(topIds.length ? { id: { notIn: topIds } } : {}),
          },
          orderBy: { publishedAt: "desc" },
          take: 4,
          select: { id: true },
        }),
      ),
    );

    const excludedIds = [
      ...topIds,
      ...categorySections.flatMap((section) => section.map((article) => article.id)),
    ];

    const feedWhere = {
      status: "PUBLISHED" as const,
      publishedAt: { not: null },
      ...(excludedIds.length ? { id: { notIn: excludedIds } } : {}),
    };

    const [total, feed] = await Promise.all([
      prisma.news.count({ where: feedWhere }),
      prisma.news.findMany({
        where: feedWhere,
        orderBy: { publishedAt: "desc" },
        skip,
        take,
        select: newsCardSelect,
      }),
    ]);

    return {
      feed,
      totalPages: pageCount(total, PAGE_SIZE),
    };
  },
  ["home-page-feed"],
  { revalidate: 300, tags: ["home-page", "categories"] },
);

export async function generateMetadata({
  params,
}: {
  params: { page: string };
}): Promise<Metadata> {
  const page = parsePage(params.page);
  return {
    title: `Լրահոս | Էջ ${page}`,
    alternates: {
      canonical: buildCanonicalUrl(page <= 1 ? "/" : `/page/${page}`),
    },
  };
}

export default async function HomePageN({
  params,
}: {
  params: { page: string };
}) {
  const page = parsePage(params.page);
  if (page < 2) notFound();

  const { feed, totalPages } = await getHomePageData(page);
  if (page > totalPages) notFound();

  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <div className="min-w-0">
          <section>
            <div className="flex items-center justify-between">
              <h1 className="jn-headline text-xl font-semibold uppercase tracking-wide">
                Лента — страница {page}
              </h1>
              <Link href="/search" className="text-sm text-muted-foreground hover:text-foreground">
                Поиск
              </Link>
            </div>

            <Separator className="my-4" />

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
              buildHref={(p) => (p === 1 ? "/" : `/page/${p}`)}
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
