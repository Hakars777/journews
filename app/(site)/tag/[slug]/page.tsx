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
import { buildCanonicalUrl } from "@/lib/seo";

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
  const tag = await getTagMeta(params.slug);
  if (!tag) return { title: "Պիտակը չի գտնվել" };
  return {
    title: `Պիտակ: ${tag.name}`,
    alternates: {
      canonical: buildCanonicalUrl(`/tag/${tag.slug}`),
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

  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <div className="min-w-0">
          <Breadcrumbs
            items={[
              { href: "/", label: "Главная" },
              { label: `Тег: ${tag.name}` },
            ]}
          />

          <div className="mt-4">
            <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">
              Тег: {tag.name}
            </h1>
          </div>

          <div className="mt-4">
            {items.length ? (
              items.map((n) => <NewsCardRow key={n.id} item={n} />)
            ) : (
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                По этому тегу пока нет опубликованных новостей.
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
