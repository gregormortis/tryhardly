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
        businessName: true, serviceArea: true, yearsExperience: true, favoriteSkills: true,
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
        businessName: true, serviceArea: true, yearsExperience: true, favoriteSkills: true,
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
    const { displayName, bio, avatarUrl, adventurerClass, businessName, serviceArea, yearsExperience } =
      req.body as {
        displayName?: string;
        bio?: string;
        avatarUrl?: string;
        adventurerClass?: string;
        businessName?: string;
        serviceArea?: string;
        yearsExperience?: number | string | null;
      };

    // yearsExperience is optional; coerce to a non-negative int or clear it.
    let years: number | null | undefined;
    if (yearsExperience !== undefined) {
      if (yearsExperience === null || yearsExperience === '') {
        years = null;
      } else {
        const n = Number(yearsExperience);
        if (!Number.isFinite(n) || n < 0) {
          res.status(400).json({ error: 'yearsExperience must be a non-negative number' });
          return;
        }
        years = Math.floor(n);
      }
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        displayName,
        bio,
        avatarUrl,
        adventurerClass: adventurerClass as never,
        businessName,
        serviceArea,
        ...(years !== undefined ? { yearsExperience: years } : {}),
      },
      select: {
        id: true, username: true, displayName: true, bio: true, avatarUrl: true, adventurerClass: true,
        businessName: true, serviceArea: true, yearsExperience: true,
      },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// GET /api/users/leaderboard
export const getLeaderboard = async (_req: AuthRequest, res: Response): Promise<void> => {
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
