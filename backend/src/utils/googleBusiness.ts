// Validation for the self-reported Google Business Profile link on worker
// profiles. Accepts links to Google-owned business-listing hosts only. This
// proves the link points at a real Google business page — it does NOT prove
// the worker owns the listing, so the UI must never call it "verified".

const SHORT_HOSTS = new Set(['g.page', 'goo.gl']);
const MAX_URL_LENGTH = 500;

function isGoogleHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (SHORT_HOSTS.has(h)) return true;
  return h === 'google.com' || h.endsWith('.google.com');
}

/**
 * Clean a submitted Google Business Profile URL.
 * - undefined → undefined (field not provided; leave unchanged)
 * - null / '' → null (cleared)
 * - otherwise must be an http(s) URL on a Google business-listing host
 * Throws an Error with a user-facing message when invalid.
 */
export function cleanGoogleBusinessUrl(input: unknown): string | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input !== 'string') {
    throw new Error('Google Business link must be a URL string');
  }
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new Error('Google Business link is too long');
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Google Business link must be a valid URL (e.g. https://g.page/…)');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Google Business link must start with http:// or https://');
  }
  if (!isGoogleHost(url.hostname)) {
    throw new Error(
      'Google Business link must point to a Google business page (a google.com, g.page, or goo.gl link)'
    );
  }
  return url.toString();
}
