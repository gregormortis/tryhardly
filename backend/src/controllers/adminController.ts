import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { QuestStatus } from '@prisma/client';
import {
  getAchievementCatalog,
  adminAwardAchievement,
  adminRevokeAchievement,
} from '../services/achievementService';

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

// GET /api/admin/achievements/catalog - full catalog (with keys) for awarding
export const getAchievementCatalogForAdmin = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    res.json({ achievements: getAchievementCatalog() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch achievement catalog' });
  }
};

// POST /api/admin/users/:id/achievements  { key } - manually award an achievement
export const awardUserAchievement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { key } = req.body as { key?: string };
    if (!key || typeof key !== 'string') {
      res.status(400).json({ error: 'An achievement key is required' });
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }

    const awarded = await adminAwardAchievement(req.params.id, key);
    res.json({ awarded, alreadyHad: !awarded });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unknown achievement key')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('awardUserAchievement error:', error);
    res.status(500).json({ error: 'Failed to award achievement' });
  }
};

// DELETE /api/admin/users/:id/achievements/:key - revoke an awarded achievement
export const revokeUserAchievement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const removed = await adminRevokeAchievement(req.params.id, req.params.key);
    res.json({ revoked: removed });
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.startsWith('Unknown achievement key')) {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error('revokeUserAchievement error:', error);
    res.status(500).json({ error: 'Failed to revoke achievement' });
  }
};
