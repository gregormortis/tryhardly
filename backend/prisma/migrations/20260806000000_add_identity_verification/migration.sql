-- Stripe Identity (government ID + selfie) verification. Second layer of the
-- post-2026-08-04 fraud remediation, alongside email verification. Fully
-- additive: "identityVerificationStatus" defaults to 'NONE' for every
-- existing row, so no existing worker is retroactively blocked from
-- checkout until they attempt a NEW payment after this deploy (at which
-- point they'll be prompted to verify, same as any new user).

-- AlterTable
ALTER TABLE "User" ADD COLUMN "identityVerificationStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "User" ADD COLUMN "identityVerifiedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "stripeIdentitySessionId" TEXT;
