import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function xmlEscape(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const baseUrl = getBaseUrl();

  const [news, categories, tags] = await Promise.all([
    prisma.news.findMany({
      where: { status: "PUBLISHED", publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, updatedAt: true },
      take: 5000,
    }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.tag.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const urls: Array<{ loc: string; lastmod?: string }> = [
    { loc: `${baseUrl}/` },
    { loc: `${baseUrl}/search` },
    ...categories.map((c) => ({
      loc: `${baseUrl}/category/${c.slug}`,
      lastmod: c.updatedAt.toISOString(),
    })),
    ...tags.map((t) => ({
      loc: `${baseUrl}/tag/${t.slug}`,
      lastmod: t.updatedAt.toISOString(),
    })),
    ...news.map((n) => ({
      loc: `${baseUrl}/news/${n.slug}`,
      lastmod: n.updatedAt.toISOString(),
    })),
  ];

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls
      .map((u) => {
        const lastmod = u.lastmod ? `<lastmod>${xmlEscape(u.lastmod)}</lastmod>` : "";
        return `<url><loc>${xmlEscape(u.loc)}</loc>${lastmod}</url>`;
      })
      .join("") +
    `</urlset>`;

  return new NextResponse(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}

