"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { assertEditor } from "@/lib/guard-actions";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

export type CategoryActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const schema = z.object({
  name: z.string().min(2, "Минимум 2 символа."),
  slug: z.string().min(1, "Slug обязателен."),
  description: z.string().optional(),
});

function parse(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  return {
    name,
    slug: slug || slugify(name),
    description: String(formData.get("description") ?? "").trim() || undefined,
  };
}

async function uniqueSlug(slug: string, excludeId?: string) {
  const base = slugify(slug);
  let candidate = base;
  for (let i = 2; i < 50; i++) {
    const existing = await prisma.category.findFirst({
      where: excludeId ? { slug: candidate, NOT: { id: excludeId } } : { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${base}-${i}`;
  }
  throw new Error("Не удалось подобрать уникальный slug.");
}

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await assertEditor();
  const parsed = schema.safeParse(parse(formData));
  if (!parsed.success) {
    return { ok: false, message: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const slug = await uniqueSlug(parsed.data.slug);

  await prisma.category.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description ?? null,
    },
  });

  redirect("/admin/categories");
}

export async function updateCategoryAction(
  id: string,
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  await assertEditor();
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return { ok: false, message: "Категория не найдена." };

  const parsed = schema.safeParse(parse(formData));
  if (!parsed.success) {
    return { ok: false, message: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const slug = await uniqueSlug(parsed.data.slug, existing.id);

  await prisma.category.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description ?? null,
    },
  });

  redirect(`/admin/categories/${existing.id}/edit`);
}

export async function deleteCategoryAction(id: string) {
  await assertEditor();
  try {
    await prisma.category.delete({ where: { id } });
  } catch {
    // If category is used by news, Prisma will throw.
    redirect("/admin/categories?error=in_use");
  }
  redirect("/admin/categories");
}

