"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertEditor } from "@/lib/guard-actions";
import { deleteUploadedImage, saveImageUpload } from "@/lib/uploads";
import { slugify } from "@/lib/slug";
import { redirect } from "next/navigation";

export type NewsActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const statusSchema = z.enum(["DRAFT", "PUBLISHED", "SCHEDULED", "ARCHIVED"]);

const baseSchema = z.object({
  title: z.string().min(3, "Минимум 3 символа."),
  slug: z.string().min(1, "Slug обязателен."),
  lead: z.string().min(10, "Лид слишком короткий."),
  contentHtml: z.string().min(1, "Контент обязателен."),
  status: statusSchema,
  categoryId: z.string().min(1, "Выберите категорию."),
  authorId: z.string().min(1, "Выберите автора."),
  publishedAt: z.string().optional(),
  scheduledAt: z.string().optional(),
  sourceName: z.string().optional(),
  sourceUrl: z.string().optional(),
  isTop: z.boolean().optional(),
  isEditorsPick: z.boolean().optional(),
  tagIds: z.array(z.string()).default([]),
  removeCover: z.boolean().optional(),
  removeGallery: z.array(z.string()).default([]),
});

function toDateOrNull(input?: string) {
  if (!input) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function uniqueSlugOrThrow(slug: string, excludeId?: string) {
  const base = slugify(slug);
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const existing = await prisma.news.findFirst({
      where: excludeId ? { slug: candidate, NOT: { id: excludeId } } : { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${i}`;
  }
  throw new Error("Не удалось подобрать уникальный slug.");
}

function parseForm(formData: FormData) {
  const tagIds = formData.getAll("tagIds").filter((x): x is string => typeof x === "string");
  const removeGallery = formData
    .getAll("removeGallery")
    .filter((x): x is string => typeof x === "string");

  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  return {
    title,
    slug: slug || slugify(title),
    lead: String(formData.get("lead") ?? "").trim(),
    contentHtml: String(formData.get("contentHtml") ?? "").trim(),
    status: String(formData.get("status") ?? "DRAFT"),
    categoryId: String(formData.get("categoryId") ?? ""),
    authorId: String(formData.get("authorId") ?? ""),
    publishedAt: String(formData.get("publishedAt") ?? "").trim() || undefined,
    scheduledAt: String(formData.get("scheduledAt") ?? "").trim() || undefined,
    sourceName: String(formData.get("sourceName") ?? "").trim() || undefined,
    sourceUrl: String(formData.get("sourceUrl") ?? "").trim() || undefined,
    isTop: formData.get("isTop") === "on",
    isEditorsPick: formData.get("isEditorsPick") === "on",
    tagIds,
    removeCover: formData.get("removeCover") === "1" || formData.get("removeCover") === "on",
    removeGallery,
  };
}

function normalizeSourceUrl(url?: string) {
  const u = (url ?? "").trim();
  if (!u) return null;
  try {
    // eslint-disable-next-line no-new
    new URL(u);
    return u;
  } catch {
    return null;
  }
}

export async function createNewsAction(
  _prev: NewsActionState,
  formData: FormData,
): Promise<NewsActionState> {
  await assertEditor();

  const parsed = baseSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Проверьте поля формы.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;

  if (data.status === "SCHEDULED" && !data.scheduledAt) {
    return { ok: false, message: "Для scheduled нужно указать дату scheduledAt." };
  }

  const slug = await uniqueSlugOrThrow(data.slug);
  const coverFile = formData.get("coverFile");
  const galleryFiles = formData.getAll("galleryFiles");

  let coverImage: string | null = null;
  const galleryImages: string[] = [];

  try {
    if (coverFile instanceof File && coverFile.size > 0) {
      coverImage = await saveImageUpload(coverFile, "news/cover");
    }
    for (const f of galleryFiles) {
      if (f instanceof File && f.size > 0) {
        const saved = await saveImageUpload(f, "news/gallery");
        if (saved) galleryImages.push(saved);
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка загрузки изображения.";
    return { ok: false, message: msg };
  }

  const status = data.status;
  const scheduledAt = status === "SCHEDULED" ? toDateOrNull(data.scheduledAt) : null;
  const publishedAtInput = toDateOrNull(data.publishedAt);
  const publishedAt = status === "PUBLISHED" ? publishedAtInput ?? new Date() : null;

  await prisma.news.create({
    data: {
      title: data.title,
      slug,
      lead: data.lead,
      contentHtml: data.contentHtml,
      coverImage,
      galleryImages,
      sourceName: data.sourceName ?? null,
      sourceUrl: normalizeSourceUrl(data.sourceUrl),
      status,
      categoryId: data.categoryId,
      authorId: data.authorId,
      isTop: !!data.isTop,
      isEditorsPick: !!data.isEditorsPick,
      publishedAt,
      scheduledAt,
      tags: {
        create: data.tagIds.map((tagId) => ({ tagId })),
      },
    },
  });

  redirect("/admin/news?created=1");
}

export async function updateNewsAction(
  newsId: string,
  _prev: NewsActionState,
  formData: FormData,
): Promise<NewsActionState> {
  await assertEditor();

  const existing = await prisma.news.findUnique({
    where: { id: newsId },
    select: { id: true, slug: true, coverImage: true, galleryImages: true, publishedAt: true },
  });
  if (!existing) return { ok: false, message: "Новость не найдена." };

  const parsed = baseSchema.safeParse(parseForm(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Проверьте поля формы.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  if (data.status === "SCHEDULED" && !data.scheduledAt) {
    return { ok: false, message: "Для scheduled нужно указать дату scheduledAt." };
  }

  const slug = await uniqueSlugOrThrow(data.slug, existing.id);

  const coverFile = formData.get("coverFile");
  const galleryFiles = formData.getAll("galleryFiles");

  let coverImage = existing.coverImage;
  const existingGallery = Array.isArray(existing.galleryImages)
    ? existing.galleryImages.filter((x): x is string => typeof x === "string")
    : [];

  const removeSet = new Set(data.removeGallery);
  const galleryImages = existingGallery.filter((x) => !removeSet.has(x));

  try {
    if (data.removeCover && coverImage) {
      await deleteUploadedImage(coverImage);
      coverImage = null;
    }
    for (const src of data.removeGallery) {
      await deleteUploadedImage(src);
    }

    if (coverFile instanceof File && coverFile.size > 0) {
      if (coverImage) await deleteUploadedImage(coverImage);
      coverImage = await saveImageUpload(coverFile, "news/cover");
    }
    for (const f of galleryFiles) {
      if (f instanceof File && f.size > 0) {
        const saved = await saveImageUpload(f, "news/gallery");
        if (saved) galleryImages.push(saved);
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка загрузки изображения.";
    return { ok: false, message: msg };
  }

  const status = data.status;
  const scheduledAt = status === "SCHEDULED" ? toDateOrNull(data.scheduledAt) : null;
  const publishedAtInput = toDateOrNull(data.publishedAt);

  const publishedAt =
    status === "PUBLISHED"
      ? publishedAtInput ?? existing.publishedAt ?? new Date()
      : status === "ARCHIVED"
        ? existing.publishedAt
        : null;

  await prisma.$transaction([
    prisma.news.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        slug,
        lead: data.lead,
        contentHtml: data.contentHtml,
        coverImage,
        galleryImages,
        sourceName: data.sourceName ?? null,
        sourceUrl: normalizeSourceUrl(data.sourceUrl),
        status,
        categoryId: data.categoryId,
        authorId: data.authorId,
        isTop: !!data.isTop,
        isEditorsPick: !!data.isEditorsPick,
        publishedAt,
        scheduledAt,
      },
    }),
    prisma.newsTag.deleteMany({ where: { newsId: existing.id } }),
    prisma.newsTag.createMany({
      data: data.tagIds.map((tagId) => ({ newsId: existing.id, tagId })),
    }),
  ]);

  redirect(`/admin/news/${existing.id}/edit?saved=1`);
}

export async function deleteNewsAction(newsId: string) {
  await assertEditor();

  const existing = await prisma.news.findUnique({
    where: { id: newsId },
    select: { id: true, coverImage: true, galleryImages: true },
  });
  if (!existing) return;

  if (existing.coverImage) await deleteUploadedImage(existing.coverImage);
  if (Array.isArray(existing.galleryImages)) {
    for (const src of existing.galleryImages) {
      if (typeof src === "string") await deleteUploadedImage(src);
    }
  }

  await prisma.news.delete({ where: { id: existing.id } });
  redirect("/admin/news");
}

export async function bulkDeleteNewsAction(ids: string[]): Promise<{ ok: boolean; message?: string }> {
  await assertEditor();
  if (!ids.length) return { ok: false, message: "Не выбрано ни одной новости." };

  const items = await prisma.news.findMany({
    where: { id: { in: ids } },
    select: { id: true, coverImage: true, galleryImages: true },
  });

  for (const item of items) {
    if (item.coverImage) await deleteUploadedImage(item.coverImage);
    if (Array.isArray(item.galleryImages)) {
      for (const src of item.galleryImages) {
        if (typeof src === "string") await deleteUploadedImage(src);
      }
    }
  }

  await prisma.news.deleteMany({ where: { id: { in: ids } } });
  return { ok: true };
}
