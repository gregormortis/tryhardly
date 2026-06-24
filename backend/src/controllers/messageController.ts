import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { createNotification } from '../services/notificationService';
import { sendEmail, emailTemplates } from '../services/mailerService';
import { containsContactInfo, CONTACT_INFO_VALIDATION_MESSAGE } from '../utils/contactDetection';

// A user may participate in a quest thread if they are the quest giver, the
// assigned adventurer, or have applied to the quest. Returns the quest if the
// user is allowed, otherwise null.
async function getAccessibleQuest(questId: string, userId: string) {
  const quest = await prisma.quest.findUnique({ where: { id: questId } });
  if (!quest) return null;
  if (quest.questGiverId === userId) return quest;
  if (quest.assignedAdventurerId === userId) return quest;
  const application = await prisma.application.findFirst({
    where: { questId, adventurerId: userId },
  });
  if (application) return quest;
  return null;
}

// GET /api/messages/quest/:questId/with/:userId
// Returns the conversation between the authenticated user and :userId for a quest.
export const getQuestThread = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { questId, userId: otherId } = req.params;
    const me = req.user!.id;

    const quest = await getAccessibleQuest(questId, me);
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

    if (!recipientId || !content || !content.trim()) {
      res.status(400).json({ error: 'recipientId and content are required' });
      return;
    }
    if (recipientId === me) { res.status(400).json({ error: 'Cannot message yourself' }); return; }

    const quest = await getAccessibleQuest(questId, me);
    if (!quest) { res.status(403).json({ error: 'No access to this quest thread' }); return; }

    // The recipient must also be a participant in the quest.
    const recipientQuest = await getAccessibleQuest(questId, recipientId);
    if (!recipientQuest) { res.status(400).json({ error: 'Recipient is not part of this quest' }); return; }

    // Platform-safe messaging (pre-acceptance only). While the quest has no
    // assigned worker, the parties are still bidding/negotiating, so we keep
    // contact details and off-platform payment talk on TryHardly. Once a bid is
    // accepted (assignedAdventurerId set) the worker and poster need to
    // coordinate logistics freely, so we stop scanning then.
    if (!quest.assignedAdventurerId && containsContactInfo(content)) {
      res.status(400).json({ error: CONTACT_INFO_VALIDATION_MESSAGE });
      return;
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

// GET /api/messages/threads
// Returns a summary of the authenticated user's quest threads (latest message per quest+counterparty).
export const getMyThreads = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const me = req.user!.id;
    const messages = await prisma.message.findMany({
      where: {
        questId: { not: null },
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
      questId: string;
      questTitle: string;
      counterpartyId: string;
      lastMessage: string;
      lastAt: Date;
      unread: boolean;
    }> = [];
    for (const m of messages) {
      const counterpartyId = m.senderId === me ? m.recipientId : m.senderId;
      const key = `${m.questId}:${counterpartyId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      threads.push({
        questId: m.questId as string,
        questTitle: m.quest?.title ?? 'Quest',
        counterpartyId,
        lastMessage: m.content,
        lastAt: m.createdAt,
        unread: m.recipientId === me && !m.read,
      });
    }

    res.json(threads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
};
