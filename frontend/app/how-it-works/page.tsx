import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Check, HeartHandshake, ShieldAlert, Mail } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'Exactly how TryHardly works for customers and for workers: post a job free, compare bids, agree the terms in a Handshake, and pay your worker directly.',
  alternates: { canonical: '/how-it-works' },
};

// This page did not exist. The navbar linked to /#how-it-works (a homepage
// anchor), /pricing's "See how it works" pointed somewhere else again, and
// /how-it-works itself returned a 404 — so the single question a hesitant
// visitor asks had no page to land on. This is that page: one walkthrough per
// side, in plain words, with the limits stated rather than buried.

const customerSteps = [
  {
    title: 'Describe the job',
    body: 'Say what needs doing in your own words. A photo helps. Add roughly what you want to spend — it is a starting point, not a commitment. Posting is free and you do not need an account to begin.',
  },
  {
    title: 'Read the bids that come in',
    body: 'Workers nearby send you a price. On each one you can see how many jobs they have finished on TryHardly, what other customers said, and whether they have kept their agreements. You are never obliged to accept any of them.',
  },
  {
    title: 'Agree the terms — the Handshake',
    body: 'When you pick someone, you both confirm the same four things: the price, the day and time, the address, and exactly what is included. It is written down and timestamped. Neither of you can quietly change it afterwards.',
  },
  {
    title: 'The work gets done',
    body: 'Your worker turns up and does the job you agreed. If something needs to change, you agree the change here first, so there is still one written version of the deal.',
  },
  {
    title: 'You pay your worker directly',
    body: 'Cash, Venmo, Zelle, a check — whatever you both agreed. The money does not come through TryHardly at any point. Then you confirm here that the job is finished, which is what puts it on your worker\u2019s record.',
  },
];

const workerSteps = [
  {
    title: 'Make a free account',
    body: 'Confirm your email and tell us what kind of work you do and where you can get to. There is no fee to join, no fee to bid, and no charge for leads.',
  },
  {
    title: 'Bid on jobs near you',
    body: 'You can see how many other people have already bid before you spend time writing anything, so you are not one of forty applicants to a job that is already gone. Bidding closes once a job has had enough.',
  },
  {
    title: 'Agree the terms — the Handshake',
    body: 'If the customer picks you, you both confirm price, time, place, and scope. That protects you as much as them: nobody can add "and while you are here, could you also…" for free afterwards.',
  },
  {
    title: 'Do the work and get paid on the spot',
    body: 'The customer pays you directly and you keep 100% of it. TryHardly takes no commission. Agree how and when you will be paid before you start.',
  },
  {
    title: 'Build a record that follows you',
    body: 'Every finished job, every kept agreement, and every review builds a profile that is genuinely yours. That is the thing that gets you the next job at a better price.',
  },
];

function Steps({
  steps,
}: {
  steps: { title: string; body: string }[];
}) {
  return (
    <ol className="space-y-8">
      {steps.map(({ title, body }, i) => (
        <li key={title} className="flex gap-5">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-accent text-lg font-bold text-on-accent">
            {i + 1}
          </span>
          <div className="pt-1.5">
            <h3 className="mb-2 text-xl font-bold text-strong">{title}</h3>
            <p className="text-base leading-relaxed text-body">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="bg-canvas text-strong">
      <section className="mx-auto max-w-3xl px-6 pt-14 pb-10 text-center sm:pt-20">
        <p className="eyebrow mb-4">How it works</p>
        <h1 className="mb-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          The whole thing, start to finish
        </h1>
        <p className="mx-auto max-w-xl text-lg leading-relaxed text-body">
          No jargon and nothing hidden. Pick the side you are on.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <a href="#customers" className="btn-secondary">
            I need work done
          </a>
          <a href="#workers" className="btn-secondary">
            I want paid work
          </a>
        </div>
      </section>

      {/* ─── Customers ────────────────────────────────────────────────────── */}
      <section
        id="customers"
        className="scroll-mt-20 border-y border-line bg-surface"
      >
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <p className="eyebrow mb-3">If you need work done</p>
          <h2 className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl">
            Hiring someone on TryHardly
          </h2>
          <Steps steps={customerSteps} />
          <div className="mt-10">
            <Link href="/post-a-job" className="btn-primary btn-lg">
              Post a job free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Workers ──────────────────────────────────────────────────────── */}
      <section id="workers" className="scroll-mt-20">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <p className="eyebrow mb-3">If you want paid work</p>
          <h2 className="mb-10 text-3xl font-bold tracking-tight sm:text-4xl">
            Getting hired on TryHardly
          </h2>
          <Steps steps={workerSteps} />
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/jobs" className="btn-primary btn-lg">
              See local jobs
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/work-alerts" className="btn-secondary btn-lg">
              Email me new jobs
            </Link>
          </div>
        </div>
      </section>

      {/* ─── The Handshake ────────────────────────────────────────────────── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent-text">
            <HeartHandshake className="h-7 w-7" />
          </div>
          <h2 className="mb-4 text-3xl font-bold tracking-tight">
            More about the Handshake
          </h2>
          <p className="mb-6 text-base leading-relaxed text-body sm:text-lg">
            Most disagreements over local work are not about dishonesty. They
            are about two people remembering a conversation differently. The
            Handshake removes that.
          </p>
          <ul className="mb-6 space-y-3">
            {[
              'Either side can propose the terms, but only the other side can agree to them.',
              'It is timestamped, and the agreed version cannot be edited — changing it creates a new version and the old one stays visible.',
              'It only counts as honored once the finished work is confirmed, not just because you both said yes.',
              'If it is broken, the record shows which side broke it. It does not count against the other person.',
              'Nothing is shown on anyone\u2019s public record until they have at least three of these, so one bad day is not a permanent verdict.',
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <Check className="mt-1 h-5 w-5 flex-none text-success" />
                <span className="text-base leading-relaxed text-body">
                  {line}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Limits ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
        <div className="rounded-2xl border-2 border-line-strong bg-surface p-7 sm:p-9">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="mb-4 text-2xl font-bold tracking-tight sm:text-3xl">
            What TryHardly cannot do for you
          </h2>
          <p className="mb-5 text-base leading-relaxed text-body">
            This part matters more than anything above it, so it is not in the
            small print.
          </p>
          <ul className="space-y-4 text-base leading-relaxed text-body">
            <li>
              <strong className="font-bold text-strong">
                We do not handle your money.
              </strong>{' '}
              Payment happens directly between you and the other person, so we
              cannot refund it, reverse it, chargeback, or guarantee it. Never
              pay in full before work starts, and never pay someone you have not
              agreed terms with here.
            </li>
            <li>
              <strong className="font-bold text-strong">
                We do not run background checks.
              </strong>{' '}
              We verify email addresses, and we check professional licences
              against public state registries when a worker claims one. We do
              not check criminal records or government ID, and we will not
              pretend otherwise.
            </li>
            <li>
              <strong className="font-bold text-strong">
                We are not the one doing the work.
              </strong>{' '}
              Workers on TryHardly are independent. They set their own price and
              they are responsible for their own work, their own tools, and
              their own insurance.
            </li>
            <li>
              <strong className="font-bold text-strong">
                Some work needs a licensed contractor.
              </strong>{' '}
              In California, most home improvement work over $500 in combined
              labor and materials requires a CSLB licence. If your job is that
              kind of job, hire someone licensed for it.
            </li>
          </ul>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/trust" className="btn-secondary">
              Trust &amp; safety in full
            </Link>
            <Link href="/pricing" className="btn-secondary">
              Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Ask a person ─────────────────────────────────────────────────── */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-14 text-center">
          <h2 className="mb-3 text-2xl font-bold tracking-tight">
            Still have a question?
          </h2>
          <p className="mb-6 text-base leading-relaxed text-body">
            Email us and a person will answer. If you would rather someone
            walked you through your first post, ask and we will.
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
