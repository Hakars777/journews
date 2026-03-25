#!/usr/bin/env node
// Creates SiteSetting table if it doesn't exist yet in PostgreSQL
// Usage: node --env-file=.env.production scripts/ensure-site-settings.mjs

import pg from "pg";
const { Client } = pg;

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// Check if table exists
const { rows } = await client.query(`
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'SiteSetting'
  ) AS exists
`);

if (rows[0].exists) {
  console.log("✅ Таблица SiteSetting уже существует");
} else {
  console.log("⚠️  Таблица SiteSetting не найдена — создаю...");
  await client.query(`
    CREATE TABLE "SiteSetting" (
      "key"       TEXT NOT NULL,
      "value"     TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
    )
  `);
  console.log("✅ Таблица создана");
}

await client.end();
