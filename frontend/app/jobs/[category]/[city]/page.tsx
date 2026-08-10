import type { Metadata } from 'next';
import Link from 'next/link';
import { JOB_CATEGORIES, resolveJobCategory } from '@/lib/jobCategories';
import { SERVICE_AREAS, getServiceArea, formatCitySlug } from '@/lib/serviceAreas';
import QuestBoard from '@/components/Questboard';
import { ServiceSchema, BreadcrumbSchema, FaqSchema } from '@/components/StructuredData';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tryhardly.com';

interface PageProps {
  params: { category: string; city: string };
}

// Pre-render the full category × service-area matrix. Any other city slug
// still renders on demand, so an inbound link to an unlisted town works.
export function generateStaticParams() {
  return JOB_CATEGORIES.flatMap((c) =>
    SERVICE_AREAS.map((a) => ({ category: c.slug, city: a.slug })),
  );
}

export function generateMetadata({ params }: PageProps): Metadata {
  const cat = resolveJobCategory(params.category);
  const city = formatCitySlug(params.city);
  const title = `${cat.label} in ${city}`;
  const description = `Find or post ${cat.label.toLowerCase()} in ${city}. Post a job free, get bids from local workers, and settle payment directly with the worker you choose.`;
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${cat.slug}/${params.city}` },
    openGraph: {
      title: `${title} · TryHardly`,
      description,
      url: `/jobs/${cat.slug}/${params.city}`,
    },
  };
}

export default function JobCategoryCityPage({ params }: PageProps) {
  const cat = resolveJobCategory(params.category);
  const area = getServiceArea(params.city);
  const city = formatCitySlug(params.city);
  const cityName = area?.city ?? city;
  const url = `${siteUrl}/jobs/${cat.slug}/${params.city}`;

  const faqs = [
    {
      q: `How much does ${cat.label.toLowerCase()} cost in ${cityName}?`,
      a: `Prices are set by the local workers who bid on your job, not by TryHardly. You enter your own budget when you post, workers bid against it, and you pick the bid you want. Posting is always free.`,
    },
    {
      q: `How does payment work?`,
      a: `You and the worker settle the agreed amount directly. Agree on the payment method and timing before work starts. Cash, Venmo, Zelle, and check all work if you both agree. TryHardly does not process the payment.`,
    },
    {
      q: `What does TryHardly charge?`,
      a: `Nothing right now. Posting and bidding are free, and workers keep 100% of the amount they agree on. TryHardly does not take a platform fee.`,
    },
    {
      q: `How do I know the worker is legitimate?`,
      a: `Every worker confirms their email address. Read their profile, reviews, and credentials, then ask the questions that matter for your job. Reviews are only written by people who completed a job together.`,
    },
  ];

  return (
    <div className="bg-canvas">
      <ServiceSchema
        categorySlug={cat.slug}
        categoryLabel={cat.label}
        description={`${cat.blurb} Available in ${city}.`}
        area={area}
        url={url}
      />
      <BreadcrumbSchema
        trail={[
          { name: 'Local jobs', path: '/jobs' },
          { name: cat.label, path: `/jobs/${cat.slug}` },
          { name: city, path: `/jobs/${cat.slug}/${params.city}` },
        ]}
      />
      <FaqSchema items={faqs} />

      <section className="border-b border-line px-4 sm:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <nav className="font-mono text-[12px] text-subtle mb-3">
            <Link href="/jobs" className="hover:text-accent-text">Local jobs</Link>
            <span className="mx-2">/</span>
            <Link href={`/jobs/${cat.slug}`} className="hover:text-accent-text">{cat.label}</Link>
            <span className="mx-2">/</span>
            <span className="text-muted">{city}</span>
          </nav>
          <h1 className="font-bold text-3xl text-strong tracking-tight mb-3">
            {cat.label} in {city}
          </h1>
          <p className="text-muted max-w-2xl leading-relaxed">{cat.blurb}</p>

          <p className="mt-5 font-mono text-[12px] text-subtle max-w-2xl leading-relaxed">
            {area?.primary
              ? `${cityName} is TryHardly's launch market. Post a job and local workers get alerted.`
              : `TryHardly is newest in ${cityName}. The board below shows live jobs matching the area — if it's empty, post yours and local workers will see it first.`}
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href="/post-a-job"
              className="font-mono text-[12px] font-semibold tracking-widest px-5 py-2.5 bg-accent text-on-accent rounded hover:bg-accent-hover transition-colors"
            >
              POST A JOB IN {cityName.toUpperCase()}
            </Link>
            <Link
              href="/work-alerts"
              className="font-mono text-[12px] font-semibold tracking-widest px-5 py-2.5 border border-line text-body rounded hover:border-accent/40 hover:text-accent-text transition-colors"
            >
              GET WORK ALERTS
            </Link>
          </div>
        </div>
      </section>

      {/* Known categories filter the board and search the city; generic slugs
          search the city term so the page still surfaces live local jobs. */}
      <QuestBoard initialCategory={cat.known ? cat.slug : undefined} initialSearch={cityName} />

      {/* Visible FAQ. Mirrors the FaqSchema above — never emit structured data
          for content a visitor cannot actually see on the page. */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 py-10 border-t border-line">
        <h2 className="font-bold text-xl text-strong tracking-tight mb-5">
          {cat.label} in {cityName}: common questions
        </h2>
        <div className="space-y-5 max-w-3xl">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="text-sm font-semibold text-body mb-1.5">{f.q}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sibling links: same category elsewhere, and other categories here. */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 py-10 border-t border-line space-y-8">
        <div>
          <h2 className="font-mono text-[12px] font-semibold tracking-widest text-subtle uppercase mb-4">
            {cat.shortLabel} in other areas
          </h2>
          <div className="flex flex-wrap gap-2">
            {SERVICE_AREAS.filter((a) => a.slug !== params.city).map((a) => (
              <Link
                key={a.slug}
                href={`/jobs/${cat.slug}/${a.slug}`}
                className="font-mono text-[12px] text-subtle border border-line rounded-full px-3 py-1.5 hover:text-accent-text hover:border-accent/40 transition-colors"
              >
                {a.city}, {a.state}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-mono text-[12px] font-semibold tracking-widest text-subtle uppercase mb-4">
            Other work in {cityName}
          </h2>
          <div className="flex flex-wrap gap-2">
            {JOB_CATEGORIES.filter((c) => c.slug !== cat.slug).map((c) => (
              <Link
                key={c.slug}
                href={`/jobs/${c.slug}/${params.city}`}
                className="font-mono text-[12px] text-subtle border border-line rounded-full px-3 py-1.5 hover:text-accent-text hover:border-accent/40 transition-colors"
              >
                {c.shortLabel}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
