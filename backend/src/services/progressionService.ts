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

export type WorkerRank =
  | 'NOVICE'
  | 'APPRENTICE'
  | 'JOURNEYMAN'
  | 'EXPERT'
  | 'MASTER'
  | 'LEGENDARY';

export const RANK_ORDER: WorkerRank[] = [
  'NOVICE',
  'APPRENTICE',
  'JOURNEYMAN',
  'EXPERT',
  'MASTER',
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
  repeatClient?: boolean;    // client has hired this worker before (if measurable)
  skillRatingCount?: number; // number of per-skill ratings on this job (if measurable)
  hasPhotoProof?: boolean;   // worker attached photo proof of work (if measurable)
}

export interface JobXpBreakdown {
  base: number;
  rewardXp: number;       // capped contribution from cash earned
  ratingBonus: number;    // scales with rating quality (5★/4★ tiers)
  onTimeBonus: number;
  reviewBonus: number;
  credentialBonus: number;
  guildBonus: number;
  repeatClientBonus: number;
  skillRatingBonus: number;
  photoProofBonus: number;
  total: number;
}

// Tunables. Kept as named constants so the model is easy to reason about / test.
// Tuned for the deeper, grindier curve: a completed job is worth a solid chunk,
// but quality (a 5★ with a written review and on-time delivery) roughly doubles
// it, while cash stays capped so a few big paydays can't buy a rank.
export const JOB_XP = {
  BASE: 250,                 // every completed job is worth a solid floor
  REWARD_PER_DOLLAR: 2,      // cash matters…
  REWARD_CAP: 500,           // …but is capped so big jobs don't dominate (min(reward*2, 500))
  RATING_5_STAR: 350,        // an excellent job
  RATING_4_STAR: 150,        // a good job
  // 3★ is neutral (0); below 3★ flags probation rather than subtracting XP, so a
  // single bad day never destroys progress (see DEMOTION/probation copy below).
  ON_TIME_BONUS: 150,
  REVIEW_BONUS: 100,         // client left a written review
  CREDENTIAL_BONUS: 50,      // worker holds a verified credential
  GUILD_BONUS: 50,           // worker contributed as a guild member
  REPEAT_CLIENT_BONUS: 150,  // repeat/returning client (if measurable)
  SKILL_RATING_BONUS: 50,    // per individual skill rated on the job (if measurable)
  PHOTO_PROOF_BONUS: 50,     // worker attached photo proof (if measurable)
} as const;

/**
 * Map a 1–5 rating to its XP bonus. 5★ and 4★ are rewarded tiers; 3★ is neutral;
 * below 3★ yields no XP bonus (a low rating is handled as a probation signal, not
 * a destructive XP penalty — see getDemotionStatus / probation copy).
 */
export function ratingXpBonus(rating: number | null): number {
  if (rating == null) return 0;
  if (rating >= 5) return JOB_XP.RATING_5_STAR;
  if (rating >= 4) return JOB_XP.RATING_4_STAR;
  return 0;
}

/**
 * Compute the XP a single completed job should award, with a transparent
 * breakdown. Pure function — no DB access — so it is trivially testable.
 *
 * Rating handling: 5★/4★ add a tiered bonus; 3★ is neutral; below 3★ adds nothing
 * (and instead flags probation elsewhere). Total never goes below the BASE floor
 * so a completed job is always worth showing up for, but a great job is worth far
 * more than a poor one. Cash is capped so it cannot dominate quality.
 *
 * The optional repeat-client / skill-rating / photo-proof inputs are additive and
 * only contribute when the caller can actually measure them — missing data simply
 * contributes 0, never a penalty.
 */
export function calculateJobXp(inputs: JobXpInputs): JobXpBreakdown {
  const base = JOB_XP.BASE;

  const rewardXp = Math.min(
    JOB_XP.REWARD_CAP,
    Math.floor(Math.max(0, inputs.reward) * JOB_XP.REWARD_PER_DOLLAR),
  );

  const ratingBonus = ratingXpBonus(inputs.rating);

  const onTimeBonus = inputs.onTime ? JOB_XP.ON_TIME_BONUS : 0;
  const reviewBonus = inputs.hasWrittenReview ? JOB_XP.REVIEW_BONUS : 0;
  const credentialBonus = inputs.verifiedCredential ? JOB_XP.CREDENTIAL_BONUS : 0;
  const guildBonus = inputs.inGuild ? JOB_XP.GUILD_BONUS : 0;
  const repeatClientBonus = inputs.repeatClient ? JOB_XP.REPEAT_CLIENT_BONUS : 0;
  const skillRatingBonus = Math.max(0, inputs.skillRatingCount ?? 0) * JOB_XP.SKILL_RATING_BONUS;
  const photoProofBonus = inputs.hasPhotoProof ? JOB_XP.PHOTO_PROOF_BONUS : 0;

  const raw =
    base +
    rewardXp +
    ratingBonus +
    onTimeBonus +
    reviewBonus +
    credentialBonus +
    guildBonus +
    repeatClientBonus +
    skillRatingBonus +
    photoProofBonus;

  // Floor at BASE so a completed job is never worth less than showing up.
  const total = Math.max(base, raw);

  return {
    base,
    rewardXp,
    ratingBonus,
    onTimeBonus,
    reviewBonus,
    credentialBonus,
    guildBonus,
    repeatClientBonus,
    skillRatingBonus,
    photoProofBonus,
    total,
  };
}

// ─── Rank eligibility ─────────────────────────────────────────────────────────

export interface ProgressionSignals {
  level: number;
  xp: number;
  completedJobs: number;
  averageRating: number | null; // across all reviews received
  ratingCount: number;
  verifiedCredentials: number;
  // Account tenure — ranks are time-gated (a trade is earned over seasons, not
  // sprints). Days since the account was created.
  tenureDays: number;
  // Skill-badge depth. Counts of distinct skills the worker has earned at each
  // tier or higher (a Gold skill counts toward Silver and Bronze totals).
  bronzeSkillBadges: number;
  silverSkillBadges: number;
  goldSkillBadges: number;
  // Guild standing
  inGuild: boolean;
  isGuildLeader: boolean;
  isGuildOfficerOrLeader: boolean; // OFFICER or LEADER role — a leadership signal
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

// Gate thresholds. Tunables grouped for clarity. These are deliberately HARD and
// time-gated — modelled on a trade/union apprenticeship ladder where rank is a
// multi-year mark of standing, not a quick grind.
//
// Some signals the user described (repeat-client counts as a hard gate, a numeric
// "completion reliability %", a guild's own average rating, a clean 180-day
// window) are not reliably measurable with the current schema. Those are encoded
// as PLACEHOLDER requirement copy and surfaced on the progression page, but they
// do NOT block promotion in code (per the brief: don't block on unmeasurable
// data). When the data exists, promote them to enforced gates here.
export const RANK_GATES = {
  APPRENTICE: {
    minLevel: 10,
    minTenureDays: 14,
    minJobs: 5,
    minAvgRating: 4.0,
    minRatingCount: 5,
    maxRecentSevereDisputes: 0, // "no unresolved disputes"
  },
  JOURNEYMAN: {
    minLevel: 35,
    minTenureDays: 90,
    minJobs: 30,
    minAvgRating: 4.4,
    minRatingCount: 10,
    minBronzeBadges: 2,
    // PLACEHOLDER (not enforced): 5 repeat/return clients or referrals.
  },
  EXPERT: {
    minLevel: 65,
    minTenureDays: 182, // ~6 months
    minJobs: 100,
    minAvgRating: 4.7,
    minRatingCount: 25,
    requiresGuild: true, // guild member in good standing
    minSilverBadges: 2,
    minCredentials: 1, // 1 verified credential
  },
  MASTER: {
    minLevel: 80,
    minTenureDays: 365, // 12 months
    minJobs: 200,
    minAvgRating: 4.8,
    minRatingCount: 40,
    requiresGuildLeadershipSignal: true, // guild officer/mentor or leader
    minGoldBadges: 1,
    // PLACEHOLDER (not enforced): 95% completion reliability.
  },
  LEGENDARY: {
    minLevel: 95,
    minTenureDays: 547, // ~18 months (brief: 18–24 months)
    minJobs: 400,
    minAvgRating: 4.9,
    minRatingCount: 80,
    requiresGuildLeadership: true, // guild leader
    minGuildMembers: 10,
    minGuildReputation: 1000,
    maxRecentSevereDisputes: 0, // clean record / no serious disputes
    // PLACEHOLDER (not enforced): guild 4.8★+ avg, clean 180-day record.
  },
} as const;

// Render a day count as a human-friendly tenure string for requirement copy.
function tenureLabel(days: number): string {
  if (days % 365 === 0 && days >= 365) {
    const yrs = days / 365;
    return yrs === 1 ? '1 year' : `${yrs} years`;
  }
  if (days >= 365) return `${Math.round((days / 365) * 10) / 10} years`;
  if (days % 30 === 0 || days >= 60) return `${Math.round(days / 30)} months`;
  return `${days} days`;
}

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
    blurb: 'You have shown up and delivered a handful of good jobs.',
    requirements: [
      `Reach level ${RANK_GATES.APPRENTICE.minLevel}`,
      `Be active for ${tenureLabel(RANK_GATES.APPRENTICE.minTenureDays)}`,
      `Complete ${RANK_GATES.APPRENTICE.minJobs}+ jobs`,
      `Hold a ${RANK_GATES.APPRENTICE.minAvgRating.toFixed(1)}★+ average across ${RANK_GATES.APPRENTICE.minRatingCount}+ ratings`,
      'No unresolved disputes on your record',
    ],
  },
  {
    rank: 'JOURNEYMAN',
    label: 'Journeyman',
    blurb: 'A proven, consistent worker with a real body of rated work.',
    requirements: [
      `Reach level ${RANK_GATES.JOURNEYMAN.minLevel}`,
      `Be active for ${tenureLabel(RANK_GATES.JOURNEYMAN.minTenureDays)}`,
      `Complete ${RANK_GATES.JOURNEYMAN.minJobs}+ jobs`,
      `Hold a ${RANK_GATES.JOURNEYMAN.minAvgRating.toFixed(1)}★+ average across ${RANK_GATES.JOURNEYMAN.minRatingCount}+ ratings`,
      `Earn ${RANK_GATES.JOURNEYMAN.minBronzeBadges}+ Bronze skill badges`,
      'Build a base of repeat/return clients or referrals (coming soon)',
    ],
  },
  {
    rank: 'EXPERT',
    label: 'Expert',
    blurb: 'A trusted, credentialed craftsperson working within the guild community.',
    requirements: [
      `Reach level ${RANK_GATES.EXPERT.minLevel}`,
      `Be active for ${tenureLabel(RANK_GATES.EXPERT.minTenureDays)}`,
      `Complete ${RANK_GATES.EXPERT.minJobs}+ jobs`,
      `Hold a ${RANK_GATES.EXPERT.minAvgRating.toFixed(1)}★+ average across ${RANK_GATES.EXPERT.minRatingCount}+ ratings`,
      'Be a guild member in good standing',
      `Earn ${RANK_GATES.EXPERT.minSilverBadges}+ Silver skill badges`,
      `Hold ${RANK_GATES.EXPERT.minCredentials}+ verified credential`,
    ],
  },
  {
    rank: 'MASTER',
    label: 'Master',
    blurb: 'A master of the craft and a leader who mentors others in the guild.',
    requirements: [
      `Reach level ${RANK_GATES.MASTER.minLevel}`,
      `Be active for ${tenureLabel(RANK_GATES.MASTER.minTenureDays)}`,
      `Complete ${RANK_GATES.MASTER.minJobs}+ jobs`,
      `Hold a ${RANK_GATES.MASTER.minAvgRating.toFixed(1)}★+ average across ${RANK_GATES.MASTER.minRatingCount}+ ratings`,
      'Serve as a guild officer, mentor, or leader',
      `Earn ${RANK_GATES.MASTER.minGoldBadges}+ Gold skill badge`,
      'Maintain 95%+ completion reliability (coming soon)',
    ],
  },
  {
    rank: 'LEGENDARY',
    label: 'Legendary',
    blurb: 'A guild leader of standing with a top reputation and a clean record.',
    requirements: [
      `Reach level ${RANK_GATES.LEGENDARY.minLevel}`,
      `Be active for ${tenureLabel(RANK_GATES.LEGENDARY.minTenureDays)}`,
      `Complete ${RANK_GATES.LEGENDARY.minJobs}+ jobs`,
      `Hold a ${RANK_GATES.LEGENDARY.minAvgRating.toFixed(1)}★+ average across ${RANK_GATES.LEGENDARY.minRatingCount}+ ratings`,
      `Lead a guild of ${RANK_GATES.LEGENDARY.minGuildMembers}+ active members with ${RANK_GATES.LEGENDARY.minGuildReputation}+ guild reputation`,
      'No serious disputes on your record',
      'Maintain a guild 4.8★+ average and a clean 180-day record (coming soon)',
    ],
  },
];

/** Whether a worker meets every ENFORCED gate for a given rank. Pure. */
export function meetsRankGate(rank: Exclude<WorkerRank, 'NOVICE'>, s: ProgressionSignals): boolean {
  const avg = s.averageRating ?? 0;
  switch (rank) {
    case 'APPRENTICE':
      return (
        s.level >= RANK_GATES.APPRENTICE.minLevel &&
        s.tenureDays >= RANK_GATES.APPRENTICE.minTenureDays &&
        s.completedJobs >= RANK_GATES.APPRENTICE.minJobs &&
        s.ratingCount >= RANK_GATES.APPRENTICE.minRatingCount &&
        avg >= RANK_GATES.APPRENTICE.minAvgRating &&
        s.recentSevereDisputes <= RANK_GATES.APPRENTICE.maxRecentSevereDisputes
      );
    case 'JOURNEYMAN':
      return (
        s.level >= RANK_GATES.JOURNEYMAN.minLevel &&
        s.tenureDays >= RANK_GATES.JOURNEYMAN.minTenureDays &&
        s.completedJobs >= RANK_GATES.JOURNEYMAN.minJobs &&
        s.ratingCount >= RANK_GATES.JOURNEYMAN.minRatingCount &&
        avg >= RANK_GATES.JOURNEYMAN.minAvgRating &&
        s.bronzeSkillBadges >= RANK_GATES.JOURNEYMAN.minBronzeBadges
      );
    case 'EXPERT':
      return (
        s.level >= RANK_GATES.EXPERT.minLevel &&
        s.tenureDays >= RANK_GATES.EXPERT.minTenureDays &&
        s.completedJobs >= RANK_GATES.EXPERT.minJobs &&
        s.ratingCount >= RANK_GATES.EXPERT.minRatingCount &&
        avg >= RANK_GATES.EXPERT.minAvgRating &&
        (s.inGuild || s.isGuildLeader) &&
        s.silverSkillBadges >= RANK_GATES.EXPERT.minSilverBadges &&
        s.verifiedCredentials >= RANK_GATES.EXPERT.minCredentials
      );
    case 'MASTER':
      return (
        s.level >= RANK_GATES.MASTER.minLevel &&
        s.tenureDays >= RANK_GATES.MASTER.minTenureDays &&
        s.completedJobs >= RANK_GATES.MASTER.minJobs &&
        s.ratingCount >= RANK_GATES.MASTER.minRatingCount &&
        avg >= RANK_GATES.MASTER.minAvgRating &&
        s.isGuildOfficerOrLeader &&
        s.goldSkillBadges >= RANK_GATES.MASTER.minGoldBadges
      );
    case 'LEGENDARY':
      return (
        s.level >= RANK_GATES.LEGENDARY.minLevel &&
        s.tenureDays >= RANK_GATES.LEGENDARY.minTenureDays &&
        s.completedJobs >= RANK_GATES.LEGENDARY.minJobs &&
        s.ratingCount >= RANK_GATES.LEGENDARY.minRatingCount &&
        avg >= RANK_GATES.LEGENDARY.minAvgRating &&
        s.isGuildLeader &&
        s.guildMemberCount >= RANK_GATES.LEGENDARY.minGuildMembers &&
        s.guildReputation >= RANK_GATES.LEGENDARY.minGuildReputation &&
        s.recentSevereDisputes <= RANK_GATES.LEGENDARY.maxRecentSevereDisputes
      );
  }
}

/**
 * Compute the highest rank a worker currently qualifies for from their signals.
 * Pure function. Gates build on the lower ranks: failing one stops the climb.
 */
export function computeEligibleRank(s: ProgressionSignals): WorkerRank {
  let current: WorkerRank = 'NOVICE';
  for (const rank of RANK_ORDER) {
    if (rank === 'NOVICE') continue;
    if (meetsRankGate(rank, s)) {
      current = rank;
    } else {
      break;
    }
  }
  return current;
}

// ─── Candidate state ──────────────────────────────────────────────────────────
// Level and rank eligibility are deliberately SEPARATE. A worker can out-level a
// rank (enough XP) yet miss its trust/quality/time gates. When that happens we
// surface "<NextRank> Candidate" language so the worker sees they have the level
// but still owe the rest of the gate — never a rank they have not earned.

/** The next rank above the given one, or null if already at the top. */
export function nextRank(rank: WorkerRank): WorkerRank | null {
  const idx = RANK_ORDER.indexOf(rank);
  return idx >= 0 && idx < RANK_ORDER.length - 1 ? RANK_ORDER[idx + 1] : null;
}

export interface CandidateState {
  /** True when the worker has the LEVEL for the next rank but misses other gates. */
  isCandidate: boolean;
  candidateForRank: WorkerRank | null;
  candidateLabel: string | null; // e.g. "Journeyman Candidate"
}

/**
 * Decide whether a worker is a "candidate" for the next rank: they meet the
 * next rank's LEVEL gate but not its full gate. Pure function.
 */
export function computeCandidateState(s: ProgressionSignals, current: WorkerRank): CandidateState {
  const next = nextRank(current);
  if (!next) return { isCandidate: false, candidateForRank: null, candidateLabel: null };

  const nextGate = RANK_GATES[next as Exclude<WorkerRank, 'NOVICE'>];
  const hasLevel = s.level >= nextGate.minLevel;
  // Already-eligible workers are not "candidates" — computeEligibleRank would
  // have promoted them. Candidate = has the level, still owes the rest.
  if (hasLevel && !meetsRankGate(next as Exclude<WorkerRank, 'NOVICE'>, s)) {
    const label = RANK_REQUIREMENTS.find((r) => r.rank === next)!.label;
    return { isCandidate: true, candidateForRank: next, candidateLabel: `${label} Candidate` };
  }
  return { isCandidate: false, candidateForRank: null, candidateLabel: null };
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

// The escalation ladder, in plain language. Nothing here is destructive: a rank
// is only ever frozen or reviewed, never silently stripped. Surfaced on the
// public progression page and (for the worker's own profile) the demotion panel.
export const PROBATION_STAGES: ReadonlyArray<{ stage: string; meaning: string }> = [
  { stage: 'Warning', meaning: 'A dip in ratings or a recent low review puts a soft flag on your account. Nothing changes yet — it is a heads-up.' },
  { stage: 'Probation', meaning: 'A continued pattern of low ratings or a dispute moves you to probation. Your rank is held in place while you recover.' },
  { stage: 'Rank freeze', meaning: 'While frozen, you keep your rank but cannot climb higher until the pattern clears and your recent record improves.' },
  { stage: 'Review & demotion', meaning: 'Only after human review — for serious or repeated issues — can a rank be lowered. We never auto-demote on a single bad day.' },
] as const;

/** Map a demotion severity to its probation stage label. */
export function probationStageFor(severity: DemotionSeverity): string {
  switch (severity) {
    case 'AT_RISK':
      return 'Probation';
    case 'WATCH':
      return 'Warning';
    default:
      return 'Good standing';
  }
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
  const { getWorkerSkillBadges, countBadgesAtLeast } = await import('./skillService');

  const [user, ratingAgg, verifiedCreds, ledGuild, officerOrLeader, severeDisputes, skillBadges] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { level: true, xp: true, totalQuestsCompleted: true, guildId: true, createdAt: true },
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
      // Leadership signal: an OFFICER or LEADER seat in any guild.
      prisma.guildMember.findFirst({
        where: { userId, role: { in: ['OFFICER', 'LEADER'] } },
        select: { id: true },
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
      getWorkerSkillBadges(userId),
    ]);

  const tenureMs = Date.now() - user.createdAt.getTime();
  const tenureDays = Math.max(0, Math.floor(tenureMs / 86_400_000));

  const isGuildLeader = ledGuild != null;

  return {
    level: user.level,
    xp: user.xp,
    completedJobs: user.totalQuestsCompleted,
    averageRating: ratingAgg._avg.rating ?? null,
    ratingCount: ratingAgg._count,
    verifiedCredentials: verifiedCreds,
    tenureDays,
    // Count skills at each tier or higher (Gold counts toward Silver and Bronze).
    bronzeSkillBadges: countBadgesAtLeast(skillBadges, 'BRONZE'),
    silverSkillBadges: countBadgesAtLeast(skillBadges, 'SILVER'),
    goldSkillBadges: countBadgesAtLeast(skillBadges, 'GOLD'),
    inGuild: user.guildId != null,
    isGuildLeader,
    isGuildOfficerOrLeader: isGuildLeader || officerOrLeader != null,
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
  // Candidate state: when the worker has the LEVEL for the next rank but still
  // owes its other gates (e.g. "Journeyman Candidate"). Level and rank
  // eligibility are intentionally separate.
  candidate: CandidateState;
  signals: ProgressionSignals;
  // Per-rank achieved/locked status with the static requirement lines.
  ranks: Array<RankRequirement & { achieved: boolean; current: boolean }>;
  demotion: DemotionStatus;
  probationStage: string; // plain-language standing for the demotion severity
}

/**
 * Build a full progression summary for a worker: current rank, candidate state,
 * every rank's requirements and achieved/locked status, plus the non-destructive
 * demotion signal. Read-only.
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

  const demotion = getDemotionStatus(demotionSignals);

  return {
    currentRank,
    currentRankLabel: RANK_REQUIREMENTS.find((r) => r.rank === currentRank)!.label,
    candidate: computeCandidateState(signals, currentRank),
    signals,
    ranks,
    demotion,
    probationStage: probationStageFor(demotion.severity),
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
  const bonus = ratingXpBonus(rating) + JOB_XP.REVIEW_BONUS;
  if (bonus > 0) {
    await awardXP(workerId, bonus, `Review received (${rating}★)`);
  }
  return bonus;
}

// Re-export so callers have a single import surface for progression concerns.
export { getLevelForXP };
