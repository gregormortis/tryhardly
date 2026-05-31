-- Professionalism layer: the Code of Craft pledge and a worker-curated
-- proof-of-work gallery.
--
-- Fully additive and backward-compatible:
--   * The new User column is nullable with no default — existing rows are
--     unaffected and read as "not pledged".
--   * The new ProofOfWork table is net-new and touches no existing rows. We
--     store only URLs (no file storage), mirroring the credential model.
--   * The optional questId foreign key uses ON DELETE SET NULL so removing a
--     quest never destroys a worker's gallery item — it just drops the link.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "codeOfCraftPledgedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProofOfWork" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skillTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProofOfWork_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProofOfWork_userId_idx" ON "ProofOfWork"("userId");

-- CreateIndex
CREATE INDEX "ProofOfWork_questId_idx" ON "ProofOfWork"("questId");

-- AddForeignKey
ALTER TABLE "ProofOfWork" ADD CONSTRAINT "ProofOfWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofOfWork" ADD CONSTRAINT "ProofOfWork_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
