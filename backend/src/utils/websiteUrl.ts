// Validation for the self-reported personal website / social profile link on
// worker profiles. Accepts any http(s) URL — this is the worker's own link
// (personal site, Facebook, Instagram, portfolio…), so there is no host
// restriction. Self-reported: the UI must never call it "verified".

const MAX_URL_LENGTH = 500;

/**
 * Clean a submitted personal website / social profile URL.
 * - undefined → undefined (field not provided; leave unchanged)
 * - null / '' → null (cleared)
 * - otherwise must be an http(s) URL
 * Throws an Error with a user-facing message when invalid.
 */
export function cleanWebsiteUrl(input: unknown): string | null | undefined {
  if (input === undefined) return undefined;
  if (input === null) return null;
  if (typeof input !== 'string') {
    throw new Error('Website link must be a URL string');
  }
  const trimmed = input.trim();
  if (trimmed === '') return null;
  if (trimmed.length > MAX_URL_LENGTH) {
    throw new Error('Website link is too long');
  }
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error('Website link must be a valid URL (e.g. https://…)');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Website link must start with http:// or https://');
  }
  return url.toString();
}
