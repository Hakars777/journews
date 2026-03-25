"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { saveImageUpload, deleteUploadedImage } from "@/lib/uploads";
import { assertAdmin } from "@/lib/guard-actions";

export async function saveFaviconAction(formData: FormData) {
  await assertAdmin();

  const file = formData.get("favicon") as File | null;
  if (!file || file.size === 0) return { error: "Файл не выбран" };

  // Удаляем старый favicon если был
  const old = await prisma.siteSetting.findUnique({ where: { key: "favicon" } });
  if (old?.value) await deleteUploadedImage(old.value);

  const url = await saveImageUpload(file, "site");
  if (!url) return { error: "Ошибка загрузки файла" };

  await prisma.siteSetting.upsert({
    where: { key: "favicon" },
    update: { value: url },
    create: { key: "favicon", value: url },
  });

  revalidatePath("/", "layout");
  return { ok: true, url };
}

export async function deleteFaviconAction() {
  await assertAdmin();

  const setting = await prisma.siteSetting.findUnique({ where: { key: "favicon" } });
  if (setting?.value) await deleteUploadedImage(setting.value);

  await prisma.siteSetting.deleteMany({ where: { key: "favicon" } });
  revalidatePath("/", "layout");
}
