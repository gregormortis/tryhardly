import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — free to post, flat 12% for workers',
  description: 'Posting a job is free. Workers pay a flat 12% marketplace fee only on completed paid jobs. No tiers, no hidden fees, no subscriptions.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-canvas py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6 text-strong">
            Simple, fair pricing
          </h1>
          <p className="text-xl text-body">
            Free to post. Workers pay a flat <span className="font-semibold text-strong">12% marketplace fee</span> only on completed paid jobs.
          </p>
        </div>

        {/* Posters explainer */}
        <div className="mb-14 max-w-4xl mx-auto bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🏠</span>
            <h2 className="text-2xl font-bold text-accent-text">For job posters</h2>
          </div>
          <p className="text-body mb-4">
            Posting a job on TryHardly is <span className="font-semibold text-strong">free</span>. Your payment method is authorized at booking, and the agreed charge is captured for completed work under platform rules — nothing more, no hidden fees.
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-body">
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span><span className="font-semibold text-strong">Free to post</span> — describe the job and your budget</span></li>
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>Your payment method is authorized at booking, and the agreed charge is captured for completed work under platform rules.</span></li>
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>Marketplace payouts are initiated after payment capture for completed tasks.</span></li>
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>The 12% marketplace fee applies to <span className="font-semibold text-strong">workers</span>, not posters</span></li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/post-a-job" className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent text-on-accent font-semibold px-5 py-2.5 text-sm transition-colors">
              Post a job — free
            </a>
            <a href="/jobs" className="inline-flex items-center gap-2 rounded-lg border border-accent/40 hover:border-accent text-accent-text-hover px-5 py-2.5 text-sm font-semibold transition-colors">
              Browse jobs
            </a>
          </div>
        </div>

        {/* Single flat-fee worker card */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-accent-text mb-2">For workers</h2>
          <p className="text-muted">One flat fee. No tiers, no surprises — you keep the same share however long you&apos;ve been working.</p>
        </div>

        <div className="max-w-md mx-auto mb-16">
          <div className="bg-gradient-to-b from-accent/20/20 to-surface/50 border-2 border-accent rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">⚒️</div>
            <h3 className="text-2xl font-bold text-accent-text mb-2">Flat marketplace fee</h3>
            <div className="text-5xl font-bold text-strong mb-2">12%</div>
            <p className="text-muted mb-6">on completed paid jobs</p>
            <ul className="space-y-3 mb-8 text-left">
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span className="text-body">Free to join and free to apply to jobs</span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span className="text-body">The fee is charged only when a paid job is completed</span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span className="text-body">Same 12% on your first job and your five hundredth</span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span className="text-body">No subscriptions, no listing fees, no hidden charges</span>
              </li>
            </ul>
            <a href="/auth/register" className="block w-full bg-accent hover:bg-accent text-on-accent text-center py-3 rounded-lg font-bold transition-colors">
              Start free
            </a>
          </div>
        </div>

        {/* Reputation earns trust, not discounts */}
        <div className="max-w-4xl mx-auto mb-16 bg-surface border border-line rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🛡️</span>
            <h2 className="text-2xl font-bold text-accent-text">What does a strong rating get you?</h2>
          </div>
          <p className="text-body mb-4">
            Ratings and badges aren&apos;t a discount on the fee — they&apos;re a trust signal. As you complete jobs
            well, earn good reviews, and add verified credentials, you move up the
            <span className="text-strong font-semibold"> experience levels</span>, unlocking visibility and access
            — not a lower cut.
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-body">
            <li className="flex items-start gap-2"><span className="text-accent-text mt-0.5">★</span><span>Well-rated workers rank better in search and worker matching</span></li>
            <li className="flex items-start gap-2"><span className="text-accent-text mt-0.5">★</span><span>Skill badges show proven, rated expertise, skill by skill</span></li>
            <li className="flex items-start gap-2"><span className="text-accent-text mt-0.5">★</span><span>Verified credentials and a clean record open more skilled work</span></li>
            <li className="flex items-start gap-2"><span className="text-accent-text mt-0.5">★</span><span>A strong review history builds client confidence and repeat hires</span></li>
          </ul>
        </div>

        {/* How payments work */}
        <div className="max-w-4xl mx-auto mb-16 bg-surface border border-line rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">💳</span>
            <h2 className="text-2xl font-bold text-accent-text">How payments work</h2>
          </div>
          <p className="text-body mb-4">
            TryHardly is a marketplace facilitator that connects people who need local help with workers who can do
            it. <span className="font-semibold text-strong">We are not the service provider</span>, and we are not a
            bank or money transmitter. All payments are processed directly by{' '}
            <span className="font-semibold text-strong">Stripe</span>, and worker payouts are handled through{' '}
            <span className="font-semibold text-strong">Stripe Connect</span> after completed-task payment capture.
            At booking, your payment method is authorized for the quoted amount — an authorization is
            not a final charge and may appear as a temporary pending transaction. The charge is captured
            when the task is completed; if a booking is canceled, the authorization is voided and you are
            not charged.
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-body">
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>Job posting is <span className="font-semibold text-strong">free</span> for customers</span></li>
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>TryHardly takes a flat <span className="font-semibold text-strong">12% platform service fee</span> from worker payouts on completed paid jobs</span></li>
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>Payments are processed by <span className="font-semibold text-strong">Stripe</span>; payouts use <span className="font-semibold text-strong">Stripe Connect</span></span></li>
            <li className="flex items-start gap-2"><span className="text-success mt-0.5">✓</span><span>Payouts are initiated <span className="font-semibold text-strong">after payment capture for completed tasks</span></span></li>
          </ul>
          <p className="text-muted text-sm mt-4">
            See our{' '}
            <a href="/terms" className="text-accent-text hover:text-accent-text-hover">Terms of Service</a> and{' '}
            <a href="/refunds" className="text-accent-text hover:text-accent-text-hover">Refund &amp; Dispute Policy</a> for full details.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-accent-text">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-surface p-6 rounded-lg border border-line">
              <h3 className="text-xl font-bold text-strong mb-2">How does the marketplace fee work?</h3>
              <p className="text-body">We take a flat 12% only when you complete a paid job. No advance fees, no monthly subscriptions. You only pay when you earn.</p>
            </div>
            <div className="bg-surface p-6 rounded-lg border border-line">
              <h3 className="text-xl font-bold text-strong mb-2">Do highly rated workers pay a lower fee?</h3>
              <p className="text-body">No. The fee is a flat 12% for everyone. A strong rating history earns trust, visibility, and access — skill badges, verified credentials, more skilled work — not a cheaper cut.</p>
            </div>
            <div className="bg-surface p-6 rounded-lg border border-line">
              <h3 className="text-xl font-bold text-strong mb-2">Are there any hidden fees?</h3>
              <p className="text-body">Nope! The flat 12% platform service fee is the only fee TryHardly charges. Payments are processed securely by Stripe, and worker payouts are processed after completed-task payment capture through Stripe Connect.</p>
            </div>
            <div className="bg-surface p-6 rounded-lg border border-line">
              <h3 className="text-xl font-bold text-strong mb-2">How and when do I get paid?</h3>
              <p className="text-body">Worker payouts are processed through Stripe Connect after completed-task payment capture. TryHardly is a marketplace facilitator — we connect customers and workers, we are not the service provider, and we are not a bank or money transmitter. All payments are processed directly by Stripe.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
