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
        <Link href="/code-of-craft" className="text-amber-400 hover:underline">
          Code of Craft
        </Link>{' '}
        professional standards from your profile.
      </>
    ),
  },
  {
    title: 'Verify a credential (or hold account verification)',
    body: 'Add at least one verified credential — a license, insurance, certification, or similar — or hold TryHardly account verification where applicable.',
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
    body: 'No unresolved or serious disputes on your account.',
  },
];

export default function VerifiedProPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-14">
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-400 mb-3">
            Earned, not bought
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 bg-gradient-to-r from-emerald-400 via-amber-400 to-purple-600 bg-clip-text text-transparent">
            Verified Pro
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Verified Pro is a trust signal that says a worker has done the work to earn it. It is derived
            entirely from <span className="text-white font-semibold">real activity</span> — a complete
            profile, a Code of Craft pledge, a verified credential, completed jobs, strong reviews, and a
            clean record. You can&apos;t pay for it, and we never fake it.
          </p>
        </div>

        {/* Checklist */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-amber-400 mb-6">The Verified Pro checklist</h2>
          <div className="space-y-4">
            {CHECKLIST.map((item, i) => (
              <div
                key={item.title}
                className="flex items-start gap-4 bg-gray-900/50 border border-gray-800 rounded-xl p-5"
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-bold text-emerald-200 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-gray-500 text-sm mt-5 leading-relaxed">
            Your profile shows live progress against this checklist, so you always know what you still owe.
            Until every item is met, your profile shows honest progress — never a Verified Pro badge you
            haven&apos;t earned.
          </p>
        </section>

        {/* Honesty note */}
        <section className="mb-14 bg-emerald-500/[0.06] border border-emerald-500/25 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-emerald-300 mb-3">What Verified Pro is — and isn&apos;t</h2>
          <p className="text-gray-300 mb-3 leading-relaxed">
            Verified Pro is a recognition signal that bundles the things clients care about into one clear
            checklist. It reflects standing earned through quality work.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            It is not a legal guarantee, a license, or a fee change — the marketplace fee stays a flat 12% for
            everyone. Clients should still confirm licensing requirements for their own project and location.
            Account verification and credential verification mean TryHardly reviewed submitted details; they
            are not a warranty of outcomes.
          </p>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-emerald-900/20 to-purple-900/20 border border-emerald-500/40 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-emerald-300 mb-3">Start working toward it</h3>
          <p className="text-gray-300 mb-6">
            Track your progress from your profile and earn the badge by doing great work.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/profile"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-black font-bold px-6 py-3 rounded-lg transition-colors"
            >
              See your progress
            </Link>
            <Link
              href="/code-of-craft"
              className="inline-block border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Read the Code of Craft
            </Link>
            <Link
              href="/standards"
              className="inline-block border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Work standards &amp; checklists
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
