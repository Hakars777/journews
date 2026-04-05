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
import {
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildCategoryPageDescription,
  buildCollectionPageJsonLd,
  toJsonLd,
} from "@/lib/seo";
import { getSiteSettings } from "@/lib/site";

export const revalidate = 300;

const PAGE_SIZE = 12;

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({
    select: { slug: true },
  });
  // Pre-render first 5 pages of each category
  const params = [];
  for (const { slug } of categories) {
    for (let p = 2; p <= 5; p++) {
      params.push({ slug, page: String(p) });
    }
  }
  return params;
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
  params: { slug: string; page: string };
}): Promise<Metadata> {
  const [category, settings] = await Promise.all([
    getCategoryMeta(params.slug),
    getSiteSettings().catch(() => ({ name: "Jour News" })),
  ]);
  if (!category) return { title: "Բաժինը չի գտնվել" };
  const description = buildCategoryPageDescription(category.name, category.description);
  return {
    title: `${category.name} | Էջ ${params.page}`,
    description,
    alternates: {
      canonical: buildCanonicalUrl(`/category/${category.slug}/${params.page}`),
    },
    openGraph: {
      type: "website",
      locale: "hy_AM",
      siteName: settings.name,
      title: `${category.name} | Էջ ${params.page}`,
      description,
      url: buildCanonicalUrl(`/category/${category.slug}/${params.page}`),
    },
    twitter: {
      card: "summary",
      title: `${category.name} | Էջ ${params.page}`,
      description,
    },
  };
}

export default async function CategoryPageN({
  params,
}: {
  params: { slug: string; page: string };
}) {
  const page = parsePage(params.page);
  if (page < 2) notFound();

  const data = await getCategoryPageData(params.slug, page);
  if (!data) notFound();

  const { category, items, totalPages } = data;
  if (page > totalPages) notFound();
  const description = buildCategoryPageDescription(category.name, category.description);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Գլխավոր", path: "/" },
    { name: category.name, path: `/category/${category.slug}` },
    { name: `Էջ ${page}`, path: `/category/${category.slug}/${page}` },
  ]);
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: `${category.name} | Էջ ${page}`,
    description,
    path: `/category/${category.slug}/${page}`,
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
              { href: `/category/${category.slug}`, label: category.name },
              { label: `Էջ ${page}` },
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
                Այս բաժնում դեռ հրապարակված նյութեր չկան։
              </div>
            )}
          </div>

          <PaginationLinks
            page={page}
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
