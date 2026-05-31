import { prisma } from '../app';
import { gatherProgressionSignals } from './progressionService';

// ─── Verified Pro ─────────────────────────────────────────────────────────────
// A derived, honest trust signal layered on top of the existing progression
// system. It is NOT the same as the account-level `verified` flag (which an
// admin sets) — conflating the two would let a basic account verification read
// as a fully-vetted professional. Instead, Verified Pro is computed from real
// signals the worker has actually earned, and exposed as `verifiedProEligible`.
//
// Nothing here mutates state or awards anything: it only reports progress
// against a transparent checklist so a worker can see what they still owe and a
// client can trust the badge means what it says.

// Thresholds for the completed-jobs / reviews part of the checklist. Kept
// deliberately modest for an MVP — the brief allows showing progress rather
// than auto-awarding when the bar is high. These reuse the same real signals
// the progression ladder is built from.
export const VERIFIED_PRO_GATES = {
  minCompletedJobs: 3,
  minRatingCount: 3,
  minAvgRating: 4.0,
  // "clean record": no severe (upheld SCAM/HARASSMENT) disputes on record.
  maxRecentSevereDisputes: 0,
} as const;

export interface VerifiedProCheckItem {
  key: string;
  label: string;
  met: boolean;
  // Honest human-readable progress, e.g. "2 / 3 completed jobs".
  detail: string;
}

export interface VerifiedProStatus {
  eligible: boolean;
  // How many of the checklist items are satisfied (for a progress bar).
  metCount: number;
  totalCount: number;
  checklist: VerifiedProCheckItem[];
}

// A profile is "complete" when it carries enough for a client to evaluate the
// worker: a bio and at least one featured skill or professional detail. These
// are all already-existing, additive fields — no new requirements invented.
export interface ProfileCompletenessInput {
  bio: string | null;
  businessName: string | null;
  serviceArea: string | null;
  yearsExperience: number | null;
  favoriteSkills: string[];
}

export function isProfileComplete(p: ProfileCompletenessInput): boolean {
  const hasBio = !!(p.bio && p.bio.trim().length >= 20);
  const hasDetail =
    !!(p.businessName && p.businessName.trim()) ||
    !!(p.serviceArea && p.serviceArea.trim()) ||
    (p.yearsExperience != null && p.yearsExperience >= 0) ||
    (Array.isArray(p.favoriteSkills) && p.favoriteSkills.length > 0);
  return hasBio && hasDetail;
}

// Inputs needed to build the checklist. Kept as a plain interface so the pure
// builder is trivially testable without a database.
export interface VerifiedProSignals {
  profileComplete: boolean;
  codeOfCraftPledged: boolean;
  verifiedCredentials: number;
  accountVerified: boolean; // admin-set account verification (alternative path)
  completedJobs: number;
  ratingCount: number;
  averageRating: number | null;
  recentSevereDisputes: number;
}

/**
 * Build the Verified Pro checklist + eligibility from real signals. Pure
 * function — no DB access — so it is easy to test and reason about.
 *
 * A worker is Verified Pro eligible when ALL of:
 *   1. profile is complete
 *   2. they have pledged to the Code of Craft
 *   3. they hold at least one verified credential OR have admin account
 *      verification (the brief's "OR admin verification where applicable")
 *   4. completed-jobs / reviews thresholds are met
 *   5. clean record — no severe disputes
 */
export function buildVerifiedProStatus(s: VerifiedProSignals): VerifiedProStatus {
  const avg = s.averageRating ?? 0;
  const g = VERIFIED_PRO_GATES;

  const credentialMet = s.verifiedCredentials > 0 || s.accountVerified;
  const jobsMet = s.completedJobs >= g.minCompletedJobs;
  const reviewsMet = s.ratingCount >= g.minRatingCount && avg >= g.minAvgRating;
  const cleanMet = s.recentSevereDisputes <= g.maxRecentSevereDisputes;

  const checklist: VerifiedProCheckItem[] = [
    {
      key: 'profile',
      label: 'Complete your profile',
      met: s.profileComplete,
      detail: s.profileComplete
        ? 'Profile complete'
        : 'Add a bio (20+ chars) and at least one professional detail or featured skill',
    },
    {
      key: 'pledge',
      label: 'Pledge to the Code of Craft',
      met: s.codeOfCraftPledged,
      detail: s.codeOfCraftPledged ? 'Pledged' : 'Not yet pledged',
    },
    {
      key: 'credential',
      label: 'Verify a credential (or hold account verification)',
      met: credentialMet,
      detail: credentialMet
        ? s.verifiedCredentials > 0
          ? `${s.verifiedCredentials} verified credential${s.verifiedCredentials === 1 ? '' : 's'}`
          : 'Account verified by TryHardly'
        : 'No verified credential yet',
    },
    {
      key: 'jobs',
      label: `Complete ${g.minCompletedJobs}+ jobs`,
      met: jobsMet,
      detail: `${s.completedJobs} / ${g.minCompletedJobs} completed jobs`,
    },
    {
      key: 'reviews',
      label: `Earn a ${g.minAvgRating.toFixed(1)}★+ average across ${g.minRatingCount}+ reviews`,
      met: reviewsMet,
      detail:
        s.ratingCount > 0
          ? `${avg.toFixed(1)}★ across ${s.ratingCount} review${s.ratingCount === 1 ? '' : 's'}`
          : 'No reviews yet',
    },
    {
      key: 'clean',
      label: 'Clean record — no unresolved disputes',
      met: cleanMet,
      detail: cleanMet ? 'Clean record' : `${s.recentSevereDisputes} severe dispute(s) on record`,
    },
  ];

  const metCount = checklist.filter((c) => c.met).length;
  return {
    eligible: checklist.every((c) => c.met),
    metCount,
    totalCount: checklist.length,
    checklist,
  };
}

/**
 * Gather Verified Pro signals for a worker and build their status. Read-only.
 * Reuses the progression signal aggregation so the numbers always match the
 * rank ladder a worker sees elsewhere.
 */
export async function getVerifiedProStatus(userId: string): Promise<VerifiedProStatus> {
  const [user, signals] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        bio: true,
        businessName: true,
        serviceArea: true,
        yearsExperience: true,
        favoriteSkills: true,
        verified: true,
        codeOfCraftPledgedAt: true,
      },
    }),
    gatherProgressionSignals(userId),
  ]);

  return buildVerifiedProStatus({
    profileComplete: isProfileComplete(user),
    codeOfCraftPledged: user.codeOfCraftPledgedAt != null,
    verifiedCredentials: signals.verifiedCredentials,
    accountVerified: user.verified,
    completedJobs: signals.completedJobs,
    ratingCount: signals.ratingCount,
    averageRating: signals.averageRating,
    recentSevereDisputes: signals.recentSevereDisputes,
  });
}
