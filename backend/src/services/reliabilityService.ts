import { prisma } from '../lib/prisma';

// ─── Two-sided reliability ──────────────────────────────────────────────────
//
// Angi, Thumbtack, and Bark all score the worker. None of them score the
// customer. Yet ask any local contractor what wastes their week and they will
// describe the customer who booked and then vanished.
//
// So this scores both, from events that actually happened rather than
// opinions: handshakes honored versus broken. Reviews already cover quality;
// this covers the more basic question of whether someone does what they said
// they would.
//
// Design constraints
// ------------------
// 1. No score until there is evidence. A worker with one honored job is not
//    "100% reliable", and displaying that would be the same over-claiming that
//    cost Angi $100,000 in Vermont. Below MIN_EVENTS this returns null and the
//    UI shows nothing at all.
// 2. Cancelling with notice is not the same as a no-show. Both are BROKEN
//    rows, but the reason and timing are retained so the two can be told apart
//    rather than collapsed into one number.
// 3. Never punish someone for the other side's failure. A worker whose
//    customer cancelled is not less reliable, so each broken handshake counts
//    only against whoever broke it.

export const MIN_EVENTS_FOR_SCORE = 3;

export interface ReliabilityStats {
  honored: number;
  broken: number;
  // Total resolved handshakes this user was party to.
  total: number;
  // 0–100, or null when there is not enough history to say anything honest.
  score: number | null;
  // Plain-language summary for display. Null when score is null.
  label: string | null;
}

function label(score: number): string {
  if (score >= 95) return 'Always shows up';
  if (score >= 85) return 'Reliable';
  if (score >= 70) return 'Usually shows up';
  return 'Mixed record';
}

/**
 * Reliability for one user, across both roles.
 *
 * A "resolved" handshake is one that reached HONORED or BROKEN. PROPOSED,
 * AGREED, DECLINED, and SUPERSEDED rows are all excluded: declining or
 * renegotiating terms is ordinary negotiation and must not look like a
 * reliability failure, or people will stop negotiating openly.
 */
export async function getReliability(userId: string): Promise<ReliabilityStats> {
  const [honored, brokenByThisUser, brokenAgainstThisUser] = await Promise.all([
    prisma.handshake.count({
      where: {
        status: 'HONORED',
        OR: [{ posterId: userId }, { workerId: userId }],
      },
    }),
    prisma.handshake.count({
      where: { status: 'BROKEN', brokenById: userId },
    }),
    // Counted for context only. Deliberately NOT part of the score: being let
    // down by someone else says nothing about your own reliability.
    prisma.handshake.count({
      where: {
        status: 'BROKEN',
        brokenById: { not: userId },
        OR: [{ posterId: userId }, { workerId: userId }],
      },
    }),
  ]);

  void brokenAgainstThisUser;

  const total = honored + brokenByThisUser;
  if (total < MIN_EVENTS_FOR_SCORE) {
    return { honored, broken: brokenByThisUser, total, score: null, label: null };
  }

  const score = Math.round((honored / total) * 100);
  return { honored, broken: brokenByThisUser, total, score, label: label(score) };
}

/**
 * Batch variant, so a job board showing twenty bidders does not fire twenty
 * pairs of queries. Returns a map keyed by user id.
 */
export async function getReliabilityForMany(
  userIds: string[],
): Promise<Record<string, ReliabilityStats>> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return {};

  const rows = await prisma.handshake.findMany({
    where: {
      status: { in: ['HONORED', 'BROKEN'] },
      OR: [{ posterId: { in: unique } }, { workerId: { in: unique } }],
    },
    select: { posterId: true, workerId: true, status: true, brokenById: true },
  });

  const tally: Record<string, { honored: number; broken: number }> = {};
  for (const id of unique) tally[id] = { honored: 0, broken: 0 };

  for (const row of rows) {
    for (const party of [row.posterId, row.workerId]) {
      if (!tally[party]) continue;
      if (row.status === 'HONORED') tally[party].honored += 1;
      else if (row.status === 'BROKEN' && row.brokenById === party) tally[party].broken += 1;
    }
  }

  const out: Record<string, ReliabilityStats> = {};
  for (const id of unique) {
    const { honored, broken } = tally[id];
    const total = honored + broken;
    out[id] =
      total < MIN_EVENTS_FOR_SCORE
        ? { honored, broken, total, score: null, label: null }
        : {
            honored,
            broken,
            total,
            score: Math.round((honored / total) * 100),
            label: label(Math.round((honored / total) * 100)),
          };
  }
  return out;
}
