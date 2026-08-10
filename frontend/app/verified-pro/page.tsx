import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Verified Pro — the TryHardly trust checklist',
  description:
    'Verified Pro is an earned trust signal on TryHardly: complete your profile, pledge to the Code of Craft, verify a credential, complete jobs, earn strong reviews, and keep a clean record. It is derived from real activity — never bought.',
};

const CHECKLIST = [
  {
    title: 'Complete your profile',
    body: 'Add a real bio and at least one professional detail or featured skill, so clients can evaluate you.',
  },
  {
    title: 'Pledge to the Code of Craft',
    body: (
      <>
        Commit to the{' '}
        <Link href="/code-of-craft" className="text-accent-text hover:underline">
          Code of Craft
        </Link>{' '}
        professional standards from your profile.
      </>
    ),
  },
  {
    title: 'Add a credential or confirm your email',
    body: 'Add a license, insurance document, certification, or similar credential. Your account email must also be confirmed.',
  },
  {
    title: 'Complete 3+ jobs',
    body: 'Build a real track record by completing jobs on the platform.',
  },
  {
    title: 'Earn a 4.0★+ average across 3+ reviews',
    body: 'Verified Pro reflects quality, so it leans on real client reviews — never self-reported ratings.',
  },
  {
    title: 'Keep a clean record',
    body: 'No unresolved serious account reports.',
  },
];

export default function VerifiedProPage() {
  return (
    <div className="min-h-screen bg-canvas text-body">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-14">
          <p className="font-mono text-xs uppercase tracking-widest text-success mb-3">
            Earned, not bought
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 text-strong">
            Verified Pro
          </h1>
          <p className="text-lg text-body max-w-2xl mx-auto leading-relaxed">
            Verified Pro is a trust signal that says a worker has done the work to earn it. It is derived
            entirely from <span className="text-strong font-semibold">real activity</span> — a complete
            profile, a Code of Craft pledge, a verified credential, completed jobs, strong reviews, and a
            clean record. You can&apos;t pay for it, and we never fake it.
          </p>
        </div>

        {/* Checklist */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-accent-text mb-6">The Verified Pro checklist</h2>
          <div className="space-y-4">
            {CHECKLIST.map((item, i) => (
              <div
                key={item.title}
                className="flex items-start gap-4 bg-surface border border-line rounded-xl p-5"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-success/15 border border-success/30 text-success font-mono text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold text-success mb-1">{item.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-subtle text-sm mt-5 leading-relaxed">
            Your profile shows live progress against this checklist, so you always know what you still owe.
            Until every item is met, your profile shows honest progress — never a Verified Pro badge you
            haven&apos;t earned.
          </p>
        </section>

        {/* Honesty note */}
        <section className="mb-14 bg-success/[0.06] border border-success/25 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-success mb-3">What Verified Pro is — and isn&apos;t</h2>
          <p className="text-body mb-3 leading-relaxed">
            Verified Pro is a recognition signal that bundles the things clients care about into one clear
            checklist. It reflects standing earned through quality work.
          </p>
          <p className="text-muted text-sm leading-relaxed">
            It is not a license or proof of how a job will turn out. It can help a worker earn visibility and
            trust, but clients should still confirm licensing requirements for their own project and location.
            Account verification means email verification.
          </p>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-success/20 to-info/20 border border-success/40 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-success mb-3">Start working toward it</h3>
          <p className="text-body mb-6">
            Track your progress from your profile and earn the badge by doing great work.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/profile"
              className="inline-block bg-success hover:bg-success text-on-status font-bold px-6 py-3 rounded-lg transition-colors"
            >
              See your progress
            </Link>
            <Link
              href="/code-of-craft"
              className="inline-block border border-success/40 hover:border-success text-success font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Read the Code of Craft
            </Link>
            <Link
              href="/standards"
              className="inline-block border border-success/40 hover:border-success text-success font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Work standards &amp; checklists
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
