import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { QuestStatus } from '@prisma/client';

// GET /api/admin/stats - high-level platform counts
export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [users, quests, openQuests, completedQuests, applications] = await prisma.$transaction([
      prisma.user.count(),
      prisma.quest.count(),
      prisma.quest.count({ where: { status: QuestStatus.OPEN } }),
      prisma.quest.count({ where: { status: QuestStatus.COMPLETED } }),
      prisma.application.count(),
    ]);
    res.json({ users, quests, openQuests, completedQuests, applications });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// GET /api/admin/users - recent users
export const listUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const take = Math.min(parseInt((req.query.limit as string) || '50') || 50, 100);
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      select: {
        id: true, username: true, email: true, displayName: true, role: true,
        level: true, reputationScore: true, verified: true,
        totalQuestsPosted: true, totalQuestsCompleted: true, createdAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// GET /api/admin/quests - recent quests (any status)
export const listQuests = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const take = Math.min(parseInt((req.query.limit as string) || '50') || 50, 100);
    const quests = await prisma.quest.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        questGiver: { select: { id: true, username: true } },
        _count: { select: { applications: true } },
      },
    });
    res.json(quests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quests' });
  }
};

// PUT /api/admin/quests/:id/cancel - moderation: cancel a quest
export const cancelQuest = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const quest = await prisma.quest.findUnique({ where: { id: req.params.id } });
    if (!quest) { res.status(404).json({ error: 'Quest not found' }); return; }
    const updated = await prisma.quest.update({
      where: { id: req.params.id },
      data: { status: QuestStatus.CANCELLED },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel quest' });
  }
};

// PUT /api/admin/users/:id/verify - toggle a user's verified flag
export const setUserVerified = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { verified } = req.body as { verified?: boolean };
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { verified: verified === undefined ? !user.verified : !!verified },
      select: { id: true, username: true, verified: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
};
