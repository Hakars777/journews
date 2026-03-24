import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key]) continue;
    let val = m[2] ?? "";
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function loadDotEnvIfNeeded() {
  if (process.env.DATABASE_URL || process.env.PRISMA_SCHEMA) return;

  const cwd = process.cwd();
  loadEnvFile(path.join(cwd, ".env"));
  loadEnvFile(path.join(cwd, ".env.production"));
}

function ensureDatabaseUrl() {
  const isProduction = process.env.NODE_ENV === "production";
  const value = process.env.DATABASE_URL?.trim();

  if (!value) {
    if (isProduction) {
      throw new Error(
        "[prisma] DATABASE_URL is not set in production. Configure it in hosting environment variables.",
      );
    }
    process.env.DATABASE_URL = "file:./dev.db";
    // eslint-disable-next-line no-console
    console.warn(
      "[prisma] DATABASE_URL is not set. Falling back to file:./dev.db",
    );
    return;
  }

  process.env.DATABASE_URL = value;

  if (isProduction && /^file:/i.test(value)) {
    throw new Error(
      "[prisma] DATABASE_URL points to SQLite in production. Use your PostgreSQL URL.",
    );
  }
}

function resolveSchemaPath() {
  // Allow explicit override for unusual setups.
  if (process.env.PRISMA_SCHEMA) return process.env.PRISMA_SCHEMA;

  const url = process.env.DATABASE_URL ?? "";
  const isPostgres = /^postgres(ql)?:\/\//i.test(url);
  if (isPostgres) return "prisma/postgres/schema.prisma";

  // Default local/dev DB.
  return "prisma/schema.prisma";
}

loadDotEnvIfNeeded();

// `prisma generate` only reads the schema file — it never connects to the DB.
// Skip strict production validation so postinstall succeeds even when
// DATABASE_URL is not yet injected (e.g. Hostinger build pipeline).
const primaryCommand = process.argv[2] ?? "";
if (primaryCommand !== "generate") {
  ensureDatabaseUrl();
} else if (!process.env.DATABASE_URL) {
  // For generate: pick postgres schema in production, sqlite otherwise.
  process.env.DATABASE_URL =
    process.env.NODE_ENV === "production"
      ? "postgresql://prisma:prisma@localhost:5432/prisma"
      : "file:./dev.db";
}

const schema = resolveSchemaPath();

// Fix execute permissions for Prisma engine binaries (required on some Linux hosts, e.g. Hostinger)
try {
  const enginesDir = path.join(process.cwd(), "node_modules", "@prisma", "engines");
  if (fs.existsSync(enginesDir)) {
    for (const entry of fs.readdirSync(enginesDir)) {
      if (entry.startsWith("schema-engine-") || entry.startsWith("query-engine-")) {
        try { fs.chmodSync(path.join(enginesDir, entry), 0o755); } catch {}
      }
    }
  }
} catch {}

const prismaCli = path.join(
  process.cwd(),
  "node_modules",
  "prisma",
  "build",
  "index.js",
);

const args = process.argv.slice(2);
const result = spawnSync(process.execPath, [prismaCli, ...args, "--schema", schema], {
  stdio: "inherit",
  env: process.env,
});

if (result.error) {
  // eslint-disable-next-line no-console
  console.error(result.error);
}

process.exit(result.status ?? 1);
