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

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({
    select: { slug: true },
  });
  return categories.map((c) => ({ slug: c.slug }));
}

const getCategoryMeta = unstable_cache(
  async (slug: string) =>
    prisma.category.findUnique({
      where: { slug },
      select: { id: true, name: true, description: true, slug: true },
    }),
  ["category-meta"],
  { revalidate: 300, tags: ["categories"] },
);

const getCategoryPageData = unstable_cache(
  async (slug: string, page: number) => {
    const category = await getCategoryMeta(slug);
    if (!category) return null;

    const { skip, take } = getPagination(page, PAGE_SIZE);
    const where = {
      status: "PUBLISHED" as const,
      publishedAt: { not: null },
      categoryId: category.id,
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
      category,
      items,
      totalPages: pageCount(total, PAGE_SIZE),
    };
  },
  ["category-page"],
  { revalidate: 300, tags: ["categories"] },
);

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const category = await getCategoryMeta(params.slug);
  if (!category) return { title: "Բաժինը չի գտնվել" };
  return {
    title: category.name,
    description: category.description ?? undefined,
    alternates: {
      canonical: buildCanonicalUrl(`/category/${category.slug}`),
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = await getCategoryPageData(params.slug, 1);
  if (!data) notFound();

  const { category, items, totalPages } = data;

  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <div className="min-w-0">
          <Breadcrumbs
            items={[
              { href: "/", label: "Главная" },
              { label: category.name },
            ]}
          />

          <div className="mt-4">
            <h1 className="jn-headline text-2xl font-semibold uppercase tracking-wide">
              {category.name}
            </h1>
            {category.description ? (
              <p className="mt-2 text-sm text-muted-foreground">{category.description}</p>
            ) : null}
          </div>

          <div className="mt-4">
            {items.length ? (
              items.map((n) => <NewsCardRow key={n.id} item={n} />)
            ) : (
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                В этой категории пока нет опубликованных новостей.
              </div>
            )}
          </div>

          <PaginationLinks
            page={1}
            totalPages={totalPages}
            buildHref={(p) =>
              p === 1 ? `/category/${category.slug}` : `/category/${category.slug}/${p}`
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
