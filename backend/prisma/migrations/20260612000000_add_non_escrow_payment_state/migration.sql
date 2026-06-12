-- Non-escrow marketplace payment state (authorize → complete → capture → payout).
--
-- The marketplace Checkout flow now authorizes the customer's card at booking
-- (Stripe manual capture) and captures the charge only when the task is confirmed
-- complete. There is no fund-holding / custody step. These additive columns track
-- that lifecycle separately from the legacy `escrowStatus` enum (which gates the
-- old separate-charges-and-transfers milestone path and is untouched here).
--
-- Fully additive and backward-compatible:
--   * The new enum is created fresh.
--   * `paymentStatus` is NOT NULL with a default of 'NONE', so existing Quest rows
--     backfill to NONE automatically.
--   * The three timestamp columns are nullable.
-- No money, payment-config, env, or auth surface is touched.

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('NONE', 'AUTHORIZED', 'CAPTURED', 'CANCELED', 'CAPTURE_FAILED');

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "paymentAuthorizedAt" TIMESTAMP(3),
ADD COLUMN     "paymentCapturedAt" TIMESTAMP(3),
ADD COLUMN     "paymentCanceledAt" TIMESTAMP(3);
