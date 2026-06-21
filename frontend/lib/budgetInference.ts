import type { CategoryId } from './questInference';

// Deterministic, local budget recommendation for the client posting flow.
// No external AI/API and no keys: given the job details a poster has already
// entered (category, what they typed, timing, optional difficulty/urgency) we
// produce a rough local price range plus a short plain-language explanation.
// Every number here is a suggestion the poster can ignore or override — nothing
// is authoritative, and applying a suggestion is always an explicit click.

export type Difficulty = 'easy' | 'moderate' | 'hard';
export type Urgency = 'flexible' | 'soon' | 'urgent';

export interface BudgetInputs {
  // UI category id (matches CATEGORIES in PostQuestForm / questInference).
  category?: CategoryId | string | null;
  // Free text the poster typed (title + description work well combined).
  text?: string | null;
  // Optional explicit signals if the form collects them.
  difficulty?: Difficulty | null;
  urgency?: Urgency | null;
  // Hourly vs flat changes how we phrase the range, not the math.
  payType?: 'flat' | 'hourly' | null;
}

export interface BudgetRecommendation {
  min: number;
  max: number;
  // Human label for the category used, e.g. "yard work".
  categoryLabel: string;
  // Short "AI magic" sentence, e.g. "Typical local range: $80–$140 …".
  explanation: string;
  // Drivers we factored in, for an optional detail line.
  factors: string[];
}

// Base flat-rate range per category, in whole dollars. Centered on what a
// single straightforward local job tends to run; multipliers widen/shift it.
const CATEGORY_BASE: Record<string, { min: number; max: number; label: string }> = {
  yard:     { min: 60,  max: 120, label: 'yard work'        },
  hauling:  { min: 90,  max: 200, label: 'hauling & junk'   },
  moving:   { min: 120, max: 280, label: 'moving help'      },
  handyman: { min: 80,  max: 180, label: 'handyman work'    },
  cleaning: { min: 70,  max: 160, label: 'cleaning'         },
  painting: { min: 150, max: 400, label: 'painting'         },
  pressure: { min: 100, max: 220, label: 'pressure washing' },
  other:    { min: 50,  max: 140, label: 'odd jobs'         },
};

const DEFAULT_BASE = CATEGORY_BASE.other;

// Hourly suggestion is independent of job size — a local labor rate band.
const HOURLY_BASE = { min: 25, max: 55 };

const DIFFICULTY_FACTOR: Record<Difficulty, number> = {
  easy: 0.85,
  moderate: 1,
  hard: 1.3,
};

const DIFFICULTY_PHRASE: Record<Difficulty, string> = {
  easy: 'light effort',
  moderate: 'moderate effort',
  hard: 'heavy effort',
};

// Urgency nudges the floor up — rush jobs pay a bit more — without inflating
// the ceiling wildly.
const URGENCY_FACTOR: Record<Urgency, number> = {
  flexible: 1,
  soon: 1.05,
  urgent: 1.15,
};

const URGENCY_PHRASE: Record<Urgency, string> = {
  flexible: '',
  soon: 'a soon-ish timeline',
  urgent: 'a rush timeline',
};

// Keywords that hint the job is larger/smaller than a default single task.
// Matched on word boundaries against the combined text.
const SIZE_UP_KEYWORDS = [
  'large', 'big', 'huge', 'whole house', 'entire', 'multiple', 'several',
  'all day', 'full day', 'heavy', 'two story', 'two-story', 'commercial',
  'deep clean', 'move out', 'move-out', 'acre',
];
const SIZE_DOWN_KEYWORDS = [
  'small', 'quick', 'tiny', 'minor', 'just one', 'single', 'little',
  'short', '15 min', '30 min', 'half hour',
];

function clampRound(n: number): number {
  // Round to the nearest $5 so ranges read like real quotes.
  return Math.max(10, Math.round(n / 5) * 5);
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => {
    const re = new RegExp(`(^|[^a-z])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
    return re.test(text);
  });
}

function resolveBase(category?: string | null) {
  if (category && CATEGORY_BASE[category]) return CATEGORY_BASE[category];
  return DEFAULT_BASE;
}

// Main entry point. Pure function: same inputs => same recommendation.
export function recommendBudget(inputs: BudgetInputs): BudgetRecommendation {
  const text = (inputs.text ?? '').toLowerCase();
  const payType = inputs.payType ?? 'flat';
  const base = resolveBase(inputs.category ?? null);

  let { min, max } = payType === 'hourly' ? { ...HOURLY_BASE } : { min: base.min, max: base.max };
  const factors: string[] = [];

  // Difficulty multiplier (explicit signal beats text inference).
  const difficulty = inputs.difficulty ?? null;
  if (difficulty) {
    const f = DIFFICULTY_FACTOR[difficulty];
    min *= f;
    max *= f;
    if (DIFFICULTY_PHRASE[difficulty] !== 'moderate effort') {
      factors.push(DIFFICULTY_PHRASE[difficulty]);
    }
  }

  // Urgency lifts the range slightly.
  const urgency = inputs.urgency ?? null;
  if (urgency && URGENCY_FACTOR[urgency] !== 1) {
    const f = URGENCY_FACTOR[urgency];
    min *= f;
    max *= f;
    if (URGENCY_PHRASE[urgency]) factors.push(URGENCY_PHRASE[urgency]);
  }

  // Text-based size hints only apply to flat jobs (hourly already scales with
  // time). Size-up widens the ceiling; size-down trims the floor.
  if (payType !== 'hourly' && text) {
    if (hasKeyword(text, SIZE_UP_KEYWORDS)) {
      max *= 1.4;
      min *= 1.1;
      factors.push('a larger job');
    } else if (hasKeyword(text, SIZE_DOWN_KEYWORDS)) {
      min *= 0.8;
      max *= 0.85;
      factors.push('a small job');
    }
  }

  const minR = clampRound(min);
  let maxR = clampRound(max);
  // Guarantee a sensible spread even after rounding collisions.
  if (maxR <= minR) maxR = clampRound(minR * 1.5);

  const unit = payType === 'hourly' ? '/hr' : '';
  const factorTail = factors.length
    ? ` based on ${base.label}${factors.length ? ' + ' + factors.join(' + ') : ''}`
    : ` based on ${base.label}`;
  const explanation = `Typical local range: $${minR}–$${maxR}${unit}${factorTail}.`;

  return {
    min: minR,
    max: maxR,
    categoryLabel: base.label,
    explanation,
    factors,
  };
}
