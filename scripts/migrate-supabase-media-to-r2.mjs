#!/usr/bin/env node

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Pool } from "pg";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

const DATABASE_URL = (process.env.DATABASE_URL || "").trim();
const DIRECT_URL = (process.env.DIRECT_URL || "").trim();
const R2_ENDPOINT = (process.env.R2_ENDPOINT || "").trim().replace(/\/+$/, "");
const R2_ACCESS_KEY_ID = (process.env.R2_ACCESS_KEY_ID || "").trim();
const R2_SECRET_ACCESS_KEY = (process.env.R2_SECRET_ACCESS_KEY || "").trim();
const R2_BUCKET = (process.env.R2_BUCKET || "media").trim();
const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").trim().replace(/\/+$/, "");
const R2_REGION = (process.env.R2_REGION || "auto").trim();
const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SUPABASE_STORAGE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || "media").trim();

if (!DATABASE_URL && !DIRECT_URL) {
  console.error("DATABASE_URL or DIRECT_URL is required.");
  process.exit(1);
}

if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_PUBLIC_URL) {
  console.error("R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_PUBLIC_URL are required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DIRECT_URL || DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const r2 = new S3Client({
  region: R2_REGION,
  endpoint: R2_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

const migratedUrlCache = new Map();
const sourcePrefix = SUPABASE_URL
  ? `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/`
  : null;
const sourceUrlRegex = SUPABASE_URL
  ? new RegExp(`${escapeRegExp(sourcePrefix)}[^"'\\s)<>]+`, "gi")
  : /https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/[^"'\s)<>]+/gi;

const summary = {
  filesUploaded: 0,
  newsUpdated: 0,
  authorsUpdated: 0,
  usersUpdated: 0,
  siteSettingsUpdated: 0,
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function encodeObjectPath(objectPath) {
  return objectPath.split("/").map(encodeURIComponent).join("/");
}

function getR2PublicUrl(objectPath) {
  return `${R2_PUBLIC_URL}/${encodeObjectPath(objectPath)}`;
}

function parseSupabaseUrl(value) {
  if (!value || typeof value !== "string") return null;
  if (value.startsWith(R2_PUBLIC_URL)) return null;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  const match = parsed.pathname.match(/^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;

  return {
    bucket: decodeURIComponent(match[1]),
    objectPath: decodeURIComponent(match[2]),
    normalizedSourceUrl: `${parsed.origin}${parsed.pathname}`,
  };
}

async function fetchSourceFile(sourceUrl) {
  const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    throw new Error(`Failed to download ${sourceUrl}: ${response.status}`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}

async function migrateSingleUrl(url) {
  const parsed = parseSupabaseUrl(url);
  if (!parsed) return url;

  if (migratedUrlCache.has(parsed.normalizedSourceUrl)) {
    return migratedUrlCache.get(parsed.normalizedSourceUrl);
  }

  const nextUrl = getR2PublicUrl(parsed.objectPath);
  migratedUrlCache.set(parsed.normalizedSourceUrl, nextUrl);

  if (dryRun) {
    console.log(`[dry-run] ${parsed.normalizedSourceUrl} -> ${nextUrl}`);
    return nextUrl;
  }

  const { buffer, contentType } = await fetchSourceFile(parsed.normalizedSourceUrl);

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: parsed.objectPath,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  summary.filesUploaded += 1;
  console.log(`Uploaded ${parsed.objectPath}`);
  return nextUrl;
}

async function migrateContentHtml(html) {
  if (!html || typeof html !== "string") return { value: html, changed: false };

  const matches = Array.from(new Set(html.match(sourceUrlRegex) || []));
  if (!matches.length) return { value: html, changed: false };

  let updated = html;
  let changed = false;

  for (const match of matches) {
    const nextUrl = await migrateSingleUrl(match);
    if (nextUrl !== match) {
      updated = updated.split(match).join(nextUrl);
      changed = true;
    }
  }

  return { value: updated, changed };
}

async function migrateNews() {
  const { rows } = await pool.query(
    `SELECT id, "coverImage", "galleryImages", "contentHtml"
     FROM "News"
     WHERE "coverImage" IS NOT NULL
        OR "galleryImages" IS NOT NULL
        OR "contentHtml" LIKE '%supabase.co/storage/v1/object/public/%'`,
  );

  for (const row of rows) {
    let changed = false;

    const nextCover = row.coverImage ? await migrateSingleUrl(row.coverImage) : row.coverImage;
    if (nextCover !== row.coverImage) changed = true;

    const gallery = Array.isArray(row.galleryImages) ? row.galleryImages : [];
    const nextGallery = [];
    for (const item of gallery) {
      if (typeof item !== "string") {
        nextGallery.push(item);
        continue;
      }
      const nextItem = await migrateSingleUrl(item);
      if (nextItem !== item) changed = true;
      nextGallery.push(nextItem);
    }

    const nextHtmlResult = await migrateContentHtml(row.contentHtml);
    if (nextHtmlResult.changed) changed = true;

    if (!changed) continue;

    summary.newsUpdated += 1;

    if (dryRun) {
      console.log(`[dry-run] update News ${row.id}`);
      continue;
    }

    await pool.query(
      `UPDATE "News"
       SET "coverImage" = $2,
           "galleryImages" = $3::jsonb,
           "contentHtml" = $4
       WHERE id = $1`,
      [row.id, nextCover, JSON.stringify(nextGallery), nextHtmlResult.value],
    );
  }
}

async function migrateAuthors() {
  const { rows } = await pool.query(`SELECT id, avatar FROM "Author" WHERE avatar IS NOT NULL`);

  for (const row of rows) {
    const nextAvatar = await migrateSingleUrl(row.avatar);
    if (nextAvatar === row.avatar) continue;

    summary.authorsUpdated += 1;

    if (dryRun) {
      console.log(`[dry-run] update Author ${row.id}`);
      continue;
    }

    await pool.query(`UPDATE "Author" SET avatar = $2 WHERE id = $1`, [row.id, nextAvatar]);
  }
}

async function migrateUsers() {
  const { rows } = await pool.query(`SELECT id, image FROM "User" WHERE image IS NOT NULL`);

  for (const row of rows) {
    const nextImage = await migrateSingleUrl(row.image);
    if (nextImage === row.image) continue;

    summary.usersUpdated += 1;

    if (dryRun) {
      console.log(`[dry-run] update User ${row.id}`);
      continue;
    }

    await pool.query(`UPDATE "User" SET image = $2 WHERE id = $1`, [row.id, nextImage]);
  }
}

async function migrateSiteSettings() {
  const { rows } = await pool.query(`SELECT key, value FROM "SiteSetting" WHERE value IS NOT NULL`);

  for (const row of rows) {
    const nextValue = await migrateSingleUrl(row.value);
    if (nextValue === row.value) continue;

    summary.siteSettingsUpdated += 1;

    if (dryRun) {
      console.log(`[dry-run] update SiteSetting ${row.key}`);
      continue;
    }

    await pool.query(`UPDATE "SiteSetting" SET value = $2 WHERE key = $1`, [row.key, nextValue]);
  }
}

async function main() {
  console.log(dryRun ? "Running dry-run Supabase -> R2 migration..." : "Running Supabase -> R2 migration...");
  await migrateNews();
  await migrateAuthors();
  await migrateUsers();
  await migrateSiteSettings();

  console.log("");
  console.log(`Files uploaded: ${summary.filesUploaded}`);
  console.log(`News updated: ${summary.newsUpdated}`);
  console.log(`Authors updated: ${summary.authorsUpdated}`);
  console.log(`Users updated: ${summary.usersUpdated}`);
  console.log(`Site settings updated: ${summary.siteSettingsUpdated}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => {});
  });
