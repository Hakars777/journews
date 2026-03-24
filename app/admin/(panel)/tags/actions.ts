"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertEditor } from "@/lib/guard-actions";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export type TagActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const schema = z.object({
  name: z.string().min(2, "Минимум 2 символа."),
  slug: z.string().min(1, "Slug обязателен."),
});

function parse(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  return { name, slug: slug || slugify(name) };
}

async function uniqueSlug(slug: string, excludeId?: string) {
  const base = slugify(slug);
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const existing = await prisma.tag.findFirst({
      where: excludeId ? { slug: candidate, NOT: { id: excludeId } } : { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${i}`;
  }
  throw new Error("Не удалось подобрать уникальный slug.");
}

export async function createTagAction(
  _prev: TagActionState,
  formData: FormData,
): Promise<TagActionState> {
  await assertEditor();
  const parsed = schema.safeParse(parse(formData));
  if (!parsed.success) {
    return { ok: false, message: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const slug = await uniqueSlug(parsed.data.slug);
  await prisma.tag.create({ data: { name: parsed.data.name, slug } });
  redirect("/admin/tags");
}

export async function updateTagAction(
  id: string,
  _prev: TagActionState,
  formData: FormData,
): Promise<TagActionState> {
  await assertEditor();
  const existing = await prisma.tag.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, message: "Тег не найден." };

  const parsed = schema.safeParse(parse(formData));
  if (!parsed.success) {
    return { ok: false, message: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const slug = await uniqueSlug(parsed.data.slug, existing.id);
  await prisma.tag.update({ where: { id: existing.id }, data: { name: parsed.data.name, slug } });
  redirect(`/admin/tags/${existing.id}/edit`);
}

export async function deleteTagAction(id: string) {
  await assertEditor();
  try {
    await prisma.tag.delete({ where: { id } });
  } catch {
    redirect("/admin/tags?error=in_use");
  }
  redirect("/admin/tags");
}

