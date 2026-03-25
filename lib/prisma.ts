import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function resolveRawDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
  if (value) return value;

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is required in production environment.");
  }

  return "file:./dev.db";
}

function createPrismaClient(): PrismaClient {
  const url = resolveRawDatabaseUrl();

  if (/^postgres(?:ql)?:\/\//i.test(url)) {
    // Use the pg Node.js driver adapter instead of Prisma's native Rust engine.
    // The Rust engine (libquery_engine) panics with "PANIC: timer has gone away"
    // on Hostinger's Linux containers because the seccomp policy blocks the
    // timer syscalls that tokio (Prisma's async runtime) requires.
    // The pg adapter runs entirely in Node.js — no native binary, no panic.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Pool } = require("pg") as typeof import("pg");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PrismaPg } = require("@prisma/adapter-pg") as typeof import("@prisma/adapter-pg");
    const pool = new Pool({
      connectionString: url,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 8_000,
    });
    // @ts-ignore – adapter property is present when client is generated from the
    // postgres schema; suppressed here so local sqlite builds don't fail.
    return new PrismaClient({
      adapter: new PrismaPg(pool),
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  // SQLite – local dev only
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
