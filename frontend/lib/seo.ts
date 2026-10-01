// Canonical-URL helpers for SEO metadata.
//
// Google's Search Console flagged a canonical conflict on the www property:
// pages declared relative canonicals (e.g. '/jobs') resolved against
// metadataBase, while the layout also stamped a blanket canonical of '/'
// onto every page that didn't declare its own — telling Google that pages
// like /pricing and /post-a-job were duplicates of the homepage.
//
// The rule going forward: every indexable page declares an ABSOLUTE
// canonical that exactly matches the URL advertised for it in sitemap.xml
// (homepage with trailing slash, everything else without). Use
// canonicalUrl() in page metadata; never declare a relative canonical.

const FALLBACK_SITE_URL = 'https://www.tryhardly.com';

/** The public site origin, e.g. 'https://www.tryhardly.com' (no trailing slash). */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL).replace(/\/+$/, '');
}

/**
 * Absolute canonical URL for a site path.
 * - canonicalUrl('/')        -> 'https://www.tryhardly.com/'
 * - canonicalUrl('/jobs')    -> 'https://www.tryhardly.com/jobs'
 * - canonicalUrl('jobs')     -> 'https://www.tryhardly.com/jobs'
 * - canonicalUrl('/jobs/')   -> 'https://www.tryhardly.com/jobs' (trailing
 *   slash stripped except on the homepage, matching sitemap.xml)
 */
export function canonicalUrl(path: string): string {
  const base = siteUrl();
  const trimmed = (path || '/').trim();
  if (trimmed === '' || trimmed === '/') return `${base}/`;
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${normalized.replace(/\/+$/, '')}`;
}

// NOTE (2026-10-01): Vercel reuses a previous deployment's build output when
// a push leaves the file tree unchanged, so an empty "redeploy" commit does
// not regenerate prerendered pages. This comment exists to force a real
// rebuild after the #147 deploy served stale homepage/progression HTML.
