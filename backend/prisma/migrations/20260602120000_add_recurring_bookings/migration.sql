-- Recurring booking template support.
--
-- Lets a client mark a job as recurring (weekly / biweekly / monthly) so the
-- repeat relationship stays on-platform instead of the lead being lost after a
-- single booking. This is a scheduling/visibility template only: it does NOT
-- charge, hold, or pre-authorize any money. Each actual occurrence remains its
-- own quest paid out per-task on the normal completion flow.
--
-- Fully additive and backward-compatible:
--   * Every new Quest column is nullable or default-valued, so existing rows are
--     unaffected and the non-recurring path is the default.
--   * The recurrenceParentId self-relation is nullable with ON DELETE SET NULL,
--     so deleting a template never cascades into generated occurrences.
--   * New enum + indexes are purely additive.

-- CreateEnum
CREATE TYPE "RecurrenceCadence" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quest" ADD COLUMN     "recurrenceCadence" "RecurrenceCadence";
ALTER TABLE "Quest" ADD COLUMN     "recurrenceInterval" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Quest" ADD COLUMN     "recurrenceEndDate" TIMESTAMP(3);
ALTER TABLE "Quest" ADD COLUMN     "recurrenceCount" INTEGER;
ALTER TABLE "Quest" ADD COLUMN     "nextOccurrenceAt" TIMESTAMP(3);
ALTER TABLE "Quest" ADD COLUMN     "recurrenceParentId" TEXT;

-- CreateIndex
CREATE INDEX "Quest_recurrenceParentId_idx" ON "Quest"("recurrenceParentId");

-- CreateIndex
CREATE INDEX "Quest_isRecurring_idx" ON "Quest"("isRecurring");

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_recurrenceParentId_fkey" FOREIGN KEY ("recurrenceParentId") REFERENCES "Quest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
