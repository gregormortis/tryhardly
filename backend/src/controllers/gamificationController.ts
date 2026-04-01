import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import { getXPProgress, xpForLevel } from '../services/xpService';
import { getUserAchievements, getAchievementCatalog } from '../services/achievementService';
import { getReputationBreakdown } from '../services/reputationService';
import { getFullStats } from '../services/gamificationService';

// ─── GET /api/gamification/xp ────────────────────────────────────────────────
// Returns the authenticated user's XP progress.

export const getMyXP = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const progress = await getXPProgress(req.user!.id);
    res.json(progress);
  } catch (error) {
    console.error('getMyXP error:', error);
    res.status(500).json({ error: 'Failed to fetch XP progress' });
  }
};

// ─── GET /api/gamification/achievements ──────────────────────────────────────
// Returns the authenticated user's achievements (locked + unlocked).

export const getMyAchievements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const achievements = await getUserAchievements(req.user!.id);
    res.json({ achievements });
  } catch (error) {
    console.error('getMyAchievements error:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
};

// ─── GET /api/gamification/achievements/catalog ──────────────────────────────
// Returns the full achievement catalog (no auth required).

export const getAchievementsCatalog = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const catalog = getAchievementCatalog();
    res.json({ achievements: catalog, total: catalog.length });
  } catch (error) {
    console.error('getAchievementsCatalog error:', error);
    res.status(500).json({ error: 'Failed to fetch achievement catalog' });
  }
};

// ─── GET /api/gamification/leaderboard ───────────────────────────────────────
// Returns the top users by XP.

export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = '25', page = '1' } = req.query;
    const take = Math.min(100, Math.max(1, parseInt(limit as string) || 25));
    const skip = (Math.max(1, parseInt(page as string) || 1) - 1) * take;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: [{ xp: 'desc' }, { level: 'desc' }],
        take,
        skip,
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          level: true,
          xp: true,
          adventurerClass: true,
          reputationScore: true,
          totalQuestsCompleted: true,
        },
      }),
      prisma.user.count(),
    ]);

    // Add rank and XP progress to each entry
    const leaderboard = users.map((user, idx) => {
      const xpForCurrent = xpForLevel(user.level);
      const xpForNext = user.level >= 100 ? xpForCurrent : xpForLevel(user.level + 1);
      const xpIntoLevel = user.xp - xpForCurrent;
      const xpNeeded = xpForNext - xpForCurrent;

      return {
        rank: skip + idx + 1,
        ...user,
        xpProgress: {
          xpIntoLevel,
          xpNeeded,
          percentage: user.level >= 100 ? 100 : Math.floor((xpIntoLevel / xpNeeded) * 100),
        },
      };
    });

    res.json({ leaderboard, total, page: Math.max(1, parseInt(page as string) || 1), limit: take });
  } catch (error) {
    console.error('getLeaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};

// ─── GET /api/gamification/reputation/:userId ────────────────────────────────
// Returns reputation breakdown for a user.

export const getReputation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const breakdown = await getReputationBreakdown(userId);
    res.json(breakdown);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('getReputation error:', error);
    res.status(500).json({ error: 'Failed to fetch reputation' });
  }
};

// ─── GET /api/gamification/stats/:userId ─────────────────────────────────────
// Returns full gamification stats for a user.

export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const stats = await getFullStats(userId);
    res.json(stats);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('getStats error:', error);
    res.status(500).json({ error: 'Failed to fetch gamification stats' });
  }
};
