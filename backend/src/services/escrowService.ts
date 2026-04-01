import { prisma } from '../app';
import * as stripeService from './stripeService';

// Re-export for convenience
export { PLATFORM_FEE_PERCENT } from './stripeService';

/**
 * Convert a dollar amount (Decimal from Prisma) to cents for Stripe.
 */
function dollarsToCents(amount: number | { toNumber?: () => number }): number {
  const num = typeof amount === 'number' ? amount : Number(amount);
  return Math.round(num * 100);
}

/**
 * Ensure a quest giver has a Stripe Customer ID.
 * Creates one if missing, saves it to the user record.
 */
async function ensureCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  // Check if user already has stripeCustomerId (field may not exist yet in schema)
  const stripeCustomerId = (user as any).stripeCustomerId;
  if (stripeCustomerId) {
    return stripeCustomerId;
  }

  const customer = await stripeService.createCustomer(userId, user.email);

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id } as any,
  });

  return customer.id;
}

/**
 * Initialize escrow for a quest after an application is accepted.
 *
 * Preconditions:
 * - Quest must have an assigned adventurer (takerId / assignedAdventurerId)
 * - Adventurer must have a Stripe Connect account
 * - Quest must not already be escrowed
 *
 * Creates a manual-capture PaymentIntent and stores the ID on the quest.
 */
export async function initializeEscrow(questId: string): Promise<{
  paymentIntentId: string;
  clientSecret: string;
}> {
  const quest = await prisma.quest.findUniqueOrThrow({
    where: { id: questId },
    include: {
      questGiver: true,
      assignedAdventurer: true,
    },
  });

  const poster = (quest as any).questGiver;
  const taker = (quest as any).assignedAdventurer;
  const posterId = poster?.id || (quest as any).questGiverId;
  const takerId = taker?.id || (quest as any).assignedAdventurerId;

  if (!takerId) {
    throw new Error('Quest has no assigned adventurer');
  }

  // Check escrow status
  const escrowStatus = (quest as any).escrowStatus;
  if (escrowStatus && escrowStatus !== 'NONE') {
    throw new Error(`Quest escrow already initialized (status: ${escrowStatus})`);
  }

  // Ensure adventurer has Stripe Connect account
  const adventurerUser = taker || await prisma.user.findUniqueOrThrow({ where: { id: takerId } });
  const adventurerAccountId = (adventurerUser as any).stripeAccountId;
  if (!adventurerAccountId) {
    throw new Error('Adventurer has not completed Stripe onboarding');
  }

  // Ensure quest giver has a Stripe Customer
  const customerId = await ensureCustomer(posterId);

  // Get quest amount in cents
  const budget = (quest as any).budget || (quest as any).reward;
  const amountCents = dollarsToCents(budget);

  if (amountCents <= 0) {
    throw new Error('Quest budget must be greater than zero');
  }

  // Create the escrowed PaymentIntent
  const paymentIntent = await stripeService.createEscrowPayment(
    questId,
    amountCents,
    customerId,
    adventurerAccountId
  );

  // Update quest with payment info
  await prisma.quest.update({
    where: { id: questId },
    data: {
      paymentIntentId: paymentIntent.id,
      escrowStatus: 'PENDING',
    } as any,
  });

  return {
    paymentIntentId: paymentIntent.id,
    clientSecret: paymentIntent.client_secret!,
  };
}

/**
 * Mark a milestone as completed and release its funds to the adventurer.
 *
 * Only the quest giver can approve milestone completion.
 */
export async function completeMilestone(
  milestoneId: string,
  userId: string
): Promise<{ transferId: string; amount: number }> {
  const milestone = await prisma.milestone.findUniqueOrThrow({
    where: { id: milestoneId },
    include: { quest: true },
  });

  const quest = milestone.quest;
  const posterId = (quest as any).posterId || (quest as any).questGiverId;

  // Authorization: only quest giver can release milestone funds
  if (posterId !== userId) {
    throw new Error('Only the quest giver can approve milestone completion');
  }

  if (milestone.status !== 'PENDING') {
    throw new Error(`Milestone is already ${milestone.status.toLowerCase()}`);
  }

  const paymentIntentId = (quest as any).paymentIntentId;
  if (!paymentIntentId) {
    throw new Error('Quest has no escrowed payment');
  }

  // Check that escrow is funded (PaymentIntent has been captured/confirmed)
  const escrowStatus = (quest as any).escrowStatus;
  if (!escrowStatus || !['FUNDED', 'PARTIALLY_RELEASED'].includes(escrowStatus)) {
    throw new Error(`Cannot release milestone: escrow status is ${escrowStatus || 'NONE'}`);
  }

  // Get adventurer's Stripe account
  const takerId = (quest as any).takerId || (quest as any).assignedAdventurerId;
  const adventurer = await prisma.user.findUniqueOrThrow({ where: { id: takerId } });
  const adventurerAccountId = (adventurer as any).stripeAccountId;

  if (!adventurerAccountId) {
    throw new Error('Adventurer has no Stripe account');
  }

  const amountCents = dollarsToCents(milestone.amount);

  // Create transfer for this milestone
  const transfer = await stripeService.releaseMilestonePayment(
    milestoneId,
    amountCents,
    adventurerAccountId,
    paymentIntentId
  );

  // Update milestone status
  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      status: 'PAID',
      completedAt: new Date(),
    },
  });

  // Check if all milestones are now paid — if so, mark quest escrow as RELEASED
  const remainingMilestones = await prisma.milestone.count({
    where: {
      questId: quest.id,
      status: { not: 'PAID' },
    },
  });

  const newEscrowStatus = remainingMilestones === 0 ? 'RELEASED' : 'PARTIALLY_RELEASED';
  await prisma.quest.update({
    where: { id: quest.id },
    data: { escrowStatus: newEscrowStatus } as any,
  });

  return {
    transferId: transfer.id,
    amount: amountCents,
  };
}

/**
 * Complete an entire quest — captures remaining funds and releases them.
 *
 * This is called when the quest giver approves the final deliverable.
 * Any unpaid milestones are marked as PAID, and remaining funds are transferred.
 */
export async function completeQuest(
  questId: string,
  userId: string
): Promise<{ status: string }> {
  const quest = await prisma.quest.findUniqueOrThrow({
    where: { id: questId },
    include: { milestones: true },
  });

  const posterId = (quest as any).posterId || (quest as any).questGiverId;
  if (posterId !== userId) {
    throw new Error('Only the quest giver can complete the quest');
  }

  const paymentIntentId = (quest as any).paymentIntentId;
  if (!paymentIntentId) {
    throw new Error('Quest has no escrowed payment');
  }

  const escrowStatus = (quest as any).escrowStatus;

  // If escrow is still pending (authorized but not captured), capture it first
  if (escrowStatus === 'PENDING') {
    await stripeService.capturePayment(paymentIntentId);
    await prisma.quest.update({
      where: { id: questId },
      data: { escrowStatus: 'FUNDED' } as any,
    });
  }

  // Get adventurer's Stripe account
  const takerId = (quest as any).takerId || (quest as any).assignedAdventurerId;
  const adventurer = await prisma.user.findUniqueOrThrow({ where: { id: takerId } });
  const adventurerAccountId = (adventurer as any).stripeAccountId;

  if (!adventurerAccountId) {
    throw new Error('Adventurer has no Stripe account');
  }

  // Pay out all unpaid milestones
  const unpaidMilestones = quest.milestones.filter(
    (m: any) => m.status !== 'PAID'
  );

  for (const milestone of unpaidMilestones) {
    const amountCents = dollarsToCents(milestone.amount);

    await stripeService.releaseMilestonePayment(
      milestone.id,
      amountCents,
      adventurerAccountId,
      paymentIntentId
    );

    await prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        status: 'PAID',
        completedAt: new Date(),
      },
    });
  }

  // Update quest to completed
  await prisma.quest.update({
    where: { id: questId },
    data: {
      status: 'COMPLETED',
      escrowStatus: 'RELEASED',
      completedAt: new Date(),
    } as any,
  });

  return { status: 'RELEASED' };
}

/**
 * Cancel a quest and refund the escrowed funds.
 *
 * Only the quest giver can cancel, and only if escrow hasn't been fully released.
 */
export async function cancelQuest(
  questId: string,
  userId: string
): Promise<{ refundId: string }> {
  const quest = await prisma.quest.findUniqueOrThrow({
    where: { id: questId },
  });

  const posterId = (quest as any).posterId || (quest as any).questGiverId;
  if (posterId !== userId) {
    throw new Error('Only the quest giver can cancel the quest');
  }

  const escrowStatus = (quest as any).escrowStatus;
  if (escrowStatus === 'RELEASED') {
    throw new Error('Cannot cancel a quest with fully released escrow');
  }

  const paymentIntentId = (quest as any).paymentIntentId;
  if (!paymentIntentId) {
    throw new Error('Quest has no escrowed payment to refund');
  }

  // If funds were captured, issue a refund. If only authorized, cancel the PaymentIntent.
  let refundId: string;

  if (escrowStatus === 'FUNDED' || escrowStatus === 'PARTIALLY_RELEASED') {
    const refund = await stripeService.refundEscrow(paymentIntentId);
    refundId = refund.id;
  } else {
    // For PENDING (authorized but not captured), cancel the intent
    const { stripe } = await import('./stripeService');
    const canceled = await stripe.paymentIntents.cancel(paymentIntentId);
    refundId = `canceled_${canceled.id}`;
  }

  // Update quest status
  await prisma.quest.update({
    where: { id: questId },
    data: {
      status: 'CANCELLED',
      escrowStatus: 'REFUNDED',
    } as any,
  });

  return { refundId };
}

/**
 * Get a detailed breakdown of the escrow status for a quest.
 */
export async function getEscrowStatus(questId: string): Promise<{
  questId: string;
  escrowStatus: string;
  totalBudget: number;
  totalEscrowed: number;
  totalReleased: number;
  totalRemaining: number;
  platformFee: number;
  milestones: Array<{
    id: string;
    title: string;
    amount: number;
    status: string;
  }>;
  paymentIntent: {
    id: string;
    status: string;
    amount: number;
    amountCaptured: number;
  } | null;
}> {
  const quest = await prisma.quest.findUniqueOrThrow({
    where: { id: questId },
    include: { milestones: true },
  });

  const budget = (quest as any).budget || (quest as any).reward;
  const budgetCents = dollarsToCents(budget);
  const escrowStatus = (quest as any).escrowStatus || 'NONE';
  const paymentIntentId = (quest as any).paymentIntentId;

  // Calculate milestone totals
  const milestoneBreakdown = quest.milestones.map((m: any) => ({
    id: m.id,
    title: m.title,
    amount: dollarsToCents(m.amount),
    status: m.status,
  }));

  const totalReleased = milestoneBreakdown
    .filter((m: any) => m.status === 'PAID')
    .reduce((sum: number, m: any) => sum + m.amount, 0);

  const platformFeePercent = stripeService.PLATFORM_FEE_PERCENT;
  const platformFee = Math.round(budgetCents * (platformFeePercent / 100));

  // Fetch live PaymentIntent status if available
  let paymentIntentInfo = null;
  if (paymentIntentId) {
    try {
      const pi = await stripeService.getPaymentIntent(paymentIntentId);
      paymentIntentInfo = {
        id: pi.id,
        status: pi.status,
        amount: pi.amount,
        amountCaptured: pi.amount_received,
      };
    } catch {
      // PaymentIntent may have been deleted or expired
      paymentIntentInfo = null;
    }
  }

  return {
    questId,
    escrowStatus,
    totalBudget: budgetCents,
    totalEscrowed: paymentIntentInfo?.amount || 0,
    totalReleased,
    totalRemaining: budgetCents - totalReleased,
    platformFee,
    milestones: milestoneBreakdown,
    paymentIntent: paymentIntentInfo,
  };
}
