import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tryhardly.com';

// Keep authenticated, transactional and operational surfaces out of the index.
// Everything else — the board, category and city landing pages, and the policy
// pages — should be crawlable, since organic local search is the only
// acquisition channel that compounds without spend.
const DISALLOW = [
  '/api/',
  '/admin',
  '/dashboard',
  '/messages',
  '/profile',
  '/auth/',
  '/login',
  '/register',
  '/payments/',
  '/account-deletion',
  // Query-string variants of the board create near-duplicate pages.
  '/jobs?',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: DISALLOW,
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
