import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Lightweight endpoint to keep the serverless function warm.
// An external cron service (e.g. cron-job.org) should hit this every 4-5 min.
export async function GET() {
  const start = performance.now();

  try {
    // Single fast query to keep DB connection pool alive
    await prisma.news.count({
      where: { status: "PUBLISHED" },
    });

    const ms = (performance.now() - start).toFixed(0);
    return NextResponse.json({ ok: true, ms: Number(ms) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
