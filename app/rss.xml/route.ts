import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SITE_DESCRIPTION, SITE_NAME, getBaseUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

function cdata(s: string) {
  return `<![CDATA[${s.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

export async function GET() {
  const baseUrl = getBaseUrl();

  const items = await prisma.news.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 30,
    select: {
      slug: true,
      title: true,
      lead: true,
      publishedAt: true,
      updatedAt: true,
    },
  });

  const now = new Date();

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">` +
    `<channel>` +
    `<title>${cdata(SITE_NAME)}</title>` +
    `<link>${baseUrl}</link>` +
    `<description>${cdata(SITE_DESCRIPTION)}</description>` +
    `<language>ru</language>` +
    `<atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />` +
    `<lastBuildDate>${now.toUTCString()}</lastBuildDate>` +
    items
      .map((n) => {
        const url = `${baseUrl}/news/${n.slug}`;
        const pub = (n.publishedAt ?? n.updatedAt).toUTCString();
        return (
          `<item>` +
          `<title>${cdata(n.title)}</title>` +
          `<link>${url}</link>` +
          `<guid isPermaLink="true">${url}</guid>` +
          `<pubDate>${pub}</pubDate>` +
          `<description>${cdata(n.lead)}</description>` +
          `</item>`
        );
      })
      .join("") +
    `</channel></rss>`;

  return new NextResponse(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}

