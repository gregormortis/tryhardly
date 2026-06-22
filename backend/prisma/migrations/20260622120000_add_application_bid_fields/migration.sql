-- Detailed multi-bid worker application fields.
--
-- Workers can now submit a full bid for a job (total amount, material/labor
-- split, estimated hours, itemized material list, tools, timeline, and an
-- optional remote or on-site walkthrough request) instead of just expressing
-- interest. Posters compare multiple bids and select one; only then is payment
-- authorized via the existing manual-capture Checkout flow (which reads
-- quest.reward). No payment mechanics are touched here.
--
-- Fully additive and backward-compatible:
--   * The new WalkthroughType enum is created fresh.
--   * Every new column is nullable, or NOT NULL with a default, so existing
--     Application rows backfill automatically.
--   * Application.coverLetter is relaxed from NOT NULL to nullable so a worker
--     can submit a structured bid without a free-text cover letter. Existing
--     rows already have a value, so no data is lost.

-- CreateEnum
CREATE TYPE "WalkthroughType" AS ENUM ('NONE', 'REMOTE', 'IN_PERSON');

-- AlterTable
ALTER TABLE "Application" ALTER COLUMN "coverLetter" DROP NOT NULL;

ALTER TABLE "Application"
  ADD COLUMN "bidAmount" DECIMAL(65,30),
  ADD COLUMN "materialCostEstimate" DECIMAL(65,30),
  ADD COLUMN "laborCostEstimate" DECIMAL(65,30),
  ADD COLUMN "estimatedLaborHours" DECIMAL(65,30),
  ADD COLUMN "materialItems" JSONB,
  ADD COLUMN "toolsNeeded" TEXT,
  ADD COLUMN "timeline" TEXT,
  ADD COLUMN "walkthroughRequested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "walkthroughType" "WalkthroughType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "proposedWalkthroughTimes" TEXT,
  ADD COLUMN "bidNotes" TEXT,
  ADD COLUMN "legalQualificationAck" BOOLEAN NOT NULL DEFAULT false;
