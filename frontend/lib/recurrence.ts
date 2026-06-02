import type { RecurrenceCadence } from './types';

// Recurring booking is a scheduling/visibility template. It does not charge or
// hold money — each occurrence is a normal per-task marketplace payout on
// completion. These helpers only format the cadence for display.

export const CADENCE_OPTIONS: { value: RecurrenceCadence; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const CADENCE_NOUN: Record<RecurrenceCadence, string> = {
  WEEKLY: 'week',
  BIWEEKLY: '2 weeks',
  MONTHLY: 'month',
};

const CADENCE_LABEL: Record<RecurrenceCadence, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Biweekly',
  MONTHLY: 'Monthly',
};

// Short human label for a cadence + interval, e.g. "Weekly", "Every 3 weeks".
export function cadenceLabel(
  cadence: RecurrenceCadence | null | undefined,
  interval = 1,
): string {
  if (!cadence) return '';
  if (!interval || interval <= 1) return CADENCE_LABEL[cadence];
  return `Every ${interval} ${pluralNoun(CADENCE_NOUN[cadence], interval)}`;
}

function pluralNoun(noun: string, interval: number): string {
  // "2 weeks" already reads plural; only the single-unit nouns need an s.
  if (noun === 'week') return interval > 1 ? 'weeks' : 'week';
  if (noun === 'month') return interval > 1 ? 'months' : 'month';
  return noun;
}

// One-line summary including bounds, e.g. "Repeats weekly · ends Dec 31, 2026".
export function recurrenceSummary(quest: {
  recurrenceCadence?: RecurrenceCadence | null;
  recurrenceInterval?: number;
  recurrenceEndDate?: string | null;
  recurrenceCount?: number | null;
}): string {
  const label = cadenceLabel(quest.recurrenceCadence, quest.recurrenceInterval);
  if (!label) return '';
  const parts = [`Repeats ${label.toLowerCase()}`];
  if (quest.recurrenceCount) parts.push(`${quest.recurrenceCount} times`);
  if (quest.recurrenceEndDate) {
    parts.push(`until ${new Date(quest.recurrenceEndDate).toLocaleDateString()}`);
  }
  return parts.join(' · ');
}
