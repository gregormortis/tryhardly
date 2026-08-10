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
  const description = `Find or post ${cat.label.toLowerCase()} in ${city}. Post a job free, get bids from local workers, and pay through Stripe only when the work is done.`;
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
      q: `When do I pay?`,
      a: `Your payment method is authorized when you accept a bid. An authorization is not a charge. The charge is captured only after you confirm the job is finished, and the worker is paid out through Stripe Connect after that capture. If you cancel before the work is done, the authorization is voided.`,
    },
    {
      q: `What does TryHardly charge?`,
      a: `Posting a job is free. Workers pay a flat 12% marketplace fee on completed paid jobs. There are no lead fees, no memberships, and no charges for jobs that never happen.`,
    },
    {
      q: `How do I know the worker is legitimate?`,
      a: `Every worker confirms their email address, and every worker must pass Stripe Identity government ID and selfie verification before they can be paid. Reviews are only written by people who actually completed a job together.`,
    },
  ];

  return (
    <div className="bg-zinc-950">
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

      <section className="border-b border-white/[0.06] px-4 sm:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <nav className="font-mono text-[11px] text-stone-600 mb-3">
            <Link href="/jobs" className="hover:text-amber-400">Local jobs</Link>
            <span className="mx-2">/</span>
            <Link href={`/jobs/${cat.slug}`} className="hover:text-amber-400">{cat.label}</Link>
            <span className="mx-2">/</span>
            <span className="text-stone-400">{city}</span>
          </nav>
          <h1 className="font-bold text-3xl text-stone-100 tracking-tight mb-3">
            {cat.label} in {city}
          </h1>
          <p className="text-stone-400 max-w-2xl leading-relaxed">{cat.blurb}</p>

          <p className="mt-5 font-mono text-[11px] text-stone-600 max-w-2xl leading-relaxed">
            {area?.primary
              ? `${cityName} is TryHardly's launch market. Post a job and local workers get alerted.`
              : `TryHardly is newest in ${cityName}. The board below shows live jobs matching the area — if it's empty, post yours and local workers will see it first.`}
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href="/post-a-job"
              className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 bg-amber-400 text-zinc-950 rounded hover:bg-amber-300 transition-colors"
            >
              POST A JOB IN {cityName.toUpperCase()}
            </Link>
            <Link
              href="/work-alerts"
              className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 border border-white/[0.12] text-stone-300 rounded hover:border-amber-500/40 hover:text-amber-400 transition-colors"
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
      <section className="max-w-5xl mx-auto px-4 sm:px-8 py-10 border-t border-white/[0.05]">
        <h2 className="font-bold text-xl text-stone-100 tracking-tight mb-5">
          {cat.label} in {cityName}: common questions
        </h2>
        <div className="space-y-5 max-w-3xl">
          {faqs.map((f) => (
            <div key={f.q}>
              <h3 className="text-sm font-semibold text-stone-200 mb-1.5">{f.q}</h3>
              <p className="text-sm text-stone-400 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sibling links: same category elsewhere, and other categories here. */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 py-10 border-t border-white/[0.05] space-y-8">
        <div>
          <h2 className="font-mono text-[11px] font-semibold tracking-widest text-stone-600 uppercase mb-4">
            {cat.shortLabel} in other areas
          </h2>
          <div className="flex flex-wrap gap-2">
            {SERVICE_AREAS.filter((a) => a.slug !== params.city).map((a) => (
              <Link
                key={a.slug}
                href={`/jobs/${cat.slug}/${a.slug}`}
                className="font-mono text-[11px] text-stone-500 border border-white/[0.08] rounded-full px-3 py-1.5 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
              >
                {a.city}, {a.state}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-mono text-[11px] font-semibold tracking-widest text-stone-600 uppercase mb-4">
            Other work in {cityName}
          </h2>
          <div className="flex flex-wrap gap-2">
            {JOB_CATEGORIES.filter((c) => c.slug !== cat.slug).map((c) => (
              <Link
                key={c.slug}
                href={`/jobs/${c.slug}/${params.city}`}
                className="font-mono text-[11px] text-stone-500 border border-white/[0.08] rounded-full px-3 py-1.5 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
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
