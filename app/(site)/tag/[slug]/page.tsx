import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { PaginationLinks } from "@/components/site/pagination";
import { SiteSidebar } from "@/components/site/site-sidebar";
import { NewsCardRow } from "@/components/news/news-cards";
import { prisma } from "@/lib/prisma";
import { getPagination, pageCount } from "@/lib/pagination";
import {
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildCollectionPageJsonLd,
  buildTagPageDescription,
  toJsonLd,
} from "@/lib/seo";
import { getSiteSettings } from "@/lib/site";

export const revalidate = 300;

const PAGE_SIZE = 12;

const getTagMeta = unstable_cache(
  async (slug: string) =>
    prisma.tag.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    }),
  ["tag-meta"],
  { revalidate: 300 },
);

const getTagPageData = unstable_cache(
  async (slug: string, page: number) => {
    const tag = await getTagMeta(slug);
    if (!tag) return null;

    const { skip, take } = getPagination(page, PAGE_SIZE);
    const where = {
      status: "PUBLISHED" as const,
      publishedAt: { not: null },
      tags: { some: { tagId: tag.id } },
    };

    const [total, items] = await Promise.all([
      prisma.news.count({ where }),
      prisma.news.findMany({
        where,
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
    ]);

    return {
      tag,
      items,
      totalPages: pageCount(total, PAGE_SIZE),
    };
  },
  ["tag-page"],
  { revalidate: 300 },
);

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const [tag, settings] = await Promise.all([
    getTagMeta(params.slug),
    getSiteSettings().catch(() => ({ name: "Jour News" })),
  ]);
  if (!tag) return { title: "Պիտակը չի գտնվել" };
  const description = buildTagPageDescription(tag.name);
  return {
    title: `Պիտակ: ${tag.name}`,
    description,
    alternates: {
      canonical: buildCanonicalUrl(`/tag/${tag.slug}`),
    },
    openGraph: {
      type: "website",
      locale: "hy_AM",
      siteName: settings.name,
      title: `Պիտակ: ${tag.name}`,
      description,
      url: buildCanonicalUrl(`/tag/${tag.slug}`),
    },
    twitter: {
      card: "summary",
      title: `Պիտակ: ${tag.name}`,
      description,
    },
  };
}

export default async function TagPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = await getTagPageData(params.slug, 1);
  if (!data) notFound();

  const { tag, items, totalPages } = data;
  const description = buildTagPageDescription(tag.name);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Գլխավոր", path: "/" },
    { name: `Պիտակ: ${tag.name}`, path: `/tag/${tag.slug}` },
  ]);
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: `Պիտակ: ${tag.name}`,
    description,
    path: `/tag/${tag.slug}`,
  });

  return (
    <div className="container py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(collectionJsonLd) }}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <div className="min-w-0">
          <Breadcrumbs
            items={[
              { href: "/", label: "Գլխավոր" },
              { label: `Պիտակ: ${tag.name}` },
            ]}
          />

          <div className="mt-4">
            <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">
              Պիտակ: {tag.name}
            </h1>
          </div>

          <div className="mt-4">
            {items.length ? (
              items.map((n) => <NewsCardRow key={n.id} item={n} />)
            ) : (
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                Այս պիտակով դեռ հրապարակված նյութեր չկան։
              </div>
            )}
          </div>

          <PaginationLinks
            page={1}
            totalPages={totalPages}
            buildHref={(p) =>
              p === 1 ? `/tag/${tag.slug}` : `/tag/${tag.slug}/${p}`
            }
          />
        </div>

        <Suspense>
          <SiteSidebar />
        </Suspense>
      </div>
    </div>
  );
}
