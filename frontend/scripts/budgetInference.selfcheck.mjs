// Dependency-free self-check for lib/budgetInference.ts.
//
// The repo has no test runner wired (no jest/vitest, node_modules absent), so
// this script mirrors the pure logic of recommendBudget() and asserts the
// documented examples. Run with: `node scripts/budgetInference.selfcheck.mjs`.
// If lib/budgetInference.ts changes, update this mirror to match — it exists to
// prove the heuristic behaves as described without a build step.

import assert from 'node:assert/strict';

// ── Mirror of lib/budgetInference.ts (keep in sync) ──────────────────────────

const CATEGORY_BASE = {
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
const HOURLY_BASE = { min: 25, max: 55 };
const DIFFICULTY_FACTOR = { easy: 0.85, moderate: 1, hard: 1.3 };
const DIFFICULTY_PHRASE = { easy: 'light effort', moderate: 'moderate effort', hard: 'heavy effort' };
const URGENCY_FACTOR = { flexible: 1, soon: 1.05, urgent: 1.15 };
const URGENCY_PHRASE = { flexible: '', soon: 'a soon-ish timeline', urgent: 'a rush timeline' };
const SIZE_UP_KEYWORDS = [
  'large', 'big', 'huge', 'whole house', 'entire', 'multiple', 'several',
  'all day', 'full day', 'heavy', 'two story', 'two-story', 'commercial',
  'deep clean', 'move out', 'move-out', 'acre',
];
const SIZE_DOWN_KEYWORDS = [
  'small', 'quick', 'tiny', 'minor', 'just one', 'single', 'little',
  'short', '15 min', '30 min', 'half hour',
];

function clampRound(n) {
  return Math.max(10, Math.round(n / 5) * 5);
}
function hasKeyword(text, keywords) {
  return keywords.some((kw) => {
    const re = new RegExp(`(^|[^a-z])${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`);
    return re.test(text);
  });
}
function resolveBase(category) {
  if (category && CATEGORY_BASE[category]) return CATEGORY_BASE[category];
  return DEFAULT_BASE;
}
function recommendBudget(inputs) {
  const text = (inputs.text ?? '').toLowerCase();
  const payType = inputs.payType ?? 'flat';
  const base = resolveBase(inputs.category ?? null);
  let { min, max } = payType === 'hourly' ? { ...HOURLY_BASE } : { min: base.min, max: base.max };
  const factors = [];
  const difficulty = inputs.difficulty ?? null;
  if (difficulty) {
    const f = DIFFICULTY_FACTOR[difficulty];
    min *= f; max *= f;
    if (DIFFICULTY_PHRASE[difficulty] !== 'moderate effort') factors.push(DIFFICULTY_PHRASE[difficulty]);
  }
  const urgency = inputs.urgency ?? null;
  if (urgency && URGENCY_FACTOR[urgency] !== 1) {
    const f = URGENCY_FACTOR[urgency];
    min *= f; max *= f;
    if (URGENCY_PHRASE[urgency]) factors.push(URGENCY_PHRASE[urgency]);
  }
  if (payType !== 'hourly' && text) {
    if (hasKeyword(text, SIZE_UP_KEYWORDS)) { max *= 1.4; min *= 1.1; factors.push('a larger job'); }
    else if (hasKeyword(text, SIZE_DOWN_KEYWORDS)) { min *= 0.8; max *= 0.85; factors.push('a small job'); }
  }
  const minR = clampRound(min);
  let maxR = clampRound(max);
  if (maxR <= minR) maxR = clampRound(minR * 1.5);
  const unit = payType === 'hourly' ? '/hr' : '';
  const factorTail = ` based on ${base.label}${factors.length ? ' + ' + factors.join(' + ') : ''}`;
  const explanation = `Typical local range: $${minR}–$${maxR}${unit}${factorTail}.`;
  return { min: minR, max: maxR, categoryLabel: base.label, explanation, factors };
}

// ── Assertions ───────────────────────────────────────────────────────────────

let n = 0;
const examples = [];
function check(label, inputs, expect) {
  const r = recommendBudget(inputs);
  examples.push({ label, inputs, out: r });
  if (expect) expect(r);
  n++;
}

// Plain yard work, moderate, flat.
check('yard / moderate', { category: 'yard', difficulty: 'moderate', text: 'mow the lawn' }, (r) => {
  assert.equal(r.min, 60);
  assert.equal(r.max, 120);
  assert.equal(r.categoryLabel, 'yard work');
});

// Yard + larger job widens ceiling and floor.
check('yard / large job', { category: 'yard', text: 'mow a large two-story property, whole house lot' }, (r) => {
  assert.ok(r.max > 120, 'large job should raise the ceiling');
  assert.ok(r.factors.includes('a larger job'));
});

// Hard difficulty scales both ends up.
check('handyman / hard', { category: 'handyman', difficulty: 'hard', text: 'fix it' }, (r) => {
  assert.ok(r.min >= 100 && r.max >= 230, 'hard work should scale up');
  assert.ok(r.factors.includes('heavy effort'));
});

// Urgent lifts the range and is named.
check('cleaning / urgent', { category: 'cleaning', urgency: 'urgent', text: 'clean apartment' }, (r) => {
  assert.ok(r.factors.includes('a rush timeline'));
  assert.ok(r.min >= 70);
});

// Small job trims the floor.
check('handyman / small', { category: 'handyman', text: 'quick small fix, just one shelf' }, (r) => {
  assert.ok(r.factors.includes('a small job'));
  assert.ok(r.min < 80, 'small job should lower the floor below base');
});

// Hourly pay produces an hourly band with /hr unit and ignores size keywords.
check('moving / hourly', { category: 'moving', payType: 'hourly', text: 'big multiple-room move' }, (r) => {
  assert.equal(r.min, 25);
  assert.equal(r.max, 55);
  assert.ok(r.explanation.includes('/hr'));
});

// Unknown / missing category falls back to "odd jobs".
check('unknown category', { category: 'spaceship', text: 'do a thing' }, (r) => {
  assert.equal(r.categoryLabel, 'odd jobs');
  assert.equal(r.min, 50);
});

// Min is always at least $10 and max strictly above min.
check('floor guard', { category: 'other', difficulty: 'easy', text: 'tiny quick minor little thing' }, (r) => {
  assert.ok(r.min >= 10);
  assert.ok(r.max > r.min);
});

// The example from the spec: yard + moderate effort phrasing.
check('spec phrasing', { category: 'yard', difficulty: 'hard', text: 'rake leaves' }, (r) => {
  assert.match(r.explanation, /^Typical local range: \$\d+–\$\d+ based on yard work/);
});

console.log(`\nbudgetInference self-check: ${n} cases passed\n`);
for (const e of examples) {
  console.log(`• ${e.label.padEnd(22)} → $${e.out.min}–$${e.out.max}  | ${e.out.explanation}`);
}
console.log('');
