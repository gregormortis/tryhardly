import { prisma } from '../app';
import { QuestDifficulty } from '@prisma/client';

// ─── XP Table ────────────────────────────────────────────────────────────────
// A deliberately grindy, trade/union-inspired curve: reaching the top is a
// multi-year commitment, not a few-week sprint. A single power curve drifted too
// far from the intended milestones, so the curve is pinned to named anchor
// levels and linearly interpolated between them. This keeps every milestone
// exact and the curve monotonic, while staying trivial to reason about and test.
//
// Anchors (total cumulative XP to *reach* that level):
//   L10 ≈ 8k · L20 ≈ 30k · L35 ≈ 90k · L50 ≈ 180k · L65 ≈ 325k ·
//   L80 ≈ 550k · L95 ≈ 900k · L100 ≈ 1.1M
//
// The early anchors (L2/L5) keep the first few levels reachable so a new worker
// sees movement, before the climb steepens sharply.
export const XP_LEVEL_ANCHORS: ReadonlyArray<readonly [level: number, xp: number]> = [
  [1, 0],
  [2, 300],
  [5, 2_500],
  [10, 8_000],
  [20, 30_000],
  [35, 90_000],
  [50, 180_000],
  [65, 325_000],
  [80, 550_000],
  [95, 900_000],
  [100, 1_100_000],
] as const;

export const MAX_LEVEL = 100;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level >= MAX_LEVEL) return XP_LEVEL_ANCHORS[XP_LEVEL_ANCHORS.length - 1][1];

  // Find the bracketing anchor pair and linearly interpolate between them.
  let lo = XP_LEVEL_ANCHORS[0];
  let hi = XP_LEVEL_ANCHORS[XP_LEVEL_ANCHORS.length - 1];
  for (let i = 0; i < XP_LEVEL_ANCHORS.length - 1; i++) {
    if (level >= XP_LEVEL_ANCHORS[i][0] && level <= XP_LEVEL_ANCHORS[i + 1][0]) {
      lo = XP_LEVEL_ANCHORS[i];
      hi = XP_LEVEL_ANCHORS[i + 1];
      break;
    }
  }
  const [l0, x0] = lo;
  const [l1, x1] = hi;
  const t = (level - l0) / (l1 - l0);
  return Math.round(x0 + (x1 - x0) * t);
}

export function getLevelForXP(totalXP: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= totalXP) {
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
  const xpForNextLevel = level >= MAX_LEVEL ? xpForCurrentLevel : xpForLevel(level + 1);
  const xpIntoLevel = xp - xpForCurrentLevel;
  const xpNeededForNext = xpForNextLevel - xpForCurrentLevel;
  const percentage =
    level >= MAX_LEVEL ? 100 : Math.min(100, Math.floor((xpIntoLevel / xpNeededForNext) * 100));

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
