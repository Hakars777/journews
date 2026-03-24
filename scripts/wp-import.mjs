#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// WordPress → JourNews importer
// Usage: node --env-file=.env scripts/wp-import.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const WP_BASE_URL = "https://journews.am";
const POST_LIMIT  = 300;   // 0 = all posts; N = N most recent posts
const SKIP_IMAGES = false; // true = keep original WP image URLs (no re-upload)
const DELAY_MS    = 150;   // ms between requests (be polite to WP server)
const PER_PAGE    = 100;
// ─────────────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "media";

// ── Helpers ───────────────────────────────────────────────────────────────────

function stripHtml(html = "") {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#8230;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function uploadImageFromUrl(imageUrl, folder = "news/cover") {
  if (SKIP_IMAGES || !supabase) return imageUrl;
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return imageUrl;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const ext = contentType.split("/")[1]?.split(";")[0]?.replace("jpeg", "jpg") || "jpg";
    const buffer = await res.arrayBuffer();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const rand = Math.random().toString(36).slice(2, 12);
    const path = `${folder}/${year}/${month}/${rand}.${ext}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, cacheControl: "31536000", upsert: false });
    if (error) { process.stdout.write("(img-err) "); return imageUrl; }
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch {
    return imageUrl;
  }
}

async function wpFetch(path) {
  const url = `${WP_BASE_URL}/wp-json/wp/v2${path}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`WP API ${res.status}: ${url}`);
  return { data: await res.json(), headers: res.headers };
}

async function fetchAllPages(path, limit = 0) {
  const results = [];
  let page = 1;
  while (true) {
    process.stdout.write(`  page ${page}... `);
    const { data, headers } = await wpFetch(`${path}&per_page=${PER_PAGE}&page=${page}`);
    if (!Array.isArray(data) || !data.length) { console.log("done"); break; }
    results.push(...data);
    console.log(`got ${data.length} (total ${results.length})`);
    const totalPages = parseInt(headers.get("x-wp-totalpages") || "1", 10);
    if (limit > 0 && results.length >= limit) { results.splice(limit); break; }
    if (page >= totalPages) break;
    page++;
    await sleep(DELAY_MS);
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 WordPress → JourNews import");
  console.log(`   Source : ${WP_BASE_URL}`);
  console.log(`   Limit  : ${POST_LIMIT || "all"} posts`);
  console.log(`   Images : ${SKIP_IMAGES ? "keep original URLs" : supabase ? "upload to Supabase ✓" : "keep original URLs (Supabase not configured)"}`);
  console.log();

  // ── Categories ─────────────────────────────────────────────────────────────
  console.log("📂 Categories...");
  const { data: wpCats } = await wpFetch("/categories?per_page=100");
  const categoryMap = new Map(); // wpId → prisma id
  for (const c of wpCats) {
    if (c.slug === "uncategorized") continue;
    let row = await prisma.category.findUnique({ where: { slug: c.slug } });
    if (!row) {
      row = await prisma.category.create({ data: { name: c.name, slug: c.slug } });
      console.log(`  + ${c.name}`);
    }
    categoryMap.set(c.id, row.id);
  }

  // ── Tags ───────────────────────────────────────────────────────────────────
  console.log("🏷  Tags...");
  const { data: wpTags } = await wpFetch("/tags?per_page=100");
  const tagMap = new Map(); // wpId → prisma id
  for (const t of wpTags) {
    let row = await prisma.tag.findUnique({ where: { slug: t.slug } });
    if (!row) row = await prisma.tag.create({ data: { name: t.name, slug: t.slug } });
    tagMap.set(t.id, row.id);
  }

  // ── WP Authors → JourNews Authors ─────────────────────────────────────────
  console.log("✍️  Authors...");
  const { data: wpUsers } = await wpFetch("/users?per_page=100");
  const authorMap = new Map(); // wpUserId → prisma author id
  for (const u of wpUsers) {
    const slug = u.slug || `author-${u.id}`;
    let row = await prisma.author.findUnique({ where: { slug } });
    if (!row) {
      row = await prisma.author.create({ data: { name: u.name, slug } });
      console.log(`  + ${u.name}`);
    }
    authorMap.set(u.id, row.id);
  }
  // Fallback author
  let fallbackAuthor = await prisma.author.findUnique({ where: { slug: "redakciya" } });
  if (!fallbackAuthor) {
    fallbackAuthor = await prisma.author.create({ data: { name: "Редакция", slug: "redakciya" } });
  }

  // ── Posts ──────────────────────────────────────────────────────────────────
  console.log(`\n📰 Fetching posts...`);
  const wpPosts = await fetchAllPages("/posts?orderby=date&order=desc&_embed=1", POST_LIMIT);
  console.log(`\nImporting ${wpPosts.length} posts...\n`);

  let created = 0, skipped = 0, errors = 0;

  for (let i = 0; i < wpPosts.length; i++) {
    const wp = wpPosts[i];
    const title = stripHtml(wp.title?.rendered || "") || `Post ${wp.id}`;
    const slug = decodeURIComponent(wp.slug || `post-${wp.id}`);

    process.stdout.write(`  [${String(i + 1).padStart(3)}/${wpPosts.length}] ${title.slice(0, 55).padEnd(55)} `);

    // Skip duplicates
    const exists = await prisma.news.findUnique({ where: { slug } });
    if (exists) { console.log("SKIP"); skipped++; continue; }

    try {
      // Featured image
      let coverImage = null;
      const media = wp._embedded?.["wp:featuredmedia"]?.[0];
      if (media?.source_url) {
        coverImage = await uploadImageFromUrl(media.source_url, "news/cover");
      }

      // Category (first mapped one)
      const terms = wp._embedded?.["wp:term"] || [];
      const wpCatTerms = terms[0] || [];
      let categoryId = null;
      for (const c of wpCatTerms) {
        if (categoryMap.has(c.id)) { categoryId = categoryMap.get(c.id); break; }
      }

      // Tags
      const wpTagTerms = terms[1] || [];
      const tagIds = wpTagTerms.filter((t) => tagMap.has(t.id)).map((t) => tagMap.get(t.id));

      // Author
      const authorId = authorMap.get(wp.author) ?? fallbackAuthor.id;

      // Lead from excerpt
      const lead = stripHtml(wp.excerpt?.rendered || "").slice(0, 500) || null;

      // Status & dates
      const status = wp.status === "publish" ? "PUBLISHED" : "DRAFT";
      const publishedAt = wp.status === "publish" ? new Date(wp.date) : null;

      await prisma.news.create({
        data: {
          title,
          slug,
          lead,
          contentHtml: wp.content?.rendered || "",
          status,
          publishedAt,
          coverImage,
          categoryId,
          authorId,
          tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
        },
      });

      console.log(`OK${coverImage ? " 🖼" : ""}`);
      created++;
    } catch (e) {
      console.log(`ERR: ${e.message.slice(0, 60)}`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n✅ Import complete`);
  console.log(`   Created : ${created}`);
  console.log(`   Skipped : ${skipped} (already existed)`);
  console.log(`   Errors  : ${errors}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
