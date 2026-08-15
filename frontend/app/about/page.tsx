import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'About TryHardly' },
  description: 'Learn how TryHardly connects Redding neighbors with local workers for hands-on jobs settled directly.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Hero Section */}
      <section className="relative py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 text-strong">
            About Tryhardly
          </h1>
          <p className="text-xl text-body leading-relaxed">
            A marketplace for local, hands-on work. Post the job you need done, get bids from
            nearby workers, and settle payment directly with the worker you choose.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-accent-text">Our Mission</h2>
          <p className="text-lg text-body leading-relaxed mb-6">
            Hiring someone for yard work, hauling, moving help, a handyman job, cleaning, or an
            errand is harder than it should be. Listings go stale, quotes are hard to compare, and
            paying safely usually means cash and hope. We&apos;re building a straightforward
            alternative for Redding first, then the towns around it.
          </p>
          <p className="text-lg text-body leading-relaxed">
            Workers keep a public track record here. Reviews are tied to jobs that were actually
            completed through TryHardly, so a good reputation is earned rather than claimed.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center text-accent-text">What Makes Us Different</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-surface p-6 rounded-lg border border-line">
              <h3 className="text-xl font-bold mb-3 text-accent-text">Reputation you can check</h3>
              <p className="text-body">
                Reviews and ratings come from completed jobs. Every worker profile shows the work
                they&apos;ve finished, so you can judge them on their record instead of a pitch.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-lg border border-line">
              <h3 className="text-xl font-bold mb-3 text-accent-text">Crews</h3>
              <p className="text-body">
                Worker-led teams. Team up with other local workers to take on bigger jobs, share standards, mentor newer workers, and build a shared reputation.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-lg border border-line">
              <h3 className="text-xl font-bold mb-3 text-accent-text">Direct payment, no cut</h3>
              <p className="text-body">
                You and the worker agree on payment directly: cash, Venmo, Zelle, check, or what
                works for both of you. Workers keep 100%. TryHardly does not process the payment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Where we are Section */}
      <section className="py-16 px-4 bg-surface">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center text-accent-text">Where we are today</h2>
          <p className="text-center text-muted max-w-2xl mx-auto mb-12">
            We&apos;re in early access. No inflated numbers — here&apos;s the honest picture as we build.
          </p>
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-accent-text mb-2">Redding-first</div>
              <div className="text-muted">Early access</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-info mb-2">Real local requests</div>
              <div className="text-muted">From your neighborhood</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-info mb-2">Human-reviewed</div>
              <div className="text-muted">Accounts &amp; job posts moderated</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success mb-2">Workers keep 100%</div>
              <div className="text-muted">No platform fee</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6 text-accent-text">Get started</h2>
          <p className="text-xl text-body mb-8">
            Join our early-access community in Redding and help shape a marketplace for real local work.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/auth/register"
              className="bg-accent hover:bg-accent text-on-accent font-bold px-8 py-4 rounded-lg transition-colors"
            >
              Create an account
            </a>
            <a
              href="/jobs"
              className="bg-raised hover:bg-raised-2 text-strong font-bold px-8 py-4 rounded-lg transition-colors"
            >
              Browse local jobs
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
