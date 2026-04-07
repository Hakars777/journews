import { spawnSync } from "node:child_process";
import path from "node:path";

function isTruthy(value) {
  if (!value) return false;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

const isVercel = isTruthy(process.env.VERCEL) || !!process.env.VERCEL_ENV;
const vercelEnv = String(process.env.VERCEL_ENV || "").trim().toLowerCase();

if (isTruthy(process.env.PRISMA_SKIP_MIGRATE_BUILD)) {
  console.warn("[prisma] Skipping migrate deploy because PRISMA_SKIP_MIGRATE_BUILD is enabled.");
  process.exit(0);
}

if (isVercel && vercelEnv === "preview" && !isTruthy(process.env.PRISMA_MIGRATE_PREVIEW)) {
  console.warn(
    "[prisma] Skipping migrate deploy for Vercel preview build. Set PRISMA_MIGRATE_PREVIEW=true only if this preview uses a dedicated preview database.",
  );
  process.exit(0);
}

const prismaScript = path.join(process.cwd(), "scripts", "prisma.mjs");
const result = spawnSync(process.execPath, [prismaScript, "migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
