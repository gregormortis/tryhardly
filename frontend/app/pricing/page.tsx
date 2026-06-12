import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — free to post, flat 12% for workers',
  description: 'Posting a job is free. Workers pay a flat 12% marketplace fee only on completed paid jobs. No tiers, no hidden fees, no subscriptions.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-950 py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">
            Simple, fair pricing
          </h1>
          <p className="text-xl text-gray-300">
            Free to post. Workers pay a flat <span className="font-semibold text-white">12% marketplace fee</span> only on completed paid jobs.
          </p>
        </div>

        {/* Posters explainer */}
        <div className="mb-14 max-w-4xl mx-auto bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/30 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🏠</span>
            <h2 className="text-2xl font-bold text-amber-400">For job posters</h2>
          </div>
          <p className="text-gray-200 mb-4">
            Posting a job on TryHardly is <span className="font-semibold text-white">free</span>. You only pay the reward you agreed with the worker — nothing more, no hidden fees.
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span><span className="font-semibold text-white">Free to post</span> — describe the job and your budget</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Your payment method is authorized at booking, and the agreed charge is captured for completed work under platform rules.</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Marketplace payouts are initiated after payment capture for completed tasks.</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>The 12% marketplace fee applies to <span className="font-semibold text-white">workers</span>, not posters</span></li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/post-quest" className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold px-5 py-2.5 text-sm transition-colors">
              Post a job — free
            </a>
            <a href="/questboard" className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 hover:border-amber-400 text-amber-300 px-5 py-2.5 text-sm font-semibold transition-colors">
              Browse jobs
            </a>
          </div>
        </div>

        {/* Single flat-fee worker card */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-amber-400 mb-2">For workers</h2>
          <p className="text-gray-400">One flat fee. No tiers, no surprises — you keep the same share at every rank.</p>
        </div>

        <div className="max-w-md mx-auto mb-16">
          <div className="bg-gradient-to-b from-amber-900/20 to-gray-900/50 border-2 border-amber-500 rounded-lg p-8 text-center">
            <div className="text-4xl mb-4">⚒️</div>
            <h3 className="text-2xl font-bold text-amber-400 mb-2">Flat marketplace fee</h3>
            <div className="text-5xl font-bold text-white mb-2">12%</div>
            <p className="text-gray-400 mb-6">on completed paid jobs</p>
            <ul className="space-y-3 mb-8 text-left">
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Free to join and free to apply to quests</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">The fee is charged only when a paid job is completed</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Same 12% whether you&apos;re Novice or Legendary</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">No subscriptions, no listing fees, no hidden charges</span>
              </li>
            </ul>
            <a href="/auth/register" className="block w-full bg-amber-600 hover:bg-amber-700 text-black text-center py-3 rounded-lg font-bold transition-colors">
              Start free
            </a>
          </div>
        </div>

        {/* Ranks earn trust, not discounts */}
        <div className="max-w-4xl mx-auto mb-16 bg-gray-900/50 border border-gray-800 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🛡️</span>
            <h2 className="text-2xl font-bold text-amber-400">What do ranks get you?</h2>
          </div>
          <p className="text-gray-300 mb-4">
            Ranks aren&apos;t a discount on the fee — they&apos;re a trust signal. As you complete jobs well, earn good
            ratings, and contribute to your guild, you climb from <span className="text-white font-semibold">Novice</span> to{' '}
            <span className="text-white font-semibold">Legendary</span>, unlocking visibility and access — not a lower cut.
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
            <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">★</span><span>Higher ranks rank better in search and worker matching</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">★</span><span>Skill badges (Bronze → Platinum) show proven, rated expertise</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">★</span><span>Expert &amp; Legendary unlock guild leadership perks and invites</span></li>
            <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">★</span><span>Trusted ranks build client confidence and repeat hires</span></li>
          </ul>
          <a href="/progression" className="inline-block mt-5 text-amber-400 hover:text-amber-300 font-semibold text-sm">
            See how ranks &amp; skill badges work →
          </a>
        </div>

        {/* How payments work */}
        <div className="max-w-4xl mx-auto mb-16 bg-gray-900/50 border border-gray-800 rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">💳</span>
            <h2 className="text-2xl font-bold text-amber-400">How payments work</h2>
          </div>
          <p className="text-gray-300 mb-4">
            TryHardly is a marketplace facilitator that connects people who need local help with workers who can do
            it. <span className="font-semibold text-white">We are not the service provider</span>, and we are not a
            bank or money transmitter. All payments are processed directly by{' '}
            <span className="font-semibold text-white">Stripe</span>, and worker payouts are handled through{' '}
            <span className="font-semibold text-white">Stripe Connect</span> after completed-task payment capture.
            At booking, your payment method is authorized for the quoted amount — an authorization is
            not a final charge and may appear as a temporary pending transaction. The charge is captured
            when the task is completed; if a booking is canceled, the authorization is voided and you are
            not charged.
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-gray-300">
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Job posting is <span className="font-semibold text-white">free</span> for customers</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>TryHardly takes a flat <span className="font-semibold text-white">12% platform service fee</span> from worker payouts on completed paid jobs</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Payments are processed by <span className="font-semibold text-white">Stripe</span>; payouts use <span className="font-semibold text-white">Stripe Connect</span></span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>Payouts are initiated <span className="font-semibold text-white">after payment capture for completed tasks</span></span></li>
          </ul>
          <p className="text-gray-400 text-sm mt-4">
            See our{' '}
            <a href="/terms" className="text-amber-400 hover:text-amber-300">Terms of Service</a> and{' '}
            <a href="/refunds" className="text-amber-400 hover:text-amber-300">Refund &amp; Dispute Policy</a> for full details.
          </p>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-amber-400">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">How does the marketplace fee work?</h3>
              <p className="text-gray-300">We take a flat 12% only when you complete a paid job. No advance fees, no monthly subscriptions. You only pay when you earn.</p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">Do higher ranks pay a lower fee?</h3>
              <p className="text-gray-300">No. The fee is a flat 12% at every rank. Ranks reward trust, visibility, and access — like skill badges and guild leadership — not a cheaper cut.</p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">Are there any hidden fees?</h3>
              <p className="text-gray-300">Nope! The flat 12% platform service fee is the only fee TryHardly charges. Payments are processed securely by Stripe, and you get paid when quests are completed.</p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">How and when do I get paid?</h3>
              <p className="text-gray-300">Worker payouts are processed through Stripe Connect after completed-task payment capture. TryHardly is a marketplace facilitator — we connect customers and workers, we are not the service provider, and we are not a bank or money transmitter. All payments are processed directly by Stripe.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
