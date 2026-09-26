import type { Metadata } from 'next';
import QuestDetailClient from './QuestDetailClient';
import type { Quest } from '@/lib/types';
import { parseLocationLine } from '@/lib/jobLocation';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tryhardly.com';
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Server-side fetch of the public quest endpoint (GET /quests/:id needs no
// auth). Used by generateMetadata and the JSON-LD block so crawlers — and
// Google Jobs — see the posting without running client JavaScript.
async function getQuest(id: string): Promise<Quest | null> {
  try {
    const res = await fetch(`${apiUrl}/quests/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Quest;
  } catch {
    return null;
  }
}

// The post form prepends a machine-readable "Location: <neighborhood>, <city>"
// first line to the description (see lib/jobLocation). Parse it back out for
// the title and the JobPosting address; fall back to Redding, CA.
function jobLocationParts(quest: Quest): {
  locality: string;
  region: string;
  bodyText: string;
} {
  const parsed = parseLocationLine(quest.description);
  const cityParts = parsed.city
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    locality: parsed.neighborhood || cityParts[0] || 'Redding',
    region: cityParts.length > 1 ? cityParts[cityParts.length - 1] : 'CA',
    bodyText: parsed.bodyText,
  };
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const quest = await getQuest(params.id);
  if (!quest) {
    return { title: 'Job not found', robots: { index: false } };
  }
  const { locality, bodyText } = jobLocationParts(quest);
  const title = `${quest.title} — ${locality}`;
  const description = [
    bodyText.slice(0, 150),
    quest.reward ? `Budget $${Number(quest.reward).toLocaleString()}.` : '',
    'Bid your price; workers keep 100%.',
  ]
    .filter(Boolean)
    .join(' ');
  const open = quest.status === 'OPEN';
  return {
    title,
    description,
    alternates: { canonical: `/job/${quest.id}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/job/${quest.id}`,
    },
    // Only open postings are worth indexing; filled/closed ones stay crawlable
    // but out of the index so search results never promise a dead job.
    robots: open ? { index: true, follow: true } : { index: false, follow: true },
  };
}

// schema.org JobPosting for Google's job-search rich results. Google requires
// title, description, datePosted, hiringOrganization and a jobLocation on the
// page of a single posting — all present below. Employment is gig/contract
// work, so employmentType is CONTRACTOR.
function jobPostingJsonLd(quest: Quest) {
  const { locality, region, bodyText } = jobLocationParts(quest);
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: quest.title,
    description: bodyText || quest.title,
    identifier: {
      '@type': 'PropertyValue',
      name: 'TryHardly',
      value: quest.id,
    },
    datePosted: quest.createdAt,
    employmentType: 'CONTRACTOR',
    hiringOrganization: {
      '@type': 'Organization',
      name: 'TryHardly',
      sameAs: siteUrl,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: locality,
        addressRegion: region,
        addressCountry: 'US',
      },
    },
    url: `${siteUrl}/job/${quest.id}`,
  };
  if (quest.deadline) {
    jsonLd.validThrough = quest.deadline;
  }
  if (quest.reward && Number(quest.reward) > 0) {
    jsonLd.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: quest.currency || 'USD',
      value: {
        '@type': 'QuantitativeValue',
        value: Number(quest.reward),
        unitText: 'JOB',
      },
    };
  }
  return jsonLd;
}

export default async function JobPage({ params }: { params: { id: string } }) {
  const quest = await getQuest(params.id);
  return (
    <>
      {quest && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jobPostingJsonLd(quest)),
          }}
        />
      )}
      <QuestDetailClient initialQuest={quest} />
    </>
  );
}
