ALTER TABLE "News" ADD COLUMN IF NOT EXISTS "isTicker" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "News_isTicker_publishedAt_idx" ON "News"("isTicker", "publishedAt");
