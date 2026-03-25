import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSchedulerIfNeeded } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

// Lightweight endpoint to keep the serverless function warm.
// An external cron service (e.g. cron-job.org) should hit this every 4-5 min.
// Also triggers scheduled news auto-publish.
export async function GET() {
  const start = performance.now();

  try {
    await Promise.all([
      prisma.news.count({ where: { status: "PUBLISHED" } }),
      runSchedulerIfNeeded(),
    ]);

    const ms = (performance.now() - start).toFixed(0);
    return NextResponse.json({ ok: true, ms: Number(ms) });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
