// Plain-language labels for the decision info on a questboard card: when the
// poster needs the work done, and how contested the job already is.

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Jobs without a deadline are common, so this returns "Flexible timing" rather
// than an empty string — timing is one of the first things a worker checks, and a
// blank row reads as missing data.
export function timingLabel(deadline?: string | null): string {
  if (!deadline) return 'Flexible timing';
  const due = new Date(deadline);
  const t = due.getTime();
  if (Number.isNaN(t)) return 'Flexible timing';
  // Deadlines are picked as calendar dates, so compare midnight-to-midnight —
  // otherwise a deadline six hours out rounds up and reads as "tomorrow".
  const days = Math.round((startOfDay(due) - startOfDay(new Date())) / 86400000);
  if (days < 0) return 'Deadline passed';
  if (days === 0) return 'Needed today';
  if (days === 1) return 'Needed by tomorrow';
  if (days <= 14) return `Needed within ${days} days`;
  return `Needed by ${new Date(t).toLocaleDateString()}`;
}

export function bidCountLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return 'No bids yet';
  return count === 1 ? '1 bid' : `${count} bids`;
}
