import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowRight,
  Leaf,
  Truck,
  Wrench,
  Sparkles,
  Package,
  Boxes,
  Check,
  X,
  HeartHandshake,
  MessageSquare,
  Mail,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'TryHardly — Local help in Redding, hired directly',
  description:
    'Post a local job free or get paid to do the work. You and your worker agree the price here and settle it directly. TryHardly takes no cut.',
  alternates: { canonical: '/' },
};

// ─── Content ──────────────────────────────────────────────────────────────────
//
// The old homepage repeated the same "Post a job / Browse jobs" button pair four
// separate times and offered a third variant (a ZIP search box) in between, so a
// first-time visitor had to choose between seven links that all did two things.
// This version states the two doors once, near the top, and then spends the rest
// of the page answering the question people actually have: is this safe, and who
// gets my money.

const steps = [
  {
    title: 'Say what you need done',
    detail:
      'Describe the job in a sentence or two, add a photo if you have one, and say roughly what you want to spend. It is free and takes about a minute.',
  },
  {
    title: 'Local workers send you a price',
    detail:
      'People nearby send a bid. You can see how many jobs they have finished on TryHardly and what other neighbors said about them.',
  },
  {
    title: 'Shake on it, then pay them yourself',
    detail:
      'You both agree the price, the day, the place, and what is included. When the work is done, you pay your worker directly. TryHardly never touches the money.',
  },
];

const categories = [
  { name: 'Yard work & mowing', icon: Leaf },
  { name: 'Hauling & dump runs', icon: Truck },
  { name: 'Handyman jobs', icon: Wrench },
  { name: 'House cleaning', icon: Sparkles },
  { name: 'Moving help', icon: Boxes },
  { name: 'Errands & pickups', icon: Package },
];

// The honest-limits list is the whole trust argument. Angi was fined $100k in
// Vermont for implying screening it did not do, so this page says the "no" side
// out loud and gives it the same visual weight as the "yes" side.
const weDo = [
  'Show you how many jobs a worker has actually finished here',
  'Keep a written record of the price, date, and scope you both agreed to',
  'Hold both sides to it — workers and customers are both rated',
  'Check professional licences against public state registries when a worker claims one',
  'Answer a real email, from a real person, in Redding',
];

const weDoNot = [
  'Take a cut of your job, or charge for leads',
  'Handle, hold, or process your payment',
  'Refund, reverse, or guarantee money between you and a worker',
  'Run criminal background checks or verify government ID',
  'Send you a stranger we have personally met',
];

export default function HomePage() {
  return (
    <div className="bg-canvas text-strong">
      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 pt-14 pb-4 text-center sm:pt-20">
        <p className="eyebrow mb-4">Redding, California</p>
        <h1 className="mb-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
          Need a hand?
          <br />
          Hire someone local.
        </h1>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-body sm:text-xl">
          TryHardly connects people in Redding who need work done with people
          nearby who want to get paid to do it. Yard work, hauling, cleaning,
          moving help, repairs, errands.
        </p>
      </section>

      {/* Two doors. Stated once, large, and never repeated as competing pairs
          further down the page. */}
      <section className="mx-auto max-w-3xl px-6 pb-14 sm:pb-20">
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/post-a-job"
            className="group rounded-2xl border-2 border-accent bg-accent p-7 text-on-accent transition-colors hover:bg-accent-hover"
          >
            <h2 className="mb-2 text-2xl font-bold">I need help with a job</h2>
            <p className="mb-5 text-base leading-relaxed opacity-90">
              Post it free. Local workers send you a price. No account needed to
              start.
            </p>
            <span className="inline-flex items-center gap-2 text-base font-bold underline underline-offset-4">
              Post a job free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/jobs"
            className="group rounded-2xl border-2 border-line-strong bg-surface p-7 transition-colors hover:border-accent"
          >
            <h2 className="mb-2 text-2xl font-bold text-strong">
              I want to get paid to work
            </h2>
            <p className="mb-5 text-base leading-relaxed text-body">
              See what people near you need done and send them your price. You
              keep 100% of it.
            </p>
            <span className="inline-flex items-center gap-2 text-base font-bold text-accent-text underline underline-offset-4">
              See local jobs
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="section">
          <div className="mb-12 text-center">
            <p className="eyebrow mb-3">How it works</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Three steps. No surprises.
            </h2>
          </div>

          <ol className="grid gap-10 sm:grid-cols-3">
            {steps.map(({ title, detail }, i) => (
              <li key={title}>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-xl font-bold text-on-accent">
                  {i + 1}
                </div>
                <h3 className="mb-2 text-xl font-bold text-strong">{title}</h3>
                <p className="text-base leading-relaxed text-body">{detail}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12 text-center">
            <Link href="/how-it-works" className="btn-secondary">
              Walk me through it in more detail
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Money ────────────────────────────────────────────────────────── */}
      <section className="section">
        <div className="mx-auto max-w-3xl rounded-2xl border-2 border-accent/30 bg-accent/5 p-7 sm:p-10">
          <p className="eyebrow mb-3">The money</p>
          <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
            You pay your worker. Not us.
          </h2>
          <p className="mb-7 text-base leading-relaxed text-body sm:text-lg">
            TryHardly does not process payments. You and your worker agree an
            amount here, and then you settle it between yourselves — cash,
            Venmo, Zelle, or a check. Whatever suits you both. Because the money
            never comes through us, we take no cut of it, and the worker keeps
            every dollar.
          </p>
          <div className="mb-7 grid gap-4 sm:grid-cols-3">
            {[
              ['Free to post', 'No posting fee, no booking fee, no card on file.'],
              ['Workers keep 100%', 'No commission, and no charge for leads that go nowhere.'],
              ['Agreed up front', 'Price and scope are written down before anyone starts.'],
            ].map(([title, body]) => (
              <div key={title} className="card p-5">
                <p className="mb-1 font-bold text-strong">{title}</p>
                <p className="text-sm leading-relaxed text-body">{body}</p>
              </div>
            ))}
          </div>
          <p className="text-base leading-relaxed text-body">
            <strong className="font-bold text-strong">
              The honest limit:
            </strong>{' '}
            because the payment never touches TryHardly, we cannot refund it,
            reverse it, or guarantee it. Read the full{' '}
            <Link
              href="/pricing"
              className="font-semibold text-accent-text underline underline-offset-2 hover:text-accent-text-hover"
            >
              pricing page
            </Link>{' '}
            before you post.
          </p>
        </div>
      </section>

      {/* ─── The Handshake ────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="section max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent-text">
            <HeartHandshake className="h-7 w-7" />
          </div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Everything is agreed in writing first
          </h2>
          <p className="text-base leading-relaxed text-body sm:text-lg">
            Before any work starts, both of you confirm the same four things:
            the price, the day and time, the address, and exactly what is
            included. We call it the Handshake. It is timestamped and it does
            not change unless you both change it — so nobody turns up expecting
            a different job at a different price.
          </p>
          <p className="mt-4 text-base leading-relaxed text-body">
            If someone breaks it, that goes on their record here. Both sides are
            rated. That works in your favour whichever side you are on.
          </p>
        </div>
      </section>

      {/* ─── Categories ───────────────────────────────────────────────────── */}
      <section className="section">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-3">What people hire for</p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Hands-on work, done by neighbors
          </h2>
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map(({ name, icon: Icon }) => (
            <li key={name}>
              <Link
                href={`/post-a-job?category=${encodeURIComponent(name)}`}
                className="flex min-h-[72px] items-center gap-4 rounded-xl border border-line-strong bg-surface px-5 py-4 transition-colors hover:border-accent"
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-accent/10 text-accent-text">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-base font-semibold text-strong">
                  {name}
                </span>
                <ArrowRight className="ml-auto h-5 w-5 flex-none text-subtle" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-base text-body">
          Something else? Post it anyway — describe the job in your own words.
        </p>
      </section>

      {/* ─── What we do and don't do ──────────────────────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="section">
          <div className="mb-10 text-center">
            <p className="eyebrow mb-3">Straight answers</p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              What we do, and what we don&apos;t
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-body">
              Plenty of sites are vague about this on purpose. Here is the whole
              of it.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-2">
            <div className="card">
              <h3 className="mb-4 text-lg font-bold text-strong">
                What TryHardly does
              </h3>
              <ul className="space-y-3">
                {weDo.map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-0.5 h-5 w-5 flex-none text-success" />
                    <span className="text-base leading-relaxed text-body">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h3 className="mb-4 text-lg font-bold text-strong">
                What TryHardly does not do
              </h3>
              <ul className="space-y-3">
                {weDoNot.map((item) => (
                  <li key={item} className="flex gap-3">
                    <X className="mt-0.5 h-5 w-5 flex-none text-danger" />
                    <span className="text-base leading-relaxed text-body">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link href="/trust" className="btn-secondary">
              Read our trust &amp; safety page
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Where we are ─────────────────────────────────────────────────── */}
      <section className="section max-w-3xl text-center">
        <p className="eyebrow mb-3">Where we are right now</p>
        <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
          We are new, and we are only in Redding
        </h2>
        <p className="text-base leading-relaxed text-body sm:text-lg">
          There are not thousands of jobs and workers on here yet. That is the
          honest truth, and we would rather say it than pad the numbers. We are
          building one city and one kind of work at a time, starting with yard
          work and cleanup in Redding, and the fastest way to make it useful is
          for real neighbors to post real jobs.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/post-a-job" className="btn-primary btn-lg">
            Post a job free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/jobs" className="btn-secondary btn-lg">
            See local jobs
          </Link>
        </div>
      </section>

      {/* ─── Talk to a person ─────────────────────────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent-text">
            <MessageSquare className="h-6 w-6" />
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight">
            Not sure? Ask us first.
          </h2>
          <p className="mb-6 text-base leading-relaxed text-body">
            A person reads every message. If you would rather have someone walk
            you through posting your first job, say so and we will.
          </p>
          <a href="mailto:support@tryhardly.com" className="btn-secondary">
            <Mail className="h-5 w-5" />
            support@tryhardly.com
          </a>
        </div>
      </section>
    </div>
  );
}
