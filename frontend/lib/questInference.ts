import type { RecurrenceCadence } from './types';

// Deterministic, keyword-based inference for the text-first quest posting flow.
// No external AI/API: a poster types what they need in plain language and we
// guess category, a likely title, one-time vs recurring, cadence, and a rough
// timing hint. Every guess is a suggestion the poster can override with the
// normal form fields — nothing here is authoritative.

// Category ids match the CATEGORIES list in PostQuestForm.
export type CategoryId =
  | 'yard'
  | 'hauling'
  | 'moving'
  | 'handyman'
  | 'cleaning'
  | 'painting'
  | 'pressure'
  | 'fencing'
  | 'other';

const CATEGORY_LABELS: Record<CategoryId, string> = {
  yard: 'Lawn & Yard',
  hauling: 'Hauling & Junk',
  moving: 'Moving Help',
  handyman: 'Handyman',
  cleaning: 'Cleaning',
  painting: 'Painting',
  pressure: 'Pressure Washing',
  fencing: 'Fencing',
  other: 'Odd Jobs',
};

// Ordered most-specific first so a stronger signal wins ties (e.g. "pressure
// wash the deck" should land on pressure washing, not handyman). Each keyword
// is matched on word boundaries to avoid substring false positives.
const CATEGORY_KEYWORDS: { id: CategoryId; keywords: string[] }[] = [
  { id: 'pressure', keywords: ['pressure wash', 'power wash', 'powerwash', 'pressurewash', 'driveway clean'] },
  { id: 'painting', keywords: ['paint', 'painting', 'repaint', 'primer', 'stain the', 'staining'] },
  { id: 'moving', keywords: ['move', 'moving', 'relocat', 'load the truck', 'unload', 'pack up', 'boxes'] },
  { id: 'hauling', keywords: ['haul', 'junk', 'dump run', 'debris', 'trash removal', 'dumpster', 'remove the old'] },
  {
    id: 'yard',
    keywords: [
      'lawn', 'mow', 'mowing', 'yard', 'weed', 'weeding', 'grass', 'hedge', 'hedges',
      'trim', 'trimming', 'prune', 'pruning', 'leaves', 'leaf', 'rake', 'raking',
      'garden', 'gardening', 'mulch', 'landscap', 'edging', 'sod',
    ],
  },
  {
    id: 'cleaning',
    keywords: [
      'clean', 'cleaning', 'tidy', 'vacuum', 'mop', 'scrub', 'dust', 'declutter',
      'deep clean', 'window', 'windows', 'gutter', 'gutters',
    ],
  },
  {
    id: 'fencing',
    keywords: [
      'fence', 'fencing', 't-post', 't post', 'tpost', 'woven wire', 'woven',
      'goat fence', 'field fence', 'no climb', 'no-climb', 'hog wire',
      'welded wire', 'chain link', 'chain-link', 'barbed wire', 'barb wire',
    ],
  },
  {
    id: 'handyman',
    keywords: [
      'fix', 'repair', 'install', 'mount', 'assemble', 'assembly', 'hang', 'drywall',
      'plumb', 'leak', 'faucet', 'door', 'shelf', 'shelves', 'handyman',
      'tighten', 'replace', 'patch',
    ],
  },
];

export type TimingHint = {
  // Raw phrase that triggered the hint, for display ("this weekend").
  phrase: string;
  // ISO yyyy-mm-dd when we can resolve a concrete date, else null.
  date: string | null;
};

export interface QuestInference {
  category: CategoryId | null;
  categoryLabel: string | null;
  title: string | null;
  isRecurring: boolean;
  cadence: RecurrenceCadence | null;
  timing: TimingHint | null;
}

const WEEKDAYS = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
];

function toIso(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Resolve a timing phrase to a concrete future date when it's unambiguous.
// `now` is injectable so the logic is deterministic and testable.
function inferTiming(text: string, now: Date): TimingHint | null {
  const lower = text.toLowerCase();

  if (/\btomorrow\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return { phrase: 'Tomorrow', date: toIso(d) };
  }
  if (/\btoday\b/.test(lower)) {
    return { phrase: 'Today', date: toIso(now) };
  }
  if (/\b(this weekend|weekend)\b/.test(lower)) {
    // Next Saturday (or today if it's already Saturday).
    const d = new Date(now);
    const day = d.getDay();
    const delta = (6 - day + 7) % 7;
    d.setDate(d.getDate() + delta);
    return { phrase: 'This weekend', date: toIso(d) };
  }
  if (/\bnext week\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return { phrase: 'Next week', date: toIso(d) };
  }

  for (let i = 0; i < WEEKDAYS.length; i++) {
    const re = new RegExp(`\\b(?:next\\s+)?${WEEKDAYS[i]}\\b`);
    if (re.test(lower)) {
      const d = new Date(now);
      const day = d.getDay();
      let delta = (i - day + 7) % 7;
      // Same-day match means "next <weekday>", a week out.
      if (delta === 0) delta = 7;
      d.setDate(d.getDate() + delta);
      const label = WEEKDAYS[i][0].toUpperCase() + WEEKDAYS[i].slice(1);
      return { phrase: label, date: toIso(d) };
    }
  }

  return null;
}

function inferCadence(text: string): RecurrenceCadence | null {
  const lower = text.toLowerCase();
  if (/\b(every other week|biweekly|bi-weekly|every two weeks|every 2 weeks)\b/.test(lower)) {
    return 'BIWEEKLY';
  }
  if (/\b(monthly|every month|once a month)\b/.test(lower)) return 'MONTHLY';
  if (/\b(weekly|every week|once a week|each week)\b/.test(lower)) return 'WEEKLY';
  // A bare weekday repeated implicitly ("every friday") reads as weekly.
  if (/\bevery\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.test(lower)) {
    return 'WEEKLY';
  }
  return null;
}

function inferRecurring(text: string, cadence: RecurrenceCadence | null): boolean {
  if (cadence) return true;
  const lower = text.toLowerCase();
  return /\b(recurring|regular|ongoing|repeat|every week|every month|each week|each month)\b/.test(lower);
}

function matchCategory(text: string): CategoryId | null {
  const lower = text.toLowerCase();
  for (const { id, keywords } of CATEGORY_KEYWORDS) {
    for (const kw of keywords) {
      // Word-boundary-ish match: keyword must be bounded by a non-letter or
      // string edge so "paint" doesn't fire on "painstaking".
      const re = new RegExp(`(^|[^a-z])${escapeRegExp(kw)}([^a-z]|$)`);
      if (re.test(lower)) return id;
    }
  }
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Build a short, title-cased title from the first sentence/clause of the input.
function inferTitle(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  // First sentence or first line, whichever comes first.
  const firstChunk = trimmed.split(/[.\n!?]/)[0].trim();
  const source = firstChunk || trimmed;
  const words = source.split(/\s+/).slice(0, 10);
  let title = words.join(' ');
  if (title.length > 80) title = title.slice(0, 77).trimEnd() + '…';
  // Capitalize first letter; leave the rest as the poster typed it.
  return title.charAt(0).toUpperCase() + title.slice(1);
}

// Main entry point. Pure function: same text + same `now` => same result.
export function inferQuestFromText(text: string, now: Date = new Date()): QuestInference {
  const category = matchCategory(text);
  const cadence = inferCadence(text);
  const isRecurring = inferRecurring(text, cadence);
  return {
    category,
    categoryLabel: category ? CATEGORY_LABELS[category] : null,
    title: inferTitle(text),
    isRecurring,
    // Only surface a cadence when the job actually repeats.
    cadence: isRecurring ? cadence ?? 'WEEKLY' : null,
    timing: inferTiming(text, now),
  };
}

const CADENCE_SUMMARY: Record<RecurrenceCadence, string> = {
  WEEKLY: 'Weekly',
  BIWEEKLY: 'Every 2 weeks',
  MONTHLY: 'Monthly',
};

// One-line "Looks like: …" summary for the confirmation UI. Returns '' when we
// have nothing useful to show.
export function summarizeInference(inf: QuestInference): string {
  const parts: string[] = [];
  if (inf.categoryLabel) parts.push(inf.categoryLabel);
  if (inf.isRecurring && inf.cadence) parts.push(CADENCE_SUMMARY[inf.cadence]);
  else if (inf.isRecurring) parts.push('Recurring');
  if (inf.timing) parts.push(inf.timing.phrase);
  return parts.join(' · ');
}
