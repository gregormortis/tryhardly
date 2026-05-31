-- Lead source attribution: capture which launch channel drove each lead so we
-- can measure what's working (redding, facebook-requester, flyer-worker, etc).
-- Fully additive and backward-compatible — both columns are nullable and have no
-- default, so existing rows and any code path that omits attribution are
-- unaffected. `source` is the primary channel label; `utm` is a small JSON blob
-- of UTM/ref params.

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN "source" TEXT,
ADD COLUMN "utm" JSONB;

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");
