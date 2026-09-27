import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { createNotification } from '../services/notificationService';
import { sendEmail, emailTemplates } from '../services/mailerService';
import { containsContactInfo, CONTACT_INFO_VALIDATION_MESSAGE } from '../utils/contactDetection';

// A user may participate in a quest thread if they are the quest giver, the
// assigned adventurer, or have applied to the quest. Admins may participate in
// any quest thread (they can message anyone without needing to bid). Returns
// the quest if the user is allowed, otherwise null.
async function getAccessibleQuest(questId: string, userId: string, isAdmin = false) {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) return null;
  if (isAdmin) return quest;
  if (quest.questGiverId === userId) return quest;
  if (quest.assignedAdventurerId === userId) return quest;
  const application = await prisma.application.findFirst({
    where: { questId, adventurerId: userId },
  });
  if (application) return quest;
  return null;
}

// Whether two users already share a direct (non-quest) thread.
async function hasDirectThread(a: string, b: string) {
  const existing = await prisma.message.findFirst({
    where: {
      questId: null,
      OR: [
        { senderId: a, recipientId: b },
        { senderId: b, recipientId: a },
      ],
    },
    select: { id: true },
  });
  return !!existing;
}

// Shared validation for direct-message sends. Returns an error string when the
// send is not allowed, otherwise null.
async function validateDirectSend(me: string, isAdmin: boolean, recipientId?: string, content?: string) {
  if (!recipientId || !content || !content.trim()) return 'recipientId and content are required';
  if (recipientId === me) return 'Cannot message yourself';
  const recipient = await prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } });
  if (!recipient) return 'Recipient not found';
  // Admins may start a direct thread with anyone; everyone else may only reply
  // inside a direct thread an admin (or the other party) already started.
  if (!isAdmin && !(await hasDirectThread(me, recipientId))) {
    return 'No direct conversation with this user';
  }
  return null;
}

// GET /api/messages/quest/:questId/with/:userId
// Returns the conversation between the authenticated user and :userId for a quest.
export const getQuestThread = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questId, userId: otherId } = req.params;
    const me = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    const quest = await getAccessibleQuest(questId, me, isAdmin);
    if (!quest) { res.status(403).json({ error: 'No access to this quest thread' }); return; }

    const messages = await prisma.message.findMany({
      where: {
        questId,
        OR: [
          { senderId: me, recipientId: otherId },
          { senderId: otherId, recipientId: me },
        ],
      },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Mark messages addressed to me in this thread as read.
    await prisma.message.updateMany({
      where: { questId, senderId: otherId, recipientId: me, read: false },
      data: { read: true },
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
};

// POST /api/messages/quest/:questId
// Body: { recipientId, content }
export const sendQuestMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questId } = req.params;
    const { recipientId, content } = req.body as { recipientId?: string; content?: string };
    const me = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    if (!recipientId || !content || !content.trim()) {
      res.status(400).json({ error: 'recipientId and content are required' });
      return;
    }
    if (recipientId === me) { res.status(400).json({ error: 'Cannot message yourself' }); return; }

    const quest = await getAccessibleQuest(questId, me, isAdmin);
    if (!quest) { res.status(403).json({ error: 'No access to this quest thread' }); return; }

    if (!isAdmin) {
      // The recipient must also be a participant in the quest.
      const recipientQuest = await getAccessibleQuest(questId, recipientId);
      if (!recipientQuest) { res.status(400).json({ error: 'Recipient is not part of this quest' }); return; }

      // Platform-safe messaging (pre-acceptance only). While the quest has no
      // assigned worker, the parties are still bidding/negotiating, so we keep
      // contact details and off-platform payment talk on TryHardly. Once a bid is
      // accepted (assignedAdventurerId set) the worker and poster need to
      // coordinate logistics freely, so we stop scanning then. Admins are
      // exempt: they are the platform, not a party routing around it.
      if (!quest.assignedAdventurerId && containsContactInfo(content)) {
        res.status(400).json({ error: CONTACT_INFO_VALIDATION_MESSAGE });
        return;
      }
    }

    const message = await prisma.message.create({
      data: { senderId: me, recipientId, questId, content: content.trim() },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });

    await createNotification({
      userId: recipientId,
      type: 'NEW_MESSAGE',
      title: 'New message',
      message: `${req.user!.username} sent you a message about "${quest.title}".`,
      linkUrl: `/job/${questId}`,
    });

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true },
    });
    if (recipient?.email) {
      void sendEmail(emailTemplates.newMessage(recipient.email, req.user!.username, quest.title));
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// POST /api/messages/direct
// Body: { recipientId, content }
// Admin-initiated direct messages (no quest required). Admins may message
// anyone; other users may only reply inside a direct thread that already
// exists, so this never becomes an open DM system between strangers.
export const sendDirectMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { recipientId, content } = req.body as { recipientId?: string; content?: string };
    const me = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    const error = await validateDirectSend(me, isAdmin, recipientId, content);
    if (error) {
      res.status(error === 'No direct conversation with this user' ? 403 : 400).json({ error });
      return;
    }

    const message = await prisma.message.create({
      data: { senderId: me, recipientId: recipientId!, questId: null, content: content!.trim() },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });

    await createNotification({
      userId: recipientId!,
      type: 'NEW_MESSAGE',
      title: 'New message',
      message: `${req.user!.username} sent you a direct message.`,
      linkUrl: '/messages',
    });

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId! },
      select: { email: true },
    });
    if (recipient?.email) {
      void sendEmail(emailTemplates.newDirectMessage(recipient.email, req.user!.username));
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// GET /api/messages/direct/with/:userId
// Returns the direct (non-quest) conversation between the authenticated user
// and :userId. Admins may open a thread with anyone; others need an existing
// thread.
export const getDirectThread = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const otherId = req.params.userId;
    const me = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    if (otherId === me) { res.status(400).json({ error: 'Cannot message yourself' }); return; }
    if (!isAdmin && !(await hasDirectThread(me, otherId))) {
      res.status(403).json({ error: 'No direct conversation with this user' });
      return;
    }

    const messages = await prisma.message.findMany({
      where: {
        questId: null,
        OR: [
          { senderId: me, recipientId: otherId },
          { senderId: otherId, recipientId: me },
        ],
      },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Mark messages addressed to me in this thread as read.
    await prisma.message.updateMany({
      where: { questId: null, senderId: otherId, recipientId: me, read: false },
      data: { read: true },
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch thread' });
  }
};

// GET /api/messages/threads
// Returns a summary of the authenticated user's threads (latest message per
// quest+counterparty, plus direct non-quest threads).
export const getMyThreads = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!.id;
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: me }, { recipientId: me }],
      },
      include: {
        sender: { select: { id: true, username: true, avatarUrl: true } },
        quest: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Collapse to one entry per (questId, counterparty), keeping the latest message.
    const seen = new Set<string>();
    const threads: Array<{
      questId: string | null;
      questTitle: string;
      counterpartyId: string;
      lastMessage: string;
      lastAt: Date;
      unread: boolean;
    }> = [];
    const directCounterpartyIds = new Set<string>();
    for (const m of messages) {
      const counterpartyId = m.senderId === me ? m.recipientId : m.senderId;
      const key = m.questId ? `${m.questId}:${counterpartyId}` : `direct:${counterpartyId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!m.questId) directCounterpartyIds.add(counterpartyId);
      threads.push({
        questId: m.questId,
        questTitle: m.quest?.title ?? 'Quest',
        counterpartyId,
        lastMessage: m.content,
        lastAt: m.createdAt,
        unread: m.recipientId === me && !m.read,
      });
    }

    // Direct threads have no quest title; label them with the counterparty's
    // username so the inbox row reads like a conversation, not a job.
    if (directCounterpartyIds.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: [...directCounterpartyIds] } },
        select: { id: true, username: true },
      });
      const names = new Map<string, string>(
        users.map((u): [string, string] => [u.id, u.username]),
      );
      for (const t of threads) {
        if (t.questId === null) {
          t.questTitle = names.get(t.counterpartyId) ?? 'Direct message';
        }
      }
    }

    res.json(threads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
};
