import type { Metadata } from 'next';
import Link from 'next/link';
import { JOB_CATEGORIES, resolveJobCategory } from '@/lib/jobCategories';
import { SERVICE_AREAS } from '@/lib/serviceAreas';
import QuestBoard from '@/components/Questboard';
import { ServiceSchema, BreadcrumbSchema } from '@/components/StructuredData';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tryhardly.com';

interface PageProps {
  params: { category: string };
}

export function generateStaticParams() {
  return JOB_CATEGORIES.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const cat = resolveJobCategory(params.category);
  const title = cat.known ? `${cat.label} — Find Local Help` : `${cat.label} — Local Jobs`;
  const description = `${cat.blurb} Post a job free or find paid ${cat.label.toLowerCase()} near you on TryHardly.`;
  return {
    title,
    description,
    alternates: { canonical: `/jobs/${cat.slug}` },
    openGraph: {
      title: `${title} · TryHardly`,
      description,
      url: `/jobs/${cat.slug}`,
    },
  };
}

export default function JobCategoryPage({ params }: PageProps) {
  const cat = resolveJobCategory(params.category);
  const url = `${siteUrl}/jobs/${cat.slug}`;

  return (
    <div className="bg-canvas">
      <ServiceSchema
        categorySlug={cat.slug}
        categoryLabel={cat.label}
        description={cat.blurb}
        url={url}
      />
      <BreadcrumbSchema
        trail={[
          { name: 'Local jobs', path: '/jobs' },
          { name: cat.label, path: `/jobs/${cat.slug}` },
        ]}
      />

      <section className="border-b border-line px-4 sm:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <nav className="font-mono text-[12px] text-subtle mb-3">
            <Link href="/jobs" className="hover:text-accent-text">Local jobs</Link>
            <span className="mx-2">/</span>
            <span className="text-muted">{cat.label}</span>
          </nav>
          <h1 className="font-bold text-3xl text-strong tracking-tight mb-3">{cat.label}</h1>
          <p className="text-muted max-w-2xl leading-relaxed">{cat.blurb}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {cat.examples.map((ex) => (
              <span
                key={ex}
                className="font-mono text-[12px] text-muted bg-surface border border-line rounded-full px-3 py-1.5"
              >
                {ex}
              </span>
            ))}
          </div>

          <p className="mt-5 font-mono text-[12px] text-subtle">
            TryHardly is early-stage and growing locally — everything below is a real job posted by
            a neighbor, not an estimate.
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href="/post-a-job"
              className="font-mono text-[12px] font-semibold tracking-widest px-5 py-2.5 bg-accent text-on-accent rounded hover:bg-accent-hover transition-colors"
            >
              POST A {cat.label.toUpperCase()} JOB
            </Link>
          </div>
        </div>
      </section>

      {/* Known categories deep-link into a filtered board; generic slugs search
          the board by the slug term so the page still surfaces live jobs. */}
      <QuestBoard
        initialCategory={cat.known ? cat.slug : undefined}
        initialSearch={cat.known ? undefined : cat.label}
      />

      {/* City pages for this category. These are the long-tail URLs local
          search actually matches, so link them from the category page rather
          than leaving them orphaned in the sitemap. */}
      {cat.known && (
        <section className="max-w-5xl mx-auto px-4 sm:px-8 py-10 border-t border-line">
          <h2 className="font-mono text-[12px] font-semibold tracking-widest text-subtle uppercase mb-4">
            {cat.label} by area
          </h2>
          <div className="flex flex-wrap gap-2">
            {SERVICE_AREAS.map((a) => (
              <Link
                key={a.slug}
                href={`/jobs/${cat.slug}/${a.slug}`}
                className="font-mono text-[12px] text-subtle border border-line rounded-full px-3 py-1.5 hover:text-accent-text hover:border-accent/40 transition-colors"
              >
                {cat.shortLabel} in {a.city}, {a.state}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Internal links to other categories help discovery + SEO. */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 py-10 border-t border-line">
        <h2 className="font-mono text-[12px] font-semibold tracking-widest text-subtle uppercase mb-4">
          Other kinds of work
        </h2>
        <div className="flex flex-wrap gap-2">
          {JOB_CATEGORIES.filter((c) => c.slug !== cat.slug).map((c) => (
            <Link
              key={c.slug}
              href={`/jobs/${c.slug}`}
              className="font-mono text-[12px] text-subtle border border-line rounded-full px-3 py-1.5 hover:text-accent-text hover:border-accent/40 transition-colors"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
