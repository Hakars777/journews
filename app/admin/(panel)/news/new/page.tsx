import { NewsForm } from "@/components/admin/news/news-form";
import { prisma } from "@/lib/prisma";
import { getAdminMediaPickerItems } from "@/lib/r2-media";
import { createNewsAction } from "@/app/admin/(panel)/news/actions";

export const dynamic = "force-dynamic";

export default async function AdminNewsNewPage() {
  const [categories, authors, tags, mediaItems] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.author.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.tag.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getAdminMediaPickerItems(),
  ]);

  if (!categories.length || !authors.length) {
    return (
      <div className="rounded-md border bg-background p-6 text-sm text-muted-foreground">
        Для создания новости сначала добавьте категории и авторов.
      </div>
    );
  }

  return (
    <NewsForm
      title="Новая новость"
      submitLabel="Создать"
      action={createNewsAction}
      categories={categories}
      authors={authors}
      tags={tags}
      mediaItems={mediaItems}
      initial={{
        title: "",
        slug: "",
        lead: "",
        contentHtml: "<p></p>",
        status: "DRAFT",
        categoryId: categories[0].id,
        authorId: authors[0].id,
        tagIds: [],
        isTop: false,
        isEditorsPick: false,
        sourceName: null,
        sourceUrl: null,
        coverImage: null,
        galleryImages: [],
        publishedAt: null,
        scheduledAt: null,
      }}
    />
  );
}

