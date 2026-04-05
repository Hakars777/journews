"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { cleanupUnusedMediaUrls } from "@/lib/media-cleanup";
import { prisma } from "@/lib/prisma";
import { normalizeSelectedMediaUrl, saveImageUpload } from "@/lib/uploads";
import { assertAdmin } from "@/lib/guard-actions";

function revalidateSettingsPages() {
  revalidateTag("site-settings");
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/rss.xml");
}

export async function saveSiteNameAction(formData: FormData): Promise<void> {
  await assertAdmin();
  const name = (formData.get("site_name") as string | null)?.trim();
  if (!name) return;
  await prisma.siteSetting.upsert({
    where: { key: "site_name" },
    update: { value: name },
    create: { key: "site_name", value: name },
  });
  revalidateSettingsPages();
  redirect(`/admin/settings?saved=name&t=${Date.now()}`);
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
  revalidateSettingsPages();
  redirect(`/admin/settings?saved=description&t=${Date.now()}`);
}

export async function saveFaviconAction(formData: FormData): Promise<void> {
  await assertAdmin();

  const file = formData.get("favicon") as File | null;
  const selectedFaviconUrl = normalizeSelectedMediaUrl(
    (formData.get("selectedFaviconUrl") as string | null) ?? "",
  );
  if ((!file || file.size === 0) && !selectedFaviconUrl) return;

  const old = await prisma.siteSetting.findUnique({ where: { key: "favicon" } });
  const url =
    file && file.size > 0 ? await saveImageUpload(file, "site") : selectedFaviconUrl;
  if (!url) return;

  await prisma.siteSetting.upsert({
    where: { key: "favicon" },
    update: { value: url },
    create: { key: "favicon", value: url },
  });

  await cleanupUnusedMediaUrls([old?.value && old.value !== url ? old.value : null]);
  revalidateSettingsPages();
  redirect(`/admin/settings?saved=favicon&t=${Date.now()}`);
}

export async function deleteFaviconAction() {
  await assertAdmin();

  const setting = await prisma.siteSetting.findUnique({ where: { key: "favicon" } });
  await prisma.siteSetting.deleteMany({ where: { key: "favicon" } });
  await cleanupUnusedMediaUrls([setting?.value]);
  revalidateSettingsPages();
  redirect(`/admin/settings?saved=favicon_deleted&t=${Date.now()}`);
}
