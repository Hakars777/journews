import { Suspense } from "react";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { Separator } from "@/components/ui/separator";
import { NewsCardBig, NewsCardMedium, NewsCardGrid, NewsCardRow } from "@/components/news/news-cards";
import { PaginationLinks } from "@/components/site/pagination";
import { SiteSidebar } from "@/components/site/site-sidebar";
import { prisma } from "@/lib/prisma";
import { getPagination, pageCount } from "@/lib/pagination";

type NewsItem = {
  id: string;
  slug: string;
  title: string;
  lead: string;
  coverImage: string | null;
  publishedAt: Date | null;
  category: { name: string; slug: string } | null;
  author: { name: string; slug: string } | null;
};

type CategorySection = {
  id: string;
  name: string;
  slug: string;
  articles: NewsItem[];
};

export const revalidate = 300;

const PAGE_SIZE = 10;

const getHomePageData = unstable_cache(
  async (page: number) => {
    const { skip, take } = getPagination(page, PAGE_SIZE);

    const top = await prisma.news.findMany({
      where: { status: "PUBLISHED", isTop: true, publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 5,
      select: {
        id: true, slug: true, title: true, lead: true,
        coverImage: true, publishedAt: true,
        category: { select: { name: true, slug: true } },
        author: { select: { name: true, slug: true } },
      },
    });

    const topIds = (top as NewsItem[]).map((t) => t.id);

    const feedWhere = {
      status: "PUBLISHED" as const,
      publishedAt: { not: null },
      ...(topIds.length ? { id: { notIn: topIds } } : {}),
    };

    const [total, feed] = await Promise.all([
      prisma.news.count({ where: feedWhere }),
      prisma.news.findMany({
        where: feedWhere,
        orderBy: { publishedAt: "desc" },
        skip, take,
        select: {
          id: true, slug: true, title: true, lead: true,
          coverImage: true, publishedAt: true,
          category: { select: { name: true, slug: true } },
          author: { select: { name: true, slug: true } },
        },
      }),
    ]);

    // Latest 6 articles per category for category sections (top 3 categories by article count)
    const topCategories = await prisma.category.findMany({
      where: {
        news: {
          some: { status: "PUBLISHED", publishedAt: { not: null } },
        },
      },
      orderBy: { news: { _count: "desc" } },
      take: 3,
      select: { id: true, name: true, slug: true },
    });

    const categorySections = await Promise.all(
      topCategories.map(async (cat) => {
        const articles = await prisma.news.findMany({
          where: {
            status: "PUBLISHED",
            publishedAt: { not: null },
            categoryId: cat.id,
          },
          orderBy: { publishedAt: "desc" },
          take: 4,
          select: {
            id: true, slug: true, title: true, lead: true,
            coverImage: true, publishedAt: true,
            category: { select: { name: true, slug: true } },
            author: { select: { name: true, slug: true } },
          },
        });
        return { ...cat, articles };
      }),
    );

    return { top, feed, totalPages: pageCount(total, PAGE_SIZE), categorySections };
  },
  ["home-page"],
  { revalidate: 300, tags: ["home-page", "categories"] },
);

export default async function HomePage() {
  const { top, feed, totalPages, categorySections } = await getHomePageData(1) as {
    top: NewsItem[];
    feed: NewsItem[];
    totalPages: number;
    categorySections: CategorySection[];
  };

  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <div className="min-w-0 space-y-10">

          {/* ── HERO GRID ─────────────────────────────────────────── */}
          {top.length ? (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h1 className="jn-headline text-xl font-semibold uppercase tracking-wide border-l-4 border-primary pl-3">
                  Главное
                </h1>
              </div>

              {/* Desktop: big left + 2 medium right. Mobile: stacked */}
              <div className="grid gap-4 md:grid-cols-[1fr,300px]">
                {/* Main hero */}
                <div>
                  <NewsCardBig item={top[0]} />
                </div>

                {/* 4 medium cards right column */}
                <div className="grid gap-3 content-start">
                  {top.slice(1, 5).map((t) => (
                    <NewsCardMedium key={t.id} item={t} />
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <Separator />

          {/* ── CATEGORY SECTIONS ─────────────────────────────────── */}
          {categorySections.filter((cs) => cs.articles.length >= 2).map((cs) => (
            <section key={cs.id}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="jn-headline text-lg font-semibold uppercase tracking-wide border-l-4 border-primary pl-3">
                  {cs.name}
                </h2>
                <Link
                  href={`/category/${cs.slug}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Все →
                </Link>
              </div>

              {/* First article large, rest in grid */}
              <div className="grid gap-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {cs.articles.map((a) => (
                    <NewsCardGrid key={a.id} item={a} />
                  ))}
                </div>
              </div>
            </section>
          ))}

          <Separator />

          {/* ── LATEST FEED ───────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="jn-headline text-xl font-semibold uppercase tracking-wide border-l-4 border-primary pl-3">
                Лента
              </h2>
            </div>

            <div>
              {feed.length ? (
                feed.map((item) => <NewsCardRow key={item.id} item={item} />)
              ) : (
                <div className="rounded-md border p-6 text-sm text-muted-foreground">
                  Ничего не найдено.
                </div>
              )}
            </div>

            <PaginationLinks
              page={1}
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
