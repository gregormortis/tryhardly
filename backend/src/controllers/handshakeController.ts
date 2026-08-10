import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { createNotification } from '../services/notificationService';
import { findContactInfoInFields, CONTACT_INFO_VALIDATION_MESSAGE } from '../utils/contactDetection';
import { getApprovalState } from '../services/minorApprovalService';

// ─── The Handshake ──────────────────────────────────────────────────────────
//
// A mutual agreement on price, when, where, and what is included, recorded
// before the work starts.
//
// TryHardly does not process payments, so there is no authorization to serve
// as a commitment device. The Handshake replaces it. Its force is not legal —
// TryHardly enforces nothing and moves no money — it is that the agreement is
// explicit, shared, permanent, and attached to both parties' records.
//
// Rules that matter:
//   - Either side may propose. Only the OTHER side can agree.
//   - PROPOSED terms may be revised by the proposer; each revision supersedes
//     the previous row rather than editing it.
//   - Once AGREED the terms are frozen. Changing them means proposing a new
//     Handshake, which both sides must accept again.
//   - Exactly one live (PROPOSED or AGREED) Handshake per job at a time.
//   - Breaking an AGREED Handshake requires a reason, and is recorded against
//     the party who broke it.

const LIVE_STATUSES = ['PROPOSED', 'AGREED'] as const;

// Bounds mirror the payment velocity limits added after the 2026-08-04
// incident, so an agreed amount can't be absurd even though no money moves.
const MIN_AMOUNT_CENTS = 2000; // $20
const MAX_AMOUNT_CENTS = 500000; // $5,000

function toCents(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : (value as number);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function trimmed(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t === '' ? undefined : t;
}

/**
 * Load the job plus the currently live Handshake, and establish who the caller
 * is in relation to it. Centralized because every endpoint below needs the
 * same authorization question answered: are you actually one of these two
 * people?
 */
async function loadContext(questId: string, userId: string) {
  const quest = await prisma.quest.findUnique({
    where: { id: questId },
    select: {
      id: true,
      title: true,
      questGiverId: true,
      assignedAdventurerId: true,
      status: true,
    },
  });
  if (!quest) return { error: 'notFound' as const };

  const isPoster = quest.questGiverId === userId;
  const isWorker = quest.assignedAdventurerId === userId;
  if (!isPoster && !isWorker) return { error: 'forbidden' as const };

  const live = await prisma.handshake.findFirst({
    where: { questId, status: { in: [...LIVE_STATUSES] } },
    orderBy: { createdAt: 'desc' },
  });

  return { quest, isPoster, isWorker, live };
}

/**
 * GET /api/handshakes/quest/:questId
 * The live Handshake plus the superseded history, for either party.
 */
export const getQuestHandshake = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ctx = await loadContext(req.params.questId, req.user!.id);
    if ('error' in ctx) {
      res.status(ctx.error === 'notFound' ? 404 : 403).json({
        error: ctx.error === 'notFound' ? 'Job not found' : 'Not a party to this job',
      });
      return;
    }

    const history = await prisma.handshake.findMany({
      where: { questId: req.params.questId },
      orderBy: { createdAt: 'desc' },
      include: {
        proposedBy: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    res.json({
      handshake: ctx.live ?? null,
      history,
      viewerRole: ctx.isPoster ? 'poster' : 'worker',
    });
  } catch (err) {
    console.error('getQuestHandshake error:', err);
    res.status(500).json({ error: 'Failed to load the agreement' });
  }
};

/**
 * POST /api/handshakes/quest/:questId
 * Propose terms. Either party may do this. Supersedes any PROPOSED terms the
 * caller previously put forward, rather than editing them in place.
 */
export const proposeHandshake = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const ctx = await loadContext(req.params.questId, userId);
    if ('error' in ctx) {
      res.status(ctx.error === 'notFound' ? 404 : 403).json({
        error: ctx.error === 'notFound' ? 'Job not found' : 'Not a party to this job',
      });
      return;
    }
    const { quest, isPoster, live } = ctx;

    if (!quest.assignedAdventurerId) {
      res.status(400).json({ error: 'Accept a bid before agreeing terms' });
      return;
    }
    if (quest.status === 'COMPLETED' || quest.status === 'CANCELLED') {
      res.status(400).json({ error: 'This job is already closed' });
      return;
    }

    // Frozen once agreed. Renegotiating means breaking the existing agreement
    // first, which is deliberate: silently replacing agreed terms is exactly
    // what the Handshake exists to prevent.
    if (live?.status === 'AGREED') {
      res.status(409).json({
        error: 'Terms are already agreed',
        message:
          'These terms are agreed by both of you and cannot be edited. To change them, cancel the agreement first and propose new terms.',
      });
      return;
    }

    const amountCents = toCents(req.body?.amount);
    if (amountCents === null) {
      res.status(400).json({ error: 'Enter the agreed price' });
      return;
    }
    if (amountCents < MIN_AMOUNT_CENTS || amountCents > MAX_AMOUNT_CENTS) {
      res.status(400).json({
        error: `The agreed price must be between $${MIN_AMOUNT_CENTS / 100} and $${(
          MAX_AMOUNT_CENTS / 100
        ).toLocaleString()}`,
      });
      return;
    }

    const scope = trimmed(req.body?.scope);
    if (!scope) {
      res.status(400).json({
        error: 'Describe what is included',
        message:
          'Most disagreements are about what the price covered. Spell out what is included, and anything that is not.',
      });
      return;
    }

    const location = trimmed(req.body?.location);
    const scheduleNote = trimmed(req.body?.scheduleNote);
    const paymentMethod = trimmed(req.body?.paymentMethod);

    // Both parties are already connected at this point, so contact details are
    // allowed in `location` (gate codes, "round the back"). Scope and payment
    // method are still scanned: those are where off-platform redirection tends
    // to be smuggled in.
    const contactHit = findContactInfoInFields({ scope, paymentMethod });
    if (contactHit) {
      res.status(400).json({ error: CONTACT_INFO_VALIDATION_MESSAGE });
      return;
    }

    let scheduledFor: Date | null = null;
    if (req.body?.scheduledFor) {
      const d = new Date(req.body.scheduledFor);
      if (Number.isNaN(d.getTime())) {
        res.status(400).json({ error: 'That date could not be read' });
        return;
      }
      scheduledFor = d;
    }

    const now = new Date();
    const created = await prisma.$transaction(async (tx) => {
      if (live) {
        await tx.handshake.update({
          where: { id: live.id },
          data: { status: 'SUPERSEDED' },
        });
      }
      return tx.handshake.create({
        data: {
          questId: quest.id,
          posterId: quest.questGiverId,
          workerId: quest.assignedAdventurerId!,
          proposedById: userId,
          amountCents,
          scheduledFor,
          scheduleNote,
          location,
          scope,
          paymentMethod,
          version: live ? live.version + 1 : 1,
          // The proposer is bound by their own proposal from the moment they
          // make it; only the counterparty's agreement is outstanding.
          posterAgreedAt: isPoster ? now : null,
          workerAgreedAt: isPoster ? null : now,
          ...(live ? { supersededById: live.id } : {}),
        },
      });
    });

    // New terms mean any existing parental approval describes a job that no
    // longer exists. Revoke it so the parent is asked again rather than the
    // approval silently carrying over to a different address or time.
    try {
      const { revokeStaleApprovals } = await import('../services/minorApprovalService');
      await revokeStaleApprovals(quest.id, {
        address: location ?? '',
        scheduledFor,
        scheduleNote,
      });
    } catch (e) {
      console.error('proposeHandshake approval revocation error:', e);
    }

    const recipientId = isPoster ? quest.assignedAdventurerId! : quest.questGiverId;
    await createNotification({
      userId: recipientId,
      type: 'HANDSHAKE_PROPOSED',
      title: live ? 'Updated terms proposed' : 'Terms proposed',
      message: `$${(amountCents / 100).toLocaleString()} for "${quest.title}". Review and agree before the work starts.`,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error('proposeHandshake error:', err);
    res.status(500).json({ error: 'Failed to propose terms' });
  }
};

/**
 * POST /api/handshakes/:id/agree
 * The counterparty accepts. This is the moment the terms freeze.
 */
export const agreeHandshake = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const hs = await prisma.handshake.findUnique({
      where: { id: req.params.id },
      include: { quest: { select: { id: true, title: true } } },
    });
    if (!hs) { res.status(404).json({ error: 'Agreement not found' }); return; }

    const isPoster = hs.posterId === userId;
    const isWorker = hs.workerId === userId;
    if (!isPoster && !isWorker) { res.status(403).json({ error: 'Not a party to this agreement' }); return; }

    if (hs.status !== 'PROPOSED') {
      res.status(409).json({ error: `These terms are ${hs.status.toLowerCase()} and can no longer be agreed` });
      return;
    }
    // You cannot agree with yourself. Guards against a proposer double-posting
    // to make terms look mutually accepted.
    if (hs.proposedById === userId) {
      res.status(400).json({
        error: 'Waiting on the other side',
        message: 'You proposed these terms, so you have already agreed to them.',
      });
      return;
    }

    // If an under-18 is doing this work, the adult on the account must have
    // approved this specific job - this address, this time - before it can go
    // live. Agreeing terms is the moment the job becomes real, so this is the
    // right gate. Enforced here rather than in the UI because the whole point
    // of the rule is that it holds when someone goes around the UI.
    const approval = await getApprovalState(hs.questId, hs.workerId, {
      address: hs.location ?? '',
      scheduledFor: hs.scheduledFor,
      scheduleNote: hs.scheduleNote,
    });
    if (approval.required && !approval.approved) {
      res.status(403).json({
        error: 'Waiting on a parent or guardian',
        message: approval.reason,
        needsGuardianApproval: true,
        staleBecause: approval.staleBecause,
      });
      return;
    }

    const now = new Date();
    const updated = await prisma.handshake.update({
      where: { id: hs.id },
      data: {
        status: 'AGREED',
        agreedAt: now,
        ...(isPoster ? { posterAgreedAt: now } : { workerAgreedAt: now }),
      },
    });

    await createNotification({
      userId: hs.proposedById,
      type: 'HANDSHAKE_AGREED',
      title: 'Terms agreed',
      message: `You are both agreed on "${hs.quest.title}". The terms are locked in.`,
    });

    res.json(updated);
  } catch (err) {
    console.error('agreeHandshake error:', err);
    res.status(500).json({ error: 'Failed to agree terms' });
  }
};

/**
 * POST /api/handshakes/:id/decline
 * The counterparty says no. Either side can then propose fresh terms.
 */
export const declineHandshake = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const hs = await prisma.handshake.findUnique({
      where: { id: req.params.id },
      include: { quest: { select: { id: true, title: true } } },
    });
    if (!hs) { res.status(404).json({ error: 'Agreement not found' }); return; }
    if (hs.posterId !== userId && hs.workerId !== userId) {
      res.status(403).json({ error: 'Not a party to this agreement' }); return;
    }
    if (hs.status !== 'PROPOSED') {
      res.status(409).json({ error: 'These terms are no longer open' }); return;
    }

    const updated = await prisma.handshake.update({
      where: { id: hs.id },
      data: { status: 'DECLINED', declinedAt: new Date(), declinedById: userId },
    });

    // Declining a proposal is normal negotiation and carries no penalty. Only
    // walking away from an AGREED handshake does.
    await createNotification({
      userId: hs.proposedById === userId ? (userId === hs.posterId ? hs.workerId : hs.posterId) : hs.proposedById,
      type: 'HANDSHAKE_DECLINED',
      title: 'Terms declined',
      message: `The proposed terms for "${hs.quest.title}" were declined. You can suggest different terms.`,
    });

    res.json(updated);
  } catch (err) {
    console.error('declineHandshake error:', err);
    res.status(500).json({ error: 'Failed to decline terms' });
  }
};

/**
 * POST /api/handshakes/:id/break
 * Abandon an AGREED handshake. Recorded against whoever does it.
 *
 * A reason is mandatory. Cancelling a week ahead because of weather and
 * failing to turn up on the day are both "broken", and the record has to be
 * able to tell them apart or it is worthless as a reliability signal.
 */
export const breakHandshake = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const hs = await prisma.handshake.findUnique({
      where: { id: req.params.id },
      include: { quest: { select: { id: true, title: true } } },
    });
    if (!hs) { res.status(404).json({ error: 'Agreement not found' }); return; }

    const isPoster = hs.posterId === userId;
    const isWorker = hs.workerId === userId;
    if (!isPoster && !isWorker) { res.status(403).json({ error: 'Not a party to this agreement' }); return; }
    if (hs.status !== 'AGREED') {
      res.status(409).json({ error: 'There is no agreement in place to cancel' }); return;
    }

    const reason = trimmed(req.body?.reason);
    if (!reason || reason.length < 10) {
      res.status(400).json({
        error: 'Give a reason',
        message:
          'The other person is relying on this. A short explanation is recorded with the cancellation.',
      });
      return;
    }

    const updated = await prisma.handshake.update({
      where: { id: hs.id },
      data: { status: 'BROKEN', brokenAt: new Date(), brokenById: userId, brokenReason: reason },
    });

    await createNotification({
      userId: isPoster ? hs.workerId : hs.posterId,
      type: 'HANDSHAKE_BROKEN',
      title: 'Agreement cancelled',
      message: `The agreement for "${hs.quest.title}" was cancelled: ${reason}`,
    });

    res.json(updated);
  } catch (err) {
    console.error('breakHandshake error:', err);
    res.status(500).json({ error: 'Failed to cancel the agreement' });
  }
};

// Lives in the service layer: completion confirmation needs it, and a
// controller importing another controller creates a cycle that leaves route
// handlers undefined at import time.
export { honorHandshakeForQuest } from '../services/handshakeService';
