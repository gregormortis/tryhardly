import { prisma } from '../app';
import { awardXP, QUEST_XP_REWARDS } from './xpService';
import { checkAchievements } from './achievementService';
import { updateReputation } from './reputationService';

// ─── Orchestrator: Gamification Service ──────────────────────────────────────
// Central entry points for game events. Each method coordinates XP, achievements,
// stats, and reputation updates so callers don't need to wire everything together.

/**
 * Called when a quest is marked as completed.
 * - Increments the adventurer's totalQuestsCompleted
 * - Awards XP based on quest difficulty
 * - Checks for newly unlocked achievements
 * - Sends a level-up notification if applicable
 */
export async function onQuestCompleted(
  questId: string,
  adventurerId: string,
): Promise<{
  xpAwarded: number;
  leveledUp: boolean;
  newLevel: number;
  achievementsUnlocked: string[];
}> {
  // Fetch quest for difficulty
  const quest = await prisma.quest.findUniqueOrThrow({
    where: { id: questId },
    select: { difficulty: true, xpReward: true },
  });

  // Use the quest's own xpReward if set, otherwise fall back to difficulty table
  const xpAmount = quest.xpReward || QUEST_XP_REWARDS[quest.difficulty];

  // Increment stats
  await prisma.user.update({
    where: { id: adventurerId },
    data: { totalQuestsCompleted: { increment: 1 } },
  });

  // Award XP
  const xpResult = await awardXP(adventurerId, xpAmount, `Quest completed: ${questId}`);

  // Send level-up notification
  if (xpResult.leveledUp) {
    await prisma.notification.create({
      data: {
        userId: adventurerId,
        type: 'LEVEL_UP',
        title: `Level Up! You are now level ${xpResult.newLevel}`,
        message: `Congratulations! You've reached level ${xpResult.newLevel}.`,
      },
    });
  }

  // Check achievements
  const achievementsUnlocked = await checkAchievements(adventurerId, {
    type: 'QUEST_COMPLETED',
    questId,
  });

  return {
    xpAwarded: xpAmount,
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    achievementsUnlocked,
  };
}

/**
 * Called when a review is received for a completed quest.
 * - Updates the adventurer's reputation
 * - Checks for review-related achievements
 */
export async function onReviewReceived(
  userId: string,
  questId: string,
  rating: number,
): Promise<{
  reputationGained: number;
  achievementsUnlocked: string[];
}> {
  // Update reputation
  const repResult = await updateReputation(userId, questId, { rating });

  // Check achievements
  const achievementsUnlocked = await checkAchievements(userId, {
    type: 'REVIEW_RECEIVED',
    questId,
    rating,
  });

  return {
    reputationGained: repResult.reputationGained,
    achievementsUnlocked,
  };
}

/**
 * Called when a user posts a new quest.
 * - Increments questsPosted counter
 * - Checks for poster-related achievements (e.g. Mentor)
 */
export async function onQuestPosted(
  userId: string,
  questId: string,
): Promise<{
  achievementsUnlocked: string[];
}> {
  // Increment posts counter
  await prisma.user.update({
    where: { id: userId },
    data: { questsPosted: { increment: 1 } },
  });

  const achievementsUnlocked = await checkAchievements(userId, {
    type: 'QUEST_POSTED',
    questId,
  });

  return { achievementsUnlocked };
}

/**
 * Called when a user joins a guild.
 */
export async function onGuildJoined(
  userId: string,
  guildId: string,
): Promise<{
  achievementsUnlocked: string[];
}> {
  const achievementsUnlocked = await checkAchievements(userId, {
    type: 'GUILD_JOINED',
    guildId,
  });

  return { achievementsUnlocked };
}

/**
 * Called when a user creates a guild.
 */
export async function onGuildCreated(
  userId: string,
  guildId: string,
): Promise<{
  achievementsUnlocked: string[];
}> {
  const achievementsUnlocked = await checkAchievements(userId, {
    type: 'GUILD_CREATED',
    guildId,
  });

  return { achievementsUnlocked };
}

/**
 * Called when a user submits an application to a quest.
 */
export async function onApplicationSubmitted(
  userId: string,
  questId: string,
): Promise<{
  achievementsUnlocked: string[];
}> {
  const achievementsUnlocked = await checkAchievements(userId, {
    type: 'APPLICATION_SUBMITTED',
    questId,
  });

  return { achievementsUnlocked };
}

// ─── Stats Aggregation ──────────────────────────────────────────────────────

export interface GamificationStats {
  user: {
    id: string;
    username: string;
    level: number;
    xp: number;
    adventurerClass: string;
    reputationScore: number;
    totalQuestsCompleted: number;
    questsPosted: number;
  };
  xpProgress: {
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    xpIntoLevel: number;
    percentage: number;
  };
  reputationTier: { name: string; color: string };
  achievementCount: { unlocked: number; total: number };
}

/**
 * Get full gamification stats for a user (public profile view).
 */
export async function getFullStats(userId: string): Promise<GamificationStats> {
  const { getXPProgress } = await import('./xpService');
  const { getReputationTier } = await import('./reputationService');
  const { ACHIEVEMENT_CATALOG } = await import('./achievementService');

  const [user, xpProgress, achievementCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        level: true,
        xp: true,
        adventurerClass: true,
        reputationScore: true,
        totalQuestsCompleted: true,
        questsPosted: true,
      },
    }),
    getXPProgress(userId),
    prisma.userAchievement.count({ where: { userId } }),
  ]);

  const tier = getReputationTier(user.reputationScore);

  return {
    user,
    xpProgress: {
      xpForCurrentLevel: xpProgress.xpForCurrentLevel,
      xpForNextLevel: xpProgress.xpForNextLevel,
      xpIntoLevel: xpProgress.xpIntoLevel,
      percentage: xpProgress.percentage,
    },
    reputationTier: { name: tier.name, color: tier.color },
    achievementCount: {
      unlocked: achievementCount,
      total: ACHIEVEMENT_CATALOG.length,
    },
  };
}
