-- Account soft-deletion so a finalized deletion request disables login without
-- hard-deleting the User row (which is referenced by quests, reviews, messages
-- and payment records retained for legal/compliance reasons). Fully additive:
-- every existing row defaults to ACTIVE with a NULL deletedAt, so behavior is
-- unchanged until an account is explicitly finalized.

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DELETED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Enforce at most one PENDING deletion request per user, closing the
-- check-then-create race that previously allowed duplicate pending rows.
CREATE UNIQUE INDEX "AccountDeletionRequest_userId_pending_key"
  ON "AccountDeletionRequest"("userId")
  WHERE "status" = 'PENDING';
