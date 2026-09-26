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
  // One or two sentences of genuinely local color. Rendered on the area's
  // landing pages so they read as written for the town, not templated.
  blurb: string;
}

export const SERVICE_AREAS: ServiceArea[] = [
  {
    slug: 'redding-ca',
    city: 'Redding',
    state: 'CA',
    population: 93611,
    primary: true,
    blurb:
      "TryHardly's launch market and the largest city in California's far north — from the Turtle Bay riverfront to the hilltop neighborhoods east of I-5, local workers cover the whole metro.",
  },
  {
    slug: 'anderson-ca',
    city: 'Anderson',
    state: 'CA',
    population: 11300,
    primary: false,
    blurb:
      "Shasta County's second city, ten minutes south of Redding on I-5 — family neighborhoods, ranch properties, and the Anderson River Park corridor.",
  },
  {
    slug: 'shasta-lake-ca',
    city: 'Shasta Lake',
    state: 'CA',
    population: 10200,
    primary: false,
    blurb:
      'The I-5 gateway to Shasta Lake reservoir — marinas, lake-view homes, and hillside properties where yard work and repairs are a way of life.',
  },
  {
    slug: 'cottonwood-ca',
    city: 'Cottonwood',
    state: 'CA',
    population: 6800,
    primary: false,
    blurb:
      'A Sacramento River town straddling the Shasta–Tehama county line, twenty minutes south of Redding — small-town streets with big-property upkeep.',
  },
  {
    slug: 'palo-cedro-ca',
    city: 'Palo Cedro',
    state: 'CA',
    population: 1400,
    primary: false,
    blurb:
      'A quiet residential community east of Redding along Highway 44 — acreage homes, horse properties, and oak-studded lots.',
  },
  {
    slug: 'red-bluff-ca',
    city: 'Red Bluff',
    state: 'CA',
    population: 14100,
    primary: false,
    blurb:
      'The Tehama County seat, about thirty minutes south of Redding on I-5 — historic downtown blocks and river-bend neighborhoods.',
  },
  {
    slug: 'bella-vista-ca',
    city: 'Bella Vista',
    state: 'CA',
    population: 4088,
    primary: false,
    blurb:
      'A rural community eighteen miles northeast of Redding on the edge of Shasta National Forest — forest and waterfront properties near the Pit River arm of Shasta Lake.',
  },
  {
    slug: 'mountain-gate-ca',
    city: 'Mountain Gate',
    state: 'CA',
    population: 815,
    primary: false,
    blurb:
      'A small I-5 community just north of Redding at the gateway to the Shasta Lake area — hillside homes with big views and bigger brush-clearing needs.',
  },
  {
    slug: 'centerville-ca',
    city: 'Centerville',
    state: 'CA',
    population: 2542,
    primary: false,
    blurb:
      'A Gold Rush-era community minutes west of Redding — historic homes and rural parcels along the road to Whiskeytown.',
  },
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
