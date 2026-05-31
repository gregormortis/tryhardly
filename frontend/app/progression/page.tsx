import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ranks & Progression — how workers level up on TryHardly',
  description:
    'How worker ranks (Novice → Legendary), skill badges (Bronze → Platinum), guild requirements, and trust-based progression work. Ranks reward trust and craft, not a lower fee.',
};

const RANKS = [
  {
    name: 'Novice',
    color: 'text-green-400 border-green-400/30 bg-green-400/5',
    blurb: 'Everyone starts here. Post, apply, and complete your first jobs.',
    reqs: ['Create an account — you start as a Novice'],
  },
  {
    name: 'Apprentice',
    color: 'text-blue-400 border-blue-400/30 bg-blue-400/5',
    blurb: 'You have shown up and delivered a few good jobs.',
    reqs: [
      'Reach level 3',
      'Complete 3+ jobs',
      'Hold a 3.5★+ average across 2+ ratings',
    ],
  },
  {
    name: 'Journeyman',
    color: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
    blurb: 'A proven, consistent worker with a solid track record.',
    reqs: [
      'Reach level 8',
      'Complete 10+ jobs',
      'Hold a 4.0★+ average across 5+ ratings',
      'Verify a professional credential OR maintain consistent high ratings',
    ],
  },
  {
    name: 'Expert',
    color: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
    blurb: 'A trusted craftsperson who works within the guild community.',
    reqs: [
      'Reach level 15',
      'Complete 25+ jobs',
      'Hold a 4.5★+ average across 12+ ratings',
      'Be an active member of a guild (membership or leadership)',
    ],
    gated: 'Guild',
  },
  {
    name: 'Legendary',
    color: 'text-rose-400 border-rose-400/30 bg-rose-400/5',
    blurb: 'A guild leader of standing with a top reputation and a clean record.',
    reqs: [
      'Reach level 30',
      'Complete 60+ jobs',
      'Hold a 4.7★+ average across 30+ ratings',
      'Lead a guild of 5+ members with 500+ guild reputation',
      'No recent severe disputes on your record',
    ],
    gated: 'Guild leadership',
  },
];

const SKILL_TIERS = [
  { tier: 'Bronze', color: 'text-amber-700', rule: '3+ ratings averaging 4.0★+' },
  { tier: 'Silver', color: 'text-gray-300', rule: '8+ ratings averaging 4.3★+' },
  { tier: 'Gold', color: 'text-yellow-400', rule: '20+ ratings averaging 4.6★+' },
  { tier: 'Platinum', color: 'text-cyan-300', rule: '50+ ratings averaging 4.8★+' },
];

export default function ProgressionPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">
            Ranks &amp; Progression
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Climb from Novice to Legendary by doing great work — not by paying more. Ranks reward
            <span className="text-white font-semibold"> trust, skill, and standing</span>, never a lower fee.
            The marketplace fee stays a flat 12% at every rank.
          </p>
        </div>

        {/* How XP works */}
        <section className="mb-14 bg-gray-900/50 border border-gray-800 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-amber-400 mb-3">How you earn XP</h2>
          <p className="text-gray-300 mb-4">
            XP is deliberately balanced so that consistent, high-quality work outranks a few big paydays.
            Cash earned counts — but it&apos;s capped per job. The rest comes from doing the job well:
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>A solid base for every completed job</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Cash earned — capped, so big jobs don&apos;t dominate</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Rating quality — 4★ and 5★ jobs earn bonus XP</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>On-time delivery before the deadline</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Written client reviews</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Verified credentials &amp; guild contribution</span></li>
          </ul>
        </section>

        {/* Rank ladder */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-amber-400 mb-6">The rank ladder</h2>
          <div className="space-y-4">
            {RANKS.map((rank) => (
              <div key={rank.name} className={`border rounded-xl p-5 sm:p-6 ${rank.color}`}>
                <div className="flex items-center flex-wrap gap-3 mb-2">
                  <h3 className="text-xl font-bold">{rank.name}</h3>
                  {rank.gated && (
                    <span className="text-[11px] font-mono uppercase tracking-wider border border-current/40 rounded px-2 py-0.5">
                      Requires {rank.gated}
                    </span>
                  )}
                </div>
                <p className="text-gray-300 text-sm mb-3">{rank.blurb}</p>
                <ul className="space-y-1.5">
                  {rank.reqs.map((req) => (
                    <li key={req} className="flex items-start gap-2 text-sm text-gray-400">
                      <span className="mt-0.5">→</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Guild gates explainer */}
        <section className="mb-14 bg-violet-500/[0.06] border border-violet-500/25 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-violet-300 mb-3">Guilds open the top ranks</h2>
          <p className="text-gray-300 mb-3">
            Like a trade union local, the highest ranks reward people who lift up the community — not just
            themselves. <span className="text-white font-semibold">Expert</span> requires being part of a guild.
            <span className="text-white font-semibold"> Legendary</span> requires leading a guild of standing:
            a real member base, a strong shared reputation, and a clean record.
          </p>
          <p className="text-gray-400 text-sm">
            This keeps the top of the ladder meaningful — it reflects leadership and trust, not just hours logged.
          </p>
        </section>

        {/* Skill badges */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-amber-400 mb-3">Skill badges</h2>
          <p className="text-gray-300 mb-5">
            After a job, clients rate each individual skill you performed — mowing, fencing, hauling, and so on.
            As your rated skills add up, you earn tiered badges <span className="text-white font-semibold">per skill</span>.
            Badges are always calculated from real ratings, so they can never be faked. Until a skill has enough
            ratings, your profile shows honest progress toward the next tier — never a badge you haven&apos;t earned.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {SKILL_TIERS.map((t) => (
              <div key={t.tier} className="bg-gray-900/50 border border-gray-800 rounded-lg p-5">
                <div className={`text-lg font-bold mb-1 ${t.color}`}>{t.tier}</div>
                <p className="text-sm text-gray-400">{t.rule}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Rank-down / trust moderation */}
        <section className="mb-14 bg-rose-500/[0.06] border border-rose-500/25 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-rose-300 mb-3">Keeping ranks honest</h2>
          <p className="text-gray-300 mb-3">
            Ranks are a trust signal, so they have to stay trustworthy. A pattern of low ratings, several bad
            reviews in a row, or a severe dispute will flag an account for review and can put a rank at risk.
          </p>
          <p className="text-gray-400 text-sm">
            We don&apos;t silently strip ranks — flagged accounts are reviewed for fairness first. This protects
            clients hiring high-ranked workers and protects workers from a single bad day undoing months of good work.
          </p>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-amber-900/20 to-purple-900/20 border border-amber-500/40 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-amber-400 mb-3">Start your climb</h3>
          <p className="text-gray-300 mb-6">Free to join. Flat 12% only when you complete a paid job.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/auth/register" className="inline-block bg-amber-600 hover:bg-amber-700 text-black font-bold px-6 py-3 rounded-lg transition-colors">
              Create your account
            </a>
            <a href="/pricing" className="inline-block border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold px-6 py-3 rounded-lg transition-colors">
              See pricing
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
