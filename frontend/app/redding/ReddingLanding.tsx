'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  MapPin,
  Hammer,
  Truck,
  Boxes,
  Sparkles,
  Wrench,
  ListChecks,
  Bell,
  Star,
  ClipboardCopy,
  ClipboardCheck,
  Printer,
  Facebook,
} from 'lucide-react';
import {
  routes,
  requesterCategories,
  facebookRequesterPost,
  facebookWorkerPost,
} from './config';

const categoryIcons = [Hammer, Truck, Boxes, Sparkles, Wrench, ListChecks];

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Facebook className="h-4 w-4 text-amber-400" /> {label}
        </h3>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-amber-500/50 hover:bg-zinc-800/70"
        >
          {copied ? (
            <>
              <ClipboardCheck className="h-3.5 w-3.5 text-amber-400" /> Copied
            </>
          ) : (
            <>
              <ClipboardCopy className="h-3.5 w-3.5" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-zinc-300">
        {text}
      </pre>
    </div>
  );
}

export default function ReddingLanding() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-14 text-center sm:py-20">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400">
          <MapPin className="h-3 w-3" /> Now launching in Redding, CA · Early access
        </div>
        <h1 className="mb-5 text-4xl font-bold tracking-tight sm:text-6xl">
          Post jobs and find
          <br />
          local work in Redding
        </h1>
        <p className="mx-auto mb-3 max-w-2xl text-base text-zinc-300 sm:text-lg">
          A simple way to connect local jobs with reliable local help — yard work, hauling,
          moving, cleaning, handyman jobs, and errands.
        </p>
        <p className="mx-auto mb-8 max-w-xl text-sm text-zinc-500">
          We&apos;re just getting started in Redding. There aren&apos;t thousands of jobs or
          workers yet — that&apos;s the honest truth. The goal right now is matching real local
          jobs with dependable local people, one neighbor at a time.
        </p>

        <div className="mx-auto flex max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-2xl sm:flex-row">
          <Link
            href={routes.requestHelp}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400"
          >
            I need help with a job <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={routes.workAlerts}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-sm font-bold text-zinc-100 transition-colors hover:border-amber-500/50 hover:bg-zinc-900"
          >
            I want local work <Bell className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-4">
          <Link
            href={routes.questboard}
            className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-amber-400 transition-colors hover:text-amber-300"
          >
            Or just browse local jobs <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Two-sided cards */}
      <section className="border-y border-zinc-800 bg-zinc-900/50 py-16">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 sm:grid-cols-2">
          {/* Requesters */}
          <div className="flex flex-col rounded-2xl border border-zinc-700 bg-zinc-900 p-7">
            <h2 className="mb-2 text-xl font-bold text-zinc-100">Need something done?</h2>
            <p className="mb-5 text-sm text-zinc-400">
              Post what you need and get matched with local people in the Redding area. Common
              jobs people post:
            </p>
            <ul className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {requesterCategories.map((name, i) => {
                const Icon = categoryIcons[i % categoryIcons.length];
                return (
                  <li key={name} className="flex items-center gap-2.5 text-sm text-zinc-300">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    {name}
                  </li>
                );
              })}
            </ul>
            <Link
              href={routes.requestHelp}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-amber-400"
            >
              Post a job — it&apos;s free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Workers */}
          <div className="flex flex-col rounded-2xl border border-zinc-700 bg-zinc-900 p-7">
            <h2 className="mb-2 text-xl font-bold text-zinc-100">Looking for local work?</h2>
            <p className="mb-5 text-sm text-zinc-400">
              Set up a free profile and get alerts when jobs are posted near you. Be early and
              build the reviews that get you picked.
            </p>
            <ul className="mb-6 space-y-2.5">
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Bell className="mt-0.5 h-4 w-4 flex-none text-amber-400" />
                Get alerts for new local jobs as they&apos;re posted.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <Star className="mt-0.5 h-4 w-4 flex-none text-amber-400" />
                Build a profile and reviews that travel with you.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-zinc-300">
                <MapPin className="mt-0.5 h-4 w-4 flex-none text-amber-400" />
                Work close to home — real jobs from real neighbors.
              </li>
            </ul>
            <Link
              href={routes.workAlerts}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-zinc-950 px-5 py-3 text-sm font-bold text-amber-400 transition-colors hover:bg-amber-500 hover:text-zinc-950"
            >
              Get local job alerts <Bell className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
          How the Redding launch works
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            {
              title: 'Post or sign up',
              desc: 'Need help? Post the job in about a minute. Want work? Set up a free profile and turn on alerts.',
            },
            {
              title: 'Get matched locally',
              desc: 'We line up local jobs with local help in the Redding area — no feed to scroll, no comment threads to lose.',
            },
            {
              title: 'Build a track record',
              desc: 'Finish the work, leave and collect reviews, and help a real local marketplace grow from the ground up.',
            },
          ].map(({ title, desc }, i) => (
            <div key={title} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-lg font-bold text-amber-400">
                {i + 1}
              </div>
              <h3 className="mb-2 font-semibold text-zinc-100">{title}</h3>
              <p className="text-sm text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Spread the word / share */}
      <section className="border-t border-zinc-800 bg-zinc-900/50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Help spread the word in Redding
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-center text-sm text-zinc-400">
            Post in a local Facebook group or neighborhood page. Copy a ready-made message, or
            print a flyer to put up around town.
          </p>

          <div className="space-y-5">
            <CopyBlock label="Facebook post — for people who need help" text={facebookRequesterPost} />
            <CopyBlock label="Facebook post — for people looking for work" text={facebookWorkerPost} />
          </div>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <Link
              href={routes.flyerRequestHelp}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-amber-500/50 hover:bg-zinc-900"
            >
              <Printer className="h-4 w-4" /> Printable flyer — Need help
            </Link>
            <Link
              href={routes.flyerWorkers}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-950 px-5 py-3 text-sm font-semibold text-zinc-100 transition-colors hover:border-amber-500/50 hover:bg-zinc-900"
            >
              <Printer className="h-4 w-4" /> Printable flyer — Find work
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Be part of the Redding launch
        </h2>
        <p className="mx-auto mb-10 max-w-xl text-zinc-400">
          It&apos;s early, and that&apos;s the point. Post a job or sign up for work and help build
          a marketplace for real local work in Redding.
        </p>
        <div className="flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href={routes.requestHelp}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-8 py-3.5 font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            Post a job <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href={routes.workAlerts}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-8 py-3.5 font-semibold transition hover:border-amber-500/50 hover:bg-zinc-900"
          >
            Get work alerts
          </Link>
        </div>
      </section>
    </div>
  );
}
