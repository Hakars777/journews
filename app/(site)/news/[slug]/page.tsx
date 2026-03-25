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
import { formatDateTime } from "@/lib/format";
import { getBaseUrl, getSiteSettings } from "@/lib/site";
import { Suspense } from "react";
import { SiteSidebar } from "@/components/site/site-sidebar";
import { toAbsoluteMediaUrl } from "@/lib/uploads";

// Cache individual articles for 5 min. ViewTracker is a client component
// and still fires on every visit regardless of ISR.
export const revalidate = 300;

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
  { revalidate: 300 },
);

async function fetchNewsPageData(slug: string) {
  const news = await prisma.news.findFirst({
    where: { slug, status: "PUBLISHED", publishedAt: { not: null } },
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
      category: { select: { name: true, slug: true } },
      author: { select: { name: true, slug: true } },
      tags: { select: { tag: { select: { id: true, name: true, slug: true } } } },
    },
  });

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
  const data = await getNewsPageData(decodeURIComponent(params.slug));
  if (!data) return { title: "Новость не найдена" };

  const { news } = data;
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/news/${params.slug}`;
  const image = toAbsoluteMediaUrl(news.coverImage, baseUrl);
  const publishedTime = toIsoDateTime(news.publishedAt);
  const settings = await getSiteSettings();

  return {
    title: news.title,
    description: news.lead,
    openGraph: {
      type: "article",
      url,
      title: news.title,
      description: news.lead,
      siteName: settings.name,
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
  const data = await getNewsPageData(slug);
  if (!data) notFound();

  const { news, similar } = data;
  const pageUrl = `${getBaseUrl()}/news/${slug}`;
  const tags = news.tags.map((t) => t.tag);
  const gallery = Array.isArray(news.galleryImages)
    ? news.galleryImages.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];

  return (
    <div className="container py-6">
      <ViewTracker newsId={news.id} />

      <div className="grid gap-8 lg:grid-cols-[1fr,340px]">
        <article className="min-w-0">
          <Breadcrumbs
            items={[
              { href: "/", label: "Главная" },
              ...(news.category ? [{ href: `/category/${news.category.slug}`, label: news.category.name }] : []),
              { label: news.title },
            ]}
          />

          <header className="mt-4 grid gap-3">
            <h1 className="jn-headline text-3xl font-semibold leading-tight">
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
              <span>{news.author.name}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {news.views.toLocaleString("ru-RU")}
              </span>
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
            <div className="mt-5 relative aspect-[16/9] overflow-hidden rounded-md bg-muted">
              <Image src={news.coverImage} alt={news.title} fill className="object-cover" priority />
            </div>
          ) : null}

          {gallery.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.slice(0, 6).map((src) => (
                <div key={src} className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                  <Image src={src} alt="" fill className="object-cover" />
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