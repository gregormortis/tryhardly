// Small, honest time helpers for trust signals (recency proof, responsiveness).
// Every duration is phrased as "within X" so rounding never overstates the
// underlying data.

/**
 * Format a millisecond delay as a rounded, honest duration phrase, e.g.
 * "under a minute", "12 minutes", "3 hours", "2 days". Returns null for
 * invalid or negative input so callers can hide the signal instead of
 * displaying nonsense.
 */
export function formatBidDelay(ms: number): string | null {
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'under a minute';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/**
 * Count items whose ISO date falls within the last `days` days. Items with a
 * missing or unparsable date are excluded. `now` is injectable for tests.
 */
export function countRecent<T>(
  items: T[],
  getDate: (item: T) => string | null | undefined,
  days: number,
  now: number = Date.now()
): number {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  let count = 0;
  for (const item of items) {
    const raw = getDate(item);
    if (!raw) continue;
    const t = new Date(raw).getTime();
    if (Number.isFinite(t) && t >= cutoff) count++;
  }
  return count;
}
