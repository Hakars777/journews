#!/usr/bin/env node
// Decode percent-encoded slugs in the database
// Usage: node --env-file=.env.hostinger scripts/fix-slugs.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.news.findMany({
    where: { slug: { contains: "%" } },
    select: { id: true, slug: true },
  });

  console.log(`Found ${all.length} news with encoded slugs`);

  let updated = 0;
  let skipped = 0;

  for (const item of all) {
    const decoded = decodeURIComponent(item.slug);
    if (decoded === item.slug) { skipped++; continue; }

    // Check if decoded slug already exists (avoid duplicate)
    const exists = await prisma.news.findFirst({
      where: { slug: decoded, NOT: { id: item.id } },
      select: { id: true },
    });

    if (exists) {
      console.log(`  SKIP (conflict): ${decoded}`);
      skipped++;
      continue;
    }

    await prisma.news.update({ where: { id: item.id }, data: { slug: decoded } });
    console.log(`  ✓ ${item.slug.slice(0, 30)}... → ${decoded.slice(0, 50)}`);
    updated++;
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
