import Link from "next/link";
import { unstable_cache } from "next/cache";
import { NewsCardSmall } from "@/components/news/news-cards";
import { prisma } from "@/lib/prisma";

const getSidebarData = unstable_cache(
  async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [popularAgg, latest, editorsPick, categories] = await Promise.all([
      prisma.newsView.groupBy({
        by: ["newsId"],
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: { newsId: true },
        orderBy: { _count: { newsId: "desc" } },
        take: 5,
      }),
      prisma.news.findMany({
        where: { status: "PUBLISHED", publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: 5,
        select: { id: true, slug: true, title: true, publishedAt: true },
      }),
      prisma.news.findMany({
        where: { status: "PUBLISHED", isEditorsPick: true, publishedAt: { not: null } },
        orderBy: { publishedAt: "desc" },
        take: 5,
        select: { id: true, slug: true, title: true, publishedAt: true },
      }),
      prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true },
      }),
    ]);

    const popularIds = popularAgg.map((x) => x.newsId);
    const popularNews = popularIds.length
      ? await prisma.news.findMany({
          where: {
            id: { in: popularIds },
            status: "PUBLISHED",
            publishedAt: { not: null },
          },
          select: { id: true, slug: true, title: true, publishedAt: true },
        })
      : [];
    const popularById = new Map(popularNews.map((n) => [n.id, n]));
    const popularOrdered = popularIds
      .map((id) => popularById.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return { popularOrdered, latest, editorsPick, categories };
  },
  ["site-sidebar"],
  { revalidate: 300, tags: ["site-sidebar", "categories"] },
);

export async function SiteSidebar() {
  const { popularOrdered, latest, editorsPick, categories } = await getSidebarData();

  return (
    <aside className="grid gap-6">
      <section className="rounded-md border p-4">
        <h3 className="jn-headline text-sm font-semibold uppercase tracking-wide">
          Популярное (7 дней)
        </h3>
        <div className="mt-3 grid gap-3">
          {popularOrdered.length ? (
            popularOrdered.map((n, idx) => (
              <NewsCardSmall key={n.id} item={n} index={idx} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Пока нет данных.</p>
          )}
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h3 className="jn-headline text-sm font-semibold uppercase tracking-wide">
          Последние
        </h3>
        <div className="mt-3 grid gap-3">
          {latest.map((n) => (
            <NewsCardSmall key={n.id} item={n} />
          ))}
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h3 className="jn-headline text-sm font-semibold uppercase tracking-wide">
          Выбор редакции
        </h3>
        <div className="mt-3 grid gap-3">
          {editorsPick.length ? (
            editorsPick.map((n) => <NewsCardSmall key={n.id} item={n} />)
          ) : (
            <p className="text-sm text-muted-foreground">Пока пусто.</p>
          )}
        </div>
      </section>

      <section className="rounded-md border p-4">
        <h3 className="jn-headline text-sm font-semibold uppercase tracking-wide">
          Категории
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="rounded-md px-2 py-1 hover:bg-muted transition-colors"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}
