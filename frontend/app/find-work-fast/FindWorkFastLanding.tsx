'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ClipboardCopy,
  ClipboardCheck,
  Hammer,
  Truck,
  Sparkles,
  Boxes,
  Wrench,
  ListChecks,
  Inbox,
  Star,
  ShieldCheck,
  MessagesSquare,
  CircleDollarSign,
} from 'lucide-react';

const problems = [
  'You scroll past the gig before you ever see it — good posts get buried in an hour.',
  'You comment "interested" and your reply is lost under 40 others.',
  'No real details — you DM, wait, and half the time never hear back.',
  'No profile to point to, so you start from zero every single time.',
  'Pay is vague, people lowball, and there’s nothing holding the deal together.',
];

const steps = [
  {
    title: 'Browse local work',
    desc: 'Open the job board and see nearby jobs with clear details and pay — no scrolling a feed hoping something shows up.',
    icon: ListChecks,
  },
  {
    title: 'Apply with your profile',
    desc: 'One tap to apply. Your profile and reviews go with you, so posters can see you’re reliable instead of guessing.',
    icon: Inbox,
  },
  {
    title: 'Do the work, build your reputation',
    desc: 'Finish the job, get a review, and stack up a track record that makes the next gig easier to land.',
    icon: Check,
  },
];

const categories = [
  { name: 'Yard work & lawn care', icon: Hammer },
  { name: 'Hauling & junk removal', icon: Truck },
  { name: 'Cleaning', icon: Sparkles },
  { name: 'Moving help', icon: Boxes },
  { name: 'Handyman & repairs', icon: Wrench },
  { name: 'Errands & delivery', icon: ListChecks },
];

const benefits = [
  {
    icon: Inbox,
    title: 'Applications stay organized',
    desc: 'Apply once and track it in one place — no lost comments, no "did they see my message?"',
  },
  {
    icon: Star,
    title: 'A profile that travels with you',
    desc: 'Build a profile and collect reviews so posters can trust you fast. Your good work actually counts toward the next job.',
  },
  {
    icon: CircleDollarSign,
    title: 'Clear rewards up front',
    desc: 'Every job lists what it pays before you apply. No haggling in the comments, no surprise lowball at the door.',
  },
  {
    icon: ShieldCheck,
    title: 'Direct pay, all yours',
    desc: 'Agree on the payment method and timing with the customer before you start. The customer pays you directly, and you keep 100%.',
  },
];

const faqs = [
  {
    q: 'Is it free to sign up and apply?',
    a: 'Yes. Creating a worker profile and applying to jobs is free. You browse local work, apply with your profile, and the poster picks who they want — no fee to get started.',
  },
  {
    q: 'How is this better than finding gigs in Facebook groups?',
    a: 'In a group, good gigs scroll past fast and your "interested" comment gets buried under dozens of others. On TryHardly the jobs sit on a board with clear details and pay, you apply in one tap, and your profile and reviews travel with you so posters can see you’re reliable.',
  },
  {
    q: 'How do I get paid?',
    a: 'The customer pays you directly. Agree on the amount, method, and timing before you start. Cash, Venmo, Zelle, and check all work if you both agree. You keep 100%, and TryHardly does not process the payment.',
  },
  {
    q: 'What kind of work is on here?',
    a: 'Local hands-on gigs: yard work, hauling, cleaning, moving help, handyman repairs, assembly, deliveries, and everyday errands — the same stuff people post looking for help in neighborhood groups.',
  },
  {
    q: 'Are there tons of jobs already?',
    a: 'We’re honest: TryHardly is early access with starter listings while we grow locally. You won’t see fake "thousands of jobs" numbers here. Being early means less competition and a real shot at being one of the first trusted workers in your area.',
  },
];

const groupPost = `Looking for local gigs you can actually do? 🛠️

I'm finding side work on TryHardly instead of refreshing the feed and dropping "interested" on posts that get buried. You browse local jobs with the pay listed up front, apply in one tap, and build a profile + reviews so you get picked faster next time.

It's free to sign up and browse:
https://tryhardly.com/find-work-fast

Yard work, hauling, cleaning, moving help, handyman, errands — if you're handy and reliable, take a look.`;

export default function FindWorkFastLanding() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  const copyGroupPost = async () => {
    try {
      await navigator.clipboard.writeText(groupPost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-strong">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent-text mb-5">
          <MessagesSquare className="h-3 w-3" /> For workers hunting gigs in local Facebook groups
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-5">
          Find local work you can actually do
        </h1>
        <p className="mx-auto max-w-2xl text-base sm:text-lg text-body mb-3">
          Stop scrolling the feed for gigs that vanish in an hour. Browse nearby jobs with the pay
          listed up front, apply in one tap, and build a profile that gets you picked.
        </p>
        <p className="mx-auto max-w-xl text-sm text-subtle mb-8">
          Made for side-hustlers, students, handymen, cleaners, movers, lawn &amp; yard workers, and
          delivery or errand helpers who want steady local gigs.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-xl mx-auto">
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-on-accent hover:bg-accent transition-colors"
          >
            Browse local jobs <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/work-alerts"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-6 py-3 text-sm font-bold text-strong hover:border-accent/50 hover:bg-surface transition-colors"
          >
            Get work alerts &mdash; no account
          </Link>
        </div>
        <p className="mt-4 font-mono text-[12px] text-subtle">
          Free to sign up &middot; No app to download &middot; Early access &mdash; starter listings, growing locally
        </p>
      </section>

      {/* Problem with Facebook gig hunting */}
      <section className="border-y border-line bg-surface py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">
            Finding gigs in a group is a grind
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted mb-10 text-center">
            You&apos;re ready to work. Getting noticed in a comment thread is the part that wastes your time.
          </p>
          <ul className="space-y-3 max-w-2xl mx-auto">
            {problems.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-body"
              >
                <span className="mt-0.5 text-accent-text">&times;</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-4xl px-6 py-20 scroll-mt-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">
          How TryHardly works for workers
        </h2>
        <p className="mx-auto max-w-xl text-sm text-muted mb-12 text-center">
          Three steps from &ldquo;I need work&rdquo; to a job in your hands.
        </p>
        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map(({ title, desc, icon: Icon }, i) => (
            <div key={title} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent-text">
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-mono text-[12px] text-subtle mb-1">Step {i + 1}</p>
              <h3 className="font-semibold text-strong mb-2">{title}</h3>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-on-accent hover:bg-accent transition-colors"
          >
            Browse local jobs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-surface border-y border-line py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-10 text-center">
            Work you can pick up
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {categories.map(({ name, icon: Icon }) => (
              <div
                key={name}
                className="rounded-xl border border-line-strong bg-raised p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent/10 text-accent-text">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-strong">{name}</h3>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-subtle">
            Good with your hands?{' '}
            <Link href="/jobs" className="text-accent-text hover:text-accent-text-hover">
              See what&apos;s open near you
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Worker benefits */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">
          Why work through TryHardly
        </h2>
        <p className="mx-auto max-w-xl text-sm text-muted mb-10 text-center">
          Same local gigs, none of the comment-thread chaos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-line-strong bg-raised p-6 flex gap-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent-text">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-strong mb-1">{title}</h3>
                <p className="text-sm text-muted">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Campaign snippet for recruiting workers */}
      <section className="bg-surface border-y border-line py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex items-center gap-2 justify-center mb-3 text-accent-text">
            <MessagesSquare className="h-4 w-4" />
            <span className="font-mono text-[12px] font-semibold tracking-widest uppercase">
              Share with other workers
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">
            Know someone hunting for gigs?
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted mb-6 text-center">
            Copy this and post it in your local group (where group rules allow). Keep it genuine &mdash;
            please don&apos;t spam.
          </p>
          <div className="rounded-xl border border-line-strong bg-canvas p-5">
            <p className="whitespace-pre-line text-sm text-body leading-relaxed">{groupPost}</p>
          </div>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={copyGroupPost}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-5 py-2.5 text-sm font-semibold text-body hover:border-accent/50 hover:bg-surface transition-colors"
            >
              {copied ? (
                <>
                  <ClipboardCheck className="h-4 w-4 text-accent-text" /> Copied
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-4 w-4" /> Copy group post
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-10 text-center">
          Questions, answered
        </h2>
        <div className="space-y-3">
          {faqs.map(({ q, a }, i) => {
            const open = openFaq === i;
            return (
              <div
                key={q}
                className="rounded-xl border border-line-strong bg-raised overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-strong">{q}</span>
                  <span className="text-accent-text text-lg leading-none">{open ? '−' : '+'}</span>
                </button>
                {open && <p className="px-5 pb-5 text-sm text-muted leading-relaxed">{a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent-text">
            <CircleDollarSign className="h-5 w-5" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Start finding work today
          </h2>
          <p className="mx-auto max-w-xl text-muted mb-10">
            Browse what&apos;s open near you and create a free worker profile &mdash; no more chasing buried comments.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-8 py-3.5 font-semibold text-on-accent transition hover:bg-accent"
            >
              Browse local jobs <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/work-alerts"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line-strong px-8 py-3.5 font-semibold transition hover:border-accent/50 hover:bg-surface"
            >
              Get work alerts &mdash; no account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
