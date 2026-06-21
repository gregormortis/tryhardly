import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../app';
import * as stripeService from '../services/stripeService';
import * as escrowService from '../services/escrowService';

/**
 * Extract a concise, user-safe message from an error thrown by the Stripe SDK.
 *
 * Stripe errors carry a human-readable `message` plus a `type`/`code` that are
 * safe to surface (e.g. "account_invalid", "parameter_unknown"). None of these
 * contain secrets — the secret key lives only on the client config, never on
 * the error. We return just the message string so callers can show it to the
 * user without echoing the full error object (which can include request IDs and
 * internal params we don't want to leak into a response body).
 */
function stripeErrorMessage(error: any): string {
  if (error && typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }
  return 'Unexpected error talking to the payment provider';
}

/**
 * Build the field patch that moves a quest to AUTHORIZED for the non-escrow
 * marketplace flow — but only when it isn't already past authorization. This
 * guards against out-of-order webhooks (e.g. `payment_intent.succeeded`
 * arriving before `checkout.session.completed`) downgrading a CAPTURED or
 * CANCELED quest back to AUTHORIZED. Returns an empty patch when no transition
 * should happen, so callers can spread it into an existing update.
 */
async function authorizedPatch(
  questId: string
): Promise<{ paymentStatus?: 'AUTHORIZED'; paymentAuthorizedAt?: Date }> {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  const current = (quest as any)?.paymentStatus;
  // Only advance from a pre-authorization state. Never clobber CAPTURED/CANCELED.
  if (current === 'NONE' || current === undefined || current === null) {
    return { paymentStatus: 'AUTHORIZED', paymentAuthorizedAt: new Date() };
  }
  return {};
}

/**
 * POST /api/payments/connect
 * Create a Stripe Connect Express account for the current user.
 */
export const createConnectedAccount = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Check if user already has a connected account
    const existingAccountId = (user as any).stripeAccountId;
    if (existingAccountId) {
      // Retrieve the existing account to return its status
      const account = await stripeService.getAccount(existingAccountId);
      res.json({
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        message: 'Stripe Connect account already exists',
      });
      return;
    }

    // Create new Connect account. Pass the user's display name for the account's
    // contact/display info; country falls back to the configured default.
    const account = await stripeService.createConnectedAccount(userId, user.email, {
      displayName: (user as any).displayName,
    });

    // Save the account ID to the user record
    await prisma.user.update({
      where: { id: userId },
      data: { stripeAccountId: account.id } as any,
    });

    res.status(201).json({
      accountId: account.id,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (error: any) {
    // Log the structured Stripe fields (type/code/message) to aid debugging
    // without dumping the whole error object. The secret key is never on the
    // error, so these fields are safe to log.
    console.error('Error creating connected account:', {
      type: error?.type,
      code: error?.code,
      message: error?.message,
    });
    res.status(500).json({
      error: 'Failed to create Stripe Connect account',
      message: stripeErrorMessage(error),
    });
  }
};

/**
 * GET /api/payments/connect/onboarding
 * Generate a Stripe Connect onboarding link for the current user.
 */
export const getOnboardingLink = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const accountId = (user as any).stripeAccountId;
    if (!accountId) {
      res.status(400).json({
        error: 'No Stripe Connect account',
        message: 'Create a connected account first via POST /api/payments/connect',
      });
      return;
    }

    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')[0]
      .trim();
    const refreshUrl = `${baseUrl}/payments/onboarding/refresh`;
    const returnUrl = `${baseUrl}/payments/onboarding/complete`;

    const accountLink = await stripeService.createAccountLink(
      accountId,
      refreshUrl,
      returnUrl
    );

    res.json({
      url: accountLink.url,
      expiresAt: new Date(accountLink.expires_at * 1000).toISOString(),
    });
  } catch (error: any) {
    console.error('Error creating onboarding link:', {
      type: error?.type,
      code: error?.code,
      message: error?.message,
    });
    res.status(500).json({
      error: 'Failed to create onboarding link',
      message: stripeErrorMessage(error),
    });
  }
};

/**
 * POST /api/payments/quest/:questId/checkout
 * Create a marketplace Checkout Session for a job (destination charge).
 *
 * The client (quest giver) pays the full job amount; TryHardly collects a 12%
 * platform fee via `application_fee_amount`; the net is routed to the worker's
 * connected account via `transfer_data.destination`. Returns the hosted
 * Checkout URL for the client to complete payment.
 */
export const createQuestCheckout = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { questId } = req.params;
    const userId = req.user!.id;

    const quest = await prisma.quest.findUniqueOrThrow({
      where: { id: questId },
      include: { assignedAdventurer: true },
    });

    const posterId = (quest as any).questGiverId;
    if (posterId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the quest giver can pay for this job',
      });
      return;
    }

    const worker = (quest as any).assignedAdventurer;
    const workerId = (quest as any).assignedAdventurerId;
    if (!workerId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Quest has no assigned worker to pay',
      });
      return;
    }

    const workerUser =
      worker || (await prisma.user.findUniqueOrThrow({ where: { id: workerId } }));
    const workerAccountId = (workerUser as any).stripeAccountId;
    if (!workerAccountId) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Worker has not completed Stripe onboarding',
      });
      return;
    }

    const amountCents = Math.round(Number((quest as any).reward) * 100);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Job amount must be greater than zero',
      });
      return;
    }

    const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:3000')
      .split(',')[0]
      .trim();
    const successUrl = `${baseUrl}/payments/checkout/success?quest=${questId}`;
    const cancelUrl = `${baseUrl}/payments/checkout/cancel?quest=${questId}`;

    const session = await stripeService.createCheckoutSession({
      questId,
      title: (quest as any).title,
      amountCents,
      workerAccountId,
      successUrl,
      cancelUrl,
      currency: ((quest as any).currency || 'usd').toLowerCase(),
    });

    await prisma.quest.update({
      where: { id: questId },
      data: { checkoutSessionId: session.id } as any,
    });

    res.status(201).json({
      sessionId: session.id,
      url: session.url,
      amount: amountCents,
      applicationFeeAmount: stripeService.calculatePlatformFee(amountCents),
    });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Not Found', message: 'Quest not found' });
      return;
    }

    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message,
    });
  }
};

/**
 * Capture the authorized destination-charge PaymentIntent for a completed task.
 *
 * Non-escrow flow: at booking the card was AUTHORIZED (manual capture). When the
 * task is confirmed complete we capture that authorization, finalizing the
 * charge — Stripe Connect then routes the worker's share and TryHardly's 12% fee
 * (set on the PaymentIntent at Checkout). No funds were ever held by TryHardly.
 *
 * Safe to call from the completion-confirmation path: it is idempotent and
 * never clobbers state out of order.
 *   - Returns `{ captured: false, reason }` (no throw) when there is nothing to
 *     capture, so completion confirmation never fails just because a quest has
 *     no marketplace authorization (e.g. it used the legacy escrow path, or was
 *     paid out of band).
 *   - Only captures a PaymentIntent in `requires_capture`. If Stripe reports it
 *     already `succeeded`, we reconcile local state to CAPTURED without a second
 *     capture call.
 *   - On a Stripe capture error (e.g. expired authorization) records
 *     CAPTURE_FAILED and rethrows so the caller can surface it.
 */
export async function captureAuthorizedPayment(
  questId: string
): Promise<{ captured: boolean; reason?: string; paymentIntentId?: string }> {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) return { captured: false, reason: 'quest_not_found' };

  const paymentIntentId = (quest as any).paymentIntentId as string | null;
  const paymentStatus = (quest as any).paymentStatus as string | undefined;

  if (!paymentIntentId) {
    return { captured: false, reason: 'no_payment_intent' };
  }
  if (paymentStatus === 'CAPTURED') {
    return { captured: false, reason: 'already_captured', paymentIntentId };
  }
  if (paymentStatus === 'CANCELED') {
    return { captured: false, reason: 'authorization_canceled', paymentIntentId };
  }

  // Confirm the live state with Stripe before acting.
  const pi = await stripeService.getPaymentIntent(paymentIntentId);

  if (pi.status === 'succeeded') {
    // Already captured upstream (e.g. a webhook beat us here). Reconcile only.
    await prisma.quest.update({
      where: { id: questId },
      data: { paymentStatus: 'CAPTURED', paymentCapturedAt: new Date() } as any,
    });
    return { captured: false, reason: 'already_captured_upstream', paymentIntentId };
  }

  if (pi.status !== 'requires_capture') {
    return { captured: false, reason: `not_capturable_status_${pi.status}`, paymentIntentId };
  }

  try {
    await stripeService.capturePayment(paymentIntentId);
    await prisma.quest.update({
      where: { id: questId },
      data: { paymentStatus: 'CAPTURED', paymentCapturedAt: new Date() } as any,
    });
    return { captured: true, paymentIntentId };
  } catch (error: any) {
    await prisma.quest.update({
      where: { id: questId },
      data: { paymentStatus: 'CAPTURE_FAILED' } as any,
    });
    throw error;
  }
}

/**
 * POST /api/payments/quest/:questId/capture
 * Capture the authorized marketplace payment for a completed task.
 *
 * Narrow endpoint guarded to the quest giver (or admin): only valid once the
 * task is completed/in review. The primary capture trigger is the completion
 * confirmation handshake (confirmCompletion); this route exists as an explicit,
 * authorized fallback for the quest giver/admin.
 */
export const captureQuestPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { questId } = req.params;
    const userId = req.user!.id;

    const quest = await prisma.quest.findUniqueOrThrow({ where: { id: questId } });
    const isGiver = (quest as any).questGiverId === userId;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isGiver && !isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the quest giver or an admin can capture payment',
      });
      return;
    }

    // Capture is only appropriate once the work is done (completed/in review).
    const status = (quest as any).status;
    if (status !== 'COMPLETED' && status !== 'IN_REVIEW') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Payment can only be captured for a completed task',
      });
      return;
    }

    const result = await captureAuthorizedPayment(questId);
    res.json({
      captured: result.captured,
      reason: result.reason,
      paymentIntentId: result.paymentIntentId,
      message: result.captured
        ? 'Charge captured on completion'
        : `No capture performed (${result.reason})`,
    });
  } catch (error: any) {
    console.error('Error capturing quest payment:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Not Found', message: 'Quest not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to capture payment', message: error.message });
  }
};

/**
 * POST /api/payments/quest/:questId/cancel-authorization
 * Void the authorized-but-uncaptured marketplace authorization for a canceled
 * or uncompleted job (quest giver or admin).
 *
 * Non-escrow flow: nothing is "released" because nothing was held. We simply
 * cancel the pending card authorization so the customer is never charged. Safe
 * and idempotent: if the charge was already captured we refuse (a refund, not a
 * void, would be required); if already canceled or never authorized we no-op.
 */
export const cancelQuestAuthorization = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { questId } = req.params;
    const userId = req.user!.id;

    const quest = await prisma.quest.findUniqueOrThrow({ where: { id: questId } });
    const isGiver = (quest as any).questGiverId === userId;
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isGiver && !isAdmin) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the quest giver or an admin can cancel the authorization',
      });
      return;
    }

    const paymentIntentId = (quest as any).paymentIntentId as string | null;
    const paymentStatus = (quest as any).paymentStatus as string | undefined;

    if (paymentStatus === 'CAPTURED') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Payment was already captured; a void is no longer possible',
      });
      return;
    }
    if (!paymentIntentId || paymentStatus === 'CANCELED' || paymentStatus === 'NONE') {
      res.json({ canceled: false, message: 'No active authorization to cancel' });
      return;
    }

    await stripeService.cancelPaymentIntent(paymentIntentId);
    await prisma.quest.update({
      where: { id: questId },
      data: { paymentStatus: 'CANCELED', paymentCanceledAt: new Date() } as any,
    });

    res.json({ canceled: true, message: 'Authorization canceled; the customer was not charged' });
  } catch (error: any) {
    console.error('Error canceling authorization:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Not Found', message: 'Quest not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to cancel authorization', message: error.message });
  }
};

/**
 * POST /api/payments/quest/:questId/escrow
 * Initialize escrow for a quest (called after application is accepted).
 */
export const initializeEscrow = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { questId } = req.params;
    const userId = req.user!.id;

    // Verify the current user is the quest giver
    const quest = await prisma.quest.findUniqueOrThrow({
      where: { id: questId },
    });

    const posterId = (quest as any).posterId || (quest as any).questGiverId;
    if (posterId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Only the quest giver can initialize escrow',
      });
      return;
    }

    const result = await escrowService.initializeEscrow(questId);

    res.status(201).json({
      paymentIntentId: result.paymentIntentId,
      clientSecret: result.clientSecret,
      message: 'Escrow initialized. Use the client secret to confirm payment on the frontend.',
    });
  } catch (error: any) {
    console.error('Error initializing escrow:', error);

    if (error.message.includes('no assigned adventurer') ||
        error.message.includes('not completed Stripe onboarding') ||
        error.message.includes('already initialized')) {
      res.status(400).json({ error: 'Bad Request', message: error.message });
      return;
    }

    res.status(500).json({
      error: 'Failed to initialize escrow',
      message: error.message,
    });
  }
};

/**
 * POST /api/payments/milestone/:milestoneId/release
 * Release funds for a completed milestone.
 */
export const releaseMilestonePayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { milestoneId } = req.params;
    const userId = req.user!.id;

    const result = await escrowService.completeMilestone(milestoneId, userId);

    res.json({
      transferId: result.transferId,
      amount: result.amount,
      message: 'Milestone payment released successfully',
    });
  } catch (error: any) {
    console.error('Error releasing milestone payment:', error);

    if (error.message.includes('Only the quest giver')) {
      res.status(403).json({ error: 'Forbidden', message: error.message });
      return;
    }

    if (error.message.includes('already') ||
        error.message.includes('no escrowed payment') ||
        error.message.includes('Cannot release')) {
      res.status(400).json({ error: 'Bad Request', message: error.message });
      return;
    }

    res.status(500).json({
      error: 'Failed to release milestone payment',
      message: error.message,
    });
  }
};

/**
 * GET /api/payments/quest/:questId/status
 * Get escrow status breakdown for a quest.
 */
export const getEscrowStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { questId } = req.params;

    const status = await escrowService.getEscrowStatus(questId);
    res.json(status);
  } catch (error: any) {
    console.error('Error fetching escrow status:', error);

    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Not Found', message: 'Quest not found' });
      return;
    }

    res.status(500).json({
      error: 'Failed to fetch escrow status',
      message: error.message,
    });
  }
};

/**
 * GET /api/payments/quest/:questId/payment-status
 * Non-sensitive payment status for the non-escrow marketplace flow.
 *
 * Surfaces the new `paymentStatus` state machine (NONE → AUTHORIZED → CAPTURED /
 * CANCELED / CAPTURE_FAILED) plus the budget, so the UI can render the panel
 * without touching the legacy escrowService path. Does not initialize or mutate
 * any payment state, and does not call Stripe.
 */
export const getPaymentStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { questId } = req.params;

    const quest = await prisma.quest.findUniqueOrThrow({ where: { id: questId } });

    const budgetCents = Math.round(Number((quest as any).reward) * 100);

    res.json({
      questId,
      paymentStatus: (quest as any).paymentStatus || 'NONE',
      paymentAuthorizedAt: (quest as any).paymentAuthorizedAt || null,
      paymentCapturedAt: (quest as any).paymentCapturedAt || null,
      paymentCanceledAt: (quest as any).paymentCanceledAt || null,
      hasCheckoutSession: !!(quest as any).checkoutSessionId,
      totalBudget: Number.isFinite(budgetCents) ? budgetCents : 0,
      platformFee: stripeService.calculatePlatformFee(
        Number.isFinite(budgetCents) ? budgetCents : 0
      ),
    });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Not Found', message: 'Quest not found' });
      return;
    }
    console.error('Error fetching payment status:', error);
    res.status(500).json({
      error: 'Failed to fetch payment status',
      message: error.message,
    });
  }
};

/**
 * POST /api/payments/quest/:questId/complete
 * Complete a quest and release all remaining funds.
 */
export const completeQuestPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { questId } = req.params;
    const userId = req.user!.id;

    const result = await escrowService.completeQuest(questId, userId);

    res.json({
      status: result.status,
      message: 'Quest completed and all funds released',
    });
  } catch (error: any) {
    console.error('Error completing quest payment:', error);

    if (error.message.includes('Only the quest giver')) {
      res.status(403).json({ error: 'Forbidden', message: error.message });
      return;
    }

    res.status(500).json({
      error: 'Failed to complete quest payment',
      message: error.message,
    });
  }
};

/**
 * POST /api/payments/quest/:questId/cancel
 * Cancel a quest and refund escrowed funds.
 */
export const cancelQuestPayment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { questId } = req.params;
    const userId = req.user!.id;

    const result = await escrowService.cancelQuest(questId, userId);

    res.json({
      refundId: result.refundId,
      message: 'Quest cancelled and escrow refunded',
    });
  } catch (error: any) {
    console.error('Error cancelling quest:', error);

    if (error.message.includes('Only the quest giver')) {
      res.status(403).json({ error: 'Forbidden', message: error.message });
      return;
    }

    if (error.message.includes('fully released') ||
        error.message.includes('no escrowed payment')) {
      res.status(400).json({ error: 'Bad Request', message: error.message });
      return;
    }

    res.status(500).json({
      error: 'Failed to cancel quest',
      message: error.message,
    });
  }
};

/**
 * POST /api/payments/webhook
 * Handle Stripe webhook events.
 */
export const handleWebhook = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  // Stripe signs test-mode and live-mode events with different endpoint
  // signing secrets. Try whichever are configured so a single endpoint can
  // accept both test and live webhooks.
  const endpointSecrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_LIVE_WEBHOOK_SECRET,
  ].filter((s): s is string => !!s);

  if (endpointSecrets.length === 0) {
    console.error(
      'No webhook signing secret configured (set STRIPE_WEBHOOK_SECRET and/or STRIPE_LIVE_WEBHOOK_SECRET)'
    );
    res.status(500).json({ error: 'Webhook secret not configured' });
    return;
  }

  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event;

  try {
    // req.body must be the raw Buffer for signature verification. We try each
    // configured secret in turn; the secrets themselves are never logged.
    event = stripeService.constructWebhookEventFromSecrets(
      req.body as Buffer,
      sig,
      endpointSecrets
    );
  } catch (error: any) {
    console.error(
      `Webhook signature verification failed against ${endpointSecrets.length} secret(s): ${error.message}`
    );
    res.status(400).json({ error: `Webhook Error: ${error.message}` });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Non-escrow marketplace flow: completing Checkout AUTHORIZES the
        // customer's card (manual capture) — it is NOT a final charge yet, and
        // TryHardly holds no funds. We persist the Stripe IDs and mark the
        // payment AUTHORIZED. The charge is captured later, when the task is
        // confirmed complete (see confirmCompletion / captureQuestPayment).
        //
        // This path deliberately does NOT touch the legacy `escrowStatus` field
        // (it gates the old separate-charges-and-transfers milestone flow).
        // Coupling the two would risk enabling legacy releases against a
        // destination charge.
        const session = event.data.object as any;
        const questId = session.metadata?.tryhardly_quest_id;

        if (questId) {
          const paymentIntentId =
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id || null;

          await prisma.quest.update({
            where: { id: questId },
            data: {
              checkoutSessionId: session.id,
              paymentIntentId,
              // Authorization secured — not captured/charged. Only advance to
              // AUTHORIZED from a pre-capture state so a later out-of-order event
              // can't downgrade a CAPTURED quest.
              ...(await authorizedPatch(questId)),
            } as any,
          });
          console.log(
            `✅ Checkout completed for quest ${questId} — payment authorized (session ${session.id}), not charged`
          );
        }
        break;
      }

      case 'payment_intent.amount_capturable_updated': {
        // Manual-capture authorization is now in place (funds capturable). Mark
        // the quest AUTHORIZED if it isn't already past that state. This is the
        // most reliable signal that the card authorization succeeded.
        const paymentIntent = event.data.object as any;
        const questId = paymentIntent.metadata?.tryhardly_quest_id;
        if (questId) {
          await prisma.quest.update({
            where: { id: questId },
            data: { ...(await authorizedPatch(questId)) } as any,
          });
          console.log(
            `💰 Payment authorized for quest ${questId}: ${paymentIntent.amount_capturable} capturable (not charged)`
          );
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // For the non-escrow destination charge, `succeeded` means the
        // authorized amount was CAPTURED (the charge is now final and Stripe
        // Connect routes the worker share + 12% fee). Distinguish the new flow
        // from the legacy escrow PaymentIntent by its metadata: the destination
        // charge carries `tryhardly_worker_account`, the legacy escrow charge
        // carries `tryhardly_adventurer_account`.
        const paymentIntent = event.data.object as any;
        const questId = paymentIntent.metadata?.tryhardly_quest_id;
        const isDestinationCharge = !!paymentIntent.metadata?.tryhardly_worker_account;

        if (questId && isDestinationCharge) {
          await prisma.quest.update({
            where: { id: questId },
            data: {
              paymentStatus: 'CAPTURED',
              paymentCapturedAt: new Date(),
            } as any,
          });
          console.log(`✅ Charge captured for quest ${questId} (non-escrow marketplace flow)`);
        } else if (questId) {
          // Legacy escrow path (separate charges & transfers) — unchanged.
          await prisma.quest.update({
            where: { id: questId },
            data: { escrowStatus: 'FUNDED' } as any,
          });
          console.log(`✅ Escrow funded for quest ${questId}`);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as any;
        const questId = paymentIntent.metadata?.tryhardly_quest_id;
        const isDestinationCharge = !!paymentIntent.metadata?.tryhardly_worker_account;

        if (questId && isDestinationCharge) {
          console.error(
            `❌ Authorization failed for quest ${questId}: ${paymentIntent.last_payment_error?.message}`
          );
          // No authorization was secured; clear the payment intent so the client
          // can retry Checkout. Don't write escrowStatus on the new path.
          await prisma.quest.update({
            where: { id: questId },
            data: { paymentStatus: 'NONE', paymentIntentId: null } as any,
          });
        } else if (questId) {
          console.error(`❌ Payment failed for quest ${questId}: ${paymentIntent.last_payment_error?.message}`);
          // Legacy escrow path: revert to NONE so the quest giver can retry.
          await prisma.quest.update({
            where: { id: questId },
            data: { escrowStatus: 'NONE', paymentIntentId: null } as any,
          });
        }
        break;
      }

      case 'payment_intent.canceled': {
        // The authorization was voided before capture (e.g. job canceled or the
        // authorization expired). Mark CANCELED unless already captured.
        const paymentIntent = event.data.object as any;
        const questId = paymentIntent.metadata?.tryhardly_quest_id;
        const isDestinationCharge = !!paymentIntent.metadata?.tryhardly_worker_account;
        if (questId && isDestinationCharge) {
          const current = await prisma.quest.findUnique({ where: { id: questId } });
          if ((current as any)?.paymentStatus !== 'CAPTURED') {
            await prisma.quest.update({
              where: { id: questId },
              data: { paymentStatus: 'CANCELED', paymentCanceledAt: new Date() } as any,
            });
            console.log(`🚫 Authorization canceled for quest ${questId} (not charged)`);
          }
        }
        break;
      }

      case 'account.updated': {
        const account = event.data.object as any;
        const userId = account.metadata?.tryhardly_user_id;

        if (userId && account.charges_enabled) {
          console.log(`✅ Stripe Connect account ${account.id} is now fully onboarded for user ${userId}`);
        }
        break;
      }

      case 'transfer.created': {
        const transfer = event.data.object as any;
        const milestoneId = transfer.metadata?.tryhardly_milestone_id;
        if (milestoneId) {
          console.log(`💸 Transfer ${transfer.id} created for milestone ${milestoneId}`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled webhook event: ${event.type}`);
    }

    // Acknowledge receipt
    res.json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook event:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
