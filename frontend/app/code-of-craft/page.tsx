import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'The Code of Craft — professional standards on TryHardly',
  description:
    'The Code of Craft is the professional standard every TryHardly worker can pledge to: show up, communicate clearly, protect property, document the work, honor the agreed scope, clean up, respect people, and resolve issues professionally.',
};

const PRINCIPLES = [
  {
    icon: '🕒',
    title: 'Show up',
    body:
      'Arrive on time, or give as much notice as you can if plans change. A job starts with being reliable — clients are trusting you with their time and their property.',
  },
  {
    icon: '💬',
    title: 'Communicate clearly',
    body:
      'Confirm the work, the timeline, and the price before you start. Answer messages, flag surprises early, and never leave a client guessing where things stand.',
  },
  {
    icon: '🛡️',
    title: 'Protect property',
    body:
      'Treat a client’s home, tools, and belongings with care. Take reasonable precautions, and tell the client right away if something is damaged.',
  },
  {
    icon: '📋',
    title: 'Document the work',
    body:
      'Keep simple before/after notes or photos of what you did. Honest documentation protects both sides and builds a record clients can trust.',
  },
  {
    icon: '🤝',
    title: 'Honor the agreed scope',
    body:
      'Do what you agreed to do. If the job grows, pause and agree on the change with the client before continuing — no surprise add-ons.',
  },
  {
    icon: '🧹',
    title: 'Clean up',
    body:
      'Leave the site at least as tidy as you found it. Haul away your debris and return tools and spaces to order before you call a job done.',
  },
  {
    icon: '🫱',
    title: 'Respect people',
    body:
      'Be courteous and professional with clients, their families, and anyone else on site. No harassment, discrimination, or unsafe behavior — ever.',
  },
  {
    icon: '⚖️',
    title: 'Resolve issues professionally',
    body:
      'If something goes wrong, work it out calmly and in good faith. Make it right where you reasonably can, and use the platform’s tools rather than walking away.',
  },
];

export default function CodeOfCraftPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-300">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:py-20">
        {/* Hero */}
        <div className="text-center mb-14">
          <p className="font-mono text-xs uppercase tracking-widest text-amber-400 mb-3">
            Professional standards
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">
            The Code of Craft
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            TryHardly is built on trust between real people doing real work. The Code of Craft is the
            standard every worker can pledge to uphold. It is a promise about{' '}
            <span className="text-white font-semibold">how</span> you work — not a fee, a discount, or a
            ranking you can buy.
          </p>
        </div>

        {/* Principles */}
        <section className="mb-14">
          <div className="grid sm:grid-cols-2 gap-4">
            {PRINCIPLES.map((p) => (
              <div
                key={p.title}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl leading-none mt-0.5" aria-hidden>
                    {p.icon}
                  </span>
                  <div>
                    <h2 className="text-lg font-bold text-amber-200 mb-1.5">{p.title}</h2>
                    <p className="text-sm text-gray-400 leading-relaxed">{p.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What pledging means */}
        <section className="mb-14 bg-amber-500/[0.06] border border-amber-500/25 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-amber-300 mb-3">What it means to pledge</h2>
          <p className="text-gray-300 mb-3 leading-relaxed">
            Any logged-in worker can pledge to the Code of Craft from their profile. When you pledge, your
            public profile shows a <span className="text-white font-semibold">“Code of Craft pledged”</span>{' '}
            badge so clients can see you have committed to these standards.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            The pledge is honest in both directions: it appears only when you have actually pledged, and you
            can withdraw it at any time. It is a personal commitment, not a verification or a guarantee by
            TryHardly — verified credentials and Verified Pro status cover that side of trust.
          </p>
        </section>

        {/* How it fits */}
        <section className="mb-14">
          <h2 className="text-2xl font-bold text-amber-400 mb-3">How it fits with the rest of TryHardly</h2>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>
                <Link href="/progression" className="text-amber-400 hover:underline">
                  Ranks &amp; progression
                </Link>{' '}
                reward consistent, high-quality work — never a lower fee.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>
                <Link href="/verified-pro" className="text-amber-400 hover:underline">
                  Verified Pro
                </Link>{' '}
                builds on the pledge with verified credentials and a real track record.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>
                A proof-of-work gallery lets you show honest photos of past work on your profile.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>
                <Link href="/standards" className="text-amber-400 hover:underline">
                  Work standards &amp; trade checklists
                </Link>{' '}
                turn these principles into a practical, job-by-job guide.
              </span>
            </li>
          </ul>
        </section>

        {/* CTA */}
        <div className="bg-gradient-to-r from-amber-900/20 to-purple-900/20 border border-amber-500/40 rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-amber-400 mb-3">Take the pledge</h3>
          <p className="text-gray-300 mb-6">
            Free to join. Pledge to the Code of Craft from your profile and let your work speak for itself.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/profile"
              className="inline-block bg-amber-600 hover:bg-amber-700 text-black font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Pledge from your profile
            </Link>
            <Link
              href="/verified-pro"
              className="inline-block border border-amber-500/40 hover:border-amber-400 text-amber-300 font-bold px-6 py-3 rounded-lg transition-colors"
            >
              Learn about Verified Pro
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
