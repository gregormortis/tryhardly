import { prisma } from '../lib/prisma';
import {
  isApprovalStillValid,
  canYouthBidOnCategory,
  ageFromDateOfBirth,
  isYouthAge,
  type CurrentJobDetails,
} from '../config/youthPolicy';

// ─── Per-job parental approval ──────────────────────────────────────────────
//
// A household minor may not start a job until the adult on the account has
// approved that specific job: that address, that day, that customer.
//
// This is the load-bearing safety mechanism of the whole young-worker feature.
// One-time consent at signup tells a parent nothing about where their kid will
// actually be on Saturday morning. So the gate is per job, and it is enforced
// server-side at the point the job would otherwise become live — not by hiding
// a button.
//
// TryHardly performs NO sex offender registry check and must not: California
// Penal Code 290.46(j)(2)(H) makes it a prohibited use to apply registry data
// to services provided by a business establishment. The parent is shown the
// address and linked to the official state site; the judgement is theirs. See
// config/youthPolicy.ts for the full reasoning and penalties.

export interface ApprovalState {
  required: boolean;
  approved: boolean;
  // Present when an approval existed but no longer matches the job.
  staleBecause?: 'address' | 'scheduledFor' | 'scheduleNote';
  approvalId?: string;
  minorFirstName?: string;
  reason?: string;
}

/**
 * Whether this account is one where an under-18 does the work.
 * Cheap single-field read; the flag is maintained when minors are added or
 * deactivated.
 */
export async function isHouseholdAccount(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { isHouseholdAccount: true },
  });
  return Boolean(u?.isHouseholdAccount);
}

/**
 * Recompute the denormalized household flag from the actual minor rows.
 * Called whenever a minor is added, deactivated, or ages out, so the flag can
 * never drift from reality.
 */
export async function refreshHouseholdFlag(accountId: string): Promise<boolean> {
  const activeCount = await prisma.householdMinor.count({
    where: { accountId, active: true },
  });
  const isHousehold = activeCount > 0;
  await prisma.user.update({
    where: { id: accountId },
    data: { isHouseholdAccount: isHousehold },
  });
  return isHousehold;
}

/**
 * Deactivate any household minor who has turned 18, and refresh the flag.
 *
 * Without this the restrictions would follow someone past their eighteenth
 * birthday, which is both wrong and the kind of thing that quietly makes people
 * abandon the account and open an adult one — losing the record they built.
 */
export async function ageOutAdults(accountId: string): Promise<number> {
  const minors = await prisma.householdMinor.findMany({
    where: { accountId, active: true },
    select: { id: true, dateOfBirth: true },
  });
  const nowAdult = minors.filter((m) => !isYouthAge(ageFromDateOfBirth(m.dateOfBirth)));
  if (nowAdult.length > 0) {
    await prisma.householdMinor.updateMany({
      where: { id: { in: nowAdult.map((m) => m.id) } },
      data: { active: false },
    });
    await refreshHouseholdFlag(accountId);
  }
  return nowAdult.length;
}

/**
 * The approval state for a job assigned to a household account.
 *
 * Returns `required: false` for ordinary adult accounts, so callers can apply
 * this unconditionally without branching on account type.
 */
export async function getApprovalState(
  questId: string,
  workerAccountId: string,
  current: CurrentJobDetails,
): Promise<ApprovalState> {
  if (!(await isHouseholdAccount(workerAccountId))) {
    return { required: false, approved: true };
  }

  const approval = await prisma.minorJobApproval.findFirst({
    where: { questId, revokedAt: null, minor: { accountId: workerAccountId } },
    include: { minor: { select: { firstName: true, active: true } } },
    orderBy: { approvedAt: 'desc' },
  });

  if (!approval) {
    return {
      required: true,
      approved: false,
      reason:
        'A parent or guardian on this account needs to approve this specific job before work starts.',
    };
  }

  if (!approval.minor.active) {
    return {
      required: true,
      approved: false,
      reason: 'The young worker on this approval is no longer active on the account.',
    };
  }

  const check = isApprovalStillValid(
    {
      addressAtApproval: approval.addressAtApproval,
      scheduleAtApproval: approval.scheduleAtApproval,
      scheduleNoteAtApproval: approval.scheduleNoteAtApproval,
    },
    current,
  );

  if (!check.valid) {
    return {
      required: true,
      approved: false,
      staleBecause: check.changed as ApprovalState['staleBecause'],
      approvalId: approval.id,
      minorFirstName: approval.minor.firstName,
      reason:
        check.changed === 'address'
          ? 'The job address changed after this was approved. A parent needs to approve the new address before work starts.'
          : 'The schedule changed after this was approved. A parent needs to approve the new time before work starts.',
    };
  }

  return {
    required: true,
    approved: true,
    approvalId: approval.id,
    minorFirstName: approval.minor.firstName,
  };
}

/**
 * Revoke approvals that no longer match the job.
 *
 * Called when a job's address or schedule changes. Revoking rather than
 * silently failing the validity check means the parent gets told, instead of
 * the job quietly becoming un-startable for reasons nobody can see.
 */
export async function revokeStaleApprovals(
  questId: string,
  current: CurrentJobDetails,
): Promise<string[]> {
  const live = await prisma.minorJobApproval.findMany({
    where: { questId, revokedAt: null },
  });

  const stale = live.filter(
    (a) =>
      !isApprovalStillValid(
        {
          addressAtApproval: a.addressAtApproval,
          scheduleAtApproval: a.scheduleAtApproval,
          scheduleNoteAtApproval: a.scheduleNoteAtApproval,
        },
        current,
      ).valid,
  );

  for (const a of stale) {
    await prisma.minorJobApproval.update({
      where: { id: a.id },
      data: {
        revokedAt: new Date(),
        revokedReason:
          'The job details changed after approval, so it needs approving again.',
      },
    });
  }
  return stale.map((a) => a.id);
}

/**
 * Whether a household account may bid on this job at all.
 *
 * Category eligibility is checked at bid time; this exists so the same rule can
 * be applied at approval time too. A category can be closed to minors between a
 * bid and an approval, and the later gate should catch it.
 */
export function canHouseholdBid(category: string | null | undefined) {
  return canYouthBidOnCategory(category);
}
