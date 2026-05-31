// Trade standards & completion checklists for TryHardly.
//
// These are practical, professional work standards — not legal advice and not a
// guarantee by TryHardly. Slugs intentionally match lib/jobCategories.ts and the
// Quest.category values so a quest can resolve to a relevant checklist, and a
// /standards/<slug> page can deep-link to the matching category.

export interface TradeStandardSection {
  // Short heading for the checklist group.
  heading: string;
  // Practical checklist items. Keep each item to one clear action.
  items: string[];
}

export interface TradeStandard {
  slug: string;
  label: string;
  // One-line summary of the work this standard covers.
  blurb: string;
  // What good work looks like for this trade.
  goodWork: string[];
  // What the worker should document (photos / notes).
  document: string[];
  // What the client should clarify before work starts.
  clarify: string[];
  // What counts as proof the job is done.
  completionProof: string[];
  // Safety and property-respect notes specific to the trade.
  safety: string[];
}

// Generic items every job shares, so a category only has to add what's specific.
const COMMON_GOOD_WORK = [
  'Confirm the scope, timeline, and agreed price before starting.',
  'Show up on time, or give as much notice as you can if plans change.',
  'Keep the client updated and flag any surprises early.',
];

const COMMON_DOCUMENT = [
  'Take clear before photos of the work area.',
  'Take after photos once the job is complete.',
  'Note anything unexpected you found (existing damage, hidden issues).',
];

const COMMON_SAFETY = [
  'Treat the property and belongings with care.',
  'Tell the client right away if anything is damaged.',
  'Leave the area at least as tidy as you found it.',
];

export const TRADE_STANDARDS: TradeStandard[] = [
  {
    slug: 'yard',
    label: 'Lawn & Yard Care',
    blurb: 'Mowing, weeding, leaf cleanup, hedge trimming, and seasonal yard care.',
    goodWork: [
      ...COMMON_GOOD_WORK,
      'Mow at an even height and edge along walks, beds, and driveways.',
      'Bag, pile, or haul clippings and debris as agreed — don’t leave them behind.',
      'Avoid damaging sprinkler heads, plants you were not asked to remove, and fences.',
    ],
    document: [
      ...COMMON_DOCUMENT,
      'Photograph hauled-away green waste or bagged clippings if removal was agreed.',
    ],
    clarify: [
      'Which areas to service (front, back, side yards) and any to skip.',
      'Mowing height, and whether to bag, mulch, or pile clippings.',
      'Whether green-waste removal is included or stays on site.',
      'Any plants, beds, or features to protect or avoid.',
    ],
    completionProof: [
      'After photos of mowed, edged, and cleared areas.',
      'Confirmation that debris was handled the way the client asked.',
    ],
    safety: [
      ...COMMON_SAFETY,
      'Clear the area of rocks, toys, and pet waste before mowing.',
      'Keep people and pets clear of mowers, trimmers, and blowers.',
    ],
  },
  {
    slug: 'hauling',
    label: 'Hauling & Junk Removal',
    blurb: 'Furniture removal, garage cleanouts, debris hauling, and dump runs.',
    goodWork: [
      ...COMMON_GOOD_WORK,
      'Remove only the items the client pointed out — confirm anything you’re unsure about.',
      'Protect floors, walls, and doorways when carrying items out.',
      'Dispose of items responsibly and follow local rules for what can be dumped.',
    ],
    document: [
      ...COMMON_DOCUMENT,
      'Photograph the cleared space and the loaded vehicle if helpful.',
      'Keep a dump or transfer-station receipt when the client asks for one.',
    ],
    clarify: [
      'Exactly which items go and which stay.',
      'Whether disposal, recycling, or donation fees are included.',
      'Access details: stairs, elevators, parking, gate codes.',
      'Any heavy or awkward items that may need a second person.',
    ],
    completionProof: [
      'After photos of the emptied space.',
      'A disposal receipt when one was requested.',
    ],
    safety: [
      ...COMMON_SAFETY,
      'Lift with proper technique and ask for help with heavy items.',
      'Don’t handle hazardous materials (paint, chemicals, batteries) unless agreed and done safely.',
    ],
  },
  {
    slug: 'moving',
    label: 'Moving Help',
    blurb: 'Loading, unloading, and moving help for apartments, homes, and storage units.',
    goodWork: [
      ...COMMON_GOOD_WORK,
      'Wrap and pad fragile or finished items before moving them.',
      'Load trucks and storage units so items are secure and don’t shift.',
      'Place boxes and furniture in the rooms the client indicates.',
    ],
    document: [
      ...COMMON_DOCUMENT,
      'Photograph any pre-existing damage to large items before the move.',
    ],
    clarify: [
      'What’s being moved and roughly how much (rooms, box count, heavy items).',
      'Whether packing materials and dollies are provided or expected.',
      'Access at both ends: stairs, elevators, parking, distance to the door.',
      'Items needing extra care (electronics, antiques, art).',
    ],
    completionProof: [
      'Photos or confirmation that items are placed and the truck is unloaded.',
      'A quick walkthrough with the client to confirm nothing was missed.',
    ],
    safety: [
      ...COMMON_SAFETY,
      'Use proper lifting technique and team-lift heavy or awkward items.',
      'Keep walkways clear and secure loads before driving.',
    ],
  },
  {
    slug: 'handyman',
    label: 'Handyman & Repairs',
    blurb: 'Small repairs, furniture assembly, mounting, and general fix-it tasks.',
    goodWork: [
      ...COMMON_GOOD_WORK,
      'Use the right fasteners and anchors for the wall or surface.',
      'Test that the repair or assembly works and is secure before finishing.',
      'Stay within your skill level — flag work that needs a licensed pro.',
    ],
    document: [
      ...COMMON_DOCUMENT,
      'Photograph the finished install or repair.',
      'Note any parts or materials the client provided or that you supplied.',
    ],
    clarify: [
      'Exactly what needs fixing, mounting, or assembling.',
      'Who supplies parts, hardware, and materials.',
      'Wall type and weight for mounting jobs (drywall, stud, masonry).',
      'Whether the task may need a licensed electrician or plumber.',
    ],
    completionProof: [
      'After photos showing the completed, working result.',
      'A quick demonstration that it functions as expected.',
    ],
    safety: [
      ...COMMON_SAFETY,
      'Turn off power or water at the source before relevant work.',
      'Don’t take on electrical, gas, or structural work beyond your qualifications.',
    ],
  },
  {
    slug: 'cleaning',
    label: 'Cleaning',
    blurb: 'Home cleaning, move-out cleans, and one-off deep cleaning jobs.',
    goodWork: [
      ...COMMON_GOOD_WORK,
      'Work top-to-bottom so dust and debris don’t fall on cleaned surfaces.',
      'Use products suited to each surface and follow any client preferences.',
      'Don’t move or rearrange valuables without asking.',
    ],
    document: [
      ...COMMON_DOCUMENT,
      'Photograph high-traffic areas (kitchen, bathrooms) before and after.',
    ],
    clarify: [
      'Which rooms and surfaces are included, and any to skip.',
      'Whether supplies and equipment are provided or expected.',
      'Product preferences, allergies, and any delicate surfaces.',
      'Standard clean vs. deep clean vs. move-out clean.',
    ],
    completionProof: [
      'After photos of the cleaned areas.',
      'A walkthrough so the client can point out any touch-ups.',
    ],
    safety: [
      ...COMMON_SAFETY,
      'Don’t mix cleaning chemicals; ventilate when using strong products.',
      'Handle the client’s belongings carefully and report breakages immediately.',
    ],
  },
  {
    slug: 'painting',
    label: 'Painting',
    blurb: 'Interior and exterior painting, touch-ups, and small paint jobs.',
    goodWork: [
      ...COMMON_GOOD_WORK,
      'Prep surfaces: clean, patch, sand, and prime where needed.',
      'Mask and cover floors, trim, and furniture before painting.',
      'Apply even coats and let each dry before the next.',
    ],
    document: [
      ...COMMON_DOCUMENT,
      'Note the paint colors, brands, and finishes used.',
    ],
    clarify: [
      'Which surfaces and rooms are being painted.',
      'Who supplies paint and materials, and the exact colors/finishes.',
      'Number of coats expected and how to handle trim and edges.',
      'Furniture moving and floor protection responsibilities.',
    ],
    completionProof: [
      'After photos of the painted areas in good light.',
      'Confirmation that masking is removed and the space is clean.',
    ],
    safety: [
      ...COMMON_SAFETY,
      'Ventilate while painting and store materials safely.',
      'Use stable ladders and follow safe practices for height work.',
    ],
  },
  {
    slug: 'pressure',
    label: 'Pressure Washing',
    blurb: 'Driveways, decks, siding, and patio pressure washing.',
    goodWork: [
      ...COMMON_GOOD_WORK,
      'Match pressure and tips to the surface to avoid damage.',
      'Pre-treat tough stains where appropriate and rinse thoroughly.',
      'Protect plants, fixtures, and nearby surfaces from spray and runoff.',
    ],
    document: [
      ...COMMON_DOCUMENT,
      'Before/after photos really show pressure-washing results — capture both.',
    ],
    clarify: [
      'Exactly which surfaces to wash and any to avoid.',
      'Surface material (wood, concrete, siding) so the right pressure is used.',
      'Water source and access, and any detergent preferences.',
      'How to handle runoff and protect landscaping.',
    ],
    completionProof: [
      'Clear before/after photos of each washed surface.',
      'Confirmation the area is rinsed and left tidy.',
    ],
    safety: [
      ...COMMON_SAFETY,
      'Keep the spray away from people, pets, windows, and electrical fixtures.',
      'Wear eye protection and maintain stable footing on wet surfaces.',
    ],
  },
  {
    slug: 'other',
    label: 'Errands, Delivery & Odd Jobs',
    blurb: 'Errands, local delivery, organizing, assembly, and any task that needs a hand.',
    goodWork: [
      ...COMMON_GOOD_WORK,
      'Confirm the list, addresses, and any time windows before you start.',
      'Handle items and packages carefully from pickup to drop-off.',
      'Get clear instructions for where to leave or hand off deliveries.',
    ],
    document: [
      ...COMMON_DOCUMENT,
      'Photograph delivered or picked-up items at hand-off when helpful.',
      'Keep receipts for any purchases made on the client’s behalf.',
    ],
    clarify: [
      'The full task list, stops, and any deadlines.',
      'Who pays for purchases and how costs are reconciled.',
      'Exact pickup and drop-off details and contacts.',
      'How to handle items that are out of stock or unavailable.',
    ],
    completionProof: [
      'Confirmation or a photo at each drop-off or completed errand.',
      'Receipts for purchases when the client asks.',
    ],
    safety: [
      ...COMMON_SAFETY,
      'Follow safe driving practices and respect parking and access rules.',
      'Keep the client’s items and information private and secure.',
    ],
  },
];

// Aliases let backend/category values that differ slightly still resolve to a
// sensible standard. Anything unmapped falls back to the general "other" guide.
const SLUG_ALIASES: Record<string, string> = {
  lawn: 'yard',
  landscaping: 'yard',
  junk: 'hauling',
  removal: 'hauling',
  delivery: 'other',
  errand: 'other',
  errands: 'other',
  organizing: 'other',
  assembly: 'handyman',
  repair: 'handyman',
  repairs: 'handyman',
  'pressure-washing': 'pressure',
  powerwashing: 'pressure',
};

export function getTradeStandard(slug: string): TradeStandard | undefined {
  return TRADE_STANDARDS.find((s) => s.slug === slug.toLowerCase());
}

// Resolve any category value or quest tag to the most relevant standard.
// Returns the "other" general standard as a safe default so quest pages always
// have something useful to show.
export function resolveTradeStandard(
  category?: string | null,
  tags?: string[] | null,
): TradeStandard {
  const candidates: string[] = [];
  if (category) candidates.push(category);
  if (tags) candidates.push(...tags);

  for (const raw of candidates) {
    const key = raw.toLowerCase().trim();
    const direct = getTradeStandard(key);
    if (direct) return direct;
    const aliased = SLUG_ALIASES[key];
    if (aliased) {
      const std = getTradeStandard(aliased);
      if (std) return std;
    }
  }

  return getTradeStandard('other')!;
}
