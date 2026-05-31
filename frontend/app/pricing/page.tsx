import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — free to post, fair commission for workers',
  description: 'Posting a job is free. Workers pay a small commission only when work is completed. No hidden fees, no subscriptions.',
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
            Free to post. Workers pay a small commission only when a job is completed.
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
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span><span className="font-semibold text-white">Pay only the agreed reward</span> when work is done</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span><span className="font-semibold text-white">Marketplace payouts</span> — paid after the work is completed</span></li>
            <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span>The commission rates below apply to <span className="font-semibold text-white">workers</span>, not posters</span></li>
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

        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-amber-400 mb-2">For workers</h2>
          <p className="text-gray-400">Commission only when you complete a quest. Lower rates as you level up.</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Free Tier - Novice */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-8">
            <div className="text-4xl mb-4">⚔️</div>
            <h3 className="text-2xl font-bold text-amber-400 mb-2">Novice Adventurer</h3>
            <div className="text-4xl font-bold text-white mb-6">15%<span className="text-lg text-gray-400">/quest</span></div>
            <p className="text-gray-400 mb-6">Perfect for starting your journey</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Access all quests</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Basic profile</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Level 1-20 progression</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Join public guilds</span>
              </li>
            </ul>
            <a href="/auth/register" className="block w-full bg-gray-800 hover:bg-gray-700 text-center py-3 rounded-lg font-bold transition-colors">
              Start Free
            </a>
          </div>

          {/* Mid Tier - Journeyman */}
          <div className="bg-gradient-to-b from-amber-900/20 to-gray-900/50 border-2 border-amber-500 rounded-lg p-8 relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-amber-500 text-black px-4 py-1 rounded-full text-sm font-bold">
              Most Popular
            </div>
            <div className="text-4xl mb-4">⭐</div>
            <h3 className="text-2xl font-bold text-amber-400 mb-2">Journeyman Hero</h3>
            <div className="text-4xl font-bold text-white mb-6">10%<span className="text-lg text-gray-400">/quest</span></div>
            <p className="text-gray-400 mb-6">Unlock after Level 21</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Everything in Novice</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Premium profile badge</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Create your own guild</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Priority quest listing</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Advanced analytics</span>
              </li>
            </ul>
            <a href="/auth/register" className="block w-full bg-amber-600 hover:bg-amber-700 text-black text-center py-3 rounded-lg font-bold transition-colors">
              Level Up
            </a>
          </div>

          {/* Top Tier - Legendary */}
          <div className="bg-gray-900/50 border border-purple-500 rounded-lg p-8">
            <div className="text-4xl mb-4">👑</div>
            <h3 className="text-2xl font-bold text-purple-400 mb-2">Legendary Hero</h3>
            <div className="text-4xl font-bold text-white mb-6">5%<span className="text-lg text-gray-400">/quest</span></div>
            <p className="text-gray-400 mb-6">Unlock after Level 76</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Everything in Journeyman</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Legendary profile badge</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Featured on homepage</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Private quest invites</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Dedicated support</span>
              </li>
            </ul>
            <a href="/auth/register" className="block w-full bg-purple-600 hover:bg-purple-700 text-white text-center py-3 rounded-lg font-bold transition-colors">
              Go Legendary
            </a>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-amber-400">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">How do commission rates work?</h3>
              <p className="text-gray-300">We only take a small percentage when you complete a quest. No upfront fees, no monthly subscriptions. You only pay when you earn.</p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">How do I level up?</h3>
              <p className="text-gray-300">Complete quests to earn XP. As you gain experience, you&apos;ll level up your adventurer class and unlock lower commission rates automatically.</p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-bold text-white mb-2">Are there any hidden fees?</h3>
              <p className="text-gray-300">Nope! The commission rate is the only fee. Payment processing is handled securely, and you get paid directly when quests are completed.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
