import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { createNotification } from '../services/notificationService';
import { sendEmail, emailTemplates } from '../services/mailerService';
import * as stripeService from '../services/stripeService';
import {
  findContactInfoInFields,
  CONTACT_INFO_VALIDATION_MESSAGE,
} from '../utils/contactDetection';
import { findQuestIdsReviewedBy } from '../services/reviewStatusService';
import { isPlatformPaymentsEnabled } from '../config/paymentsMode';

// Shown when a worker tries to submit a bid before their payout account is
// ready. Only reachable in platform-payments mode: in direct-settlement mode
// there is no payout account, because the worker collects from the customer.
export const PAYOUT_SETUP_REQUIRED_MESSAGE =
  'Connect your payout account before submitting bids, so a payout can be routed to you when a job is completed.';

// Whether the bidding worker's Stripe Connect account is ready to receive the
// routed payout for the marketplace destination-charge flow. Mirrors the
// readiness definition used by the pre-checkout guard and GET
// /api/payments/connect/status, so "payout setup complete" means the same thing
// everywhere. A missing account, an incomplete onboarding, or an error talking
// to Stripe all read as not-ready (fail closed) so we never accept a bid we
// couldn't pay out on.
async function isWorkerPayoutReady(userId: string): Promise<boolean> {
  // In direct-settlement mode the worker is paid by the customer, so there is
  // no connected account to be ready. Checking anyway would reject every bid on
  // the platform: no worker has an account, and the platform's Stripe
  // credentials no longer resolve, so this would fail closed on all of them.
  if (!isPlatformPaymentsEnabled()) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeAccountId: true },
  });
  const accountId = (user as any)?.stripeAccountId as string | null | undefined;
  if (!accountId) return false;
  try {
    const account = await stripeService.getAccount(accountId);
    return stripeService.evaluateAccountReadiness(account).ready;
  } catch {
    return false;
  }
}

// Walkthrough types a worker can request before/while bidding. Mirrors the
// Prisma WalkthroughType enum; kept local so we can validate request input
// without importing enum runtime values.
const WALKTHROUGH_TYPES = ['NONE', 'REMOTE', 'IN_PERSON'] as const;
type WalkthroughTypeValue = (typeof WALKTHROUGH_TYPES)[number];

// Coerce an incoming value into a non-negative number or undefined. Rejects
// negatives and non-finite numbers so a bid can't carry garbage. Returns
// undefined (not null) for "not provided" so Prisma leaves the column at its
// default rather than explicitly nulling it.
function toNonNegativeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'string' ? Number(value) : (value as number);
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// Normalize an itemized material list into a clean JSON-serializable array.
// Accepts an array of { name, quantity, unit, estimatedCost, notes }; drops
// rows without a name; caps the list so a single bid can't store an unbounded
// payload. Returns undefined when there's nothing usable.
function normalizeMaterialItems(value: unknown): unknown[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value
    .slice(0, 100)
    .map((raw) => {
      if (!raw || typeof raw !== 'object') return null;
      const r = raw as Record<string, unknown>;
      const name = toTrimmedString(r.name);
      if (!name) return null;
      return {
        name: name.slice(0, 200),
        quantity: toNonNegativeNumber(r.quantity) ?? null,
        unit: toTrimmedString(r.unit)?.slice(0, 40) ?? null,
        estimatedCost: toNonNegativeNumber(r.estimatedCost) ?? null,
        notes: toTrimmedString(r.notes)?.slice(0, 500) ?? null,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  return items.length > 0 ? items : undefined;
}

// Build the detailed-bid data patch from the request body. Every field is
// optional; only present/valid values are included so the simple "express
// interest" apply path (coverLetter only) is unchanged.
function buildBidData(body: Record<string, unknown>) {
  const walkthroughTypeRaw =
    typeof body.walkthroughType === 'string'
      ? (body.walkthroughType.toUpperCase() as WalkthroughTypeValue)
      : undefined;
  const walkthroughType = WALKTHROUGH_TYPES.includes(walkthroughTypeRaw as WalkthroughTypeValue)
    ? walkthroughTypeRaw
    : undefined;

  // A walkthrough is considered requested if explicitly flagged or if a
  // non-NONE type was chosen.
  const walkthroughRequested =
    body.walkthroughRequested === true ||
    (walkthroughType !== undefined && walkthroughType !== 'NONE');

  return {
    bidAmount: toNonNegativeNumber(body.bidAmount),
    materialCostEstimate: toNonNegativeNumber(body.materialCostEstimate),
    laborCostEstimate: toNonNegativeNumber(body.laborCostEstimate),
    estimatedLaborHours: toNonNegativeNumber(body.estimatedLaborHours),
    materialItems: normalizeMaterialItems(body.materialItems),
    toolsNeeded: toTrimmedString(body.toolsNeeded),
    timeline: toTrimmedString(body.timeline),
    walkthroughRequested,
    walkthroughType: walkthroughRequested ? walkthroughType ?? 'NONE' : 'NONE',
    proposedWalkthroughTimes: toTrimmedString(body.proposedWalkthroughTimes),
    bidNotes: toTrimmedString(body.bidNotes),
    legalQualificationAck: body.legalQualificationAck === true,
  };
}

// POST /api/quests/:questId/apply
export const applyToQuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questId } = req.params;
    const { coverLetter, proposedRate } = req.body;

    const quest = await prisma.quest.findUnique({ where: { id: questId } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }
    if (quest.status !== 'OPEN') { res.status(400).json({ error: 'Quest is not open for applications' }); return; }
    if (quest.questGiverId === req.user!.id) { res.status(400).json({ error: 'Cannot apply to your own quest' }); return; }

    const existing = await prisma.application.findFirst({
      where: { questId, adventurerId: req.user!.id },
    });
    if (existing) { res.status(400).json({ error: 'Already applied to this quest' }); return; }

    // Bidding controls. Writing a bid is unpaid work, and a worker who writes
    // five and wins none simply leaves - which a market this small cannot
    // absorb. TaskRabbit abandoned its bidding auction for exactly this reason:
    // taskers spent hours bidding instead of working. Capping bids keeps each
    // one worth writing and hands the poster a shortlist rather than a pile.
    if (quest.biddingClosedAt) {
      res.status(400).json({
        error: 'Bidding closed',
        message: 'This job has the bids it needs. Have a look at what else is open nearby.',
        biddingClosed: true,
      });
      return;
    }
    if (quest.maxApplications && quest.maxApplications > 0) {
      const bidCount = await prisma.application.count({ where: { questId } });
      if (bidCount >= quest.maxApplications) {
        // Close it explicitly so the job board stops advertising it as open
        // rather than letting workers discover the cap by being rejected.
        await prisma.quest.update({
          where: { id: questId },
          data: { biddingClosedAt: new Date() },
        });
        res.status(400).json({
          error: 'Bidding closed',
          message: `This job already has ${bidCount} bids. Have a look at what else is open nearby.`,
          biddingClosed: true,
        });
        return;
      }
    }

    // Payout precondition: a worker must have a connected/ready Stripe Connect
    // payout account before a bid can be SUBMITTED. This does not touch the
    // payment model — no card is charged here; it only ensures that, once the
    // poster accepts and authorizes payment, the completed-task capture can
    // route the worker's payout through Stripe Connect.
    if (!(await isWorkerPayoutReady(req.user!.id))) {
      res.status(400).json({
        error: 'Payout setup required',
        message: PAYOUT_SETUP_REQUIRED_MESSAGE,
        payoutSetupRequired: true,
      });
      return;
    }

    const bidData = buildBidData(req.body || {});
    const cover = toTrimmedString(coverLetter);
    const rate = toNonNegativeNumber(proposedRate);

    // Require some substance: either a written note/cover letter or a bid amount.
    // Prevents creating an empty application now that coverLetter is optional.
    if (!cover && bidData.bidAmount === undefined && rate === undefined) {
      res.status(400).json({ error: 'Add a cover note or a bid amount before submitting' });
      return;
    }

    // Platform-safe messaging: a bid is submitted BEFORE it is accepted, so the
    // worker's free-text fields must not carry contact info or off-platform
    // payment arrangements. Material lists/measurements are intentionally not
    // scanned (so "T-post", "2x4", measurements never trip this). Once the
    // poster accepts a bid the parties can coordinate freely via messaging.
    const contactHit = findContactInfoInFields({
      coverLetter: cover,
      bidNotes: bidData.bidNotes,
      toolsNeeded: bidData.toolsNeeded,
      timeline: bidData.timeline,
      proposedWalkthroughTimes: bidData.proposedWalkthroughTimes,
    });
    if (contactHit) {
      res.status(400).json({ error: CONTACT_INFO_VALIDATION_MESSAGE });
      return;
    }

    const application = await prisma.application.create({
      data: {
        questId,
        adventurerId: req.user!.id,
        coverLetter: cover,
        proposedRate: rate,
        ...bidData,
      } as any,
      include: { adventurer: { select: { id: true, username: true, avatarUrl: true, level: true } } },
    });

    const bidSummary =
      bidData.bidAmount !== undefined
        ? ` Bid: $${bidData.bidAmount.toLocaleString()}.`
        : '';
    await createNotification({
      userId: quest.questGiverId,
      type: 'QUEST_APPLICATION',
      title: 'New bid',
      message: `${application.adventurer.username} submitted a bid on "${quest.title}".${bidSummary}`,
    });

    const giver = await prisma.user.findUnique({
      where: { id: quest.questGiverId },
      select: { email: true },
    });
    if (giver?.email) {
      void sendEmail(emailTemplates.newApplication(giver.email, application.adventurer.username, quest.title));
    }

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply' });
  }
};

// GET /api/quests/:questId/applications
export const getQuestApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quest = await prisma.quest.findUnique({ where: { id: req.params.questId } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }
    if (quest.questGiverId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

    const applications = await prisma.application.findMany({
      where: { questId: req.params.questId },
      include: {
        adventurer: { select: { id: true, username: true, displayName: true, avatarUrl: true, level: true, reputationScore: true, adventurerClass: true, totalQuestsCompleted: true } },
      },
      orderBy: { appliedAt: 'desc' },
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

// PUT /api/applications/:id/accept
export const acceptApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { quest: true },
    });
    if (!application) { res.status(404).json({ error: 'Application not found' }); return; }
    if (application.quest.questGiverId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

    // Payment handoff: when the poster selects a bid, the quoted bid amount
    // becomes the amount the job is paid at. The marketplace Checkout flow reads
    // quest.reward (paymentController.createQuestCheckout), so writing the bid
    // amount here is the smallest safe handoff — no payment is authorized at
    // accept time; the poster still has to explicitly start Checkout afterward,
    // and that's the only place a card is touched. We fall back to proposedRate,
    // then leave reward unchanged if the bid carried no amount (legacy
    // express-interest application).
    const selectedAmount =
      (application as any).bidAmount ?? (application as any).proposedRate ?? null;
    const questPatch: Record<string, unknown> = {
      status: 'IN_PROGRESS',
      assignedAdventurerId: application.adventurerId,
    };
    if (selectedAmount !== null && Number(selectedAmount) > 0) {
      questPatch.reward = selectedAmount;
    }

    // Update application status, assign worker, set the agreed amount, and mark
    // the other bids not selected. Selecting one bid explicitly chooses that
    // worker/amount; the others move to REJECTED (preserves existing single-
    // winner accept behavior) — none are auto-accepted.
    const [updated] = await prisma.$transaction([
      prisma.application.update({ where: { id: req.params.id }, data: { status: 'ACCEPTED' } }),
      prisma.quest.update({
        where: { id: application.questId },
        data: questPatch as any,
      }),
      prisma.application.updateMany({
        where: { questId: application.questId, id: { not: req.params.id } },
        data: { status: 'REJECTED' },
      }),
    ]);

    const acceptedAmount =
      selectedAmount !== null && Number(selectedAmount) > 0
        ? ` Agreed amount: $${Number(selectedAmount).toLocaleString()}.`
        : '';
    await createNotification({
      userId: application.adventurerId,
      type: 'QUEST_ACCEPTED',
      title: 'Bid accepted',
      message: `Your bid for "${application.quest.title}" was accepted.${acceptedAmount} Time to get started!`,
    });

    const accepted = await prisma.user.findUnique({
      where: { id: application.adventurerId },
      select: { email: true },
    });
    if (accepted?.email) {
      void sendEmail(emailTemplates.applicationAccepted(accepted.email, application.quest.title));
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to accept application' });
  }
};

// PUT /api/applications/:id/reject
export const rejectApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const application = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { quest: true },
    });
    if (!application) { res.status(404).json({ error: 'Application not found' }); return; }
    if (application.quest.questGiverId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

    const updated = await prisma.application.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });

    await createNotification({
      userId: application.adventurerId,
      type: 'QUEST_APPLICATION',
      title: 'Application update',
      message: `Your application for "${application.quest.title}" was not selected this time.`,
    });

    const rejected = await prisma.user.findUnique({
      where: { id: application.adventurerId },
      select: { email: true },
    });
    if (rejected?.email) {
      void sendEmail(emailTemplates.applicationRejected(rejected.email, application.quest.title));
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to reject application' });
  }
};

// GET /api/users/me/applications - My applications as adventurer
//
// An application stays ACCEPTED for the rest of the job's life, so the worker
// dashboard cannot label the row from application.status alone — a won bid would
// read "Accepted" long after the work was submitted and confirmed. The quest's
// work status (IN_PROGRESS → IN_REVIEW → COMPLETED) plus the completion
// timestamps are therefore part of this payload, alongside `viewerHasReviewed`
// so the dashboard knows whether to still prompt the worker for a review.
export const getMyApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!.id;
    const applications = await prisma.application.findMany({
      where: { adventurerId: me },
      include: {
        quest: {
          select: {
            id: true,
            title: true,
            category: true,
            difficulty: true,
            reward: true,
            status: true,
            questGiverId: true,
            assignedAdventurerId: true,
            completionRequestedAt: true,
            completedAt: true,
            // Read-only fields the worker dashboard labels rows with: whether the
            // poster has authorized a payment method yet, the type of work, and
            // when the job last moved. No payment behavior depends on these.
            paymentStatus: true,
            tags: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    });

    const reviewedQuestIds = await findQuestIdsReviewedBy(
      me,
      applications.map((a) => a.questId),
    );

    res.json(
      applications.map((a) => ({
        ...a,
        quest: a.quest ? { ...a.quest, viewerHasReviewed: reviewedQuestIds.has(a.quest.id) } : a.quest,
      })),
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};
