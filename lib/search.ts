import { isPostgres } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export function buildNewsSearchWhere(query: string): Prisma.NewsWhereInput {
  const q = query.trim();
  if (!q) return {};

  const filter = isPostgres()
    ? ({ contains: q, mode: "insensitive" } as unknown as Prisma.StringFilter)
    : ({ contains: q } as Prisma.StringFilter);

  return {
    OR: [{ title: filter }, { lead: filter }, { contentHtml: filter }],
  };
}
