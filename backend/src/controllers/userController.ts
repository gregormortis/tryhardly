import { Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';

// GET /api/users/:username - Public profile
export const getUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        id: true, username: true, displayName: true, bio: true, avatarUrl: true,
        level: true, xp: true, adventurerClass: true, reputationScore: true,
        totalQuestsCompleted: true, verified: true, createdAt: true,
        questsGiven: { where: { status: 'COMPLETED' }, select: { id: true, title: true, difficulty: true }, take: 5 },
        questsCompleted: { where: { status: 'COMPLETED' }, select: { id: true, title: true, difficulty: true, reward: true }, take: 5 },
        guild: { select: { id: true, name: true, tag: true, badgeUrl: true } },
        achievements: { include: { achievement: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// GET /api/users/me - Current user full profile
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, username: true, email: true, displayName: true, bio: true, avatarUrl: true,
        level: true, xp: true, adventurerClass: true, role: true, reputationScore: true,
        totalQuestsCompleted: true, verified: true, createdAt: true,
        guild: { select: { id: true, name: true, tag: true } },
        achievements: { include: { achievement: true } },
      },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// PUT /api/users/me - Update current user
export const updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { displayName, bio, avatarUrl, adventurerClass } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { displayName, bio, avatarUrl, adventurerClass },
      select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, adventurerClass: true },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// GET /api/users/leaderboard
export const getLeaderboard = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { xp: 'desc' },
      take: 50,
      select: {
        id: true, username: true, displayName: true, avatarUrl: true,
        level: true, xp: true, adventurerClass: true, reputationScore: true,
        totalQuestsCompleted: true,
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
