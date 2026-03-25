import { isPostgres } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function buildNewsSearchWhere(query: string): Prisma.NewsWhereInput {
  const q = query.trim();
  if (!q) return {};

  const filter = isPostgres()
    ? ({ contains: q, mode: "insensitive" } as unknown as Prisma.StringFilter)
    : ({ contains: q } as Prisma.StringFilter);

  return {
    OR: [{ title: filter }, { lead: filter }],
  };
}

// Full-text search via PostgreSQL tsvector — runs on Supabase in production.
// Uses 'simple' config (no stemming) so it works for any language.
export async function searchNewsByFts(query: string, skip: number, take: number) {
  const q = query.trim();
  if (!q) return { ids: [], total: 0 };

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "News"
      WHERE status = 'PUBLISHED'
        AND "publishedAt" IS NOT NULL
        AND to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(lead, ''))
            @@ websearch_to_tsquery('simple', ${q})
      ORDER BY
        ts_rank(
          to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(lead, '')),
          websearch_to_tsquery('simple', ${q})
        ) DESC,
        "publishedAt" DESC
      LIMIT ${take} OFFSET ${skip}
    `,
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) AS count FROM "News"
      WHERE status = 'PUBLISHED'
        AND "publishedAt" IS NOT NULL
        AND to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(lead, ''))
            @@ websearch_to_tsquery('simple', ${q})
    `,
  ]);

  return {
    ids: rows.map((r) => r.id),
    total: Number(countRows[0]?.count ?? 0),
  };
}
