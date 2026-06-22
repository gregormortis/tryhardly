-- Worker Service Packages: repeatable, local service listings a worker
-- publishes (e.g. "Dump Run — Pickup Truck Load", "2-Hour Yard Cleanup").
--
-- Fully additive and backward-compatible:
--   * The ServicePackage table is net-new and touches no existing rows.
--   * A package is a LISTING, never a payment — nothing here charges, holds, or
--     authorizes money. The Stripe/manual-capture flow is untouched.
--   * The FK uses ON DELETE CASCADE so removing a user removes their listings.
--   * `active` defaults to false so a freshly created package isn't published
--     until the worker is ready.

-- CreateEnum
CREATE TYPE "ServicePriceType" AS ENUM ('STARTING_AT', 'FLAT_RATE', 'HOURLY', 'QUOTE_NEEDED');

-- CreateTable
CREATE TABLE "ServicePackage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "priceType" "ServicePriceType" NOT NULL DEFAULT 'STARTING_AT',
    "startingPrice" DECIMAL(65,30),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "includedScope" TEXT,
    "addOns" TEXT,
    "exclusions" TEXT,
    "materialsPolicy" TEXT,
    "serviceArea" TEXT,
    "availability" TEXT,
    "toolsProvided" TEXT,
    "imageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServicePackage_userId_idx" ON "ServicePackage"("userId");

-- CreateIndex
CREATE INDEX "ServicePackage_active_idx" ON "ServicePackage"("active");

-- CreateIndex
CREATE INDEX "ServicePackage_category_idx" ON "ServicePackage"("category");

-- AddForeignKey
ALTER TABLE "ServicePackage" ADD CONSTRAINT "ServicePackage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
