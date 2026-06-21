import type { CategoryId } from './questInference';

// Deterministic, local budget recommendation for the client posting flow.
// No external AI/API and no keys: given the job details a poster has already
// entered (category, what they typed, timing, optional difficulty/urgency) we
// produce a rough local price range plus a short plain-language explanation.
// Every number here is a suggestion the poster can ignore or override — nothing
// is authoritative, and applying a suggestion is always an explicit click.
//
// Two layers of estimate:
//   1. A category base flat/hourly band (the original behaviour, kept as a
//      floor for jobs we can't measure from the text).
//   2. Job-specific measurement heuristics — when the text mentions a quantity
//      we can reason about (linear feet of fence, cubic-yard hauls, rooms,
//      heavy items, …) we scale the estimate to the size of the work. This is
//      what stops a 220 ft goat-fence job from being quoted like a single
//      handyman visit.
// When a measurement heuristic fires we surface a labor-only figure (poster
// supplies materials), a materials + labor rough total, and a rough time
// estimate, plus the assumptions behind them.

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

// A measured sub-estimate. Present only when a job-specific heuristic fires.
export interface MeasuredEstimate {
  // Labor only, assuming the poster supplies materials.
  laborMin: number;
  laborMax: number;
  // A sensible midpoint to apply by default (e.g. supplied materials, normal
  // ground). Always within [laborMin, laborMax].
  laborSuggested: number;
  // Materials + labor rough total (undefined when materials are negligible,
  // e.g. cleaning or hauling labor).
  totalMin?: number;
  totalMax?: number;
  // Rough time estimate, human phrased, e.g. "1–2 days / 8–16 labor hours".
  timeEstimate: string;
  // Short assumptions / notes lines shown under the estimate.
  assumptions: string[];
  // Which heuristic produced this (for debugging / labels).
  basis: string;
}

export interface ContractorNotice {
  // True when the rough labor+materials total reaches the CA threshold.
  required: boolean;
  message: string;
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
  // Present when a measurement heuristic produced a sized estimate.
  measured?: MeasuredEstimate;
  // California contractor-license guidance. `required` flips on at the CSLB
  // small-project threshold; the message is always safe to show.
  contractor: ContractorNotice;
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
  fencing:  { min: 200, max: 600, label: 'fencing'          },
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

// CA Contractors State License Board (CSLB) small-project exemption: unlicensed
// work is generally allowed only when the total cost of labor + materials is
// under $1,000 and no permit and no employees are involved. At/above $1,000 (or
// when a permit/employees are involved) a licensed contractor is required.
const CSLB_THRESHOLD = 1000;

function clampRound(n: number): number {
  // Round to the nearest $5 so ranges read like real quotes.
  return Math.max(10, Math.round(n / 5) * 5);
}

function round25(n: number): number {
  // Larger measured jobs read better rounded to the nearest $25.
  return Math.max(25, Math.round(n / 25) * 25);
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

// ── Number extraction ────────────────────────────────────────────────────────

// Linear-feet unit pattern. Accepts spelled-out units ("feet"/"foot"/"ft"/"lf",
// optionally prefixed by "linear") AND the foot-mark symbols a poster types
// without a unit word: a straight apostrophe ' , a curly right quote ’ , or a
// prime ′ . This is what makes "220' goat fence" parse as 220 feet instead of
// being missed and falling back to the tiny fencing base range.
const FEET_UNIT = "linear\\s*(?:feet|foot|ft)|feet|foot|ft\\b|lf\\b|['’′]";

// First integer/decimal that appears near one of the given unit words, e.g.
// "220 ft", "220 linear feet", "120ft of fence". Returns null if none found.
function extractQuantityNear(text: string, unitPattern: string): number | null {
  const re = new RegExp(`(\\d{1,5}(?:\\.\\d+)?)\\s*(?:${unitPattern})`, 'i');
  const m = text.match(re);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Two dimensions written as "20x20", "20 x 20", "20 * 20", "20 by 20", or
// "20ft x 20ft" → returns { w, h, sqft }. Returns null if no pair is found.
function extractDimensions(text: string): { w: number; h: number; sqft: number } | null {
  // Optional foot marks/units after each number are tolerated and ignored.
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

// Count occurrences of a small set of words (e.g. how many "gate" mentions, how
// many "room" mentions). Number-prefixed counts ("3 gates") win over bare ones.
function extractCount(text: string, unitPattern: string): number | null {
  const numbered = extractQuantityNear(text, unitPattern);
  if (numbered != null) return numbered;
  // Fall back to a single mention of the word implying "1".
  const re = new RegExp(`(^|[^a-z])(?:${unitPattern})`, 'i');
  return re.test(text) ? 1 : null;
}

// ── Job-specific heuristics ──────────────────────────────────────────────────

// Fencing: the calibration anchor. Labor scales per linear foot; materials add
// a per-foot band on top. Terrain / gates / bracing widen both labor and time.
function fencingEstimate(text: string): MeasuredEstimate | null {
  const isFence = hasKeyword(text, [
    'fence', 'fencing', 't-post', 't post', 'tpost', 'woven wire', 'woven',
    'goat', 'field fence', 'no climb', 'no-climb', 'hog wire', 'welded wire',
    'chain link', 'chain-link', 'barbed wire', 'barb wire',
  ]);
  if (!isFence) return null;

  const feet = extractQuantityNear(text, FEET_UNIT);
  if (!feet) return null;

  // Per-foot labor band. 220 ft → ~$900–$1,500 labor, midpoint ~$1,200.
  // ($4.10/ft .. $6.80/ft, suggested ~$5.45/ft.)
  let laborPerFtMin = 4.1;
  let laborPerFtMax = 6.8;
  let laborPerFtMid = 5.45;

  // Per-foot materials for T-post + woven/field/goat wire (posts, wire,
  // staples, basic corner bracing). Chain link / wood run higher.
  let matPerFtMin = 3.5;
  let matPerFtMax = 5.9;

  const assumptions: string[] = [];
  const factors: string[] = [];

  if (hasKeyword(text, ['chain link', 'chain-link', 'wood', 'cedar', 'privacy'])) {
    matPerFtMin = 6;
    matPerFtMax = 12;
    assumptions.push('Heavier fence type (chain-link/wood) — materials cost more.');
  } else {
    assumptions.push('T-post + woven/field ("goat") wire on normal ground.');
  }

  // Terrain difficulty: rocky / brush / slope all slow post-setting.
  const rocky = hasKeyword(text, ['rocky', 'rock', 'hardpan', 'clay']);
  const brush = hasKeyword(text, ['brush', 'overgrown', 'clearing', 'clear brush', 'thick']);
  const slope = hasKeyword(text, ['slope', 'sloped', 'hill', 'hillside', 'steep', 'grade']);
  let terrainMult = 1;
  if (rocky)  { terrainMult *= 1.3; factors.push('rocky ground'); }
  if (brush)  { terrainMult *= 1.2; factors.push('brush clearing'); }
  if (slope)  { terrainMult *= 1.15; factors.push('sloped ground'); }
  if (terrainMult > 1) {
    assumptions.push('Difficult terrain raises labor and time vs a simple open run.');
  }

  // Gates and extra bracing add fixed-ish costs.
  const gates = extractCount(text, 'gates?');
  let gateCost = 0;
  if (gates) {
    gateCost = gates * 90; // labor+hardware per gate, rough
    factors.push(gates === 1 ? 'a gate' : `${gates} gates`);
    assumptions.push(`${gates} gate${gates > 1 ? 's' : ''} add hardware + hanging time.`);
  }
  if (hasKeyword(text, ['brace', 'bracing', 'h-brace', 'corner post', 'corner posts'])) {
    laborPerFtMid *= 1.08;
    laborPerFtMax *= 1.12;
    factors.push('extra bracing');
  }

  const laborMin = round25(feet * laborPerFtMin * terrainMult + gateCost * 0.5);
  const laborMax = round25(feet * laborPerFtMax * terrainMult + gateCost);
  const laborSuggested = round25(feet * laborPerFtMid * terrainMult + gateCost * 0.75);

  const matMin = feet * matPerFtMin + gateCost;
  const matMax = feet * matPerFtMax + gateCost;
  const totalMin = round25(laborMin + matMin);
  const totalMax = round25(laborMax + matMax);

  // Time: ~15–28 ft of finished fence per labor-hour on simple ground; harder
  // terrain raises the hours via terrainMult.
  const hoursMin = Math.max(4, Math.round((feet / 28) * terrainMult));
  const hoursMax = Math.max(hoursMin + 2, Math.round((feet / 15) * terrainMult));
  const daysMin = Math.max(1, Math.round(hoursMin / 8));
  const daysMax = Math.max(daysMin, Math.round(hoursMax / 8));
  const timeEstimate =
    daysMin === daysMax
      ? `~${daysMin} day / ${hoursMin}–${hoursMax} labor hours`
      : `~${daysMin}–${daysMax} days / ${hoursMin}–${hoursMax} labor hours`;

  assumptions.push('Labor-only assumes you supply posts, wire, and gates.');

  return {
    laborMin,
    laborMax,
    laborSuggested,
    totalMin,
    totalMax,
    timeEstimate,
    assumptions,
    basis: `fencing ${feet} ft${factors.length ? ' (' + factors.join(', ') + ')' : ''}`,
  };
}

// Flatwork by area: concrete pad / slab, deck, patio, paver/shed pad. Priced
// per square foot from a WxH dimension (e.g. "20x20 concrete pad" → 400 sq ft).
// These are the jobs most likely to be anchored at an unrealistic fixed budget,
// so we surface both labor-only and materials+labor and let the contractor
// notice fire — a 20x20 slab is firmly above the CSLB $1,000 threshold.
function flatworkEstimate(text: string): MeasuredEstimate | null {
  const isConcrete = hasKeyword(text, [
    'concrete', 'slab', 'cement', 'foundation', 'footing', 'pad',
  ]);
  const isDeck = hasKeyword(text, ['deck', 'patio', 'paver', 'pavers']);
  if (!isConcrete && !isDeck) return null;

  const dims = extractDimensions(text);
  if (!dims) return null;
  const { w, h, sqft } = dims;

  // Per-sq-ft bands (installed). Concrete flatwork runs higher than wood decking
  // labor; both split into a labor-only portion and a materials+labor total.
  let totalPerSqftMin: number;
  let totalPerSqftMax: number;
  let laborPerSqftMin: number;
  let laborPerSqftMax: number;
  let laborPerSqftMid: number;
  let typeNote: string;

  if (isConcrete) {
    // ~$8–$15/sq ft installed; labor is roughly $4.50–$8/sq ft of that.
    totalPerSqftMin = 8;
    totalPerSqftMax = 15;
    laborPerSqftMin = 4.5;
    laborPerSqftMax = 8;
    laborPerSqftMid = 6;
    typeNote = 'Concrete flatwork (form, pour, finish) on prepared ground.';
  } else {
    // Deck / patio paver: ~$15–$35/sq ft installed; labor ~$8–$16/sq ft.
    totalPerSqftMin = 15;
    totalPerSqftMax = 35;
    laborPerSqftMin = 8;
    laborPerSqftMax = 16;
    laborPerSqftMid = 11;
    typeNote = 'Deck / patio surface on prepared ground.';
  }

  const factors: string[] = [];
  const assumptions: string[] = [typeNote, `${w}×${h} ≈ ${Math.round(sqft)} sq ft.`];

  // Thickened edges / rebar / heavy reinforcement raise both labor and total.
  if (hasKeyword(text, ['rebar', 'reinforced', 'thick', 'driveway', 'footing', 'foundation'])) {
    laborPerSqftMin *= 1.15;
    laborPerSqftMax *= 1.2;
    laborPerSqftMid *= 1.15;
    totalPerSqftMin *= 1.15;
    totalPerSqftMax *= 1.2;
    factors.push('reinforced / structural');
    assumptions.push('Reinforcement or structural work raises cost vs a plain pad.');
  }

  const laborMin = round25(sqft * laborPerSqftMin);
  const laborMax = round25(sqft * laborPerSqftMax);
  const laborSuggested = round25(sqft * laborPerSqftMid);
  const totalMin = round25(sqft * totalPerSqftMin);
  const totalMax = round25(sqft * totalPerSqftMax);

  // ~25–40 sq ft of finished flatwork per labor-hour for a small crew.
  const hoursMin = Math.max(6, Math.round(sqft / 40));
  const hoursMax = Math.max(hoursMin + 2, Math.round(sqft / 25));
  const daysMin = Math.max(1, Math.round(hoursMin / 8));
  const daysMax = Math.max(daysMin, Math.round(hoursMax / 8));
  const timeEstimate =
    daysMin === daysMax
      ? `~${daysMin} day / ${hoursMin}–${hoursMax} labor hours`
      : `~${daysMin}–${daysMax} days / ${hoursMin}–${hoursMax} labor hours`;

  assumptions.push('Labor-only assumes you supply concrete/materials and prep.');

  return {
    laborMin,
    laborMax,
    laborSuggested,
    totalMin,
    totalMax,
    timeEstimate,
    assumptions,
    basis: `${isConcrete ? 'concrete' : 'deck/patio'} ${Math.round(sqft)} sqft${
      factors.length ? ' (' + factors.join(', ') + ')' : ''
    }`,
  };
}

// Hauling / junk removal: priced by load volume (cubic yards or truckloads) and
// heavy items. Materials are negligible (it's labor + disposal), so no total.
function haulingEstimate(text: string): MeasuredEstimate | null {
  const isHaul = hasKeyword(text, [
    'haul', 'hauling', 'junk', 'debris', 'dump run', 'dump', 'trash removal',
    'remove junk', 'cleanout', 'clean out', 'load',
  ]);
  if (!isHaul) return null;

  const yards = extractQuantityNear(text, 'cubic\\s*(?:yards?|yds?)|yards?|yds?');
  const loads = extractQuantityNear(text, 'truck\\s*loads?|loads?|pickup\\s*loads?');
  const heavyItems = extractCount(text, 'appliances?|fridge|refrigerator|couch|sofa|mattress|piano|hot\\s*tub|heavy\\s*items?');

  if (yards == null && loads == null && heavyItems == null) return null;

  // ~$60–$110 per cubic yard incl. labor + disposal; a "truckload" ≈ 3 cu yd.
  const effectiveYards = yards ?? (loads ? loads * 3 : 0);
  let laborMin = effectiveYards * 60;
  let laborMax = effectiveYards * 110;

  const assumptions: string[] = [];
  if (effectiveYards) {
    assumptions.push(
      yards
        ? `${yards} cubic yards of material, incl. disposal fees.`
        : `${loads} truckload${loads && loads > 1 ? 's' : ''} (~3 cu yd each), incl. disposal.`,
    );
  }
  if (heavyItems) {
    laborMin += heavyItems * 40;
    laborMax += heavyItems * 80;
    assumptions.push(`${heavyItems} heavy item${heavyItems > 1 ? 's' : ''} add lifting time.`);
  }

  // Floor so a tiny single-item haul still reads sensibly.
  laborMin = Math.max(laborMin, 80);
  laborMax = Math.max(laborMax, 150);

  const hoursMin = Math.max(1, Math.round(effectiveYards / 3) || 1);
  const hoursMax = Math.max(hoursMin + 1, Math.round(effectiveYards / 1.5) || 2);

  assumptions.push('Disposal/dump fees included; price is labor, not materials.');

  return {
    laborMin: round25(laborMin),
    laborMax: round25(laborMax),
    laborSuggested: round25((laborMin + laborMax) / 2),
    timeEstimate: `~${hoursMin}–${hoursMax} labor hours`,
    assumptions,
    basis: `hauling ${effectiveYards ? effectiveYards + ' cu yd' : (heavyItems ?? 0) + ' items'}`,
  };
}

// Moving help: priced by hours × movers, scaled by rooms / bedrooms. Labor only.
function movingEstimate(text: string): MeasuredEstimate | null {
  const isMove = hasKeyword(text, [
    'move', 'moving', 'movers', 'relocate', 'relocation', 'load truck',
    'unload', 'pack', 'packing',
  ]);
  if (!isMove) return null;

  const bedrooms = extractQuantityNear(text, 'bedrooms?|br\\b|bed\\b');
  const rooms = extractQuantityNear(text, 'rooms?');
  const units = bedrooms ?? rooms;
  if (units == null) return null;

  // ~3 labor-hours per bedroom for a 2-mover crew at ~$35/mover-hr.
  const moverHrs = Math.max(4, Math.round(units * 3)) * 2;
  const rate = 35;
  const laborMin = moverHrs * (rate - 8);
  const laborMax = moverHrs * (rate + 12);

  const hoursMin = Math.max(2, Math.round(moverHrs / 2 - 1));
  const hoursMax = Math.max(hoursMin + 1, Math.round(moverHrs / 2 + 1));

  return {
    laborMin: round25(laborMin),
    laborMax: round25(laborMax),
    laborSuggested: round25((laborMin + laborMax) / 2),
    timeEstimate: `~${hoursMin}–${hoursMax} hours with a 2-person crew`,
    assumptions: [
      `${units} ${bedrooms ? 'bedroom' : 'room'}${units > 1 ? 's' : ''}, 2 movers.`,
      'Labor only — truck/fuel not included.',
    ],
    basis: `moving ${units} ${bedrooms ? 'bedroom' : 'room'}`,
  };
}

// Cleaning: priced by rooms / square footage. Labor only (supplies minor).
function cleaningEstimate(text: string): MeasuredEstimate | null {
  const isClean = hasKeyword(text, ['clean', 'cleaning', 'maid', 'housekeeping', 'tidy', 'scrub']);
  if (!isClean) return null;

  const sqft = extractQuantityNear(text, 'sq\\s*ft|square\\s*feet|sqft');
  const rooms = extractQuantityNear(text, 'rooms?|bedrooms?|bathrooms?');
  if (sqft == null && rooms == null) return null;

  let laborMin: number;
  let laborMax: number;
  let assume: string;
  if (sqft != null) {
    laborMin = sqft * 0.08;
    laborMax = sqft * 0.16;
    assume = `${sqft} sq ft.`;
  } else {
    laborMin = (rooms as number) * 35;
    laborMax = (rooms as number) * 70;
    assume = `${rooms} room${(rooms as number) > 1 ? 's' : ''}.`;
  }
  if (hasKeyword(text, ['deep clean', 'move out', 'move-out', 'deep'])) {
    laborMin *= 1.4;
    laborMax *= 1.6;
    assume += ' Deep / move-out clean.';
  }
  laborMin = Math.max(laborMin, 70);
  laborMax = Math.max(laborMax, 120);

  const hoursMin = Math.max(2, Math.round(laborMin / 35));
  const hoursMax = Math.max(hoursMin + 1, Math.round(laborMax / 30));

  return {
    laborMin: round25(laborMin),
    laborMax: round25(laborMax),
    laborSuggested: round25((laborMin + laborMax) / 2),
    timeEstimate: `~${hoursMin}–${hoursMax} labor hours`,
    assumptions: [assume, 'Labor only — cleaning supplies are minor.'],
    basis: 'cleaning',
  };
}

// Generic handyman / fix-it with an explicit hour count in the text.
function handymanEstimate(text: string): MeasuredEstimate | null {
  const hours = extractQuantityNear(text, 'hours?|hrs?');
  if (hours == null) return null;
  // Only treat as a measured job when it reads like labor, not "2 hours away".
  if (!hasKeyword(text, [
    'install', 'repair', 'fix', 'assemble', 'mount', 'build', 'replace',
    'handyman', 'labor', 'work', 'hang', 'patch',
  ])) {
    return null;
  }
  const rate = 45;
  const laborMin = hours * (rate - 10);
  const laborMax = hours * (rate + 20);
  return {
    laborMin: round25(laborMin),
    laborMax: round25(laborMax),
    laborSuggested: round25(hours * rate),
    timeEstimate: `~${hours} labor hours`,
    assumptions: [`About ${hours} labor hours at a local handyman rate.`, 'Labor only — materials extra.'],
    basis: `handyman ${hours} hr`,
  };
}

// Try each heuristic in priority order. Fence keywords are most specific, so
// they win even if the category is set to something generic.
function measure(text: string): MeasuredEstimate | null {
  return (
    fencingEstimate(text) ??
    flatworkEstimate(text) ??
    haulingEstimate(text) ??
    movingEstimate(text) ??
    cleaningEstimate(text) ??
    handymanEstimate(text)
  );
}

// ── Contractor-license guidance ──────────────────────────────────────────────

// Tasks where CSLB licensing is relevant (construction / improvement work).
const LICENSE_RELEVANT = [
  'fence', 'fencing', 'deck', 'patio', 'paint', 'painting', 'drywall',
  'concrete', 'slab', 'cement', 'foundation', 'footing', 'pad',
  'install', 'build', 'construction', 'remodel', 'roof', 'roofing',
  'electrical', 'plumbing', 'handyman', 'repair', 'framing', 'tile',
  'flooring', 'tree',
];

function contractorNotice(
  text: string,
  category: string | null,
  roughTotal: number,
): ContractorNotice {
  const relevant =
    hasKeyword(text, LICENSE_RELEVANT) ||
    category === 'fencing' ||
    category === 'handyman' ||
    category === 'painting';

  if (relevant && roughTotal >= CSLB_THRESHOLD) {
    return {
      required: true,
      message:
        'This may require a licensed contractor in California. The CSLB unlicensed exemption generally applies only when total labor + materials stays under $1,000 with no permit and no employees. TryHardly workers should only accept jobs they are legally qualified to perform — verify local rules (CSLB).',
    };
  }
  if (relevant) {
    return {
      required: false,
      message:
        'Under California’s ~$1,000 small-project exemption, but needing a permit or employees can still require a licensed contractor. Verify local rules.',
    };
  }
  return { required: false, message: '' };
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

  // Job-specific measurement heuristics. When one fires it drives the headline
  // range (labor-only) so large jobs are no longer quoted like a single visit.
  const measured = payType !== 'hourly' && text ? measure(text) : null;

  let minR: number;
  let maxR: number;
  let explanation: string;

  if (measured) {
    minR = measured.laborMin;
    maxR = measured.laborMax;
    factors.push('sized to the job');
    explanation =
      `Labor only (you supply materials): $${measured.laborMin}–$${measured.laborMax}` +
      (measured.totalMin != null
        ? `. Materials + labor: ~$${measured.totalMin}–$${measured.totalMax}`
        : '') +
      `. Time: ${measured.timeEstimate}.`;
  } else {
    minR = clampRound(min);
    maxR = clampRound(max);
    // Guarantee a sensible spread even after rounding collisions.
    if (maxR <= minR) maxR = clampRound(minR * 1.5);
    const unit = payType === 'hourly' ? '/hr' : '';
    const factorTail = ` based on ${base.label}${factors.length ? ' + ' + factors.join(' + ') : ''}`;
    explanation = `Typical local range: $${minR}–$${maxR}${unit}${factorTail}.`;
  }

  // Contractor guidance keys off the highest rough total we have: a measured
  // materials+labor total when present, otherwise the headline ceiling.
  const roughTotal = measured?.totalMax ?? measured?.laborMax ?? maxR;
  const contractor = contractorNotice(text, (inputs.category as string) ?? null, roughTotal);

  return {
    min: minR,
    max: maxR,
    categoryLabel: base.label,
    explanation,
    factors,
    measured: measured ?? undefined,
    contractor,
  };
}
