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
    body: 'Every new account must confirm its email address through a single-use link before it can do anything that touches money. A worker cannot create a Stripe Connect payout account until that confirmation is complete. This blocks throwaway-address signups.',
  },
  {
    title: 'Government ID and selfie',
    status: 'Required before payout',
    body: 'Workers must pass Stripe Identity verification — a government-issued photo ID matched against a live selfie — before they can receive their first payout. This is handled by Stripe, not by us, and we never see or store the ID document itself.',
  },
  {
    title: 'Payment protection',
    status: 'Always on',
    body: 'Your payment method is authorized when you accept a bid, which is not a charge. The charge is captured only after you confirm the job is finished. Cancel before the work is done and the authorization is voided. No cash changes hands, and no one is paid for work that was not completed.',
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
    title: 'Reporting',
    status: 'On every profile and job',
    body: 'Every worker profile and every job listing has a report link. Reports go straight to a human. Anyone asking to be paid outside TryHardly should be reported — that is a policy violation and it voids every protection on this page.',
  },
];

const NOT_DONE = [
  'We do not currently run criminal background checks. When we start, we will name the vendor and say exactly what is searched.',
  'We do not carry insurance covering property damage or injury. Workers are independent contractors responsible for their own coverage.',
  'We do not employ, supervise, train, or dispatch workers. TryHardly is a marketplace facilitator, not the service provider.',
  'We do not guarantee the quality of any individual job. We do run a dispute process, and we do withhold capture until you confirm the work is done.',
];

const FAQS = [
  {
    q: 'Is every worker on TryHardly ID-verified?',
    a: 'Every worker who has been paid has passed Stripe Identity government ID and selfie verification, because that check gates the first payout. A brand-new worker who has not yet been paid may still be mid-verification.',
  },
  {
    q: 'Do you run criminal background checks?',
    a: 'Not today. We verify identity through Stripe Identity and we verify professional credentials where a public registry exists, but we do not currently run criminal background checks. We would rather say so plainly than imply a standard we do not meet.',
  },
  {
    q: 'What happens if something goes wrong on a job?',
    a: 'Email support@tryhardly.com within 14 days. We respond within one business day, review both sides, and can refund a captured charge or void an authorization that has not been captured. Because we do not capture payment until you confirm completion, most problems can be resolved before any money moves.',
  },
  {
    q: 'What if a worker asks me to pay them directly, in cash or by app?',
    a: 'Report it. Paying off-platform removes every protection described on this page — there is no authorization to void, no dispute process, and no record of the agreement. Circumventing platform payment is grounds for removal.',
  },
  {
    q: 'Does TryHardly hold my money?',
    a: 'No. TryHardly is not a bank and does not hold customer funds. All payments are processed by Stripe, and worker payouts run through Stripe Connect after a completed job is captured.',
  },
];

export default function TrustPage() {
  return (
    <div className="bg-zinc-950 min-h-screen">
      <FaqSchema items={FAQS} />
      <BreadcrumbSchema trail={[{ name: 'Trust & Safety', path: '/trust' }]} />

      <section className="border-b border-white/[0.06] px-4 sm:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-bold text-3xl sm:text-4xl text-stone-100 tracking-tight mb-4">
            Trust &amp; safety
          </h1>
          <p className="text-stone-400 leading-relaxed">
            You are letting someone you have not met come to your home. That deserves a straight
            answer about what we check, how your money is handled, and what we do not do. All of it
            is on this page, including the gaps.
          </p>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-bold text-xl text-stone-100 tracking-tight mb-6">What we check</h2>
          <div className="space-y-5">
            {CHECKS.map((c) => (
              <div
                key={c.title}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5"
              >
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h3 className="text-base font-semibold text-stone-100">{c.title}</h3>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-amber-300 bg-amber-400/10 border border-amber-500/30 rounded px-2 py-0.5">
                    {c.status}
                  </span>
                </div>
                <p className="text-sm text-stone-400 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-bold text-xl text-stone-100 tracking-tight mb-3">
            What we do not do
          </h2>
          <p className="text-sm text-stone-500 leading-relaxed mb-5">
            Plenty of platforms are vague here. We would rather you know the limits before you book
            than find out afterwards.
          </p>
          <ul className="space-y-3">
            {NOT_DONE.map((n) => (
              <li key={n} className="flex items-start gap-3 text-sm text-stone-400 leading-relaxed">
                <span className="text-stone-600 mt-0.5 shrink-0">—</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-bold text-xl text-stone-100 tracking-tight mb-6">
            Common questions
          </h2>
          <div className="space-y-6">
            {FAQS.map((f) => (
              <div key={f.q}>
                <h3 className="text-sm font-semibold text-stone-200 mb-1.5">{f.q}</h3>
                <p className="text-sm text-stone-400 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-8 py-12 border-t border-white/[0.05]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-bold text-xl text-stone-100 tracking-tight mb-3">
            Something feels wrong?
          </h2>
          <p className="text-sm text-stone-400 leading-relaxed mb-5">
            Email{' '}
            <a href="mailto:support@tryhardly.com" className="text-amber-400 hover:text-amber-300">
              support@tryhardly.com
            </a>
            . A human reads every message and we reply within one business day. If you are in
            immediate danger, call 911 first.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/community-guidelines"
              className="font-mono text-[11px] tracking-widest px-4 py-2.5 border border-white/[0.12] text-stone-300 rounded hover:border-amber-500/40 hover:text-amber-400 transition-colors"
            >
              COMMUNITY GUIDELINES
            </Link>
            <Link
              href="/prohibited-services"
              className="font-mono text-[11px] tracking-widest px-4 py-2.5 border border-white/[0.12] text-stone-300 rounded hover:border-amber-500/40 hover:text-amber-400 transition-colors"
            >
              PROHIBITED SERVICES
            </Link>
            <Link
              href="/refunds"
              className="font-mono text-[11px] tracking-widest px-4 py-2.5 border border-white/[0.12] text-stone-300 rounded hover:border-amber-500/40 hover:text-amber-400 transition-colors"
            >
              REFUNDS &amp; DISPUTES
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
