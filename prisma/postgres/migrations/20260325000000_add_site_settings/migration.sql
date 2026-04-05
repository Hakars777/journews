CREATE TABLE IF NOT EXISTS "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "News_status_publishedAt_idx" ON "News"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "News_isTop_idx" ON "News"("isTop");
CREATE INDEX IF NOT EXISTS "News_isEditorsPick_idx" ON "News"("isEditorsPick");
