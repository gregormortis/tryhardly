// JSON-LD structured data helpers.
//
// Deliberately NOT using LocalBusiness. Google's Business Profile eligibility
// guidelines exclude "lead generation agents or companies" and "online-only
// businesses", and TryHardly is a marketplace facilitator rather than the
// entity performing the work. Claiming LocalBusiness invites a mismatch
// between the markup and what we actually are. Organization + Service with
// areaServed describes the real model and carries no such risk.

import { JOB_CATEGORIES } from '@/lib/jobCategories';
import { SERVICE_AREAS, type ServiceArea } from '@/lib/serviceAreas';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tryhardly.com';

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Content is built from our own static config, never user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// ─── Organization + site search ──────────────────────────────────────────────
// Rendered once, in the root layout.
export function OrganizationSchema() {
  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': `${siteUrl}/#organization`,
          name: 'TryHardly',
          url: siteUrl,
          logo: `${siteUrl}/icons/icon-512.png`,
          description:
            'TryHardly is a local services marketplace connecting customers with verified independent workers for yard work, hauling, moving help, cleaning, errands, and handyman tasks.',
          email: 'support@tryhardly.com',
          areaServed: SERVICE_AREAS.map((a) => ({
            '@type': 'City',
            name: a.city,
            address: {
              '@type': 'PostalAddress',
              addressLocality: a.city,
              addressRegion: a.state,
              addressCountry: 'US',
            },
          })),
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'support@tryhardly.com',
            availableLanguage: 'English',
          },
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': `${siteUrl}/#website`,
          url: siteUrl,
          name: 'TryHardly',
          publisher: { '@id': `${siteUrl}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${siteUrl}/jobs?search={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        }}
      />
    </>
  );
}

// ─── Service ─────────────────────────────────────────────────────────────────
// Rendered on /jobs/<category> and /jobs/<category>/<city>.
export function ServiceSchema({
  categorySlug,
  categoryLabel,
  description,
  area,
  url,
}: {
  categorySlug: string;
  categoryLabel: string;
  description: string;
  area?: ServiceArea;
  url: string;
}) {
  const areaServed = area
    ? [
        {
          '@type': 'City',
          name: area.city,
          address: {
            '@type': 'PostalAddress',
            addressLocality: area.city,
            addressRegion: area.state,
            addressCountry: 'US',
          },
        },
      ]
    : SERVICE_AREAS.map((a) => ({
        '@type': 'City',
        name: a.city,
        address: {
          '@type': 'PostalAddress',
          addressLocality: a.city,
          addressRegion: a.state,
          addressCountry: 'US',
        },
      }));

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Service',
        '@id': `${url}#service`,
        name: area ? `${categoryLabel} in ${area.city}, ${area.state}` : categoryLabel,
        serviceType: categoryLabel,
        description,
        url,
        category: categorySlug,
        provider: { '@id': `${siteUrl}/#organization` },
        areaServed,
        // Posting and bidding are free, and TryHardly does not process the
        // direct payment between the customer and worker.
        offers: {
          '@type': 'Offer',
          url: `${siteUrl}/post-a-job`,
          price: '0',
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          description:
            'Posting a job is free. Workers keep 100% of the amount they agree on with the customer. TryHardly does not take a platform fee or process payment.',
        },
      }}
    />
  );
}

// ─── Breadcrumbs ─────────────────────────────────────────────────────────────
export function BreadcrumbSchema({ trail }: { trail: Array<{ name: string; path: string }> }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: trail.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          item: `${siteUrl}${item.path}`,
        })),
      }}
    />
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
export function FaqSchema({ items }: { items: Array<{ q: string; a: string }> }) {
  if (!items.length) return null;
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }}
    />
  );
}

// Convenience: the full category list as an ItemList, for the board page.
export function CategoryListSchema() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Local job categories on TryHardly',
        itemListElement: JOB_CATEGORIES.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.label,
          url: `${siteUrl}/jobs/${c.slug}`,
        })),
      }}
    />
  );
}
