// Shared presentation helpers for Worker Service Packages. Kept framework-free
// so both the worker-facing manager and the public browse/profile views use the
// same labels, price formatting, and compliance copy.

import type { ServicePriceType } from '@/lib/types';
import { getJobCategory } from '@/lib/jobCategories';

export interface PriceTypeOption {
  value: ServicePriceType;
  label: string;
  // Short hint shown next to the field so a worker picks the right one.
  hint: string;
}

export const PRICE_TYPE_OPTIONS: PriceTypeOption[] = [
  { value: 'STARTING_AT', label: 'Starting at', hint: 'A base price; final cost depends on the job.' },
  { value: 'FLAT_RATE', label: 'Flat rate', hint: 'One fixed price for the service as described.' },
  { value: 'HOURLY', label: 'Hourly', hint: 'Billed per hour.' },
  { value: 'QUOTE_NEEDED', label: 'Quote needed', hint: 'No set price — you quote after details.' },
];

// Categories that commonly require a licensed/insured contractor at any real
// scale. We surface an honest compliance note for these — we never assert the
// worker is or isn't licensed; that responsibility stays with the worker.
const CONTRACTOR_SCALE_CATEGORIES = new Set(['handyman', 'painting']);

export function requiresContractorNote(category: string): boolean {
  return CONTRACTOR_SCALE_CATEGORIES.has(category.toLowerCase());
}

// Human label for a category slug, falling back to a title-cased slug so an
// unknown/legacy value still renders cleanly.
export function categoryLabel(slug: string): string {
  const known = getJobCategory(slug);
  if (known) return known.label;
  return slug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function toNumber(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

// Render the price for a package as a short, honest string for cards/detail.
// QUOTE_NEEDED (or a missing price) reads "Quote needed" rather than $0.
export function formatPackagePrice(pkg: {
  priceType: ServicePriceType;
  startingPrice?: number | string | null;
  currency?: string | null;
}): string {
  const currency = pkg.currency || 'USD';
  const amount = toNumber(pkg.startingPrice);

  if (pkg.priceType === 'QUOTE_NEEDED' || amount === null) {
    return 'Quote needed';
  }
  const money = formatMoney(amount, currency);
  switch (pkg.priceType) {
    case 'STARTING_AT':
      return `From ${money}`;
    case 'HOURLY':
      return `${money}/hr`;
    case 'FLAT_RATE':
    default:
      return money;
  }
}

// Build the query string for the "Request this service" CTA. Routes into the
// existing /request-help intake with the package as context — no payment is
// created from a package. Title is prefilled; category maps to the intake's
// category slug; a short note records which listing prompted the request.
export function requestHelpHref(pkg: {
  id: string;
  title: string;
  category: string;
  user?: { username: string; displayName?: string | null } | null;
}): string {
  const workerName = pkg.user?.displayName || pkg.user?.username || '';
  const params = new URLSearchParams();
  params.set('title', pkg.title);
  if (pkg.category) params.set('category', pkg.category);
  params.set('packageId', pkg.id);
  if (workerName) params.set('worker', workerName);
  return `/request-help?${params.toString()}`;
}
