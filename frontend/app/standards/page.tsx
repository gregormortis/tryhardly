import type { Metadata } from 'next';
import Link from 'next/link';
import { TRADE_STANDARDS } from '@/lib/tradeStandards';

const title = 'Work standards & trade checklists';
const description =
  'TryHardly work standards: practical checklists for yard care, hauling, cleaning, moving help, handyman repairs, and errands. What good work includes, what to document, what clients should clarify, and how to prove a job is done.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/standards' },
  openGraph: {
    title: `${title} · TryHardly`,
    description,
    url: '/standards',
    type: 'website',
  },
  twitter: { card: 'summary', title: `${title} · TryHardly`, description },
};

export default function StandardsOverviewPage() {
  return (
    <div className="min-h-screen bg-canvas text-body">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-14">
          <p className="font-mono text-xs uppercase tracking-widest text-accent-text mb-3">
            Trade checklists
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 text-strong">
            TryHardly work standards
          </h1>
          <p className="text-lg text-body max-w-2xl mx-auto leading-relaxed">
            Good local work follows a few simple habits: agree on the scope, do it well, document
            it, and leave the place better than you found it. These checklists turn that into a
            practical guide for each kind of job — for workers and clients alike.
          </p>
          <p className="text-sm text-subtle max-w-2xl mx-auto leading-relaxed mt-4">
            These are practical guidelines, not legal advice and not a guarantee by TryHardly. Use
            them to set expectations and turn completed work into clear proof, reviews, and skill
            badges.
          </p>
        </div>

        {/* Category grid */}
        <section className="mb-14">
          <div className="grid sm:grid-cols-2 gap-4">
            {TRADE_STANDARDS.map((s) => (
              <Link
                key={s.slug}
                href={`/standards/${s.slug}`}
                className="block bg-surface border border-line rounded-xl p-5 sm:p-6 hover:border-accent/40 transition-colors"
              >
                <h2 className="text-lg font-bold text-accent-text-hover mb-1.5">{s.label}</h2>
                <p className="text-sm text-muted leading-relaxed">{s.blurb}</p>
                <span className="inline-block mt-3 text-sm text-accent-text">View checklist →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* How it fits */}
        <section className="mb-14 bg-accent/[0.06] border border-accent/25 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-accent-text-hover mb-3">Why checklists matter</h2>
          <p className="text-body mb-3 leading-relaxed">
            A clear checklist sets expectations before work starts and gives both sides an honest
            record once it’s done. That record is what turns a finished job into a strong review and
            real proof of work.
          </p>
          <ul className="space-y-2 text-sm text-body">
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span>
                Pledge to the{' '}
                <Link href="/code-of-craft" className="text-accent-text hover:underline">
                  Code of Craft
                </Link>{' '}
                to commit to these standards publicly.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span>
                Documented work builds toward{' '}
                <Link href="/verified-pro" className="text-accent-text hover:underline">
                  Verified Pro
                </Link>{' '}
                and your ratings and badges.
              </span>
            </li>
          </ul>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-accent/20/20 to-info/20 border border-accent/40 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-accent-text mb-3">Put a standard to work</h3>
          <p className="text-body mb-6">
            Posting a job or picking one up? Skim the matching checklist first.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/jobs"
              className="inline-block bg-accent hover:bg-accent text-on-accent font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Browse the questboard
            </Link>
            <Link
              href="/request-help"
              className="inline-block border border-accent/40 hover:border-accent text-accent-text-hover font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Request help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
