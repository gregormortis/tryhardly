import { prisma } from '../app';

// ─── Achievement Catalog ─────────────────────────────────────────────────────

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  /** Which event types can trigger this achievement */
  triggers: AchievementEvent['type'][];
}

export const ACHIEVEMENT_CATALOG: AchievementDef[] = [
  // Quest completion milestones
  { key: 'FIRST_BLOOD',      name: 'First Blood',       description: 'Complete your first quest',                          icon: '⚔️',  xpReward: 50,   triggers: ['QUEST_COMPLETED'] },
  { key: 'QUEST_MASTER',     name: 'Quest Master',       description: 'Complete 10 quests',                                icon: '🗡️',  xpReward: 200,  triggers: ['QUEST_COMPLETED'] },
  { key: 'LEGENDARY_HERO',   name: 'Legendary Hero',     description: 'Complete 50 quests',                                icon: '🏆',  xpReward: 1000, triggers: ['QUEST_COMPLETED'] },

  // Guild
  { key: 'GUILD_FOUNDER',    name: 'Guild Founder',      description: 'Create a guild',                                   icon: '🏰',  xpReward: 150,  triggers: ['GUILD_CREATED'] },
  { key: 'SOCIAL_BUTTERFLY', name: 'Social Butterfly',   description: 'Join a guild',                                     icon: '🦋',  xpReward: 75,   triggers: ['GUILD_JOINED'] },
  { key: 'TEAM_PLAYER',      name: 'Team Player',        description: 'Complete 5 quests while in a guild',               icon: '🤝',  xpReward: 300,  triggers: ['QUEST_COMPLETED'] },

  // Reviews & reputation
  { key: 'FIVE_STAR',        name: 'Five Star',          description: 'Receive a 5-star review',                           icon: '⭐',  xpReward: 100,  triggers: ['REVIEW_RECEIVED'] },
  { key: 'PERFECTIONIST',    name: 'Perfectionist',      description: 'Receive 5-star reviews on 5 completed quests',     icon: '💎',  xpReward: 500,  triggers: ['REVIEW_RECEIVED'] },

  // Earnings
  { key: 'GOLD_RUSH',        name: 'Gold Rush',          description: 'Earn $1,000+ from completed quests',               icon: '💰',  xpReward: 200,  triggers: ['QUEST_COMPLETED'] },
  { key: 'WEALTHY',          name: 'Wealthy',            description: 'Earn $10,000+ from completed quests',              icon: '👑',  xpReward: 750,  triggers: ['QUEST_COMPLETED'] },

  // Speed
  { key: 'SPEED_RUNNER',     name: 'Speed Runner',       description: 'Complete a quest before its deadline',              icon: '⚡',  xpReward: 100,  triggers: ['QUEST_COMPLETED'] },
  { key: 'EARLY_BIRD',       name: 'Early Bird',         description: 'Apply to a quest within 1 hour of posting',        icon: '🐦',  xpReward: 50,   triggers: ['APPLICATION_SUBMITTED'] },

  // Quest giving
  { key: 'MENTOR',           name: 'Mentor',             description: 'Post 10 quests as a quest giver',                  icon: '📜',  xpReward: 250,  triggers: ['QUEST_POSTED'] },

  // Level milestones
  { key: 'RISING_STAR',      name: 'Rising Star',        description: 'Reach level 10',                                   icon: '🌟',  xpReward: 100,  triggers: ['QUEST_COMPLETED', 'REVIEW_RECEIVED'] },
  { key: 'VETERAN',          name: 'Veteran',            description: 'Reach level 25',                                   icon: '🎖️',  xpReward: 300,  triggers: ['QUEST_COMPLETED', 'REVIEW_RECEIVED'] },
  { key: 'LEGEND',           name: 'Legend',             description: 'Reach level 50',                                   icon: '🐉',  xpReward: 1000, triggers: ['QUEST_COMPLETED', 'REVIEW_RECEIVED'] },

  // Category diversity
  { key: 'JACK_OF_ALL_TRADES', name: 'Jack of All Trades', description: 'Complete quests in 3+ different categories',     icon: '🃏',  xpReward: 200,  triggers: ['QUEST_COMPLETED'] },
  { key: 'SPECIALIST',         name: 'Specialist',         description: 'Complete 10 quests in the same category',        icon: '🔬',  xpReward: 300,  triggers: ['QUEST_COMPLETED'] },

  // Streaks & overachievement
  { key: 'STREAK',           name: 'Streak',             description: 'Complete 5 quests in a row without cancellation',   icon: '🔥',  xpReward: 250,  triggers: ['QUEST_COMPLETED'] },
  { key: 'OVERACHIEVER',     name: 'Overachiever',       description: 'Complete a quest rated 2+ difficulty above your comfort level', icon: '💪', xpReward: 300, triggers: ['QUEST_COMPLETED'] },
];

// Lookup helpers
// Achievement catalog indexed by key for lookups
// const CATALOG_BY_KEY = new Map(ACHIEVEMENT_CATALOG.map((a) => [a.key, a]));
const CATALOG_BY_TRIGGER = new Map<string, AchievementDef[]>();
for (const a of ACHIEVEMENT_CATALOG) {
  for (const t of a.triggers) {
    const list = CATALOG_BY_TRIGGER.get(t) ?? [];
    list.push(a);
    CATALOG_BY_TRIGGER.set(t, list);
  }
}

// ─── Event Types ─────────────────────────────────────────────────────────────

export type AchievementEvent =
  | { type: 'QUEST_COMPLETED'; questId: string }
  | { type: 'REVIEW_RECEIVED'; questId: string; rating: number }
  | { type: 'QUEST_POSTED'; questId: string }
  | { type: 'GUILD_JOINED'; guildId: string }
  | { type: 'GUILD_CREATED'; guildId: string }
  | { type: 'APPLICATION_SUBMITTED'; questId: string };

// ─── Achievement Checking ────────────────────────────────────────────────────

/**
 * Check and award any newly unlocked achievements for a user after an event.
 * Only checks achievements relevant to the event type and not already unlocked.
 * Returns the list of newly awarded achievement keys.
 */
export async function checkAchievements(
  userId: string,
  event: AchievementEvent,
): Promise<string[]> {
  const candidateDefs = CATALOG_BY_TRIGGER.get(event.type) ?? [];
  if (candidateDefs.length === 0) return [];

  // Fetch which of these the user already has
  const alreadyUnlocked = await prisma.userAchievement.findMany({
    where: {
      userId,
      achievement: { name: { in: candidateDefs.map((d) => d.name) } },
    },
    select: { achievement: { select: { name: true } } },
  });
  const unlockedNames = new Set(alreadyUnlocked.map((ua) => ua.achievement.name));

  const toCheck = candidateDefs.filter((d) => !unlockedNames.has(d.name));
  if (toCheck.length === 0) return [];

  const awarded: string[] = [];

  for (const def of toCheck) {
    const met = await isConditionMet(userId, def.key, event);
    if (met) {
      await awardAchievement(userId, def);
      awarded.push(def.key);
    }
  }

  return awarded;
}

/**
 * Check a specific achievement condition.
 */
async function isConditionMet(
  userId: string,
  key: string,
  event: AchievementEvent,
): Promise<boolean> {
  switch (key) {
    // ── Quest completion milestones ──
    case 'FIRST_BLOOD': {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { totalQuestsCompleted: true } });
      return user.totalQuestsCompleted >= 1;
    }
    case 'QUEST_MASTER': {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { totalQuestsCompleted: true } });
      return user.totalQuestsCompleted >= 10;
    }
    case 'LEGENDARY_HERO': {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { totalQuestsCompleted: true } });
      return user.totalQuestsCompleted >= 50;
    }

    // ── Guild ──
    case 'GUILD_FOUNDER':
      return event.type === 'GUILD_CREATED';
    case 'SOCIAL_BUTTERFLY':
      return event.type === 'GUILD_JOINED';
    case 'TEAM_PLAYER': {
      // Count completed quests where the user was in a guild at completion time.
      // Simplified: user is currently in a guild and has completed >= 5 quests.
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { guildId: true, totalQuestsCompleted: true },
      });
      return user.guildId != null && user.totalQuestsCompleted >= 5;
    }

    // ── Reviews ──
    case 'FIVE_STAR': {
      if (event.type !== 'REVIEW_RECEIVED') return false;
      return event.rating === 5;
    }
    case 'PERFECTIONIST': {
      // 5 completed quests where the user received a 5-star review
      const count = await prisma.review.count({
        where: {
          rating: 5,
          quest: { assignedAdventurerId: userId, status: 'COMPLETED' },
        },
      });
      return count >= 5;
    }

    // ── Earnings ──
    case 'GOLD_RUSH': {
      const result = await prisma.quest.aggregate({
        where: { assignedAdventurerId: userId, status: 'COMPLETED' },
        _sum: { reward: true },
      });
      return Number(result._sum.reward ?? 0) >= 1000;
    }
    case 'WEALTHY': {
      const result = await prisma.quest.aggregate({
        where: { assignedAdventurerId: userId, status: 'COMPLETED' },
        _sum: { reward: true },
      });
      return Number(result._sum.reward ?? 0) >= 10000;
    }

    // ── Speed ──
    case 'SPEED_RUNNER': {
      if (event.type !== 'QUEST_COMPLETED') return false;
      const quest = await prisma.quest.findUnique({
        where: { id: event.questId },
        select: { deadline: true, completedAt: true },
      });
      if (!quest?.deadline || !quest?.completedAt) return false;
      return quest.completedAt <= quest.deadline;
    }
    case 'EARLY_BIRD': {
      if (event.type !== 'APPLICATION_SUBMITTED') return false;
      const application = await prisma.application.findFirst({
        where: { questId: event.questId, adventurerId: userId },
        select: { appliedAt: true, quest: { select: { createdAt: true } } },
        orderBy: { appliedAt: 'desc' },
      });
      if (!application) return false;
      const diff = application.appliedAt.getTime() - application.quest.createdAt.getTime();
      return diff <= 60 * 60 * 1000; // 1 hour
    }

    // ── Quest giving ──
    case 'MENTOR': {
      const count = await prisma.quest.count({ where: { questGiverId: userId } });
      return count >= 10;
    }

    // ── Level milestones ──
    case 'RISING_STAR': {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { level: true } });
      return user.level >= 10;
    }
    case 'VETERAN': {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { level: true } });
      return user.level >= 25;
    }
    case 'LEGEND': {
      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { level: true } });
      return user.level >= 50;
    }

    // ── Category diversity ──
    case 'JACK_OF_ALL_TRADES': {
      const categories = await prisma.quest.findMany({
        where: { assignedAdventurerId: userId, status: 'COMPLETED' },
        select: { category: true },
        distinct: ['category'],
      });
      return categories.length >= 3;
    }
    case 'SPECIALIST': {
      const categories = await prisma.quest.groupBy({
        by: ['category'],
        where: { assignedAdventurerId: userId, status: 'COMPLETED' },
        _count: true,
      });
      return categories.some((c) => c._count >= 10);
    }

    // ── Streaks ──
    case 'STREAK': {
      // Last 5 quests assigned to user, ordered by completion, none cancelled
      const recentQuests = await prisma.quest.findMany({
        where: {
          assignedAdventurerId: userId,
          status: { in: ['COMPLETED', 'CANCELLED'] },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: { status: true },
      });
      return recentQuests.length >= 5 && recentQuests.every((q) => q.status === 'COMPLETED');
    }

    // ── Overachiever ──
    case 'OVERACHIEVER': {
      if (event.type !== 'QUEST_COMPLETED') return false;
      const DIFFICULTY_ORDER: Record<string, number> = {
        NOVICE: 0, APPRENTICE: 1, JOURNEYMAN: 2, EXPERT: 3, MASTER: 4, LEGENDARY: 5,
      };
      const quest = await prisma.quest.findUnique({
        where: { id: event.questId },
        select: { difficulty: true },
      });
      if (!quest) return false;
      // "Comfort level" = difficulty of the majority of completed quests (mode)
      const completedQuests = await prisma.quest.findMany({
        where: { assignedAdventurerId: userId, status: 'COMPLETED' },
        select: { difficulty: true },
      });
      if (completedQuests.length <= 1) {
        // First quest — if it's EXPERT+ it counts (comfort defaults to NOVICE)
        return DIFFICULTY_ORDER[quest.difficulty] >= 2;
      }
      // Calculate mode difficulty
      const counts: Record<string, number> = {};
      for (const q of completedQuests) {
        counts[q.difficulty] = (counts[q.difficulty] ?? 0) + 1;
      }
      const comfortDifficulty = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      return DIFFICULTY_ORDER[quest.difficulty] - DIFFICULTY_ORDER[comfortDifficulty] >= 2;
    }

    default:
      return false;
  }
}

/**
 * Award a single achievement: upsert the Achievement record, create UserAchievement,
 * and send a notification.
 */
async function awardAchievement(userId: string, def: AchievementDef): Promise<void> {
  // Ensure the Achievement row exists (seed-safe upsert)
  const achievement = await prisma.achievement.upsert({
    where: { name: def.name },
    update: {},
    create: {
      name: def.name,
      description: def.description,
      icon: def.icon,
      xpReward: def.xpReward,
    },
  });

  // Award to user (ignore if already exists via unique constraint)
  try {
    await prisma.userAchievement.create({
      data: { userId, achievementId: achievement.id },
    });
  } catch {
    // Unique constraint violation — already awarded
    return;
  }

  // Send notification
  await prisma.notification.create({
    data: {
      userId,
      type: 'ACHIEVEMENT_UNLOCKED',
      title: `Achievement Unlocked: ${def.name}`,
      message: def.description,
    },
  });

  // Award bonus XP for the achievement (import at runtime to avoid circular)
  const { awardXP } = await import('./xpService');
  await awardXP(userId, def.xpReward, `Achievement: ${def.name}`);
}

// ─── Query Helpers ───────────────────────────────────────────────────────────

export interface UserAchievementStatus {
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt: Date | null;
}

/**
 * Get all achievements with locked/unlocked status for a user.
 */
export async function getUserAchievements(userId: string): Promise<UserAchievementStatus[]> {
  const unlocked = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
  });

  const unlockedMap = new Map(
    unlocked.map((ua) => [ua.achievement.name, ua.unlockedAt]),
  );

  return ACHIEVEMENT_CATALOG.map((def) => ({
    key: def.key,
    name: def.name,
    description: def.description,
    icon: def.icon,
    xpReward: def.xpReward,
    unlocked: unlockedMap.has(def.name),
    unlockedAt: unlockedMap.get(def.name) ?? null,
  }));
}

/**
 * Return just the catalog (no user context).
 */
export function getAchievementCatalog() {
  return ACHIEVEMENT_CATALOG.map((def) => ({
    key: def.key,
    name: def.name,
    description: def.description,
    icon: def.icon,
    xpReward: def.xpReward,
  }));
}
