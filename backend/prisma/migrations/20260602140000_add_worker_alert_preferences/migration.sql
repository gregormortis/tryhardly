-- Worker-alert delivery + matching preferences.
--
-- Lets a worker who signs up at /work-alerts control how they're alerted about
-- matching local jobs and narrow matches to their desired pay range:
--   * emailAlertsOptIn — receive email alerts (defaults true so existing
--     worker-alert leads keep getting the emails they signed up for).
--   * smsAlertsOptIn / smsConsentAt — explicit, recorded opt-in to text alerts.
--     STORED ONLY. No SMS is sent because no SMS provider is configured; the UI
--     shows "text alerts coming soon". Capturing consent now (with timestamp)
--     lets sending be switched on later behind a provider without re-asking.
--   * budgetMin / budgetMax — the worker's desired pay range in whole dollars.
--     Used by matching to skip jobs whose budget falls entirely below the
--     worker's floor. Null means "no preference" (unchanged behavior).
--
-- Fully additive and backward-compatible: every new column is nullable or
-- default-valued, so existing Lead rows are unaffected and no existing flow
-- changes. No money, payment, or auth surface is touched.

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "emailAlertsOptIn" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Lead" ADD COLUMN     "smsAlertsOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN     "smsConsentAt" TIMESTAMP(3);
ALTER TABLE "Lead" ADD COLUMN     "budgetMin" INTEGER;
ALTER TABLE "Lead" ADD COLUMN     "budgetMax" INTEGER;
