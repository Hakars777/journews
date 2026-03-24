import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Diagnostic endpoint — safe to leave in production.
// Returns env status and a live DB ping so you can diagnose Hostinger issues
// without needing SSH access. Passwords are masked in the DATABASE_URL output.
export async function GET() {
  const rawDbUrl = process.env.DATABASE_URL ?? "";
  const maskedDbUrl = rawDbUrl
    ? rawDbUrl.replace(/:([^:@]{1,128})@/, ":***@")
    : "(not set)";

  const info: Record<string, unknown> = {
    NODE_ENV: process.env.NODE_ENV ?? "(not set)",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "set" : "(not set)",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "(not set)",
    DATABASE_URL: maskedDbUrl,
    SUPABASE_URL: process.env.SUPABASE_URL ? "set" : "(not set)",
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    info.db = "connected";
    return NextResponse.json({ status: "ok", ...info });
  } catch (err) {
    info.db = "error";
    info.dbError = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: "error", ...info }, { status: 500 });
  }
}
