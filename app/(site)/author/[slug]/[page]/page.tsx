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
import { getPagination, pageCount, parsePage } from "@/lib/pagination";
import { buildCanonicalUrl } from "@/lib/seo";

export const revalidate = 300;

const PAGE_SIZE = 12;

export async function generateStaticParams() {
  const authors = await prisma.author.findMany({
    select: { slug: true },
  });
  const params = [];
  for (const { slug } of authors) {
    for (let p = 2; p <= 5; p++) {
      params.push({ slug, page: String(p) });
    }
  }
  return params;
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
  params: { slug: string; page: string };
}): Promise<Metadata> {
  const author = await getAuthorMeta(params.slug);
  if (!author) return { title: "Հեղինակը չի գտնվել" };
  return {
    title: `${author.name} | Էջ ${params.page}`,
    description: author.bio ?? undefined,
    alternates: {
      canonical: buildCanonicalUrl(`/author/${author.slug}/${params.page}`),
    },
  };
}

export default async function AuthorPageN({
  params,
}: {
  params: { slug: string; page: string };
}) {
  const page = parsePage(params.page);
  if (page < 2) notFound();

  const data = await getAuthorPageData(params.slug, page);
  if (!data) notFound();

  const { author, items, total, totalPages } = data;
  if (page > totalPages) notFound();

  return (
    <div className="container py-6">
      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <div className="min-w-0">
          <Breadcrumbs
            items={[
              { href: "/", label: "Главная" },
              { href: `/author/${author.slug}`, label: author.name },
              { label: `Страница ${page}` },
            ]}
          />

          <div className="mt-4 flex items-start gap-4">
            {author.avatar ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                <Image
                  src={author.avatar}
                  alt={author.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
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
                У этого автора пока нет опубликованных статей.
              </div>
            )}
          </div>

          <PaginationLinks
            page={page}
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
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "статья";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "статьи";
  return "статей";
}
