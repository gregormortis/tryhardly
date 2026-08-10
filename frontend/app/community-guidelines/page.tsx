import type { Metadata } from 'next';
import Link from 'next/link';

const LAST_UPDATED = 'May 30, 2026';
const SUPPORT_EMAIL = 'support@tryhardly.com';

export const metadata: Metadata = {
  title: 'Community Guidelines',
  description:
    'The rules that keep TryHardly safe and fair for everyone — job posters and workers. Plain-language community standards for our local services marketplace.',
  alternates: { canonical: '/community-guidelines' },
};

export default function CommunityGuidelinesPage() {
  return (
    <div className="min-h-screen bg-canvas py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-8 text-strong">
          Community Guidelines
        </h1>
        <div className="text-body space-y-6 leading-relaxed">
          <p className="text-sm text-muted">Last Updated: {LAST_UPDATED}</p>

          <p>
            TryHardly only works if people trust each other. These guidelines apply to
            everyone — job posters posting work requests and workers doing the work. Breaking them
            can lead to content removal, warnings, or account suspension. They work alongside
            our{' '}
            <Link href="/terms" className="text-accent-text hover:text-accent-text-hover">
              Terms of Service
            </Link>
            .
          </p>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">Be honest</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Describe jobs accurately — real scope, real budget, real timeline.</li>
              <li>Only claim skills and experience you actually have.</li>
              <li>Don&apos;t post fake reviews, fake job posts, or misleading listings.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">Be respectful</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>No harassment, hate speech, threats, or discrimination of any kind.</li>
              <li>Keep communication professional, even when there&apos;s a disagreement.</li>
              <li>Respect people&apos;s privacy — don&apos;t share someone&apos;s personal information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">Be safe</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Meet in safe locations and trust your instincts for in-person work.</li>
              <li>Don&apos;t ask anyone to do anything illegal, dangerous, or against local regulations.</li>
              <li>Report unsafe behavior using the report button or by emailing us.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">Keep it on-platform</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Handle agreements and, when available, payments through TryHardly so you&apos;re protected.</li>
              <li>Don&apos;t use the platform to spam, advertise unrelated services, or recruit users off-platform to avoid fees.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">Prohibited work</h2>
            <p className="mb-2">Job posts must not involve:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Illegal, unsafe, regulated, or policy-restricted goods or services.</li>
              <li>Anything that puts a worker&apos;s safety or legal standing at risk.</li>
            </ul>
            <p className="mt-2">
              Our{' '}
              <Link href="/prohibited-services" className="text-accent-text hover:text-accent-text-hover">
                Prohibited Services Policy
              </Link>{' '}
              lists what&apos;s allowed and what isn&apos;t in detail.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-accent-text mb-4">Reporting &amp; enforcement</h2>
            <p>
              If you see something that breaks these guidelines, use the in-app report option
              or email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent-text hover:text-accent-text-hover">
                {SUPPORT_EMAIL}
              </a>
              . We review reports and may remove content or restrict accounts. Serious or
              repeated violations can lead to a permanent ban. We may notify law enforcement
              when there is a risk to someone&apos;s safety.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
