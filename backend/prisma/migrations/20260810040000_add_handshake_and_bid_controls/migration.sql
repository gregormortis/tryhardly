-- The Handshake: a mutual, timestamped agreement on price, time, place and
-- scope. Replaces the payment authorization as the commitment device now that
-- TryHardly does not process payments.
--
-- Additive only. Every column added to an existing table is nullable, so
-- existing rows and the platform-payments path are unaffected.

CREATE TYPE "HandshakeStatus" AS ENUM (
  'PROPOSED', 'AGREED', 'DECLINED', 'SUPERSEDED', 'BROKEN', 'HONORED'
);

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'HANDSHAKE_PROPOSED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'HANDSHAKE_AGREED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'HANDSHAKE_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'HANDSHAKE_BROKEN';

-- Bid controls. maxApplications already existed but was never enforced.
ALTER TABLE "Quest" ADD COLUMN IF NOT EXISTS "biddingClosedAt" TIMESTAMP(3);

CREATE TABLE "Handshake" (
  "id"             TEXT NOT NULL,
  "questId"        TEXT NOT NULL,
  "posterId"       TEXT NOT NULL,
  "workerId"       TEXT NOT NULL,
  "proposedById"   TEXT NOT NULL,
  "amountCents"    INTEGER NOT NULL,
  "scheduledFor"   TIMESTAMP(3),
  "scheduleNote"   TEXT,
  "location"       TEXT,
  "scope"          TEXT NOT NULL,
  "paymentMethod"  TEXT,
  "status"         "HandshakeStatus" NOT NULL DEFAULT 'PROPOSED',
  "version"        INTEGER NOT NULL DEFAULT 1,
  "posterAgreedAt" TIMESTAMP(3),
  "workerAgreedAt" TIMESTAMP(3),
  "agreedAt"       TIMESTAMP(3),
  "declinedAt"     TIMESTAMP(3),
  "declinedById"   TEXT,
  "brokenAt"       TIMESTAMP(3),
  "brokenById"     TEXT,
  "brokenReason"   TEXT,
  "honoredAt"      TIMESTAMP(3),
  "supersededById" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Handshake_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Handshake_supersededById_key" ON "Handshake"("supersededById");
CREATE INDEX "Handshake_questId_idx"  ON "Handshake"("questId");
CREATE INDEX "Handshake_posterId_idx" ON "Handshake"("posterId");
CREATE INDEX "Handshake_workerId_idx" ON "Handshake"("workerId");
CREATE INDEX "Handshake_status_idx"   ON "Handshake"("status");

ALTER TABLE "Handshake" ADD CONSTRAINT "Handshake_questId_fkey"
  FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Handshake" ADD CONSTRAINT "Handshake_posterId_fkey"
  FOREIGN KEY ("posterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Handshake" ADD CONSTRAINT "Handshake_workerId_fkey"
  FOREIGN KEY ("workerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Handshake" ADD CONSTRAINT "Handshake_proposedById_fkey"
  FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Handshake" ADD CONSTRAINT "Handshake_supersededById_fkey"
  FOREIGN KEY ("supersededById") REFERENCES "Handshake"("id") ON DELETE SET NULL ON UPDATE CASCADE;
