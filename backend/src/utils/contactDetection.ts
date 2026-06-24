// ─── Platform-safe messaging: contact / off-platform detection ────────────────
//
// A small, dependency-free helper that scans user-submitted free text for
// attempts to move a deal off TryHardly *before a bid is accepted* — shared
// contact details (phone, email, social handles) and off-platform payment
// language (Venmo, Cash App, Zelle, PayPal, "text me", "DM me", external links).
//
// Why pre-acceptance only: keeping the first contact and the payment handshake
// on-platform is what protects both sides (dispute trail, no fee circumvention,
// no scams that start with "just Venmo me a deposit"). Once a bid is accepted
// the two parties legitimately need to coordinate logistics, so callers should
// stop applying this there — see messageController.
//
// Design goals:
//   • Keep false positives reasonable. Material lists and measurements are the
//     lifeblood of this marketplace, so "T-post", "2x4", '8 ft', '$120', and
//     "10x12 deck" must NOT trip the filter.
//   • No surveillance / storage here — this module only classifies a string.
//     Enforcement (return a validation error) lives in the controllers.

export type ContactMatchType =
  | 'PHONE'
  | 'EMAIL'
  | 'PAYMENT_APP'
  | 'CONTACT_SOLICITATION'
  | 'EXTERNAL_LINK'
  | 'SOCIAL_HANDLE';

export interface ContactMatch {
  type: ContactMatchType;
  // The substring that triggered the match (trimmed, for logging / debugging).
  value: string;
}

export interface ContactDetectionResult {
  hasContactInfo: boolean;
  matches: ContactMatch[];
  // De-duplicated list of match types, useful for logging / reporting.
  types: ContactMatchType[];
}

// User-friendly, Stripe-safe copy. Surfaced verbatim by controllers when a
// pre-acceptance submission is blocked.
export const CONTACT_INFO_VALIDATION_MESSAGE =
  'For safety, keep contact details and payment arrangements on TryHardly until a bid is accepted.';

// ─── Patterns ─────────────────────────────────────────────────────────────────

// Email addresses. Standard-enough local@domain.tld.
const EMAIL_RE = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi;

// Social / messaging handles like "@johndoe" or "@gmail". A leading @ followed
// by a handle of 3+ chars. Email addresses are caught by EMAIL_RE first and
// stripped before this runs, so "user@gmail.com" doesn't double-count.
const SOCIAL_HANDLE_RE = /(^|[\s(>])@[a-z0-9_.]{3,}\b/gi;

// Off-platform payment apps / rails. Word-boundary matched so they don't fire
// inside unrelated words.
const PAYMENT_APP_RE =
  /\b(venmo|cash\s?app|cashapp|\$cashtag|zelle|paypal|pay\s?pal|apple\s?pay|google\s?pay|wire\s?transfer|western\s?union|bitcoin|btc|\beth\b|crypto|gift\s?card)\b/gi;

// Solicitations to take the conversation off-platform.
const CONTACT_SOLICITATION_RE =
  /\b(text|call|ring|whatsapp|whats\s?app|signal|telegram|snapchat|snap|insta(gram)?|facebook|messenger)\s+(me|us|my|him|her|direct)\b|\b(dm|pm|hmu|reach\s+me|contact\s+me|message\s+me|email\s+me|hit\s+me\s+up)\b|\bmy\s+(number|cell|phone|digits|email|e-mail)\b|\boff[\s-]?(platform|app|site)\b|\b(pay|paid|payment|deposit)\s+(me\s+)?(directly|in\s+cash|cash|outside)\b|\bcash\s+only\b/gi;

// External links / URLs. Matches http(s) URLs and bare domains with a common
// TLD. We deliberately do NOT treat TryHardly's own measurement/material tokens
// as links (handled by guarding the TLD set and requiring a dot-separated host).
const EXTERNAL_LINK_RE =
  /\b((https?:\/\/)[^\s]+|(www\.)[^\s]+|[a-z0-9-]+\.(com|net|org|io|co|app|me|gg|xyz|info|biz)\b(\/[^\s]*)?)/gi;

// Phone numbers. North-American-ish: optional +1/country code, then 10 digits
// with common separators (space, dash, dot, parens). Requires at least the area
// code + number so 3–4 digit measurements ("8 ft", "2x4", "120") never match.
//
// To avoid flagging money/measurements we require a phone-shaped grouping
// (e.g. 555-123-4567, (555) 123 4567, 5551234567, +1 555 123 4567) rather than
// any run of digits.
const PHONE_RE =
  /(?:\+?\d{1,2}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]\d{3}[\s.-]\d{4}\b|\b\d{10}\b|\b\d{3}[\s.-]\d{4}\b/g;

// Spelled-out digit obfuscation like "five five five 123 4567" is intentionally
// out of scope for the MVP — see follow-ups in the PR description.

function pushMatches(
  out: ContactMatch[],
  type: ContactMatchType,
  text: string,
  re: RegExp,
): void {
  const matches = text.match(re);
  if (!matches) return;
  for (const m of matches) {
    const value = m.trim();
    if (value) out.push({ type, value });
  }
}

/**
 * Scan a free-text string for contact info / off-platform payment attempts.
 * Pure and side-effect free. Returns every match plus a de-duplicated type list.
 *
 * Non-string / empty input is treated as "nothing found".
 */
export function detectContactInfo(input: unknown): ContactDetectionResult {
  if (typeof input !== 'string' || input.trim() === '') {
    return { hasContactInfo: false, matches: [], types: [] };
  }

  const matches: ContactMatch[] = [];

  // Emails first, then remove them so their "@domain" tail and "domain.com"
  // host don't also register as a social handle or external link.
  pushMatches(matches, 'EMAIL', input, EMAIL_RE);
  const withoutEmails = input.replace(EMAIL_RE, ' ');

  pushMatches(matches, 'PHONE', withoutEmails, PHONE_RE);
  pushMatches(matches, 'PAYMENT_APP', withoutEmails, PAYMENT_APP_RE);
  pushMatches(matches, 'CONTACT_SOLICITATION', withoutEmails, CONTACT_SOLICITATION_RE);
  pushMatches(matches, 'EXTERNAL_LINK', withoutEmails, EXTERNAL_LINK_RE);
  pushMatches(matches, 'SOCIAL_HANDLE', withoutEmails, SOCIAL_HANDLE_RE);

  const types = Array.from(new Set(matches.map((m) => m.type)));
  return { hasContactInfo: matches.length > 0, matches, types };
}

/**
 * Convenience boolean wrapper around {@link detectContactInfo}.
 */
export function containsContactInfo(input: unknown): boolean {
  return detectContactInfo(input).hasContactInfo;
}

/**
 * Run {@link detectContactInfo} across several named fields and return the first
 * field that trips the filter, if any. Lets a controller validate a whole bid /
 * application payload in one call and report which field was the problem.
 *
 * `fields` maps a human field label → its submitted value. Order is preserved.
 */
export function findContactInfoInFields(
  fields: Record<string, unknown>,
): { field: string; result: ContactDetectionResult } | null {
  for (const [field, value] of Object.entries(fields)) {
    const result = detectContactInfo(value);
    if (result.hasContactInfo) return { field, result };
  }
  return null;
}
