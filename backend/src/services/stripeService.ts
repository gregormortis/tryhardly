import Stripe from 'stripe';

const PLATFORM_FEE_PERCENT = 12; // 12% platform commission

/**
 * Default country for newly created connected accounts. Stripe uses this as the
 * account's identity country. Overridable via STRIPE_ACCOUNT_COUNTRY; falls back
 * to US. (Not a secret — a two-letter ISO country code.)
 */
function getDefaultAccountCountry(): string {
  return (process.env.STRIPE_ACCOUNT_COUNTRY || 'US').trim().toUpperCase();
}

/**
 * Compute the platform application fee, in cents, for a given job amount.
 *
 * The fee is 12% of the job amount, rounded to the nearest cent. It is clamped
 * so it can never be negative and never meet or exceed the job amount itself
 * (Stripe rejects an application fee >= the charge amount, and a fee equal to
 * the amount would leave the worker with nothing). For any sane positive
 * amount the 12% value is well below the cap; the clamp only guards against
 * degenerate inputs (e.g. a 1-cent job).
 */
function calculatePlatformFee(amountCents: number): number {
  if (!Number.isFinite(amountCents) || amountCents <= 0) {
    return 0;
  }
  const fee = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100));
  // Never exceed (or equal) the amount; leave at least 1 cent for the worker.
  const maxFee = amountCents - 1;
  return Math.min(Math.max(fee, 0), maxFee);
}

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

  // Leave apiVersion unset so the SDK's pinned/default version is used. The
  // blueprint does not pin a specific API version, and hardcoding one risks
  // drift from the account's configured version.
  _stripe = new Stripe(secretKey, {
    typescript: true,
  });

  return _stripe;
}

/**
 * Create a Stripe Connect account for a worker/seller so they can receive
 * marketplace payouts on task completion.
 *
 * Blueprint mapping / SDK gap:
 * The blueprint describes Accounts v2 semantics — a recipient configuration
 * with `stripe_transfers` requested, an Express dashboard, and responsibilities
 * placing losses and fees collection on the platform ("application"). The pinned
 * Stripe SDK (`stripe@^14`, Accounts v1) does not expose Accounts v2 directly,
 * so we implement the closest currently-supported equivalent that preserves the
 * same capabilities and Express onboarding:
 *   - `transfers` capability requested  → the recipient `stripe_transfers` ask
 *   - `controller.stripe_dashboard.type = 'express'`  → Express dashboard
 *   - `controller.losses.payments = 'application'`     → losses_collector = platform
 *   - `controller.fees.payer = 'application'`          → fees_collector = platform
 *   - `country` from STRIPE_ACCOUNT_COUNTRY/default     → identity country
 *   - `email` / `business_profile`                      → display & contact
 * When the SDK is upgraded to one supporting Accounts v2, swap the v1
 * `accounts.create` shape below for the v2 recipient configuration.
 */
export async function createConnectedAccount(
  userId: string,
  email: string,
  options?: { country?: string; displayName?: string }
): Promise<Stripe.Account> {
  const country = (options?.country || getDefaultAccountCountry())
    .trim()
    .toUpperCase();

  const account = await getStripe().accounts.create({
    // The `controller` object captures the responsibilities the blueprint
    // assigns: the platform (application) collects fees and bears losses, and
    // the connected user gets the Express dashboard.
    controller: {
      stripe_dashboard: { type: 'express' },
      fees: { payer: 'application' },
      losses: { payments: 'application' },
      requirement_collection: 'stripe',
    },
    country,
    email,
    capabilities: {
      transfers: { requested: true },
    },
    business_profile: options?.displayName
      ? { name: options.displayName }
      : undefined,
    metadata: { tryhardly_user_id: userId },
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
 * Create a marketplace Checkout Session for a job (destination charge).
 *
 * This is the standard Connect marketplace flow: the client pays the full job
 * amount, TryHardly collects a 12% application fee, and the remainder is routed
 * to the worker's connected account via `transfer_data.destination`. Funds are
 * paid to the worker on task completion through Stripe's payout schedule — there
 * is no separate custody/holding step.
 *
 * `application_fee_amount` and `transfer_data.destination` are set on
 * `payment_intent_data` so the single charge both takes the platform fee and
 * routes the net to the worker. The line item uses the job's own title and
 * amount — never a placeholder product.
 */
export async function createCheckoutSession(params: {
  questId: string;
  title: string;
  amountCents: number;
  workerAccountId: string;
  successUrl: string;
  cancelUrl: string;
  currency?: string;
  customerId?: string;
}): Promise<Stripe.Checkout.Session> {
  const {
    questId,
    title,
    amountCents,
    workerAccountId,
    successUrl,
    cancelUrl,
    customerId,
  } = params;

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Checkout amount must be a positive integer number of cents');
  }

  const currency = (params.currency || 'usd').toLowerCase();
  const applicationFeeAmount = calculatePlatformFee(amountCents);

  const session = await getStripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountCents,
          product_data: {
            name: title,
          },
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer: customerId,
    payment_intent_data: {
      application_fee_amount: applicationFeeAmount,
      transfer_data: {
        destination: workerAccountId,
      },
      metadata: {
        tryhardly_quest_id: questId,
        tryhardly_worker_account: workerAccountId,
        platform_fee_amount: String(applicationFeeAmount),
        platform_fee_percent: String(PLATFORM_FEE_PERCENT),
      },
    },
    metadata: {
      tryhardly_quest_id: questId,
      tryhardly_worker_account: workerAccountId,
      platform_fee_amount: String(applicationFeeAmount),
      platform_fee_percent: String(PLATFORM_FEE_PERCENT),
    },
  });

  return session;
}

/**
 * Retrieve a Checkout Session (e.g. to read its payment_intent on completion).
 */
export async function getCheckoutSession(
  sessionId: string
): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.retrieve(sessionId);
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

/**
 * Verify a webhook signature against multiple candidate signing secrets.
 *
 * Stripe signs test-mode and live-mode events with different endpoint signing
 * secrets. When both are configured we cannot know up front which mode an
 * incoming event belongs to, so we try each secret in turn and accept the
 * event on the first match. Throws the last verification error if none match.
 */
export function constructWebhookEventFromSecrets(
  rawBody: Buffer,
  signature: string,
  endpointSecrets: string[]
): Stripe.Event {
  let lastError: unknown;
  for (const secret of endpointSecrets) {
    try {
      return getStripe().webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('No webhook signing secret matched the signature');
}

export { getStripe, PLATFORM_FEE_PERCENT, calculatePlatformFee };
