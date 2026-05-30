-- No-account claim/manage link for JOB_REQUEST leads.
-- Fully additive and backward-compatible — adds nullable claim-token columns to
-- the existing Lead table. Only a SHA-256 hash of the token is stored; the raw
-- token is emailed to the requester and never persisted.

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "claimTokenHash" TEXT,
ADD COLUMN     "claimTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "claimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_claimTokenHash_key" ON "Lead"("claimTokenHash");
