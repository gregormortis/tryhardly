import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { prisma } from '../app';
import * as stripeService from '../services/stripeService';
import * as escrowService from '../services/escrowService';

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

    // Create new Connect account
    const account = await stripeService.createConnectedAccount(userId, user.email);

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
    console.error('Error creating connected account:', error);
    res.status(500).json({
      error: 'Failed to create Stripe Connect account',
      message: error.message,
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

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
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
    console.error('Error creating onboarding link:', error);
    res.status(500).json({
      error: 'Failed to create onboarding link',
      message: error.message,
    });
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
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
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
    // req.body must be the raw Buffer for signature verification
    event = stripeService.constructWebhookEvent(
      req.body as Buffer,
      sig,
      endpointSecret
    );
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message);
    res.status(400).json({ error: `Webhook Error: ${error.message}` });
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as any;
        const questId = paymentIntent.metadata?.tryhardly_quest_id;

        if (questId) {
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

        if (questId) {
          console.error(`❌ Payment failed for quest ${questId}: ${paymentIntent.last_payment_error?.message}`);
          // Revert to NONE so the quest giver can retry
          await prisma.quest.update({
            where: { id: questId },
            data: { escrowStatus: 'NONE', paymentIntentId: null } as any,
          });
        }
        break;
      }

      case 'payment_intent.amount_capturable_updated': {
        const paymentIntent = event.data.object as any;
        const questId = paymentIntent.metadata?.tryhardly_quest_id;
        if (questId) {
          console.log(`💰 Payment authorized for quest ${questId}: ${paymentIntent.amount_capturable} capturable`);
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
