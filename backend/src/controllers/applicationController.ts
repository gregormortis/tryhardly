import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { createNotification } from '../services/notificationService';
import { sendEmail, emailTemplates } from '../services/mailerService';

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

    const bidData = buildBidData(req.body || {});
    const cover = toTrimmedString(coverLetter);
    const rate = toNonNegativeNumber(proposedRate);

    // Require some substance: either a written note/cover letter or a bid amount.
    // Prevents creating an empty application now that coverLetter is optional.
    if (!cover && bidData.bidAmount === undefined && rate === undefined) {
      res.status(400).json({ error: 'Add a cover note or a bid amount before submitting' });
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
        adventurer: { select: { id: true, username: true, avatarUrl: true, level: true, reputationScore: true, adventurerClass: true } },
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
export const getMyApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const applications = await prisma.application.findMany({
      where: { adventurerId: req.user!.id },
      include: { quest: { select: { id: true, title: true, category: true, difficulty: true, reward: true, status: true } } },
      orderBy: { appliedAt: 'desc' },
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};
