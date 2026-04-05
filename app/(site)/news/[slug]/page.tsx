import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { NewsCardSmall } from "@/components/news/news-cards";
import { NewsContent } from "@/components/news/news-content";
import { ShareButtons } from "@/components/news/share-buttons";
import { ViewTracker } from "@/components/news/view-tracker";
import { prisma } from "@/lib/prisma";
import { formatDateTime, readingTime } from "@/lib/format";
import { getBaseUrl, getSiteSettings } from "@/lib/site";
import { Suspense } from "react";
import { SiteSidebar } from "@/components/site/site-sidebar";
import { toAbsoluteMediaUrl } from "@/lib/uploads";
import { buildBreadcrumbJsonLd, buildCanonicalUrl, toJsonLd } from "@/lib/seo";

// Cache individual articles for 5 min. ViewTracker is a client component
// and still fires on every visit regardless of ISR.
export const revalidate = 300;

export async function generateStaticParams() {
  const articles = await prisma.news.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 100,
    select: { slug: true },
  });
  return articles.map((a) => ({ slug: a.slug }));
}

function toIsoDateTime(value: Date | string | null | undefined) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

const getNewsPageData = unstable_cache(
  async (slug: string) => {
    return fetchNewsPageData(slug);
  },
  ["news-page"],
  { revalidate: 300, tags: ["news-page"] },
);

function getSlugCandidates(slug: string) {
  const values = new Set<string>();

  if (slug) values.add(slug);

  try {
    const decoded = decodeURIComponent(slug);
    if (decoded) values.add(decoded);
  } catch {
    // ignore malformed values
  }

  try {
    const encoded = encodeURIComponent(slug);
    if (encoded) values.add(encoded);
  } catch {
    // ignore malformed values
  }

  return Array.from(values);
}

async function fetchNewsPageData(slug: string) {
  const slugCandidates = getSlugCandidates(slug);
  const candidates = await prisma.news.findMany({
    where: { slug: { in: slugCandidates }, status: "PUBLISHED", publishedAt: { not: null } },
    select: {
      id: true,
      title: true,
      slug: true,
      lead: true,
      contentHtml: true,
      coverImage: true,
      galleryImages: true,
      publishedAt: true,
      views: true,
      sourceName: true,
      sourceUrl: true,
      updatedAt: true,
      category: { select: { name: true, slug: true } },
      author: { select: { name: true, slug: true } },
      tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
    },
  });

  const news = slugCandidates
    .map((candidate) => candidates.find((item) => item.slug === candidate))
    .find((item) => !!item) ?? null;

  if (!news) return null;

  const similar = await prisma.news.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: { not: null },
      ...(news.category ? { category: { slug: news.category.slug } } : {}),
      NOT: { id: news.id },
    },
    orderBy: { publishedAt: "desc" },
    take: 6,
    select: { id: true, slug: true, title: true, publishedAt: true },
  });

  return { news, similar };
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const [data, settings] = await Promise.all([
    getNewsPageData(decodeURIComponent(params.slug)).catch(() => null),
    getSiteSettings().catch(() => ({ name: "", description: "" })),
  ]);
  if (!data) return { title: "Նյութը չի գտնվել" };

  const { news } = data;
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/news/${params.slug}`;
  const image = toAbsoluteMediaUrl(news.coverImage, baseUrl);
  const publishedTime = toIsoDateTime(news.publishedAt);

  return {
    title: news.title,
    description: news.lead,
    alternates: {
      canonical: buildCanonicalUrl(`/news/${news.slug}`),
    },
    openGraph: {
      type: "article",
      url,
      title: news.title,
      description: news.lead,
      siteName: settings.name,
      locale: "hy_AM",
      publishedTime,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: news.title,
      description: news.lead,
      images: image ? [image] : undefined,
    },
  };
}

export default async function NewsPage({ params }: { params: { slug: string } }) {
  const slug = decodeURIComponent(params.slug);
  const [data, settings] = await Promise.all([
    getNewsPageData(slug).catch(() => null),
    getSiteSettings().catch(() => null),
  ]);
  if (!data) notFound();

  const { news, similar } = data;
  const pageUrl = `${getBaseUrl()}/news/${slug}`;
  const tags = news.tags.map((t) => t.tag);
  const gallery = Array.isArray(news.galleryImages)
    ? news.galleryImages.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  const image = toAbsoluteMediaUrl(news.coverImage, getBaseUrl());
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Գլխավոր", path: "/" },
    ...(news.category ? [{ name: news.category.name, path: `/category/${news.category.slug}` }] : []),
    { name: news.title, path: `/news/${news.slug}` },
  ]);
  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: news.title,
    description: news.lead,
    inLanguage: "hy",
    mainEntityOfPage: pageUrl,
    datePublished: toIsoDateTime(news.publishedAt),
    dateModified: toIsoDateTime(news.updatedAt),
    image: image ? [image] : undefined,
    articleSection: news.category?.name,
    keywords: tags.length ? tags.map((tag) => tag.name).join(", ") : undefined,
    author: {
      "@type": "Person",
      name: news.author.name,
      url: buildCanonicalUrl(`/author/${news.author.slug}`),
    },
    publisher: {
      "@type": "Organization",
      name: settings?.name ?? "Jour News",
      url: buildCanonicalUrl("/"),
      logo: {
        "@type": "ImageObject",
        url: buildCanonicalUrl("/api/favicon"),
      },
    },
  };

  return (
    <div className="container py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(newsArticleJsonLd) }}
      />
      <ViewTracker newsId={news.id} />

      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <article className="min-w-0">
          <Breadcrumbs
            items={[
              { href: "/", label: "Գլխավոր" },
              ...(news.category ? [{ href: `/category/${news.category.slug}`, label: news.category.name }] : []),
              { label: news.title },
            ]}
          />

          <header className="mt-4 grid gap-3">
            <h1 className="jn-headline jn-article-title font-semibold">
              {news.title}
            </h1>
            <p className="text-base leading-7 text-muted-foreground">{news.lead}</p>

            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {news.category ? (
                <Link href={`/category/${news.category.slug}`} className="hover:text-foreground">
                  <Badge variant="secondary">{news.category.name}</Badge>
                </Link>
              ) : null}
              {news.publishedAt ? <span>{formatDateTime(news.publishedAt)}</span> : null}
              <span>•</span>
              <Link href={`/author/${news.author.slug}`} className="hover:text-foreground hover:underline">
                {news.author.name}
              </Link>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {news.views.toLocaleString("ru-RU")}
              </span>
              {readingTime(news.contentHtml) ? (
                <>
                  <span>•</span>
                  <span>{readingTime(news.contentHtml)}</span>
                </>
              ) : null}
            </div>

            {tags.length ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <Link key={t.id} href={`/tag/${t.slug}`}>
                    <Badge variant="outline" className="hover:bg-muted">
                      #{t.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : null}
          </header>

          {news.coverImage ? (
            <div className="mt-5 relative aspect-[4/3] lg:aspect-[3/2] overflow-hidden rounded-md bg-muted">
              <Image
                src={news.coverImage}
                alt={news.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, calc(100vw - 380px)"
                quality={90}
              />
            </div>
          ) : null}

          {gallery.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.slice(0, 6).map((src) => (
                <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                  <Image src={src} alt="" fill className="object-cover" sizes="(max-width: 640px) 50vw, 33vw" quality={88} />
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-6">
            <NewsContent html={news.contentHtml} />
          </div>

          {news.sourceName || news.sourceUrl ? (
            <div className="mt-6 rounded-md border p-4 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Источник:</span>{" "}
              {news.sourceUrl ? (
                <a
                  href={news.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  {news.sourceName || news.sourceUrl}
                </a>
              ) : (
                <span>{news.sourceName}</span>
              )}
            </div>
          ) : null}

          <div className="mt-6">
            <ShareButtons title={news.title} url={pageUrl} />
          </div>

          {similar.length ? (
            <section className="mt-10">
              <h2 className="jn-headline text-lg font-semibold uppercase tracking-wide">
                Похожие
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {similar.map((n) => (
                  <NewsCardSmall key={n.id} item={n} />
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <Suspense>
          <SiteSidebar />
        </Suspense>
      </div>
    </div>
  );
}
