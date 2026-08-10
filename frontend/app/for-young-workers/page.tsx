import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, Shield, Sun } from 'lucide-react';

const title = 'Young workers (16–17): parent-owned household accounts';
const description =
  'Parents and guardians can create one TryHardly household account for their 16- and 17-year-old workers, approve every job, and help them build a real work record.';

const allowedWork = [
  'Yard work: walk-behind mowing, trimming, raking, and weeding',
  'Errands',
  'Other appropriate odd jobs that are outdoor and street-visible',
];

const prohibitedWork = [
  'Chainsaws, wood chippers, or log splitters',
  'Riding mowers — walk-behind mowers only',
  'Any work on or from a roof, including gutter cleaning',
  'Ladders and any work at height',
  'Trenching, digging out, or excavation',
  'Lifts, hoists, or boom equipment',
  'Driving as part of the job',
  'Demolition or tear-out work',
  'Working alone inside a customer’s home',
];

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/for-young-workers' },
  openGraph: {
    title: `${title} · TryHardly`,
    description,
    url: '/for-young-workers',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `${title} · TryHardly`,
    description,
  },
};

export default function YoungWorkersPage() {
  return (
    <div className="min-h-screen bg-canvas text-strong">
      <section className="border-b border-line">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
          <p className="mb-4 text-sm font-semibold text-accent-text">For young workers in Redding</p>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            A first job can start with a mower.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
            The minimum age is 16. Young workers can earn real money doing eligible outdoor work
            for neighbors. Each named young worker builds a record of completed jobs, ratings, and
            reliability they can point to later as a reference.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-subtle">
            A parent or guardian creates and owns the account. Young workers do not have separate
            accounts or logins.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-on-accent transition-colors hover:bg-accent"
            >
              Get started with a parent <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#the-rules"
              className="inline-flex items-center justify-center rounded-lg border border-line-strong bg-surface px-6 py-3 text-sm font-bold text-strong transition-colors hover:bg-raised"
            >
              Read the rules first
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-4xl gap-5 px-6 py-12 sm:grid-cols-2 sm:py-16">
        <article className="rounded-xl border border-line bg-raised p-6 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-strong">For 16- and 17-year-olds</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Mow lawns, rake leaves, trim, weed, run an errand, and do the kind of outdoor help
            neighbors actually need. You can work under a parent or guardian&apos;s household
            account, alongside a sibling if you have one.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Your completed jobs, ratings, and reliability are recorded under your name—not just
            the account—so they can help when you need a reference for your next job, application,
            or opportunity.
          </p>
        </article>

        <article className="rounded-xl border border-line bg-surface p-6 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-strong">For parents and guardians</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            You create and own one household account. You can add more than one under-18 household
            member, and there is no separate login for a young worker.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            You approve every job before work starts: that job, that customer, that address, and
            that day. Eligible jobs are outdoor and street-visible only.
          </p>
        </article>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-accent-text">Approval for every job</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-strong">
              You know the details before your young worker goes.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              A signup checkbox is not approval for a Saturday job at a specific address. Before
              work begins, the parent or guardian on the household account must approve that job,
              that customer, that address, and that day.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <article className="rounded-xl border border-line bg-raised p-6">
              <h3 className="text-lg font-bold text-strong">Changed details mean new approval</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                If the customer changes the address or the time after you approve, that approval is
                automatically cancelled. You must approve the new details before work starts.
              </p>
            </article>

            <article className="rounded-xl border border-line bg-raised p-6">
              <h3 className="text-lg font-bold text-strong">The named worker keeps their record</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                One household account can support siblings, while each named young worker keeps
                their own completed jobs, ratings, and reliability record.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section id="the-rules" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-accent-text">The rules, plainly</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-strong">
              What young workers can do—and what they cannot.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              These rules apply to every TryHardly worker under 18. Federal Hazardous Occupations
              Orders apply to everyone under 18, even if a parent agrees. They are why some work is
              simply off limits.
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <article className="rounded-xl border border-line bg-raised p-6">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-success" aria-hidden="true" />
                <h3 className="text-lg font-bold text-strong">Eligible work</h3>
              </div>
              <ul className="mt-4 space-y-3">
                {allowedWork.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <span className="text-success" aria-hidden="true">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-line bg-raised p-6">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-danger" aria-hidden="true" />
                <h3 className="text-lg font-bold text-strong">Never permitted</h3>
              </div>
              <ul className="mt-4 space-y-3">
                {prohibitedWork.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <span className="text-danger" aria-hidden="true">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="mt-5 rounded-xl border border-line bg-raised p-6">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-accent-text" aria-hidden="true" />
              <h3 className="text-lg font-bold text-strong">Daylight hours only</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Young workers may take eligible jobs from 8am to 6pm only. Those hours are
              deliberately narrower than the legal maximum because a teenager at a stranger’s
              address needs a sensible boundary.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <div className="rounded-xl border border-line bg-raised p-6 sm:p-8">
          <p className="text-sm font-semibold text-accent-text">A parent&apos;s decision</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-strong">
            Look into the neighborhood yourself before you say yes.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            When you approve a job, TryHardly shows you the job address and links you to{' '}
            <a
              href="https://www.meganslaw.ca.gov/"
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-accent-text underline underline-offset-4 hover:text-accent-text"
            >
              California&apos;s official Megan&apos;s Law site
            </a>
            . You can use it to look into the neighborhood yourself before saying yes.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            TryHardly does not check, screen, search, or verify anyone against any sex offender
            registry. The decision is yours. Keeping that judgment with the responsible adult is a
            deliberate part of how household accounts work.
          </p>
        </div>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-semibold text-accent-text">How to get started</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-strong">
              Start with a conversation at home.
            </h2>
            <ol className="mt-6 space-y-5">
              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent">
                  1
                </span>
                <div>
                  <h3 className="font-semibold text-strong">Create one household account</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    A parent or guardian creates and owns the account, then adds each young worker
                    by name. Young workers do not have separate logins.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent">
                  2
                </span>
                <div>
                  <h3 className="font-semibold text-strong">Choose only eligible work</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Look for outdoor, street-visible yard work, errands, and appropriate odd jobs
                    scheduled between 8am and 6pm.
                  </p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-on-accent">
                  3
                </span>
                <div>
                  <h3 className="font-semibold text-strong">Approve the details, then build the record</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    The parent approves the job details before work begins. Finish what you agreed
                    to do, then let the completed job speak for the young worker&apos;s reliability.
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <aside className="h-fit rounded-xl border border-line bg-surface p-6">
            <h2 className="text-lg font-bold text-strong">Agree on payment up front</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              TryHardly does not process payments. The customer pays directly, so a parent or
              guardian and the customer should agree on the amount and payment method before the
              work begins.
            </p>
            <Link
              href="/jobs"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-accent-text transition-colors hover:text-accent-text"
            >
              Browse local jobs <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      </section>

      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-4xl px-6 py-12 text-center sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-strong">
            Real work. A first record worth keeping.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            For a young worker, a few well-done neighborhood jobs can be the start of something
            real. Start together, keep to the rules, and let the work count.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-on-accent transition-colors hover:bg-accent"
          >
            Get started with a parent <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
