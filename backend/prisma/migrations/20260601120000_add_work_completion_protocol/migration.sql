-- Work completion protocol: the worker→client completion handshake.
--
-- Fully additive and backward-compatible:
--   * All new Quest columns are nullable or default-valued, so existing rows are
--     unaffected and the legacy "owner marks complete" path keeps working.
--   * completionProofUrls stores only worker-supplied image URLs (no file
--     storage), mirroring the ProofOfWork / credential convention.
--   * The new NotificationType enum values are additive — existing notifications
--     are untouched.

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN "completionNote" TEXT;
ALTER TABLE "Quest" ADD COLUMN "completionProofUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Quest" ADD COLUMN "completionRequestedAt" TIMESTAMP(3);
ALTER TABLE "Quest" ADD COLUMN "completionConfirmedAt" TIMESTAMP(3);
ALTER TABLE "Quest" ADD COLUMN "changeRequestCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Quest" ADD COLUMN "changeRequestNote" TEXT;

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COMPLETION_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'COMPLETION_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE 'COMPLETION_CHANGES_REQUESTED';
