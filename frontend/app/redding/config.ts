// Shared constants for the Redding, CA local launch package.
// Used by the landing page and the printable flyers so links + copy stay in sync.

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://tryhardly.com';

export const REDDING = {
  city: 'Redding',
  state: 'CA',
} as const;

// Absolute links (used in flyers/QR codes where a full URL is required).
export const links = {
  landing: `${SITE_URL}/redding`,
  landingFacebookRequester: `${SITE_URL}/redding?source=facebook-requester`,
  landingFacebookWorker: `${SITE_URL}/redding?source=facebook-worker`,
  requestHelp: `${SITE_URL}/request-help?source=redding`,
  workAlerts: `${SITE_URL}/work-alerts?source=redding`,
  questboard: `${SITE_URL}/questboard?source=redding`,
  flyerRequestHelp: `${SITE_URL}/redding/flyer/request-help`,
  flyerWorkers: `${SITE_URL}/redding/flyer/workers`,
} as const;

// Relative links (used inside the Next.js app for client-side navigation).
export const routes = {
  requestHelp: '/request-help?source=redding',
  workAlerts: '/work-alerts?source=redding',
  questboard: '/questboard?source=redding',
  flyerRequestHelp: '/redding/flyer/request-help',
  flyerWorkers: '/redding/flyer/workers',
} as const;

// Short, human-typeable URLs printed on flyers as a QR fallback.
export const shortLinks = {
  requestHelp: 'tryhardly.com/request-help',
  workAlerts: 'tryhardly.com/work-alerts',
  redding: 'tryhardly.com/redding',
} as const;

export const requesterCategories = [
  'Yard work & lawn care',
  'Hauling & junk removal',
  'Moving help',
  'Cleaning',
  'Handyman & small repairs',
  'Errands & pickups',
] as const;

// Copy blocks for Facebook / community group posts.
export const facebookRequesterPost = `Need a hand with something around the house in Redding?

I've been trying out TryHardly — a simple way to post local jobs (yard work, hauling, moving help, cleaning, handyman work, errands) and get matched with reliable local people.

It's brand new here in Redding, so it's early days — the goal is just to connect real local jobs with dependable local help. No big promises, just a straightforward way to get things done.

Post what you need here: ${links.landingFacebookRequester}`;

export const facebookWorkerPost = `Looking for local work or side jobs in Redding?

TryHardly is just launching here. You can set up a free profile and get alerts when local jobs get posted — yard work, hauling, moving help, cleaning, handyman gigs, errands.

It's early, so listings are just starting to come online. Get in now, build your profile and reviews, and be first in line as jobs roll in.

Sign up for local job alerts: ${links.landingFacebookWorker}`;
