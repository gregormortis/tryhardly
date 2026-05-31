import { prisma } from '../app';

// ─── Quality Leaderboards ──────────────────────────────────────────────────────
// Public, recognition-only rankings built entirely from quality signals: trust
// (reputation), rating quality, completed jobs, review volume, verified
// credentials, skill mastery, and guild standing. Deliberately NOT ranked by
// money — there are no earnings, payouts, prizes, or cash figures anywhere here.
// Every figure shown is derived from real rows; sparse data surfaces an honest
// early-access state in the UI rather than padded numbers.

// ─── Worker leaderboard ─────────────────────────────────────────────────────

export interface WorkerLeaderboardEntry {
  rank: number;
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  // Trust & quality signals (no money).
  reputationScore: number;
  averageRating: number | null; // null until the worker has any rating
  ratingCount: number;
  completedJobs: number;
  verifiedCredentials: number;
  topSkillBadges: number; // count of Gold/Platinum skill badges
  verified: boolean;
  guild: { id: string; name: string; tag: string } | null;
}

// A worker's raw quality signals, before ranking. Kept separate from the ranked
// entry so the ordering logic is a pure, testable function.
export interface WorkerQualitySignals {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  reputationScore: number;
  averageRating: number | null;
  ratingCount: number;
  completedJobs: number;
  verifiedCredentials: number;
  topSkillBadges: number;
  verified: boolean;
  guild: { id: string; name: string; tag: string } | null;
  createdAt: Date;
}

/**
 * Order workers for the "Top Workers" board by quality, never by money.
 * Pure function so the tie-break chain is easy to unit test.
 *
 * Priority: reputation → average rating → review count → completed jobs →
 * verified credentials. A worker needs at least one rating to be ranked on
 * rating; unrated workers sort below rated ones at equal reputation.
 */
export function orderTopWorkers(workers: WorkerQualitySignals[]): WorkerQualitySignals[] {
  return [...workers].sort((a, b) => {
    if (b.reputationScore !== a.reputationScore) return b.reputationScore - a.reputationScore;
    const aAvg = a.averageRating ?? -1;
    const bAvg = b.averageRating ?? -1;
    if (bAvg !== aAvg) return bAvg - aAvg;
    if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
    if (b.completedJobs !== a.completedJobs) return b.completedJobs - a.completedJobs;
    return b.verifiedCredentials - a.verifiedCredentials;
  });
}

/**
 * Order "Rising Workers": newer accounts making strong early quality progress.
 * Pure function. Ranks by a simple momentum score that rewards rating quality
 * and recent activity without using money. Only workers with at least one
 * completed job and one rating qualify (so the board is never padded with
 * brand-new, unproven accounts).
 */
export function orderRisingWorkers(
  workers: WorkerQualitySignals[],
  now: Date = new Date(),
): WorkerQualitySignals[] {
  const RISING_WINDOW_DAYS = 90;
  const windowMs = RISING_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const eligible = workers.filter(
    (w) =>
      w.completedJobs >= 1 &&
      w.ratingCount >= 1 &&
      now.getTime() - w.createdAt.getTime() <= windowMs,
  );

  const score = (w: WorkerQualitySignals): number => {
    const avg = w.averageRating ?? 0;
    // Reward rating quality and consistent delivery; small weight on reputation
    // so it does not collapse into the Top Workers board.
    return avg * 20 + w.ratingCount * 4 + w.completedJobs * 3 + w.reputationScore * 0.2;
  };

  return eligible.sort((a, b) => {
    const d = score(b) - score(a);
    if (d !== 0) return d;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/**
 * Attach 1-based ranks to an ordered list and project to the public entry shape.
 */
export function withRanks(workers: WorkerQualitySignals[]): WorkerLeaderboardEntry[] {
  return workers.map((w, i) => ({
    rank: i + 1,
    id: w.id,
    username: w.username,
    displayName: w.displayName,
    avatarUrl: w.avatarUrl,
    reputationScore: w.reputationScore,
    averageRating: w.averageRating,
    ratingCount: w.ratingCount,
    completedJobs: w.completedJobs,
    verifiedCredentials: w.verifiedCredentials,
    topSkillBadges: w.topSkillBadges,
    verified: w.verified,
    guild: w.guild,
  }));
}

// ─── DB-backed signal gathering ────────────────────────────────────────────────

// Skill-tier thresholds for "top" badges (Gold/Platinum) — mirror skillService
// so the leaderboard count stays consistent with profile badges.
const GOLD_MIN_RATINGS = 20;
const GOLD_MIN_AVG = 4.6;

/**
 * Pull quality signals for the candidate worker pool. We bound the pool to a
 * sane size for an in-memory rank/sort (the marketplace is local-scale). All
 * figures are real aggregates over existing rows; no money fields are read.
 */
async function gatherWorkerSignals(poolSize: number): Promise<WorkerQualitySignals[]> {
  // Candidate pool: users who have either earned reputation or completed a job.
  // Ordered by reputation so a capped pool still captures the strongest workers.
  const users = await prisma.user.findMany({
    where: {
      OR: [{ reputationScore: { gt: 0 } }, { totalQuestsCompleted: { gt: 0 } }],
    },
    orderBy: [{ reputationScore: 'desc' }, { totalQuestsCompleted: 'desc' }],
    take: poolSize,
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      reputationScore: true,
      totalQuestsCompleted: true,
      verified: true,
      createdAt: true,
      // Hide appointed staff accounts from the earned-quality boards so seeded
      // founder/admin standing can't read as earned ranking.
      role: true,
      guild: { select: { id: true, name: true, tag: true } },
    },
  });

  const realUsers = users.filter((u) => {
    const r = (u.role ?? '').toUpperCase();
    return r !== 'FOUNDER' && r !== 'ADMIN';
  });
  if (realUsers.length === 0) return [];

  const ids = realUsers.map((u) => u.id);

  const [ratingAgg, verifiedCreds, skillGroups] = await Promise.all([
    prisma.review.groupBy({
      by: ['revieweeId'],
      where: { revieweeId: { in: ids } },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.professionalCredential.groupBy({
      by: ['userId'],
      where: { userId: { in: ids }, status: 'VERIFIED' },
      _count: true,
    }),
    prisma.skillRating.groupBy({
      by: ['workerId', 'skillSlug'],
      where: { workerId: { in: ids } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const ratingByUser = new Map(
    ratingAgg.map((r) => [r.revieweeId, { avg: r._avg.rating, count: r._count }]),
  );
  const credsByUser = new Map(verifiedCreds.map((c) => [c.userId, c._count]));

  // Count Gold/Platinum-tier skills per worker.
  const topBadgesByUser = new Map<string, number>();
  for (const g of skillGroups) {
    const avg = g._avg.rating ?? 0;
    if (g._count._all >= GOLD_MIN_RATINGS && avg >= GOLD_MIN_AVG) {
      topBadgesByUser.set(g.workerId, (topBadgesByUser.get(g.workerId) ?? 0) + 1);
    }
  }

  return realUsers.map((u) => {
    const rating = ratingByUser.get(u.id);
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      reputationScore: u.reputationScore,
      averageRating: rating?.avg != null ? Number(rating.avg.toFixed(2)) : null,
      ratingCount: rating?.count ?? 0,
      completedJobs: u.totalQuestsCompleted,
      verifiedCredentials: credsByUser.get(u.id) ?? 0,
      topSkillBadges: topBadgesByUser.get(u.id) ?? 0,
      verified: u.verified,
      guild: u.guild,
      createdAt: u.createdAt,
    };
  });
}

// ─── Skill Masters ─────────────────────────────────────────────────────────────

export interface SkillMasterEntry {
  rank: number;
  skillSlug: string;
  skillName: string;
  tier: 'GOLD' | 'PLATINUM';
  averageRating: number;
  ratingCount: number;
  worker: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

// ─── Top Guilds ─────────────────────────────────────────────────────────────

export interface GuildLeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  tag: string;
  badgeUrl: string | null;
  reputationScore: number;
  memberCount: number;
}

// ─── Public assembly ───────────────────────────────────────────────────────────

export interface LeaderboardsPayload {
  topWorkers: WorkerLeaderboardEntry[];
  risingWorkers: WorkerLeaderboardEntry[];
  skillMasters: SkillMasterEntry[];
  topGuilds: GuildLeaderboardEntry[];
}

/**
 * Build the full public leaderboards payload. Read-only; safe aggregations only.
 * `limit` caps each board. The candidate pool is intentionally a few times the
 * limit so the in-memory quality sort has enough to choose from.
 */
export async function getLeaderboards(limit = 25): Promise<LeaderboardsPayload> {
  const take = Math.min(100, Math.max(1, limit));
  const poolSize = Math.min(500, take * 8);

  const [signals, skillGroups, guilds] = await Promise.all([
    gatherWorkerSignals(poolSize),
    prisma.skillRating.groupBy({
      by: ['workerId', 'skillSlug', 'skillName'],
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.guild.findMany({
      where: { isPublic: true },
      orderBy: { reputationScore: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        tag: true,
        badgeUrl: true,
        reputationScore: true,
        _count: { select: { members: true } },
      },
    }),
  ]);

  const usernameById = new Map(signals.map((s) => [s.id, s]));

  // Skill Masters: Gold/Platinum skill badges across all workers, best first.
  const masters: Omit<SkillMasterEntry, 'rank'>[] = [];
  for (const g of skillGroups) {
    const avg = g._avg.rating ?? 0;
    const count = g._count._all;
    if (count < GOLD_MIN_RATINGS || avg < GOLD_MIN_AVG) continue;
    const worker = usernameById.get(g.workerId);
    if (!worker) continue; // excludes staff and out-of-pool workers
    const tier: 'GOLD' | 'PLATINUM' = count >= 50 && avg >= 4.8 ? 'PLATINUM' : 'GOLD';
    masters.push({
      skillSlug: g.skillSlug,
      skillName: g.skillName,
      tier,
      averageRating: Number(avg.toFixed(2)),
      ratingCount: count,
      worker: {
        id: worker.id,
        username: worker.username,
        displayName: worker.displayName,
        avatarUrl: worker.avatarUrl,
      },
    });
  }
  masters.sort((a, b) => {
    const tierRank = (t: string) => (t === 'PLATINUM' ? 1 : 0);
    if (tierRank(b.tier) !== tierRank(a.tier)) return tierRank(b.tier) - tierRank(a.tier);
    if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
    return b.ratingCount - a.ratingCount;
  });

  return {
    topWorkers: withRanks(orderTopWorkers(signals)).slice(0, take),
    risingWorkers: withRanks(orderRisingWorkers(signals)).slice(0, take),
    skillMasters: masters.slice(0, take).map((m, i) => ({ rank: i + 1, ...m })),
    topGuilds: guilds.map((g, i) => ({
      rank: i + 1,
      id: g.id,
      name: g.name,
      tag: g.tag,
      badgeUrl: g.badgeUrl,
      reputationScore: g.reputationScore,
      memberCount: g._count.members,
    })),
  };
}
