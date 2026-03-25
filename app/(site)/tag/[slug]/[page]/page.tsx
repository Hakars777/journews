import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { PaginationLinks } from "@/components/site/pagination";
import { SiteSidebar } from "@/components/site/site-sidebar";
import { NewsCardRow } from "@/components/news/news-cards";
import { prisma } from "@/lib/prisma";
import { getPagination, pageCount, parsePage } from "@/lib/pagination";

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
  params: { slug: string; page: string };
}): Promise<Metadata> {
  const tag = await getTagMeta(params.slug);
  if (!tag) return { title: "Тег не найден" };
  return { title: `Тег: ${tag.name} — страница ${params.page}` };
}

export default async function TagPageN({
  params,
}: {
  params: { slug: string; page: string };
}) {
  const page = parsePage(params.page);
  if (page < 2) notFound();

  const data = await getTagPageData(params.slug, page);
  if (!data) notFound();

  const { tag, items, totalPages } = data;
  if (page > totalPages) notFound();

  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <div className="min-w-0">
          <Breadcrumbs
            items={[
              { href: "/", label: "Главная" },
              { href: `/tag/${tag.slug}`, label: `Тег: ${tag.name}` },
              { label: `Страница ${page}` },
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
            page={page}
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
