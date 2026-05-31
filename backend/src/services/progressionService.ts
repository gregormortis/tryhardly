import { prisma } from '../app';
import { getLevelForXP } from './xpService';

// ─── Worker Progression Model ─────────────────────────────────────────────────
// A gamer-grind + trade-union inspired rank ladder. Ranks reward TRUST and
// CRAFT, not a lower marketplace fee (the fee is a flat 12% at every rank — see
// the public pricing page). Higher ranks unlock visibility, guild leadership
// perks, and client confidence.
//
// Two design choices keep this honest:
//   1. XP is deliberately NOT dollar-weighted. Cash earned contributes, but it
//      is capped per job so a few big jobs can't outrank consistent quality.
//      Rating quality, on-time delivery, reviews, verified credentials, and
//      guild contribution all feed XP.
//   2. Promotion to Expert/Legendary is GATED on guild participation/leadership
//      and rating quality, not just raw XP — so rank reflects standing in the
//      community, like seniority in a union local.
//
// Demotion ("rank-down") is computed as an eligibility SIGNAL, never applied
// destructively here. Severe/low-rating/inactive patterns set a status an admin
// (or a future moderation job) can act on. See getDemotionStatus.

export type WorkerRank = 'NOVICE' | 'APPRENTICE' | 'JOURNEYMAN' | 'EXPERT' | 'LEGENDARY';

export const RANK_ORDER: WorkerRank[] = [
  'NOVICE',
  'APPRENTICE',
  'JOURNEYMAN',
  'EXPERT',
  'LEGENDARY',
];

// ─── XP from a completed job ──────────────────────────────────────────────────
// Balanced so quality and consistency matter more than raw payout.

export interface JobXpInputs {
  reward: number;            // dollar reward of the job
  rating: number | null;     // 1–5 rating received for this job, if any
  onTime: boolean | null;    // delivered on/before deadline (null if no deadline)
  hasWrittenReview: boolean;  // client left a written review
  verifiedCredential: boolean; // worker holds a verified credential
  inGuild: boolean;          // worker contributed as a guild member
}

export interface JobXpBreakdown {
  base: number;
  rewardXp: number;       // capped contribution from cash earned
  ratingBonus: number;    // scales with rating quality
  onTimeBonus: number;
  reviewBonus: number;
  credentialBonus: number;
  guildBonus: number;
  total: number;
}

// Tunables. Kept as named constants so the model is easy to reason about / test.
export const JOB_XP = {
  BASE: 40,                 // every completed job is worth a solid floor
  REWARD_PER_DOLLAR: 0.5,   // cash matters…
  REWARD_CAP: 120,          // …but is capped so big jobs don't dominate
  RATING_PER_STAR_ABOVE_3: 25, // 4★ -> +25, 5★ -> +50; 3★ -> 0; <3★ -> penalty
  ON_TIME_BONUS: 30,
  REVIEW_BONUS: 15,
  CREDENTIAL_BONUS: 20,
  GUILD_BONUS: 15,
} as const;

/**
 * Compute the XP a single completed job should award, with a transparent
 * breakdown. Pure function — no DB access — so it is trivially testable.
 *
 * Rating handling: a rating of 3 is neutral; above 3 adds XP, below 3 subtracts
 * (a 1★ job nets a meaningful penalty). Total never goes below the BASE floor so
 * a completed job is never worth zero, but a bad job is worth much less than a
 * great one.
 */
export function calculateJobXp(inputs: JobXpInputs): JobXpBreakdown {
  const base = JOB_XP.BASE;

  const rewardXp = Math.min(
    JOB_XP.REWARD_CAP,
    Math.floor(Math.max(0, inputs.reward) * JOB_XP.REWARD_PER_DOLLAR),
  );

  const ratingBonus =
    inputs.rating != null ? (inputs.rating - 3) * JOB_XP.RATING_PER_STAR_ABOVE_3 : 0;

  const onTimeBonus = inputs.onTime ? JOB_XP.ON_TIME_BONUS : 0;
  const reviewBonus = inputs.hasWrittenReview ? JOB_XP.REVIEW_BONUS : 0;
  const credentialBonus = inputs.verifiedCredential ? JOB_XP.CREDENTIAL_BONUS : 0;
  const guildBonus = inputs.inGuild ? JOB_XP.GUILD_BONUS : 0;

  const raw =
    base + rewardXp + ratingBonus + onTimeBonus + reviewBonus + credentialBonus + guildBonus;

  // Floor at BASE so a completed job is never worth less than showing up, but a
  // poorly-rated job earns close to that floor.
  const total = Math.max(base, raw);

  return { base, rewardXp, ratingBonus, onTimeBonus, reviewBonus, credentialBonus, guildBonus, total };
}

// ─── Rank eligibility ─────────────────────────────────────────────────────────

export interface ProgressionSignals {
  level: number;
  xp: number;
  completedJobs: number;
  averageRating: number | null; // across all reviews received
  ratingCount: number;
  verifiedCredentials: number;
  // Guild standing
  inGuild: boolean;
  isGuildLeader: boolean;
  guildMemberCount: number;     // members in the led guild (0 if not a leader)
  guildReputation: number;      // reputation of the led guild (0 if not a leader)
  // Trust / safety
  recentSevereDisputes: number; // open/resolved-against severe reports in window
}

export interface RankRequirement {
  rank: WorkerRank;
  label: string;
  blurb: string;
  // Human-readable requirement lines (always shown on the progression page).
  requirements: string[];
}

// Gate thresholds. Tunables grouped for clarity.
export const RANK_GATES = {
  APPRENTICE: { minLevel: 3, minJobs: 3, minAvgRating: 3.5, minRatingCount: 2 },
  JOURNEYMAN: { minLevel: 8, minJobs: 10, minAvgRating: 4.0, minRatingCount: 5, requiresCredentialOrConsistency: true },
  EXPERT: { minLevel: 15, minJobs: 25, minAvgRating: 4.5, minRatingCount: 12, requiresGuild: true },
  LEGENDARY: {
    minLevel: 30,
    minJobs: 60,
    minAvgRating: 4.7,
    minRatingCount: 30,
    requiresGuildLeadership: true,
    minGuildMembers: 5,
    minGuildReputation: 500,
    maxRecentSevereDisputes: 0,
  },
} as const;

// Static, public-facing descriptions of every rank and its gates. Used by the
// progression/help page and the profile "requirements" panel.
export const RANK_REQUIREMENTS: RankRequirement[] = [
  {
    rank: 'NOVICE',
    label: 'Novice',
    blurb: 'Everyone starts here. Post, apply, and complete your first jobs.',
    requirements: ['Create an account — you start as a Novice'],
  },
  {
    rank: 'APPRENTICE',
    label: 'Apprentice',
    blurb: 'You have shown up and delivered a few good jobs.',
    requirements: [
      `Reach level ${RANK_GATES.APPRENTICE.minLevel}`,
      `Complete ${RANK_GATES.APPRENTICE.minJobs}+ jobs`,
      `Hold a ${RANK_GATES.APPRENTICE.minAvgRating.toFixed(1)}★+ average across ${RANK_GATES.APPRENTICE.minRatingCount}+ ratings`,
    ],
  },
  {
    rank: 'JOURNEYMAN',
    label: 'Journeyman',
    blurb: 'A proven, consistent worker with a solid track record.',
    requirements: [
      `Reach level ${RANK_GATES.JOURNEYMAN.minLevel}`,
      `Complete ${RANK_GATES.JOURNEYMAN.minJobs}+ jobs`,
      `Hold a ${RANK_GATES.JOURNEYMAN.minAvgRating.toFixed(1)}★+ average across ${RANK_GATES.JOURNEYMAN.minRatingCount}+ ratings`,
      'Verify a professional credential OR maintain consistent high ratings',
    ],
  },
  {
    rank: 'EXPERT',
    label: 'Expert',
    blurb: 'A trusted craftsperson who works within the guild community.',
    requirements: [
      `Reach level ${RANK_GATES.EXPERT.minLevel}`,
      `Complete ${RANK_GATES.EXPERT.minJobs}+ jobs`,
      `Hold a ${RANK_GATES.EXPERT.minAvgRating.toFixed(1)}★+ average across ${RANK_GATES.EXPERT.minRatingCount}+ ratings`,
      'Be an active member of a guild (membership or leadership)',
    ],
  },
  {
    rank: 'LEGENDARY',
    label: 'Legendary',
    blurb: 'A guild leader of standing with a top reputation and a clean record.',
    requirements: [
      `Reach level ${RANK_GATES.LEGENDARY.minLevel}`,
      `Complete ${RANK_GATES.LEGENDARY.minJobs}+ jobs`,
      `Hold a ${RANK_GATES.LEGENDARY.minAvgRating.toFixed(1)}★+ average across ${RANK_GATES.LEGENDARY.minRatingCount}+ ratings`,
      `Lead a guild of ${RANK_GATES.LEGENDARY.minGuildMembers}+ members with ${RANK_GATES.LEGENDARY.minGuildReputation}+ guild reputation`,
      'No recent severe disputes on your record',
    ],
  },
];

/**
 * Compute the highest rank a worker currently qualifies for from their signals.
 * Pure function. Each gate is conjunctive; gates build on the lower ranks.
 */
export function computeEligibleRank(s: ProgressionSignals): WorkerRank {
  const avg = s.averageRating ?? 0;

  const apprentice =
    s.level >= RANK_GATES.APPRENTICE.minLevel &&
    s.completedJobs >= RANK_GATES.APPRENTICE.minJobs &&
    s.ratingCount >= RANK_GATES.APPRENTICE.minRatingCount &&
    avg >= RANK_GATES.APPRENTICE.minAvgRating;
  if (!apprentice) return 'NOVICE';

  const journeymanConsistency =
    s.verifiedCredentials > 0 || avg >= RANK_GATES.JOURNEYMAN.minAvgRating;
  const journeyman =
    s.level >= RANK_GATES.JOURNEYMAN.minLevel &&
    s.completedJobs >= RANK_GATES.JOURNEYMAN.minJobs &&
    s.ratingCount >= RANK_GATES.JOURNEYMAN.minRatingCount &&
    avg >= RANK_GATES.JOURNEYMAN.minAvgRating &&
    journeymanConsistency;
  if (!journeyman) return 'APPRENTICE';

  const expert =
    s.level >= RANK_GATES.EXPERT.minLevel &&
    s.completedJobs >= RANK_GATES.EXPERT.minJobs &&
    s.ratingCount >= RANK_GATES.EXPERT.minRatingCount &&
    avg >= RANK_GATES.EXPERT.minAvgRating &&
    (s.inGuild || s.isGuildLeader);
  if (!expert) return 'JOURNEYMAN';

  const legendary =
    s.level >= RANK_GATES.LEGENDARY.minLevel &&
    s.completedJobs >= RANK_GATES.LEGENDARY.minJobs &&
    s.ratingCount >= RANK_GATES.LEGENDARY.minRatingCount &&
    avg >= RANK_GATES.LEGENDARY.minAvgRating &&
    s.isGuildLeader &&
    s.guildMemberCount >= RANK_GATES.LEGENDARY.minGuildMembers &&
    s.guildReputation >= RANK_GATES.LEGENDARY.minGuildReputation &&
    s.recentSevereDisputes <= RANK_GATES.LEGENDARY.maxRecentSevereDisputes;
  if (!legendary) return 'EXPERT';

  return 'LEGENDARY';
}

// ─── Demotion / rank-down signal ──────────────────────────────────────────────
// Non-destructive. Flags a worker whose recent record warrants moderation
// review. We never auto-strip a rank here — the existing design has no rank
// column to mutate, and silently demoting is hostile. Instead we surface a
// status an admin (or a future job) can act on.

export type DemotionSeverity = 'NONE' | 'WATCH' | 'AT_RISK';

export interface DemotionStatus {
  severity: DemotionSeverity;
  reasons: string[];
}

export const DEMOTION_THRESHOLDS = {
  // Low-rating pattern
  lowAvgRating: 3.0,
  watchAvgRating: 3.5,
  minRatingsToJudge: 3,
  // Bad-review volume in the recent window
  recentBadReviews: { window: 10, atRiskCount: 4, watchCount: 2 }, // ratings <= 2
  // Disputes
  severeDisputesAtRisk: 1,
} as const;

export interface DemotionSignals {
  averageRating: number | null;
  ratingCount: number;
  recentBadReviewCount: number; // count of <=2★ in last `window` reviews
  severeDisputes: number;
}

/**
 * Compute a non-destructive demotion/rank-down signal. Pure function.
 */
export function getDemotionStatus(s: DemotionSignals): DemotionStatus {
  const reasons: string[] = [];
  let severity: DemotionSeverity = 'NONE';

  const escalate = (level: DemotionSeverity) => {
    const order: DemotionSeverity[] = ['NONE', 'WATCH', 'AT_RISK'];
    if (order.indexOf(level) > order.indexOf(severity)) severity = level;
  };

  if (s.ratingCount >= DEMOTION_THRESHOLDS.minRatingsToJudge && s.averageRating != null) {
    if (s.averageRating < DEMOTION_THRESHOLDS.lowAvgRating) {
      reasons.push(`Average rating ${s.averageRating.toFixed(1)}★ is below ${DEMOTION_THRESHOLDS.lowAvgRating.toFixed(1)}★`);
      escalate('AT_RISK');
    } else if (s.averageRating < DEMOTION_THRESHOLDS.watchAvgRating) {
      reasons.push(`Average rating ${s.averageRating.toFixed(1)}★ is slipping`);
      escalate('WATCH');
    }
  }

  if (s.recentBadReviewCount >= DEMOTION_THRESHOLDS.recentBadReviews.atRiskCount) {
    reasons.push(`${s.recentBadReviewCount} low ratings in recent jobs`);
    escalate('AT_RISK');
  } else if (s.recentBadReviewCount >= DEMOTION_THRESHOLDS.recentBadReviews.watchCount) {
    reasons.push(`${s.recentBadReviewCount} recent low ratings`);
    escalate('WATCH');
  }

  if (s.severeDisputes >= DEMOTION_THRESHOLDS.severeDisputesAtRisk) {
    reasons.push(`${s.severeDisputes} severe dispute(s) on record`);
    escalate('AT_RISK');
  }

  return { severity, reasons };
}

// ─── DB-backed aggregation ────────────────────────────────────────────────────

/**
 * Gather all progression signals for a worker from the database. Read-only.
 */
export async function gatherProgressionSignals(userId: string): Promise<ProgressionSignals> {
  const [user, ratingAgg, verifiedCreds, ledGuild, severeDisputes] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { level: true, xp: true, totalQuestsCompleted: true, guildId: true },
    }),
    prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.professionalCredential.count({ where: { userId, status: 'VERIFIED' } }),
    prisma.guild.findFirst({
      where: { leaderId: userId },
      select: { reputationScore: true, _count: { select: { members: true } } },
    }),
    // Severe disputes: SCAM/HARASSMENT reports targeting this user that an admin
    // resolved (i.e. upheld) — a conservative proxy for "severe dispute".
    prisma.report.count({
      where: {
        targetType: 'USER',
        targetId: userId,
        reason: { in: ['SCAM', 'HARASSMENT'] },
        status: 'RESOLVED',
      },
    }),
  ]);

  return {
    level: user.level,
    xp: user.xp,
    completedJobs: user.totalQuestsCompleted,
    averageRating: ratingAgg._avg.rating ?? null,
    ratingCount: ratingAgg._count,
    verifiedCredentials: verifiedCreds,
    inGuild: user.guildId != null,
    isGuildLeader: ledGuild != null,
    guildMemberCount: ledGuild?._count.members ?? 0,
    guildReputation: ledGuild?.reputationScore ?? 0,
    recentSevereDisputes: severeDisputes,
  };
}

/**
 * Gather demotion signals for a worker from the database. Read-only.
 */
export async function gatherDemotionSignals(userId: string): Promise<DemotionSignals> {
  const window = DEMOTION_THRESHOLDS.recentBadReviews.window;
  const [agg, recent, severeDisputes] = await Promise.all([
    prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.review.findMany({
      where: { revieweeId: userId },
      orderBy: { createdAt: 'desc' },
      take: window,
      select: { rating: true },
    }),
    prisma.report.count({
      where: {
        targetType: 'USER',
        targetId: userId,
        reason: { in: ['SCAM', 'HARASSMENT'] },
        status: 'RESOLVED',
      },
    }),
  ]);

  return {
    averageRating: agg._avg.rating ?? null,
    ratingCount: agg._count,
    recentBadReviewCount: recent.filter((r) => r.rating <= 2).length,
    severeDisputes,
  };
}

// ─── Public profile/progression summary ───────────────────────────────────────

export interface ProgressionSummary {
  currentRank: WorkerRank;
  currentRankLabel: string;
  signals: ProgressionSignals;
  // Per-rank achieved/locked status with the static requirement lines.
  ranks: Array<RankRequirement & { achieved: boolean; current: boolean }>;
  demotion: DemotionStatus;
}

/**
 * Build a full progression summary for a worker: current rank, every rank's
 * requirements and achieved/locked status, plus the non-destructive demotion
 * signal. Read-only.
 */
export async function getProgressionSummary(userId: string): Promise<ProgressionSummary> {
  const [signals, demotionSignals] = await Promise.all([
    gatherProgressionSignals(userId),
    gatherDemotionSignals(userId),
  ]);

  const currentRank = computeEligibleRank(signals);
  const currentIdx = RANK_ORDER.indexOf(currentRank);

  const ranks = RANK_REQUIREMENTS.map((r) => {
    const idx = RANK_ORDER.indexOf(r.rank);
    return { ...r, achieved: idx <= currentIdx, current: r.rank === currentRank };
  });

  return {
    currentRank,
    currentRankLabel: RANK_REQUIREMENTS.find((r) => r.rank === currentRank)!.label,
    signals,
    ranks,
    demotion: getDemotionStatus(demotionSignals),
  };
}

// ─── Completion XP integration ────────────────────────────────────────────────
// Awarded when a quest is marked complete. The rating is unknown at this point
// (reviews arrive later), so we award the quality-independent portion of job XP
// here (base + capped reward + on-time + credential + guild). The rating-based
// bonus is layered on later, when a review is received (see awardReviewXp).

/**
 * Award completion XP for a quest to its assigned worker and increment their
 * completed-jobs counter. Safe to call once per completion. Returns the XP
 * breakdown and award result, or null if the quest has no assigned worker.
 */
export async function awardCompletionXp(questId: string): Promise<{
  breakdown: JobXpBreakdown;
  awarded: number;
} | null> {
  const { awardXP } = await import('./xpService');

  const quest = await prisma.quest.findUniqueOrThrow({
    where: { id: questId },
    select: {
      assignedAdventurerId: true,
      reward: true,
      deadline: true,
      completedAt: true,
    },
  });
  if (!quest.assignedAdventurerId) return null;
  const workerId = quest.assignedAdventurerId;

  const [verifiedCreds, worker] = await Promise.all([
    prisma.professionalCredential.count({ where: { userId: workerId, status: 'VERIFIED' } }),
    prisma.user.findUniqueOrThrow({ where: { id: workerId }, select: { guildId: true } }),
  ]);

  const onTime =
    quest.deadline && quest.completedAt ? quest.completedAt <= quest.deadline : null;

  // Compute job XP without the rating component (rating not yet known).
  const breakdown = calculateJobXp({
    reward: Number(quest.reward),
    rating: null,
    onTime,
    hasWrittenReview: false,
    verifiedCredential: verifiedCreds > 0,
    inGuild: worker.guildId != null,
  });

  await awardXP(workerId, breakdown.total, `Quest completed: ${questId}`);
  return { breakdown, awarded: breakdown.total };
}

/**
 * Award the rating-based XP bonus when a review is received on a completed job.
 * Keeps cash/quality balance: only the rating delta (and the review bonus) is
 * granted here, so a great review meaningfully outpaces a poor one without
 * re-counting the completion XP. A rating of 3 is neutral; below 3 grants no XP.
 */
export async function awardReviewXp(workerId: string, rating: number): Promise<number> {
  const { awardXP } = await import('./xpService');
  const ratingBonus = Math.max(0, (rating - 3) * JOB_XP.RATING_PER_STAR_ABOVE_3);
  const bonus = ratingBonus + JOB_XP.REVIEW_BONUS;
  if (bonus > 0) {
    await awardXP(workerId, bonus, `Review received (${rating}★)`);
  }
  return bonus;
}

// Re-export so callers have a single import surface for progression concerns.
export { getLevelForXP };
