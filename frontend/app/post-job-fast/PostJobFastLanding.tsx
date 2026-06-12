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
  Clock,
} from 'lucide-react';

const problems = [
  'Your post slides down the feed and gets buried in an hour.',
  'Replies, prices, and phone numbers are scattered across comments and DMs.',
  'No way to see who actually showed up and did good work before.',
  'No clear reward — people lowball, ghost, or argue in the thread.',
  'Group admins delete "for sale / hiring" posts, and you start over.',
];

const steps = [
  {
    title: 'Post the job',
    desc: 'Describe what you need, where, and what you’ll pay. Takes about a minute — no account hoops.',
    icon: ListChecks,
  },
  {
    title: 'Get applications in one place',
    desc: 'Local workers apply with profiles and reviews. No digging through 40 comments to find the one reply you wanted.',
    icon: Inbox,
  },
  {
    title: 'Pick someone and get it done',
    desc: 'Compare who applied, choose your person, and keep all the details in one organized job — not a lost thread.',
    icon: Check,
  },
];

const categories = [
  { name: 'Yard work', icon: Hammer },
  { name: 'Hauling & junk removal', icon: Truck },
  { name: 'Cleaning', icon: Sparkles },
  { name: 'Moving help', icon: Boxes },
  { name: 'Handyman & repairs', icon: Wrench },
  { name: 'Errands & odd jobs', icon: ListChecks },
];

const trust = [
  {
    icon: ListChecks,
    title: 'Organized job details',
    desc: 'Everything about the job lives in one place — not buried in a comment thread.',
  },
  {
    icon: Inbox,
    title: 'Applications in one inbox',
    desc: 'See who wants the work side by side instead of scrolling endless replies.',
  },
  {
    icon: Star,
    title: 'Profiles & reviews',
    desc: 'Check past work and ratings before you pick someone — not just a friendly comment.',
  },
  {
    icon: ShieldCheck,
    title: 'Marketplace payout flow',
    desc: 'Built so marketplace payouts are initiated after confirmed task completion. You can post and hire for free today.',
  },
];

const faqs = [
  {
    q: 'Is it free to post a job?',
    a: 'Yes. Posting a job is free. You describe the work and what you’ll pay, and local workers apply — no fee to post or to review applications.',
  },
  {
    q: 'How is this better than just posting in my Facebook group?',
    a: 'A group post gets buried fast, replies scatter across comments and DMs, and you can’t easily see who’s reliable. On TryHardly the job details stay in one place, applications land in one inbox, and every worker has a profile and reviews.',
  },
  {
    q: 'Do I have to pay through the site?',
    a: 'Not required today. TryHardly uses a marketplace payout flow so payout is initiated after confirmed completion. For now you can post, get applications, and arrange the job for free.',
  },
  {
    q: 'What kind of jobs work here?',
    a: 'Local hands-on work: yard work, hauling, cleaning, moving help, handyman repairs, assembly, and everyday errands — the same stuff people post in neighborhood groups.',
  },
  {
    q: 'Is this a big established marketplace?',
    a: 'We’re honest: TryHardly is early access and growing locally. You won’t see fake "10,000 jobs" numbers here. You’re early — which means less noise and a real chance to get matched with nearby workers.',
  },
];

const groupPost = `Need a hand with a local job? 🛠️

I'm using TryHardly to post local jobs instead of burying them in the comments here. You describe the work + what you'll pay, and local people apply in one place (with profiles + reviews) — no more lost comment threads.

Post your job in about 60 seconds, free:
https://tryhardly.com/post-job-fast

Yard work, hauling, cleaning, moving help, handyman, errands — all welcome.`;

export default function PostJobFastLanding() {
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400 mb-5">
          <MessagesSquare className="h-3 w-3" /> For folks posting jobs in local Facebook groups
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-5">
          Post your job in 60 seconds
        </h1>
        <p className="mx-auto max-w-2xl text-base sm:text-lg text-zinc-300 mb-3">
          Stop burying your help-wanted post in a Facebook group. Describe the job, set what you&apos;ll pay,
          and let nearby workers apply &mdash; all in one organized place.
        </p>
        <p className="mx-auto max-w-xl text-sm text-zinc-500 mb-8">
          Made for homeowners, landlords, small businesses, and neighbors who need yard work, hauling,
          cleaning, moving, handyman help, or errands done.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-xl mx-auto">
          <Link
            href="/request-help"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-colors"
          >
            Request help &mdash; no account needed <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-sm font-bold text-zinc-100 hover:border-amber-500/50 hover:bg-zinc-900 transition-colors"
          >
            See how it works
          </a>
        </div>
        <p className="mt-4 font-mono text-[11px] text-zinc-600">
          Free to post &middot; No app to download &middot; Early access &mdash; built for local work
        </p>
      </section>

      {/* Problem with Facebook posts */}
      <section className="border-y border-zinc-800 bg-zinc-900/50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">
            Posting a job in a group is a mess
          </h2>
          <p className="mx-auto max-w-xl text-sm text-zinc-400 mb-10 text-center">
            You know the drill. The work is simple &mdash; finding the right person in a comment thread is the hard part.
          </p>
          <ul className="space-y-3 max-w-2xl mx-auto">
            {problems.map((p) => (
              <li
                key={p}
                className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-300"
              >
                <span className="mt-0.5 text-amber-400">&times;</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-4xl px-6 py-20 scroll-mt-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">
          How TryHardly works
        </h2>
        <p className="mx-auto max-w-xl text-sm text-zinc-400 mb-12 text-center">
          Three steps from &ldquo;I need this done&rdquo; to a worker on the way.
        </p>
        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map(({ title, desc, icon: Icon }, i) => (
            <div key={title} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
                <Icon className="h-5 w-5" />
              </div>
              <p className="font-mono text-[11px] text-zinc-600 mb-1">Step {i + 1}</p>
              <h3 className="font-semibold text-zinc-100 mb-2">{title}</h3>
              <p className="text-sm text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link
            href="/request-help"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-colors"
          >
            Request help &mdash; no account needed <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="bg-zinc-900/50 border-y border-zinc-800 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-10 text-center">
            What you can post
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {categories.map(({ name, icon: Icon }) => (
              <div
                key={name}
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 text-center"
              >
                <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-zinc-100">{name}</h3>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-zinc-500">
            Got something else?{' '}
            <Link href="/post-quest" className="text-amber-400 hover:text-amber-300">
              Post any local odd job
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Trust / why better */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">
          Why it beats a group post
        </h2>
        <p className="mx-auto max-w-xl text-sm text-zinc-400 mb-10 text-center">
          Same neighbors, none of the chaos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {trust.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 flex gap-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 mb-1">{title}</h3>
                <p className="text-sm text-zinc-400">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Campaign snippet for the owner */}
      <section className="bg-zinc-900/50 border-y border-zinc-800 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="flex items-center gap-2 justify-center mb-3 text-amber-400">
            <MessagesSquare className="h-4 w-4" />
            <span className="font-mono text-[11px] font-semibold tracking-widest uppercase">
              Share in your group
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">
            Spread the word locally
          </h2>
          <p className="mx-auto max-w-xl text-sm text-zinc-400 mb-6 text-center">
            Copy this and post it in your local group (where group rules allow). Keep it genuine &mdash;
            please don&apos;t spam.
          </p>
          <div className="rounded-xl border border-zinc-700 bg-zinc-950/70 p-5">
            <p className="whitespace-pre-line text-sm text-zinc-300 leading-relaxed">{groupPost}</p>
          </div>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={copyGroupPost}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-amber-500/50 hover:bg-zinc-900 transition-colors"
            >
              {copied ? (
                <>
                  <ClipboardCheck className="h-4 w-4 text-amber-400" /> Copied
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
                className="rounded-xl border border-zinc-700 bg-zinc-800/40 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold text-zinc-100">{q}</span>
                  <span className="text-amber-400 text-lg leading-none">{open ? '−' : '+'}</span>
                </button>
                {open && <p className="px-5 pb-5 text-sm text-zinc-400 leading-relaxed">{a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-zinc-800 bg-zinc-900/50">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <Clock className="h-5 w-5" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Ready in about 60 seconds
          </h2>
          <p className="mx-auto max-w-xl text-zinc-400 mb-10">
            Post your job free and let local workers come to you &mdash; no more lost comment threads.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/request-help"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-8 py-3.5 font-semibold text-zinc-950 transition hover:bg-amber-400"
            >
              Request help &mdash; no account needed <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/questboard"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-8 py-3.5 font-semibold transition hover:border-amber-500/50 hover:bg-zinc-900"
            >
              Browse starter quests
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
