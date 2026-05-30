import type { Metadata } from 'next';
import Link from 'next/link';
import { resolveJobCategory, humanizeCity } from '@/lib/jobCategories';
import QuestBoard from '@/components/Questboard';

interface PageProps {
  params: { category: string; city: string };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const cat = resolveJobCategory(params.category);
  const city = humanizeCity(params.city);
  const title = `${cat.label} in ${city} — Local Work`;
  return {
    title,
    description: `Find or post ${cat.label.toLowerCase()} in ${city} on TryHardly. ${cat.blurb}`,
    alternates: { canonical: `/jobs/${cat.slug}/${params.city}` },
    openGraph: {
      title: `${title} · TryHardly`,
      description: `${cat.label} in ${city}. ${cat.blurb}`,
      url: `/jobs/${cat.slug}/${params.city}`,
    },
  };
}

export default function JobCategoryCityPage({ params }: PageProps) {
  const cat = resolveJobCategory(params.category);
  const city = humanizeCity(params.city);

  return (
    <div className="bg-zinc-950">
      <section className="border-b border-white/[0.06] px-4 sm:px-8 py-10">
        <div className="max-w-5xl mx-auto">
          <nav className="font-mono text-[11px] text-stone-600 mb-3">
            <Link href="/questboard" className="hover:text-amber-400">Quest board</Link>
            <span className="mx-2">/</span>
            <Link href={`/jobs/${cat.slug}`} className="hover:text-amber-400">{cat.label}</Link>
            <span className="mx-2">/</span>
            <span className="text-stone-400">{city}</span>
          </nav>
          <h1 className="font-bold text-3xl text-stone-100 tracking-tight mb-3">
            {cat.label} in {city}
          </h1>
          <p className="text-stone-400 max-w-2xl leading-relaxed">{cat.blurb}</p>

          <p className="mt-5 font-mono text-[11px] text-stone-600">
            TryHardly is just getting started in {city}. The board below shows live quests matching
            “{city}” — if it&apos;s empty, be the first to post and local workers will see it.
          </p>

          <div className="mt-5 flex gap-3">
            <Link
              href="/post-quest"
              className="font-mono text-[11px] font-semibold tracking-widest px-5 py-2.5 bg-amber-400 text-zinc-950 rounded hover:bg-amber-300 transition-colors"
            >
              POST A QUEST IN {city.toUpperCase()}
            </Link>
          </div>
        </div>
      </section>

      {/* Known categories filter the board and search the city; generic slugs
          search the city term so the page still surfaces live local quests. */}
      <QuestBoard initialCategory={cat.known ? cat.slug : undefined} initialSearch={city} />
    </div>
  );
}
