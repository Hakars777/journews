"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertEditor } from "@/lib/guard-actions";
import { cleanupUnusedMediaUrls } from "@/lib/media-cleanup";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";
import { normalizeSelectedMediaUrl, saveImageUpload } from "@/lib/uploads";

export type AuthorActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const schema = z.object({
  name: z.string().min(2, "Минимум 2 символа."),
  slug: z.string().min(1, "Slug обязателен."),
  bio: z.string().optional(),
  selectedAvatarUrl: z.string().optional(),
});

function parse(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  return {
    name,
    slug: slug || slugify(name),
    bio: String(formData.get("bio") ?? "").trim() || undefined,
    selectedAvatarUrl: String(formData.get("selectedAvatarUrl") ?? "").trim() || undefined,
  };
}

async function uniqueSlug(slug: string, excludeId?: string) {
  const base = slugify(slug);
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const existing = await prisma.author.findFirst({
      where: excludeId ? { slug: candidate, NOT: { id: excludeId } } : { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${i}`;
  }
  throw new Error("Не удалось подобрать уникальный slug.");
}

export async function createAuthorAction(
  _prev: AuthorActionState,
  formData: FormData,
): Promise<AuthorActionState> {
  await assertEditor();
  const parsed = schema.safeParse(parse(formData));
  if (!parsed.success) {
    return { ok: false, message: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const avatarFile = formData.get("avatarFile");
  let avatar = normalizeSelectedMediaUrl(parsed.data.selectedAvatarUrl);
  try {
    if (avatarFile instanceof File && avatarFile.size > 0) {
      avatar = await saveImageUpload(avatarFile, "authors");
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка загрузки аватара.";
    return { ok: false, message: msg };
  }

  const slug = await uniqueSlug(parsed.data.slug);
  await prisma.author.create({
    data: {
      name: parsed.data.name,
      slug,
      bio: parsed.data.bio ?? null,
      avatar,
    },
  });
  redirect("/admin/authors");
}

export async function updateAuthorAction(
  id: string,
  _prev: AuthorActionState,
  formData: FormData,
): Promise<AuthorActionState> {
  await assertEditor();
  const existing = await prisma.author.findUnique({
    where: { id },
    select: { id: true, avatar: true },
  });
  if (!existing) return { ok: false, message: "Автор не найден." };

  const parsed = schema.safeParse(parse(formData));
  if (!parsed.success) {
    return { ok: false, message: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const avatarFile = formData.get("avatarFile");
  let avatar = normalizeSelectedMediaUrl(parsed.data.selectedAvatarUrl);
  try {
    if (avatarFile instanceof File && avatarFile.size > 0) {
      avatar = await saveImageUpload(avatarFile, "authors");
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Ошибка загрузки аватара.";
    return { ok: false, message: msg };
  }

  const slug = await uniqueSlug(parsed.data.slug, existing.id);
  await prisma.author.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      slug,
      bio: parsed.data.bio ?? null,
      avatar,
    },
  });

  await cleanupUnusedMediaUrls([existing.avatar && existing.avatar !== avatar ? existing.avatar : null]);

  redirect(`/admin/authors/${existing.id}/edit`);
}

export async function deleteAuthorAction(id: string) {
  await assertEditor();
  const existing = await prisma.author.findUnique({
    where: { id },
    select: { id: true, avatar: true },
  });
  if (!existing) redirect("/admin/authors");

  try {
    await prisma.author.delete({ where: { id: existing.id } });
    await cleanupUnusedMediaUrls([existing.avatar]);
  } catch {
    redirect("/admin/authors?error=in_use");
  }

  redirect("/admin/authors");
}
