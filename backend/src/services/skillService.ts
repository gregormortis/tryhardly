import { prisma } from '../app';

// ─── Skill Badges ─────────────────────────────────────────────────────────────
// Clients rate each skill a worker performed on a completed job. We aggregate
// those SkillRating rows per skill and derive a badge tier. Tiers are ALWAYS
// computed from real ratings here — never stored — so a badge can never be stale
// or faked. When a worker has too few ratings to earn even Bronze, we surface an
// honest "locked" tier with progress toward the next threshold instead.

export type SkillBadgeTier = 'LOCKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface SkillTierRule {
  tier: Exclude<SkillBadgeTier, 'LOCKED'>;
  minRatings: number;
  minAverage: number;
}

// Ordered ascending. Each tier requires BOTH a minimum number of ratings and a
// minimum average rating. A skill earns the highest tier whose thresholds it
// meets. Keeping both gates means a single 5★ rating can't mint a badge.
export const SKILL_TIER_RULES: SkillTierRule[] = [
  { tier: 'BRONZE',   minRatings: 3,  minAverage: 4.0 },
  { tier: 'SILVER',   minRatings: 8,  minAverage: 4.3 },
  { tier: 'GOLD',     minRatings: 20, minAverage: 4.6 },
  { tier: 'PLATINUM', minRatings: 50, minAverage: 4.8 },
];

const TIER_ORDER: SkillBadgeTier[] = ['LOCKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];

export interface SkillBadge {
  skillSlug: string;
  skillName: string;
  ratingCount: number;
  averageRating: number; // 0 when no ratings
  tier: SkillBadgeTier;
  // Honest progress toward the *next* tier. null once PLATINUM is reached.
  next: {
    tier: Exclude<SkillBadgeTier, 'LOCKED'>;
    ratingsNeeded: number; // additional ratings required (0 if only avg is short)
    minAverage: number;    // average required for the next tier
    meetsAverage: boolean; // whether current average already clears the next tier
  } | null;
}

/**
 * Derive the badge tier for a single skill from its rating count and average.
 * Pure function — easy to unit test and reused by the aggregate query path.
 */
export function deriveSkillTier(ratingCount: number, averageRating: number): SkillBadgeTier {
  let earned: SkillBadgeTier = 'LOCKED';
  for (const rule of SKILL_TIER_RULES) {
    if (ratingCount >= rule.minRatings && averageRating >= rule.minAverage) {
      earned = rule.tier;
    }
  }
  return earned;
}

/**
 * Compute the "progress to next tier" descriptor for a skill, or null if the
 * skill is already at the top tier. Pure function.
 */
export function nextTierProgress(
  currentTier: SkillBadgeTier,
  ratingCount: number,
  averageRating: number,
): SkillBadge['next'] {
  const currentIdx = TIER_ORDER.indexOf(currentTier);
  const nextTier = TIER_ORDER[currentIdx + 1] as Exclude<SkillBadgeTier, 'LOCKED'> | undefined;
  if (!nextTier) return null; // already PLATINUM

  const rule = SKILL_TIER_RULES.find((r) => r.tier === nextTier)!;
  return {
    tier: nextTier,
    ratingsNeeded: Math.max(0, rule.minRatings - ratingCount),
    minAverage: rule.minAverage,
    meetsAverage: averageRating >= rule.minAverage,
  };
}

/**
 * Build a SkillBadge for a given aggregate. Pure helper combining the two
 * functions above plus rounding.
 */
export function buildSkillBadge(
  skillSlug: string,
  skillName: string,
  ratingCount: number,
  averageRating: number,
): SkillBadge {
  const avg = ratingCount > 0 ? Number(averageRating.toFixed(2)) : 0;
  const tier = deriveSkillTier(ratingCount, avg);
  return {
    skillSlug,
    skillName,
    ratingCount,
    averageRating: avg,
    tier,
    next: nextTierProgress(tier, ratingCount, avg),
  };
}

/**
 * Get all skill badges for a worker, derived live from SkillRating rows.
 * Sorted by tier (highest first), then rating count, then average.
 */
export async function getWorkerSkillBadges(workerId: string): Promise<SkillBadge[]> {
  const grouped = await prisma.skillRating.groupBy({
    by: ['skillSlug', 'skillName'],
    where: { workerId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const badges = grouped.map((g) =>
    buildSkillBadge(g.skillSlug, g.skillName, g._count._all, g._avg.rating ?? 0),
  );

  badges.sort((a, b) => {
    const t = TIER_ORDER.indexOf(b.tier) - TIER_ORDER.indexOf(a.tier);
    if (t !== 0) return t;
    if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
    return b.averageRating - a.averageRating;
  });

  return badges;
}

/**
 * Persist a batch of per-skill ratings for a completed quest. Idempotent per
 * (quest, rater, skill) via the unique constraint — re-submitting updates the
 * rating rather than creating a duplicate. Skill slugs are normalized so
 * "Lawn Mowing" and "lawn mowing" aggregate together.
 */
export interface SkillRatingInput {
  skillName: string;
  rating: number;
}

export function slugifySkill(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function recordSkillRatings(params: {
  questId: string;
  reviewId: string | null;
  raterId: string;
  workerId: string;
  skills: SkillRatingInput[];
}): Promise<number> {
  const { questId, reviewId, raterId, workerId, skills } = params;

  // De-duplicate by slug within the submission (last one wins) and drop blanks /
  // out-of-range ratings defensively.
  const bySlug = new Map<string, SkillRatingInput & { slug: string }>();
  for (const s of skills) {
    const name = (s.skillName || '').trim();
    const rating = Number(s.rating);
    if (!name) continue;
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) continue;
    const slug = slugifySkill(name);
    if (!slug) continue;
    bySlug.set(slug, { skillName: name, rating, slug });
  }

  let written = 0;
  for (const { slug, skillName, rating } of bySlug.values()) {
    await prisma.skillRating.upsert({
      where: { questId_raterId_skillSlug: { questId, raterId, skillSlug: slug } },
      update: { rating, skillName, reviewId },
      create: { questId, reviewId, raterId, workerId, skillSlug: slug, skillName, rating },
    });
    written++;
  }
  return written;
}
