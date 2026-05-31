// Lead acquisition attribution captured from the URL on the low-friction lead
// forms (/request-help, /work-alerts). `source` is the primary launch-channel
// label (?source=...); the utm_*/ref params are passed through so we can measure
// which channels drive job requests and worker alerts. Everything is read from
// the current URL and trimmed/length-capped client-side; the backend re-validates
// and is the source of truth, so this is best-effort convenience only.

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'] as const;

export interface LeadSource {
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ref?: string;
}

function clean(value: string | null, max: number): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

// Reads attribution params from the given search string (defaults to the current
// URL). Returns only the keys that were actually present, so a visit with no
// params yields an empty object and the lead is submitted exactly as before.
export function readLeadSource(search?: string): LeadSource {
  const query = search ?? (typeof window !== 'undefined' ? window.location.search : '');
  const params = new URLSearchParams(query);

  const result: LeadSource = {};

  const source = clean(params.get('source'), 120);
  if (source) result.source = source;

  for (const key of UTM_KEYS) {
    const v = clean(params.get(key), 200);
    if (v) result[key] = v;
  }

  return result;
}
