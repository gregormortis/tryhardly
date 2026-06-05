-- Marketplace destination-charge support.
--
-- Adds a nullable column to record the Stripe Checkout Session that collected a
-- client's job payment under the Connect marketplace flow (destination charge:
-- the session takes the 12% platform fee via application_fee_amount and routes
-- the net to the worker's connected account via transfer_data.destination).
--
-- Fully additive and backward-compatible: the column is nullable, so existing
-- Quest rows are unaffected and the legacy payment/escrow path keeps working
-- unchanged. No money, payment-config, or auth surface is touched.

-- AlterTable
ALTER TABLE "Quest" ADD COLUMN     "checkoutSessionId" TEXT;
