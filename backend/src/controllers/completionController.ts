import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { QuestStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/authMiddleware';
import { createNotification } from '../services/notificationService';
import { awardCompletionXp } from '../services/progressionService';
import { sendEmail, emailTemplates } from '../services/mailerService';
import { captureAuthorizedPayment } from './paymentController';

// ─── Work completion protocol ───────────────────────────────────────────────
// The worker→client completion handshake that feeds XP, reviews, proof-of-work,
// and reliability signals. Fully additive: the legacy "owner marks complete"
// path (questController.completeQuest) is preserved unchanged.
//
//   1. submitCompletion  — the assigned worker marks the quest done with notes +
//                          proof image URLs. Quest moves IN_PROGRESS → IN_REVIEW.
//   2. confirmCompletion — the quest giver confirms. Quest → COMPLETED, XP +
//                          completed-jobs counter awarded, proof-of-work item
//                          created from the submitted proof. Review/skill-rating
//                          prompts are surfaced by the UI afterward.
//   3. requestChanges    — the quest giver sends the work back. Quest IN_REVIEW →
//                          IN_PROGRESS with a note; never marks the quest complete.

const MAX_PROOF_URLS = 8;
const MAX_NOTE_LEN = 2000;

function cleanString(v: unknown, max = MAX_NOTE_LEN): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t.length) return null;
  return t.slice(0, max);
}

// Accept a string[] or a single string; trim, drop blanks, de-dupe, cap length.
function cleanUrlArray(v: unknown): string[] {
  const raw = Array.isArray(v) ? v : typeof v === 'string' ? [v] : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const s = typeof item === 'string' ? item.trim() : '';
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
    if (out.length >= MAX_PROOF_URLS) break;
  }
  return out;
}

// POST /api/quests/:id/completion/submit  { note?, proofUrls? }
// The assigned worker submits a completion request. The quest must be assigned
// to the caller and IN_PROGRESS (or already IN_REVIEW, to allow resubmitting
// after a change request). Moves the quest to IN_REVIEW for the giver to review.
export const submitCompletion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!.id;
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }

    if (quest.assignedAdventurerId !== me) {
      res.status(403).json({ error: 'Only the assigned worker can submit completion' });
      return;
    }
    if (quest.status === QuestStatus.COMPLETED) {
      res.status(400).json({ error: 'This quest is already completed' });
      return;
    }
    if (quest.status !== QuestStatus.IN_PROGRESS && quest.status !== QuestStatus.IN_REVIEW) {
      res.status(400).json({ error: 'Completion can only be submitted on an in-progress quest' });
      return;
    }

    const note = cleanString(req.body?.note);
    const proofUrls = cleanUrlArray(req.body?.proofUrls);

    const updated = await prisma.quest.update({
      where: { id: quest.id },
      data: {
        status: QuestStatus.IN_REVIEW,
        completionNote: note,
        completionProofUrls: proofUrls,
        completionRequestedAt: new Date(),
        // Clear any stale change-request note now that the work is resubmitted.
        changeRequestNote: null,
      },
    });

    await createNotification({
      userId: quest.questGiverId,
      type: 'COMPLETION_SUBMITTED',
      title: 'Work submitted for review',
      message: `The worker marked "${quest.title}" as done and submitted it for your review.`,
    });

    const [giver, worker] = await Promise.all([
      prisma.user.findUnique({ where: { id: quest.questGiverId }, select: { email: true } }),
      prisma.user.findUnique({ where: { id: me }, select: { username: true } }),
    ]);
    if (giver?.email) {
      void sendEmail(
        emailTemplates.completionSubmitted(giver.email, worker?.username || 'The worker', quest.title),
      );
    }

    res.json(updated);
  } catch (error) {
    console.error('submitCompletion error:', error);
    res.status(500).json({ error: 'Failed to submit completion' });
  }
};

// POST /api/quests/:id/completion/confirm
// The quest giver confirms the worker's completion request. Quest → COMPLETED,
// completion XP + completed-jobs counter awarded, and a proof-of-work gallery
// item is created from the submitted proof (when proof was provided). Idempotent
// guards prevent double-completion. The UI prompts for a review afterward.
export const confirmCompletion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!.id;
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }

    if (quest.questGiverId !== me) {
      res.status(403).json({ error: 'Only the quest giver can confirm completion' });
      return;
    }
    if (quest.status === QuestStatus.COMPLETED) {
      res.status(400).json({ error: 'This quest is already completed' });
      return;
    }
    // Confirmation belongs to the review handshake: the worker must have
    // submitted a completion request first (quest is IN_REVIEW).
    if (quest.status !== QuestStatus.IN_REVIEW) {
      res.status(400).json({ error: 'No completion request is awaiting your review' });
      return;
    }

    const now = new Date();
    const updated = await prisma.quest.update({
      where: { id: quest.id },
      data: {
        status: QuestStatus.COMPLETED,
        completedAt: now,
        completionConfirmedAt: now,
      },
    });

    // Capture the authorized marketplace payment now that the task is confirmed
    // complete: authorize → complete → capture → payout. This finalizes the
    // charge and lets Stripe Connect route the worker's share + 12% fee. It is
    // best-effort and never blocks confirmation — quests on the legacy escrow
    // path (or with no authorization) simply have nothing to capture, and a
    // capture error is recorded as CAPTURE_FAILED for the quest giver to retry
    // via POST /api/payments/quest/:id/capture.
    try {
      const result = await captureAuthorizedPayment(quest.id);
      if (result.captured) {
        console.log(`✅ Captured marketplace payment for quest ${quest.id} on completion`);
      }
    } catch (e) {
      console.error('confirmCompletion payment capture error:', e);
    }

    if (quest.assignedAdventurerId) {
      const workerId = quest.assignedAdventurerId;

      // Increment the worker's completed-jobs counter (a progression signal).
      await prisma.user.update({
        where: { id: workerId },
        data: { totalQuestsCompleted: { increment: 1 } },
      });

      // Award balanced completion XP (rating XP is layered on later via reviews).
      try {
        await awardCompletionXp(quest.id);
      } catch (e) {
        console.error('awardCompletionXp error:', e);
      }

      // Turn the submitted proof into a proof-of-work gallery item the worker
      // owns. Only when proof was actually submitted — we never fabricate proof.
      if (quest.completionProofUrls.length > 0) {
        try {
          await prisma.proofOfWork.create({
            data: {
              userId: workerId,
              questId: quest.id,
              title: quest.title,
              description: quest.completionNote,
              imageUrls: quest.completionProofUrls,
              skillTags: (quest.tags || []).filter((t) => !t.startsWith('photo:')),
              visible: true,
            },
          });
        } catch (e) {
          // Gallery creation is additive; never fail the confirmation over it.
          console.error('confirmCompletion proof-of-work error:', e);
        }
      }

      await createNotification({
        userId: workerId,
        type: 'COMPLETION_CONFIRMED',
        title: 'Task completion confirmed',
        message: `"${quest.title}" was confirmed complete. Nice work! Leave a review when you can.`,
      });

      const worker = await prisma.user.findUnique({
        where: { id: workerId },
        select: { email: true },
      });
      if (worker?.email) {
        void sendEmail(emailTemplates.completionConfirmed(worker.email, quest.title));
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('confirmCompletion error:', error);
    res.status(500).json({ error: 'Failed to confirm completion' });
  }
};

// POST /api/quests/:id/completion/request-changes  { note? }
// The quest giver sends the work back to the worker without completing it. Quest
// IN_REVIEW → IN_PROGRESS, change-request count incremented, note stored and
// relayed to the worker. Never marks the quest complete.
export const requestChanges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!.id;
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }

    if (quest.questGiverId !== me) {
      res.status(403).json({ error: 'Only the quest giver can request changes' });
      return;
    }
    if (quest.status !== QuestStatus.IN_REVIEW) {
      res.status(400).json({ error: 'No completion request is awaiting your review' });
      return;
    }

    const note = cleanString(req.body?.note);

    const updated = await prisma.quest.update({
      where: { id: quest.id },
      data: {
        status: QuestStatus.IN_PROGRESS,
        changeRequestCount: { increment: 1 },
        changeRequestNote: note,
      },
    });

    if (quest.assignedAdventurerId) {
      await createNotification({
        userId: quest.assignedAdventurerId,
        type: 'COMPLETION_CHANGES_REQUESTED',
        title: 'Changes requested',
        message: note
          ? `The client asked for changes on "${quest.title}": ${note}`
          : `The client asked for changes on "${quest.title}" before confirming completion.`,
      });

      const worker = await prisma.user.findUnique({
        where: { id: quest.assignedAdventurerId },
        select: { email: true },
      });
      if (worker?.email) {
        void sendEmail(emailTemplates.completionChangesRequested(worker.email, quest.title, note));
      }
    }

    res.json(updated);
  } catch (error) {
    console.error('requestChanges error:', error);
    res.status(500).json({ error: 'Failed to request changes' });
  }
};
