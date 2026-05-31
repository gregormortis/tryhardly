import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ranks & Progression — how workers level up on TryHardly',
  description:
    'How worker ranks (Novice → Legendary, including Master), skill badges (Bronze → Mythic), guild requirements, and trust-based progression work. Ranks reward trust and craft, not a lower fee.',
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
    blurb: 'You have shown up and delivered a handful of good jobs.',
    reqs: [
      'Reach level 10',
      'Be active for 14 days',
      'Complete 5+ jobs',
      'Hold a 4.0★+ average across 5+ ratings',
      'No unresolved disputes on your record',
    ],
  },
  {
    name: 'Journeyman',
    color: 'text-amber-400 border-amber-400/30 bg-amber-400/5',
    blurb: 'A proven, consistent worker with a real body of rated work.',
    reqs: [
      'Reach level 35',
      'Be active for 3 months',
      'Complete 30+ jobs',
      'Hold a 4.4★+ average across 10+ ratings',
      'Earn 2+ Bronze skill badges',
      'Build a base of repeat/return clients or referrals (coming soon)',
    ],
  },
  {
    name: 'Expert',
    color: 'text-orange-400 border-orange-400/30 bg-orange-400/5',
    blurb: 'A trusted, credentialed craftsperson working within the guild community.',
    reqs: [
      'Reach level 65',
      'Be active for 6 months',
      'Complete 100+ jobs',
      'Hold a 4.7★+ average across 25+ ratings',
      'Be a guild member in good standing',
      'Earn 2+ Silver skill badges',
      'Hold 1+ verified credential',
    ],
    gated: 'Guild',
  },
  {
    name: 'Master',
    color: 'text-violet-400 border-violet-400/30 bg-violet-400/5',
    blurb: 'A master of the craft and a leader who mentors others in the guild.',
    reqs: [
      'Reach level 80',
      'Be active for 12 months',
      'Complete 200+ jobs',
      'Hold a 4.8★+ average across 40+ ratings',
      'Serve as a guild officer, mentor, or leader',
      'Earn 1+ Gold skill badge',
      'Maintain 95%+ completion reliability (coming soon)',
    ],
    gated: 'Guild leadership',
  },
  {
    name: 'Legendary',
    color: 'text-rose-400 border-rose-400/30 bg-rose-400/5',
    blurb: 'A guild leader of standing with a top reputation and a clean record.',
    reqs: [
      'Reach level 95',
      'Be active for 18+ months',
      'Complete 400+ jobs',
      'Hold a 4.9★+ average across 80+ ratings',
      'Lead a guild of 10+ active members with 1000+ guild reputation',
      'No serious disputes on your record',
      'Maintain a guild 4.8★+ average and a clean 180-day record (coming soon)',
    ],
    gated: 'Guild leadership',
  },
];

const SKILL_TIERS = [
  { tier: 'Bronze', color: 'text-amber-700', rule: '5+ ratings averaging 4.2★+' },
  { tier: 'Silver', color: 'text-gray-300', rule: '15+ ratings averaging 4.5★+' },
  { tier: 'Gold', color: 'text-yellow-400', rule: '40+ ratings averaging 4.7★+' },
  { tier: 'Platinum', color: 'text-cyan-300', rule: '100+ ratings averaging 4.85★+' },
  { tier: 'Mythic', color: 'text-fuchsia-400', rule: '250+ ratings averaging 4.9★+, plus admin/guild review' },
];

const PROBATION_STAGES = [
  { stage: 'Warning', detail: 'A dip in ratings or a recent low review puts a soft flag on your account. Nothing changes yet — it is a heads-up.' },
  { stage: 'Probation', detail: 'A continued pattern of low ratings or a dispute moves you to probation. Your rank is held in place while you recover.' },
  { stage: 'Rank freeze', detail: 'While frozen, you keep your rank but cannot climb higher until the pattern clears and your recent record improves.' },
  { stage: 'Review & demotion', detail: 'Only after human review — for serious or repeated issues — can a rank be lowered. We never auto-demote on a single bad day.' },
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
            Climb from Novice through Master to Legendary by doing great work — not by paying more. Ranks reward
            <span className="text-white font-semibold"> trust, skill, and standing</span>, never a lower fee.
            The marketplace fee stays a flat 12% at every rank. This is a long road by design: the top ranks
            are earned over seasons of quality work, like a trade you master over years.
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
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>A solid base for every completed job (+250)</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Cash earned — capped at +500, so big jobs don&apos;t dominate</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Rating quality — 5★ jobs +350, 4★ jobs +150</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>On-time delivery before the deadline (+150)</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Written client reviews (+100) &amp; each rated skill (+50)</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Verified credentials, guild contribution &amp; repeat clients</span></li>
          </ul>
          <p className="text-gray-400 text-sm mt-4">
            Your <span className="text-white font-semibold">level</span> comes from XP, but a rank takes more than
            levels: it is gated on time, completed jobs, rating quality, skill badges, and guild standing. If you have
            the level for the next rank but still owe its other requirements, your profile shows you as a
            <span className="text-white font-semibold"> candidate</span> (for example, &ldquo;Journeyman Candidate&rdquo;)
            — never a rank you haven&apos;t fully earned.
          </p>
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
            themselves. <span className="text-white font-semibold">Expert</span> requires being a guild member in
            good standing. <span className="text-white font-semibold">Master</span> requires serving as a guild
            officer or mentor. <span className="text-white font-semibold">Legendary</span> requires leading a guild
            of standing: a real member base, a strong shared reputation, and a clean record.
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
          <p className="text-gray-300 mb-4">
            Ranks are a trust signal, so they have to stay trustworthy. A pattern of low ratings, several bad
            reviews in a row, or a severe dispute moves an account through a clear, fair ladder — never a sudden
            drop. Each step is reversible by getting back to good work.
          </p>
          <ol className="space-y-2.5 mb-4">
            {PROBATION_STAGES.map((s, i) => (
              <li key={s.stage} className="flex items-start gap-3 text-sm">
                <span className="font-mono text-rose-300/80 mt-0.5">{i + 1}.</span>
                <span>
                  <span className="text-white font-semibold">{s.stage}</span>
                  <span className="text-gray-400"> — {s.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-gray-400 text-sm">
            We don&apos;t silently strip ranks — flagged accounts are reviewed for fairness first. This protects
            clients hiring high-ranked workers and protects workers from a single bad day undoing months of good work.
          </p>
        </section>

        {/* Achievements */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-amber-400 mb-3">Achievements</h2>
          <p className="text-gray-300 mb-5">
            Achievements are recognition badges that unlock automatically from real activity — your first completed
            job, a five-star review, on-time delivery, fast responses, verified credentials, skill specialization,
            guild mentorship, and community contributions. They appear on your public profile so clients can see your
            track record at a glance. Until you earn one, your profile shows an honest empty state — never a badge you
            haven&apos;t earned.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '⚔️', name: 'First Completed Job', rule: 'Finish your first job on the platform.' },
              { icon: '⭐', name: 'Five-Star Start', rule: 'Receive a 5-star review for your work.' },
              { icon: '⚡', name: 'On-Time Finisher', rule: 'Deliver a job on or before its deadline.' },
              { icon: '🔬', name: 'Skill Specialist', rule: 'Build a strong, rated track record in one skill.' },
              { icon: '🏰', name: 'Guild Mentor', rule: 'Lead and grow a guild in the community.' },
              { icon: '🤝', name: 'Community Builder', rule: 'Contribute consistently alongside your guild.' },
            ].map((a) => (
              <div key={a.name} className="bg-gray-900/50 border border-gray-800 rounded-lg p-5 flex items-start gap-3">
                <span className="text-2xl leading-none" aria-hidden>{a.icon}</span>
                <div>
                  <div className="font-bold text-amber-200">{a.name}</div>
                  <p className="text-sm text-gray-400 mt-0.5">{a.rule}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-5">
            Achievements are recognition only. They confer no cash, discounts, or fee changes — see the{' '}
            <a href="/leaderboards" className="text-amber-400 hover:underline">community leaderboards</a> for how
            trust and skill are celebrated across the platform.
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
