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
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-14">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400 mb-3">
            Trade checklists
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">
            TryHardly work standards
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Good local work follows a few simple habits: agree on the scope, do it well, document
            it, and leave the place better than you found it. These checklists turn that into a
            practical guide for each kind of job — for workers and clients alike.
          </p>
          <p className="text-sm text-gray-500 max-w-2xl mx-auto leading-relaxed mt-4">
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
                className="block bg-gray-900/50 border border-gray-800 rounded-xl p-5 sm:p-6 hover:border-amber-500/40 transition-colors"
              >
                <h2 className="text-lg font-bold text-amber-200 mb-1.5">{s.label}</h2>
                <p className="text-sm text-gray-400 leading-relaxed">{s.blurb}</p>
                <span className="inline-block mt-3 text-sm text-amber-400">View checklist →</span>
              </Link>
            ))}
          </div>
        </section>

        {/* How it fits */}
        <section className="mb-14 bg-amber-500/[0.06] border border-amber-500/25 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-amber-300 mb-3">Why checklists matter</h2>
          <p className="text-gray-300 mb-3 leading-relaxed">
            A clear checklist sets expectations before work starts and gives both sides an honest
            record once it’s done. That record is what turns a finished job into a strong review and
            real proof of work.
          </p>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>
                Pledge to the{' '}
                <Link href="/code-of-craft" className="text-amber-400 hover:underline">
                  Code of Craft
                </Link>{' '}
                to commit to these standards publicly.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>
                Documented work builds toward{' '}
                <Link href="/verified-pro" className="text-amber-400 hover:underline">
                  Verified Pro
                </Link>{' '}
                and your{' '}
                <Link href="/progression" className="text-amber-400 hover:underline">
                  ranks &amp; progression
                </Link>
                .
              </span>
            </li>
          </ul>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-amber-900/20 to-purple-900/20 border border-amber-500/40 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-amber-400 mb-3">Put a standard to work</h3>
          <p className="text-gray-300 mb-6">
            Posting a job or picking one up? Skim the matching checklist first.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/questboard"
              className="inline-block bg-amber-600 hover:bg-amber-700 text-black font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Browse the questboard
            </Link>
            <Link
              href="/request-help"
              className="inline-block border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Request help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
