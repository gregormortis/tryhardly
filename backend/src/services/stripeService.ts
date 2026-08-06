import Stripe from 'stripe';

const PLATFORM_FEE_PERCENT = 12; // 12% platform commission

/**
 * Stripe's minimum chargeable amount, in cents, for USD-denominated charges.
 * Checkout/PaymentIntent creation is rejected below this floor, so we validate
 * against it up front to return a clear message instead of a Stripe error.
 */
const MIN_CHARGE_CENTS = 50;

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
 * Create a Stripe Connect Express account for a worker/seller so they can
 * receive marketplace payouts when a task is captured.
 *
 * Charge model: destination charges. The customer's card is charged on the
 * PLATFORM account (Checkout with `application_fee_amount` + `transfer_data.
 * destination`), and the net is routed to this connected account on capture.
 * For that model the platform is, by construction, the settlement merchant and
 * therefore liable for the charge — so the account is created as a plain
 * `type: 'express'` account and Stripe applies the responsibility defaults that
 * match the platform's configured Connect profile.
 *
 * We deliberately do NOT pass a custom `controller` block (e.g.
 * `controller.losses.payments = 'application'` / `controller.fees.payer =
 * 'application'`). That shape requires the platform profile to have explicitly
 * accepted platform-owned loss liability; when the profile is configured with
 * Stripe as the loss collector (our case), Stripe rejects the call with
 * "review the responsibilities of managing losses for connected accounts". The
 * `type: 'express'` form inherits whatever the profile specifies, so account
 * creation succeeds without changing the payment model away from destination
 * charges.
 *
 * Capabilities requested:
 *   - `transfers`     — required to receive the destination-charge payout
 *   - `card_payments` — the payments capability Stripe expects for accounts
 *                       settling destination charges (also needed if the
 *                       account is ever used as the settlement merchant)
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
    type: 'express',
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
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
 * Create a marketplace Checkout Session for a job (destination charge,
 * authorize-only).
 *
 * Non-escrow model: `authorize → complete → capture → payout`. The session is
 * created with `payment_intent_data.capture_method='manual'`, so completing
 * Checkout only AUTHORIZES the customer's card — it is not a final charge. The
 * charge is captured later, when the task is completed (see `capturePayment`,
 * invoked from the completion-confirmation path). On capture, Stripe Connect
 * routes the worker's share and TryHardly's 12% fee in the single destination
 * charge via `application_fee_amount` + `transfer_data.destination`. There is no
 * custody or fund-holding step: TryHardly never holds the customer's money.
 *
 * Capture window: card authorizations are typically valid for ~5–7 days. The
 * task must be completed and captured within that window, so only near-term
 * bookings are eligible to be authorized this way — long/open-ended projects are
 * not supported as payment-authorized bookings.
 *
 * `application_fee_amount` and `transfer_data.destination` are set on
 * `payment_intent_data` so the single destination charge both takes the platform
 * fee and routes the net to the worker when captured. The line item uses the
 * job's own title and amount — never a placeholder product.
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
      // Authorize-only: completing Checkout authorizes the card; the charge is
      // captured later on task completion. Card authorizations expire (~5–7 days)
      // so only near-term tasks should be booked this way.
      capture_method: 'manual',
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
 * Evaluate whether a connected account can receive a destination charge / the
 * routed payout for the non-escrow marketplace flow.
 *
 * `ready` is true only when the account can be charged (charges_enabled), can be
 * paid out (payouts_enabled), has submitted its details, and has no outstanding
 * requirements. This mirrors the `onboarded` definition surfaced by
 * GET /api/payments/connect/status, so the pre-checkout guard and the status UI
 * agree on what "payout setup complete" means. Pure/synchronous: never calls
 * Stripe.
 */
export function evaluateAccountReadiness(account: Stripe.Account): {
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsDue: boolean;
  ready: boolean;
} {
  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];
  const requirementsDue = currentlyDue.length > 0 || pastDue.length > 0;
  const chargesEnabled = !!account.charges_enabled;
  const payoutsEnabled = !!account.payouts_enabled;
  const detailsSubmitted = !!account.details_submitted;
  const ready =
    chargesEnabled && payoutsEnabled && detailsSubmitted && !requirementsDue;
  return { chargesEnabled, payoutsEnabled, detailsSubmitted, requirementsDue, ready };
}

/**
 * Create a Stripe Identity VerificationSession for a worker: government ID +
 * selfie verification, hosted entirely by Stripe (we never see or store the
 * document/selfie ourselves). Added as the second layer of the post-
 * 2026-08-04 fraud remediation — email verification alone confirms a working
 * inbox, not a real identity. `type: 'document'` requests an ID document plus
 * a live selfie match, which is the strongest verification Identity offers.
 *
 * `returnUrl` is where Stripe redirects the user after they finish (or
 * abandon) the hosted verification flow; the actual verified/failed result
 * arrives asynchronously via webhook (`identity.verification_session.*`), not
 * synchronously on redirect, so the frontend should poll
 * GET /api/payments/identity/status rather than trust the redirect alone.
 */
export async function createIdentityVerificationSession(
  userId: string,
  returnUrl: string
): Promise<Stripe.Identity.VerificationSession> {
  return getStripe().identity.verificationSessions.create({
    type: 'document',
    options: {
      document: {
        require_matching_selfie: true,
      },
    },
    return_url: returnUrl,
    metadata: { tryhardly_user_id: userId },
  });
}

/**
 * Retrieve a Stripe Identity VerificationSession (e.g. to re-check status
 * without waiting on a webhook, or to recover from a missed webhook).
 */
export async function getIdentityVerificationSession(
  sessionId: string
): Promise<Stripe.Identity.VerificationSession> {
  return getStripe().identity.verificationSessions.retrieve(sessionId);
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

export { getStripe, PLATFORM_FEE_PERCENT, MIN_CHARGE_CENTS, calculatePlatformFee };
