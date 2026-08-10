import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — free, and you pay your worker directly',
  description:
    'TryHardly is free to post and free to work. You and your worker settle payment directly, and the worker keeps 100% of it. No marketplace fee, no cut.',
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-canvas py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-6 text-strong">Free. Actually free.</h1>
          <p className="text-xl text-body max-w-2xl mx-auto">
            TryHardly connects you with local workers. You settle up with them{' '}
            <span className="font-semibold text-strong">directly</span> — and they keep
            every dollar of it.
          </p>
        </div>

        {/* The whole model, stated once */}
        <div className="mb-14 max-w-4xl mx-auto bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/30 rounded-xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-accent-text mb-4">How it works</h2>
          <ol className="space-y-4 text-body">
            <li className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent text-sm font-bold">
                1
              </span>
              <span>
                <span className="font-semibold text-strong">Post the job free.</span> Describe
                what you need and roughly what you want to pay.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent text-sm font-bold">
                2
              </span>
              <span>
                <span className="font-semibold text-strong">Local workers respond.</span> You
                see their record, ratings, and past work, and pick who you want.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent text-sm font-bold">
                3
              </span>
              <span>
                <span className="font-semibold text-strong">
                  You pay them directly when the work is done.
                </span>{' '}
                Cash, Venmo, Zelle, check — whatever suits you both. TryHardly is not
                involved in the payment and takes no cut of it.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent text-sm font-bold">
                4
              </span>
              <span>
                <span className="font-semibold text-strong">Confirm it here afterward.</span>{' '}
                That is what builds the worker&apos;s record and helps the next person hire
                well.
              </span>
            </li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/post-a-job"
              className="inline-flex items-center gap-2 rounded-lg bg-accent hover:bg-accent text-on-accent font-semibold px-5 py-2.5 text-sm transition-colors"
            >
              Post a job — free
            </a>
            <a
              href="/jobs"
              className="inline-flex items-center gap-2 rounded-lg border border-accent/40 hover:border-accent text-accent-text-hover px-5 py-2.5 text-sm font-semibold transition-colors"
            >
              Browse jobs
            </a>
          </div>
        </div>

        {/* Two-sided cost summary */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
          <div className="bg-surface border border-line rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">🏠</div>
            <h3 className="text-xl font-bold text-accent-text mb-2">If you need work done</h3>
            <div className="text-5xl font-bold text-strong mb-1">$0</div>
            <p className="text-muted mb-6 text-sm">to post, browse, and hire</p>
            <ul className="space-y-3 text-left text-sm">
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span className="text-body">No posting fee and no booking fee</span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span className="text-body">
                  No markup — you pay the worker exactly what you agreed
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span className="text-body">
                  No card on file, because we never charge one
                </span>
              </li>
            </ul>
          </div>

          <div className="bg-surface border-2 border-accent rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">⚒️</div>
            <h3 className="text-xl font-bold text-accent-text mb-2">If you do the work</h3>
            <div className="text-5xl font-bold text-strong mb-1">100%</div>
            <p className="text-muted mb-6 text-sm">of what you charge is yours</p>
            <ul className="space-y-3 text-left text-sm">
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span className="text-body">Free to join and free to bid on jobs</span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span className="text-body">
                  No marketplace fee taken out of your pay
                </span>
              </li>
              <li className="flex items-start">
                <span className="text-success mr-2">✓</span>
                <span className="text-body">
                  No paying for leads that go nowhere
                </span>
              </li>
            </ul>
            <a
              href="/auth/register"
              className="mt-6 block w-full bg-accent hover:bg-accent text-on-accent text-center py-3 rounded-lg font-bold transition-colors"
            >
              Start free
            </a>
          </div>
        </div>

        {/* The part most platforms bury */}
        <div className="max-w-4xl mx-auto mb-16 bg-surface border border-line rounded-xl p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🤝</span>
            <h2 className="text-2xl font-bold text-accent-text">
              What we do and don&apos;t do
            </h2>
          </div>
          <p className="text-body mb-4">
            TryHardly introduces you to local workers and keeps the record of what happened
            — who did the job, what was agreed, how it went. That record is the product.
          </p>
          <p className="text-body mb-4">
            We do <span className="font-semibold text-strong">not</span> process the payment.
            That means we cannot refund it, reverse it, or guarantee it, and we would rather
            say so here than let you find out during a disagreement. What we can do is make
            sure a worker&apos;s history follows them, so someone who does good work keeps
            getting hired and someone who doesn&apos;t, doesn&apos;t.
          </p>
          <ul className="grid sm:grid-cols-2 gap-3 text-sm text-body">
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span>Agree the price and payment method before work starts</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span>Keep messages on TryHardly so there is a record</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span>Confirm the job here when it is finished</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">✓</span>
              <span>Leave an honest rating — it is what makes this work</span>
            </li>
          </ul>
          <p className="text-muted text-sm mt-4">
            See our{' '}
            <a href="/terms" className="text-accent-text hover:text-accent-text-hover">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/refunds" className="text-accent-text hover:text-accent-text-hover">
              Refund &amp; Dispute Policy
            </a>{' '}
            for the full detail.
          </p>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-accent-text">
            Frequently asked questions
          </h2>
          <div className="space-y-6">
            <div className="bg-surface p-6 rounded-lg border border-line">
              <h3 className="text-xl font-bold text-strong mb-2">
                So how does TryHardly make money?
              </h3>
              <p className="text-body">
                Right now, it doesn&apos;t. We are getting the first jobs done in Redding and
                would rather do that with nothing in the way. If we charge for anything
                later it will be a flat monthly fee for workers who want lead access — never
                a cut of your job, and never a charge for leads that go nowhere. Anyone
                already on the platform will hear about it from us well before it happens.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-lg border border-line">
              <h3 className="text-xl font-bold text-strong mb-2">
                Why don&apos;t you handle the payment?
              </h3>
              <p className="text-body">
                Handling payments for a marketplace means holding a payment processor
                relationship, verifying every worker&apos;s identity for payouts, and
                managing disputes over work we did not see. That is a real system, and it
                is worth building properly once there is enough work moving through to
                justify it. Doing it badly and early is worse than not doing it. For now,
                you pay your worker the way you would pay anyone else you hired locally.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-lg border border-line">
              <h3 className="text-xl font-bold text-strong mb-2">
                What if something goes wrong?
              </h3>
              <p className="text-body">
                Tell us. We cannot move money back, but we do read every report, and a
                worker&apos;s record here reflects how they actually behaved. Persistent
                problems get accounts removed. Keep your messages and agreement on the
                platform so there is something to look at.
              </p>
            </div>
            <div className="bg-surface p-6 rounded-lg border border-line">
              <h3 className="text-xl font-bold text-strong mb-2">
                Do highly rated workers get better treatment?
              </h3>
              <p className="text-body">
                Yes — better placement, more visibility, and access to more skilled work.
                Ratings, skill badges, and verified credentials are how you stand out. There
                is no fee to discount, so reputation is the whole currency here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
