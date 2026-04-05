import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/site";

export const revalidate = 3600; // обновлять раз в час

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();

  // Статические страницы
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
  ];

  // Категории
  const categories = await prisma.category.findMany({
    select: { slug: true, updatedAt: true },
  });
  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${base}/category/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const authors = await prisma.author.findMany({
    select: { slug: true, updatedAt: true },
  });
  const authorRoutes: MetadataRoute.Sitemap = authors.map((author) => ({
    url: `${base}/author/${author.slug}`,
    lastModified: author.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const tags = await prisma.tag.findMany({
    select: { slug: true, updatedAt: true },
  });
  const tagRoutes: MetadataRoute.Sitemap = tags.map((tag) => ({
    url: `${base}/tag/${tag.slug}`,
    lastModified: tag.updatedAt,
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  // Все опубликованные статьи
  const news = await prisma.news.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    select: { slug: true, publishedAt: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
  });
  const newsRoutes: MetadataRoute.Sitemap = news.map((n) => ({
    url: `${base}/news/${n.slug}`,
    lastModified: n.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...authorRoutes, ...tagRoutes, ...newsRoutes];
}
