#!/usr/bin/env node
// Marks the 5 most recent published articles as isTop=true
// and the next 5 as isEditorsPick=true.
// Usage: node --env-file=.env.production scripts/set-top-and-picks.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const latest = await prisma.news.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 10,
    select: { id: true, title: true, publishedAt: true },
  });

  if (!latest.length) {
    console.log("Нет опубликованных статей.");
    return;
  }

  const topIds       = latest.slice(0, 5).map((n) => n.id);
  const picksIds     = latest.slice(5, 10).map((n) => n.id);

  // Сначала сбрасываем все старые флаги
  await prisma.news.updateMany({ data: { isTop: false, isEditorsPick: false } });

  // Топ-новости
  await prisma.news.updateMany({
    where: { id: { in: topIds } },
    data: { isTop: true },
  });

  // Выбор редакции
  await prisma.news.updateMany({
    where: { id: { in: picksIds } },
    data: { isEditorsPick: true },
  });

  console.log("\n✅ Топ-новости:");
  latest.slice(0, 5).forEach((n) =>
    console.log(`  • ${n.title.slice(0, 60)}`),
  );

  console.log("\n✅ Выбор редакции:");
  latest.slice(5, 10).forEach((n) =>
    console.log(`  • ${n.title.slice(0, 60)}`),
  );

  console.log("\nГотово!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
