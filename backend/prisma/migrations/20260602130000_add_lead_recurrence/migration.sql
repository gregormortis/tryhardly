-- Recurrence intent on leads.
--
-- Lets a homeowner indicate repeat work (e.g. weekly mowing) on the public
-- /request-help intake form before an admin converts the lead to a quest. This
-- is a scheduling/visibility signal only: it does NOT charge, hold, or
-- pre-authorize any money. When a recurring lead is converted, the intent is
-- carried into the existing recurring quest template, where each occurrence
-- still pays out per-task on the normal completion flow.
--
-- Fully additive and backward-compatible: every new Lead column is nullable or
-- default-valued, so existing rows are unaffected and the non-recurring path is
-- the default. Reuses the RecurrenceCadence enum added with recurring bookings.

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN     "recurrenceCadence" "RecurrenceCadence";
ALTER TABLE "Lead" ADD COLUMN     "recurrenceInterval" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Lead" ADD COLUMN     "recurrenceEndDate" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN     "recurrenceCount" INTEGER;
