import "server-only";

import { prisma } from "@/lib/prisma";
import { deleteUploadedImage } from "@/lib/uploads";

async function collectReferencedMediaUrls() {
  const [authors, news, settings] = await Promise.all([
    prisma.author.findMany({ select: { avatar: true } }),
    prisma.news.findMany({ select: { coverImage: true, galleryImages: true } }),
    prisma.siteSetting.findMany({ select: { value: true } }),
  ]);

  const referenced = new Set<string>();

  for (const author of authors) {
    if (author.avatar) referenced.add(author.avatar);
  }

  for (const item of news) {
    if (item.coverImage) referenced.add(item.coverImage);
    if (!Array.isArray(item.galleryImages)) continue;

    for (const image of item.galleryImages) {
      if (typeof image === "string") referenced.add(image);
    }
  }

  for (const setting of settings) {
    if (
      setting.value.startsWith("http://") ||
      setting.value.startsWith("https://") ||
      setting.value.startsWith("/uploads/")
    ) {
      referenced.add(setting.value);
    }
  }

  return referenced;
}

export async function cleanupUnusedMediaUrls(urls: Iterable<string | null | undefined>) {
  const uniqueUrls = [...new Set([...urls].filter((url): url is string => !!url))];
  if (!uniqueUrls.length) return;

  const referencedUrls = await collectReferencedMediaUrls();

  for (const url of uniqueUrls) {
    if (referencedUrls.has(url)) continue;
    await deleteUploadedImage(url);
  }
}
