// Shared config for SEO landing pages under /jobs/[category]. The ids match the
// UI category ids that PostQuestForm writes into Quest.tags[] and that the
// Questboard filters on, so a landing page can deep-link into a filtered board.

export interface JobCategory {
  slug: string;
  label: string;
  // Plain-language description of the work, used in landing-page copy + metadata.
  blurb: string;
  examples: string[];
}

export const JOB_CATEGORIES: JobCategory[] = [
  {
    slug: 'yard',
    label: 'Lawn & Yard Work',
    blurb: 'Mowing, weeding, leaf cleanup, hedge trimming, and seasonal yard care.',
    examples: ['Weekly lawn mowing', 'Leaf and yard cleanup', 'Hedge & bush trimming'],
  },
  {
    slug: 'hauling',
    label: 'Hauling & Junk Removal',
    blurb: 'Furniture removal, garage cleanouts, debris hauling, and dump runs.',
    examples: ['Garage cleanout', 'Old furniture removal', 'Construction debris haul-off'],
  },
  {
    slug: 'moving',
    label: 'Moving Help',
    blurb: 'Loading, unloading, and moving help for apartments, homes, and storage units.',
    examples: ['Apartment move help', 'Load a moving truck', 'Move heavy furniture'],
  },
  {
    slug: 'handyman',
    label: 'Handyman Jobs',
    blurb: 'Small repairs, furniture assembly, mounting, and general fix-it tasks.',
    examples: ['TV mounting', 'Furniture assembly', 'Fix a leaky faucet'],
  },
  {
    slug: 'cleaning',
    label: 'Cleaning',
    blurb: 'Home cleaning, move-out cleans, and one-off deep cleaning jobs.',
    examples: ['Move-out deep clean', 'Weekly house cleaning', 'Post-renovation cleanup'],
  },
  {
    slug: 'painting',
    label: 'Painting',
    blurb: 'Interior and exterior painting, touch-ups, and small paint jobs.',
    examples: ['Paint a bedroom', 'Touch-up exterior trim', 'Fence staining'],
  },
  {
    slug: 'pressure',
    label: 'Pressure Washing',
    blurb: 'Driveways, decks, siding, and patio pressure washing.',
    examples: ['Driveway wash', 'Deck cleaning', 'House siding wash'],
  },
  {
    slug: 'other',
    label: 'Odd Jobs',
    blurb: 'Errands, assembly, organizing, and any local task that needs a hand.',
    examples: ['Help organizing a garage', 'Run local errands', 'Assemble flat-pack furniture'],
  },
];

export function getJobCategory(slug: string): JobCategory | undefined {
  return JOB_CATEGORIES.find((c) => c.slug === slug.toLowerCase());
}

// Turn a URL slug like "rocklin-ca" into a human label like "Rocklin Ca".
export function humanizeCity(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
