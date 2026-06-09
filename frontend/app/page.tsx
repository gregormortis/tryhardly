'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, MapPin, Shield, Star, Users, Wrench, Hammer, Check, Banknote } from 'lucide-react';

const stats = [
  { value: 'Free', label: 'To post a job' },
  { value: '12%', label: 'Flat worker fee' },
  { value: 'Stripe', label: 'Secure payouts' },
  { value: 'Local', label: 'Built for neighborhood work' },
];

const categories = [
  { name: 'Lawn & Yard', icon: Hammer, jobs: 'Accepting requests' },
  { name: 'Moving Help', icon: Briefcase, jobs: 'Accepting requests' },
  { name: 'Handyman', icon: Wrench, jobs: 'Accepting requests' },
  { name: 'Cleaning', icon: Star, jobs: 'Accepting requests' },
  { name: 'Delivery & Errands', icon: MapPin, jobs: 'Accepting requests' },
  { name: 'Assembly & Install', icon: Hammer, jobs: 'Accepting requests' },
];

const howItWorks = [
  { title: 'Post a quest', desc: 'Describe the job, set your budget, and post it live in minutes.' },
  { title: 'Get matched', desc: 'Local workers apply. Review profiles, ratings, and past work.' },
  { title: 'Pay securely', desc: 'Marketplace payments are handled by Stripe, with payouts on task completion.' },
];

const trustSignals = [
  { icon: Shield, title: 'Stripe-Powered Payments', desc: 'Payments run on Stripe; worker payouts use Stripe Connect, released on verified task completion.' },
  { icon: Star, title: 'Structured Reviews', desc: 'Reviews and work history are part of the marketplace flow.' },
  { icon: Users, title: 'Profile Verification', desc: 'Profiles and reviews designed for trust from day one.' },
  { icon: Banknote, title: 'Clear Rewards', desc: 'Every quest shows the reward before anyone applies.' },
  { icon: Check, title: 'Simple Job Flow', desc: 'Post the work, review interest, and manage it in one place.' },
  { icon: MapPin, title: 'Local First', desc: 'Built for neighborhood work, errands, services, and hands-on help.' },
];

export default function HomePage() {
  const [zip, setZip] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (zip.trim()) {
      window.location.href = `/questboard?zip=${zip.trim()}`;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-14 sm:py-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold text-amber-400 mb-5">
          <MapPin className="h-3 w-3" /> Local gigs. Real people. Real pay.
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl mb-5">
          The gig marketplace<br />AI can&apos;t replace
        </h1>
        <p className="mx-auto max-w-2xl text-base sm:text-lg text-zinc-300 mb-3">
          Hire verified local workers for real paid jobs — paid securely through Stripe after the work is done.
        </p>
        <p className="mx-auto max-w-xl text-sm text-zinc-500 mb-8">
          Post a job in minutes, or browse starter quests as new local listings come online.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-md sm:max-w-xl mx-auto mb-6">
          <Link
            href="/post-quest"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-950 hover:bg-amber-400 transition-colors"
          >
            Post a job — free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/questboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-sm font-bold text-zinc-100 hover:border-amber-500/50 hover:bg-zinc-900 transition-colors"
          >
            Find work near me
          </Link>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
          <input
            type="text"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="Enter your ZIP code"
            maxLength={5}
            className="flex-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/60 px-5 py-2.5 text-sm font-semibold text-zinc-200 hover:border-amber-500/50 hover:bg-zinc-900 transition-colors"
          >
            Browse jobs <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </section>

      {/* Stats */}
      <section className="border-y border-zinc-800 bg-zinc-900/50 py-12">
        <div className="mx-auto max-w-4xl px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {stats.map(({ value, label }) => (
            <div key={label}>
              <p className="text-3xl font-bold text-amber-400">{value}</p>
              <p className="mt-1 text-sm text-zinc-400">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-3 text-center">Browse by category</h2>
        <p className="mx-auto max-w-xl text-sm text-zinc-400 mb-10 text-center">
          Post a request in any category today — local workers get alerts the moment your job goes live. More categories added weekly.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {categories.map(({ name, icon: Icon, jobs }) => (
            <Link
              key={name}
              href={`/post-quest?category=${encodeURIComponent(name)}`}
              className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 hover:border-amber-500/50 hover:bg-zinc-800 transition-all group"
            >
              <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-zinc-100 text-center">{name}</h3>
              <p className="mt-1 text-xs font-medium text-amber-400/80 text-center">{jobs}</p>
              <p className="mt-2 text-sm text-zinc-400 text-center group-hover:text-zinc-200 transition-colors">Request this service →</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-zinc-900/50 border-y border-zinc-800 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-12 text-center">How it works</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {howItWorks.map(({ title, desc }, i) => (
              <div key={title} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 text-lg font-bold">
                  {i + 1}
                </div>
                <h3 className="font-semibold text-zinc-100 mb-2">{title}</h3>
                <p className="text-sm text-zinc-400">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How payments work */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6 sm:p-10">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="h-5 w-5 text-amber-400" />
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">How payments work</h2>
          </div>
          <p className="text-sm text-zinc-300 mb-6">
            TryHardly is a marketplace that connects people who need local help with workers who can do it. We are an
            intermediary — we are not the service provider, and we do not hold your money. Payments are processed by{' '}
            <span className="font-semibold text-zinc-100">Stripe</span>, and worker payouts are handled through{' '}
            <span className="font-semibold text-zinc-100">Stripe Connect</span> after a task is verified complete.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <p className="text-sm font-semibold text-zinc-100 mb-1">Posting is free</p>
              <p className="text-xs text-zinc-400">Customers never pay to post a job. You only pay the reward you agreed with the worker.</p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <p className="text-sm font-semibold text-zinc-100 mb-1">12% worker fee</p>
              <p className="text-xs text-zinc-400">TryHardly takes a flat 12% platform service fee from worker payouts on completed paid jobs.</p>
            </div>
            <div className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4">
              <p className="text-sm font-semibold text-zinc-100 mb-1">Paid after completion</p>
              <p className="text-xs text-zinc-400">Payouts are released through Stripe Connect once the task is verified as complete.</p>
            </div>
          </div>
          <Link
            href="/pricing"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            See full pricing &amp; fees <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Trust signals */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-10 text-center">Built on trust</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {trustSignals.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-6 text-center sm:text-left">
              <div className="mx-auto sm:mx-0 mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100 mb-1">{title}</h3>
              <p className="text-xs text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Ready to get something done?</h2>
        <p className="mx-auto mt-4 max-w-xl text-zinc-400 mb-10">
          Join the early TryHardly launch and help shape a marketplace for real local work in your city.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-8 py-3.5 font-semibold text-zinc-950 transition hover:bg-amber-400"
          >
            Post a job &mdash; it&apos;s free <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-700 px-8 py-3.5 font-semibold transition hover:border-amber-500/50 hover:bg-zinc-900"
          >
            Start earning today
          </Link>
        </div>
      </section>

    </div>
  );
}
