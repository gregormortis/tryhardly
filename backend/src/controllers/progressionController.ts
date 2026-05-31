import { Request, Response } from 'express';
import { prisma } from '../app';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  getProgressionSummary,
  RANK_REQUIREMENTS,
  RANK_GATES,
} from '../services/progressionService';
import { SKILL_TIER_RULES } from '../services/skillService';
import { slugifySkill } from '../services/skillService';

// GET /api/progression/ranks  (public) — static rank ladder + skill-badge rules.
// Powers the public Ranks & Progression help page without any user context.
export const getRankCatalog = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      ranks: RANK_REQUIREMENTS,
      gates: RANK_GATES,
      skillTiers: SKILL_TIER_RULES,
    });
  } catch (error) {
    console.error('getRankCatalog error:', error);
    res.status(500).json({ error: 'Failed to fetch rank catalog' });
  }
};

// GET /api/progression/:userId  (public) — a worker's current rank, per-rank
// achieved/locked status, signals, and non-destructive demotion status.
export const getUserProgression = async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = await getProgressionSummary(req.params.userId);
    res.json(summary);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('getUserProgression error:', error);
    res.status(500).json({ error: 'Failed to fetch progression' });
  }
};

// PUT /api/users/me/favorite-skills  { skills: string[] }
// Lets a worker curate which skills they feature on their profile. This only
// controls display order/selection — badge tiers are always derived from real
// SkillRating data. Slugs are normalized and de-duplicated; capped at 6.
const MAX_FAVORITE_SKILLS = 6;

export const updateFavoriteSkills = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { skills } = req.body as { skills?: unknown };
    if (!Array.isArray(skills)) {
      res.status(400).json({ error: 'skills must be an array of skill names' });
      return;
    }

    // Normalize to slugs, de-dupe, drop blanks, cap length.
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const raw of skills) {
      if (typeof raw !== 'string') continue;
      const slug = slugifySkill(raw);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      cleaned.push(slug);
      if (cleaned.length >= MAX_FAVORITE_SKILLS) break;
    }

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: { favoriteSkills: cleaned },
      select: { id: true, favoriteSkills: true },
    });
    res.json(updated);
  } catch (error) {
    console.error('updateFavoriteSkills error:', error);
    res.status(500).json({ error: 'Failed to update favorite skills' });
  }
};
