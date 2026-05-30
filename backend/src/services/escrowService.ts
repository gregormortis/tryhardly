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
 * Resolve the charge ID for a captured PaymentIntent.
 *
 * `Transfer.source_transaction` must reference a charge (`ch_...`), not a
 * PaymentIntent (`pi_...`). After a manual-capture PaymentIntent is captured,
 * its `latest_charge` holds the charge we draw transferred funds from.
 */
async function resolveChargeId(paymentIntentId: string): Promise<string> {
  const pi = await stripeService.getPaymentIntent(paymentIntentId);
  const latestCharge = (pi as any).latest_charge;
  const chargeId =
    typeof latestCharge === 'string' ? latestCharge : latestCharge?.id;

  if (!chargeId) {
    throw new Error('Escrow payment has no captured charge to transfer from');
  }

  return chargeId;
}

/**
 * Ensure a quest giver has a Stripe Customer ID.
 * Creates one if missing, saves it to the user record.
 */
async function ensureCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

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
 * - Quest must have an assigned adventurer (assignedAdventurerId)
 * - Adventurer must have a Stripe Connect account
 * - Quest must not already be escrowed
 *
 * Creates a manual-capture PaymentIntent and stores the ID on the quest.
 *
 * If the quest has NO milestones, a single default milestone for the full
 * budget is created here. Without it, `completeQuest` would capture the
 * quest giver's funds but transfer $0 to the adventurer (it iterates over
 * milestones). Seeding one full-budget milestone guarantees the captured
 * funds are paid out.
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
      milestones: true,
    },
  });

  const posterId = (quest as any).questGiverId;
  const taker = (quest as any).assignedAdventurer;
  const takerId = (quest as any).assignedAdventurerId;

  if (!takerId) {
    throw new Error('Quest has no assigned adventurer');
  }

  const escrowStatus = (quest as any).escrowStatus;
  if (escrowStatus && escrowStatus !== 'NONE') {
    throw new Error(`Quest escrow already initialized (status: ${escrowStatus})`);
  }

  const adventurerUser =
    taker || (await prisma.user.findUniqueOrThrow({ where: { id: takerId } }));
  const adventurerAccountId = (adventurerUser as any).stripeAccountId;
  if (!adventurerAccountId) {
    throw new Error('Adventurer has not completed Stripe onboarding');
  }

  const customerId = await ensureCustomer(posterId);

  const budget = (quest as any).reward;
  const amountCents = dollarsToCents(budget);

  if (amountCents <= 0) {
    throw new Error('Quest budget must be greater than zero');
  }

  // Guarantee at least one milestone so completion pays out the full budget.
  if (!quest.milestones || quest.milestones.length === 0) {
    await prisma.milestone.create({
      data: {
        questId,
        title: 'Quest Completion',
        description: 'Full payout on quest completion.',
        amount: budget,
        status: 'PENDING',
      },
    });
  }

  const paymentIntent = await stripeService.createEscrowPayment(
    questId,
    amountCents,
    customerId,
    adventurerAccountId
  );

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
 * Only the quest giver can approve milestone completion. Escrow must be
 * captured (FUNDED / PARTIALLY_RELEASED) before any transfer can occur.
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
  const posterId = (quest as any).questGiverId;

  if (posterId !== userId) {
    throw new Error('Only the quest giver can approve milestone completion');
  }

  if (milestone.status === 'PAID') {
    throw new Error('Milestone is already paid');
  }

  const paymentIntentId = (quest as any).paymentIntentId;
  if (!paymentIntentId) {
    throw new Error('Quest has no escrowed payment');
  }

  const escrowStatus = (quest as any).escrowStatus;
  if (!escrowStatus || !['FUNDED', 'PARTIALLY_RELEASED'].includes(escrowStatus)) {
    throw new Error(`Cannot release milestone: escrow status is ${escrowStatus || 'NONE'}`);
  }

  const takerId = (quest as any).assignedAdventurerId;
  const adventurer = await prisma.user.findUniqueOrThrow({ where: { id: takerId } });
  const adventurerAccountId = (adventurer as any).stripeAccountId;

  if (!adventurerAccountId) {
    throw new Error('Adventurer has no Stripe account');
  }

  const amountCents = dollarsToCents(milestone.amount);
  const chargeId = await resolveChargeId(paymentIntentId);

  const transfer = await stripeService.releaseMilestonePayment(
    milestoneId,
    amountCents,
    adventurerAccountId,
    chargeId
  );

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      status: 'PAID',
      completedAt: new Date(),
    },
  });

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
 * Complete an entire quest — captures held funds and releases them.
 *
 * Called when the quest giver approves the final deliverable. If escrow is
 * still authorized (PENDING), it is captured first. Then every unpaid
 * milestone is transferred to the adventurer. Because `initializeEscrow`
 * guarantees at least one milestone, this always transfers > $0.
 */
export async function completeQuest(
  questId: string,
  userId: string
): Promise<{ status: string }> {
  const quest = await prisma.quest.findUniqueOrThrow({
    where: { id: questId },
    include: { milestones: true },
  });

  const posterId = (quest as any).questGiverId;
  if (posterId !== userId) {
    throw new Error('Only the quest giver can complete the quest');
  }

  const paymentIntentId = (quest as any).paymentIntentId;
  if (!paymentIntentId) {
    throw new Error('Quest has no escrowed payment');
  }

  const unpaidMilestones = quest.milestones.filter((m: any) => m.status !== 'PAID');
  if (unpaidMilestones.length === 0) {
    throw new Error('Quest has no unpaid milestones to release');
  }

  let escrowStatus = (quest as any).escrowStatus;

  // If escrow is still authorized but not captured, capture it first.
  if (escrowStatus === 'PENDING') {
    await stripeService.capturePayment(paymentIntentId);
    await prisma.quest.update({
      where: { id: questId },
      data: { escrowStatus: 'FUNDED' } as any,
    });
    escrowStatus = 'FUNDED';
  }

  const takerId = (quest as any).assignedAdventurerId;
  const adventurer = await prisma.user.findUniqueOrThrow({ where: { id: takerId } });
  const adventurerAccountId = (adventurer as any).stripeAccountId;

  if (!adventurerAccountId) {
    throw new Error('Adventurer has no Stripe account');
  }

  // Resolve the charge once funds are captured, then transfer each milestone.
  const chargeId = await resolveChargeId(paymentIntentId);

  for (const milestone of unpaidMilestones) {
    const amountCents = dollarsToCents(milestone.amount);

    await stripeService.releaseMilestonePayment(
      milestone.id,
      amountCents,
      adventurerAccountId,
      chargeId
    );

    await prisma.milestone.update({
      where: { id: milestone.id },
      data: {
        status: 'PAID',
        completedAt: new Date(),
      },
    });
  }

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
 * Only the quest giver can cancel, and only if escrow hasn't been fully
 * released. PENDING (authorized-only) intents are cancelled; captured funds
 * are refunded.
 */
export async function cancelQuest(
  questId: string,
  userId: string
): Promise<{ refundId: string }> {
  const quest = await prisma.quest.findUniqueOrThrow({
    where: { id: questId },
  });

  const posterId = (quest as any).questGiverId;
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

  let refundId: string;

  if (escrowStatus === 'FUNDED' || escrowStatus === 'PARTIALLY_RELEASED') {
    const refund = await stripeService.refundEscrow(paymentIntentId);
    refundId = refund.id;
  } else {
    // PENDING: authorized but not captured — cancel the intent.
    const canceled = await stripeService.cancelPaymentIntent(paymentIntentId);
    refundId = `canceled_${canceled.id}`;
  }

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
  paymentIntentId: string | null;
  totalBudget: number;
  totalEscrowed: number;
  totalReleased: number;
  totalRemaining: number;
  platformFee: number;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
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

  const budget = (quest as any).reward;
  const budgetCents = dollarsToCents(budget);
  const escrowStatus = (quest as any).escrowStatus || 'NONE';
  const paymentIntentId = (quest as any).paymentIntentId || null;

  const milestoneBreakdown = quest.milestones.map((m: any) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    amount: dollarsToCents(m.amount),
    status: m.status,
  }));

  const totalReleased = milestoneBreakdown
    .filter((m: any) => m.status === 'PAID')
    .reduce((sum: number, m: any) => sum + m.amount, 0);

  const platformFeePercent = stripeService.PLATFORM_FEE_PERCENT;
  const platformFee = Math.round(budgetCents * (platformFeePercent / 100));

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
      paymentIntentInfo = null;
    }
  }

  return {
    questId,
    escrowStatus,
    paymentIntentId,
    totalBudget: budgetCents,
    totalEscrowed: paymentIntentInfo?.amount || 0,
    totalReleased,
    totalRemaining: budgetCents - totalReleased,
    platformFee,
    milestones: milestoneBreakdown,
    paymentIntent: paymentIntentInfo,
  };
}
