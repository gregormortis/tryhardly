import { prisma } from '../app';
import { QuestDifficulty } from '@prisma/client';

// ─── XP Table ────────────────────────────────────────────────────────────────
// Formula: xpForLevel(n) = Math.floor(100 * n^1.5)
// Level 1 = 0 (starting point), Level 2 = 283, Level 10 = 3162, etc.

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function getLevelForXP(totalXP: number): number {
  let level = 1;
  while (level < 100 && xpForLevel(level + 1) <= totalXP) {
    level++;
  }
  return level;
}

// ─── Quest XP Rewards ────────────────────────────────────────────────────────

export const QUEST_XP_REWARDS: Record<QuestDifficulty, number> = {
  NOVICE: 50,
  APPRENTICE: 100,
  JOURNEYMAN: 250,
  EXPERT: 500,
  MASTER: 1000,
  LEGENDARY: 2500,
};

// ─── Difficulty ordering (for comparison) ────────────────────────────────────

export const DIFFICULTY_ORDER: Record<QuestDifficulty, number> = {
  NOVICE: 0,
  APPRENTICE: 1,
  JOURNEYMAN: 2,
  EXPERT: 3,
  MASTER: 4,
  LEGENDARY: 5,
};

// ─── Public API ──────────────────────────────────────────────────────────────

export interface AwardXPResult {
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
  levelsGained: number;
}

/**
 * Award XP to a user, handle level-ups, and return the result.
 * `reason` is stored for audit/logging but not persisted in a separate table
 * (see GAMIFICATION_SCHEMA_ADDITIONS.md for optional XP ledger).
 */
export async function awardXP(
  userId: string,
  amount: number,
  _reason: string,
): Promise<AwardXPResult> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const oldLevel = user.level;
  const newXP = user.xp + amount;
  const newLevel = getLevelForXP(newXP);
  const leveledUp = newLevel > oldLevel;

  await prisma.user.update({
    where: { id: userId },
    data: { xp: newXP, level: newLevel },
  });

  return {
    newXP,
    newLevel,
    leveledUp,
    levelsGained: newLevel - oldLevel,
  };
}

export interface XPProgress {
  level: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  xpIntoLevel: number;
  xpNeededForNext: number;
  percentage: number;
}

/**
 * Get a user's current XP progress including percentage toward next level.
 */
export async function getXPProgress(userId: string): Promise<XPProgress> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { level: true, xp: true },
  });

  const { level, xp } = user;
  const xpForCurrentLevel = xpForLevel(level);
  const xpForNextLevel = level >= 100 ? xpForCurrentLevel : xpForLevel(level + 1);
  const xpIntoLevel = xp - xpForCurrentLevel;
  const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
  const percentage =
    level >= 100 ? 100 : Math.min(100, Math.floor((xpIntoLevel / xpNeededForNext) * 100));

  return {
    level,
    currentXP: xp,
    xpForCurrentLevel,
    xpForNextLevel,
    xpIntoLevel,
    xpNeededForNext,
    percentage,
  };
}
