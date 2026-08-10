-- Young workers (16-17), with a guardian-owned account.
-- Additive and fully nullable: adult accounts are untouched.
-- See src/config/youthPolicy.ts for the rules and legal citations.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dateOfBirth"          TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isYouthWorker"        BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "guardianName"         TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "guardianEmail"        TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "guardianPhone"        TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "guardianConsentAt"    TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "guardianConsentTerms" TEXT;

CREATE INDEX IF NOT EXISTS "User_isYouthWorker_idx" ON "User"("isYouthWorker");
