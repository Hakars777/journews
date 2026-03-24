import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("slug") ?? "";
  const decoded = decodeURIComponent(raw);

  const bySlug = await prisma.news.findFirst({
    where: { slug: decoded },
    select: { id: true, slug: true, status: true, publishedAt: true, title: true },
  });

  const sample = await prisma.news.findMany({
    take: 3,
    orderBy: { publishedAt: "desc" },
    select: { id: true, slug: true, status: true, publishedAt: true },
  });

  return NextResponse.json({
    raw,
    decoded,
    bySlug,
    sample,
  });
}
