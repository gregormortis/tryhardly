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
  fencing:  { min: 200, max: 600, label: 'fencing'          },
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
const CSLB_THRESHOLD = 1000;

function clampRound(n) { return Math.max(10, Math.round(n / 5) * 5); }
function round25(n) { return Math.max(25, Math.round(n / 25) * 25); }
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
const FEET_UNIT = "linear\\s*(?:feet|foot|ft)|feet|foot|ft\\b|lf\\b|['’′]";
function extractQuantityNear(text, unitPattern) {
  const re = new RegExp(`(\\d{1,5}(?:\\.\\d+)?)\\s*(?:${unitPattern})`, 'i');
  const m = text.match(re);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function extractDimensions(text) {
  const unit = "(?:\\s*(?:'|’|′|ft|feet|foot))?";
  const re = new RegExp(
    `(\\d{1,4}(?:\\.\\d+)?)${unit}\\s*(?:x|\\*|by)\\s*(\\d{1,4}(?:\\.\\d+)?)${unit}`,
    'i',
  );
  const m = text.match(re);
  if (!m) return null;
  const w = parseFloat(m[1]);
  const h = parseFloat(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { w, h, sqft: w * h };
}
function extractCount(text, unitPattern) {
  const numbered = extractQuantityNear(text, unitPattern);
  if (numbered != null) return numbered;
  const re = new RegExp(`(^|[^a-z])(?:${unitPattern})`, 'i');
  return re.test(text) ? 1 : null;
}

function fencingEstimate(text) {
  const isFence = hasKeyword(text, [
    'fence', 'fencing', 't-post', 't post', 'tpost', 'woven wire', 'woven',
    'goat', 'field fence', 'no climb', 'no-climb', 'hog wire', 'welded wire',
    'chain link', 'chain-link', 'barbed wire', 'barb wire',
  ]);
  if (!isFence) return null;
  const feet = extractQuantityNear(text, FEET_UNIT);
  if (!feet) return null;

  let laborPerFtMin = 4.1;
  let laborPerFtMax = 6.8;
  let laborPerFtMid = 5.45;
  let matPerFtMin = 3.5;
  let matPerFtMax = 5.9;
  const assumptions = [];
  const factors = [];

  if (hasKeyword(text, ['chain link', 'chain-link', 'wood', 'cedar', 'privacy'])) {
    matPerFtMin = 6; matPerFtMax = 12;
    assumptions.push('Heavier fence type (chain-link/wood) — materials cost more.');
  } else {
    assumptions.push('T-post + woven/field ("goat") wire on normal ground.');
  }

  const rocky = hasKeyword(text, ['rocky', 'rock', 'hardpan', 'clay']);
  const brush = hasKeyword(text, ['brush', 'overgrown', 'clearing', 'clear brush', 'thick']);
  const slope = hasKeyword(text, ['slope', 'sloped', 'hill', 'hillside', 'steep', 'grade']);
  let terrainMult = 1;
  if (rocky) { terrainMult *= 1.3; factors.push('rocky ground'); }
  if (brush) { terrainMult *= 1.2; factors.push('brush clearing'); }
  if (slope) { terrainMult *= 1.15; factors.push('sloped ground'); }
  if (terrainMult > 1) assumptions.push('Difficult terrain raises labor and time vs a simple open run.');

  const gates = extractCount(text, 'gates?');
  let gateCost = 0;
  if (gates) {
    gateCost = gates * 90;
    factors.push(gates === 1 ? 'a gate' : `${gates} gates`);
    assumptions.push(`${gates} gate${gates > 1 ? 's' : ''} add hardware + hanging time.`);
  }
  if (hasKeyword(text, ['brace', 'bracing', 'h-brace', 'corner post', 'corner posts'])) {
    laborPerFtMid *= 1.08; laborPerFtMax *= 1.12;
    factors.push('extra bracing');
  }

  const laborMin = round25(feet * laborPerFtMin * terrainMult + gateCost * 0.5);
  const laborMax = round25(feet * laborPerFtMax * terrainMult + gateCost);
  const laborSuggested = round25(feet * laborPerFtMid * terrainMult + gateCost * 0.75);
  const matMin = feet * matPerFtMin + gateCost;
  const matMax = feet * matPerFtMax + gateCost;
  const totalMin = round25(laborMin + matMin);
  const totalMax = round25(laborMax + matMax);

  const hoursMin = Math.max(4, Math.round((feet / 28) * terrainMult));
  const hoursMax = Math.max(hoursMin + 2, Math.round((feet / 15) * terrainMult));
  const daysMin = Math.max(1, Math.round(hoursMin / 8));
  const daysMax = Math.max(daysMin, Math.round(hoursMax / 8));
  const timeEstimate = daysMin === daysMax
    ? `~${daysMin} day / ${hoursMin}–${hoursMax} labor hours`
    : `~${daysMin}–${daysMax} days / ${hoursMin}–${hoursMax} labor hours`;

  assumptions.push('Labor-only assumes you supply posts, wire, and gates.');

  return {
    laborMin, laborMax, laborSuggested, totalMin, totalMax, timeEstimate, assumptions,
    basis: `fencing ${feet} ft${factors.length ? ' (' + factors.join(', ') + ')' : ''}`,
  };
}

function flatworkEstimate(text) {
  const isConcrete = hasKeyword(text, ['concrete', 'slab', 'cement', 'foundation', 'footing', 'pad']);
  const isDeck = hasKeyword(text, ['deck', 'patio', 'paver', 'pavers']);
  if (!isConcrete && !isDeck) return null;
  const dims = extractDimensions(text);
  if (!dims) return null;
  const { w, h, sqft } = dims;
  let totalPerSqftMin, totalPerSqftMax, laborPerSqftMin, laborPerSqftMax, laborPerSqftMid, typeNote;
  if (isConcrete) {
    totalPerSqftMin = 8; totalPerSqftMax = 15;
    laborPerSqftMin = 4.5; laborPerSqftMax = 8; laborPerSqftMid = 6;
    typeNote = 'Concrete flatwork (form, pour, finish) on prepared ground.';
  } else {
    totalPerSqftMin = 15; totalPerSqftMax = 35;
    laborPerSqftMin = 8; laborPerSqftMax = 16; laborPerSqftMid = 11;
    typeNote = 'Deck / patio surface on prepared ground.';
  }
  const factors = [];
  const assumptions = [typeNote, `${w}×${h} ≈ ${Math.round(sqft)} sq ft.`];
  if (hasKeyword(text, ['rebar', 'reinforced', 'thick', 'driveway', 'footing', 'foundation'])) {
    laborPerSqftMin *= 1.15; laborPerSqftMax *= 1.2; laborPerSqftMid *= 1.15;
    totalPerSqftMin *= 1.15; totalPerSqftMax *= 1.2;
    factors.push('reinforced / structural');
    assumptions.push('Reinforcement or structural work raises cost vs a plain pad.');
  }
  const laborMin = round25(sqft * laborPerSqftMin);
  const laborMax = round25(sqft * laborPerSqftMax);
  const laborSuggested = round25(sqft * laborPerSqftMid);
  const totalMin = round25(sqft * totalPerSqftMin);
  const totalMax = round25(sqft * totalPerSqftMax);
  const hoursMin = Math.max(6, Math.round(sqft / 40));
  const hoursMax = Math.max(hoursMin + 2, Math.round(sqft / 25));
  const daysMin = Math.max(1, Math.round(hoursMin / 8));
  const daysMax = Math.max(daysMin, Math.round(hoursMax / 8));
  const timeEstimate = daysMin === daysMax
    ? `~${daysMin} day / ${hoursMin}–${hoursMax} labor hours`
    : `~${daysMin}–${daysMax} days / ${hoursMin}–${hoursMax} labor hours`;
  assumptions.push('Labor-only assumes you supply concrete/materials and prep.');
  return {
    laborMin, laborMax, laborSuggested, totalMin, totalMax, timeEstimate, assumptions,
    basis: `${isConcrete ? 'concrete' : 'deck/patio'} ${Math.round(sqft)} sqft${factors.length ? ' (' + factors.join(', ') + ')' : ''}`,
  };
}

function haulingEstimate(text) {
  const isHaul = hasKeyword(text, [
    'haul', 'hauling', 'junk', 'debris', 'dump run', 'dump', 'trash removal',
    'remove junk', 'cleanout', 'clean out', 'load',
  ]);
  if (!isHaul) return null;
  const yards = extractQuantityNear(text, 'cubic\\s*(?:yards?|yds?)|yards?|yds?');
  const loads = extractQuantityNear(text, 'truck\\s*loads?|loads?|pickup\\s*loads?');
  const heavyItems = extractCount(text, 'appliances?|fridge|refrigerator|couch|sofa|mattress|piano|hot\\s*tub|heavy\\s*items?');
  if (yards == null && loads == null && heavyItems == null) return null;

  const effectiveYards = yards ?? (loads ? loads * 3 : 0);
  let laborMin = effectiveYards * 60;
  let laborMax = effectiveYards * 110;
  const assumptions = [];
  if (effectiveYards) {
    assumptions.push(yards
      ? `${yards} cubic yards of material, incl. disposal fees.`
      : `${loads} truckload${loads && loads > 1 ? 's' : ''} (~3 cu yd each), incl. disposal.`);
  }
  if (heavyItems) {
    laborMin += heavyItems * 40; laborMax += heavyItems * 80;
    assumptions.push(`${heavyItems} heavy item${heavyItems > 1 ? 's' : ''} add lifting time.`);
  }
  laborMin = Math.max(laborMin, 80);
  laborMax = Math.max(laborMax, 150);
  const hoursMin = Math.max(1, Math.round(effectiveYards / 3) || 1);
  const hoursMax = Math.max(hoursMin + 1, Math.round(effectiveYards / 1.5) || 2);
  assumptions.push('Disposal/dump fees included; price is labor, not materials.');
  return {
    laborMin: round25(laborMin), laborMax: round25(laborMax),
    laborSuggested: round25((laborMin + laborMax) / 2),
    timeEstimate: `~${hoursMin}–${hoursMax} labor hours`,
    assumptions, basis: `hauling`,
  };
}

function movingEstimate(text) {
  const isMove = hasKeyword(text, [
    'move', 'moving', 'movers', 'relocate', 'relocation', 'load truck',
    'unload', 'pack', 'packing',
  ]);
  if (!isMove) return null;
  const bedrooms = extractQuantityNear(text, 'bedrooms?|br\\b|bed\\b');
  const rooms = extractQuantityNear(text, 'rooms?');
  const units = bedrooms ?? rooms;
  if (units == null) return null;
  const moverHrs = Math.max(4, Math.round(units * 3)) * 2;
  const rate = 35;
  const laborMin = moverHrs * (rate - 8);
  const laborMax = moverHrs * (rate + 12);
  const hoursMin = Math.max(2, Math.round(moverHrs / 2 - 1));
  const hoursMax = Math.max(hoursMin + 1, Math.round(moverHrs / 2 + 1));
  return {
    laborMin: round25(laborMin), laborMax: round25(laborMax),
    laborSuggested: round25((laborMin + laborMax) / 2),
    timeEstimate: `~${hoursMin}–${hoursMax} hours with a 2-person crew`,
    assumptions: [
      `${units} ${bedrooms ? 'bedroom' : 'room'}${units > 1 ? 's' : ''}, 2 movers.`,
      'Labor only — truck/fuel not included.',
    ],
    basis: 'moving',
  };
}

function cleaningEstimate(text) {
  const isClean = hasKeyword(text, ['clean', 'cleaning', 'maid', 'housekeeping', 'tidy', 'scrub']);
  if (!isClean) return null;
  const sqft = extractQuantityNear(text, 'sq\\s*ft|square\\s*feet|sqft');
  const rooms = extractQuantityNear(text, 'rooms?|bedrooms?|bathrooms?');
  if (sqft == null && rooms == null) return null;
  let laborMin, laborMax, assume;
  if (sqft != null) {
    laborMin = sqft * 0.08; laborMax = sqft * 0.16; assume = `${sqft} sq ft.`;
  } else {
    laborMin = rooms * 35; laborMax = rooms * 70; assume = `${rooms} room${rooms > 1 ? 's' : ''}.`;
  }
  if (hasKeyword(text, ['deep clean', 'move out', 'move-out', 'deep'])) {
    laborMin *= 1.4; laborMax *= 1.6; assume += ' Deep / move-out clean.';
  }
  laborMin = Math.max(laborMin, 70); laborMax = Math.max(laborMax, 120);
  const hoursMin = Math.max(2, Math.round(laborMin / 35));
  const hoursMax = Math.max(hoursMin + 1, Math.round(laborMax / 30));
  return {
    laborMin: round25(laborMin), laborMax: round25(laborMax),
    laborSuggested: round25((laborMin + laborMax) / 2),
    timeEstimate: `~${hoursMin}–${hoursMax} labor hours`,
    assumptions: [assume, 'Labor only — cleaning supplies are minor.'],
    basis: 'cleaning',
  };
}

function handymanEstimate(text) {
  const hours = extractQuantityNear(text, 'hours?|hrs?');
  if (hours == null) return null;
  if (!hasKeyword(text, [
    'install', 'repair', 'fix', 'assemble', 'mount', 'build', 'replace',
    'handyman', 'labor', 'work', 'hang', 'patch',
  ])) return null;
  const rate = 45;
  const laborMin = hours * (rate - 10);
  const laborMax = hours * (rate + 20);
  return {
    laborMin: round25(laborMin), laborMax: round25(laborMax),
    laborSuggested: round25(hours * rate),
    timeEstimate: `~${hours} labor hours`,
    assumptions: [`About ${hours} labor hours at a local handyman rate.`, 'Labor only — materials extra.'],
    basis: `handyman ${hours} hr`,
  };
}

function measure(text) {
  return (
    fencingEstimate(text) ??
    flatworkEstimate(text) ??
    haulingEstimate(text) ??
    movingEstimate(text) ??
    cleaningEstimate(text) ??
    handymanEstimate(text)
  );
}

const LICENSE_RELEVANT = [
  'fence', 'fencing', 'deck', 'patio', 'paint', 'painting', 'drywall',
  'concrete', 'slab', 'cement', 'foundation', 'footing', 'pad',
  'install', 'build', 'construction', 'remodel', 'roof', 'roofing',
  'electrical', 'plumbing', 'handyman', 'repair', 'framing', 'tile',
  'flooring', 'tree',
];
function contractorNotice(text, category, roughTotal) {
  const relevant = hasKeyword(text, LICENSE_RELEVANT)
    || category === 'fencing' || category === 'handyman' || category === 'painting';
  if (relevant && roughTotal >= CSLB_THRESHOLD) {
    return {
      required: true,
      message: 'This may require a licensed contractor in California. The CSLB unlicensed exemption generally applies only when total labor + materials stays under $1,000 with no permit and no employees. TryHardly workers should only accept jobs they are legally qualified to perform — verify local rules (CSLB).',
    };
  }
  if (relevant) {
    return {
      required: false,
      message: 'Under California’s ~$1,000 small-project exemption, but needing a permit or employees can still require a licensed contractor. Verify local rules.',
    };
  }
  return { required: false, message: '' };
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

  const measured = payType !== 'hourly' && text ? measure(text) : null;
  let minR, maxR, explanation;
  if (measured) {
    minR = measured.laborMin;
    maxR = measured.laborMax;
    factors.push('sized to the job');
    explanation = `Labor only (you supply materials): $${measured.laborMin}–$${measured.laborMax}`
      + (measured.totalMin != null ? `. Materials + labor: ~$${measured.totalMin}–$${measured.totalMax}` : '')
      + `. Time: ${measured.timeEstimate}.`;
  } else {
    minR = clampRound(min);
    maxR = clampRound(max);
    if (maxR <= minR) maxR = clampRound(minR * 1.5);
    const unit = payType === 'hourly' ? '/hr' : '';
    const factorTail = ` based on ${base.label}${factors.length ? ' + ' + factors.join(' + ') : ''}`;
    explanation = `Typical local range: $${minR}–$${maxR}${unit}${factorTail}.`;
  }

  const roughTotal = measured?.totalMax ?? measured?.laborMax ?? maxR;
  const contractor = contractorNotice(text, inputs.category ?? null, roughTotal);

  return {
    min: minR, max: maxR, categoryLabel: base.label, explanation, factors,
    measured: measured ?? undefined, contractor,
  };
}

// Mirror of calcXpReward() in components/PostQuestForm.tsx.
function calcXpReward(reward) {
  if (!Number.isFinite(reward) || reward <= 0) return 0;
  return Math.max(10, Math.min(1500, Math.round(90 * Math.log2(reward + 1))));
}

// Mirror of quoteModeReward() in components/PostQuestForm.tsx: the conservative
// placeholder reward used for quote-needed jobs so XP can't explode.
const QUOTE_PLACEHOLDER_REWARD = 50;
function quoteModeReward(rec) {
  const fromMeasure = rec.measured?.laborMin;
  if (Number.isFinite(fromMeasure) && fromMeasure >= 10) return Math.min(fromMeasure, 200);
  return QUOTE_PLACEHOLDER_REWARD;
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
  assert.equal(r.measured, undefined);
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
  assert.equal(r.measured, undefined);
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

// ── Calibration anchor: 220 ft T-post + goat/woven fence ─────────────────────

// Labor-only $900–$1,500, suggested ~$1,200; materials+labor ~$1,700–$2,800;
// time 1–2 days / 8–16 labor hours; contractor warning fires (>= $1,000 total).
check('fence / 220ft goat (materials supplied)', {
  category: 'fencing',
  text: 'Install 220 linear feet of t-post and woven goat wire fencing on flat open ground',
}, (r) => {
  assert.ok(r.measured, 'fencing should produce a measured estimate');
  const m = r.measured;
  // Labor-only band.
  assert.equal(m.laborMin, 900, 'labor min ≈ $900');
  assert.equal(m.laborMax, 1500, 'labor max ≈ $1,500');
  assert.equal(m.laborSuggested, 1200, 'labor suggested ≈ $1,200');
  assert.ok(m.laborSuggested >= 900 && m.laborSuggested <= 1500);
  // Headline range tracks labor-only.
  assert.equal(r.min, 900);
  assert.equal(r.max, 1500);
  // Materials + labor rough total.
  assert.ok(m.totalMin >= 1650 && m.totalMin <= 2000, `total min ≈ $1,700, got ${m.totalMin}`);
  assert.ok(m.totalMax >= 2500 && m.totalMax <= 2800, `total max in range, got ${m.totalMax}`);
  // Time estimate: 1–2 days / 8–16 labor hours.
  assert.match(m.timeEstimate, /1–2 days/);
  assert.match(m.timeEstimate, /8–15 labor hours/);
  // Contractor warning must fire at this total.
  assert.equal(r.contractor.required, true, 'contractor warning should be required');
  assert.match(r.contractor.message, /licensed contractor in California/);
  assert.match(r.contractor.message, /CSLB/);
  // Assumptions surfaced.
  assert.ok(m.assumptions.some((a) => /goat|woven/i.test(a)));
  assert.ok(m.assumptions.some((a) => /supply/i.test(a)));
});

// Rocky + gate raises labor and time vs the simple open run.
check('fence / 220ft rocky + gate', {
  category: 'fencing',
  text: '220 ft of t-post goat fence over rocky ground with 1 gate',
}, (r) => {
  const m = r.measured;
  assert.ok(m, 'measured estimate present');
  assert.ok(m.laborMin > 900, 'rocky ground raises labor over the simple run');
  assert.ok(m.assumptions.some((a) => /terrain/i.test(a)));
  assert.ok(m.assumptions.some((a) => /gate/i.test(a)));
  assert.equal(r.contractor.required, true);
});

// Small fence stays under the CSLB threshold → soft (non-required) notice.
check('fence / 40ft small run', {
  category: 'fencing',
  text: 'put up 40 ft of t-post and woven wire fence',
}, (r) => {
  const m = r.measured;
  assert.ok(m, 'measured estimate present');
  const roughTotal = m.totalMax;
  assert.ok(roughTotal < 1000, `small fence total should be under threshold, got ${roughTotal}`);
  assert.equal(r.contractor.required, false, 'small fence should not require a contractor');
  assert.ok(r.contractor.message.length > 0, 'still mentions permits/employees');
  assert.match(r.contractor.message, /permit|employees/);
});

// Hauling sized by cubic yards (labor only, no materials total).
check('hauling / 6 cubic yards', {
  category: 'hauling',
  text: 'haul away about 6 cubic yards of yard debris and junk',
}, (r) => {
  const m = r.measured;
  assert.ok(m, 'measured estimate present');
  assert.ok(m.laborMin >= 350 && m.laborMax >= 650, 'volume scales the haul');
  assert.equal(m.totalMin, undefined, 'hauling has no materials total');
  assert.match(m.timeEstimate, /labor hours/);
});

// Moving sized by bedrooms.
check('moving / 3 bedroom', {
  category: 'moving',
  text: 'help move a 3 bedroom house, load and unload the truck',
}, (r) => {
  const m = r.measured;
  assert.ok(m, 'measured estimate present');
  assert.ok(m.laborMin > 280, 'multi-bedroom move scales above base');
  assert.match(m.timeEstimate, /2-person crew/);
});

// ── Screenshot anchor: exact text "220' goat fence with tpost needs built" ───
// This is the bug the user reported: the foot-mark (') was not parsed, so the
// fencing heuristic never fired and the poster saw the tiny $200–$600 base.
check("screenshot: 220' goat fence with tpost", {
  category: 'fencing',
  text: "220' goat fence with tpost needs built",
}, (r) => {
  assert.ok(r.measured, "220' must produce a measured estimate (foot-mark parsed)");
  const m = r.measured;
  assert.equal(m.laborMin, 900, 'labor min ≈ $900');
  assert.equal(m.laborMax, 1500, 'labor max ≈ $1,500');
  assert.equal(m.laborSuggested, 1200, 'labor suggested ≈ $1,200');
  assert.ok(m.totalMin >= 1650 && m.totalMin <= 2000, `total min ≈ $1,700, got ${m.totalMin}`);
  assert.ok(m.totalMax >= 2500 && m.totalMax <= 2800, `total max in range, got ${m.totalMax}`);
  // Headline range tracks labor-only, NOT the old $200–$600 base.
  assert.equal(r.min, 900);
  assert.equal(r.max, 1500);
  assert.notEqual(r.max, 600, 'must not fall back to the $200–$600 fencing base');
  assert.equal(r.contractor.required, true, 'contractor warning should fire');
});

// Curly foot-mark variant parses too.
check("fence / 220’ curly foot-mark", {
  category: 'fencing',
  text: "220’ goat fence, tpost",
}, (r) => {
  assert.ok(r.measured, 'curly foot-mark should parse');
  assert.equal(r.measured.laborMin, 900);
});

// ── 20x20 concrete pad: dimension parsing → realistic, contractor-required ───
check('concrete / 20x20 pad', {
  category: 'other',
  text: 'pour a 20x20 concrete pad in the backyard',
}, (r) => {
  assert.ok(r.measured, '20x20 should produce a sized estimate');
  const m = r.measured;
  // 400 sq ft @ $4.50–$8 labor, $8–$15 total.
  assert.equal(m.laborMin, 1800, `labor min, got ${m.laborMin}`);
  assert.equal(m.laborMax, 3200, `labor max, got ${m.laborMax}`);
  assert.equal(m.totalMin, 3200, `total min, got ${m.totalMin}`);
  assert.equal(m.totalMax, 6000, `total max, got ${m.totalMax}`);
  assert.match(m.basis, /concrete 400 sqft/);
  // Well above the CSLB threshold → licensed-contractor warning.
  assert.equal(r.contractor.required, true, 'a 20x20 slab requires the contractor notice');
});

// Dimension variants "20 by 20" and "20 * 20" parse identically.
check('concrete / 20 by 20', { category: 'other', text: 'need a 20 by 20 concrete slab' }, (r) => {
  assert.ok(r.measured);
  assert.equal(r.measured.totalMin, 3200);
});
check('deck / 12 x 16 patio', { category: 'other', text: 'build a 12 x 16 deck / patio' }, (r) => {
  assert.ok(r.measured, 'deck dimension parses');
  // 192 sq ft @ $15–$35 total.
  assert.ok(r.measured.totalMin >= 2800 && r.measured.totalMax >= 6000, 'deck total scales by area');
  assert.equal(r.contractor.required, true);
});

// ── Quote mode: conservative placeholder reward → XP can't explode ───────────
check('quote mode XP (no measured assert)', { category: 'other', text: 'placeholder' }, () => {
  // No measurement → flat placeholder.
  assert.equal(quoteModeReward({ measured: null }), 50);
  assert.ok(calcXpReward(quoteModeReward({ measured: null })) < 600, 'quote XP stays modest');
  // A measured contractor job (20x20 concrete labor min $1,800) is capped at 200,
  // so XP for a quote-needed job is far below what a $1,800 fixed reward would mint.
  const concrete = recommendBudget({ category: 'other', text: 'pour a 20x20 concrete pad' });
  const qReward = quoteModeReward(concrete);
  assert.ok(qReward <= 200, `quote reward capped, got ${qReward}`);
  assert.ok(calcXpReward(qReward) < calcXpReward(concrete.measured.laborMin),
    'quote XP must be lower than XP for the full measured reward');
});

// XP is log-scaled and capped — a $1,200 fence must not mint absurd XP.
check('xp sanity (no measured assert)', { category: 'other', text: 'placeholder' }, () => {
  assert.equal(calcXpReward(10), 311);
  assert.ok(calcXpReward(50) < 600, '$50 stays modest');
  assert.equal(calcXpReward(1200), 921, '$1,200 job ≈ 921 XP');
  assert.ok(calcXpReward(1200) < 1000, '$1,200 fence is not absurd');
  assert.equal(calcXpReward(1000000), 1500, 'hard cap at 1,500');
  // Monotonic non-decreasing.
  assert.ok(calcXpReward(2000) >= calcXpReward(1200));
  assert.ok(calcXpReward(0) === 0);
});

console.log(`\nbudgetInference self-check: ${n} cases passed\n`);
for (const e of examples) {
  console.log(`• ${e.label.padEnd(34)} → $${e.out.min}–$${e.out.max}  | ${e.out.explanation}`);
  if (e.out.measured) {
    const m = e.out.measured;
    console.log(`    labor $${m.laborMin}–$${m.laborMax} (≈$${m.laborSuggested})`
      + (m.totalMin != null ? ` · total ~$${m.totalMin}–$${m.totalMax}` : '')
      + ` · ${m.timeEstimate}`);
  }
  if (e.out.contractor && e.out.contractor.message) {
    console.log(`    contractor[${e.out.contractor.required ? 'REQUIRED' : 'note'}]: ${e.out.contractor.message.slice(0, 80)}…`);
  }
}
console.log('');
console.log('XP curve (log-scaled, capped 1500):');
for (const r of [10, 50, 100, 200, 500, 1000, 1200, 5000]) {
  console.log(`  $${String(r).padStart(5)} → ${calcXpReward(r)} XP`);
}
console.log('');
