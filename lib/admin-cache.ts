import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCachedAdminMediaOverview } from "@/lib/r2-media";

export const getAdminDashboardData = unstable_cache(
  async () => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [newsTotal, publishedTotal, views7d, recent] = await Promise.all([
      prisma.news.count().catch(() => 0),
      prisma.news.count({ where: { status: "PUBLISHED" } }).catch(() => 0),
      prisma.newsView.count({ where: { createdAt: { gte: sevenDaysAgo } } }).catch(() => 0),
      prisma.news
        .findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            createdAt: true,
            publishedAt: true,
            scheduledAt: true,
          },
        })
        .catch(() => []),
    ]);

    return { newsTotal, publishedTotal, views7d, recent };
  },
  ["admin-dashboard"],
  { revalidate: 60, tags: ["admin-dashboard"] },
);

export const getAdminNewsOptions = unstable_cache(
  async () => {
    const [categories, authors, tags] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    ]);

    return { categories, authors, tags };
  },
  ["admin-news-options"],
  { revalidate: 300, tags: ["admin-news-options"] },
);

export async function getAdminNewsFilterOptions() {
  const { categories, authors } = await getAdminNewsOptions();
  return { categories, authors };
}

export async function getAdminMediaPageData() {
  const overview = await getCachedAdminMediaOverview();
  return overview;
}
