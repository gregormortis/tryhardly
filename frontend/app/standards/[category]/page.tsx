import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TRADE_STANDARDS, getTradeStandard, TradeStandard } from '@/lib/tradeStandards';

export function generateStaticParams() {
  return TRADE_STANDARDS.map((s) => ({ category: s.slug }));
}

export function generateMetadata({ params }: { params: { category: string } }): Metadata {
  const std = getTradeStandard(params.category);
  if (!std) return { title: 'Work standard not found · TryHardly' };

  const title = `${std.label} standards & checklist`;
  const description = `${std.blurb} What good work includes, what to document, what clients should clarify, completion proof, and safety notes — a practical TryHardly checklist.`;
  return {
    title,
    description,
    alternates: { canonical: `/standards/${std.slug}` },
    openGraph: {
      title: `${title} · TryHardly`,
      description,
      url: `/standards/${std.slug}`,
      type: 'article',
    },
    twitter: { card: 'summary', title: `${title} · TryHardly`, description },
  };
}

const SECTIONS: {
  key: keyof Pick<TradeStandard, 'goodWork' | 'document' | 'clarify' | 'completionProof' | 'safety'>;
  title: string;
  intro: string;
}[] = [
  { key: 'goodWork', title: 'What good work includes', intro: 'The bar for a job well done.' },
  { key: 'document', title: 'What workers should document', intro: 'Notes and photos that protect both sides and build trust.' },
  { key: 'clarify', title: 'What clients should clarify', intro: 'Settle these before the work starts to avoid surprises.' },
  { key: 'completionProof', title: 'Completion proof expectations', intro: 'How to show the job is genuinely done.' },
  { key: 'safety', title: 'Safety & property respect', intro: 'Protect people and the property throughout.' },
];

export default function StandardCategoryPage({ params }: { params: { category: string } }) {
  const std = getTradeStandard(params.category);
  if (!std) notFound();

  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-20">
        <Link
          href="/standards"
          className="text-gray-400 hover:text-amber-400 text-sm transition-colors flex items-center gap-2 mb-8"
        >
          <span>←</span> All work standards
        </Link>

        {/* Header */}
        <div className="mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400 mb-3">
            Trade standard
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-white">{std.label}</h1>
          <p className="text-lg text-gray-300 leading-relaxed">{std.blurb}</p>
          <p className="text-sm text-gray-500 leading-relaxed mt-3">
            A practical checklist — not legal advice and not a guarantee by TryHardly. Use it to set
            expectations and turn finished work into clear proof and reviews.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {SECTIONS.map(({ key, title, intro }) => (
            <section
              key={key}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 sm:p-7"
            >
              <h2 className="text-xl font-bold text-amber-200 mb-1">{title}</h2>
              <p className="text-sm text-gray-500 mb-4">{intro}</p>
              <ul className="space-y-2">
                {std[key].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-12 bg-gradient-to-r from-amber-900/20 to-purple-900/20 border border-amber-500/40 rounded-xl p-8 text-center">
          <h3 className="text-xl font-bold text-amber-400 mb-3">Turn this into proof</h3>
          <p className="text-gray-300 mb-6 text-sm leading-relaxed">
            Follow the checklist, document the work, and let your finished jobs build your reputation
            through reviews and skill badges.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/code-of-craft"
              className="inline-block bg-amber-600 hover:bg-amber-700 text-black font-bold px-6 py-3 rounded-lg transition-colors"
            >
              The Code of Craft
            </Link>
            <Link
              href="/questboard"
              className="inline-block border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Browse the questboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
