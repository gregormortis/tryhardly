import { prisma } from '../app';

// ─── Worker Passport ──────────────────────────────────────────────────────────
//
// A public, trust-first snapshot of a worker's real track record on TryHardly.
// Every figure is derived from data the worker actually generated — completed
// jobs, submitted bids, published service packages, verified credentials, etc.
// Nothing here is fabricated, gamified, or inflated, and no money/insurance
// claims are made. If a metric can't be derived safely it is simply omitted.
//
// This mirrors the read-only, pure-builder + DB-gatherer style of
// verifiedProService so the numbers stay consistent and the logic is testable
// without a database.

export interface WorkerPassportSignals {
  memberSince: Date;
  completedJobs: number;
  applicationsSubmitted: number;
  activeServicePackages: number;
  codeOfCraftPledged: boolean;
  payoutAccountConnected: boolean;
  verifiedCredentials: number;
  pendingCredentials: number;
  ratingCount: number;
  averageRating: number | null;
  repeatCustomers: number;
  guildName: string | null;
}

// A single labeled reliability signal for display. `value` is pre-formatted for
// the UI; `available` lets the client hide a signal we couldn't derive rather
// than show a misleading zero.
export interface PassportStat {
  key: string;
  label: string;
  value: string;
  available: boolean;
}

export interface WorkerPassport {
  memberSince: string; // ISO date
  // Headline proof-of-work tallies.
  completedJobs: number;
  applicationsSubmitted: number;
  activeServicePackages: number;
  repeatCustomers: number;
  // Reliability signals.
  ratingCount: number;
  averageRating: number | null;
  // Verification / trust flags (booleans + counts only — never PII).
  codeOfCraftPledged: boolean;
  payoutAccountConnected: boolean;
  verifiedCredentials: number;
  pendingCredentials: number;
  guildPath: string | null;
  // Flattened, display-ready list the frontend can map over directly.
  stats: PassportStat[];
}

function pluralizeReviews(n: number): string {
  return `${n} review${n === 1 ? '' : 's'}`;
}

/**
 * Build the public Worker Passport from real signals. Pure function — no DB —
 * so it's trivial to test. Only signals that can be derived honestly are marked
 * `available`; the rest are still returned (as 0 / null) but flagged so the UI
 * can omit them instead of implying a worker has, say, "0.0★".
 */
export function buildWorkerPassport(s: WorkerPassportSignals): WorkerPassport {
  const stats: PassportStat[] = [
    {
      key: 'completedJobs',
      label: 'Completed jobs',
      value: String(s.completedJobs),
      available: true,
    },
    {
      key: 'repeatCustomers',
      label: 'Repeat customers',
      value: String(s.repeatCustomers),
      available: s.repeatCustomers > 0,
    },
    {
      key: 'rating',
      label: 'Average rating',
      value:
        s.ratingCount > 0 && s.averageRating != null
          ? `${s.averageRating.toFixed(1)}★ (${pluralizeReviews(s.ratingCount)})`
          : 'No reviews yet',
      available: s.ratingCount > 0 && s.averageRating != null,
    },
    {
      key: 'applicationsSubmitted',
      label: 'Bids submitted',
      value: String(s.applicationsSubmitted),
      available: s.applicationsSubmitted > 0,
    },
    {
      key: 'activeServicePackages',
      label: 'Active service packages',
      value: String(s.activeServicePackages),
      available: s.activeServicePackages > 0,
    },
    {
      key: 'verifiedCredentials',
      label: 'Verified credentials',
      value:
        s.pendingCredentials > 0
          ? `${s.verifiedCredentials} verified · ${s.pendingCredentials} pending`
          : String(s.verifiedCredentials),
      available: s.verifiedCredentials > 0 || s.pendingCredentials > 0,
    },
    {
      key: 'codeOfCraft',
      label: 'Code of Craft',
      value: s.codeOfCraftPledged ? 'Pledged' : 'Not pledged',
      available: s.codeOfCraftPledged,
    },
    {
      key: 'payoutConnected',
      label: 'Payout account connected',
      value: s.payoutAccountConnected ? 'Connected' : 'Not connected',
      available: s.payoutAccountConnected,
    },
    {
      key: 'guildPath',
      label: 'Guild path',
      value: s.guildName ?? '—',
      available: !!s.guildName,
    },
  ];

  return {
    memberSince: s.memberSince.toISOString(),
    completedJobs: s.completedJobs,
    applicationsSubmitted: s.applicationsSubmitted,
    activeServicePackages: s.activeServicePackages,
    repeatCustomers: s.repeatCustomers,
    ratingCount: s.ratingCount,
    averageRating: s.ratingCount > 0 ? s.averageRating : null,
    codeOfCraftPledged: s.codeOfCraftPledged,
    payoutAccountConnected: s.payoutAccountConnected,
    verifiedCredentials: s.verifiedCredentials,
    pendingCredentials: s.pendingCredentials,
    guildPath: s.guildName,
    stats,
  };
}

/**
 * Count how many distinct job-posters have had MORE THAN ONE completed job with
 * this worker. A repeat customer is a real loyalty signal, so we derive it from
 * COMPLETED quests grouped by poster and count groups with size >= 2.
 */
async function countRepeatCustomers(userId: string): Promise<number> {
  const grouped = await prisma.quest.groupBy({
    by: ['questGiverId'],
    where: { assignedAdventurerId: userId, status: 'COMPLETED' },
    _count: { _all: true },
  });
  return grouped.filter((g) => g._count._all >= 2).length;
}

/**
 * Gather a worker's Worker Passport from the database. Read-only; derives
 * everything from existing relations (no schema change). Throws if the user
 * doesn't exist (caller maps that to 404).
 */
export async function getWorkerPassport(userId: string): Promise<WorkerPassport> {
  const [user, applicationsSubmitted, activeServicePackages, verifiedCredentials, pendingCredentials, ratingAgg, repeatCustomers] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          createdAt: true,
          totalQuestsCompleted: true,
          codeOfCraftPledgedAt: true,
          stripeAccountId: true,
          guild: { select: { name: true } },
        },
      }),
      prisma.application.count({ where: { adventurerId: userId } }),
      prisma.servicePackage.count({ where: { userId, active: true } }),
      prisma.professionalCredential.count({ where: { userId, status: 'VERIFIED' } }),
      prisma.professionalCredential.count({ where: { userId, status: 'PENDING' } }),
      prisma.review.aggregate({
        where: { revieweeId: userId },
        _avg: { rating: true },
        _count: true,
      }),
      countRepeatCustomers(userId),
    ]);

  return buildWorkerPassport({
    memberSince: user.createdAt,
    completedJobs: user.totalQuestsCompleted,
    applicationsSubmitted,
    activeServicePackages,
    codeOfCraftPledged: user.codeOfCraftPledgedAt != null,
    payoutAccountConnected: !!user.stripeAccountId,
    verifiedCredentials,
    pendingCredentials,
    ratingCount: ratingAgg._count,
    averageRating: ratingAgg._avg.rating ?? null,
    repeatCustomers,
    guildName: user.guild?.name ?? null,
  });
}
