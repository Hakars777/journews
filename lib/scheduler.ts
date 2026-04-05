import { prisma } from "@/lib/prisma";

const THROTTLE_MS = 60_000;

declare global {
  // eslint-disable-next-line no-var
  var __journewsSchedulerLastRun: number | undefined;
}

function shouldSkipScheduler() {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build";
}

export async function runSchedulerIfNeeded() {
  if (shouldSkipScheduler()) return;
  const lastRun = globalThis.__journewsSchedulerLastRun ?? 0;
  const now = Date.now();
  if (now - lastRun < THROTTLE_MS) return;

  globalThis.__journewsSchedulerLastRun = now;

  const ts = new Date();
  // Lightweight scheduled publish: no per-record work, no cron.
  try {
    await prisma.news.updateMany({
      where: {
        status: "SCHEDULED",
        scheduledAt: { not: null, lte: ts },
      },
      data: {
        status: "PUBLISHED",
        publishedAt: ts,
        scheduledAt: null,
      },
    });
  } catch {
    // Admin and public pages must still render even if the scheduler tick fails.
  }
}

