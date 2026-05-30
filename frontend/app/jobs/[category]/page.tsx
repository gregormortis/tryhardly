import type { Metadata } from 'next';
import Link from 'next/link';
import { JOB_CATEGORIES, resolveJobCategory } from '@/lib/jobCategories';
import QuestBoard from '@/components/Questboard';

interface PageProps {
  params: { category: string };
}

export function generateStaticParams() {
  return JOB_CATEGORIES.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }: PageProps): Metadata {
  const cat = resolveJobCategory(params.category);
  const title = cat.known ? `${cat.label} — Find Local Work` : `${cat.label} — Local Quests`;
  return {
    title,
    description: `${cat.blurb} Browse and post ${cat.label.toLowerCase()} on TryHardly, a local gig board for real work.`,
    alternates: { canonical: `/jobs/${cat.slug}` },
    openGraph: {
      title: `${title} · TryHardly`,
      description: cat.blurb,
      url: `/jobs/${cat.slug}`,
    },
  };
}

export default function JobCategoryPage({ params }: PageProps) {
  const cat = resolveJobCategory(params.category);

  return (
    <div className="bg-zinc-950">
      <section className="border-b border-white/[0.06] px-4 sm:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <nav className="font-mono text-[11px] text-stone-600 mb-3">
            <Link href="/questboard" className="hover:text-amber-400">Quest board</Link>
            <span className="mx-2">/</span>
            <span className="text-stone-400">{cat.label}</span>
          </nav>
          <h1 className="font-bold text-3xl text-stone-100 tracking-tight mb-3">{cat.label}</h1>
          <p className="text-stone-400 max-w-2xl leading-relaxed">{cat.blurb}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {cat.examples.map((ex) => (
              <span
                key={ex}
                className="font-mono text-[11px] text-stone-400 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5"
              >
                {ex}
              </span>
            ))}
          </div>

          <p className="mt-5 font-mono text-[11px] text-stone-600">
            TryHardly is early-stage and growing locally — listings below are live quests, not estimates.
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href="/post-quest"
              className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 bg-amber-400 text-zinc-950 rounded hover:bg-amber-300 transition-colors"
            >
              POST A {cat.label.toUpperCase()} QUEST
            </Link>
          </div>
        </div>
      </section>

      {/* Known categories deep-link into a filtered board; generic slugs search
          the board by the slug term so the page still surfaces live quests. */}
      <QuestBoard
        initialCategory={cat.known ? cat.slug : undefined}
        initialSearch={cat.known ? undefined : cat.label}
      />

      {/* Internal links to other categories help discovery + SEO. */}
      <section className="max-w-5xl mx-auto px-4 sm:px-8 py-10 border-t border-white/[0.05]">
        <h2 className="font-mono text-[11px] font-semibold tracking-widest text-stone-600 uppercase mb-4">
          Other kinds of work
        </h2>
        <div className="flex flex-wrap gap-2">
          {JOB_CATEGORIES.filter((c) => c.slug !== cat.slug).map((c) => (
            <Link
              key={c.slug}
              href={`/jobs/${c.slug}`}
              className="font-mono text-[11px] text-stone-500 border border-white/[0.08] rounded-full px-3 py-1.5 hover:text-amber-400 hover:border-amber-500/40 transition-colors"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
