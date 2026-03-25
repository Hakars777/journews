"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveImageUpload, deleteUploadedImage } from "@/lib/uploads";
import { assertAdmin } from "@/lib/guard-actions";

export async function saveSiteNameAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const name = (formData.get("site_name") as string | null)?.trim();
  if (!name) return;
  await prisma.siteSetting.upsert({
    where: { key: "site_name" },
    update: { value: name },
    create: { key: "site_name", value: name },
  });
  revalidateTag("site-settings");
  revalidatePath("/", "layout");
}

export async function saveSiteDescriptionAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const desc = (formData.get("site_description") as string | null)?.trim();
  if (!desc) return;
  await prisma.siteSetting.upsert({
    where: { key: "site_description" },
    update: { value: desc },
    create: { key: "site_description", value: desc },
  });
  revalidateTag("site-settings");
  revalidatePath("/", "layout");
}

export async function saveFaviconAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const file = formData.get("favicon") as File | null;
  if (!file || file.size === 0) return;

  // Удаляем старый favicon если был
  const old = await prisma.siteSetting.findUnique({ where: { key: "favicon" } });
  if (old?.value) await deleteUploadedImage(old.value);

  const url = await saveImageUpload(file, "site");
  if (!url) return;

  await prisma.siteSetting.upsert({
    where: { key: "favicon" },
    update: { value: url },
    create: { key: "favicon", value: url },
  });

  revalidatePath("/", "layout");
}

export async function deleteFaviconAction() {
  await assertAdmin();

  const setting = await prisma.siteSetting.findUnique({ where: { key: "favicon" } });
  if (setting?.value) await deleteUploadedImage(setting.value);

  await prisma.siteSetting.deleteMany({ where: { key: "favicon" } });
  revalidatePath("/", "layout");
}
