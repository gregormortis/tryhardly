import Stripe from 'stripe';

const PLATFORM_FEE_PERCENT = 12; // 12% platform commission

/**
 * Lazily-initialized Stripe client.
 *
 * The client is NOT created at import time. Creating it on first use means
 * importing this module (e.g. transitively via `./app`) never throws when
 * STRIPE_SECRET_KEY is unset — only code paths that actually talk to Stripe
 * require the key. This keeps the server bootable for non-payment routes and
 * lets `dotenv.config()` run before the key is ever read.
 */
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required');
  }

  _stripe = new Stripe(secretKey, {
    apiVersion: '2023-10-16',
    typescript: true,
  });

  return _stripe;
}

/**
 * Create a Stripe Connect Express account for a user.
 * This lets adventurers receive payouts.
 */
export async function createConnectedAccount(
  userId: string,
  email: string
): Promise<Stripe.Account> {
  const account = await getStripe().accounts.create({
    type: 'express',
    email,
    metadata: { tryhardly_user_id: userId },
    capabilities: {
      transfers: { requested: true },
    },
  });

  return account;
}

/**
 * Generate an account onboarding link for Stripe Connect.
 */
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  const link = await getStripe().accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return link;
}

/**
 * Create a Stripe Customer for a quest giver (if they don't have one).
 */
export async function createCustomer(
  userId: string,
  email: string
): Promise<Stripe.Customer> {
  const customer = await getStripe().customers.create({
    email,
    metadata: { tryhardly_user_id: userId },
  });

  return customer;
}

/**
 * Create an escrowed PaymentIntent for a quest.
 *
 * Charge model: SEPARATE CHARGES AND TRANFERS.
 * The full quest budget is charged to the PLATFORM account with
 * `capture_method: 'manual'` (authorize now, capture on completion). We do NOT
 * set `transfer_data.destination` or `application_fee_amount` here, because
 * payouts to the adventurer happen later as explicit `Transfer`s (see
 * `releaseMilestonePayment`). Combining auto-transfer with manual transfers
 * would pay the adventurer twice. The platform fee is retained implicitly:
 * the platform captures the gross amount and transfers only the net per
 * milestone, keeping the fee on the platform balance.
 */
export async function createEscrowPayment(
  questId: string,
  amount: number, // amount in cents
  questGiverCustomerId: string,
  adventurerAccountId: string
): Promise<Stripe.PaymentIntent> {
  const paymentIntent = await getStripe().paymentIntents.create({
    amount,
    currency: 'usd',
    customer: questGiverCustomerId,
    capture_method: 'manual',
    metadata: {
      tryhardly_quest_id: questId,
      tryhardly_adventurer_account: adventurerAccountId,
      platform_fee_percent: String(PLATFORM_FEE_PERCENT),
    },
    description: `Tryhardly Quest Escrow — Quest ${questId}`,
  });

  return paymentIntent;
}

/**
 * Capture an authorized PaymentIntent (move funds from hold to captured).
 * Called when escrow conditions are met.
 */
export async function capturePayment(
  paymentIntentId: string,
  amountToCapture?: number
): Promise<Stripe.PaymentIntent> {
  const params: Stripe.PaymentIntentCaptureParams = {};
  if (amountToCapture !== undefined) {
    params.amount_to_capture = amountToCapture;
  }

  const captured = await getStripe().paymentIntents.capture(
    paymentIntentId,
    params
  );

  return captured;
}

/**
 * Create a transfer to release milestone payment to an adventurer.
 *
 * Used after the escrow PaymentIntent has been captured. The platform fee is
 * deducted from the gross milestone amount and the net is transferred to the
 * adventurer's connected account. `source_transaction` ties the transfer to
 * the captured charge so funds are drawn from that charge's balance.
 */
export async function releaseMilestonePayment(
  milestoneId: string,
  amount: number, // gross amount in cents for this milestone
  adventurerAccountId: string,
  chargeId: string
): Promise<Stripe.Transfer> {
  const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
  const netAmount = amount - platformFee;

  const transfer = await getStripe().transfers.create({
    amount: netAmount,
    currency: 'usd',
    destination: adventurerAccountId,
    source_transaction: chargeId,
    metadata: {
      tryhardly_milestone_id: milestoneId,
      gross_amount: String(amount),
      platform_fee: String(platformFee),
      platform_fee_percent: String(PLATFORM_FEE_PERCENT),
    },
    description: `Tryhardly Milestone Payment — Milestone ${milestoneId}`,
  });

  return transfer;
}

/**
 * Refund an escrowed PaymentIntent (full refund on quest cancellation).
 */
export async function refundEscrow(
  paymentIntentId: string
): Promise<Stripe.Refund> {
  const refund = await getStripe().refunds.create({
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer',
    metadata: {
      tryhardly_reason: 'quest_cancelled',
    },
  });

  return refund;
}

/**
 * Cancel an authorized-but-not-captured PaymentIntent.
 */
export async function cancelPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.cancel(paymentIntentId);
}

/**
 * Retrieve a PaymentIntent to check its status.
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return getStripe().paymentIntents.retrieve(paymentIntentId);
}

/**
 * Retrieve a Stripe Connect account to check onboarding status.
 */
export async function getAccount(
  accountId: string
): Promise<Stripe.Account> {
  return getStripe().accounts.retrieve(accountId);
}

/**
 * Construct a webhook event from the raw body and signature.
 */
export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
  endpointSecret: string
): Stripe.Event {
  return getStripe().webhooks.constructEvent(rawBody, signature, endpointSecret);
}

export { getStripe, PLATFORM_FEE_PERCENT };
