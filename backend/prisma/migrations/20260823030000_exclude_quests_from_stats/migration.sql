ALTER TABLE "Quest" ADD COLUMN "excludedFromStats" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quest" ADD COLUMN "excludedReason" TEXT;
CREATE INDEX "Quest_excludedFromStats_idx" ON "Quest"("excludedFromStats");
