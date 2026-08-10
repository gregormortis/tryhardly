import type { Metadata } from 'next';
import Link from 'next/link';
import { FaqSchema, BreadcrumbSchema } from '@/components/StructuredData';

export const metadata: Metadata = {
  title: 'Trust & Safety',
  description:
    'How TryHardly verifies workers, how payments are protected, and exactly what we do and do not check. Email verification and Stripe Identity ID checks are required before any worker can be paid.',
  alternates: { canonical: '/trust' },
  openGraph: {
    title: 'Trust & Safety · TryHardly',
    description:
      'How TryHardly verifies workers and protects payments — stated plainly, including what we do not check.',
    url: '/trust',
  },
};

// Every claim on this page must describe something the platform actually
// enforces in code today. The "What we do not do" section is deliberate: in
// October 2025 the Vermont Attorney General fined Angi $100,000 and banned its
// "Certified Pros" label for implying a screening standard that did not exist.
// Under-claiming is free; over-claiming is a regulatory and reputational risk.

const CHECKS = [
  {
    title: 'Email verification',
    status: 'Required',
    body: 'Every new account must confirm its email address through a single-use link before it can post a job or bid on one. It is a low bar on its own, but it blocks throwaway-address signups and gives every account a real contact route.',
  },
  {
    title: 'You pay your worker directly',
    status: 'How it works',
    body: 'TryHardly does not process payments and takes no cut. You and your worker agree an amount here and settle it directly \u2014 cash, Venmo, Zelle, check, whatever suits you both. Agree the amount and the method before the work starts, and keep that conversation on TryHardly so there is a record of it.',
  },
  {
    title: 'Licenses and credentials',
    status: 'Verified when claimed',
    body: 'Workers can add professional licenses and certifications to their profile. Where a credential can be checked against a public registry, we check it and show the issuing body and expiry date. A profile with no badge simply has not claimed one.',
  },
  {
    title: 'Reviews',
    status: 'Completed jobs only',
    body: 'A review can only be written by someone who actually completed a job with you on TryHardly. Reviews are never imported from other platforms, never purchased, and never written by us.',
  },
  {
    title: 'A record that follows people',
    status: 'The main protection',
    body: 'Every completed job, rating, and report stays attached to the account that earned it. A worker who does good work builds something worth keeping. A worker who does not, cannot walk away from it and reappear clean. That record is what TryHardly actually offers.',
  },
  {
    title: 'Reporting',
    status: 'On every profile and job',
    body: 'Every worker profile and every job listing has a report link. Reports go straight to a human, and we read all of them. Repeated problems get accounts removed.',
  },
];

const NOT_DONE = [
  'We do not process payments, so we cannot refund, reverse, chargeback, or guarantee any payment between you and a worker. This is the most important limit on this page.',
  'We do not run criminal background checks. When we start, we will name the vendor and say exactly what is searched.',
  'We do not verify government ID. Accounts are verified by email address only.',
  'We do not carry insurance covering property damage or injury. Workers are independent contractors responsible for their own coverage.',
  'We do not employ, supervise, train, or dispatch workers. TryHardly is an introduction service, not the service provider.',
  'We do not guarantee the quality of any individual job. What we do is keep an honest record of how each one went.',
];

const FAQS = [
  {
    q: 'Does TryHardly handle the payment?',
    a: 'No. You pay your worker directly, however you both agree \u2014 cash, Venmo, Zelle, check. TryHardly takes no cut and never touches the money, which also means we cannot refund or reverse it. Agree the amount and the payment method before the work starts.',
  },
  {
    q: 'Then what am I actually getting from TryHardly?',
    a: 'Local workers who show up, with a visible record of the jobs they have done and how those went. Finding someone reliable is the hard part of getting yard work or hauling done, and that is the part we do. We are not a payment service and we do not pretend to be one.',
  },
  {
    q: 'Is every worker on TryHardly ID-verified?',
    a: 'No. Accounts are verified by email address only. We verify professional credentials where a public registry exists, and we show ratings and completed-job history on every profile, but we do not check government ID and we will not imply that we do.',
  },
  {
    q: 'Do you run criminal background checks?',
    a: 'Not today. We would rather say so plainly than imply a standard we do not meet. Read the worker\u2019s reviews and completed-job history, and ask for references on larger jobs.',
  },
  {
    q: 'What happens if something goes wrong on a job?',
    a: 'Email support@tryhardly.com. We respond within one business day and we read both sides. We cannot move money, so we cannot refund you \u2014 but the outcome is recorded against the account, and accounts with repeated problems are removed. Keeping your messages and your agreement on TryHardly gives us something to look at.',
  },
  {
    q: 'How do I protect myself on a bigger job?',
    a: 'Agree the price in writing here before anything starts. Pay in a way that leaves a record rather than untraceable cash. For larger work, split payment so part of it lands after you have seen the finished result. Ask for proof of licensing and insurance where the job calls for it.',
  },
];

export default function TrustPage() {
  return (
    <div className="bg-canvas min-h-screen">
      <FaqSchema items={FAQS} />
      <BreadcrumbSchema trail={[{ name: 'Trust & Safety', path: '/trust' }]} />

      <section className="border-b border-line px-4 sm:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-bold text-3xl sm:text-4xl text-strong tracking-tight mb-4">
            Trust &amp; safety
          </h1>
          <p className="text-muted leading-relaxed">
            You are letting someone you have not met come to your home. That deserves a straight
            answer about what we check, how your money is handled, and what we do not do. All of it
            is on this page, including the gaps.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-bold text-xl text-strong tracking-tight mb-6">What we check</h2>
          <div className="space-y-5">
            {CHECKS.map((c) => (
              <div
                key={c.title}
                className="rounded-lg border border-line bg-surface p-5"
              >
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-base font-semibold text-strong">{c.title}</h3>
                  <span className="font-mono text-[12px] uppercase tracking-wider text-accent-text-hover bg-accent/10 border border-accent/30 rounded px-2 py-0.5">
                    {c.status}
                  </span>
                </div>
                <p className="text-sm text-muted leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12 border-t border-line">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-bold text-xl text-strong tracking-tight mb-3">
            What we do not do
          </h2>
          <p className="text-sm text-subtle leading-relaxed mb-5">
            Plenty of platforms are vague here. We would rather you know the limits before you book
            than find out afterwards.
          </p>
          <ul className="space-y-3">
            {NOT_DONE.map((n) => (
              <li key={n} className="flex items-start gap-3 text-sm text-muted leading-relaxed">
                <span className="text-subtle mt-0.5 shrink-0">—</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12 border-t border-line">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-bold text-xl text-strong tracking-tight mb-6">
            Common questions
          </h2>
          <div className="space-y-6">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-sm font-semibold text-body mb-1.5">{f.q}</h3>
                <p className="text-sm text-muted leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12 border-t border-line">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-bold text-xl text-strong tracking-tight mb-3">
            Something feels wrong?
          </h2>
          <p className="text-sm text-muted leading-relaxed mb-5">
            Email{' '}
            <a href="mailto:support@tryhardly.com" className="text-accent-text hover:text-accent-text-hover">
              support@tryhardly.com
            </a>
            . A human reads every message and we reply within one business day. If you are in
            immediate danger, call 911 first.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/community-guidelines"
              className="font-mono text-[12px] tracking-widest px-4 py-2.5 border border-line text-body rounded hover:border-accent/40 hover:text-accent-text transition-colors"
            >
              COMMUNITY GUIDELINES
            </Link>
            <Link
              href="/prohibited-services"
              className="font-mono text-[12px] tracking-widest px-4 py-2.5 border border-line text-body rounded hover:border-accent/40 hover:text-accent-text transition-colors"
            >
              PROHIBITED SERVICES
            </Link>
            <Link
              href="/refunds"
              className="font-mono text-[12px] tracking-widest px-4 py-2.5 border border-line text-body rounded hover:border-accent/40 hover:text-accent-text transition-colors"
            >
              REFUNDS &amp; DISPUTES
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
