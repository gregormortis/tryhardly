export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-amber-400 via-orange-500 to-purple-600 bg-clip-text text-transparent">
            About Tryhardly
          </h1>
          <p className="text-xl text-gray-300 leading-relaxed">
            A marketplace for local, hands-on work. Post the job you need done, get bids from
            nearby workers, and pay through Stripe when the work is finished.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-amber-400">Our Mission</h2>
          <p className="text-lg text-gray-300 leading-relaxed mb-6">
            Hiring someone for yard work, hauling, moving help, a handyman job, cleaning, or an
            errand is harder than it should be. Listings go stale, quotes are hard to compare, and
            paying safely usually means cash and hope. We&apos;re building a straightforward
            alternative for Redding first, then the towns around it.
          </p>
          <p className="text-lg text-gray-300 leading-relaxed">
            Workers keep a public track record here. Reviews are tied to jobs that were actually
            completed and paid through the platform, so a good reputation is earned rather than
            claimed.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center text-amber-400">What Makes Us Different</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-bold mb-3 text-amber-400">Reputation you can check</h3>
              <p className="text-gray-300">
                Reviews and ratings come from completed, paid jobs. Every worker profile shows the
                work they&apos;ve finished, so you can judge them on their record instead of a pitch.
              </p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-bold mb-3 text-amber-400">Guilds</h3>
              <p className="text-gray-300">
                Worker-led teams. Join or start a guild to share standards, mentor newer workers, take on bigger jobs, and build a shared reputation.
              </p>
            </div>
            <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
              <h3 className="text-xl font-bold mb-3 text-amber-400">Stripe-powered payments</h3>
              <p className="text-gray-300">
                Card payments are handled by Stripe. The payment is authorized once the job poster
                chooses a worker, charged after the completed work is confirmed, and paid out to the
                worker through Stripe Connect.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Where we are Section */}
      <section className="py-16 px-4 bg-gray-900/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center text-amber-400">Where we are today</h2>
          <p className="text-center text-gray-400 max-w-2xl mx-auto mb-12">
            We&apos;re in early access. No inflated numbers — here&apos;s the honest picture as we build.
          </p>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-amber-400 mb-2">Redding-first</div>
              <div className="text-gray-400">Early access</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400 mb-2">Real local requests</div>
              <div className="text-gray-400">From your neighborhood</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400 mb-2">Human-reviewed</div>
              <div className="text-gray-400">Accounts &amp; job posts moderated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400 mb-2">Stripe Connect</div>
              <div className="text-gray-400">Payouts after completed-job capture</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-amber-400">Get started</h2>
          <p className="text-xl text-gray-300 mb-8">
            Join our early-access community in Redding and help shape a marketplace for real local work.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/auth/register"
              className="bg-amber-600 hover:bg-amber-700 text-black font-bold px-8 py-4 rounded-lg transition-colors"
            >
              Create an account
            </a>
            <a
              href="/questboard"
              className="bg-gray-800 hover:bg-gray-700 text-gray-100 font-bold px-8 py-4 rounded-lg transition-colors"
            >
              Browse local jobs
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
