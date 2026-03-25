/**
 * compress-existing-images.mjs
 *
 * Скрипт для сжатия уже загруженных фото в Supabase Storage.
 * Конвертирует JPEG/PNG в WebP, resize до 1920px, качество 82%.
 * GIF — пропускает.
 * Уже маленькие файлы (< 150KB) — пропускает.
 *
 * Запуск: node --env-file=.env scripts/compress-existing-images.mjs
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "media";
const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 82;
const SKIP_BELOW_BYTES = 150 * 1024; // пропускать если < 150KB

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET_PREFIX = `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${BUCKET}/`;

function getObjectPath(publicUrl) {
  if (!publicUrl || !publicUrl.startsWith(BUCKET_PREFIX)) return null;
  const raw = publicUrl.slice(BUCKET_PREFIX.length).split(/[?#]/)[0];
  return raw ? decodeURIComponent(raw) : null;
}

async function compressBuffer(buffer, ext) {
  if (ext === ".gif") return null; // пропускаем GIF

  const compressed = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return compressed;
}

async function processImage(publicUrl, label) {
  const objectPath = getObjectPath(publicUrl);
  if (!objectPath) {
    console.log(`  ⏭  пропуск (не Supabase): ${label}`);
    return null;
  }

  // Скачиваем оригинал
  const { data, error } = await supabase.storage.from(BUCKET).download(objectPath);
  if (error || !data) {
    console.log(`  ❌ не удалось скачать: ${objectPath}`);
    return null;
  }

  const originalBuffer = Buffer.from(await data.arrayBuffer());
  const originalSize = originalBuffer.length;

  // Пропускаем если уже маленький
  if (originalSize < SKIP_BELOW_BYTES) {
    console.log(`  ⏭  уже маленький (${Math.round(originalSize / 1024)}KB): ${objectPath}`);
    return null;
  }

  const ext = "." + (objectPath.split(".").pop() || "").toLowerCase();

  const compressed = await compressBuffer(originalBuffer, ext).catch(() => null);
  if (!compressed) {
    console.log(`  ⏭  пропуск GIF: ${objectPath}`);
    return null;
  }

  const compressedSize = compressed.length;
  if (compressedSize >= originalSize) {
    console.log(`  ⏭  уже оптимальный: ${objectPath}`);
    return null;
  }

  // Новый путь — заменяем расширение на .webp
  const newPath = objectPath.replace(/\.[^.]+$/, ".webp");

  // Загружаем сжатый файл
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(newPath, compressed, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });

  if (uploadError) {
    console.log(`  ❌ ошибка загрузки: ${uploadError.message}`);
    return null;
  }

  // Получаем новый публичный URL
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(newPath);
  const newUrl = urlData.publicUrl;

  const saved = Math.round((1 - compressedSize / originalSize) * 100);
  console.log(`  ✅ ${Math.round(originalSize / 1024)}KB → ${Math.round(compressedSize / 1024)}KB (-${saved}%): ${newPath}`);

  return { oldUrl: publicUrl, newUrl };
}

async function getAllImageUrls() {
  // Напрямую через Supabase PostgREST API
  const { data, error } = await supabase
    .from("News")
    .select("id, coverImage, galleryImages")
    .not("coverImage", "is", null);

  if (error) {
    console.error("❌ Ошибка запроса к базе:", error.message);
    process.exit(1);
  }

  return data || [];
}

async function updateImageUrl(newsId, field, oldUrl, newUrl) {
  if (field === "coverImage") {
    await supabase.from("News").update({ coverImage: newUrl }).eq("id", newsId);
  } else if (field === "galleryImages") {
    // galleryImages — JSON массив, нужно обновить конкретный элемент
    const { data } = await supabase.from("News").select("galleryImages").eq("id", newsId).single();
    if (data?.galleryImages) {
      const gallery = Array.isArray(data.galleryImages) ? data.galleryImages : [];
      const updated = gallery.map((u) => (u === oldUrl ? newUrl : u));
      await supabase.from("News").update({ galleryImages: updated }).eq("id", newsId);
    }
  }
}

async function main() {
  console.log("🚀 Начинаем сжатие существующих фото...\n");

  const articles = await getAllImageUrls();
  console.log(`📰 Найдено статей: ${articles.length}\n`);

  let totalSaved = 0;
  let totalProcessed = 0;

  for (const article of articles) {
    const { id, coverImage, galleryImages } = article;
    console.log(`\n📄 Статья ${id}:`);

    // Обложка
    if (coverImage) {
      const result = await processImage(coverImage, "coverImage");
      if (result && result.newUrl !== result.oldUrl) {
        await updateImageUrl(id, "coverImage", result.oldUrl, result.newUrl);
        totalProcessed++;
      }
    }

    // Галерея
    const gallery = Array.isArray(galleryImages) ? galleryImages : [];
    for (const imgUrl of gallery) {
      if (typeof imgUrl === "string") {
        const result = await processImage(imgUrl, "gallery");
        if (result && result.newUrl !== result.oldUrl) {
          await updateImageUrl(id, "galleryImages", result.oldUrl, result.newUrl);
          totalProcessed++;
        }
      }
    }
  }

  console.log(`\n✅ Готово! Обработано фото: ${totalProcessed}`);
}

main().catch((e) => {
  console.error("❌ Ошибка:", e);
  process.exit(1);
});
