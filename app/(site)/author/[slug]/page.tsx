import Image from "next/image";
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
  buildAuthorPageDescription,
  buildBreadcrumbJsonLd,
  buildCanonicalUrl,
  buildCollectionPageJsonLd,
  buildPersonJsonLd,
  toJsonLd,
} from "@/lib/seo";
import { getSiteSettings } from "@/lib/site";
import { toAbsoluteMediaUrl } from "@/lib/uploads";

export const revalidate = 300;

const PAGE_SIZE = 12;

export async function generateStaticParams() {
  const authors = await prisma.author.findMany({
    select: { slug: true },
  });
  return authors.map((a) => ({ slug: a.slug }));
}

const getAuthorMeta = unstable_cache(
  async (slug: string) =>
    prisma.author.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, bio: true, avatar: true },
    }),
  ["author-meta"],
  { revalidate: 300 },
);

const getAuthorPageData = unstable_cache(
  async (slug: string, page: number) => {
    const author = await getAuthorMeta(slug);
    if (!author) return null;

    const { skip, take } = getPagination(page, PAGE_SIZE);
    const where = {
      status: "PUBLISHED" as const,
      publishedAt: { not: null },
      authorId: author.id,
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
      author,
      items,
      total,
      totalPages: pageCount(total, PAGE_SIZE),
    };
  },
  ["author-page"],
  { revalidate: 300 },
);

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const [author, settings] = await Promise.all([
    getAuthorMeta(params.slug),
    getSiteSettings().catch(() => ({ name: "Jour News" })),
  ]);
  if (!author) return { title: "Հեղինակը չի գտնվել" };
  const description = buildAuthorPageDescription(author.name, author.bio);
  const image = toAbsoluteMediaUrl(author.avatar, buildCanonicalUrl("/"));
  return {
    title: author.name,
    description,
    alternates: {
      canonical: buildCanonicalUrl(`/author/${author.slug}`),
    },
    openGraph: {
      type: "profile",
      locale: "hy_AM",
      siteName: settings.name,
      title: author.name,
      description,
      url: buildCanonicalUrl(`/author/${author.slug}`),
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: author.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: { slug: string };
}) {
  const data = await getAuthorPageData(params.slug, 1);
  if (!data) notFound();

  const { author, items, total, totalPages } = data;
  const description = buildAuthorPageDescription(author.name, author.bio);
  const image = toAbsoluteMediaUrl(author.avatar, buildCanonicalUrl("/"));
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Գլխավոր", path: "/" },
    { name: author.name, path: `/author/${author.slug}` },
  ]);
  const personJsonLd = buildPersonJsonLd({
    name: author.name,
    path: `/author/${author.slug}`,
    description,
    image: image ?? undefined,
  });
  const collectionJsonLd = buildCollectionPageJsonLd({
    name: author.name,
    description,
    path: `/author/${author.slug}`,
  });

  return (
    <div className="container py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(personJsonLd) }}
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
              { label: author.name },
            ]}
          />

          <div className="mt-4 flex items-start gap-4">
            {author.avatar ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-muted">
                <Image
                  src={author.avatar}
                  alt={author.name}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-muted text-2xl font-semibold text-muted-foreground">
                {author.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="jn-headline text-2xl font-semibold">{author.name}</h1>
              {author.bio ? (
                <p className="mt-1 text-sm text-muted-foreground">{author.bio}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {total} {pluralArticles(total)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            {items.length ? (
              items.map((n) => <NewsCardRow key={n.id} item={n} />)
            ) : (
              <div className="rounded-md border p-6 text-sm text-muted-foreground">
                Այս հեղինակի մոտ դեռ հրապարակված նյութեր չկան։
              </div>
            )}
          </div>

          <PaginationLinks
            page={1}
            totalPages={totalPages}
            buildHref={(p) =>
              p === 1
                ? `/author/${author.slug}`
                : `/author/${author.slug}/${p}`
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

function pluralArticles(n: number) {
  return n === 1 ? "հրապարակում" : "հրապարակում";
}
