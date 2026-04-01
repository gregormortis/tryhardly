import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  typescript: true,
});

const PLATFORM_FEE_PERCENT = 12; // 12% platform commission

/**
 * Create a Stripe Connect Express account for a user.
 * This lets adventurers receive payouts.
 */
export async function createConnectedAccount(
  userId: string,
  email: string
): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
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
  const link = await stripe.accountLinks.create({
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
  const customer = await stripe.customers.create({
    email,
    metadata: { tryhardly_user_id: userId },
  });

  return customer;
}

/**
 * Create an escrowed PaymentIntent for a quest.
 *
 * Uses `capture_method: 'manual'` so funds are authorized but not captured
 * until the quest giver approves milestone completion or quest completion.
 *
 * The full quest budget is authorized up front. Platform fee is applied via
 * `application_fee_amount` — Stripe automatically deducts it from transfers.
 */
export async function createEscrowPayment(
  questId: string,
  amount: number, // amount in cents
  questGiverCustomerId: string,
  adventurerAccountId: string
): Promise<Stripe.PaymentIntent> {
  const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    customer: questGiverCustomerId,
    capture_method: 'manual',
    application_fee_amount: platformFee,
    transfer_data: {
      destination: adventurerAccountId,
    },
    metadata: {
      tryhardly_quest_id: questId,
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

  const captured = await stripe.paymentIntents.capture(
    paymentIntentId,
    params
  );

  return captured;
}

/**
 * Create a transfer to release milestone payment to an adventurer.
 *
 * This is used when milestones are released individually after the main
 * PaymentIntent has been captured. The platform fee is calculated and
 * deducted from the transfer amount.
 */
export async function releaseMilestonePayment(
  milestoneId: string,
  amount: number, // gross amount in cents for this milestone
  adventurerAccountId: string,
  paymentIntentId: string
): Promise<Stripe.Transfer> {
  const platformFee = Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
  const netAmount = amount - platformFee;

  const transfer = await stripe.transfers.create({
    amount: netAmount,
    currency: 'usd',
    destination: adventurerAccountId,
    source_transaction: paymentIntentId,
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
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer',
    metadata: {
      tryhardly_reason: 'quest_cancelled',
    },
  });

  return refund;
}

/**
 * Retrieve a PaymentIntent to check its status.
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Retrieve a Stripe Connect account to check onboarding status.
 */
export async function getAccount(
  accountId: string
): Promise<Stripe.Account> {
  return stripe.accounts.retrieve(accountId);
}

/**
 * Construct a webhook event from the raw body and signature.
 */
export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
  endpointSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
}

export { stripe, PLATFORM_FEE_PERCENT };
