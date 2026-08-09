// Canonical service-area list for the Redding-first launch.
//
// Drives three things that must stay in sync:
//   1. The /jobs/[category]/[city] SEO landing-page matrix
//   2. sitemap.ts, so those pages are actually discoverable
//   3. Service / areaServed structured data
//
// Only add a city here when TryHardly can genuinely serve it. An indexed page
// promising coverage that does not exist is worse than no page — it converts
// a visitor once and loses them permanently.

export interface ServiceArea {
  // URL slug, e.g. "redding-ca" -> /jobs/yard/redding-ca
  slug: string;
  city: string;
  state: string;
  // Rough population, used only for ordering pages by likely search demand.
  population: number;
  // True for the launch market. Non-primary areas are real but thinner, and
  // their pages say so rather than implying equal coverage.
  primary: boolean;
}

export const SERVICE_AREAS: ServiceArea[] = [
  { slug: 'redding-ca', city: 'Redding', state: 'CA', population: 93611, primary: true },
  { slug: 'anderson-ca', city: 'Anderson', state: 'CA', population: 11300, primary: false },
  { slug: 'shasta-lake-ca', city: 'Shasta Lake', state: 'CA', population: 10200, primary: false },
  { slug: 'cottonwood-ca', city: 'Cottonwood', state: 'CA', population: 6800, primary: false },
  { slug: 'palo-cedro-ca', city: 'Palo Cedro', state: 'CA', population: 1400, primary: false },
  { slug: 'red-bluff-ca', city: 'Red Bluff', state: 'CA', population: 14100, primary: false },
];

export const PRIMARY_AREA = SERVICE_AREAS[0];

const BY_SLUG = new Map(SERVICE_AREAS.map((a) => [a.slug, a]));

export function getServiceArea(slug: string): ServiceArea | undefined {
  return BY_SLUG.get(slug.toLowerCase());
}

// Format a city slug for display. Known areas render as "Redding, CA".
// Unknown slugs fall back to title case, and a trailing two-letter token is
// treated as a state so "rocklin-ca" reads "Rocklin, CA" rather than
// "Rocklin Ca".
export function formatCitySlug(slug: string): string {
  const known = getServiceArea(slug);
  if (known) return `${known.city}, ${known.state}`;

  const parts = slug.split('-').filter(Boolean);
  if (parts.length === 0) return '';

  const last = parts[parts.length - 1];
  const isState = parts.length > 1 && last.length === 2;
  const words = (isState ? parts.slice(0, -1) : parts)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return isState ? `${words}, ${last.toUpperCase()}` : words;
}
