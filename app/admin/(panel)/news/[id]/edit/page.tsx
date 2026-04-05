import Link from "next/link";
import { notFound } from "next/navigation";
import { NewsForm } from "@/components/admin/news/news-form";
import { ConfirmActionForm } from "@/components/admin/confirm-action-form";
import { prisma } from "@/lib/prisma";
import { getAdminMediaPickerItems } from "@/lib/r2-media";
import { deleteNewsAction, updateNewsAction } from "@/app/admin/(panel)/news/actions";

export const dynamic = "force-dynamic";

export default async function AdminNewsEditPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const news = await prisma.news.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      slug: true,
      lead: true,
      contentHtml: true,
      status: true,
      categoryId: true,
      authorId: true,
      isTop: true,
      isEditorsPick: true,
      sourceName: true,
      sourceUrl: true,
      coverImage: true,
      galleryImages: true,
      publishedAt: true,
      scheduledAt: true,
      tags: { select: { tagId: true } },
    },
  });
  if (!news) notFound();

  const [categories, authors, tags, mediaItems] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getAdminMediaPickerItems(),
  ]);

  const galleryImages = Array.isArray(news.galleryImages)
    ? news.galleryImages.filter((x): x is string => typeof x === "string")
    : [];

  const boundUpdate = updateNewsAction.bind(null, news.id);
  const boundDelete = deleteNewsAction.bind(null, news.id);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          <Link href="/admin/news" className="hover:underline">
            ← К списку
          </Link>
          <span className="px-2">•</span>
          <Link href={`/news/${news.slug}`} className="hover:underline">
            Открыть на сайте
          </Link>
        </div>
        <ConfirmActionForm
          action={boundDelete}
          confirmText="Удалить новость? Это действие нельзя отменить."
          label="Удалить"
        />
      </div>

      <NewsForm
        title="Редактирование новости"
        submitLabel="Сохранить"
        action={boundUpdate}
        successMessage={searchParams.saved === "1" ? "Новость сохранена." : undefined}
        categories={categories}
        authors={authors}
        tags={tags}
        mediaItems={mediaItems}
        initial={{
          title: news.title,
          slug: news.slug,
          lead: news.lead,
          contentHtml: news.contentHtml,
          status: news.status,
          categoryId: news.categoryId,
          authorId: news.authorId,
          tagIds: news.tags.map((t) => t.tagId),
          isTop: news.isTop,
          isEditorsPick: news.isEditorsPick,
          sourceName: news.sourceName,
          sourceUrl: news.sourceUrl,
          coverImage: news.coverImage,
          galleryImages,
          publishedAt: news.publishedAt,
          scheduledAt: news.scheduledAt,
        }}
      />
    </div>
  );
}
