import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

const VIEW_TTL_MIN = 10;

export async function POST(
  req: NextRequest,
  { params }: { params: { newsId: string } },
) {
  const newsId = params.newsId;
  if (!newsId) return NextResponse.json({ ok: false }, { status: 400 });

  const ttlMs = VIEW_TTL_MIN * 60 * 1000;
  const now = Date.now();
  const cookieName = `jn_view_${newsId}`;

  const existing = req.cookies.get(cookieName)?.value;
  if (existing) {
    const ts = Number(existing);
    if (Number.isFinite(ts) && now - ts < ttlMs) {
      return NextResponse.json({ ok: true, counted: false });
    }
  }

  try {
    await prisma.$transaction([
      prisma.newsView.create({ data: { newsId } }),
      prisma.news.update({ where: { id: newsId }, data: { views: { increment: 1 } } }),
    ]);
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true, counted: true });
  res.cookies.set(cookieName, String(now), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(ttlMs / 1000),
  });
  return res;
}

