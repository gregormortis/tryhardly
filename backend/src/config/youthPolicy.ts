// ─── Young workers ──────────────────────────────────────────────────────────
//
// TryHardly deliberately welcomes 16- and 17-year-olds alongside adult
// contractors. Every comparable platform — TaskRabbit, Thumbtack, Angi,
// Care.com — is 18+, so the teenager with a mower who used to knock on doors
// has nowhere legitimate to go online. That is the gap this fills.
//
// It is also the single largest legal and reputational risk the platform
// carries, so the rules below are enforced in code rather than left to a
// policy page nobody reads.
//
// ── Why 16 and not younger ──
// California's own DLSE Child Labor Laws pamphlet lists "lawn mowing" and
// "leaf raking" as examples of irregular odd jobs in private homes that need
// no work permit, and self-employed minors need no permit either. 16–17 is
// also the tier where California's hour rules are most permissive and where
// the federal 14–15 power-equipment ban does not apply — a 14-year-old may not
// lawfully run a power mower for an employer, a 16-year-old may.
// Under-13s are excluded outright so COPPA never enters the picture.
//
// ── Why a parent owns the account, and approves every job ──
// A minor never holds their own account. A parent or guardian holds it and
// their under-18 household members work under it.
//
// One-time consent at signup is a checkbox. It does not tell a parent which
// address their kid is standing at on Saturday morning. So approval is required
// PER JOB — that job, that address, that day — and it is invalidated
// automatically if the customer later changes the address or the time. A
// consent record that silently carries over to a place the parent never agreed
// to is consent theatre.
//
// ── On sex offender registry checks ──
// TryHardly does NOT check anyone against a registry, and must not.
// California Penal Code 290.46(j)(2)(H) makes it a PROHIBITED USE to apply
// registry information to "benefits, privileges, or services provided by any
// business establishment". Exposure is treble actual damages, attorney's fees,
// exemplary damages, a civil penalty up to $25,000, and injunctive relief for a
// "pattern or practice" of misuse — which is exactly what an automated
// screening feature is. The Attorney General, any district attorney, any city
// attorney, or any aggrieved person may bring it.
//
// The statute authorizes use "only to protect a person at risk", and a parent
// checking to protect their own child fits that cleanly. So the platform shows
// the parent the address and links them to the official state site, and records
// only that they were shown it. The judgement stays with the responsible adult.
// That is lawful, and it is better than a platform guessing.
//
// There is also no lawful technical route: neither meganslaw.ca.gov nor the
// federal NSOPW publishes an API, and NSOPW's conditions of use expressly bar
// automated searching.
//
// And we never claim to screen. Care.com paid a $1,000,000 California district
// attorney settlement over registry-check claims it did not honour, plus an
// $8,500,000 FTC settlement.
//
// ── Sources ──
// California DLSE Child Labor Laws pamphlet:
//   https://www.dir.ca.gov/DLSE/ChildLaborLawPamphlet.pdf
// DOL Fact Sheet #43 (FLSA child labor, non-agricultural):
//   https://www.dol.gov/agencies/whd/fact-sheets/43-child-labor-non-agriculture
// California Dept. of Education, work permits:
//   https://www.cde.ca.gov/ci/ct/we/workpermitsforstudents.asp
//
// NOT LEGAL ADVICE. A California employment attorney must review this before
// it is relied on. Open questions are listed at the bottom of this file.

export const MINIMUM_YOUTH_AGE = 16;
export const ADULT_AGE = 18;

/**
 * Job categories a 16–17 year old may bid on.
 *
 * Restricted to outdoor, street-visible work. That single constraint removes
 * most of the "adult alone in a private residence with a minor" scenario,
 * which is both the worst outcome and the hardest to defend having allowed.
 */
export const YOUTH_ALLOWED_CATEGORIES = ['yard', 'errands', 'other'] as const;

/**
 * Categories a minor may never bid on, with the reason attached. The reasons
 * are shown to the worker rather than a generic refusal — someone told "no"
 * without explanation assumes the rule is arbitrary and looks for a way round
 * it.
 *
 * Federal Hazardous Occupations Orders (HO) apply to everyone under 18, with
 * no parental-consent exception:
 *   HO 5  — power-driven woodworking machines (chainsaws, chippers)
 *   HO 7  — power-driven hoisting equipment (lifts, boom trucks)
 *   HO 14 — circular saws, band saws, chain saws, wood chippers
 *   HO 15 — wrecking, demolition, shipbreaking
 *   HO 16 — roofing operations and all work on or about a roof
 *   HO 17 — excavation operations
 */
export const YOUTH_BLOCKED_CATEGORIES: Record<string, string> = {
  hauling:
    'Junk removal and dump runs usually mean driving and heavy demolition-style loads, which are off limits under 18.',
  moving:
    'Moving jobs normally involve driving a truck, which you cannot do as part of paid work under 18.',
  handyman:
    'Handyman work often involves ladders, roofs, and power tools that are off limits under 18.',
  painting:
    'Painting jobs usually involve ladders and work at height, which are off limits under 18.',
  pressure:
    'Pressure washing regularly means working at height and with equipment that is off limits under 18.',
  cleaning:
    'Cleaning jobs happen inside someone\u2019s home. Under 18 you can only take outdoor work where you are visible from the street.',
};

/**
 * Tasks no minor may perform, whatever the category. Surfaced to both the
 * young worker and the customer, because the customer is usually the one who
 * would casually ask for "one more thing while you're here" — and that is
 * exactly how a permitted yard job turns into an unlawful one.
 */
export const YOUTH_PROHIBITED_TASKS = [
  'Chainsaws, wood chippers, or log splitters',
  'Riding mowers — walk-behind mowers only',
  'Any work on or from a roof, including gutter cleaning',
  'Ladders and any work at height',
  'Trenching, digging out, or excavation',
  'Lifts, hoists, or boom equipment',
  'Driving as part of the job',
  'Demolition or tear-out work',
  'Working alone inside a customer\u2019s home',
];

// Platform hours, deliberately tighter than California's legal 5am–10pm window
// for 16–17 year olds. The legal maximum is not a sensible default for a
// teenager at a stranger's address.
export const YOUTH_EARLIEST_HOUR = 8;
export const YOUTH_LATEST_HOUR = 18;

/**
 * Federal domestic-service coverage can attach once one household pays one
 * worker roughly $1,000 in a year or the worker exceeds 8 hours a week for
 * that household. Past that point "casual odd job" starts looking like
 * employment, which carries permit and hour obligations neither a homeowner
 * nor a 16-year-old is equipped to handle.
 *
 * A reputation marketplace actively pushes toward repeat bookings with the
 * same customer, so the product's own success is what creates this exposure.
 * We warn well before the line rather than discovering it afterwards.
 */
export const YOUTH_REPEAT_WARN_CENTS = 75000; // $750, warn at 75% of the threshold
export const YOUTH_REPEAT_LIMIT_CENTS = 100000; // $1,000

export function isYouthAge(age: number): boolean {
  return age >= MINIMUM_YOUTH_AGE && age < ADULT_AGE;
}

/** Age in whole years from a date of birth. */
export function ageFromDateOfBirth(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export interface YouthEligibility {
  allowed: boolean;
  reason?: string;
}

/**
 * Whether a young worker may bid on a job in this category.
 *
 * Fails CLOSED: an unrecognized category is refused rather than permitted.
 * A new category added later must be explicitly opened to minors, so the
 * default for anything unknown is no.
 */
export function canYouthBidOnCategory(category: string | null | undefined): YouthEligibility {
  const slug = (category ?? '').trim().toLowerCase();

  if (!slug) {
    return {
      allowed: false,
      reason:
        'This job does not say what kind of work it is, so we cannot tell whether it is one you can take.',
    };
  }
  if ((YOUTH_ALLOWED_CATEGORIES as readonly string[]).includes(slug)) {
    return { allowed: true };
  }
  if (YOUTH_BLOCKED_CATEGORIES[slug]) {
    return { allowed: false, reason: YOUTH_BLOCKED_CATEGORIES[slug] };
  }
  return {
    allowed: false,
    reason:
      'This job type is not open to workers under 18 yet. Yard work and errands are, and there is usually plenty of both.',
  };
}

// ─── Open questions for counsel ─────────────────────────────────────────────
// Flagged in code so they are not lost in a document:
//
// 1. Does a reputation/repeat-booking marketplace risk converting "irregular
//    odd jobs" into regulated employment for frequent worker-customer pairs?
// 2. Should YOUTH_REPEAT_LIMIT_CENTS be a hard block rather than a warning?
// 3. Riding mowers and log splitters have no clear primary-source answer.
//    Both are banned here pending confirmation.
// 4. Does California's regulation of employment/referral agencies create a
//    separate licensing obligation, distinct from child-labor law?
// 5. Do standard liability policies exclude minor-worker exposure?


// ─── Per-job approval ───────────────────────────────────────────────────────

/**
 * Fields whose change invalidates an existing parental approval.
 *
 * The parent approved a specific place at a specific time. Change either and
 * the thing they agreed to no longer exists.
 */
export const APPROVAL_INVALIDATING_FIELDS = [
  'address',
  'scheduledFor',
  'scheduleNote',
] as const;

export interface ApprovalSnapshot {
  addressAtApproval: string;
  scheduleAtApproval?: Date | null;
  scheduleNoteAtApproval?: string | null;
}

export interface CurrentJobDetails {
  address: string;
  scheduledFor?: Date | null;
  scheduleNote?: string | null;
}

function sameTime(a?: Date | null, b?: Date | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
}

function sameText(a?: string | null, b?: string | null): boolean {
  return (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();
}

/**
 * Whether an approval still matches the job as it now stands.
 *
 * Deliberately strict. A near-match is not a match: "12 Oak St" and "12 Oak
 * Street, round the back" may well be the same house, but the parent should
 * re-approve rather than have the platform decide the difference is immaterial.
 */
export function isApprovalStillValid(
  snapshot: ApprovalSnapshot,
  current: CurrentJobDetails,
): { valid: boolean; changed?: string } {
  if (!sameText(snapshot.addressAtApproval, current.address)) {
    return { valid: false, changed: 'address' };
  }
  if (!sameTime(snapshot.scheduleAtApproval, current.scheduledFor)) {
    return { valid: false, changed: 'scheduledFor' };
  }
  if (!sameText(snapshot.scheduleNoteAtApproval, current.scheduleNote)) {
    return { valid: false, changed: 'scheduleNote' };
  }
  return { valid: true };
}

/**
 * The official California registry search, for a PARENT to use themselves.
 *
 * Exported as a constant so it is never templated into a server-side lookup by
 * accident. Nothing in this codebase may fetch it: see the registry note at the
 * top of this file.
 */
export const CA_REGISTRY_PARENT_URL = 'https://www.meganslaw.ca.gov/';

/**
 * Whether a job is inside platform hours for a young worker.
 * Tighter than California's legal 5am-10pm for 16-17 year olds.
 */
export function isWithinYouthHours(when: Date): boolean {
  const h = when.getHours();
  return h >= YOUTH_EARLIEST_HOUR && h < YOUTH_LATEST_HOUR;
}
