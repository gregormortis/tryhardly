import type { MetadataRoute } from 'next';
import { JOB_CATEGORIES } from '@/lib/jobCategories';
import { SERVICE_AREAS } from '@/lib/serviceAreas';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tryhardly.com';

// Static, indexable pages. Deliberately excludes anything gated behind auth,
// anything transactional, and the pages currently redirected because they only
// hold seed data.
const STATIC_PATHS: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/jobs', priority: 0.9, changeFrequency: 'hourly' },
  { path: '/post-a-job', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/redding', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/find-work-fast', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/post-job-fast', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/request-help', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/work-alerts', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/trust', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/service-packages', priority: 0.6, changeFrequency: 'weekly' },
  { path: '/standards', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/verified-pro', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/code-of-craft', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/support', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/refunds', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/community-guidelines', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/prohibited-services', priority: 0.3, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticEntries = STATIC_PATHS.map((e) => ({
    url: `${siteUrl}${e.path}`,
    lastModified,
    changeFrequency: e.changeFrequency,
    priority: e.priority,
  }));

  // /jobs/<category> — one page per real category we serve.
  const categoryEntries = JOB_CATEGORIES.map((c) => ({
    url: `${siteUrl}/jobs/${c.slug}`,
    lastModified,
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // /jobs/<category>/<city> — the long-tail matrix that local search actually
  // matches ("junk removal redding ca", "lawn mowing redding"). This is the
  // highest-leverage set of URLs on the site.
  const cityEntries = JOB_CATEGORIES.flatMap((c) =>
    SERVICE_AREAS.map((a) => ({
      url: `${siteUrl}/jobs/${c.slug}/${a.slug}`,
      lastModified,
      changeFrequency: 'daily' as const,
      priority: a.primary ? 0.8 : 0.6,
    })),
  );

  // Per-category trade standard guides.
  const standardEntries = JOB_CATEGORIES.map((c) => ({
    url: `${siteUrl}/standards/${c.slug}`,
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }));

  return [...staticEntries, ...categoryEntries, ...cityEntries, ...standardEntries];
}
