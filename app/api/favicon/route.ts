import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const setting = await prisma.siteSetting
    .findUnique({ where: { key: "favicon" } })
    .catch(() => null);

  if (!setting?.value) {
    return new NextResponse(null, { status: 404 });
  }

  const res = await fetch(setting.value, { cache: "no-store" });
  if (!res.ok) return new NextResponse(null, { status: 404 });

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/png";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
