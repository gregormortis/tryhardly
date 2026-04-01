import { prisma } from '../app';
import { QuestDifficulty } from '@prisma/client';

// ─── Difficulty Multipliers ──────────────────────────────────────────────────

export const DIFFICULTY_MULTIPLIER: Record<QuestDifficulty, number> = {
  NOVICE: 1,
  APPRENTICE: 2,
  JOURNEYMAN: 3,
  EXPERT: 4,
  MASTER: 5,
  LEGENDARY: 6,
};

// ─── Reputation Tiers ────────────────────────────────────────────────────────

export interface ReputationTier {
  name: string;
  minScore: number;
  maxScore: number | null;
  color: string;
}

const REPUTATION_TIERS: ReputationTier[] = [
  { name: 'Untrusted',  minScore: 0,     maxScore: 99,    color: '#6b7280' },
  { name: 'Newcomer',   minScore: 100,   maxScore: 499,   color: '#22c55e' },
  { name: 'Reliable',   minScore: 500,   maxScore: 1499,  color: '#3b82f6' },
  { name: 'Trusted',    minScore: 1500,  maxScore: 4999,  color: '#a855f7' },
  { name: 'Elite',      minScore: 5000,  maxScore: 14999, color: '#f59e0b' },
  { name: 'Legendary',  minScore: 15000, maxScore: null,  color: '#ef4444' },
];

/**
 * Get the reputation tier for a given score.
 */
export function getReputationTier(score: number): ReputationTier {
  for (let i = REPUTATION_TIERS.length - 1; i >= 0; i--) {
    if (score >= REPUTATION_TIERS[i].minScore) return REPUTATION_TIERS[i];
  }
  return REPUTATION_TIERS[0];
}

/**
 * Get all tier definitions (for display).
 */
export function getAllTiers(): ReputationTier[] {
  return REPUTATION_TIERS;
}

// ─── Reputation Calculation ──────────────────────────────────────────────────

export interface ReputationUpdate {
  reputationGained: number;
  newTotal: number;
  tier: ReputationTier;
  breakdown: {
    baseRep: number;
    speedBonus: number;
    latePenalty: number;
  };
}

/**
 * Update a user's reputation after a review is received on a completed quest.
 *
 * Formula:
 *   baseRep = rating * difficultyMultiplier
 *   speedBonus = +25% if completed before deadline
 *   latePenalty = -25% if completed after deadline
 */
export async function updateReputation(
  userId: string,
  questId: string,
  review: { rating: number },
): Promise<ReputationUpdate> {
  const quest = await prisma.quest.findUniqueOrThrow({
    where: { id: questId },
    select: { difficulty: true, deadline: true, completedAt: true },
  });

  const multiplier = DIFFICULTY_MULTIPLIER[quest.difficulty];
  const baseRep = review.rating * multiplier;

  let speedBonus = 0;
  let latePenalty = 0;

  if (quest.deadline && quest.completedAt) {
    if (quest.completedAt <= quest.deadline) {
      // Early / on time — 25% bonus
      speedBonus = Math.floor(baseRep * 0.25);
    } else {
      // Late — 25% penalty
      latePenalty = Math.floor(baseRep * 0.25);
    }
  }

  const reputationGained = Math.max(0, baseRep + speedBonus - latePenalty);

  const user = await prisma.user.update({
    where: { id: userId },
    data: { reputationScore: { increment: reputationGained } },
    select: { reputationScore: true },
  });

  return {
    reputationGained,
    newTotal: user.reputationScore,
    tier: getReputationTier(user.reputationScore),
    breakdown: { baseRep, speedBonus, latePenalty },
  };
}

// ─── Query Helpers ───────────────────────────────────────────────────────────

export interface ReputationBreakdown {
  score: number;
  tier: ReputationTier;
  allTiers: ReputationTier[];
  recentReviews: {
    questId: string;
    questTitle: string;
    rating: number;
    difficulty: QuestDifficulty;
    createdAt: Date;
  }[];
}

/**
 * Get a comprehensive reputation breakdown for a user.
 */
export async function getReputationBreakdown(userId: string): Promise<ReputationBreakdown> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { reputationScore: true },
  });

  // Get recent reviews on quests this user completed
  const recentReviews = await prisma.review.findMany({
    where: { quest: { assignedAdventurerId: userId } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      rating: true,
      createdAt: true,
      quest: { select: { id: true, title: true, difficulty: true } },
    },
  });

  return {
    score: user.reputationScore,
    tier: getReputationTier(user.reputationScore),
    allTiers: REPUTATION_TIERS,
    recentReviews: recentReviews.map((r) => ({
      questId: r.quest.id,
      questTitle: r.quest.title,
      rating: r.rating,
      difficulty: r.quest.difficulty,
      createdAt: r.createdAt,
    })),
  };
}
