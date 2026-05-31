-- Professional credentials: licenses, insurance, certifications and other
-- contractor credibility signals attached to a user's public profile. An admin
-- manually reviews each submission; only VERIFIED credentials are surfaced
-- publicly as verified badges.
--
-- Fully additive and backward-compatible:
--   * New User columns are nullable with no default.
--   * New enum values are appended to NotificationType (existing values keep
--     their ordinal positions).
--   * The new table and enums are net-new and touch no existing rows.

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('LICENSE', 'INSURANCE', 'CERTIFICATION', 'BOND', 'BACKGROUND_CHECK', 'TRADE_MEMBERSHIP', 'OTHER');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CREDENTIAL_VERIFIED';
ALTER TYPE "NotificationType" ADD VALUE 'CREDENTIAL_REJECTED';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "businessName" TEXT,
ADD COLUMN "serviceArea" TEXT,
ADD COLUMN "yearsExperience" INTEGER;

-- CreateTable
CREATE TABLE "ProfessionalCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT,
    "credentialNumber" TEXT,
    "jurisdiction" TEXT,
    "expirationDate" TIMESTAMP(3),
    "proofUrl" TEXT,
    "notes" TEXT,
    "status" "CredentialStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfessionalCredential_userId_idx" ON "ProfessionalCredential"("userId");

-- CreateIndex
CREATE INDEX "ProfessionalCredential_status_idx" ON "ProfessionalCredential"("status");

-- AddForeignKey
ALTER TABLE "ProfessionalCredential" ADD CONSTRAINT "ProfessionalCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalCredential" ADD CONSTRAINT "ProfessionalCredential_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
