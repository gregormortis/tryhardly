import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How ratings, badges, and worker reputation work — TryHardly',
  description:
    'How experience levels, skill badges, verified credentials, and worker teams build a worker reputation on TryHardly. Reputation is earned from completed jobs and client reviews — it never changes the fee.',
};

const LEVELS = [
  {
    name: 'Starting out',
    color: 'text-success border-success/30 bg-success/5',
    blurb: 'Everyone starts here. Post, apply, and complete your first jobs.',
    reqs: ['Create an account — no track record needed to start working'],
  },
  {
    name: 'Established',
    color: 'text-info border-info/30 bg-info/5',
    blurb: 'You have shown up and delivered a handful of good jobs.',
    reqs: [
      'Be active for 14 days',
      'Complete 5+ jobs',
      'Hold a 4.0★+ average across 5+ ratings',
      'No unresolved disputes on your record',
    ],
  },
  {
    name: 'Experienced',
    color: 'text-accent-text border-accent/30 bg-accent/5',
    blurb: 'A proven, consistent worker with a real body of rated work.',
    reqs: [
      'Be active for 3 months',
      'Complete 30+ jobs',
      'Hold a 4.4★+ average across 10+ ratings',
      'Earn 2+ Starter skill badges',
      'Build a base of repeat clients or referrals',
    ],
  },
  {
    name: 'Trusted specialist',
    color: 'text-warning border-warning/30 bg-warning/5',
    blurb: 'A credentialed worker clients come back to for skilled work.',
    reqs: [
      'Be active for 6 months',
      'Complete 100+ jobs',
      'Hold a 4.7★+ average across 25+ ratings',
      'Work with a worker team in good standing',
      'Earn 2+ Reliable skill badges',
      'Hold 1+ verified credential',
    ],
    gated: 'a worker team',
  },
  {
    name: 'Senior specialist',
    color: 'text-info border-info/30 bg-info/5',
    blurb: 'A highly skilled worker who also helps other workers do the job right.',
    reqs: [
      'Be active for 12 months',
      'Complete 200+ jobs',
      'Hold a 4.8★+ average across 40+ ratings',
      'Help organize or mentor within a worker team',
      'Earn 1+ Highly rated skill badge',
      'Maintain 95%+ completion reliability',
    ],
    gated: 'a worker team role',
  },
  {
    name: 'Top rated',
    color: 'text-danger border-danger/30 bg-danger/5',
    blurb: 'A long, clean record at the top of the ratings, plus a team that matches it.',
    reqs: [
      'Be active for 18+ months',
      'Complete 400+ jobs',
      'Hold a 4.9★+ average across 80+ ratings',
      'Run a worker team of 10+ active workers with a strong shared record',
      'No serious disputes on your record',
      'Maintain a team 4.8★+ average and a clean 180-day record',
    ],
    gated: 'a worker team role',
  },
];

const SKILL_TIERS = [
  { tier: 'Starter', color: 'text-accent-text', rule: '5+ ratings averaging 4.2★+' },
  { tier: 'Reliable', color: 'text-body', rule: '15+ ratings averaging 4.5★+' },
  { tier: 'Highly rated', color: 'text-warning', rule: '40+ ratings averaging 4.7★+' },
  { tier: 'Top rated', color: 'text-info', rule: '100+ ratings averaging 4.85★+' },
  { tier: 'Verified specialist', color: 'text-info', rule: '250+ ratings averaging 4.9★+, plus a manual review' },
];

const PROBATION_STAGES = [
  { stage: 'Warning', detail: 'A dip in ratings or a recent low review puts a soft flag on your account. Nothing changes yet — it is a heads-up.' },
  { stage: 'Probation', detail: 'A continued pattern of low ratings or a dispute moves you to probation. Your level is held in place while you recover.' },
  { stage: 'Level hold', detail: 'While held, you keep your current level but cannot move up until the pattern clears and your recent record improves.' },
  { stage: 'Review & reduction', detail: 'Only after human review — for serious or repeated issues — can a level be lowered. A level is never reduced automatically over a single bad day.' },
];

export default function ProgressionPage() {
  return (
    <div className="min-h-screen bg-canvas py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 text-strong">
            Ratings, badges, and worker reputation
          </h1>
          <p className="text-lg text-body max-w-2xl mx-auto">
            A worker&apos;s standing on TryHardly comes from finished work: completed jobs, client reviews tied to
            those jobs, verified credentials, and a reliable record. Reputation earns
            <span className="text-strong font-semibold"> visibility and trust</span>, never a lower fee — the
            marketplace fee stays a flat 12% for every worker, at every level.
          </p>
        </div>

        {/* What builds reputation */}
        <section className="mb-14 bg-surface border border-line rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-accent-text mb-3">What builds your reputation</h2>
          <p className="text-body mb-4">
            Your reputation score is weighted so that consistent, well-rated work counts for more than a few big
            jobs. What a client pays counts too, but it is capped per job. The rest comes from doing the job well:
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-body">
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>Every completed job counts, whatever its size</span></li>
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>Job value counts, but it is capped so big jobs don&apos;t dominate</span></li>
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>Rating quality — a 5★ job counts for more than a 4★ job</span></li>
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>Finishing on or before the agreed deadline</span></li>
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>Written client reviews, and ratings on each individual skill</span></li>
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>Verified credentials, worker team contribution &amp; repeat clients</span></li>
          </ul>
          <p className="text-muted text-sm mt-4">
            Your score moves as you work, but an experience level takes more than a score: it is gated on time on
            the platform, completed jobs, rating quality, skill badges, and standing with your worker team. If your
            score is high enough for the next level but you still owe its other requirements, your profile shows you
            as a <span className="text-strong font-semibold">candidate</span> for it — never a level you haven&apos;t
            fully earned.
          </p>
        </section>

        {/* Experience levels */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-accent-text mb-6">Experience levels</h2>
          <div className="space-y-4">
            {LEVELS.map((level) => (
              <div key={level.name} className={`border rounded-xl p-5 sm:p-6 ${level.color}`}>
                <div className="flex items-center flex-wrap gap-3 mb-2">
                  <h3 className="text-xl font-bold">{level.name}</h3>
                  {level.gated && (
                    <span className="text-[12px] font-mono uppercase tracking-wider border border-current/40 rounded px-2 py-0.5">
                      Requires {level.gated}
                    </span>
                  )}
                </div>
                <p className="text-body text-sm mb-3">{level.blurb}</p>
                <ul className="space-y-1.5">
                  {level.reqs.map((req) => (
                    <li key={req} className="flex items-start gap-2 text-sm text-muted">
                      <span className="mt-0.5">→</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Worker teams explainer */}
        <section className="mb-14 bg-info/[0.06] border border-info/25 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-info mb-3">Worker teams and the senior levels</h2>
          <p className="text-body mb-3">
            A worker team is a group of workers who take jobs on together and share a rating history. The senior
            levels recognize workers who also lift up the people around them.{' '}
            <span className="text-strong font-semibold">Trusted specialist</span> asks that you work with a team in
            good standing. <span className="text-strong font-semibold">Senior specialist</span> asks that you help
            organize or mentor within one. <span className="text-strong font-semibold">Top rated</span> asks that you
            run a team with a real roster, a strong shared record, and no serious disputes.
          </p>
          <p className="text-muted text-sm">
            Working solo is always fine — every step up to Experienced is reachable on your own record alone.
          </p>
        </section>

        {/* Skill badges */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-accent-text mb-3">Skill badges</h2>
          <p className="text-body mb-5">
            After a job, clients rate each individual skill you performed — mowing, fencing, hauling, and so on.
            As your rated skills add up, you earn tiered badges <span className="text-strong font-semibold">per skill</span>.
            Badges are always calculated from real ratings, so they can never be faked. Until a skill has enough
            ratings, your profile shows honest progress toward the next tier — never a badge you haven&apos;t earned.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {SKILL_TIERS.map((t) => (
              <div key={t.tier} className="bg-surface border border-line rounded-lg p-5">
                <div className={`text-lg font-bold mb-1 ${t.color}`}>{t.tier}</div>
                <p className="text-sm text-muted">{t.rule}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Trust moderation */}
        <section className="mb-14 bg-danger/[0.06] border border-danger/25 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-danger mb-3">Keeping reputation honest</h2>
          <p className="text-body mb-4">
            Levels and badges are a trust signal for clients, so they have to stay trustworthy. A pattern of low
            ratings, several bad reviews in a row, or a severe dispute moves an account through a clear, fair
            process — never a sudden drop. Each step is reversible by getting back to good work.
          </p>
          <ol className="space-y-2.5 mb-4">
            {PROBATION_STAGES.map((s, i) => (
              <li key={s.stage} className="flex items-start gap-3 text-sm">
                <span className="font-mono text-danger/80 mt-0.5">{i + 1}.</span>
                <span>
                  <span className="text-strong font-semibold">{s.stage}</span>
                  <span className="text-muted"> — {s.detail}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-muted text-sm">
            Levels are never stripped silently — flagged accounts are reviewed for fairness first. This protects
            clients hiring highly rated workers, and protects workers from a single bad day undoing months of good
            work.
          </p>
        </section>

        {/* Recognition badges */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-accent-text mb-3">Recognition badges</h2>
          <p className="text-body mb-5">
            Recognition badges unlock automatically from real activity — your first completed job, a five-star
            review, on-time delivery, fast responses, verified credentials, skill specialization, team leadership,
            and steady contribution. They appear on your public profile so clients can see your track record at a
            glance. Until you earn one, your profile shows an honest empty state — never a badge you haven&apos;t
            earned.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { icon: '🧰', name: 'First Completed Job', rule: 'Finish your first job on the platform.' },
              { icon: '⭐', name: 'Five-Star Start', rule: 'Receive a 5-star review for your work.' },
              { icon: '⚡', name: 'On-Time Finisher', rule: 'Deliver a job on or before its deadline.' },
              { icon: '🔬', name: 'Skill Specialist', rule: 'Build a strong, rated track record in one skill.' },
              { icon: '👷', name: 'Team Lead', rule: 'Organize and grow a worker team.' },
              { icon: '🤝', name: 'Steady Contributor', rule: 'Take on jobs consistently alongside your worker team.' },
            ].map((a) => (
              <div key={a.name} className="bg-surface border border-line rounded-lg p-5 flex items-start gap-3">
                <span className="text-2xl leading-none" aria-hidden>{a.icon}</span>
                <div>
                  <div className="font-bold text-accent-text-hover">{a.name}</div>
                  <p className="text-sm text-muted mt-0.5">{a.rule}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-subtle text-sm mt-5">
            Recognition badges are recognition only. They carry no cash, discounts, or fee changes — see the{' '}
            <a href="/leaderboards" className="text-accent-text hover:underline">top rated workers</a> for how
            ratings and completed work are recognized across the platform.
          </p>
        </section>

        {/* Professional signals */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-accent-text mb-3">Professional signals</h2>
          <p className="text-body mb-5">
            Levels and badges grow over time, but you can show clients you mean business from day one. These
            professional signals sit alongside your level — all honest, all earned or self-attested, never faked.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <a href="/code-of-craft" className="bg-surface border border-line rounded-lg p-5 block hover:border-accent/40 transition-colors">
              <div className="text-lg font-bold text-accent-text-hover mb-1">Code of Craft</div>
              <p className="text-sm text-muted">
                Pledge to professional standards — show up, communicate, protect property, and clean up. Your
                profile shows the pledge only when you&apos;ve actually made it.
              </p>
            </a>
            <a href="/verified-pro" className="bg-surface border border-line rounded-lg p-5 block hover:border-success/40 transition-colors">
              <div className="text-lg font-bold text-success mb-1">Verified Pro</div>
              <p className="text-sm text-muted">
                An earned checklist: complete profile, Code of Craft pledge, a verified credential, completed
                jobs, strong reviews, and a clean record. Derived from real activity — never bought.
              </p>
            </a>
            <div className="bg-surface border border-line rounded-lg p-5">
              <div className="text-lg font-bold text-info mb-1">Proof-of-work gallery</div>
              <p className="text-sm text-muted">
                Showcase honest photos of past work on your profile. Proof examples help clients trust your
                skill claims — but skill badges themselves always stay rating-derived.
              </p>
            </div>
            <a href="/standards" className="bg-surface border border-line rounded-lg p-5 block hover:border-accent/40 transition-colors">
              <div className="text-lg font-bold text-accent-text-hover mb-1">Trade standards &amp; checklists</div>
              <p className="text-sm text-muted">
                Practical, job-by-job checklists for each kind of work. Following them — and documenting the
                result — is how a completed job becomes a strong review and real proof toward your badges.
              </p>
            </a>
          </div>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-accent/20/20 to-info/20 border border-accent/40 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-accent-text mb-3">Start building your record</h3>
          <p className="text-body mb-6">Free to join. Flat 12% only when you complete a paid job.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/auth/register" className="inline-block bg-accent hover:bg-accent text-on-accent font-bold px-6 py-3 rounded-lg transition-colors">
              Create your account
            </a>
            <a href="/pricing" className="inline-block border border-accent/40 hover:border-accent text-accent-text-hover font-bold px-6 py-3 rounded-lg transition-colors">
              See pricing
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
